/**
 * LOCKGO — Model Context Protocol (MCP) Server (JSON-RPC 2.0 Stdio Transport)
 * Exposes standardized tools and observability resources for AI Multi-Agent workflows.
 */

import { stationService } from '../modules/station/station.service';
import { db } from '../core/database';
import { auditLogger } from '../modules/audit/audit-logger';
import { iotGatewayService } from '../modules/iot/iot-gateway.service';
import { createHmac, timingSafeEqual } from 'crypto';
import * as readline from 'readline';

const EMERGENCY_HITL_SECRET = process.env.MCP_EMERGENCY_SECRET || 'lockgo-hitl-override-key-secp256k1';

export interface MCPToolDefinition {
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
    description: 'Emergency override to unlock a compartment (Requires Cryptographic Human Approval Digital Signature).',
    inputSchema: {
      type: 'object',
      properties: {
        stationId: { type: 'string' },
        compartmentId: { type: 'string' },
        reason: { type: 'string' },
        approvalSignature: { type: 'string', description: 'HMAC-SHA256 digital signature from authorized human supervisor' },
      },
      required: ['stationId', 'compartmentId', 'reason', 'approvalSignature'],
    },
  },
];

export class LockGoMCPServer {
  /**
   * Generates a cryptographic HMAC-SHA256 signature for Human-in-the-Loop emergency actions.
   */
  public generateEmergencyApprovalSignature(compartmentId: string, reason: string): string {
    return createHmac('sha256', EMERGENCY_HITL_SECRET)
      .update(`${compartmentId}:${reason}`)
      .digest('hex');
  }

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
        if (!args.approvalSignature || typeof args.approvalSignature !== 'string') {
          return {
            status: 'BLOCKED',
            message: 'Human-in-the-Loop cryptographic digital signature required for emergency solenoid unlock.',
          };
        }

        const expectedSig = this.generateEmergencyApprovalSignature(args.compartmentId, args.reason);
        const sigBuf = Buffer.from(args.approvalSignature, 'hex');
        const expectedBuf = Buffer.from(expectedSig, 'hex');

        const isValid = sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);

        if (!isValid) {
          return {
            status: 'BLOCKED',
            message: 'Invalid cryptographic Human-in-the-Loop digital signature. Emergency solenoid unlock rejected.',
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

  /**
   * Processes a JSON-RPC 2.0 Request Object and returns the corresponding JSON-RPC response.
   */
  public async handleJsonRpcRequest(req: any): Promise<any> {
    if (!req || typeof req !== 'object') {
      return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
    }

    const { id, method, params } = req;
    let response: any = { jsonrpc: '2.0', id: id !== undefined ? id : null };

    switch (method) {
      case 'initialize':
        response.result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'lockgo-mcp-server', version: '1.0.0' },
        };
        break;

      case 'tools/list':
        response.result = { tools: LOCKGO_MCP_TOOLS };
        break;

      case 'tools/call':
        if (!params || !params.name) {
          response.error = { code: -32602, message: 'Missing tool name' };
        } else {
          try {
            const toolResult = await this.handleToolCall(params.name, params.arguments || {});
            response.result = {
              content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }],
            };
          } catch (toolErr: any) {
            response.result = {
              isError: true,
              content: [{ type: 'text', text: toolErr.message || 'Tool execution error' }],
            };
          }
        }
        break;

      case 'ping':
        response.result = {};
        break;

      default:
        response.error = { code: -32601, message: `Method not found: ${method}` };
    }

    return response;
  }

  /**
   * Starts the JSON-RPC 2.0 Stdio Transport loop for MCP Clients (Cursor, Claude Code, Antigravity)
   */
  public startStdioServer(): void {
    console.error('===========================================================');
    console.error('  LOCKGO Model Context Protocol (MCP) Server (JSON-RPC 2.0)');
    console.error('===========================================================');
    console.error(`  Status: ACTIVE (Listening on Stdio)`);
    console.error(`  Protocol: MCP Spec 2024-11-05 (JSON-RPC 2.0)`);
    console.error(`  Exposed Tools: ${LOCKGO_MCP_TOOLS.map(t => t.name).join(', ')}`);
    console.error('-----------------------------------------------------------');
    console.error('  Ready to receive JSON-RPC messages from AI Coding Agents.');
    console.error('===========================================================');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line) => {
      const cleanLine = line.replace(/^\uFEFF/, '').trim();
      if (!cleanLine) return;

      try {
        const req = JSON.parse(cleanLine);
        const res = await this.handleJsonRpcRequest(req);
        process.stdout.write(JSON.stringify(res) + '\n');
      } catch (err: any) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error: invalid JSON' },
        }) + '\n');
      }
    });
  }
}

export const mcpServer = new LockGoMCPServer();

// Auto-start when executed directly via `bun run mcp` or `node`
if (import.meta.main || process.argv[1]?.endsWith('server.ts')) {
  mcpServer.startStdioServer();
}
