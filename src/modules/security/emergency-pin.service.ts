/**
 * LOCKGO — Kiosk Emergency Backup PIN Service (ADR-012)
 * Handles fallback 6-digit PIN verification on touchscreen kiosk with cryptographic hashing,
 * timingSafeEqual defense, server-side DB validation, and brute-force lockout.
 */

import { randomInt, randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { redis } from '../../core/redis';
import { db } from '../../core/database';
import { auditLogger } from '../audit/audit-logger';
import { LockGoError, InvalidSecurityTokenError, ResourceNotFoundError } from '../../core/errors';

export class EmergencyPinService {
  private readonly maxFailedAttempts = 3;
  private readonly lockoutDurationSeconds = 900; // 15 minutes

  /**
   * Generates a 6-digit emergency PIN and its cryptographic salt & hash for DB storage.
   */
  public generateEmergencyPin(): { rawPin: string; salt: string; hash: string } {
    const rawPin = randomInt(100000, 999999).toString();
    const salt = randomBytes(16).toString('hex');
    const hash = this.computePinHash(rawPin, salt);
    return { rawPin, salt, hash };
  }

  /**
   * Computes HMAC-SHA256 hash of a PIN using the stored salt.
   */
  public computePinHash(pin: string, salt: string): string {
    return createHmac('sha256', salt).update(pin).digest('hex');
  }

  /**
   * Validates PIN entered at Kiosk against server-side hashed AccessToken record.
   * Enforces:
   * 1. 15-minute lockout check in Redis
   * 2. Server-side DB token lookup
   * 3. Constant-time timingSafeEqual hash comparison
   * 4. 3-strike brute-force lockout counter
   */
  public async verifyPin(
    phoneNumber: string,
    enteredPin: string,
    reservationId: string
  ): Promise<boolean> {
    const lockKey = `kiosk:pin_lockout:${phoneNumber}`;
    const attemptKey = `kiosk:pin_attempts:${phoneNumber}`;

    // 1. Check if phone is currently locked out
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      auditLogger.log('EMERGENCY_PIN_LOCKED_OUT_ATTEMPT', 'RESERVATION', reservationId, { phoneNumber });
      throw new LockGoError(
        'Too many failed attempts. Emergency unlock locked for 15 minutes.',
        'KIOSK_PIN_LOCKED_OUT',
        429
      );
    }

    // 2. Lookup Access Token from Server Database
    const tokenRecord = db.getAccessToken(reservationId);
    if (!tokenRecord || !tokenRecord.pickupPinHash || !tokenRecord.pickupPinSalt) {
      throw new ResourceNotFoundError('AccessToken', reservationId);
    }

    // 3. Compute hash of entered PIN and compare using timingSafeEqual
    const enteredHash = this.computePinHash(enteredPin, tokenRecord.pickupPinSalt);
    const enteredBuf = Buffer.from(enteredHash, 'hex');
    const expectedBuf = Buffer.from(tokenRecord.pickupPinHash, 'hex');

    const isValid = enteredBuf.length === expectedBuf.length && timingSafeEqual(enteredBuf, expectedBuf);

    if (!isValid) {
      const attempts = await redis.increment(attemptKey);
      await redis.expire(attemptKey, this.lockoutDurationSeconds);

      auditLogger.log('EMERGENCY_PIN_FAILED', 'RESERVATION', reservationId, {
        phoneNumber,
        attemptCount: attempts,
      });

      if (attempts >= this.maxFailedAttempts) {
        await redis.set(lockKey, 'LOCKED', this.lockoutDurationSeconds);
        auditLogger.log('EMERGENCY_PIN_BRUTE_FORCE_LOCKOUT', 'RESERVATION', reservationId, { phoneNumber });
        throw new LockGoError(
          'PIN failed 3 times. Account locked out for 15 minutes.',
          'KIOSK_PIN_LOCKED_OUT',
          429
        );
      }

      throw new InvalidSecurityTokenError(
        `Invalid emergency PIN. ${this.maxFailedAttempts - attempts} attempts remaining.`
      );
    }

    // 4. Success -> Clear attempt counter & log audit
    await redis.delete(attemptKey);
    auditLogger.log('EMERGENCY_PIN_SUCCESS', 'RESERVATION', reservationId, { phoneNumber });
    return true;
  }
}

export const emergencyPinService = new EmergencyPinService();
