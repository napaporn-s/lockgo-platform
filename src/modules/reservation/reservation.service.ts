/**
 * LOCKGO — 3-Layer Concurrency Reservation Engine (Zero Double-Booking Guarantee)
 */

import { Reservation, AccessToken, DomainVertical } from '../../core/types';
import { db } from '../../core/database';
import { redis } from '../../core/redis';
import { config } from '../../core/config';
import { LockContentionError, CompartmentNotAvailableError, LockGoError } from '../../core/errors';
import { randomUUID, randomBytes } from 'crypto';
import { auditLogger } from '../audit/audit-logger';
import { foodPolicy } from '../domains/food.policy';
import { coldPolicy, laundryPolicy, parcelPolicy } from '../domains/cold-laundry-parcel.policy';

export class ReservationService {
  /**
   * 3-Layer Concurrency Locking Reservation Flow:
   * Layer 1: Redis Redlock Distributed Lock
   * Layer 2: PostgreSQL Row-Level Lock & Status Check (SELECT FOR UPDATE)
   * Layer 3: Database Partial Unique Constraint
   */
  public async createReservation(params: {
    userId: string;
    compartmentId: string;
    stationId: string;
    domainType?: DomainVertical;
    domainAttributes?: Record<string, unknown>;
  }): Promise<{ reservation: Reservation; accessToken: AccessToken }> {
    const { userId, compartmentId, stationId, domainType = 'PARCEL', domainAttributes = {} } = params;
    const lockResource = `compartment:${compartmentId}`;
    const lockValue = randomUUID();

    // 0. Domain Policy Pre-validation
    const policy = this.getDomainPolicy(domainType);
    const validation = policy.validateReservation(domainAttributes);
    if (!validation.allowed) {
      throw new LockGoError(validation.reason || 'Reservation rejected by domain policy', 'DOMAIN_POLICY_REJECTED', 400);
    }

    // --- LAYER 1: Redis Distributed Lock (Fast Gate, In-Memory) ---
    const lockAcquired = await redis.acquireLock(lockResource, lockValue, config.concurrency.redisLockTtlMs);
    if (!lockAcquired) {
      throw new LockContentionError(`Compartment ${compartmentId}`);
    }

    try {
      // --- LAYER 2: Relational DB Transaction & SELECT FOR UPDATE ---
      const compartment = await db.selectCompartmentForUpdate(compartmentId);
      if (compartment.status !== 'AVAILABLE') {
        throw new CompartmentNotAvailableError(compartmentId);
      }

      // Compute Hold SLA Expiration
      const startTime = Date.now();
      const holdDurationMs = validation.maxHoldDurationMinutes * 60 * 1000;
      const holdExpiresAt = startTime + Math.min(holdDurationMs, config.concurrency.reservationHoldMinutes * 60 * 1000);

      const reservation: Reservation = {
        id: `res-${randomUUID()}`,
        userId,
        compartmentId,
        stationId,
        reservationCode: `LK-${randomBytes(3).toString('hex').toUpperCase()}`,
        status: 'PENDING',
        domainType,
        domainAttributes,
        startTime,
        holdExpiresAt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Generate Access Token & TOTP Secret for dynamic QR code
      const accessToken: AccessToken = {
        id: `token-${randomUUID()}`,
        reservationId: reservation.id,
        totpSecret: randomBytes(20).toString('hex'),
        status: 'ACTIVE',
        lastRotatedAt: Date.now(),
        expiresAt: holdExpiresAt,
      };

      // --- LAYER 3: Physical Database Constraint & Mutation ---
      db.createReservation(reservation);
      db.saveAccessToken(accessToken);

      // Update Compartment Status
      db.updateCompartment({
        ...compartment,
        status: 'RESERVED',
      });

      // Audit Log
      auditLogger.log('RESERVATION_CREATED', 'RESERVATION', reservation.id, {
        compartmentId,
        stationId,
        domainType,
        holdExpiresAt,
      }, userId);

      return { reservation, accessToken };
    } finally {
      // Release Layer 2 DB row lock
      db.releaseCompartmentRowLock(compartmentId);
      // Release Layer 1 Redis distributed lock
      await redis.releaseLock(lockResource, lockValue);
    }
  }

  public getReservationById(reservationId: string): Reservation | undefined {
    return db.getReservation(reservationId);
  }

  public getAccessToken(reservationId: string): AccessToken | undefined {
    return db.getAccessToken(reservationId);
  }

  public async completeReservation(reservationId: string): Promise<Reservation> {
    const reservation = db.getReservation(reservationId);
    if (!reservation) {
      throw new CompartmentNotAvailableError(`Reservation ${reservationId} not found`);
    }

    const updated: Reservation = {
      ...reservation,
      status: 'COMPLETED',
      completedAt: Date.now(),
    };
    db.updateReservation(updated);

    const comp = db.getCompartment(reservation.compartmentId);
    if (comp) {
      db.updateCompartment({
        ...comp,
        status: 'AVAILABLE',
      });
    }

    auditLogger.log('RESERVATION_COMPLETED', 'RESERVATION', reservationId, {
      compartmentId: reservation.compartmentId,
    }, reservation.userId);

    return updated;
  }

  private getDomainPolicy(vertical: DomainVertical) {
    switch (vertical) {
      case 'FOOD':
        return foodPolicy;
      case 'COLD':
        return coldPolicy;
      case 'LAUNDRY':
        return laundryPolicy;
      case 'PARCEL':
      default:
        return parcelPolicy;
    }
  }
}

export const reservationService = new ReservationService();
