/**
 * LOCKGO — Cold Storage, Laundry, and Parcel Domain Policies
 */

import { DomainPolicy, ReservationValidationResult } from './domain-policy.interface';
import { DomainVertical } from '../../core/types';
import { config } from '../../core/config';

export class ColdStoragePolicy implements DomainPolicy {
  public readonly vertical: DomainVertical = 'COLD';

  public validateReservation(attributes: Record<string, unknown>): ReservationValidationResult {
    const targetTemp = Number(attributes.targetTemp || 4.0);
    const { min, max } = config.domains.coldTargetTempRange;

    if (targetTemp < min || targetTemp > max) {
      return {
        allowed: false,
        maxHoldDurationMinutes: 1440,
        reason: `Requested temperature ${targetTemp}°C outside supported range [${min}°C - ${max}°C]`,
      };
    }

    return {
      allowed: true,
      maxHoldDurationMinutes: 1440, // 24 hours
    };
  }

  public calculatePricing(durationMinutes: number): number {
    // 50 THB base + 25 THB per hour (due to active refrigeration compressor power)
    const hours = Math.ceil(durationMinutes / 60);
    return 50 + hours * 25;
  }
}

export class LaundryPolicy implements DomainPolicy {
  public readonly vertical: DomainVertical = 'LAUNDRY';

  public validateReservation(): ReservationValidationResult {
    return {
      allowed: true,
      maxHoldDurationMinutes: 4320, // 3 days max hold
    };
  }

  public calculatePricing(durationMinutes: number): number {
    // Daily rate for multi-day dry cleaning / laundry storage
    const days = Math.max(1, Math.ceil(durationMinutes / 1440));
    return days * 60;
  }
}

export class ParcelPolicy implements DomainPolicy {
  public readonly vertical: DomainVertical = 'PARCEL';

  public validateReservation(): ReservationValidationResult {
    return {
      allowed: true,
      maxHoldDurationMinutes: 2880, // 48 hours
    };
  }

  public calculatePricing(durationMinutes: number, sizeTier: string): number {
    const sizeMultiplier = sizeTier === 'XL' ? 2.0 : sizeTier === 'L' ? 1.5 : 1.0;
    const hours = Math.max(1, Math.ceil(durationMinutes / 60));
    return Math.round((15 + hours * 10) * sizeMultiplier);
  }
}

export const coldPolicy = new ColdStoragePolicy();
export const laundryPolicy = new LaundryPolicy();
export const parcelPolicy = new ParcelPolicy();
