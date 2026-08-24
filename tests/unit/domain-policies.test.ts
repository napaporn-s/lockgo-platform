import { describe, it, expect } from 'bun:test';
import { foodPolicy } from '../../src/modules/domains/food.policy';
import { coldPolicy, laundryPolicy, parcelPolicy } from '../../src/modules/domains/cold-laundry-parcel.policy';

describe('Domain Extensibility Policies (Strategy Pattern)', () => {
  describe('Food Domain Policy', () => {
    it('should allow food reservation within 120 minutes hygiene limit', () => {
      const res = foodPolicy.validateReservation({ durationMinutes: 60 });
      expect(res.allowed).toBe(true);
      expect(res.maxHoldDurationMinutes).toBe(60);
    });

    it('should reject food reservation exceeding 120 minutes limit', () => {
      const res = foodPolicy.validateReservation({ durationMinutes: 180 });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('exceeds maximum food hygiene limit of 120 minutes');
    });

    it('should calculate food pricing correctly', () => {
      // 60 minutes = 2 slots of 30m -> 20 + 2*10 = 40 THB
      expect(foodPolicy.calculatePricing(60)).toBe(40);
    });
  });

  describe('Cold Storage Domain Policy', () => {
    it('should allow valid temperature range [2°C - 6°C]', () => {
      const res = coldPolicy.validateReservation({ targetTemp: 4.0 });
      expect(res.allowed).toBe(true);
    });

    it('should reject out-of-bounds temperature setting', () => {
      const res = coldPolicy.validateReservation({ targetTemp: -10.0 });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('outside supported range');
    });
  });

  describe('Laundry Domain Policy', () => {
    it('should calculate daily pricing for multi-day laundry hold', () => {
      // 2 days (2880 mins) -> 2 * 60 = 120 THB
      expect(laundryPolicy.calculatePricing(2880)).toBe(120);
    });
  });

  describe('Parcel Domain Policy', () => {
    it('should apply size multipliers for parcel pricing', () => {
      const priceM = parcelPolicy.calculatePricing(120, 'M');
      const priceXL = parcelPolicy.calculatePricing(120, 'XL');
      expect(priceXL).toBeGreaterThan(priceM);
    });
  });
});
