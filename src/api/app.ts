/**
 * LOCKGO — Modular Monolith REST API Gateway & Request Dispatcher
 */

import { stationService } from '../modules/station/station.service';
import { reservationService } from '../modules/reservation/reservation.service';
import { dynamicQRService } from '../modules/security/dynamic-qr.service';
import { lockReconciliationService } from '../modules/iot/reconciliation.service';
import { auditLogger } from '../modules/audit/audit-logger';
import { LockGoError, ResourceNotFoundError } from '../core/errors';
import { db } from '../core/database';
import { DomainVertical } from '../core/types';

export class AppApi {
  /**
   * GET /api/stations
   */
  public async getStations(lat?: number, lng?: number, radiusKm?: number) {
    if (lat !== undefined && lng !== undefined) {
      return {
        status: 'success',
        data: stationService.searchNearbyStations({ latitude: lat, longitude: lng }, radiusKm),
      };
    }
    return {
      status: 'success',
      data: stationService.getAllStations(),
    };
  }

  /**
   * GET /api/stations/:id/compartments
   */
  public async getAvailableCompartments(stationId: string) {
    const compartments = stationService.getAvailableCompartments(stationId);
    return {
      status: 'success',
      data: compartments,
    };
  }

  /**
   * POST /api/reservations
   */
  public async createReservation(payload: {
    userId: string;
    stationId: string;
    compartmentId: string;
    domainType?: DomainVertical;
    domainAttributes?: Record<string, unknown>;
  }) {
    const result = await reservationService.createReservation(payload);
    return {
      status: 'success',
      data: {
        reservation: result.reservation,
        accessTokenId: result.accessToken.id,
      },
    };
  }

  /**
   * POST /api/unlock/dynamic-qr
   * Physical scanner presents the scanned dynamic QR code
   */
  public async unlockWithDynamicQR(payload: {
    stationId: string;
    compartmentId: string;
    qrToken: string;
  }) {
    const { stationId, compartmentId, qrToken } = payload;
    
    // Find active reservation for compartment
    const comp = db.getCompartment(compartmentId);
    if (!comp) throw new ResourceNotFoundError('Compartment', compartmentId);

    // Verify token with reservation secret
    // 1. Decode token to find reservation ID
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(qrToken, 'base64url').toString('utf-8'));
    } catch {
      throw new LockGoError('Malformed QR Token', 'INVALID_QR_TOKEN', 400);
    }

    const tokenRecord = db.getAccessToken(decoded.reservationId);
    if (!tokenRecord) {
      throw new LockGoError('Access token not found for reservation', 'TOKEN_NOT_FOUND', 404);
    }

    // Cryptographic validation + Anti-replay Nonce Burner
    await dynamicQRService.verifyAndConsumeToken(qrToken, tokenRecord.totpSecret);

    // Trigger IoT Unlock with 2-Phase Reconciliation
    const unlockResult = await lockReconciliationService.executeUnlockWithReconciliation({
      stationId,
      compartmentId,
      relayIndex: comp.lockRelayIndex,
      correlationToken: decoded.reservationId,
    });

    // Mark reservation as completed & release locker
    await reservationService.completeReservation(decoded.reservationId);

    return {
      status: 'success',
      message: 'Compartment unlocked successfully',
      data: unlockResult,
    };
  }

  /**
   * GET /api/admin/audit-logs
   */
  public async getAuditLogs() {
    return {
      status: 'success',
      data: auditLogger.getLogs(),
    };
  }
}

export const appApi = new AppApi();
