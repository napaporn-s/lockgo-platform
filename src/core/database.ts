/**
 * LOCKGO — Database Layer (Simulating PostgreSQL 16 ACID Transactions, Row Locking, Constraints, and Ledger)
 */

import { Station, Compartment, Reservation, AccessToken, Payment, FinancialLedgerEntry, AuditLog } from './types';
import { CompartmentNotAvailableError, ResourceNotFoundError } from './errors';

export class Database {
  private stations = new Map<string, Station>();
  private compartments = new Map<string, Compartment>();
  private reservations = new Map<string, Reservation>();
  private accessTokens = new Map<string, AccessToken>();
  private payments = new Map<string, Payment>();
  private ledgerEntries: FinancialLedgerEntry[] = [];
  private auditLogs: AuditLog[] = [];

  // Simulated DB row locks (FOR UPDATE)
  private rowLocks = new Set<string>();

  constructor() {
    this.seedDefaultData();
  }

  public reset(): void {
    this.stations.clear();
    this.compartments.clear();
    this.reservations.clear();
    this.accessTokens.clear();
    this.payments.clear();
    this.ledgerEntries = [];
    this.auditLogs = [];
    this.rowLocks.clear();
    this.seedDefaultData();
  }

  private seedDefaultData(): void {
    const stationId = 'station-asoke-01';
    const station: Station = {
      id: stationId,
      stationCode: 'BKK-ASOKE-01',
      name: 'BTS Asoke Smart Locker Station',
      location: { latitude: 13.7371, longitude: 100.5604 },
      address: 'BTS Asoke Station Concourse, Sukhumvit Rd, Bangkok',
      status: 'ACTIVE',
      hardwareConfig: {
        totalCompartments: 10,
        hasColdStorage: true,
        ipAddress: '192.168.10.50'
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.stations.set(station.id, station);

    // Seed 4 Compartments (S, M, L, Cold)
    const comps: Compartment[] = [
      {
        id: 'comp-asoke-s01',
        stationId,
        compartmentNumber: 'S-01',
        sizeTier: 'S',
        domainVertical: 'PARCEL',
        status: 'AVAILABLE',
        lockRelayIndex: 1,
        version: 1,
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'comp-asoke-m01',
        stationId,
        compartmentNumber: 'M-01',
        sizeTier: 'M',
        domainVertical: 'PARCEL',
        status: 'AVAILABLE',
        lockRelayIndex: 2,
        version: 1,
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'comp-asoke-l01',
        stationId,
        compartmentNumber: 'L-01',
        sizeTier: 'L',
        domainVertical: 'LAUNDRY',
        status: 'AVAILABLE',
        lockRelayIndex: 3,
        version: 1,
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'comp-asoke-c01',
        stationId,
        compartmentNumber: 'COLD-01',
        sizeTier: 'M',
        domainVertical: 'COLD',
        status: 'AVAILABLE',
        lockRelayIndex: 4,
        version: 1,
        metadata: { targetTemp: 4.0 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ];

    for (const c of comps) {
      this.compartments.set(c.id, c);
    }
  }

  // --- Stations ---
  public getStation(id: string): Station | undefined {
    return this.stations.get(id);
  }

  public getAllStations(): Station[] {
    return Array.from(this.stations.values());
  }

  // --- Compartments ---
  public getCompartment(id: string): Compartment | undefined {
    return this.compartments.get(id);
  }

  public getCompartmentsByStation(stationId: string): Compartment[] {
    return Array.from(this.compartments.values()).filter(c => c.stationId === stationId);
  }

  /**
   * Simulates: SELECT ... WHERE id = $1 AND status = 'AVAILABLE' FOR UPDATE;
   * with Optimistic/Pessimistic concurrency guarantees and realistic async I/O yield.
   */
  public async selectCompartmentForUpdate(compartmentId: string): Promise<Compartment> {
    await new Promise(resolve => setImmediate(resolve));

    if (this.rowLocks.has(compartmentId)) {
      throw new CompartmentNotAvailableError(compartmentId);
    }

    const comp = this.compartments.get(compartmentId);
    if (!comp) {
      throw new ResourceNotFoundError('Compartment', compartmentId);
    }

    if (comp.status !== 'AVAILABLE') {
      throw new CompartmentNotAvailableError(compartmentId);
    }

    // Acquire DB row-lock
    this.rowLocks.add(compartmentId);
    return { ...comp };
  }

  public releaseCompartmentRowLock(compartmentId: string): void {
    this.rowLocks.delete(compartmentId);
  }

  public updateCompartment(compartment: Compartment): void {
    const existing = this.compartments.get(compartment.id);
    if (!existing) {
      throw new ResourceNotFoundError('Compartment', compartment.id);
    }
    this.compartments.set(compartment.id, {
      ...compartment,
      version: existing.version + 1,
      updatedAt: Date.now()
    });
  }

  // --- Reservations & Partial Unique Constraint ---
  public createReservation(reservation: Reservation): void {
    // Check Layer 3: Partial Unique Index ON reservations(compartment_id) WHERE status IN ('PENDING', 'ACTIVE')
    const activeDuplicate = Array.from(this.reservations.values()).find(
      r => r.compartmentId === reservation.compartmentId && (r.status === 'PENDING' || r.status === 'ACTIVE')
    );

    if (activeDuplicate) {
      throw new CompartmentNotAvailableError(reservation.compartmentId);
    }

    this.reservations.set(reservation.id, { ...reservation });
  }

  public getReservation(id: string): Reservation | undefined {
    return this.reservations.get(id);
  }

  public getReservationByCode(code: string): Reservation | undefined {
    return Array.from(this.reservations.values()).find(r => r.reservationCode === code);
  }

  public updateReservation(reservation: Reservation): void {
    this.reservations.set(reservation.id, { ...reservation, updatedAt: Date.now() });
  }

  // --- Access Tokens ---
  public saveAccessToken(token: AccessToken): void {
    this.accessTokens.set(token.reservationId, token);
  }

  public getAccessToken(reservationId: string): AccessToken | undefined {
    return this.accessTokens.get(reservationId);
  }

  // --- Payments & Double-Entry Ledger ---
  public createPayment(payment: Payment): void {
    this.payments.set(payment.id, { ...payment });
  }

  public getPayment(id: string): Payment | undefined {
    return this.payments.get(id);
  }

  public getPaymentByReservation(reservationId: string): Payment | undefined {
    return Array.from(this.payments.values()).find(p => p.reservationId === reservationId);
  }

  public updatePayment(payment: Payment): void {
    this.payments.set(payment.id, { ...payment, updatedAt: Date.now() });
  }

  public appendLedgerEntry(entry: FinancialLedgerEntry): void {
    this.ledgerEntries.push({ ...entry });
  }

  public getLedgerEntries(paymentId?: string): FinancialLedgerEntry[] {
    if (paymentId) {
      return this.ledgerEntries.filter(e => e.paymentId === paymentId);
    }
    return [...this.ledgerEntries];
  }

  // --- Audit Logs ---
  public appendAuditLog(log: AuditLog): void {
    this.auditLogs.push({ ...log });
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }
}

export const db = new Database();
