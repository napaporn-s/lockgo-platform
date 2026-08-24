import { describe, it, expect, beforeEach } from 'bun:test';
import { reservationService } from '../../src/modules/reservation/reservation.service';
import { db } from '../../src/core/database';
import { redis } from '../../src/core/redis';

describe('3-Layer Concurrency Engine: Double Booking Race Condition Stress Test', () => {
  beforeEach(() => {
    db.reset();
    redis.reset();
  });

  it('should guarantee EXACTLY 1 reservation succeeds and all concurrent attempts fail with 0% double booking', async () => {
    const targetCompartmentId = 'comp-asoke-m01';
    const stationId = 'station-asoke-01';
    const concurrentUsersCount = 50;

    // Dispatch 50 concurrent booking attempts for the exact same single compartment slot
    const promises = Array.from({ length: concurrentUsersCount }, (_, i) => {
      return reservationService.createReservation({
        userId: `user-race-${i}`,
        compartmentId: targetCompartmentId,
        stationId,
        domainType: 'PARCEL',
      }).then(res => ({ success: true, res }))
        .catch(err => ({ success: false, error: err.code }));
    });

    const results = await Promise.all(promises);

    const successfulBookings = results.filter(r => r.success);
    const failedBookings = results.filter(r => !r.success);

    // CRITICAL CONCURRENCY INVARIANTS:
    // 1. Exactly one single user must acquire the reservation
    expect(successfulBookings.length).toBe(1);

    // 2. Exactly 49 users must receive safe concurrency rejection (LOCK_CONTENTION or COMPARTMENT_NOT_AVAILABLE)
    expect(failedBookings.length).toBe(49);

    // 3. Database compartment state must be strictly RESERVED
    const finalCompState = db.getCompartment(targetCompartmentId);
    expect(finalCompState?.status).toBe('RESERVED');

    // 4. Double Booking Rate must be strictly 0.000%
    const allReservations = db.getCompartmentsByStation(stationId);
    const activeReservations = results.filter(r => r.success);
    expect(activeReservations.length).toBe(1);
  });
});
