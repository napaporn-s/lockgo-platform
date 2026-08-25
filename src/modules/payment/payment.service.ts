/**
 * LOCKGO — Two-Phase Payment & Double-Entry Financial Ledger Service
 * Implements Pre-Auth / Capture / Instant Gross Refund / Double-Entry Ledger (ADR-002, ADR-003)
 */

import { randomUUID } from 'crypto';
import { db } from '../../core/database';
import { redis } from '../../core/redis';
import { Payment, FinancialLedgerEntry, PaymentStatus } from '../../core/types';
import { LockGoError, ResourceNotFoundError } from '../../core/errors';
import { auditLogger } from '../audit/audit-logger';

export class PaymentService {
  /**
   * Pre-authorizes payment hold with Idempotency Key protection.
   */
  public async preAuthorizePayment(params: {
    reservationId: string;
    amount: number;
    paymentMethod: 'PROMPTPAY' | 'CREDIT_CARD';
    idempotencyKey: string;
  }): Promise<Payment> {
    const { reservationId, amount, paymentMethod, idempotencyKey } = params;

    // Idempotency Check in Redis
    const cacheKey = `payment:idempotency:${idempotencyKey}`;
    const cachedPaymentId = await redis.get(cacheKey);
    if (cachedPaymentId) {
      const existing = db.getPayment(cachedPaymentId);
      if (existing) return existing;
    }

    const reservation = db.getReservation(reservationId);
    if (!reservation) {
      throw new ResourceNotFoundError('Reservation', reservationId);
    }

    const payment: Payment = {
      id: `pay-${randomUUID()}`,
      reservationId,
      idempotencyKey,
      amount,
      currency: 'THB',
      paymentMethod,
      status: 'PENDING_AUTH',
      gatewayReference: `gw-ref-${randomUUID().slice(0, 8)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.createPayment(payment);

    // Record Double-Entry Ledger: Debit Cash (Asset) / Credit Unearned Revenue (Liability)
    const entryDebit: FinancialLedgerEntry = {
      id: `led-${randomUUID()}`,
      paymentId: payment.id,
      entryType: 'DEBIT',
      accountName: 'CASH',
      amount,
      description: `Pre-auth hold for reservation ${reservationId}`,
      timestamp: Date.now(),
    };
    const entryCredit: FinancialLedgerEntry = {
      id: `led-${randomUUID()}`,
      paymentId: payment.id,
      entryType: 'CREDIT',
      accountName: 'UNEARNED_REVENUE',
      amount,
      description: `Unearned revenue liability for reservation ${reservationId}`,
      timestamp: Date.now(),
    };

    db.appendLedgerEntry(entryDebit);
    db.appendLedgerEntry(entryCredit);

    await redis.set(cacheKey, payment.id, 86400); // 24 hours

    auditLogger.log('PAYMENT_PRE_AUTHORIZED', 'PAYMENT', payment.id, {
      reservationId,
      amount,
      paymentMethod,
    }, reservation.userId);

    return payment;
  }

  /**
   * Captures payment upon successful locker deposit.
   * Recognizes Unearned Revenue -> Service Revenue.
   */
  public async capturePayment(paymentId: string): Promise<Payment> {
    const payment = db.getPayment(paymentId);
    if (!payment) {
      throw new ResourceNotFoundError('Payment', paymentId);
    }

    if (payment.status === 'CAPTURED') {
      return payment;
    }

    const updated: Payment = {
      ...payment,
      status: 'CAPTURED',
      updatedAt: Date.now(),
    };
    db.updatePayment(updated);

    // Ledger Recognition: Debit Unearned Revenue / Credit Service Revenue
    const entryDebit: FinancialLedgerEntry = {
      id: `led-${randomUUID()}`,
      paymentId: payment.id,
      entryType: 'DEBIT',
      accountName: 'UNEARNED_REVENUE',
      amount: payment.amount,
      description: `Recognize revenue upon successful deposit`,
      timestamp: Date.now(),
    };
    const entryCredit: FinancialLedgerEntry = {
      id: `led-${randomUUID()}`,
      paymentId: payment.id,
      entryType: 'CREDIT',
      accountName: 'SERVICE_REVENUE',
      amount: payment.amount,
      description: `Service revenue recognized`,
      timestamp: Date.now(),
    };

    db.appendLedgerEntry(entryDebit);
    db.appendLedgerEntry(entryCredit);

    auditLogger.log('PAYMENT_CAPTURED', 'PAYMENT', payment.id, {
      amount: payment.amount,
    });

    return updated;
  }

  /**
   * Instant Gross 100% Refund upon hardware malfunction / solenoid jam (ADR-003).
   * Platform absorbs Gateway MDR fee (Gross Refund Policy).
   * Guarded against duplicate refund execution (Idempotency).
   */
  public async processInstantGrossRefund(paymentId: string, reason: string): Promise<Payment> {
    const payment = db.getPayment(paymentId);
    if (!payment) {
      throw new ResourceNotFoundError('Payment', paymentId);
    }

    // Idempotency Guard: Do not post duplicate refund ledger entries if already refunded
    if (payment.status === 'REFUNDED') {
      return payment;
    }

    const updated: Payment = {
      ...payment,
      status: 'REFUNDED',
      updatedAt: Date.now(),
    };
    db.updatePayment(updated);

    // Ledger Refund: Debit Unearned Revenue / Credit Cash (100% Gross Refund)
    const entryDebit: FinancialLedgerEntry = {
      id: `led-${randomUUID()}`,
      paymentId: payment.id,
      entryType: 'DEBIT',
      accountName: 'UNEARNED_REVENUE',
      amount: payment.amount,
      description: `Gross refund triggered: ${reason}`,
      timestamp: Date.now(),
    };
    const entryCredit: FinancialLedgerEntry = {
      id: `led-${randomUUID()}`,
      paymentId: payment.id,
      entryType: 'CREDIT',
      accountName: 'CASH',
      amount: payment.amount,
      description: `Cash refunded to customer: ${reason}`,
      timestamp: Date.now(),
    };

    db.appendLedgerEntry(entryDebit);
    db.appendLedgerEntry(entryCredit);

    auditLogger.log('PAYMENT_INSTANT_GROSS_REFUNDED', 'PAYMENT', payment.id, {
      amount: payment.amount,
      reason,
      refundPolicy: 'GROSS_100_PERCENT',
    });

    return updated;
  }

  public getLedgerEntries(paymentId?: string): FinancialLedgerEntry[] {
    return db.getLedgerEntries(paymentId);
  }
}

export const paymentService = new PaymentService();
