/**
 * LOCKGO — Food Pickup Domain Policy
 */

import { DomainPolicy, ReservationValidationResult } from './domain-policy.interface';
import { DomainVertical } from '../../core/types';
import { config } from '../../core/config';

export class FoodPolicy implements DomainPolicy {
  public readonly vertical: DomainVertical = 'FOOD';

  public validateReservation(attributes: Record<string, unknown>): ReservationValidationResult {
    // Food must not be stored longer than 120 minutes (2h hygiene limit)
    const requestedMinutes = Number(attributes.durationMinutes || config.domains.foodMaxHoldMinutes);
    
    if (requestedMinutes > config.domains.foodMaxHoldMinutes) {
      return {
        allowed: false,
        maxHoldDurationMinutes: config.domains.foodMaxHoldMinutes,
        reason: `Food storage exceeds maximum food hygiene limit of ${config.domains.foodMaxHoldMinutes} minutes`,
      };
    }

    return {
      allowed: true,
      maxHoldDurationMinutes: Math.min(requestedMinutes, config.domains.foodMaxHoldMinutes),
    };
  }

  public calculatePricing(durationMinutes: number): number {
    // 20 THB base + 10 THB per 30 mins
    const slots = Math.ceil(durationMinutes / 30);
    return 20 + slots * 10;
  }
}

export const foodPolicy = new FoodPolicy();
