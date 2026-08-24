import { describe, it, expect, beforeEach } from 'bun:test';
import { dynamicQRService } from '../../src/modules/security/dynamic-qr.service';
import { redis } from '../../src/core/redis';
import { TokenAlreadyConsumedError, InvalidSecurityTokenError } from '../../src/core/errors';

describe('Dynamic QR & Replay Attack Defense', () => {
  const secretKey = 'test-secret-key-12345';
  const reservationId = 'res-unit-test-001';

  beforeEach(() => {
    redis.reset();
  });

  it('should generate and successfully verify a dynamic QR token within the valid time window', async () => {
    const token = dynamicQRService.generateDynamicToken(reservationId, secretKey);
    const result = await dynamicQRService.verifyAndConsumeToken(token, secretKey);
    
    expect(result.valid).toBe(true);
    expect(result.reservationId).toBe(reservationId);
  });

  it('should reject tokens with invalid HMAC signatures (Tampered token)', async () => {
    const token = dynamicQRService.generateDynamicToken(reservationId, secretKey);
    const tamperedSecret = 'wrong-secret-key';

    expect(dynamicQRService.verifyAndConsumeToken(token, tamperedSecret)).rejects.toThrow(
      InvalidSecurityTokenError
    );
  });

  it('should reject expired tokens beyond window drift tolerance (Anti-Old Screenshot)', async () => {
    const pastTime = Date.now() - 120 * 1000; // 2 minutes ago (4 windows old)
    const oldToken = dynamicQRService.generateDynamicToken(reservationId, secretKey, pastTime);

    expect(dynamicQRService.verifyAndConsumeToken(oldToken, secretKey, Date.now())).rejects.toThrow(
      InvalidSecurityTokenError
    );
  });

  it('should block replay attacks when the same valid token is scanned twice (Atomic Nonce Burner)', async () => {
    const token = dynamicQRService.generateDynamicToken(reservationId, secretKey);

    // 1st Scan: Should succeed and burn nonce
    const firstScan = await dynamicQRService.verifyAndConsumeToken(token, secretKey);
    expect(firstScan.valid).toBe(true);

    // 2nd Scan (Replay Attack): Must throw TokenAlreadyConsumedError
    await expect(dynamicQRService.verifyAndConsumeToken(token, secretKey)).rejects.toThrow(
      TokenAlreadyConsumedError
    );
  });
});
