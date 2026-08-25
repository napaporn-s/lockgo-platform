import { describe, it, expect, beforeEach } from 'bun:test';
import { mcpServer, LOCKGO_MCP_TOOLS } from '../../src/mcp/server';
import { db } from '../../src/core/database';

describe('Model Context Protocol (MCP) Server & AI Governance', () => {
  beforeEach(() => {
    db.reset();
  });

  it('should expose standardized MCP tool schemas for subagent discovery', () => {
    expect(LOCKGO_MCP_TOOLS.length).toBeGreaterThanOrEqual(4);
    const toolNames = LOCKGO_MCP_TOOLS.map(t => t.name);
    expect(toolNames).toContain('get_station_health');
    expect(toolNames).toContain('query_compartment_availability');
    expect(toolNames).toContain('diagnose_lock_reconciliation_incident');
    expect(toolNames).toContain('trigger_emergency_door_unlock');
  });

  it('should handle JSON-RPC 2.0 initialize request correctly', async () => {
    const res = await mcpServer.handleJsonRpcRequest({
      jsonrpc: '2.0',
      id: 101,
      method: 'initialize',
    });

    expect(res.jsonrpc).toBe('2.0');
    expect(res.id).toBe(101);
    expect(res.result.serverInfo.name).toBe('lockgo-mcp-server');
    expect(res.result.protocolVersion).toBe('2024-11-05');
  });

  it('should handle JSON-RPC 2.0 tools/list request', async () => {
    const res = await mcpServer.handleJsonRpcRequest({
      jsonrpc: '2.0',
      id: 102,
      method: 'tools/list',
    });

    expect(res.jsonrpc).toBe('2.0');
    expect(res.result.tools).toHaveLength(4);
  });

  it('should execute read-only tool get_station_health via JSON-RPC tools/call safely', async () => {
    const res = await mcpServer.handleJsonRpcRequest({
      jsonrpc: '2.0',
      id: 103,
      method: 'tools/call',
      params: {
        name: 'get_station_health',
        arguments: { stationId: 'station-asoke-01' },
      },
    });

    expect(res.result.content[0].type).toBe('text');
    const data = JSON.parse(res.result.content[0].text);
    expect(data.stationCode).toBe('BKK-ASOKE-01');
    expect(data.totalCompartments).toBe(4);
    expect(data.availableCount).toBe(4);
  });

  it('should block emergency door unlock with forged or invalid digital signature', async () => {
    const res = await mcpServer.handleToolCall('trigger_emergency_door_unlock', {
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-m01',
      reason: 'User item stuck inside',
      approvalSignature: 'deadbeef12345678',
    });

    expect(res.status).toBe('BLOCKED');
    expect(res.message).toContain('Invalid cryptographic Human-in-the-Loop digital signature');
  });

  it('should execute emergency door unlock when valid cryptographic digital signature is provided', async () => {
    const compartmentId = 'comp-asoke-m01';
    const reason = 'Solenoid jam confirmed by field technician';
    const validSignature = mcpServer.generateEmergencyApprovalSignature(compartmentId, reason);

    const res = await mcpServer.handleToolCall('trigger_emergency_door_unlock', {
      stationId: 'station-asoke-01',
      compartmentId,
      reason,
      approvalSignature: validSignature,
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.message).toContain('Emergency unlock executed');
  });
});
