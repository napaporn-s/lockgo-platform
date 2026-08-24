/**
 * LOCKGO — Model Context Protocol (MCP) Server
 * Exposes standardized tools and observability resources for AI Multi-Agent workflows.
 */

import { stationService } from '../modules/station/station.service';
import { db } from '../core/database';
import { auditLogger } from '../modules/audit/audit-logger';
import { iotGatewayService } from '../modules/iot/iot-gateway.service';

interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const LOCKGO_MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: 'get_station_health',
    description: 'Inspects real-time station telemetry, door sensor status, and connectivity health.',
    inputSchema: {
      type: 'object',
      properties: {
        stationId: { type: 'string', description: 'Unique station identifier' },
      },
      required: ['stationId'],
    },
  },
  {
    name: 'query_compartment_availability',
    description: 'Queries available compartments for a specific station, optionally filtered by size tier.',
    inputSchema: {
      type: 'object',
      properties: {
        stationId: { type: 'string', description: 'Unique station identifier' },
        sizeTier: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
      },
      required: ['stationId'],
    },
  },
  {
    name: 'diagnose_lock_reconciliation_incident',
    description: 'Retrieves audit traces and IoT sensor events to diagnose locker desync or jamming.',
    inputSchema: {
      type: 'object',
      properties: {
        compartmentId: { type: 'string', description: 'Compartment ID experiencing issues' },
      },
      required: ['compartmentId'],
    },
  },
  {
    name: 'trigger_emergency_door_unlock',
    description: 'Emergency override to unlock a compartment (Requires Human Approval Gate).',
    inputSchema: {
      type: 'object',
      properties: {
        stationId: { type: 'string' },
        compartmentId: { type: 'string' },
        reason: { type: 'string' },
        approvalSignature: { type: 'string' },
      },
      required: ['stationId', 'compartmentId', 'reason', 'approvalSignature'],
    },
  },
];

export class LockGoMCPServer {
  public async handleToolCall(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'get_station_health': {
        const station = stationService.getStationById(args.stationId);
        const comps = db.getCompartmentsByStation(args.stationId);
        return {
          stationCode: station.stationCode,
          name: station.name,
          status: station.status,
          totalCompartments: comps.length,
          availableCount: comps.filter(c => c.status === 'AVAILABLE').length,
          hardwareConfig: station.hardwareConfig,
        };
      }

      case 'query_compartment_availability': {
        const comps = stationService.getAvailableCompartments(args.stationId, {
          sizeTier: args.sizeTier,
        });
        return {
          stationId: args.stationId,
          availableCompartments: comps.map(c => ({
            id: c.id,
            compartmentNumber: c.compartmentNumber,
            sizeTier: c.sizeTier,
            domainVertical: c.domainVertical,
          })),
        };
      }

      case 'diagnose_lock_reconciliation_incident': {
        const logs = auditLogger.getLogs().filter(l => l.resourceId === args.compartmentId);
        const sensor = await iotGatewayService.pollStationSensorStatus('station-asoke-01', args.compartmentId);
        return {
          compartmentId: args.compartmentId,
          sensorState: sensor.sensorState,
          lockState: sensor.lockState,
          auditHistory: logs,
        };
      }

      case 'trigger_emergency_door_unlock': {
        if (!args.approvalSignature || args.approvalSignature !== 'HUMAN_OVERRIDE_APPROVED') {
          return {
            status: 'BLOCKED',
            message: 'Human-in-the-Loop approval signature required for emergency solenoid unlock.',
          };
        }
        auditLogger.log('EMERGENCY_UNLOCK_TRIGGERED', 'COMPARTMENT', args.compartmentId, {
          reason: args.reason,
          approvalSignature: args.approvalSignature,
        });
        return {
          status: 'SUCCESS',
          message: `Emergency unlock executed for compartment ${args.compartmentId}`,
        };
      }

      default:
        throw new Error(`Unknown MCP tool: ${name}`);
    }
  }
}

export const mcpServer = new LockGoMCPServer();
