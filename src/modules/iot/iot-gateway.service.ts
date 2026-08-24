/**
 * LOCKGO — IoT Hardware Controller Gateway Service (MQTT Asynchronous Pub/Sub Simulator)
 */

import { IoTUnlockCommand, IoTEventFeedback, HardwareSensorState, HardwareLockState } from '../../core/types';
import { randomUUID } from 'crypto';
import { config } from '../../core/config';
import { db } from '../../core/database';
import { auditLogger } from '../audit/audit-logger';

export class IoTGatewayService {
  // In-flight command tracking
  private pendingCommands = new Map<string, IoTUnlockCommand>();

  // Simulated Edge Hardware Station State
  private stationHardwareState = new Map<string, {
    isOnline: boolean;
    isJammed: boolean;
    sensorState: HardwareSensorState;
    lockState: HardwareLockState;
  }>();

  constructor() {
    this.initDefaultHardware();
  }

  public initDefaultHardware(): void {
    this.stationHardwareState.set('station-asoke-01', {
      isOnline: true,
      isJammed: false,
      sensorState: 'CLOSED',
      lockState: 'LOCKED',
    });
  }

  public setStationSimulatedState(
    stationId: string,
    state: { isOnline?: boolean; isJammed?: boolean; sensorState?: HardwareSensorState; lockState?: HardwareLockState }
  ): void {
    const existing = this.stationHardwareState.get(stationId) || {
      isOnline: true,
      isJammed: false,
      sensorState: 'CLOSED',
      lockState: 'LOCKED',
    };
    this.stationHardwareState.set(stationId, { ...existing, ...state });
  }

  /**
   * Dispatches an asynchronous unlock command to the station over simulated MQTT topic
   */
  public async dispatchUnlockCommand(params: {
    stationId: string;
    compartmentId: string;
    relayIndex: number;
    correlationToken: string;
  }): Promise<IoTUnlockCommand> {
    const command: IoTUnlockCommand = {
      commandId: `cmd_${randomUUID()}`,
      stationId: params.stationId,
      compartmentId: params.compartmentId,
      relayIndex: params.relayIndex,
      pulseDurationMs: config.iot.pulseDurationMs,
      issuedAt: Date.now(),
      ttlMs: config.iot.commandTimeoutMs,
      correlationToken: params.correlationToken,
    };

    this.pendingCommands.set(command.commandId, command);

    auditLogger.log('IOT_COMMAND_DISPATCHED', 'STATION', params.stationId, {
      commandId: command.commandId,
      compartmentId: params.compartmentId,
      relayIndex: params.relayIndex,
    });

    return command;
  }

  /**
   * Simulates Edge Controller executing command and publishing sensor feedback event
   */
  public async simulateStationExecution(commandId: string): Promise<IoTEventFeedback | null> {
    const command = this.pendingCommands.get(commandId);
    if (!command) return null;

    const hw = this.stationHardwareState.get(command.stationId);
    if (!hw || !hw.isOnline) {
      // Station is offline, no ACK / event emitted (triggers timeout reconciliation)
      return null;
    }

    if (hw.isJammed) {
      const feedback: IoTEventFeedback = {
        commandId,
        stationId: command.stationId,
        compartmentId: command.compartmentId,
        sensorStatus: 'CLOSED',
        lockStatus: 'JAMMED',
        timestamp: Date.now(),
      };
      this.pendingCommands.delete(commandId);
      return feedback;
    }

    // Normal successful relay pulse & reed switch trigger
    const feedback: IoTEventFeedback = {
      commandId,
      stationId: command.stationId,
      compartmentId: command.compartmentId,
      sensorStatus: 'OPEN',
      lockStatus: 'UNLOCKED',
      timestamp: Date.now(),
    };

    this.pendingCommands.delete(commandId);
    return feedback;
  }

  public async pollStationSensorStatus(stationId: string, compartmentId: string): Promise<{
    sensorState: HardwareSensorState;
    lockState: HardwareLockState;
  }> {
    const hw = this.stationHardwareState.get(stationId);
    if (!hw || !hw.isOnline) {
      return { sensorState: 'UNKNOWN', lockState: 'PENDING_VERIFICATION' };
    }
    return { sensorState: hw.sensorState, lockState: hw.lockState };
  }
}

export const iotGatewayService = new IoTGatewayService();
