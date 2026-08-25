/**
 * LOCKGO — Audit Logger & PDPA PII Masking Engine Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { auditLogger } from '../../src/modules/audit/audit-logger';
import { db } from '../../src/core/database';

describe('Audit Logger & PDPA PII Masking Engine', () => {
  beforeEach(() => {
    db.reset();
  });

  it('should mask Thai mobile phone numbers to canonical 081-***-4567 format', () => {
    const raw = 'Customer phone is 0811234567 and alternative 089-987-6543';
    const masked = auditLogger.maskString(raw);

    expect(masked).not.toContain('0811234567');
    expect(masked).not.toContain('089-987-6543');
    expect(masked).toContain('081-***-4567');
    expect(masked).toContain('089-***-6543');
  });

  it('should mask Thai Citizen ID (13 digits) to canonical 1-2345-*****-12-3 format', () => {
    const raw = 'National ID 1-2345-67890-12-3 registered with citizen 1234567890123';
    const masked = auditLogger.maskString(raw);

    expect(masked).not.toContain('1-2345-67890-12-3');
    expect(masked).not.toContain('1234567890123');
    expect(masked).toContain('1-2345-*****-12-3');
  });

  it('should mask customer Email addresses', () => {
    const raw = 'Contact user at somchai.prasert@khoomkha.co.th';
    const masked = auditLogger.maskString(raw);

    expect(masked).not.toContain('somchai.prasert@khoomkha.co.th');
    expect(masked).toContain('so***@khoomkha.co.th');
  });

  it('should mask Credit Card numbers', () => {
    const raw = 'Card charged: 4111-2222-3333-4444';
    const masked = auditLogger.maskString(raw);

    expect(masked).not.toContain('4111-2222-3333-4444');
    expect(masked).toContain('****-****-****-4444');
  });

  it('should mask IP address host octets while keeping subnet', () => {
    const raw = 'Client IP 203.144.144.168 connected to station';
    const masked = auditLogger.maskString(raw);

    expect(masked).not.toContain('203.144.144.168');
    expect(masked).toContain('203.144.144.***');
  });

  it('should recursively sanitize deeply nested objects and redact sensitive keys', () => {
    const log = auditLogger.log(
      'CUSTOMER_PAYMENT_PROCESSED',
      'RESERVATION',
      'res-12345',
      {
        user: {
          phone: '0812345678',
          email: 'koy@shinasang.com',
          citizenId: '3100601234567',
        },
        payment: {
          cardNumber: '5424-1801-2345-6789',
          secret: 'super-secret-token-key',
        },
        notes: ['Customer at 0891112222 confirmed via email somying@test.com'],
      },
      'usr-0812345678',
      '192.168.10.55'
    );

    expect(log.ipAddress).toBe('192.168.10.***');
    expect(log.userId).toBe('usr-081-***-5678');

    const details = log.details as any;
    expect(details.user.phone).toBe('081-***-5678');
    expect(details.user.email).toBe('ko***@shinasang.com');
    expect(details.user.citizenId).toBe('3-1006-*****-56-7');
    expect(details.payment.cardNumber).toBe('****-****-****-6789');
    expect(details.payment.secret).toBe('***REDACTED***');
    expect(details.notes[0]).toContain('089-***-2222');
    expect(details.notes[0]).toContain('so***@test.com');
  });
});
