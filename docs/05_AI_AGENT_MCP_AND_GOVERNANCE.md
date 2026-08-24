# LOCKGO — AI Agent Architecture, MCP & AI Governance (AI Platform Phase)

> **Role:** Lead AI Platform Engineer & AI Governance Architect  
> **Platform:** LOCKGO — Next-Gen Smart Locker Platform  
> **Author:** Napaporn Suttinarksombat (Koy) & Elena (Technical Assistant)  
> **Version:** 1.0.0 (Enterprise AI Governance Blueprint)

---

## 1. Multi-Agent Ecosystem Architecture (Model Context Protocol - MCP)

LockGo utilizes a **Role-Based Autonomous Multi-Agent Hierarchy** governed by the **Model Context Protocol (MCP)** standard to eliminate context drift and enforce strict operational boundaries.

```mermaid
flowchart TD
    HumanSupervisor([Human Lead / Koy - Chief Orchestrator])

    subgraph AgentSwarm ["Specialized Role-Based AI Agents"]
        BA_Agent["BA Agent (Requirements & Domain Rules)"]
        SA_Agent["SA Agent (System Architecture & ADRs)"]
        PM_Agent["PM Agent (WBS, Roadmap & DoD)"]
        DEV_Agent["DEV Agent (Clean TypeScript Implementation)"]
        QA_Agent["QA Agent (Automated Tests & Chaos Scenarios)"]
        DevOps_Agent["DevOps Agent (CI/CD, Docker & SRE Runbooks)"]
    end

    subgraph MCPLayer ["Model Context Protocol (MCP) Tool Servers"]
        DBSchemaMCP["Postgres Schema MCP (Read-Only)"]
        OpenAPIMCP["OpenAPI Contract MCP"]
        GitRepoMCP["Git Repository & Worktree MCP"]
        ObservabilityMCP["Telemetry & Log MCP (Read-Only)"]
        SecurityGuardMCP["Security Guard & Policy MCP"]
    end

    HumanSupervisor -->|Review & Approve Critical Gates| AgentSwarm
    BA_Agent --> SA_Agent --> PM_Agent --> DEV_Agent --> QA_Agent --> DevOps_Agent
    
    DEV_Agent <-->|Context & Types| DBSchemaMCP
    DEV_Agent <-->|API Specs| OpenAPIMCP
    QA_Agent <-->|Run Tests| GitRepoMCP
    DevOps_Agent <-->|Query Metrics| ObservabilityMCP
    AgentSwarm -->|Compliance Check| SecurityGuardMCP
```

---

## 2. Model Context Protocol (MCP) Tool Contracts

### 2.1 Database Schema MCP (`mcp-postgres-schema`)
- **Scope:** Read-Only inspection of relational tables, foreign keys, spatial indexes, and column types.
- **Enforcement:** Strictly denies `DROP`, `TRUNCATE`, `ALTER`, or un-sandboxed `UPDATE` queries. Prevents AI hallucinations about database schema definitions.

### 2.2 Dynamic Access Security MCP (`mcp-dynamic-security`)
- **Scope:** Validates dynamic TOTP/HMAC QR code tokens and inspects single-use nonce consumption.
- **Enforcement:** Encrypted secret storage with hardware security module (HSM) emulation.

### 2.3 Hardware Telemetry MCP (`mcp-iot-telemetry`)
- **Scope:** Queries station online status, door sensor open/close states, and compartment temperature logs.

---

## 3. Context Engineering & Single Source of Truth (SSOT)

To eliminate hallucination and context drift across multi-turn AI interactions:

```mermaid
flowchart LR
    subgraph SSOT_Repo ["Repository SSOT"]
        SharedCore["AI-SHARED-CORE.md\n(Golden Rules & Safety)"]
        Architecture["02_SYSTEM_ARCHITECTURE.md\n(System Blueprint)"]
        Decisions["DECISIONS.md\n(ADR-001 to ADR-005)"]
        WorkLog["WORK_LOG.md\n(Session History & State)"]
    end

    subgraph ContextEngine ["Context Priming Pipeline"]
        Pruner["Token-Efficient Context Pruner"]
        Validator["Constraint & Boundary Validator"]
    end

    subgraph AgentContext ["AI Working Memory"]
        ActiveAgent["Autonomous Agent Session"]
    end

    SSOT_Repo --> ContextEngine --> AgentContext
```

### Context Engineering Disciplines:
1. **Dynamic Workspace Priming:** Every agent session automatically injects canonical architecture guidelines (`AI-SHARED-CORE.md`, `DECISIONS.md`) before executing tasks.
2. **Deterministic Context Boundaries:** Agents are provided structured JSON schemas rather than ambiguous natural language descriptions when generating database queries or API payloads.
3. **Automated Drift Detection:** If an agent attempts to generate code that conflicts with established ADRs, the linting/review gate flags the discrepancy immediately.

---

## 4. AI Production Safety & Governance (Human-in-the-Loop Gates)

In adherence to enterprise safety and ISO/IEC 27001 readiness:

```mermaid
stateDiagram-v2
    [*] --> AI_Proposal: Agent Generates Solution
    AI_Proposal --> Static_Audit: Automated L1/L2 Static Checks
    
    state Static_Audit {
        TypeScript_Strict_Check
        Dependency_Vulnerability_Scan
        Security_Guard_Redaction
    }

    Static_Audit --> LowRisk_AutoApprove: Non-Destructive Code / Tests
    Static_Audit --> HighRisk_Gate: Touches Auth / Schema / Financial / Hardware

    state HighRisk_Gate {
        Human_In_The_Loop_Review
        Explicit_Digital_Approval
    }

    LowRisk_AutoApprove --> [*]: Merged & Deployed
    HighRisk_Gate --> [*]: Approved by Koy (Human Lead)
    HighRisk_Gate --> AI_Proposal: Rejected with Feedback
```

### Critical Red Line Rules (Standing Disciplines):
- **Rule 1 (Schema & Data Mutation):** No AI agent is permitted to execute production database migrations or schema drops without explicit human authorization.
- **Rule 2 (Financial & Access Code):** Any modification touching payment calculation, refund issuance, or cryptographic secret handling requires manual line-by-line review.
- **Rule 3 (PII & Secret Protection):** AI telemetry and context processors automatically redact user phone numbers, email addresses, and secret keys using regex tokenizers before logging.

---

## 5. 6-Month Enterprise AI Transformation Roadmap

A strategic 4-phase transformation plan for LockGo to scale engineering productivity by 400% while maintaining rock-solid platform reliability:

```mermaid
gantt
    title 6-Month AI Transformation Roadmap (LockGo Enterprise)
    dateFormat  YYYY-MM
    axisFormat  Month %m

    section Phase 1: Foundation (M1-M2)
    Standardize AI Tooling & Cursor/AGY Rules    :done, p1_1, 2026-09, 2026-10
    Deploy Read-Only Internal MCP Servers        :done, p1_2, 2026-09, 2026-10
    AI Governance & PII Redaction Policy Setup   :p1_3, 2026-10, 2026-11

    section Phase 2: Workflow Acceleration (M2-M3)
    AI-Assisted Automated Test Generation        :p2_1, 2026-10, 2026-11
    Automated PR Summary & Security Reviewer     :p2_2, 2026-11, 2026-12
    Self-Healing CI/CD Pipeline Integration      :p2_3, 2026-11, 2026-12

    section Phase 3: Autonomous Platform (M4-M5)
    IoT Hardware Predictive Maintenance Agents   :p3_1, 2026-12, 2027-01
    Dynamic Pricing & Locker Demand Forecasting  :p3_2, 2027-01, 2027-02
    Automated SRE Incident Triage Agent          :p3_3, 2027-01, 2027-02

    section Phase 4: Maturity & ROI (M6)
    ISO/IEC 42001 AI Management Certification    :p4_1, 2027-02, 2027-03
    Enterprise Knowledge Graph & Copilot 2.0     :p4_2, 2027-02, 2027-03
```

### Key Performance Indicators (ROI Metrics):
- **Engineering Cycle Time:** PR review time reduced from 24h to < 3h.
- **Test Coverage Velocity:** Automated test suite generated 3.5x faster.
- **Incident Mean Time to Recovery (MTTR):** SRE triage AI reduces MTTR from 45 mins to < 8 mins.
- **Zero Security Breaches:** 100% adherence to Human-in-the-Loop governance gates.
