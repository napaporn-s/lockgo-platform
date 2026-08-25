# LOCKGO — Architecture Decision Records (ADRs)

> This document tracks key architectural, design, platform, and AI strategy decisions for LockGo, documenting the context, alternatives considered, chosen approach, rationale, and trade-offs.

---

## Index of Decisions

- **[ADR-001](#adr-001-modular-monolith-vs-microservices-for-initial-phase-and-evolution-strategy)**: Modular Monolith vs. Microservices for LockGo Initial Phase & Evolution Strategy
- **[ADR-002](#adr-002-concurrency-control-and-double-booking-prevention)**: Distributed Locking with Redis Redlock & DB Optimistic/Pessimistic Concurrency Control
- **[ADR-003](#adr-003-iot-locker-controller-communication-and-offline-fault-tolerance)**: MQTT Broker with Local Edge Gateway & Asynchronous Command-Query Segregation for Hardware Controller
- **[ADR-004](#adr-004-dynamic-totp-qr-code-and-anti-screenshot-mechanism)**: Rolling Short-Lived Signed JWT/HMAC QR Codes with Proximity/Liveness Verification
- **[ADR-005](#adr-005-ai-agent-architecture-mcp-integration-boundary-and-cross-ai-governance)**: Role-Based Multi-Agent Ecosystem via Model Context Protocol (MCP) with Cross-AI Adversarial Review & Human Gates
- **[ADR-006](#adr-006-testing-and-concurrency-stress-verification-strategy)**: 5-Tier Automated Testing Pyramid with Parallel Race Condition Stress Testing
- **[ADR-007](#adr-007-sre-observability-telemetry-and-automated-failover)**: OpenTelemetry Distributed Tracing, PII-Masked Structured Logs & SRE Incident Playbooks
- **[ADR-008](#adr-008-two-phase-payment-settlement-idempotency-and-automated-instant-refund)**: Two-Phase Payment Settlement, Idempotency & Automated Instant Refund Engine
- **[ADR-009](#adr-009-ups-power-outage-resilience-tiered-load-shedding-and-low-battery-guard)**: UPS Power Outage Resilience (2-4 Hours), Tiered Load-Shedding & Low Battery Guard
- **[ADR-010](#adr-010-door-left-ajar-escalation-and-investigation-workflow)**: Door Left Ajar Escalation Sequence (30s-90s-180s) & Investigation State Lock
- **[ADR-011](#adr-011-seamless-in-app-compartment-size-upgrade-engine)**: Seamless In-App Compartment Size Upgrade & Sub-Order Difference Engine
- **[ADR-012](#adr-012-kiosk-emergency-backup-pin-server-side-salt-hash-and-timing-safe-defense)**: Kiosk Emergency Backup PIN with Server-Side Salt/Hash, `timingSafeEqual` & 3-Attempt Rate Limit Lock
- **[ADR-013](#adr-013-hybrid-ota-update-strategy-with-dual-partition-ab-watchdog-rollback)**: Hybrid OTA Update Strategy (Docker Blue/Green + Dual-Partition A/B RAUC with Watchdog Rollback)
- **[ADR-014](#adr-014-pdpa-pii-data-protection-and-recursive-audit-masking-engine)**: PDPA B.E. 2562 Compliance with Recursive Tokenizer-Based PII Masking Engine

---

## ADR-001: Modular Monolith vs. Microservices for Initial Phase and Evolution Strategy
- **Status:** Approved
- **Deciders:** Koy (Chief Orchestrator), Elena (Lead Technical Partner)
- **Decision:** Modular Monolith for initial phase (<50 devs, <1,000 stations) transitioning selectively via Strangler Fig pattern.

---

## ADR-002: Concurrency Control and Double Booking Prevention
- **Status:** Approved
- **Decision:** 3-Layer Concurrency Defense (Redis Redlock 5s -> DB `SELECT FOR UPDATE` -> Partial Unique DB Index).

---

## ADR-003: IoT Locker Controller Communication and Offline Fault-Tolerance
- **Status:** Approved
- **Decision:** Outbound-Only MQTT over mTLS (Port 8883) over CGNAT, Keep-Alive 30s, 2-Phase State Reconciliation, 250ms Solenoid pulse, Dual-tier debounce (RC 10k/100nF + 150ms 3-sample software filter).

---

## ADR-004: Dynamic TOTP QR Code and Anti-Screenshot Mechanism
- **Status:** Approved
- **Decision:** Rolling TOTP HMAC-SHA256 (30s window), drift $\pm 1$ step, atomic single-use nonce burner via Redis `SETNX`.

---

## ADR-005: AI Agent Architecture, MCP Integration Boundary and Cross-AI Governance
- **Status:** Approved
- **Decision:**
  1. Model Context Protocol (MCP) JSON-RPC 2.0 Stdio server with read-only scopes and HMAC-SHA256 Digital Signature Gates for destructive mutations.
  2. Multi-Agent Adversarial Review Pipeline (Cross-AI verification with Human Lead as the ultimate Architectural Gatekeeper).
  3. Security guardrails implemented as deterministic code/compiler constraints rather than autonomous stochastic LLM discretion.

---

## ADR-006: Testing and Concurrency Stress Verification Strategy
- **Status:** Approved
- **Decision:** 5-tier testing pyramid with 50-worker parallel concurrency stress testing proving 0.000% double booking.

---

## ADR-007: SRE Observability Telemetry and Automated Failover
- **Status:** Approved
- **Decision:** OpenTelemetry distributed tracing, Prometheus metrics, structured JSON logs with PII masking, and 7 production incident playbooks (including Playbook 7 for silent conversion drop).

---

## ADR-008: Two-Phase Payment Settlement, Idempotency and Automated Instant Refund
- **Status:** Approved
- **Decision:** Pre-Auth Hold at booking -> Capture on `DOOR_OPENED` sensor ACK; instant 100% Gross Refund on hardware jam; Double-Entry Financial Ledger (`CASH`, `UNEARNED_REVENUE`, `SERVICE_REVENUE`).

---

## ADR-009: UPS Power Outage Resilience, Tiered Load-Shedding and Low Battery Guard
- **Status:** Approved
- **Decision:** Industrial UPS (2-4h backup), tiered load shedding (cuts compressor/screens immediately), Event `STATION_POWER_DISRUPTED`, low-battery safe OS halt (<10%).

---

## ADR-010: Door Left Ajar Escalation and Investigation Workflow
- **Status:** Approved
- **Date:** 2026-08-24
- **Context:** User deposits or picks up an item but forgets to push the door closed.
- **Decision:**
  1. Escalation: 30s slow buzzer + Push -> 90s high-pitch alarm + SMS -> 180s `DOOR_AJAR_ALERT`.
  2. Transaction marked as `PENDING_INVESTIGATION` (never `COMPLETED`).
  3. Real-time CCTV and Ops alert triggered for central triage / field inspection.

---

## ADR-011: Seamless In-App Compartment Size Upgrade Engine
- **Status:** Approved
- **Date:** 2026-08-24
- **Context:** Item is too large for reserved slot during depositing.
- **Decision:**
  1. "Change Locker Size" available during `DEPOSITING` state.
  2. If larger slot available: releases old slot -> sub-order for price difference -> unlocks new slot upon payment.
  3. If no larger slot available: 100% Auto Full Refund.

---

## ADR-012: Kiosk Emergency Backup PIN, Server-Side Salt/Hash and Timing-Safe Defense
- **Status:** Approved
- **Date:** 2026-08-24 (Updated 2026-08-25)
- **Context:** Customer phone battery dies in front of the station; security review identified client-side bypass and timing attack risks on naive implementation.
- **Decision:**
  1. 6-digit numeric Backup PIN generated with 16-byte random salt and HMAC-SHA256 hash stored on `AccessToken` in DB.
  2. Client API payload only submits `{ phoneNumber, enteredPin, reservationId }` (expectedPin removed from client payload completely).
  3. Constant-time hash verification using `crypto.timingSafeEqual` preventing side-channel attacks.
  4. Brute-force lockout: Max 3 failed attempts triggers 15-minute lockout in Redis.

---

## ADR-013: Hybrid OTA Update Strategy with Dual-Partition A/B Watchdog Rollback
- **Status:** Approved
- **Date:** 2026-08-24
- **Context:** Remotely updating 10,000 edge locker stations safely.
- **Decision:**
  1. **Layer 1 (Application/Daemon):** Docker Blue/Green container pull with local loopback healthcheck (<10s zero reboot).
  2. **Layer 2 (Core OS/Firmware):** Dual-Partition A/B (RAUC / Mender.io) with Hardware Watchdog Timer (WDT) auto-rollback if boot fails within 3 minutes (0% brick guarantee).

---

## ADR-014: PDPA PII Data Protection and Recursive Audit Masking Engine
- **Status:** Approved
- **Date:** 2026-08-25
- **Context:** Adherence to Thai Personal Data Protection Act (PDPA B.E. 2562).
- **Decision:**
  1. Automated recursive PII masking engine in `AuditLogger` sanitizing Thai mobile phone numbers (`081-***-4567`), 13-digit Thai Citizen IDs (`1-2345-*****-12-3`), Emails (`u***@domain.com`), and Credit Cards (`****-****-****-4444`).
  2. IP address host octet masking (`192.168.10.***`).
  3. Redaction of sensitive keys (`pin`, `rawEmergencyPin`, `secret`) before database writes and log shipping.
