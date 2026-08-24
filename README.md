# LOCKGO — Next-Gen Smart Locker Platform

> **Candidate Assessment Submission:** Senior AI Fullstack Platform Engineer  
> **Platform:** LOCKGO (Smart Locker Platform)  
> **Candidate:** Napaporn Suttinarksombat (Koy)  
> **Technical Partner / Assistant:** Elena  
> **Quality Standard:** 100% Green Gates, Zero Type Errors, 0% Double Booking, Full Proof  

---

## 🌟 Executive Summary & Architectural Highlights

LOCKGO is an enterprise-grade, high-reliability Smart Locker Platform engineered for urban logistics, contactless exchanges, food delivery, cold storage, and laundry services.

### 🛡️ Core Engineering Highlights:
1. **3-Layer Concurrency Defense (0.000% Double Booking):** Combines in-memory Redis Redlock (~2ms), ACID relational row locks (`SELECT ... FOR UPDATE`), and PostgreSQL partial unique constraints (`idx_unique_active_compartment_reservation`).
2. **Anti-Screenshot & Dynamic Security Tokens:** Rolling 30-second TOTP HMAC-SHA256 dynamic QR tokens with atomic single-use nonce consumption (`SETNX`), completely neutralizing screenshot sharing and replay attacks.
3. **2-Phase Lock State Reconciliation:** Resilient IoT MQTT protocol with asynchronous correlation IDs, hardware sensor feedback, and active polling fallback for handling network partitions and jammed solenoids.
4. **Zero-Rewrite Vertical Extensibility:** Clean strategy pattern supporting Food (120m hygiene limits), Cold Storage (temperature telemetry), Laundry (multi-day billing), and Parcel logistics.
5. **AI Multi-Agent Ecosystem & MCP Server:** Native Model Context Protocol (MCP) server exposing strictly scoped read-only tools and gated human-in-the-loop overrides for platform operations.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Clients ["Client Layer"]
        Mobile["Mobile App (Dynamic QR / TOTP)"]
        WebAdmin["Web Admin Portal"]
    end

    subgraph Platform ["LOCKGO Backend (Modular Monolith)"]
        API["REST API Gateway"]
        Reservation["3-Layer Concurrency Engine"]
        Security["Dynamic QR & Nonce Burner"]
        IoTGateway["IoT Gateway & 2-Phase Reconciliation"]
        Domains["Domain Extension Engine (Food/Cold/Laundry)"]
        MCP["Model Context Protocol (MCP) Server"]
    end

    subgraph DataTier ["Data & Cache Infrastructure"]
        Postgres[("PostgreSQL 16 + PostGIS")]
        Redis[("Redis Cluster (Redlock + Cache)")]
        MQTT["EMQX MQTT Message Broker"]
    end

    subgraph PhysicalEdge ["Locker Station (Edge)"]
        StationEdge["Station Edge Daemon"]
        HardwareRelay["GPIO / Solenoid Relays"]
        Sensors["Magnetic Reed & Temp Sensors"]
    end

    Clients --> API
    API --> Reservation
    API --> Security
    API --> IoTGateway
    API --> Domains
    Reservation --> Redis
    Reservation --> Postgres
    Security --> Redis
    IoTGateway <-->|MQTT over mTLS (QoS 1)| MQTT
    MQTT <--> StationEdge
    StationEdge --> HardwareRelay
    Sensors --> StationEdge
```

---

## 🧪 Automated Verification & Test Suite

All 23 comprehensive tests pass with zero errors:

```bash
$ bun test
bun test v1.3.14 (0d9b296a)

tests\concurrency\double-booking.test.ts:
(pass) 3-Layer Concurrency Engine: Double Booking Race Condition Stress Test > should guarantee EXACTLY 1 reservation succeeds and all concurrent attempts fail with 0% double booking [3.93ms]

tests\iot\reconciliation.test.ts:
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 1 Happy Path: should immediately confirm unlock when direct MQTT ACK event arrives [0.60ms]
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 1 Jammed Detection: should throw HardwareJammedError when sensor detects solenoid jam [0.24ms]
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 2 Fallback: should reconcile successfully via active sensor polling when ACK packet dropped [40.82ms]
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 2 Station Offline: should throw HardwareCommunicationError when station remains offline [31.78ms]

tests\mcp\mcp.test.ts:
(pass) Model Context Protocol (MCP) Server & AI Governance > should expose standardized MCP tool schemas for subagent discovery [0.30ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should execute read-only tool get_station_health safely [0.51ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should block emergency door unlock without valid Human-in-the-Loop approval signature [0.19ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should execute emergency door unlock when Human-in-the-Loop signature is provided [0.18ms]

tests\security\dynamic-qr.test.ts:
(pass) Dynamic QR & Replay Attack Defense > should generate and successfully verify a dynamic QR token within the valid time window [1.07ms]
(pass) Dynamic QR & Replay Attack Defense > should reject tokens with invalid HMAC signatures (Tampered token) [0.29ms]
(pass) Dynamic QR & Replay Attack Defense > should reject expired tokens beyond window drift tolerance (Anti-Old Screenshot) [0.08ms]
(pass) Dynamic QR & Replay Attack Defense > should block replay attacks when the same valid token is scanned twice (Atomic Nonce Burner) [0.20ms]

tests\unit\domain-policies.test.ts:
(pass) Domain Extensibility Policies (Strategy Pattern) > Food Domain Policy > should allow food reservation within 120 minutes hygiene limit [0.67ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Food Domain Policy > should reject food reservation exceeding 120 minutes limit [0.29ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Food Domain Policy > should calculate food pricing correctly [0.10ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Cold Storage Domain Policy > should allow valid temperature range [2°C - 6°C] [0.17ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Cold Storage Domain Policy > should reject out-of-bounds temperature setting [0.06ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Laundry Domain Policy > should calculate daily pricing for multi-day laundry hold [0.12ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Parcel Domain Policy > should apply size multipliers for parcel pricing [0.58ms]

tests\unit\station.test.ts:
(pass) Station & Compartment Service > should fetch all registered stations [0.24ms]
(pass) Station & Compartment Service > should calculate distance and find nearby stations using geospatial coordinates [0.57ms]
(pass) Station & Compartment Service > should filter available compartments by size tier [0.32ms]

 23 pass
 0 fail
 44 expect() calls
Ran 23 tests across 6 files. [167.00ms]
```

---

## 🚀 Quickstart & Commands

```bash
# 1. Run Automated Test Suite
bun test

# 2. Verify Strict TypeScript Compilation (0 errors)
bun run typecheck

# 3. Launch Development Server
bun run dev

# 4. Run Model Context Protocol (MCP) Server
bun run mcp

# 5. Start Containerized Infrastructure
docker compose up -d --build
```

---

## 📚 Complete Assessment Documentation Index

All architectural and engineering artifacts are organized in [`docs/`](./docs/):
- [`01_BUSINESS_AND_REQUIREMENTS.md`](./docs/01_BUSINESS_AND_REQUIREMENTS.md) — Business Overview & Domain Extensibility
- [`02_SYSTEM_ARCHITECTURE.md`](./docs/02_SYSTEM_ARCHITECTURE.md) — High-Level Architecture, DB Schema & Monolith vs Microservices
- [`03_PROJECT_PLAN_AND_WBS.md`](./docs/03_PROJECT_PLAN_AND_WBS.md) — WBS, Timeline, Risk Register & DoD
- [`04_CONCURRENCY_AND_SECURITY.md`](./docs/04_CONCURRENCY_AND_SECURITY.md) — 3-Layer Concurrency Defense & Dynamic QR Security
- [`05_IOT_HARDWARE_INTEGRATION.md`](./docs/05_IOT_HARDWARE_INTEGRATION.md) — MQTT Protocol & 2-Phase Lock Reconciliation
- [`06_SRE_INCIDENT_RUNBOOKS.md`](./docs/06_SRE_INCIDENT_RUNBOOKS.md) — SRE Incident Runbooks, Alerts & Chaos Scenarios
- [`07_AI_MULTIAGENT_AND_MCP.md`](./docs/07_AI_MULTIAGENT_AND_MCP.md) — AI Multi-Agent Hierarchy & MCP Server Spec
- [`08_SIX_MONTH_AI_TRANSFORMATION.md`](./docs/08_SIX_MONTH_AI_TRANSFORMATION.md) — 6-Month AI Transformation Roadmap
- [`DECISIONS.md`](./docs/DECISIONS.md) — Architecture Decision Records (ADR-001 to ADR-005)
- [`WORK_LOG.md`](./docs/WORK_LOG.md) — Session Work Log & Time Tracking
