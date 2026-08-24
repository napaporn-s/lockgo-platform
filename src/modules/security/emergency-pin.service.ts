/**
 * LOCKGO — Kiosk Emergency Backup PIN Service (ADR-012)
 * Handles fallback 6-digit PIN verification on touchscreen kiosk with brute-force lockout.
 */

import { randomInt } from 'crypto';
import { redis } from '../../core/redis';
import { auditLogger } from '../audit/audit-logger';
import { LockGoError, InvalidSecurityTokenError } from '../../core/errors';

export class EmergencyPinService {
  private readonly maxFailedAttempts = 3;
  private readonly lockoutDurationSeconds = 900; // 15 minutes

  /**
   * Generates a 6-digit emergency PIN for SMS dispatch.
   */
  public generateEmergencyPin(): string {
    return randomInt(100000, 999999).toString();
  }

  /**
   * Validates PIN entered at Kiosk with brute-force rate limit protection.
   */
  public async verifyPin(phoneNumber: string, enteredPin: string, expectedPin: string, reservationId: string): Promise<boolean> {
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

    // 2. Validate PIN
    if (enteredPin !== expectedPin) {
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

      throw new InvalidSecurityTokenError(`Invalid emergency PIN. ${this.maxFailedAttempts - attempts} attempts remaining.`);
    }

    // 3. Success -> Clear attempts & log audit
    await redis.delete(attemptKey);
    auditLogger.log('EMERGENCY_PIN_SUCCESS', 'RESERVATION', reservationId, { phoneNumber });
    return true;
  }
}

export const emergencyPinService = new EmergencyPinService();
