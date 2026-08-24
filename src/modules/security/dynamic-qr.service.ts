/**
 * LOCKGO — Dynamic TOTP / HMAC-SHA256 Rolling QR Code Security Service
 */

import { createHmac, randomBytes } from 'crypto';
import { config } from '../../core/config';
import { InvalidSecurityTokenError } from '../../core/errors';
import { nonceBurner } from './nonce-burner';

export interface DynamicQRPayload {
  reservationId: string;
  timeWindow: number;
  nonce: string;
  signature: string;
}

export class DynamicQRService {
  /**
   * Generates a 30s rolling dynamic QR token for mobile client presentation.
   */
  public generateDynamicToken(reservationId: string, secretKey: string, customTimestamp?: number): string {
    const timestamp = customTimestamp || Date.now();
    const timeWindow = Math.floor(timestamp / 1000 / config.security.totpWindowSeconds);
    const nonce = randomBytes(8).toString('hex');

    const dataToSign = `${reservationId}:${timeWindow}:${nonce}`;
    const signature = createHmac(config.security.hmacAlgorithm, secretKey)
      .update(dataToSign)
      .digest('hex');

    const payload: DynamicQRPayload = {
      reservationId,
      timeWindow,
      nonce,
      signature,
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Validates dynamic token scanned by physical locker hardware scanner.
   * Enforces:
   * 1. Valid signature with reservation secret
   * 2. Timestamp within +/- 1 window drift tolerance (30s)
   * 3. Single-use atomic nonce burning (anti-screenshot/replay)
   */
  public async verifyAndConsumeToken(
    rawBase64Token: string,
    secretKey: string,
    currentTimestamp?: number
  ): Promise<{ reservationId: string; valid: boolean }> {
    let payload: DynamicQRPayload;
    try {
      const decoded = Buffer.from(rawBase64Token, 'base64url').toString('utf-8');
      payload = JSON.parse(decoded);
    } catch {
      throw new InvalidSecurityTokenError('Malformed QR token format');
    }

    const { reservationId, timeWindow, nonce, signature } = payload;
    if (!reservationId || timeWindow === undefined || !nonce || !signature) {
      throw new InvalidSecurityTokenError('Incomplete QR token payload');
    }

    // 1. Verify Timestamp Window (with drift tolerance)
    const now = currentTimestamp || Date.now();
    const currentWindow = Math.floor(now / 1000 / config.security.totpWindowSeconds);
    const windowDiff = Math.abs(currentWindow - timeWindow);

    if (windowDiff > config.security.totpDriftTolerance) {
      throw new InvalidSecurityTokenError(
        `Token expired. Window drift ${windowDiff} exceeds tolerance ${config.security.totpDriftTolerance}`
      );
    }

    // 2. Verify HMAC Signature
    const dataToSign = `${reservationId}:${timeWindow}:${nonce}`;
    const expectedSignature = createHmac(config.security.hmacAlgorithm, secretKey)
      .update(dataToSign)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new InvalidSecurityTokenError('Cryptographic signature mismatch');
    }

    // 3. Atomically Burn Nonce in Redis (Blocks Replay Attacks)
    await nonceBurner.burnNonce(nonce);

    return { reservationId, valid: true };
  }
}

export const dynamicQRService = new DynamicQRService();
