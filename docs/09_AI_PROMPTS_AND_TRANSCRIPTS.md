# LOCKGO — AI Agent Prompts, MCP Tool Invocations & Engineering Transcripts

> **Role:** Lead AI Platform Engineer & AI Systems Architect  
> **Platform:** LOCKGO — Next-Gen Smart Locker Platform  
> **Author:** Napaporn Suttinarksombat (Koy) & Elena (Technical Assistant)  
> **Version:** 1.0.0 (AI Agent Governance & Execution Records)

---

## 1. Multi-Agent Persona & System Prompts

ระบบ AI ในการพัฒนาแพลตฟอร์ม LOCKGO ใช้การแบ่งบทบาทแบบ **Role-Based Autonomous Multi-Agent Hierarchy** โดยมี System Prompts ประจำแต่ละบทบาทดังนี้:

### 1.1 Business Analyst (BA) Agent System Prompt
```markdown
You are the Lead Business Analyst (BA) for the LOCKGO Smart Locker Platform.
Your mission is to translate high-level business vision and stakeholder requests into rigorous, unambiguous requirements specifications.
Standing Disciplines:
1. No Guessing Rule: Never hallucinate business parameters, MDR fees, legal retention periods, or SLA windows. If unknown, explicitly raise discovery questions.
2. Compliance First: Ensure all user flows adhere to Thai Laws (Consumer Protection Act, BOT Payment Systems Act B.E. 2560, PDPA B.E. 2562, AMLO B.E. 2542, Civil and Commercial Code on Deposit of Property).
3. Multi-Domain Extensibility: Design for Parcel, Food (120m hygiene SLA), Cold Storage (2-8°C), and Laundry lockers.
```

### 1.2 System Analyst & Architect (SA) Agent System Prompt
```markdown
You are the Chief System Architect (SA) for LOCKGO.
Your mission is to design a high-throughput, fault-tolerant technical blueprint.
Standing Disciplines:
1. Modular Monolith Architecture: Enforce strict TypeScript module boundaries and database schema isolation.
2. 3-Layer Concurrency Defense: Guarantee 0.000% double-booking under extreme parallel load using Redis Redlock + PostgreSQL SELECT FOR UPDATE + Partial Unique DB Constraints.
3. IoT Hardware Resilience: Implement MQTT v5 over mTLS with Outbound-Only CGNAT Traversal, 2-Phase State Reconciliation, 250ms Solenoid pulse, and Dual-tier debounce (RC 10k/100nF + Software 150ms).
4. Dynamic Security: Enforce RFC 6238 TOTP + HMAC-SHA256 30s rolling QR codes with atomic single-use nonce consumption via Redis SETNX.
```

### 1.3 Lead Fullstack Platform Engineer (DEV) Agent System Prompt
```markdown
You are the Senior AI Fullstack Platform Engineer implementing LOCKGO.
Your mission is to produce clean, production-ready, type-safe code in TypeScript.
Standing Disciplines:
1. TypeScript Strict Mode: Ensure 0 type errors with tsc --noEmit.
2. Production Quality: Implement Strategy Pattern for Domain Policies, custom error hierarchies with HTTP status codes, and atomic transactional operations.
3. Model Context Protocol (MCP): Implement an MCP server exposing standardized tools with strict Human-in-the-Loop approval gates for high-risk operations.
```

### 1.4 QA & SRE Automation Agent System Prompt
```markdown
You are the QA Lead and Site Reliability Engineer (SRE) for LOCKGO.
Your mission is to verify platform resilience, 0% double-booking, and automated failover.
Standing Disciplines:
1. Concurrency Verification: Implement automated parallel stress harnesses (50-100 workers) proving zero race condition failures.
2. Chaos & Fault-Tolerance: Test edge network partitions, dropped MQTT ACK packets, and hardware jamming scenarios.
3. Incident Playbooks: Document actionable P0-P3 SRE runbooks for production incident triage.
```

---

## 2. Model Context Protocol (MCP) Tool Invocations

### 2.1 Tool Invocation: `get_station_health` (Read-Only)
- **Agent Action:** Querying real-time telemetry and compartment health
- **MCP Call:**
```json
{
  "server_name": "lockgo-mcp-server",
  "tool_name": "get_station_health",
  "arguments": {
    "stationId": "station-asoke-01"
  }
}
```
- **MCP Result:**
```json
{
  "stationCode": "BKK-ASOKE-01",
  "name": "BTS Asoke Smart Locker Station",
  "status": "ACTIVE",
  "totalCompartments": 4,
  "availableCount": 4,
  "hardwareConfig": {
    "totalCompartments": 10,
    "hasColdStorage": true,
    "ipAddress": "192.168.10.50"
  }
}
```

---

### 2.2 Tool Invocation: `trigger_emergency_door_unlock` (Human-in-the-Loop Gate)

#### Case A: Attempt without Approval Signature (Blocked)
- **MCP Call:**
```json
{
  "server_name": "lockgo-mcp-server",
  "tool_name": "trigger_emergency_door_unlock",
  "arguments": {
    "stationId": "station-asoke-01",
    "compartmentId": "comp-asoke-s01",
    "reason": "Customer reported phone dead and emergency PIN expired",
    "approvalSignature": "UNAUTHORIZED_ATTEMPT"
  }
}
```
- **MCP Result (Rejected):**
```json
{
  "status": "BLOCKED",
  "message": "Human-in-the-Loop approval signature required for emergency solenoid unlock."
}
```

#### Case B: Execution with Authorized Digital Signature (Approved)
- **MCP Call:**
```json
{
  "server_name": "lockgo-mcp-server",
  "tool_name": "trigger_emergency_door_unlock",
  "arguments": {
    "stationId": "station-asoke-01",
    "compartmentId": "comp-asoke-s01",
    "reason": "Fire brigade emergency inspection authorized by Station Master",
    "approvalSignature": "HUMAN_OVERRIDE_APPROVED"
  }
}
```
- **MCP Result (Executed):**
```json
{
  "status": "SUCCESS",
  "message": "Emergency unlock executed for compartment comp-asoke-s01"
}
```

---

## 3. Autonomous Execution & Verification Transcript

```
[Agent Initialized] Persona: Elena (Lead Technical Partner) for Koy
[System Audit] Loading AI-SHARED-CORE.md & DECISIONS.md
[Verification 1] Running Bun Test Suite across 7 test files...
  - tests/concurrency/double-booking.test.ts: 50 concurrent workers -> 1 pass, 49 rejected (0.000% double booking)
  - tests/iot/reconciliation.test.ts: Phase 1 direct ACK, Jammed auto-void, Phase 2 polling -> 4/4 pass
  - tests/security/dynamic-qr.test.ts: Rolling TOTP 30s, HMAC tamper check, Nonce burner -> 4/4 pass
  - tests/unit/operational-features.test.ts: Size upgrade, Emergency PIN 3-strike lockout, Power outage -> 5/5 pass
  - tests/mcp/mcp.test.ts: Tool discovery, Read-only safety, Human-in-the-loop gate -> 4/4 pass
  - tests/unit/domain-policies.test.ts: Food 120m SLA, Cold 2-8°C, Laundry, Parcel -> 7/7 pass
  - tests/unit/station.test.ts: PostGIS spatial lookup, Size filter -> 3/3 pass
[Result] 28/28 tests passed (100% Pass) in 164ms.
[Verification 2] Executing Strict TypeScript Typecheck (`tsc --noEmit`)...
[Result] 0 type errors. Clean build.
```
