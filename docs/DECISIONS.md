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
- **[ADR-008](#adr-008-two-phase-payment-settlement-idempotency-and-automated-instant-refund)**: Two-Phase Payment Settlement, Idempotency & Automated Instant Refund Engine
- **[ADR-009](#adr-009-ups-power-outage-resilience-tiered-load-shedding-and-low-battery-guard)**: UPS Power Outage Resilience (2-4 Hours), Tiered Load-Shedding & Low Battery Guard
- **[ADR-010](#adr-010-door-left-ajar-escalation-and-investigation-workflow)**: Door Left Ajar Escalation Sequence (30s-90s-180s) & Investigation State Lock
- **[ADR-011](#adr-011-seamless-in-app-compartment-size-upgrade-engine)**: Seamless In-App Compartment Size Upgrade & Sub-Order Difference Engine
- **[ADR-012](#adr-012-kiosk-emergency-backup-pin-and-brute-force-rate-limiting)**: Kiosk Emergency Backup PIN Fallback with 3-Attempt Rate Limit Lock
- **[ADR-013](#adr-013-hybrid-ota-update-strategy-with-dual-partition-ab-watchdog-rollback)**: Hybrid OTA Update Strategy (Docker Blue/Green + Dual-Partition A/B RAUC with Watchdog Rollback)

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

## ADR-005: AI Agent Architecture and MCP Integration Boundary
- **Status:** Approved
- **Decision:** Model Context Protocol (MCP) tool servers with read-only scopes and Human-in-the-Loop gates for mutations.

---

## ADR-006: Testing and Concurrency Stress Verification Strategy
- **Status:** Approved
- **Decision:** 4-tier testing pyramid with 50-worker parallel concurrency stress testing proving 0% double booking.

---

## ADR-007: SRE Observability Telemetry and Automated Failover
- **Status:** Approved
- **Decision:** OpenTelemetry tracing, Prometheus metrics, structured Pino JSON logs, and SRE incident runbooks.

---

## ADR-008: Two-Phase Payment Settlement, Idempotency and Automated Instant Refund
- **Status:** Approved
- **Decision:** Pre-Auth Hold at booking -> Capture on `DOOR_OPENED` sensor ACK; instant 100% Gross Refund on hardware jam; Double-Entry Financial Ledger.

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

## ADR-012: Kiosk Emergency Backup PIN and Brute-Force Rate Limiting
- **Status:** Approved
- **Date:** 2026-08-24
- **Context:** Customer phone battery dies in front of the station.
- **Decision:**
  1. 6-digit numeric Backup PIN sent via SMS at booking confirmation.
  2. Kiosk touchscreen provides "Emergency Unlock" entering Phone + 6-digit PIN.
  3. Guardrail: Max 3 failed attempts before 15-minute rate limit lockout & security alert.

---

## ADR-013: Hybrid OTA Update Strategy with Dual-Partition A/B Watchdog Rollback
- **Status:** Approved
- **Date:** 2026-08-24
- **Context:** Remotely updating 10,000 edge locker stations safely.
- **Decision:**
  1. **Layer 1 (Application/Daemon):** Docker Blue/Green container pull with local loopback healthcheck (<10s zero reboot).
  2. **Layer 2 (Core OS/Firmware):** Dual-Partition A/B (RAUC / Mender.io) with Hardware Watchdog Timer (WDT) auto-rollback if boot fails within 3 minutes (0% brick guarantee).
