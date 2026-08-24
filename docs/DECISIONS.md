# LOCKGO — Architecture Decision Records (ADRs)

> This document tracks key architectural, design, platform, and AI strategy decisions for LockGo, documenting the context, alternatives considered, chosen approach, rationale, and trade-offs.

---

## Index of Decisions

- **[ADR-001](#adr-001-modular-monolith-vs-microservices-for-initial-phase-and-evolution-strategy)**: Modular Monolith vs. Microservices for LockGo Initial Phase & Evolution Strategy
- **[ADR-002](#adr-002-concurrency-control-and-double-booking-prevention)**: Distributed Locking with Redis Redlock & DB Optimistic/Pessimistic Concurrency Control
- **[ADR-003](#adr-003-iot-locker-controller-communication-and-offline-fault-tolerance)**: MQTT Broker with Local Edge Gateway & Asynchronous Command-Query Segregation for Hardware Controller
- **[ADR-004](#adr-004-dynamic-totp-qr-code-and-anti-screenshot-mechanism)**: Rolling Short-Lived Signed JWT/HMAC QR Codes with Proximity/Liveness Verification
- **[ADR-005](#adr-005-ai-agent-architecture-and-mcp-integration-boundary)**: Role-Based Multi-Agent Ecosystem via Model Context Protocol (MCP) with Strict Human-in-the-Loop Gates
- **[ADR-006](#adr-006-testing-and-concurrency-stress-verification-strategy)**: 4-Tier Automated Testing Pyramid with Parallel Race Condition Stress Testing
- **[ADR-007](#adr-007-sre-observability-telemetry-and-automated-failover)**: OpenTelemetry Distributed Tracing & Two-Phase IoT State Recovery

---

## ADR-001: Modular Monolith vs. Microservices for Initial Phase and Evolution Strategy

- **Status:** Approved
- **Date:** 2026-08-24
- **Deciders:** Koy (Chief Orchestrator), Elena (Lead Technical Partner)

### Context & Problem Statement
LockGo is launching as a Smart Locker Platform supporting Parcel, Food, Laundry, Cold Storage, Retail, and Document lockers. The system must support high-speed iteration initially (10 devs) while seamlessly scaling to 50+ devs and supporting new business domains without rewrite.

### Alternatives Considered
1. **Option A: Traditional Monolith**
   - *Pros:* Fast to start, single deployment, easy database transactions.
   - *Cons:* Tight coupling, domain leaks, hard to separate when scaling to 50 devs or adding domain-specific pipelines (e.g. Cold Locker temperature telemetry).
2. **Option B: Modular Monolith (CHOSEN for Initial Phase)**
   - *Pros:* Clear bounded contexts, in-process communication with zero network latency/distributed transaction overhead, strict module boundaries enforced by linting/packaging, single deployable unit for dev velocity, decoupled database schemas/schemas-per-module within single DB cluster, trivial to decompose into microservices later.
   - *Cons:* Requires discipline to avoid cross-module database joins.
3. **Option C: Microservices**
   - *Pros:* Independent deployment, polyglot stack, independent scaling.
   - *Cons:* Premature operational complexity, network overhead, distributed tracing/saga requirements, heavy CI/CD burden for 10-person team.

### Decision & Rationale
**CHOSE Option B (Modular Monolith) for LockGo initial phase**, transitioning to Option C (Microservices) selectively (Strangler Fig pattern) as specific modules experience divergent scaling characteristics (e.g., IoT Telemetry / Locker Hardware Ingestion or High-Volume Payment Gateways).

---

## ADR-002: Concurrency Control and Double Booking Prevention

- **Status:** Approved
- **Date:** 2026-08-24

### Context & Problem Statement
When only 1 compartment is available at a high-demand station and two users attempt to book simultaneously, the system must guarantee zero double-booking while maintaining sub-100ms response time and high availability.

### Decision & Rationale
We implement a **3-Layer Defense-in-Depth Concurrency Strategy**:
1. **Layer 1 (Fast Gate / In-Memory Distributed Lock):** Redis Distributed Lock with Key `lock:compartment:{id}` (TTL: 5s) + Redlock algorithm for distributed coordination.
2. **Layer 2 (Database State Guard / ACID Transaction):** Relational DB Transaction with `SELECT ... FOR UPDATE` (Pessimistic) or Version Column Check `WHERE status = 'AVAILABLE' AND version = :version` (Optimistic).
3. **Layer 3 (Idempotency Key & Unique Constraint):** Unique DB constraint on `(station_id, compartment_id, active_reservation_slot)` ensuring the database engine physically rejects duplicate active allocations even under catastrophic lock release race conditions.

---

## ADR-003: IoT Locker Controller Communication and Offline Fault-Tolerance

- **Status:** Approved
- **Date:** 2026-08-24

### Context & Problem Statement
Physical locker controllers communicate across unreliable cellular/Wi-Fi networks. Server unlock commands might be sent without immediate ACK, network might partition mid-session, or controllers might reboot.

### Decision & Rationale
1. **Protocol:** MQTT over TLS with QoS 1 (At Least Once) combined with Local Edge Controller Daemon.
2. **Asynchronous Command Flow & Correlation ID:** Server issues `UnlockCommand` with UUID `command_id` and idempotent state. Edge controller executes relay pulse and publishes `UnlockSensorFeedbackEvent` with `(command_id, sensor_status: OPEN/CLOSED, lock_status: LOCKED/UNLOCKED, timestamp)`.
3. **Two-Phase Lock State Reconciliation:** If ACK/Sensor event is not received within `T_timeout` (3s), state enters `PENDING_VERIFICATION`. Background polling daemon checks hardware sensor state before attempting retry or failing gracefully to unlock alternative compartment for user.

---

## ADR-004: Dynamic TOTP QR Code and Anti-Screenshot Mechanism

- **Status:** Approved
- **Date:** 2026-08-24

### Context & Problem Statement
If a user screenshots their locker pickup QR code and shares it, unauthorized parties could access high-value parcels or sensitive documents.

### Decision & Rationale
1. **Time-Based Dynamic QR (TOTP / Rotating JWE):** The mobile app generates a rotating QR code payload every 15-30 seconds consisting of `HMAC-SHA256(secret, timestamp_window) + reservation_token`.
2. **Station Physical Proximity / Bluetooth Low Energy (BLE) Handshake (Optional Layer):** The locker scanner only validates dynamic tokens generated within the current time slice; static screenshots expire in < 30 seconds.
3. **Single-Use Cryptographic Nonce:** Once a QR code token is scanned by the locker camera, its nonce is consumed immediately in Redis/DB with atomic `SETNX`. Any replay of the same token is rejected.

---

## ADR-005: AI Agent Architecture and MCP Integration Boundary

- **Status:** Approved
- **Date:** 2026-08-24

### Context & Problem Statement
Engineering team needs AI agents to accelerate PRD -> Code -> Test -> Deploy workflows while maintaining ISO/IEC 27001 compliance, source code privacy, and production safety.

### Decision & Rationale
1. **Protocol:** Model Context Protocol (MCP) as the standardized tool integration layer (Database Schema MCP, OpenAPI MCP, Git MCP, Monitoring MCP).
2. **Least Privilege & Scoped MCP Servers:** AI agents are granted Read-Only access to schema, logs, and docs. All write/mutating actions (DB migrations, prod deployment, code commit to main) require explicit **Human Approval Gates**.
3. **Context Engineering:** Shared SSOT repository rules (`AGENTS.md`, `ARCHITECTURE.md`, `ADR/`) primed automatically to prevent "zero-context hallucination".

---

## ADR-006: Testing and Concurrency Stress Verification Strategy

- **Status:** Approved
- **Date:** 2026-08-24

### Context & Problem Statement
How to prove that the 3-layer concurrency strategy physically guarantees 0% double-booking and that IoT edge disconnects do not leave compartments in corrupt or locked states.

### Decision & Rationale
1. Automated concurrency stress harness using `Promise.all` with 50-100 parallel worker threads competing for identical resources.
2. In-memory Mock Redis/PostgreSQL adapter reproducing lock contention, transaction rollbacks, and optimistic version mismatches with millisecond precision.

---

## ADR-007: SRE Observability Telemetry and Automated Failover

- **Status:** Approved
- **Date:** 2026-08-24

### Context & Problem Statement
Locker hardware and distributed state require real-time visibility and fault mitigation without manual human intervention for intermittent network partitions.

### Decision & Rationale
1. Edge heartbeats every 30s. If 3 heartbeats miss, station automatically switches to offline emergency buffer mode and platform temporarily halts new online bookings for that station.
2. Structured JSON logging (Pino) with correlation IDs for end-to-end tracing from HTTP client to MQTT hardware command.
