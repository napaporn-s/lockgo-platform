# LOCKGO — System Architecture & Technical Design Specification (SA Phase)

> **Role:** Chief System Architect & Platform Engineering Lead  
> **Platform:** LOCKGO — Next-Gen Smart Locker Platform  
> **Author:** Napaporn Suttinarksombat (Koy) & Elena (Technical Assistant)  
> **Version:** 1.2.0 (Comprehensive Enterprise Architecture Specification)

---

## 1. High-Level System Architecture (C4 Model - Container Level)

LOCKGO ใช้สถาปัตยกรรมแบบ **Modular Monolith Core** ร่วมกับ **Event-Driven Asynchronous Messaging Backbone** และ **Edge IoT Gateways** สำหรับการเชื่อมต่อตู้ฮาร์ดแวร์จริงทั่วประเทศ

```mermaid
flowchart TB
    subgraph Clients ["Client Applications Layer"]
        MobileApp["Mobile App (Flutter / React Native)
• Geolocation Station Discovery
• Dynamic Rolling TOTP QR Generator
• Bluetooth BLE Access Beacon"]
        WebAdmin["Web Admin & Ops Backoffice (Nuxt 4 / Vue 3)
• Station Fleet Telemetry & Map
• Force Unlock / Disposal Workflow
• Settlement & Audit Reconciliation"]
        B2BGateway["B2B Partner API Gateway (OAuth 2.0 / mTLS)
• Enterprise Courier Batch Dropoff
• Partner Webhook Event Stream"]
    end

    subgraph EdgeSecurity ["Edge Security & API Gateway Layer"]
        Cloudflare["Cloudflare Edge (WAF, DDoS Protection, TLS 1.3 Termination)"]
        APIGateway["API Gateway & Reverse Proxy (Envoy / Traefik)
• Rate Limiting (Token Bucket)
• JWT Authentication Guard
• Idempotency-Key Deduplication"]
    end

    subgraph CorePlatform ["LOCKGO Platform Core (Modular Monolith - TypeScript/Node.js 22 LTS)"]
        AuthModule["Auth & RBAC Module (Admin, Staff, Driver, Customer)"]
        StationModule["Station & Compartment Registry (PostGIS Spatial Lookup)"]
        ReservationModule["Reservation & 3-Layer Concurrency Engine"]
        AccessSecurityModule["Access Security & Dynamic QR Engine (TOTP / Nonce)"]
        IoTGatewayModule["IoT Gateway & 2-Phase State Reconciliation"]
        PaymentModule["Payment Engine & Automated Instant Refund"]
        FinancialLedgerModule["Double-Entry Financial Ledger (Immutable)"]
        B2BIntegrationModule["B2B Logistics & Webhook Dispatcher"]
        DomainExtensionEngine["Domain Extension Engine (Food, Cold, Laundry, Parcel)"]
        AuditModule["Audit Trail & Compliance Logger (PII Masking)"]
        MCPModule["Model Context Protocol (MCP) Server for AI Agents"]
    end

    subgraph PersistenceTier ["Persistence & Data Infrastructure Tier"]
        PostgreSQL[("Primary Relational Database
(PostgreSQL 16 Multi-AZ)
• ACID Transactions
• PostGIS Spatial Indexing
• Schema-per-Module Isolation")]
        RedisCluster[("In-Memory Cache & Distributed Lock
(Redis Cluster 7.2+)
• Redlock Concurrency Keys
• Sub-ms Station Cache
• Nonce Blacklist / Expiry (SETNX)")]
        TimescaleDB[("IoT Telemetry Time-Series DB
• Door Sensor Logs (Open/Close)
• Cold Storage Temperature Logs")]
        S3Storage[("Encrypted Object Storage (AWS S3)
• Field Ops Proof of Disposal Photos
• CCTV Incident Footage Archive")]
    end

    subgraph MessagingBackbone ["Event Bus & Message Broker"]
        MQTTBroker["MQTT v5 Broker (EMQX Cluster over mTLS)
• Command Topic (QoS 1)
• Sensor Feedback Event Topic (QoS 1)
• Telemetry & Heartbeat Streams"]
        RabbitMQ["Message Queue / Event Bus (RabbitMQ / BullMQ)
• Asynchronous Webhook Retries
• SMS / FCM Push Notifications
• Nightly 02:00 Reconciliation Batch Job"]
    end

    subgraph PhysicalStation ["Physical Smart Locker Station (Edge Node)"]
        EdgeController["Station Edge Controller (Linux ARM SoC / Industrial PC)
• Local SQLite Offline Queue Buffer
• MQTT Client Daemon (mTLS)
• TOTP Validation Offline Fallback"]
        RelayBoard["RS-485 / Modbus Relay Board (Solenoid Actuators)"]
        Sensors["Magnetic Reed Door Sensors & Temp Probes"]
        StationScanner["Dynamic QR Barcode Scanner Camera"]
    end

    Clients --> Cloudflare --> APIGateway
    APIGateway --> CorePlatform
    CorePlatform --> PostgreSQL
    CorePlatform --> RedisCluster
    CorePlatform --> TimescaleDB
    CorePlatform --> S3Storage
    CorePlatform --> RabbitMQ
    RabbitMQ --> CorePlatform

    CorePlatform <-->|MQTT v5 over mTLS| MQTTBroker
    MQTTBroker <-->|Persistent TLS| EdgeController
    EdgeController --> RelayBoard
    EdgeController --> Sensors
    EdgeController --> StationScanner
```

---

## 2. Technology Stack Selection & Benchmark Justification

| Layer / Component | Chosen Technology | Rationale, Performance & Benchmark Evidence |
|---|---|---|
| **Backend Runtime** | Node.js (v22 LTS) / TypeScript strict | High I/O throughput สำหรับ Asynchronous MQTT/HTTP streams; Type-safety ครอบคลุม Domain Contracts; ใช้ TypeScript ร่วมกันทั้ง Web, Backend และ Test Suite |
| **Primary Database** | PostgreSQL 16 + PostGIS | ACID Compliance แท้จริงสำหรับธุรกรรมการเงินและการจอง; PostGIS รองรับ Spatial Query (`ST_DWithin`) ในเวลา < 5ms; มี JSONB สำหรับ Dynamic Domain Metadata |
| **Cache & Distributed Lock** | Redis Cluster (v7.2+) | Latency ต่ำ 1-3ms; มีคำสั่ง Atomic Primitives (`SETNX`, Lua scripts, Redlock) สำหรับการตัด Concurrency ด่านหน้าและการเผา Nonce ป้องกัน Replay Attack |
| **IoT Message Broker** | EMQX Cluster (MQTT v5 over mTLS) | Packet Header ขนาดเพียง 2 Bytes (ประหยัด Data SIM 4G กว่า 85-90% เทียบกับ HTTP); รองรับ persistent connection ได้กว่า 1,000,000 concurrent sockets |
| **Event Bus & Worker Queue**| RabbitMQ / Redis Streams | ป้องกัน Message Loss ด้วย At-Least-Once Delivery; มี Dead Letter Exchange (DLX) สำหรับ Webhook Retry แบบ Exponential Backoff |
| **Edge Hardware Daemon** | Linux ARM SoC + Python/Rust | มี Local SQLite Buffer เก็บ Active Tokens ล่วงหน้า 60 นาที ทำให้ลูกค้าสแกนเปิดตู้ได้แม้เน็ต 4G ดับชั่วคราว |
| **Observability & APM** | OpenTelemetry + Prometheus + Loki | Distributed Tracing ครอบคลุมตั้งแต่ HTTP Request -> DB Transaction -> MQTT Hardware Event พร้อม Structured JSON Logs |

---

## 3. Architecture Decision: Monolith vs Modular Monolith vs Microservices (ADR-001)

### 3.1 Comparative Evaluation Matrix

| เกณฑ์การประเมิน | Option A: Traditional Monolith | Option B: Modular Monolith (CHOSEN) | Option C: Pure Microservices |
|---|---|---|---|
| **Time to Market (MVP)** | เร็วมาก (1-2 เดือน) | **เร็ว (2-3 เดือน)** | ช้ามาก (5-8 เดือน จาก Infra Overhead) |
| **การแบ่งขอบเขต Domain (Boundaries)** | ต่ำ (เสี่ยงต่อ Spaghetti Code/DB Joins) | **สูงมาก (บังคับผ่าน TypeScript Modules & DB Schemas)** | สูงมาก (แยกตาม Physical Network Boundaries) |
| **ความซับซ้อนในการ Deploy** | ต่ำ (Single Container/Artifact) | **ต่ำ (Single Container/Artifact)** | สูงมาก (Kubernetes, Helm, Istio, Egress Cost) |
| **ความปลอดภัยของข้อมูล (ACID Transactions)** | ACID ทันทีใน Database เดียว | **ACID ทันทีใน Database เดียว (Single DB Cluster)** | ต้องใช้ Distributed Saga & Outbox (Eventual Consistency) |
| **ความพร้อมของทีม (10 -> 50 วิศวกร)** | แย่ (เสี่ยงต่อ Merge Conflicts และ Regression) | **ยอดเยี่ยม (แต่ละทีมเป็นเจ้าของ Module ชัดเจน)** | ยอดเยี่ยม (แต่ละทีมแยก Service อิสระ) |
| **ต้นทุน Infra & โครงสร้างพื้นฐาน** | ต่ำมาก | **ต่ำถึงปานกลาง** | สูงมาก (Multi-cluster, VPC Peering, NAT Gateway) |
| **เส้นทางการขยายระบบในอนาคต** | รื้อระบบใหม่ทั้งหมด | **แยก Service ได้ทันทีด้วย Strangler Fig Pattern** | แยกอยู่แล้ว |

### 3.2 Roadmap การขยายสถาปัตยกรรม (Strangler Fig Evolutionary Path)

```mermaid
stateDiagram-v2
    [*] --> Phase1_ModularMonolith: Stage 1 (10 Devs, 100 Stations)
    Phase1_ModularMonolith --> Phase2_StranglerExtraction: Stage 2 (25-30 Devs, 1,000+ Stations)
    Phase2_StranglerExtraction --> Phase3_TargetedMicroservices: Stage 3 (50+ Devs, 10,000+ Stations)

    state Phase1_ModularMonolith {
        Single_Deployment_Unit
        Shared_PostgreSQL_with_Schema_Isolation
        In_Process_Event_Bus_and_RabbitMQ
    }

    state Phase2_StranglerExtraction {
        Extract_IoT_Gateway_Microservice
        Extract_Payment_and_Ledger_Service
        Async_Event_Driven_RabbitMQ_Backbone
    }

    state Phase3_TargetedMicroservices {
        Core_Locker_Platform_Service
        IoT_Hardware_Fleet_Microservice
        Billing_and_Settlement_Microservice
        Vertical_Domain_Services_Food_Cold_Laundry
    }
```

#### เงื่อนไขการแยก Service (Triggers):
1. **Trigger 1 (IoT Socket Fan-out):** เมื่อจำนวนตู้เกิน 1,000 ตู้ (การเชื่อมต่อ MQTT/WebSocket ค้างเกิน 10,000 sockets) -> แยก `IoT Gateway Service` ออกเป็น Microservice อิสระที่เขียนด้วย Go/Rust เพื่อแยก Socket Memory ออกจาก HTTP Traffic
2. **Trigger 2 (PCI-DSS & Financial Audit):** เมื่อปริมาณธุรกรรมการเงินต้องการ Security Perimeter แยกต่างหาก -> แยก `Payment & Settlement Service` ออกไปใช้ฐานข้อมูลและสิทธิ์เครือข่ายเฉพาะ
3. **Trigger 3 (Cold Locker Telemetry Stream Analytics):** เมื่อตู้แช่เย็นต้องประมวลผล Time-Series Stream อุณหภูมิแบบ Real-time -> แยก `Cold Storage Telemetry Worker` ออกไปรันบน Dedicated Container

---

## 4. Relational Database Schema & Data Model (PostgreSQL 16)

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    ORDERS ||--|{ RESERVATIONS : contains
    ORDERS ||--o| PAYMENTS : settles
    STATIONS ||--o{ COMPARTMENTS : contains
    STATIONS ||--o{ STATION_TELEMETRY : logs
    COMPARTMENTS ||--o{ RESERVATIONS : allocates
    COMPARTMENTS ||--o{ DISPOSAL_RECORDS : clears
    RESERVATIONS ||--o| ACCESS_TOKENS : secures
    PAYMENTS ||--o{ FINANCIAL_LEDGER_ENTRIES : records
    USERS ||--o{ AUDIT_LOGS : performs

    USERS {
        uuid id PK
        string phone_number UK "Encrypted PDPA e.g. 081-***-4567"
        string national_id UK "Encrypted PDPA 1-2345-*****-12-3"
        string email "Encrypted PDPA e.g. jo***@example.com"
        string full_name "Customer or Staff Name"
        string role "CUSTOMER, DRIVER, FIELD_OPS, ADMIN"
        boolean is_phone_verified "OTP Verified status"
        timestamp created_at
        timestamp updated_at
    }

    ORDERS {
        uuid id PK
        uuid user_id FK
        string order_number UK "e.g. ORD-2026-081923"
        decimal total_amount "Gross total before discounts"
        decimal discount_amount "Voucher / Promo discount"
        decimal net_amount "Net amount charged to payment"
        string status "PENDING, PAID, PARTIALLY_REFUNDED, REFUNDED, CANCELLED"
        string order_type "SINGLE_PARCEL, BATCH_LAUNDRY, FOOD_DELIVERY"
        timestamp created_at
        timestamp updated_at
    }

    STATIONS {
        uuid id PK
        string station_code UK "e.g. BKK-ASOKE-01"
        string name
        geometry location_point "PostGIS Point (lat, lng)"
        string address
        jsonb operating_hours "JSON: { mon: '10:00-22:00' }"
        boolean is_24h "Default: false"
        string status "ACTIVE, MAINTENANCE, OFFLINE"
        jsonb hardware_config
        timestamp created_at
        timestamp updated_at
    }

    COMPARTMENTS {
        uuid id PK
        uuid station_id FK
        string compartment_number "e.g. A01"
        string size_tier "S, M, L, XL"
        string domain_vertical "PARCEL, FOOD, COLD, LAUNDRY"
        string status "AVAILABLE, RESERVED, OCCUPIED, OVERDUE, ABANDONED, DISPOSAL_PENDING, MAINTENANCE"
        int lock_relay_index "GPIO channel index"
        int version "Optimistic lock version counter"
        decimal current_temp_celsius
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    RESERVATIONS {
        uuid id PK
        uuid order_id FK "References Parent Order"
        uuid user_id FK
        uuid compartment_id FK
        string reservation_code UK "e.g. LK-948123"
        string status "PENDING, ACTIVE, COMPLETED, EXPIRED, CANCELLED"
        string domain_type "PARCEL, FOOD, COLD, LAUNDRY"
        decimal declared_value "Estimated item value"
        decimal insurance_fee "Additional insurance fee"
        timestamp start_time
        timestamp hold_expires_at "15-minute hold SLA"
        timestamp completed_at
        jsonb domain_attributes
        timestamp created_at
        timestamp updated_at
    }

    ACCESS_TOKENS {
        uuid id PK
        uuid reservation_id FK "Unique 1-to-1 with Reservation"
        string totp_secret "AES-256 encrypted secret"
        string pickup_pin_hash "HMAC-SHA256 salted hash"
        string pickup_pin_salt "16-byte random salt"
        string status "ACTIVE, CONSUMED, REVOKED, EXPIRED"
        timestamp last_rotated_at
        timestamp expires_at
    }

    PAYMENTS {
        uuid id PK
        uuid order_id FK "Linked to Order"
        uuid reservation_id FK "Optional 1-to-1 direct reference"
        string idempotency_key UK
        decimal amount
        string currency "THB"
        string payment_method "PROMPTPAY, CREDIT_CARD"
        string status "PENDING_AUTH, CAPTURED, VOIDED, REFUNDED, FAILED"
        string gateway_reference UK
        jsonb gateway_response
        timestamp created_at
    }

    FINANCIAL_LEDGER_ENTRIES {
        uuid id PK
        uuid payment_id FK
        string entry_type "DEBIT, CREDIT"
        string account_name "UNEARNED_REV, CASH, SERVICE_REV, REFUND_LOSS"
        decimal amount
        string description
        timestamp timestamp
    }

    STATION_TELEMETRY {
        uuid id PK
        uuid station_id FK
        decimal ac_voltage "Mains voltage reading"
        decimal battery_percent "LiFePO4 backup percentage"
        decimal ambient_temp_celsius "Internal cabinet temp"
        boolean is_mains_powered "True if AC grid active"
        string cellular_signal_csq "4G Signal strength 0-31"
        timestamp timestamp
    }

    DISPOSAL_RECORDS {
        uuid id PK
        uuid compartment_id FK
        uuid ops_user_id FK
        string disposal_type "ABANDONED_RETRIEVAL, PERISHABLE_DESTROYED"
        string photo_s3_url "Proof of work photo"
        string notes
        timestamp created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid actor_id FK
        string actor_role "ADMIN, FIELD_OPS, DRIVER, CUSTOMER"
        string action "RESERVE, UNLOCK, FORCE_UNLOCK, REFUND"
        string resource_type "COMPARTMENT, RESERVATION, STATION, PAYMENT"
        uuid resource_id
        jsonb details "Recursive PDPA Masked PII"
        string ip_address "Masked Subnet e.g. 192.168.10.***"
        timestamp timestamp
    }
```

### 4.1 Domain Bounded Contexts: Orders vs Reservations (Domain Design Rationale)
ในการออกแบบระบบ LOCKGO เราแยก Bounded Contexts ของ **`ORDERS` (พาณิชย์และการเงิน)** ออกจาก **`RESERVATIONS` (ฮาร์ดแวร์และการจัดสรรตู้)** อย่างชัดเจน:
- **`ORDERS` (Commercial Lifecycle):** รับผิดชอบเรื่องยอดเงินรวม, คูปองส่วนลด, การรวมคำสั่งซื้อหลายช่อง (Batch/Basket Checkout เช่น ซักอบรีด 3 ตะกร้า), ใบเสร็จรับเงิน และภาษีมูลค่าเพิ่ม
- **`RESERVATIONS` (Hardware & Slot Allocation Lifecycle):** รับผิดชอบเรื่องการจัดสรรช่องตู้ทางกายภาพ, Concurrency Lock (Redlock + SELECT FOR UPDATE), Dynamic TOTP QR Token, และ IoT Solenoid Unlock State Machine
- **ความสัมพันธ์ในเฟสต่างๆ:** ในเฟส MVP ธุรกรรม 1 รายการมีความสัมพันธ์แบบ 1-to-1 กับการจอง 1 ช่อง จึงผูก `PAYMENTS` เข้ากับ `RESERVATIONS` โดยตรงเพื่อลดความซับซ้อน แต่แยก Domain Boundary ไว้ล่วงหน้า ทำให้ในเฟสถัดไปสามารถเพิ่มเอนทิตี `ORDERS 1-to-Many RESERVATIONS` เพื่อรองรับ Multi-Compartment Basket Checkout ได้ทันทีโดยไม่ต้องรื้อ Concurrency Engine

---

## 5. Concurrency Strategy: 3-Layer Defense Against Double-Booking (ADR-002)

เพื่อรับประกันอัตรา **Double Booking = 0.000%** ภายใต้การกดจองช่องสุดท้ายพร้อมกัน ณ มิลลิวินาทีเดียวกัน:

```mermaid
sequenceDiagram
    autonumber
    actor User1 as ผู้ใช้คนที่ 1
    actor User2 as ผู้ใช้คนที่ 2
    participant API as LockGo API Gateway
    participant Redis as Redis Cluster (Redlock)
    participant DB as PostgreSQL (ACID Tier)
    participant MQTT as IoT Hardware Gateway

    User1->>API: POST /api/reservations (ช่อง A01)
    User2->>API: POST /api/reservations (ช่อง A01)

    par การแย่งชิง Concurrency ด่านที่ 1
        API->>Redis: SET lock:compartment:A01 NX EX 5000 (User 1)
        Redis-->>API: OK (User 1 ได้ Lock ใน 2ms)
    and
        API->>Redis: SET lock:compartment:A01 NX EX 5000 (User 2)
        Redis-->>API: NIL (User 2 ติด Lock Contention)
    end

    Note over API,User2: Layer 1 Gate: User 2 โดนปฏิเสธทันทีด้วย HTTP 409 Conflict (< 5ms)

    rect rgb(240, 248, 255)
        Note over API,DB: Layer 2 Gate: DB Transaction + Pessimistic Row Lock
        API->>DB: BEGIN TRANSACTION
        API->>DB: SELECT * FROM compartments WHERE id = 'A01' FOR UPDATE
        API->>DB: UPDATE compartments SET status = 'RESERVED', version = version + 1 WHERE id = 'A01' AND status = 'AVAILABLE'
        API->>DB: INSERT INTO reservations (...) VALUES (...)
        API->>DB: COMMIT TRANSACTION
    end

    API->>Redis: DEL lock:compartment:A01 (Safe Lua Release)
    API->>MQTT: Publish Event: COMPARTMENT_RESERVED
    API-->>User1: 201 Created (จองสำเร็จ + รับ Dynamic QR Token)
    API-->>User2: 409 Conflict (ช่องไม่ว่าง แนะนำช่องสำรอง A02)
```

### รายละเอียด 3 ด่านป้องกัน (3 Defense Layers):
1. **Layer 1 (Fast In-Memory Gate - Redis Redlock):**
   - Key: `lock:compartment:{id}`, TTL: 5,000ms
   - Atomic `SET key value NX PX 5000` กรองคำขอที่ชนกันทิ้งได้กว่า 98% ภายใน 2-3ms โดยไม่สร้างโหลดให้กับ Database
2. **Layer 2 (Database Transaction & Pessimistic Row Lock - PostgreSQL):**
   - รันใน Transaction ด้วย `SELECT ... FOR UPDATE` และเช็ค `status = 'AVAILABLE'` หากสถานะเปลี่ยนไประหว่างรอ ให้ Rollback ทันที
3. **Layer 3 (Database Engine Physical Unique Constraint):**
   - Partial Unique Index ที่ระดับ Storage Engine ของ PostgreSQL:
     ```sql
     CREATE UNIQUE INDEX idx_unique_active_compartment_reservation 
     ON reservations (compartment_id) 
     WHERE status IN ('PENDING', 'ACTIVE');
     ```
   - แม้เกิดเหตุ Redis Crash หรือ Split-Brain Database Engine จะ Physically Reject คำขอจองซ้ำที่ระดับดิสก์ 100%

---

## 6. IoT Locker Hardware Protocol & Two-Phase Lock State Reconciliation (ADR-003)

### 6.1 MQTT Topic Topology (QoS 1)
- **Command Topic (Cloud -> Station):** `lockgo/station/{stationId}/command/unlock`
- **Feedback Event Topic (Station -> Cloud):** `lockgo/station/{stationId}/event/sensor`
- **Telemetry Stream (Station -> Cloud):** `lockgo/station/{stationId}/telemetry/heartbeat`

### 6.2 Two-Phase Lock State Reconciliation Flowchart

```mermaid
sequenceDiagram
    autonumber
    participant Server as LockGo IoT Gateway
    participant MQTT as MQTT Broker (EMQX mTLS)
    participant Edge as Station Edge Daemon (ARM SoC)
    participant Hardware as Solenoid Relay & Reed Sensor

    Server->>MQTT: Publish command/unlock (command_id: UUID, relay_index: 2, correlation_token: "res_01")
    MQTT->>Edge: Deliver Unlock Command (QoS 1)
    Edge->>Hardware: สั่งจ่ายกระแสไฟเข้าโซลินอยด์ (Pulse 350ms)
    Hardware-->>Edge: เซนเซอร์แม่เหล็กจับสถานะประตู -> DOOR_OPENED

    alt สัญญาณเน็ตปกติ (Happy Path)
        Edge->>MQTT: Publish event/sensor (command_id, lockStatus: "UNLOCKED", doorSensor: "OPEN")
        MQTT->>Server: Deliver Sensor Event
        Server->>Server: เปลี่ยนสถานะ Reservation -> OCCUPIED และสั่ง Capture ยอดเงิน
    else สัญญาณเน็ตมือถือหลุด (Network Partition / No ACK within 3s)
        Note over Server: ครบ 3.0s Timeout! สถานะเปลี่ยนเป็น PENDING_RECONCILIATION
        Note over Edge: Edge Daemon บันทึกประวัติการเปิดตู้ลงใน Local SQLite Queue Buffer
        Note over Edge,MQTT: เน็ตกลับมาต่อติด (Edge Reconnects)
        Edge->>MQTT: Flush Buffered SQLite Events (QoS 1)
        MQTT->>Server: Deliver Delayed Sensor Event
        Server->>Server: Reconcile สถานะย้อนหลัง -> OCCUPIED และบันทึก Audit Log: RECONCILED_ASYNC
    else ประตูกลไกติดขัด (Solenoid Jammed / Door Remains Closed)
        Edge-->>MQTT: Sensor Event: HARDWARE_JAMMED (doorSensor: CLOSED)
        MQTT->>Server: Deliver Hardware Jam Alert
        Server->>Server: Auto-Void คืนเงิน 100% + เปลี่ยนช่องเป็น MAINTENANCE + จัดสรรช่องใหม่ให้ลูกค้าทันที
    end
```

---

## 7. Dynamic TOTP / HMAC-SHA256 QR Security & Anti-Screenshot Replay Defense (ADR-004)

```mermaid
flowchart LR
    subgraph MobileApp ["Mobile Customer App"]
        SecretKey["Shared Secret Key (AES-256)"]
        TimeStep["Current Time Window (30s)"]
        NonceGen["Unique Nonce (UUID)"]
        HMACCalc["HMAC-SHA256(Secret, Window + Nonce)"]
        DynamicQR["Dynamic QR Code\n(Rotates every 30s)"]

        SecretKey --> HMACCalc
        TimeStep --> HMACCalc
        NonceGen --> HMACCalc
        HMACCalc --> DynamicQR
    end

    subgraph StationScanner ["Locker Station Scanner"]
        Camera["Station QR Camera"]
        VerifyTOTP["Validate Time Window (t, t-1, t+1)"]
        CheckNonce["Atomic Redis SETNX nonce:UUID (TTL 10m)"]
        UnlockRelay["Trigger Solenoid Unlock"]

        Camera --> VerifyTOTP
        VerifyTOTP -->|Valid| CheckNonce
        CheckNonce -->|Unused| UnlockRelay
        CheckNonce -->|Duplicate / Replay| Reject["Reject Scan & Sound Alert"]
    end

    DynamicQR -.->|Physical Optical Scan| Camera
```

- **Rotation Window:** 30 วินาที
- **Clock Drift Tolerance:** ยอมรับ Window $T_0, T_{-1}, T_{+1}$ (ยืดหยุ่นได้ $\pm 30$ วินาที)
- **Single-Use Nonce Burner:** ทุก QR Code มี UUID ฝังอยู่ เมื่อสแกนผ่าน ระบบจะรันคำสั่ง Redis `SETNX nonce:{uuid} 1 EX 600` หากได้ค่า `0` แปลว่าเป็นโค้ดที่เคยใช้ไปแล้ว (Replay Attack) และจะปฏิเสธการเปิดตู้ทันที
