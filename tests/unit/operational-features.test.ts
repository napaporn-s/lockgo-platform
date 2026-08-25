/**
 * LOCKGO — Operational Features & Edge Policy Tests (ADR-009, 010, 011, 012)
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { appApi } from '../../src/api/app';
import { db } from '../../src/core/database';
import { redis } from '../../src/core/redis';
import { emergencyPinService } from '../../src/modules/security/emergency-pin.service';
import { reservationService } from '../../src/modules/reservation/reservation.service';

describe('Operational Features & Edge Policies Verification', () => {
  beforeEach(() => {
    db.reset();
    redis.reset();
  });

  describe('Seamless In-App Size Upgrade Engine (ADR-011)', () => {
    it('should upgrade compartment size and calculate price difference when larger slot is available', async () => {
      // 1. Create S reservation
      const { reservation } = await reservationService.createReservation({
        userId: 'user-upgrade-01',
        stationId: 'station-asoke-01',
        compartmentId: 'comp-asoke-s01', // S size
        domainType: 'PARCEL',
      });

      expect(reservation.compartmentId).toBe('comp-asoke-s01');

      // 2. Upgrade to L size
      const upgradeResult = await appApi.upgradeReservationSize({
        reservationId: reservation.id,
        targetSizeTier: 'L',
      });

      expect(upgradeResult.status).toBe('success');
      expect(upgradeResult.data.newCompartmentId).toBe('comp-asoke-l01'); // L size
      expect(upgradeResult.data.priceDifference).toBeGreaterThan(0);

      // Verify old compartment is freed back to AVAILABLE
      const oldComp = db.getCompartment('comp-asoke-s01');
      expect(oldComp?.status).toBe('AVAILABLE');

      // Verify new compartment is RESERVED
      const newComp = db.getCompartment('comp-asoke-l01');
      expect(newComp?.status).toBe('RESERVED');
    });
  });

  describe('Kiosk Emergency Backup PIN & Brute-Force Defense (ADR-012)', () => {
    it('should allow unlock with correct 6-digit emergency PIN validated against server DB hash', async () => {
      const { reservation, rawEmergencyPin } = await reservationService.createReservation({
        userId: 'user-pin-01',
        stationId: 'station-asoke-01',
        compartmentId: 'comp-asoke-s01',
        domainType: 'PARCEL',
      });

      expect(rawEmergencyPin).toHaveLength(6);

      // Validate against server DB token
      const isValid = await emergencyPinService.verifyPin('0811234567', rawEmergencyPin, reservation.id);
      expect(isValid).toBe(true);
    });

    it('should lockout phone number for 15 minutes after 3 consecutive failed PIN attempts', async () => {
      const { reservation, rawEmergencyPin } = await reservationService.createReservation({
        userId: 'user-pin-02',
        stationId: 'station-asoke-01',
        compartmentId: 'comp-asoke-s01',
        domainType: 'PARCEL',
      });

      const wrongPin = '000000';
      const phone = '0899999999';

      // Attempt 1 -> Fail
      await expect(
        emergencyPinService.verifyPin(phone, wrongPin, reservation.id)
      ).rejects.toThrow(/Invalid emergency PIN/);

      // Attempt 2 -> Fail
      await expect(
        emergencyPinService.verifyPin(phone, wrongPin, reservation.id)
      ).rejects.toThrow(/Invalid emergency PIN/);

      // Attempt 3 -> Brute-force lockout triggered
      await expect(
        emergencyPinService.verifyPin(phone, wrongPin, reservation.id)
      ).rejects.toThrow(/locked out for 15 minutes/);

      // Attempt 4 with correct PIN -> Still blocked due to lockout
      await expect(
        emergencyPinService.verifyPin(phone, rawEmergencyPin, reservation.id)
      ).rejects.toThrow(/Emergency unlock locked for 15 minutes/);
    });
  });

  describe('Power Outage & Door Ajar Handlers (ADR-009, ADR-010)', () => {
    it('should record power disruption and freeze alerts', async () => {
      const res = await appApi.handleStationPowerDisrupted({
        stationId: 'station-asoke-01',
        batteryPercentage: 95.0,
        estimatedRuntimeMinutes: 220,
      });

      expect(res.status).toBe('success');
      expect(res.message).toContain('Emergency Power Saving');
    });

    it('should log door ajar alert and dispatch investigation', async () => {
      const res = await appApi.handleDoorAjarAlert({
        stationId: 'station-asoke-01',
        compartmentId: 'comp-asoke-s01',
        durationOpenSeconds: 180,
      });

      expect(res.status).toBe('success');
      expect(res.message).toContain('Door ajar alert triggered');
    });
  });
});
