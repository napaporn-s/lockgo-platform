/**
 * LOCKGO — Modular Monolith REST API Gateway & Request Dispatcher
 */

import { stationService } from '../modules/station/station.service';
import { reservationService } from '../modules/reservation/reservation.service';
import { dynamicQRService } from '../modules/security/dynamic-qr.service';
import { emergencyPinService } from '../modules/security/emergency-pin.service';
import { lockReconciliationService } from '../modules/iot/reconciliation.service';
import { paymentService } from '../modules/payment/payment.service';
import { auditLogger } from '../modules/audit/audit-logger';
import { LockGoError, ResourceNotFoundError } from '../core/errors';
import { db } from '../core/database';
import { DomainVertical, CompartmentSize } from '../core/types';

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
        emergencyPin: result.rawEmergencyPin, // Sent via SMS to user
      },
    };
  }

  /**
   * POST /api/reservations/:id/upgrade-size (ADR-011)
   */
  public async upgradeReservationSize(payload: {
    reservationId: string;
    targetSizeTier: CompartmentSize;
  }) {
    const result = await reservationService.upgradeCompartmentSize(
      payload.reservationId,
      payload.targetSizeTier
    );
    return {
      status: 'success',
      message: `Compartment size upgraded to ${payload.targetSizeTier}`,
      data: result,
    };
  }

  /**
   * POST /api/unlock/dynamic-qr (ADR-004)
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
   * POST /api/unlock/emergency-pin (ADR-012)
   * Kiosk fallback unlock with phone + 6-digit PIN verified against server DB hash
   */
  public async unlockWithEmergencyPin(payload: {
    stationId: string;
    compartmentId: string;
    reservationId: string;
    phoneNumber: string;
    enteredPin: string;
  }) {
    const { stationId, compartmentId, reservationId, phoneNumber, enteredPin } = payload;

    const comp = db.getCompartment(compartmentId);
    if (!comp) throw new ResourceNotFoundError('Compartment', compartmentId);

    // Validate PIN against server-side hashed token with rate limiting
    await emergencyPinService.verifyPin(phoneNumber, enteredPin, reservationId);

    // Trigger IoT Unlock
    const unlockResult = await lockReconciliationService.executeUnlockWithReconciliation({
      stationId,
      compartmentId,
      relayIndex: comp.lockRelayIndex,
      correlationToken: reservationId,
    });

    // Mark reservation as completed
    await reservationService.completeReservation(reservationId);

    return {
      status: 'success',
      message: 'Emergency PIN verified and locker unlocked',
      data: unlockResult,
    };
  }

  /**
   * POST /api/payments/pre-authorize
   */
  public async preAuthorizePayment(payload: {
    reservationId: string;
    amount: number;
    paymentMethod: 'PROMPTPAY' | 'CREDIT_CARD';
    idempotencyKey: string;
  }) {
    const payment = await paymentService.preAuthorizePayment(payload);
    return {
      status: 'success',
      data: payment,
    };
  }

  /**
   * POST /api/payments/:id/capture
   */
  public async capturePayment(paymentId: string) {
    const payment = await paymentService.capturePayment(paymentId);
    return {
      status: 'success',
      data: payment,
    };
  }

  /**
   * POST /api/payments/:id/refund
   */
  public async refundPayment(paymentId: string, reason: string) {
    const payment = await paymentService.processInstantGrossRefund(paymentId, reason);
    return {
      status: 'success',
      data: payment,
    };
  }

  /**
   * GET /api/admin/financial-ledger
   */
  public async getFinancialLedger(paymentId?: string) {
    return {
      status: 'success',
      data: paymentService.getLedgerEntries(paymentId),
    };
  }

  /**
   * POST /api/iot/events/power-disrupted (ADR-009)
   */
  public async handleStationPowerDisrupted(payload: {
    stationId: string;
    batteryPercentage: number;
    estimatedRuntimeMinutes: number;
  }) {
    auditLogger.log('STATION_POWER_DISRUPTED', 'STATION', payload.stationId, {
      batteryPercentage: payload.batteryPercentage,
      estimatedRuntimeMinutes: payload.estimatedRuntimeMinutes,
      actionsTaken: ['LOAD_SHEDDING_ACTIVE', 'NEW_BOOKINGS_FROZEN'],
    });

    return {
      status: 'success',
      message: 'Emergency Power Saving mode recorded. New reservations frozen.',
    };
  }

  /**
   * POST /api/iot/events/door-ajar (ADR-010)
   */
  public async handleDoorAjarAlert(payload: {
    stationId: string;
    compartmentId: string;
    durationOpenSeconds: number;
  }) {
    auditLogger.log('DOOR_AJAR_ALERT', 'COMPARTMENT', payload.compartmentId, {
      stationId: payload.stationId,
      durationOpenSeconds: payload.durationOpenSeconds,
      status: 'PENDING_INVESTIGATION',
    });

    return {
      status: 'success',
      message: 'Door ajar alert triggered. Investigation dispatched to Central Ops.',
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
