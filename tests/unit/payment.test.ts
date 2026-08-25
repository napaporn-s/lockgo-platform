/**
 * LOCKGO — Two-Phase Payment & Double-Entry Financial Ledger Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { paymentService } from '../../src/modules/payment/payment.service';
import { reservationService } from '../../src/modules/reservation/reservation.service';
import { db } from '../../src/core/database';
import { redis } from '../../src/core/redis';

describe('Two-Phase Payment & Double-Entry Financial Ledger Engine', () => {
  beforeEach(() => {
    db.reset();
    redis.reset();
  });

  it('should pre-authorize payment hold and record Debit Cash / Credit Unearned Revenue in ledger', async () => {
    const { reservation } = await reservationService.createReservation({
      userId: 'user-pay-01',
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-s01',
      domainType: 'PARCEL',
    });

    const payment = await paymentService.preAuthorizePayment({
      reservationId: reservation.id,
      amount: 45.0,
      paymentMethod: 'PROMPTPAY',
      idempotencyKey: 'idem-key-001',
    });

    expect(payment.status).toBe('PENDING_AUTH');
    expect(payment.amount).toBe(45.0);

    // Verify Ledger Entries
    const ledger = paymentService.getLedgerEntries(payment.id);
    expect(ledger).toHaveLength(2);

    const debit = ledger.find(e => e.entryType === 'DEBIT');
    const credit = ledger.find(e => e.entryType === 'CREDIT');

    expect(debit?.accountName).toBe('CASH');
    expect(debit?.amount).toBe(45.0);
    expect(credit?.accountName).toBe('UNEARNED_REVENUE');
    expect(credit?.amount).toBe(45.0);
  });

  it('should capture payment and recognize Service Revenue upon successful deposit', async () => {
    const { reservation } = await reservationService.createReservation({
      userId: 'user-pay-02',
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-s01',
      domainType: 'PARCEL',
    });

    const payment = await paymentService.preAuthorizePayment({
      reservationId: reservation.id,
      amount: 45.0,
      paymentMethod: 'CREDIT_CARD',
      idempotencyKey: 'idem-key-002',
    });

    const captured = await paymentService.capturePayment(payment.id);
    expect(captured.status).toBe('CAPTURED');

    // Verify Total Ledger Entries (Pre-auth 2 + Capture 2 = 4)
    const ledger = paymentService.getLedgerEntries(payment.id);
    expect(ledger).toHaveLength(4);

    const recognizedDebit = ledger.find(e => e.entryType === 'DEBIT' && e.accountName === 'UNEARNED_REVENUE');
    const recognizedCredit = ledger.find(e => e.entryType === 'CREDIT' && e.accountName === 'SERVICE_REVENUE');

    expect(recognizedDebit?.amount).toBe(45.0);
    expect(recognizedCredit?.amount).toBe(45.0);
  });

  it('should process 100% Gross Refund upon hardware solenoid failure', async () => {
    const { reservation } = await reservationService.createReservation({
      userId: 'user-pay-03',
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-s01',
      domainType: 'PARCEL',
    });

    const payment = await paymentService.preAuthorizePayment({
      reservationId: reservation.id,
      amount: 60.0,
      paymentMethod: 'PROMPTPAY',
      idempotencyKey: 'idem-key-003',
    });

    const refunded = await paymentService.processInstantGrossRefund(payment.id, 'Solenoid Jammed');
    expect(refunded.status).toBe('REFUNDED');

    const ledger = paymentService.getLedgerEntries(payment.id);
    expect(ledger).toHaveLength(4);

    const refundCashCredit = ledger.find(e => e.entryType === 'CREDIT' && e.accountName === 'CASH' && e.description.includes('refunded'));
    expect(refundCashCredit?.amount).toBe(60.0);
  });

  it('should enforce idempotency and prevent duplicate refund posting on retry', async () => {
    const { reservation } = await reservationService.createReservation({
      userId: 'user-pay-03-dup',
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-s01',
      domainType: 'PARCEL',
    });

    const payment = await paymentService.preAuthorizePayment({
      reservationId: reservation.id,
      amount: 60.0,
      paymentMethod: 'PROMPTPAY',
      idempotencyKey: 'idem-key-003-dup',
    });

    await paymentService.processInstantGrossRefund(payment.id, 'Solenoid Jammed 1st Call');
    expect(paymentService.getLedgerEntries(payment.id)).toHaveLength(4);

    // Call refund a 2nd time -> Guarded, no duplicate ledger entries!
    await paymentService.processInstantGrossRefund(payment.id, 'Solenoid Jammed 2nd Call');
    expect(paymentService.getLedgerEntries(payment.id)).toHaveLength(4);
  });

  it('should enforce idempotency and prevent duplicate pre-authorization on double-click', async () => {
    const { reservation } = await reservationService.createReservation({
      userId: 'user-pay-04',
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-s01',
      domainType: 'PARCEL',
    });

    const idempotencyKey = 'idem-duplicate-001';

    const pay1 = await paymentService.preAuthorizePayment({
      reservationId: reservation.id,
      amount: 30.0,
      paymentMethod: 'PROMPTPAY',
      idempotencyKey,
    });

    // Duplicate call with same idempotency key
    const pay2 = await paymentService.preAuthorizePayment({
      reservationId: reservation.id,
      amount: 30.0,
      paymentMethod: 'PROMPTPAY',
      idempotencyKey,
    });

    expect(pay1.id).toBe(pay2.id);
    expect(paymentService.getLedgerEntries(pay1.id)).toHaveLength(2); // Not duplicated
  });
});
