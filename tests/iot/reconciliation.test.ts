import { describe, it, expect, beforeEach } from 'bun:test';
import { lockReconciliationService } from '../../src/modules/iot/reconciliation.service';
import { iotGatewayService } from '../../src/modules/iot/iot-gateway.service';
import { db } from '../../src/core/database';
import { HardwareJammedError, HardwareCommunicationError } from '../../src/core/errors';

describe('IoT Hardware Integration & 2-Phase Lock State Reconciliation', () => {
  beforeEach(() => {
    db.reset();
    iotGatewayService.initDefaultHardware();
  });

  it('Phase 1 Happy Path: should immediately confirm unlock when direct MQTT ACK event arrives', async () => {
    const result = await lockReconciliationService.executeUnlockWithReconciliation({
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-m01',
      relayIndex: 2,
      correlationToken: 'res-test-01',
    });

    expect(result.status).toBe('CONFIRMED_UNLOCKED');
    expect(result.details.sensorStatus).toBe('OPEN');
  });

  it('Phase 1 Jammed Detection: should throw HardwareJammedError when sensor detects solenoid jam', async () => {
    // Injected fault: Door mechanically jammed
    iotGatewayService.setStationSimulatedState('station-asoke-01', {
      isJammed: true,
      sensorState: 'CLOSED',
    });

    await expect(
      lockReconciliationService.executeUnlockWithReconciliation({
        stationId: 'station-asoke-01',
        compartmentId: 'comp-asoke-m01',
        relayIndex: 2,
        correlationToken: 'res-test-02',
      })
    ).rejects.toThrow(HardwareJammedError);
  });

  it('Phase 2 Fallback: should reconcile successfully via active sensor polling when ACK packet dropped', async () => {
    // Injected fault: Station ACK dropped over network, but physical door opened
    iotGatewayService.setStationSimulatedState('station-asoke-01', {
      isOnline: false, // Drop immediate ACK
    });

    // Emulate edge reconnection and sensor reading OPEN
    setTimeout(() => {
      iotGatewayService.setStationSimulatedState('station-asoke-01', {
        isOnline: true,
        sensorState: 'OPEN',
        lockState: 'UNLOCKED',
      });
    }, 20);

    const result = await lockReconciliationService.executeUnlockWithReconciliation({
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-m01',
      relayIndex: 2,
      correlationToken: 'res-test-03',
      maxRetries: 5,
      retryDelayMs: 15,
    });

    expect(result.status).toBe('CONFIRMED_UNLOCKED');
    expect(result.details.reconciled).toBe(true);
  });

  it('Phase 2 Station Offline: should throw HardwareCommunicationError when station remains offline', async () => {
    // Injected fault: Complete persistent power cut / offline station
    iotGatewayService.setStationSimulatedState('station-asoke-01', {
      isOnline: false,
    });

    await expect(
      lockReconciliationService.executeUnlockWithReconciliation({
        stationId: 'station-asoke-01',
        compartmentId: 'comp-asoke-m01',
        relayIndex: 2,
        correlationToken: 'res-test-04',
        maxRetries: 2,
        retryDelayMs: 5,
      })
    ).rejects.toThrow(HardwareCommunicationError);
  });
});
