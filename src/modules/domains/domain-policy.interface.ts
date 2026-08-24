/**
 * LOCKGO — Domain Policy Interface (Strategy Pattern for Zero-Rewrite Extensibility)
 */

import { DomainVertical } from '../../core/types';

export interface ReservationValidationResult {
  allowed: boolean;
  maxHoldDurationMinutes: number;
  reason?: string;
}

export interface DomainPolicy {
  readonly vertical: DomainVertical;
  validateReservation(attributes: Record<string, unknown>): ReservationValidationResult;
  calculatePricing(durationMinutes: number, sizeTier: string): number;
  onLockerUnlocked?(compartmentId: string, metadata: Record<string, unknown>): void;
}
