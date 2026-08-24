/**
 * LOCKGO — Immutable Append-Only Audit Logger
 */

import { AuditLog } from '../../core/types';
import { db } from '../../core/database';
import { randomUUID } from 'crypto';

export class AuditLogger {
  public log(
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, unknown>,
    userId?: string,
    ipAddress?: string
  ): AuditLog {
    const auditRecord: AuditLog = {
      id: `audit-${randomUUID()}`,
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
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
