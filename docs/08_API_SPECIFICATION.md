# LOCKGO — REST API Specification & Data Contracts

> **Role:** Lead Platform Engineer & API Architect  
> **Platform:** LOCKGO — Next-Gen Smart Locker Platform  
> **Author:** Napaporn Suttinarksombat (Koy) & Elena (Technical Assistant)  
> **Version:** 1.0.0 (Production API Specification)

---

## 1. Overview & Standard Headers

LOCKGO API ทำงานบนโปรโตคอล RESTful JSON ผ่าน TLS 1.3 โดยมีมาตรฐาน Header บังคับดังนี้:

| Header Name | Type | Description | Required |
|---|---|---|---|
| `Content-Type` | String | `application/json` | Yes |
| `Authorization` | String | `Bearer <JWT_TOKEN>` | Yes (ยกเว้น Public Discovery) |
| `X-Idempotency-Key` | UUID | Client-generated UUID ป้องกันการตัดเงินหรือสร้างซ้ำ | Yes (สำหรับ Mutating POST) |
| `X-Correlation-ID` | UUID | Tracing ID สำหรับการติดตามข้ามระบบตั้งแต่ API สู่ MQTT | Yes |

---

## 2. API Endpoints Directory

### 2.1 Station & Compartment Discovery

#### `GET /api/stations`
- **Description:** ดึงรายชื่อสถานีตู้ล็อกเกอร์ทั้งหมด หรือค้นหาสถานีใกล้เคียงด้วยพิกัดภูมิศาสตร์ (PostGIS ST_DWithin)
- **Query Parameters:**
  - `lat` (optional, float): ละติจูดผู้ใช้ (เช่น `13.7371`)
  - `lng` (optional, float): ลองจิจูดผู้ใช้ (เช่น `100.5604`)
  - `radiusKm` (optional, float): รัศมีการค้นหาเป็นกิโลเมตร (default: `5.0`)
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "station-asoke-01",
      "stationCode": "BKK-ASOKE-01",
      "name": "BTS Asoke Smart Locker Station",
      "location": {
        "latitude": 13.7371,
        "longitude": 100.5604
      },
      "address": "BTS Asoke Station Concourse, Sukhumvit Rd, Bangkok",
      "status": "ACTIVE",
      "operatingHours": {
        "mon": "06:00-24:00",
        "tue": "06:00-24:00"
      },
      "is24h": false,
      "distanceKm": 0.42
    }
  ]
}
```

---

#### `GET /api/stations/:id/compartments`
- **Description:** ตรวจสอบรายการช่องล็อกเกอร์ที่ว่างแบบเรียลไทม์ พร้อมตัวกรองประเภทการใช้งานและขนาดช่อง
- **Query Parameters:**
  - `sizeTier` (optional): `S`, `M`, `L`, `XL`
  - `domainVertical` (optional): `PARCEL`, `FOOD`, `COLD`, `LAUNDRY`
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "comp-asoke-s01",
      "stationId": "station-asoke-01",
      "compartmentNumber": "S-01",
      "sizeTier": "S",
      "domainVertical": "PARCEL",
      "status": "AVAILABLE",
      "currentTempCelsius": null
    },
    {
      "id": "comp-asoke-c01",
      "stationId": "station-asoke-01",
      "compartmentNumber": "COLD-01",
      "sizeTier": "M",
      "domainVertical": "COLD",
      "status": "AVAILABLE",
      "currentTempCelsius": 4.2
    }
  ]
}
```

---

### 2.2 Reservation & Concurrency Management

#### `POST /api/reservations`
- **Description:** ทำการจองช่องล็อกเกอร์แบบ 3-Layer Concurrency Locking (0% Double Booking)
- **Request Body:**
```json
{
  "userId": "usr_94812a81-0192",
  "stationId": "station-asoke-01",
  "compartmentId": "comp-asoke-s01",
  "domainType": "PARCEL",
  "declaredValue": 1500.0,
  "hasInsurance": false,
  "domainAttributes": {
    "carrier": "FLASH_EXPRESS",
    "trackingNumber": "TH0192847192"
  }
}
```
- **Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "reservation": {
      "id": "res-8f43a9b2-10c5-4921-b389",
      "reservationCode": "LK-94A1F2",
      "userId": "usr_94812a81-0192",
      "compartmentId": "comp-asoke-s01",
      "stationId": "station-asoke-01",
      "status": "PENDING",
      "domainType": "PARCEL",
      "startTime": 1756034100000,
      "holdExpiresAt": 1756035000000
    },
    "accessTokenId": "token-a1b2c3d4",
    "emergencyPin": "849201"
  }
}
```
- **Error Responses:**
  - `409 Conflict`: ช่องถูกจองแล้วจาก Race Condition ในมิลลิวินาทีเดียวกัน (`LOCK_CONTENTION_ERROR`)
  - `400 Bad Request`: ผิดเงื่อนไข Domain Policy เช่น อาหารเกิน 120 นาที (`DOMAIN_POLICY_REJECTED`)

---

#### `POST /api/reservations/:id/upgrade-size`
- **Description:** สลับไปช่องไซส์ใหญ่กว่าทันทีขณะอยู่หน้าตู้ พร้อมคำนวณส่วนต่างราคา (ADR-011)
- **Request Body:**
```json
{
  "reservationId": "res-8f43a9b2-10c5-4921-b389",
  "targetSizeTier": "L"
}
```
- **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Compartment size upgraded to L",
  "data": {
    "reservation": {
      "id": "res-8f43a9b2-10c5-4921-b389",
      "compartmentId": "comp-asoke-l01",
      "status": "PENDING"
    },
    "newCompartmentId": "comp-asoke-l01",
    "priceDifference": 30.0
  }
}
```

---

### 2.3 Access Security & Unlocking

#### `POST /api/unlock/dynamic-qr`
- **Description:** สแกนเนอร์หน้าตู้ยิง Payload ของ Dynamic TOTP QR Code 30s เข้ามาปลดล็อกกลอนโซลินอยด์ (ADR-004)
- **Request Body:**
```json
{
  "stationId": "station-asoke-01",
  "compartmentId": "comp-asoke-s01",
  "qrToken": "eyJyZXNlcnZhdGlvbklkIjoicmVzLThmNDNhOWIyIiwidGltZVdpbmRvdyI6NTg1MzQ0Nywibm9uY2UiOiI5YTEyYzgxZiIsInNpZ25hdHVyZSI6IjRmMDFi..."
}
```
- **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Compartment unlocked successfully",
  "data": {
    "commandId": "cmd_8f43a9b2-10c5-4921",
    "lockState": "UNLOCKED",
    "doorState": "OPEN",
    "reconciliationPhase": "PHASE_1_DIRECT_ACK"
  }
}
```
- **Error Responses:**
  - `401 Unauthorized`: Token หมดอายุเกิน 30s หรือถูกปลอมแปลง (`INVALID_SECURITY_TOKEN`)
  - `409 Conflict`: Nonce ถูกใช้ซ้ำ (ตรวจจับ Replay Attack จาก Screenshot) (`NONCE_REPLAY_ATTACK_DETECTED`)

---

#### `POST /api/unlock/emergency-pin`
- **Description:** ปลดล็อกตู้ผ่านหน้าจอ Kiosk ด้วยเบอร์โทรศัพท์ + Backup PIN 6 หลัก โดยตรวจสอบเทียบกับ Cryptographic Hash ในฐานข้อมูลเซิร์ฟเวอร์ (ADR-012)
- **Request Body:**
```json
{
  "stationId": "station-asoke-01",
  "compartmentId": "comp-asoke-s01",
  "reservationId": "res-8f43a9b2-10c5-4921",
  "phoneNumber": "0811234567",
  "enteredPin": "849201"
}
```
- **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Emergency PIN verified and locker unlocked",
  "data": {
    "lockState": "UNLOCKED",
    "doorState": "OPEN"
  }
}
```
- **Error Responses:**
  - `401 Unauthorized`: รหัส PIN ไม่ถูกต้อง
  - `429 Too Many Requests`: กรอก PIN ผิดติดต่อกันครบ 3 ครั้ง ระบบสั่งล็อกเมนู 15 นาที (`KIOSK_PIN_LOCKED_OUT`)

---

### 2.4 Two-Phase Payment & Financial Ledger

#### `POST /api/payments/pre-authorize`
- **Description:** วงเงินกันยอด (Pre-Authorization Hold) ก่อนผู้ใช้เข้าเปิดตู้ พร้อมบันทึก Ledger
- **Request Body:**
```json
{
  "reservationId": "res-8f43a9b2-10c5-4921",
  "amount": 45.0,
  "paymentMethod": "PROMPTPAY",
  "idempotencyKey": "idem-pay-8f43a9b2-10c5"
}
```
- **Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "pay-9b12a812",
    "reservationId": "res-8f43a9b2-10c5-4921",
    "amount": 45.0,
    "currency": "THB",
    "status": "PENDING_AUTH"
  }
}
```

---

#### `POST /api/payments/:id/capture`
- **Description:** ตัดเงินจริง (Capture) เมื่อผู้ใช้ฝากของสำเร็จ พร้อมบันทึกรับรู้รายได้ (Service Revenue)
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "pay-9b12a812",
    "status": "CAPTURED"
  }
}
```

---

#### `POST /api/payments/:id/refund`
- **Description:** คืนเงินเต็มจำนวน 100% (Instant Gross Refund) เมื่อเกิดเหตุกรณีกลอนติดขัดหรือตู้ขัดข้อง
- **Request Body:**
```json
{
  "reason": "Solenoid Lock Jammed on compartment comp-asoke-s01"
}
```
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "pay-9b12a812",
    "status": "REFUNDED"
  }
}
```

---

#### `GET /api/admin/financial-ledger`
- **Description:** ตรวจสอบประวัติบัญชีคู่ (Double-Entry Ledger)
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "led-1",
      "paymentId": "pay-9b12a812",
      "entryType": "DEBIT",
      "accountName": "CASH",
      "amount": 45.0,
      "description": "Pre-auth hold for reservation"
    },
    {
      "id": "led-2",
      "paymentId": "pay-9b12a812",
      "entryType": "CREDIT",
      "accountName": "UNEARNED_REVENUE",
      "amount": 45.0,
      "description": "Unearned revenue liability"
    }
  ]
}
```

---

### 2.5 IoT Hardware & Safety Webhooks

#### `POST /api/iot/events/power-disrupted`
- **Description:** รับแจ้งเหตุไฟฟ้าดับจากตู้ สลับโหมด `Emergency Power Saving` และระงับการเปิดจองใหม่
- **Request Body:**
```json
{
  "stationId": "station-asoke-01",
  "batteryPercentage": 96.5,
  "estimatedRuntimeMinutes": 235
}
```
- **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Emergency Power Saving mode recorded. New reservations frozen."
}
```

---

#### `POST /api/iot/events/door-ajar`
- **Description:** รับแจ้งเตือนประตูตู้เปิดค้างเกิน 180 วินาที เปลี่ยนสถานะเป็น `PENDING_INVESTIGATION`
- **Request Body:**
```json
{
  "stationId": "station-asoke-01",
  "compartmentId": "comp-asoke-s01",
  "durationOpenSeconds": 180
}
```
- **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Door ajar alert triggered. Investigation dispatched to Central Ops."
}
```

---

### 2.6 Admin & Audit Logs

#### `GET /api/admin/audit-logs`
- **Description:** ดึงประวัติ Audit Trail แบบ Immutable พร้อมทำ PII Masking
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "audit-9b12a812",
      "action": "RESERVATION_CREATED",
      "resourceType": "RESERVATION",
      "resourceId": "res-8f43a9b2-10c5-4921",
      "actorId": "usr_94812a81-0192",
      "details": {
        "compartmentId": "comp-asoke-s01",
        "stationId": "station-asoke-01",
        "domainType": "PARCEL"
      },
      "timestamp": 1756034100000
    }
  ]
}
```
