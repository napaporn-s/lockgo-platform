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

  it('should execute read-only tool get_station_health safely', async () => {
    const res = await mcpServer.handleToolCall('get_station_health', {
      stationId: 'station-asoke-01',
    });

    expect(res.stationCode).toBe('BKK-ASOKE-01');
    expect(res.totalCompartments).toBe(4);
    expect(res.availableCount).toBe(4);
  });

  it('should block emergency door unlock without valid Human-in-the-Loop approval signature', async () => {
    const res = await mcpServer.handleToolCall('trigger_emergency_door_unlock', {
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-m01',
      reason: 'User item stuck inside',
      approvalSignature: 'UNAUTHORIZED_AI_ATTEMPT',
    });

    expect(res.status).toBe('BLOCKED');
    expect(res.message).toContain('Human-in-the-Loop approval signature required');
  });

  it('should execute emergency door unlock when Human-in-the-Loop signature is provided', async () => {
    const res = await mcpServer.handleToolCall('trigger_emergency_door_unlock', {
      stationId: 'station-asoke-01',
      compartmentId: 'comp-asoke-m01',
      reason: 'User item stuck inside',
      approvalSignature: 'HUMAN_OVERRIDE_APPROVED',
    });

    expect(res.status).toBe('SUCCESS');
  });
});
