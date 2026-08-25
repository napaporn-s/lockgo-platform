# LOCKGO — Next-Gen Smart Locker Platform

> **Candidate Assessment Submission:** Senior AI Fullstack Platform Engineer  
> **Platform:** LOCKGO (Smart Locker Platform)  
> **Candidate:** Napaporn Suttinarksombat (Koy)  
> **Technical Partner / AI Assistant:** Elena  
> **Quality Standard:** Level 4 Production Standard (100% Green Gates, Zero Type Errors, 0.000% Double Booking, Full Proof)

---

## 📋 Comprehensive Deliverables Index (สิ่งที่ต้องส่งมอบครบทั้ง 12 รายการ)

| # | รายการที่ต้องส่งมอบ (Deliverable) | ตำแหน่งไฟล์ / โฟลเดอร์ในคลังโค้ด | คำอธิบายสาระสำคัญ |
|---|---|---|---|
| **1** | **Source Code** | [`src/`](file:///C:/Projects/personal/lockgo-assessment/src/) & [`tests/`](file:///C:/Projects/personal/lockgo-assessment/tests/) | ซอร์สโค้ด TypeScript แท้: Concurrency Engine, Dynamic QR, Nonce Burner, Emergency PIN, Two-Phase Payment, Double-Entry Ledger, PDPA PII Masking, IoT Gateway, Domain Policies, JSON-RPC MCP Server, Live REST API Gateway และชุดทดสอบ 41 เคส |
| **2** | **Architecture Diagram** | [`docs/02_SYSTEM_ARCHITECTURE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/02_SYSTEM_ARCHITECTURE.md) | C4 Container Diagram, Monolith vs Modular Monolith vs Microservices Matrix, Strangler Fig Roadmap, IoT Edge Protocol, Orders vs Reservations Bounded Contexts |
| **3** | **Database Diagram** | [`docs/02_SYSTEM_ARCHITECTURE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/02_SYSTEM_ARCHITECTURE.md) | PostgreSQL 16 ERD: PostGIS Geolocation, Partial Unique Indexes ป้องกัน Double-Booking, Immutable Audit Logs, PDPA Masking, และ Double-Entry Ledger |
| **4** | **API Specification** | [`docs/08_API_SPECIFICATION.md`](file:///C:/Projects/personal/lockgo-assessment/docs/08_API_SPECIFICATION.md) | เอกสาร OpenAPI/RESTful Spec ครบทุก Endpoint (Stations, Reservations, Dynamic QR, Emergency PIN, Size Upgrade, Payment Pre-Auth/Capture/Refund, Power & Door Ajar Events) |
| **5** | **Technical Documentation** | [`docs/01_BUSINESS_AND_REQUIREMENTS.md`](file:///C:/Projects/personal/lockgo-assessment/docs/01_BUSINESS_AND_REQUIREMENTS.md)<br>[`docs/05_IOT_HARDWARE_INTEGRATION.md`](file:///C:/Projects/personal/lockgo-assessment/docs/05_IOT_HARDWARE_INTEGRATION.md)<br>[`docs/DECISIONS.md`](file:///C:/Projects/personal/lockgo-assessment/docs/DECISIONS.md) | ข้อกำหนดกฎหมาย (PDPA, ธปท., ปปง., มอก., กสทช.), สเปกฮาร์ดแวร์ ARM SoC/RS-485/RC Debounce, และบันทึกการตัดสินใจ ADR-001 ถึง ADR-013 |
| **6** | **AI Agent Design** | [`docs/06_AI_AGENT_MCP_AND_GOVERNANCE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/06_AI_AGENT_MCP_AND_GOVERNANCE.md) | สถาปัตยกรรม Multi-Agent Hierarchy (BA, SA, PM, DEV, QA, SRE), Agent I/O Table, และเหตุผลที่ Security เป็น Deterministic Guardrails |
| **7** | **AI Workflow** | [`docs/06_AI_AGENT_MCP_AND_GOVERNANCE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/06_AI_AGENT_MCP_AND_GOVERNANCE.md) | Context Engineering SSOT Pipeline, Automated Drift Detection, และแผนงาน 6-Month Enterprise AI Transformation Roadmap |
| **8** | **MCP Design** | [`docs/06_AI_AGENT_MCP_AND_GOVERNANCE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/06_AI_AGENT_MCP_AND_GOVERNANCE.md)<br>[`src/mcp/server.ts`](file:///C:/Projects/personal/lockgo-assessment/src/mcp/server.ts) | สเปก Model Context Protocol (MCP) JSON-RPC 2.0 Stdio Server สำหรับ AI Subagents พร้อม HMAC-SHA256 Digital Signature Approval Gate |
| **9** | **DevOps Design** | [`docs/04_TESTING_AND_DEVOPS_STRATEGY.md`](file:///C:/Projects/personal/lockgo-assessment/docs/04_TESTING_AND_DEVOPS_STRATEGY.md)<br>[`.github/workflows/ci.yml`](file:///C:/Projects/personal/lockgo-assessment/.github/workflows/ci.yml) | Multi-stage Dockerfile, Docker Compose, GitHub Actions CI/CD Pipeline (Typecheck -> Automated Tests -> Container Build) |
| **10**| **Testing Strategy** | [`docs/04_TESTING_AND_DEVOPS_STRATEGY.md`](file:///C:/Projects/personal/lockgo-assessment/docs/04_TESTING_AND_DEVOPS_STRATEGY.md) | 5-Tier Testing Pyramid: Concurrency Race Condition Stress Test (50 workers), IoT 2-Phase Reconciliation, Dynamic QR Security, Two-Phase Payment & Ledger, PDPA PII Masking |
| **11**| **README** | [`README.md`](file:///C:/Projects/personal/lockgo-assessment/README.md) | คู่มือสรุปภาพรวม คำสั่ง Quickstart และแผนผังสารบัญโครงการทั้งหมด |
| **12**| **AI Prompts / AI Transcript** | [`docs/09_AI_PROMPTS_AND_TRANSCRIPTS.md`](file:///C:/Projects/personal/lockgo-assessment/docs/09_AI_PROMPTS_AND_TRANSCRIPTS.md) | System Prompts สำหรับ Multi-Agent, MCP Tool Invocations, บันทึกการรันโปรแกรม, และ AI Code Review Evolution Lifecycle (Topic 21) |

---

## 🌟 Executive Summary & Architectural Highlights

LOCKGO เป็นแพลตฟอร์ม Smart Locker อัจฉริยะระดับ Enterprise สำหรับแก้ปัญหา Last-Mile Logistics, บริการรับฝากของปลอดภัยแบบไร้สัมผัส, จุดรับ-ส่งอาหารพร้อมทาน (120m SLA), ตู้แช่เย็นควบคุมอุณหภูมิ (2°C - 8°C) และจุดบริการซักอบรีด 24 ชั่วโมง

```mermaid
flowchart TB
    subgraph Clients ["1. Client & API Gateway Layer"]
        Mobile["Mobile App (Flutter/RN - Dynamic TOTP QR & BLE)"]
        WebAdmin["Web Admin Backoffice (Nuxt 4 / Vue 3)"]
        B2BGate["B2B Logistics API Gateway (OAuth 2.0 / mTLS)"]
        Cloudflare["Cloudflare Edge (WAF, DDoS, TLS 1.3)"]
        APIGate["Envoy / Traefik API Gateway (Idempotency Key & Rate Limit)"]
    end

    subgraph CorePlatform ["2. Platform Core Layer (Modular Monolith - TypeScript)"]
        AuthSvc["Auth & RBAC (Admin, Ops, Driver, User)"]
        ReserveEngine["3-Layer Concurrency Reservation Engine"]
        DynamicQRSvc["Dynamic Rolling QR Engine (TOTP 30s + Nonce Burner)"]
        EmergencyPINSvc["Kiosk Emergency Backup PIN Service (ADR-012)"]
        PaymentEngine["Two-Phase Payment & Instant Gross Refund Engine"]
        FinancialLedger["Double-Entry Financial Ledger (Immutable)"]
        AuditSvc["Immutable Audit Logger (PDPA PII Masking Engine)"]
        IoTGateway["IoT Gateway & 2-Phase Lock Reconciliation"]
        DomainEngine["Domain Strategy Engine (Food, Cold, Laundry, Parcel)"]
        MCPServer["Model Context Protocol (MCP) Server (JSON-RPC 2.0)"]
    end

    subgraph PersistenceTier ["3. Data & Storage Tier"]
        Postgres[("PostgreSQL 16 Multi-AZ + PostGIS\n• ACID Transactions\n• Partial Unique Constraints (0% Double Booking)")]
        Redis[("Redis Cluster 7.2+\n• Redlock Concurrency Keys\n• Sub-ms Station Cache\n• Atomic Nonce SETNX")]
        Timescale[("TimescaleDB (Sensor & Telemetry Logs)")]
        S3Bucket[("AWS S3 (Ops Proof-of-Disposal Photos)")]
    end

    subgraph MessagingBackbone ["4. Messaging & Telemetry Backbone"]
        EMQX["EMQX MQTT v5 Cluster (Port 8883 mTLS)\n• Command QoS 1 & Feedback Events\n• Keep-Alive 30s (CGNAT Traversal)"]
        RabbitMQ["RabbitMQ / BullMQ\n• Asynchronous Webhook DLX Retries\n• Nightly 02:00 Batch Reconciliation"]
    end

    subgraph PhysicalStation ["5. Physical Edge Station (Industrial IoT)"]
        IndustrialARM["Industrial ARM SoC (CM4/RK3568, eMMC 32GB, Debian LTS)\n• Edge Daemon (Go / Rust)\n• Local SQLite Queue Buffer\n• Zero-CPU USB HID QR Listener (/dev/input/event*)"]
        NetworkRouter["Industrial 4G Router (Teltonika via Ethernet RJ-45)"]
        CryptoChip["Microchip ATECC608A / TPM 2.0 (mTLS Key Enclave)"]
        RelayModbus["RS-485 Modbus RTU Relay Board (Pulse 250ms)"]
        DoorSensorCircuit["Dual-Tier Debounce Reed Switch (RC Filter 10k/100nF + Software 150ms)"]
        ColdSensors["Dual-Point DS18B20 Probes (Top & Bottom Temp Monitoring)"]
        UPSPower["Industrial UPS LiFePO4 (2-4h Backup & Tiered Load Shedding)"]
    end

    Clients --> Cloudflare --> APIGate --> CorePlatform
    CorePlatform --> PersistenceTier
    CorePlatform --> MessagingBackbone
    MessagingBackbone <-->|MQTT v5 over mTLS| PhysicalStation
```

---

## 🛡️ 5 เสาหลักด้านวิศวกรรมความน่าเชื่อถือสูง (High-Reliability Engineering)

1. **3-Layer Concurrency Defense (0.000% Double Booking):**
   - **Layer 1:** Redis Redlock `lock:compartment:{id}` (TTL 5s) กรองคำขอที่ชนกันทิ้งภายใน 2ms
   - **Layer 2:** PostgreSQL Row-Level Lock (`SELECT FOR UPDATE`) ภายใน ACID Transaction
   - **Layer 3:** Partial Unique DB Index `CREATE UNIQUE INDEX idx_unique_active_compartment_reservation ON reservations (compartment_id) WHERE status IN ('PENDING', 'ACTIVE');` ระดับดิสก์
2. **Anti-Screenshot & Dynamic Security Tokens (ADR-004, ADR-012):**
   - Dynamic TOTP/HMAC-SHA256 Rolling QR Code หมุนเปลี่ยนทุก **30 วินาที**
   - Single-Use Nonce Burner ผ่าน Redis `SETNX` เผา Token ทิ้งทันที ป้องกันการแชร์รูปภาพสแกนซ้ำ 100%
   - หน้าจอ Kiosk มีระบบ Emergency Backup PIN (6 หลัก) พร้อม Cryptographic Salt/Hash และ Brute-Force Rate Limiter (กดผิด 3 ครั้งล็อก 15 นาที)
3. **IoT 2-Phase Lock State Reconciliation & Debounce (ADR-003, ADR-009, ADR-010):**
   - จัดการสัญญาณประตู 2 ชั้น: วงจรฮาร์ดแวร์ **RC Filter (10k/100nF)** + Software Debounce 3 ตัวอย่างที่ 50ms (รวม 150ms)
   - สัญญาณเน็ตมือถือหลุด -> Edge Daemon บันทึกเหตุการณ์ลง Local SQLite Buffer และส่ง Reconcile ย้อนหลังเมื่อเน็ตต่อติด
   - กลอนติดขัด -> ระบบ Trigger **Instant Gross Refund 100%** ทันที และสลับช่องสำรองให้อัตโนมัติ
   - ไฟฟ้าดับ -> สลับโหมด `Emergency Power Saving` ดับจอ/คอมเพรสเซอร์ทันที และสำรองไฟให้ 4G Router/รีเลย์เปิดตู้ได้ต่อเนื่อง 2-4 ชั่วโมง
4. **PDPA PII Masking & Two-Phase Financial Ledger (ADR-005, ADR-008):**
   - Recursive PII Masking Engine เซ็นเซอร์เบอร์มือถือ (`081-***-4567`), บัตรประชาชน 13 หลัก (`1-2345-*****-12-3`), อีเมล และบัตรเครดิต
   - บัญชีคู่ (Double-Entry Ledger) บันทึก Debit `CASH` / Credit `UNEARNED_REVENUE` และรับรู้ `SERVICE_REVENUE` ตามมาตรฐานสากล
5. **Model Context Protocol (MCP) & AI Governance (ADR-005):**
   - MCP JSON-RPC 2.0 Server ([`src/mcp/server.ts`](file:///C:/Projects/personal/lockgo-assessment/src/mcp/server.ts)) เชื่อมต่อเครื่องมือมาตรฐานให้ AI Subagents แบบ Read-Only และบังคับผ่าน **HMAC-SHA256 Digital Signature Gate** สำหรับคำสั่งฉุกเฉิน

---

## 🧪 Automated Verification & Test Suite Results

ผลการรันชุดทดสอบอัตโนมัติครบ 41 เคส (100% Green Pass ใน 181ms):

```bash
$ bun test
bun test v1.3.14 (0d9b296a)

tests/concurrency/double-booking.test.ts:
(pass) 3-Layer Concurrency Engine: Double Booking Race Condition Stress Test > should guarantee EXACTLY 1 reservation succeeds and all concurrent attempts fail with 0% double booking [6.79ms]

tests/iot/reconciliation.test.ts:
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 1 Happy Path: should immediately confirm unlock when direct MQTT ACK event arrives [0.88ms]
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 1 Jammed Detection: should throw HardwareJammedError when sensor detects solenoid jam [0.32ms]
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 2 Fallback: should reconcile successfully via active sensor polling when ACK packet dropped [36.55ms]
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 2 Station Offline: should throw HardwareCommunicationError when station remains offline [30.60ms]

tests/mcp/mcp.test.ts:
(pass) Model Context Protocol (MCP) Server & AI Governance > should expose standardized MCP tool schemas for subagent discovery [0.30ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should handle JSON-RPC 2.0 initialize request correctly [0.65ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should handle JSON-RPC 2.0 tools/list request [0.17ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should execute read-only tool get_station_health via JSON-RPC tools/call safely [0.92ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should block emergency door unlock with forged or invalid digital signature [0.51ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should execute emergency door unlock when valid cryptographic digital signature is provided [0.33ms]

tests/security/dynamic-qr.test.ts:
(pass) Dynamic QR & Replay Attack Defense > should generate and successfully verify a dynamic QR token within the valid time window [0.75ms]
(pass) Dynamic QR & Replay Attack Defense > should reject tokens with invalid HMAC signatures (Tampered token) [0.21ms]
(pass) Dynamic QR & Replay Attack Defense > should reject expired tokens beyond window drift tolerance (Anti-Old Screenshot) [0.08ms]
(pass) Dynamic QR & Replay Attack Defense > should block replay attacks when the same valid token is scanned twice (Atomic Nonce Burner) [0.20ms]

tests/unit/audit-masking.test.ts:
(pass) Audit Logger & PDPA PII Masking Engine > should mask Thai mobile phone numbers to canonical 081-***-4567 format [0.16ms]
(pass) Audit Logger & PDPA PII Masking Engine > should mask Thai Citizen ID (13 digits) to canonical 1-2345-*****-12-3 format [0.07ms]
(pass) Audit Logger & PDPA PII Masking Engine > should mask customer Email addresses [0.03ms]
(pass) Audit Logger & PDPA PII Masking Engine > should mask Credit Card numbers [0.03ms]
(pass) Audit Logger & PDPA PII Masking Engine > should mask IP address host octets while keeping subnet [0.03ms]
(pass) Audit Logger & PDPA PII Masking Engine > should recursively sanitize deeply nested objects and redact sensitive keys [0.23ms]

tests/unit/domain-policies.test.ts:
(pass) Domain Extensibility Policies (Strategy Pattern) > Food Domain Policy > should allow food reservation within 120 minutes hygiene limit [1.14ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Food Domain Policy > should reject food reservation exceeding 120 minutes limit [0.05ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Food Domain Policy > should calculate food pricing correctly [0.03ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Cold Storage Domain Policy > should allow valid temperature range [2°C - 6°C] [0.06ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Cold Storage Domain Policy > should reject out-of-bounds temperature setting [0.02ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Laundry Domain Policy > should calculate daily pricing for multi-day laundry hold [0.03ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Parcel Domain Policy > should apply size multipliers for parcel pricing [0.06ms]

tests/unit/operational-features.test.ts:
(pass) Operational Features & Edge Policies Verification > Seamless In-App Size Upgrade Engine (ADR-011) > should upgrade compartment size and calculate price difference when larger slot is available [0.93ms]
(pass) Operational Features & Edge Policies Verification > Kiosk Emergency Backup PIN & Brute-Force Defense (ADR-012) > should allow unlock with correct 6-digit emergency PIN validated against server DB hash [0.92ms]
(pass) Operational Features & Edge Policies Verification > Kiosk Emergency Backup PIN & Brute-Force Defense (ADR-012) > should lockout phone number for 15 minutes after 3 consecutive failed PIN attempts [0.95ms]
(pass) Operational Features & Edge Policies Verification > Power Outage & Door Ajar Handlers (ADR-009, ADR-010) > should record power disruption and freeze alerts [0.19ms]
(pass) Operational Features & Edge Policies Verification > Power Outage & Door Ajar Handlers (ADR-009, ADR-010) > should log door ajar alert and dispatch investigation [0.10ms]

tests/unit/payment.test.ts:
(pass) Two-Phase Payment & Double-Entry Financial Ledger Engine > should pre-authorize payment hold and record Debit Cash / Credit Unearned Revenue in ledger [2.53ms]
(pass) Two-Phase Payment & Double-Entry Financial Ledger Engine > should capture payment and recognize Service Revenue upon successful deposit [0.54ms]
(pass) Two-Phase Payment & Double-Entry Financial Ledger Engine > should process 100% Gross Refund upon hardware solenoid failure [0.58ms]
(pass) Two-Phase Payment & Double-Entry Financial Ledger Engine > should enforce idempotency and prevent duplicate refund posting on retry [0.36ms]
(pass) Two-Phase Payment & Double-Entry Financial Ledger Engine > should enforce idempotency and prevent duplicate pre-authorization on double-click [0.38ms]

tests/unit/station.test.ts:
(pass) Station & Compartment Service > should fetch all registered stations [0.14ms]
(pass) Station & Compartment Service > should calculate distance and find nearby stations using geospatial coordinates [0.34ms]
(pass) Station & Compartment Service > should filter available compartments by size tier [0.16ms]

 41 pass
 0 fail
 108 expect() calls
Ran 41 tests across 9 files. [181.00ms]

$ tsc --noEmit
# 0 Errors. Strict TypeScript Typecheck 100% Green.
```

---

## 🚀 Quickstart & Verification Commands

```bash
# 1. รันชุดทดสอบอัตโนมัติ 41 เคส (Unit, Concurrency, IoT, Dynamic QR, Payment, Ledger, PII Masking, MCP)
bun test

# 2. ตรวจสอบความถูกต้องของ Type ด้วย Strict TypeScript
bun run typecheck

# 3. รันเซิร์ฟเวอร์จำลอง REST API Gateway
bun run dev

# 4. รันเซิร์ฟเวอร์ Model Context Protocol (MCP) JSON-RPC 2.0
bun run mcp

# 5. Build และรันบน Container Infrastructure (Docker Compose)
docker compose up -d --build
```
