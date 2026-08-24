/**
 * LOCKGO — 2-Phase Lock State Reconciliation Engine
 */

import { IoTEventFeedback } from '../../core/types';
import { iotGatewayService } from './iot-gateway.service';
import { auditLogger } from '../audit/audit-logger';
import { HardwareJammedError, HardwareCommunicationError } from '../../core/errors';
import { config } from '../../core/config';

export interface ReconciliationResult {
  status: 'CONFIRMED_UNLOCKED' | 'HARDWARE_JAMMED' | 'OFFLINE_RETRY_SCHEDULED';
  details: Record<string, unknown>;
}

export class LockReconciliationService {
  /**
   * Executes 2-Phase Lock State Reconciliation:
   * Phase 1: Dispatches async MQTT unlock command and awaits direct event ACK.
   * Phase 2: If timeout / packet drop occurs, polls hardware sensor state with retries.
   */
  public async executeUnlockWithReconciliation(params: {
    stationId: string;
    compartmentId: string;
    relayIndex: number;
    correlationToken: string;
    maxRetries?: number;
    retryDelayMs?: number;
  }): Promise<ReconciliationResult> {
    const {
      stationId,
      compartmentId,
      relayIndex,
      correlationToken,
      maxRetries = config.iot.maxReconciliationRetries,
      retryDelayMs = 25,
    } = params;

    // Phase 1: Dispatch Command
    const command = await iotGatewayService.dispatchUnlockCommand({
      stationId,
      compartmentId,
      relayIndex,
      correlationToken,
    });

    // Simulate event feedback stream arrival
    const feedback: IoTEventFeedback | null = await iotGatewayService.simulateStationExecution(command.commandId);

    // Phase 1 Happy Path: Direct ACK received
    if (feedback) {
      if (feedback.lockStatus === 'JAMMED') {
        auditLogger.log('HARDWARE_JAM_DETECTED', 'COMPARTMENT', compartmentId, { commandId: command.commandId });
        throw new HardwareJammedError(compartmentId);
      }

      auditLogger.log('UNLOCK_CONFIRMED', 'COMPARTMENT', compartmentId, { commandId: command.commandId });
      return {
        status: 'CONFIRMED_UNLOCKED',
        details: { commandId: command.commandId, sensorStatus: feedback.sensorStatus },
      };
    }

    // --- Phase 2: Reconciliation (Timeout / Missing ACK fallback with active sensor polling) ---
    auditLogger.log('RECONCILIATION_TRIGGERED', 'STATION', stationId, { commandId: command.commandId });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }

      const sensorPoll = await iotGatewayService.pollStationSensorStatus(stationId, compartmentId);

      if (sensorPoll.sensorState === 'OPEN') {
        // Reconciled: Solenoid fired and door actually opened despite ACK drop
        auditLogger.log('RECONCILIATION_RESOLVED_OPEN', 'COMPARTMENT', compartmentId, {
          commandId: command.commandId,
          attempt,
        });
        return {
          status: 'CONFIRMED_UNLOCKED',
          details: { commandId: command.commandId, reconciled: true, sensorStatus: 'OPEN', attempt },
        };
      }

      if (sensorPoll.lockState === 'JAMMED') {
        auditLogger.log('RECONCILIATION_JAMMED', 'COMPARTMENT', compartmentId, { commandId: command.commandId });
        throw new HardwareJammedError(compartmentId);
      }
    }

    // Station completely offline or unresponsive after all retries
    auditLogger.log('STATION_UNRESPONSIVE', 'STATION', stationId, { commandId: command.commandId });
    throw new HardwareCommunicationError(stationId, 'Station unreachable during 2-phase reconciliation');
  }
}

export const lockReconciliationService = new LockReconciliationService();
