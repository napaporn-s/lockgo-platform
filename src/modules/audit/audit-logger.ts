/**
 * LOCKGO — Immutable Append-Only Audit Logger with Real PII Masking (PDPA B.E. 2562 Compliant)
 */

import { AuditLog } from '../../core/types';
import { db } from '../../core/database';
import { randomUUID } from 'crypto';

export class AuditLogger {
  /**
   * Regular Expressions for PII Detection and Tokenized Redaction
   */
  private static readonly PATTERNS = {
    // Thai National Citizen ID (13 digits: x-xxxx-xxxxx-xx-x or xxxxxxxxxxxxx)
    CITIZEN_ID_FORMATTED: /\b(\d{1})[-.\s](\d{4})[-.\s](\d{5})[-.\s](\d{2})[-.\s](\d{1})\b/g,
    CITIZEN_ID_RAW: /\b(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})\b/g,

    // Thai Mobile Phone (08x, 09x, 06x with or without hyphens / country code)
    PHONE_FORMATTED: /(?:\b|(?<=\+))(\+?66|0)([689]\d{1})[-.\s](\d{3})[-.\s](\d{4})\b/g,
    PHONE_RAW: /\b(0[689]\d{1})(\d{3})(\d{4})\b/g,

    // Email Address
    EMAIL: /\b([a-zA-Z0-9._%+-]{1,2})[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,

    // Credit Card (16 digits with or without hyphens/spaces)
    CREDIT_CARD: /\b(\d{4})[-.\s]?(\d{4})[-.\s]?(\d{4})[-.\s]?(\d{4})\b/g,

    // IPv4 Address (Mask host octet while preserving subnet for telemetry)
    IPV4: /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.)\d{1,3}\b/g,
  };

  /**
   * Masks sensitive PII strings according to Thai PDPA standards.
   */
  public maskString(text: string): string {
    if (!text || typeof text !== 'string') return text;

    return text
      // 1. Mask National ID First (13 digits): 1-2345-67890-12-3 / 1234567890123 -> 1-2345-*****-12-3
      .replace(AuditLogger.PATTERNS.CITIZEN_ID_FORMATTED, (_match, p1, p2, _p3, p4, p5) => `${p1}-${p2}-*****-${p4}-${p5}`)
      .replace(AuditLogger.PATTERNS.CITIZEN_ID_RAW, (_match, p1, p2, _p3, p4, p5) => `${p1}-${p2}-*****-${p4}-${p5}`)

      // 2. Mask Phone Numbers: 081-123-4567 / 0811234567 -> 081-***-4567
      .replace(AuditLogger.PATTERNS.PHONE_FORMATTED, (_match, p1, p2, _p3, p4) => `${p1}${p2}-***-${p4}`)
      .replace(AuditLogger.PATTERNS.PHONE_RAW, (_match, p1, _p2, p3) => `${p1}-***-${p3}`)

      // 3. Mask Email: john.doe@example.com -> j***@example.com
      .replace(AuditLogger.PATTERNS.EMAIL, (_match, p1, p2) => `${p1}***${p2}`)

      // 4. Mask Credit Card: 4111-2222-3333-4444 -> ****-****-****-4444
      .replace(AuditLogger.PATTERNS.CREDIT_CARD, (_match, _p1, _p2, _p3, p4) => `****-****-****-${p4}`)

      // 5. Mask IPv4 Host: 192.168.1.100 -> 192.168.1.***
      .replace(AuditLogger.PATTERNS.IPV4, (_match, p1) => `${p1}***`);
  }

  /**
   * Recursively traverses any data structure (objects, arrays, primitives) and masks all PII values.
   */
  public maskPII<T>(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.maskString(data) as unknown as T;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskPII(item)) as unknown as T;
    }

    if (typeof data === 'object') {
      const maskedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        // Special case for known sensitive keys (e.g. pin, rawEmergencyPin, secret)
        if (/^(pin|rawpin|secret|totpsecret|password|authorization)$/i.test(key)) {
          maskedObj[key] = '***REDACTED***';
        } else {
          maskedObj[key] = this.maskPII(value);
        }
      }
      return maskedObj as T;
    }

    return data;
  }

  /**
   * Appends an audit log entry with automatic recursive PII sanitization.
   */
  public log(
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, unknown>,
    userId?: string,
    ipAddress?: string
  ): AuditLog {
    const sanitizedDetails = this.maskPII(details);
    const sanitizedIp = ipAddress ? this.maskString(ipAddress) : undefined;
    const sanitizedUserId = userId ? this.maskString(userId) : undefined;

    const auditRecord: AuditLog = {
      id: `audit-${randomUUID()}`,
      userId: sanitizedUserId,
      action,
      resource,
      resourceId,
      details: sanitizedDetails as Record<string, unknown>,
      ipAddress: sanitizedIp,
      timestamp: Date.now(),
    };

    // Append to immutable database audit log
    db.appendAuditLog(auditRecord);

    // Structured JSON log output for OpenTelemetry/Loki ingestion
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({ level: 'INFO', type: 'AUDIT_LOG', ...auditRecord }));
    }

    return auditRecord;
  }

  public getLogs(): AuditLog[] {
    return db.getAuditLogs();
  }
}

export const auditLogger = new AuditLogger();
