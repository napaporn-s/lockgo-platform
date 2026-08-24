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
| **1** | **Source Code** | [`src/`](file:///C:/Projects/personal/lockgo-assessment/src/) & [`tests/`](file:///C:/Projects/personal/lockgo-assessment/tests/) | ซอร์สโค้ด TypeScript แท้: Concurrency Engine, Dynamic QR, Nonce Burner, Emergency PIN, IoT Gateway, Domain Policies, MCP Server, REST API Gateway และชุดทดสอบ 28 เคส |
| **2** | **Architecture Diagram** | [`docs/02_SYSTEM_ARCHITECTURE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/02_SYSTEM_ARCHITECTURE.md) | C4 Container Diagram, Monolith vs Modular Monolith vs Microservices Matrix, Strangler Fig Roadmap, IoT Edge Protocol & CGNAT Outbound-Only Architecture |
| **3** | **Database Diagram** | [`docs/02_SYSTEM_ARCHITECTURE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/02_SYSTEM_ARCHITECTURE.md) | PostgreSQL 16 ERD: PostGIS Geolocation, Partial Unique Indexes ป้องกัน Double-Booking, Immutable Audit Logs และ Double-Entry Ledger |
| **4** | **API Specification** | [`docs/07_API_SPECIFICATION.md`](file:///C:/Projects/personal/lockgo-assessment/docs/07_API_SPECIFICATION.md) | เอกสาร OpenAPI/RESTful Spec ครบทุก Endpoint (Stations, Reservations, Dynamic QR, Emergency PIN, Size Upgrade, Power & Door Ajar Events) |
| **5** | **Technical Documentation** | [`docs/01_BUSINESS_AND_REQUIREMENTS.md`](file:///C:/Projects/personal/lockgo-assessment/docs/01_BUSINESS_AND_REQUIREMENTS.md)<br>[`docs/05_IOT_HARDWARE_INTEGRATION.md`](file:///C:/Projects/personal/lockgo-assessment/docs/05_IOT_HARDWARE_INTEGRATION.md)<br>[`docs/DECISIONS.md`](file:///C:/Projects/personal/lockgo-assessment/docs/DECISIONS.md) | ข้อกำหนดกฎหมาย (PDPA, ธปท., ปปง., มอก., กสทช.), สเปกฮาร์ดแวร์ ARM SoC/RS-485/RC Debounce, และบันทึกการตัดสินใจ ADR-001 ถึง ADR-013 |
| **6** | **AI Agent Design** | [`docs/05_AI_AGENT_MCP_AND_GOVERNANCE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/05_AI_AGENT_MCP_AND_GOVERNANCE.md) | สถาปัตยกรรม Multi-Agent Hierarchy (BA, SA, PM, DEV, QA, SRE) พร้อมกลไก Human-in-the-Loop Approval Gates |
| **7** | **AI Workflow** | [`docs/05_AI_AGENT_MCP_AND_GOVERNANCE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/05_AI_AGENT_MCP_AND_GOVERNANCE.md) | Context Engineering SSOT Pipeline, Automated Drift Detection, และแผนงาน 6-Month Enterprise AI Transformation Roadmap |
| **8** | **MCP Design** | [`docs/05_AI_AGENT_MCP_AND_GOVERNANCE.md`](file:///C:/Projects/personal/lockgo-assessment/docs/05_AI_AGENT_MCP_AND_GOVERNANCE.md)<br>[`src/mcp/server.ts`](file:///C:/Projects/personal/lockgo-assessment/src/mcp/server.ts) | สเปก Model Context Protocol (MCP) Tools Server สำหรับ AI Subagents พร้อม Digital Signature Gate สำหรับคำสั่งฉุกเฉิน |
| **9** | **DevOps Design** | [`docs/04_TESTING_AND_DEVOPS_STRATEGY.md`](file:///C:/Projects/personal/lockgo-assessment/docs/04_TESTING_AND_DEVOPS_STRATEGY.md)<br>[`.github/workflows/ci.yml`](file:///C:/Projects/personal/lockgo-assessment/.github/workflows/ci.yml) | Multi-stage Dockerfile, Docker Compose, GitHub Actions CI/CD Pipeline (Lint -> Typecheck -> Audit -> Test -> Build) |
| **10**| **Testing Strategy** | [`docs/04_TESTING_AND_DEVOPS_STRATEGY.md`](file:///C:/Projects/personal/lockgo-assessment/docs/04_TESTING_AND_DEVOPS_STRATEGY.md) | 4-Tier Testing Pyramid: Concurrency Race Condition Stress Test (50 workers), IoT 2-Phase Reconciliation, Dynamic QR Security |
| **11**| **README** | [`README.md`](file:///C:/Projects/personal/lockgo-assessment/README.md) | คู่มือสรุปภาพรวม คำสั่ง Quickstart และแผนผังสารบัญโครงการทั้งหมด |
| **12**| **AI Prompts / AI Transcript** | [`docs/08_AI_PROMPTS_AND_TRANSCRIPTS.md`](file:///C:/Projects/personal/lockgo-assessment/docs/08_AI_PROMPTS_AND_TRANSCRIPTS.md) | System Prompts สำหรับ Multi-Agent, MCP Tool Invocations, และบันทึกคำสั่งและผลลัพธ์การรันโปรแกรม |

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
        IoTGateway["IoT Gateway & 2-Phase Lock Reconciliation"]
        DomainEngine["Domain Strategy Engine (Food, Cold, Laundry, Parcel)"]
        AuditSvc["Immutable Audit Logger (PII Masking)"]
        MCPServer["Model Context Protocol (MCP) Server for AI"]
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
   - หน้าจอ Kiosk มีระบบ Emergency Backup PIN (6 หลัก) พร้อม Brute-Force Rate Limiter (กดผิด 3 ครั้งล็อก 15 นาที)
3. **IoT 2-Phase Lock State Reconciliation & Debounce (ADR-003, ADR-009, ADR-010):**
   - จัดการสัญญาณประตู 2 ชั้น: วงจรฮาร์ดแวร์ **RC Filter (10k/100nF)** + Software Debounce 3 ตัวอย่างที่ 50ms (รวม 150ms)
   - สัญญาณเน็ตมือถือหลุด -> Edge Daemon บันทึกเหตุการณ์ลง Local SQLite Buffer และส่ง Reconcile ย้อนหลังเมื่อเน็ตต่อติด
   - กลอนติดขัด -> ระบบ Trigger **Instant Gross Refund 100%** ทันที และสลับช่องสำรองให้อัตโนมัติ
   - ไฟฟ้าดับ -> สลับโหมด `Emergency Power Saving` ดับจอ/คอมเพรสเซอร์ทันที และสำรองไฟให้ 4G Router/รีเลย์เปิดตู้ได้ต่อเนื่อง 2-4 ชั่วโมง
4. **Zero-Rewrite Multi-Domain Extensibility (Strategy Pattern):**
   - รองรับพัสดุ (Parcel), อาหารพร้อมทาน (Food 120m SLA), ตู้แช่เย็น (Cold Storage 2°C - 8°C), และตู้ซักอบรีด (Laundry)
5. **Model Context Protocol (MCP) & AI Governance (ADR-005):**
   - MCP Server ([`src/mcp/server.ts`](file:///C:/Projects/personal/lockgo-assessment/src/mcp/server.ts)) เชื่อมต่อเครื่องมือมาตรฐานให้ AI Subagents แบบ Read-Only และบังคับผ่าน **Human-in-the-Loop Approval Gate** สำหรับคำสั่งฉุกเฉิน

---

## 🧪 Automated Verification & Test Suite Results

ผลการรันชุดทดสอบอัตโนมัติครบ 28 เคส (100% Green Pass ใน 164ms):

```bash
$ bun test
bun test v1.3.14 (0d9b296a)

tests/concurrency/double-booking.test.ts:
(pass) 3-Layer Concurrency Engine: Double Booking Race Condition Stress Test > should guarantee EXACTLY 1 reservation succeeds and all concurrent attempts fail with 0% double booking [3.17ms]

tests/iot/reconciliation.test.ts:
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 1 Happy Path: should immediately confirm unlock when direct MQTT ACK event arrives [0.58ms]
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 1 Jammed Detection: should throw HardwareJammedError when sensor detects solenoid jam [0.25ms]
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 2 Fallback: should reconcile successfully via active sensor polling when ACK packet dropped [37.85ms]
(pass) IoT Hardware Integration & 2-Phase Lock State Reconciliation > Phase 2 Station Offline: should throw HardwareCommunicationError when station remains offline [29.72ms]

tests/mcp/mcp.test.ts:
(pass) Model Context Protocol (MCP) Server & AI Governance > should expose standardized MCP tool schemas for subagent discovery [0.18ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should execute read-only tool get_station_health safely [0.42ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should block emergency door unlock without valid Human-in-the-Loop approval signature [0.09ms]
(pass) Model Context Protocol (MCP) Server & AI Governance > should execute emergency door unlock when Human-in-the-Loop signature is provided [0.09ms]

tests/security/dynamic-qr.test.ts:
(pass) Dynamic QR & Replay Attack Defense > should generate and successfully verify a dynamic QR token within the valid time window [0.97ms]
(pass) Dynamic QR & Replay Attack Defense > should reject tokens with invalid HMAC signatures (Tampered token) [0.25ms]
(pass) Dynamic QR & Replay Attack Defense > should reject expired tokens beyond window drift tolerance (Anti-Old Screenshot) [0.10ms]
(pass) Dynamic QR & Replay Attack Defense > should block replay attacks when the same valid token is scanned twice (Atomic Nonce Burner) [0.19ms]

tests/unit/domain-policies.test.ts:
(pass) Domain Extensibility Policies (Strategy Pattern) > Food Domain Policy > should allow food reservation within 120 minutes hygiene limit [1.44ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Food Domain Policy > should reject food reservation exceeding 120 minutes limit [0.05ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Food Domain Policy > should calculate food pricing correctly [0.04ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Cold Storage Domain Policy > should allow valid temperature range [2°C - 6°C] [0.07ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Cold Storage Domain Policy > should reject out-of-bounds temperature setting [0.03ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Laundry Domain Policy > should calculate daily pricing for multi-day laundry hold [0.02ms]
(pass) Domain Extensibility Policies (Strategy Pattern) > Parcel Domain Policy > should apply size multipliers for parcel pricing [0.06ms]

tests/unit/operational-features.test.ts:
(pass) Operational Features & Edge Policies Verification > Seamless In-App Size Upgrade Engine (ADR-011) > should upgrade compartment size and calculate price difference when larger slot is available [0.96ms]
(pass) Operational Features & Edge Policies Verification > Kiosk Emergency Backup PIN & Brute-Force Defense (ADR-012) > should allow unlock with correct 6-digit emergency PIN [0.59ms]
(pass) Operational Features & Edge Policies Verification > Kiosk Emergency Backup PIN & Brute-Force Defense (ADR-012) > should lockout phone number for 15 minutes after 3 consecutive failed PIN attempts [0.41ms]
(pass) Operational Features & Edge Policies Verification > Power Outage & Door Ajar Handlers (ADR-009, ADR-010) > should record power disruption and freeze alerts [0.13ms]
(pass) Operational Features & Edge Policies Verification > Power Outage & Door Ajar Handlers (ADR-009, ADR-010) > should log door ajar alert and dispatch investigation [0.09ms]

tests/unit/station.test.ts:
(pass) Station & Compartment Service > should fetch all registered stations [4.24ms]
(pass) Station & Compartment Service > should calculate distance and find nearby stations using geospatial coordinates [0.42ms]
(pass) Station & Compartment Service > should filter available compartments by size tier [0.17ms]

 28 pass
 0 fail
 60 expect() calls
Ran 28 tests across 7 files. [164.00ms]

$ tsc --noEmit
# 0 Errors. Strict TypeScript Typecheck 100% Green.
```

---

## 🚀 Quickstart & Verification Commands

```bash
# 1. รันชุดทดสอบอัตโนมัติ 28 เคส (Unit, Concurrency, IoT, Dynamic QR, MCP)
bun test

# 2. ตรวจสอบความถูกต้องของ Type ด้วย Strict TypeScript
bun run typecheck

# 3. รันเซิร์ฟเวอร์จำลอง REST API Gateway
bun run dev

# 4. รันเซิร์ฟเวอร์ Model Context Protocol (MCP)
bun run mcp

# 5. Build และรันบน Container Infrastructure (Docker Compose)
docker compose up -d --build
```
