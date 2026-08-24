/**
 * LOCKGO — Core Domain Types and Interfaces
 */

export type CompartmentSize = 'S' | 'M' | 'L' | 'XL';

export type CompartmentStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE';

export type StationStatus = 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';

export type DomainVertical = 'PARCEL' | 'FOOD' | 'COLD' | 'LAUNDRY' | 'DOCUMENT';

export type ReservationStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export type HardwareSensorState = 'OPEN' | 'CLOSED' | 'UNKNOWN';

export type HardwareLockState = 'LOCKED' | 'UNLOCKED' | 'PENDING_VERIFICATION' | 'JAMMED';

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface Station {
  id: string;
  stationCode: string;
  name: string;
  location: LocationPoint;
  address: string;
  status: StationStatus;
  hardwareConfig: {
    totalCompartments: number;
    hasColdStorage: boolean;
    ipAddress?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface Compartment {
  id: string;
  stationId: string;
  compartmentNumber: string;
  sizeTier: CompartmentSize;
  domainVertical: DomainVertical;
  status: CompartmentStatus;
  lockRelayIndex: number;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface Reservation {
  id: string;
  userId: string;
  compartmentId: string;
  stationId: string;
  reservationCode: string;
  status: ReservationStatus;
  domainType: DomainVertical;
  domainAttributes: Record<string, unknown>;
  startTime: number;
  holdExpiresAt: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AccessToken {
  id: string;
  reservationId: string;
  totpSecret: string;
  status: 'ACTIVE' | 'CONSUMED' | 'REVOKED' | 'EXPIRED';
  lastRotatedAt: number;
  expiresAt: number;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  timestamp: number;
}

export interface IoTUnlockCommand {
  commandId: string;
  stationId: string;
  compartmentId: string;
  relayIndex: number;
  pulseDurationMs: number;
  issuedAt: number;
  ttlMs: number;
  correlationToken: string;
}

export interface IoTEventFeedback {
  commandId: string;
  stationId: string;
  compartmentId: string;
  sensorStatus: HardwareSensorState;
  lockStatus: HardwareLockState;
  timestamp: number;
}
