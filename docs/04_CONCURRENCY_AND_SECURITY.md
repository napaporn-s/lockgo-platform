# LOCKGO — Concurrency Control & Dynamic Security Architecture

> **Assessment Section:** Concurrency Control, Race Condition Defense & Security Architecture  
> **Role:** Lead Platform Architect & Security Specialist  
> **Platform:** LOCKGO Smart Locker Platform  

---

## 1. Concurrency Control & Double Booking Prevention

### 1.1 The High-Demand Race Condition Problem
In high-traffic urban transit hubs (e.g., BTS Asoke or MRT Sukhumvit), multiple users frequently attempt to reserve the last remaining Medium (M) locker compartment simultaneously.

A naive implementation with standard `SELECT -> UPDATE` will create a classic **Time-of-Check to Time-of-Use (TOCTOU)** race condition:

```mermaid
sequenceDiagram
    autonumber
    actor UserA as User A (Mobile App)
    actor UserB as User B (Mobile App)
    participant API as LockGo API Server
    participant DB as PostgreSQL Database

    UserA->>API: POST /reservations (Compartment M-01)
    UserB->>API: POST /reservations (Compartment M-01)
    API->>DB: User A: SELECT status WHERE id='M-01' (AVAILABLE)
    API->>DB: User B: SELECT status WHERE id='M-01' (AVAILABLE)
    Note over API,DB: Race Window: Both threads perceive compartment as AVAILABLE
    API->>DB: User A: UPDATE status='RESERVED' WHERE id='M-01'
    API->>DB: User B: UPDATE status='RESERVED' WHERE id='M-01'
    Note over DB: FATAL: Both users receive confirmation for the same locker!
```

---

### 1.2 The 3-Layer Defense-in-Depth Concurrency Architecture

To guarantee **0% Double-Booking** while maintaining sub-100ms P99 API response times, LockGo implements a **3-Layer Concurrency Defense**:

```mermaid
flowchart TD
    Req([Incoming Reservation Request]) --> L1{Layer 1: Redis Redlock}
    L1 -->|Lock Acquired in <5ms| L2{Layer 2: DB Transaction & Version Check}
    L1 -->|Lock Contested / Failed| Reject1[HTTP 409 Conflict: Slot Busy]
    
    L2 -->|SELECT FOR UPDATE / Version Match| L3{Layer 3: DB Partial Unique Index}
    L2 -->|Version Mismatch / Status != AVAILABLE| Rollback1[DB Rollback & Release Lock]
    
    L3 -->|Constraint Verified| Commit[DB Commit + Release Lock + Return Booking Token]
    L3 -->|Unique Violation| Rollback2[DB Rejects Violation & Release Lock]
```

#### Layer 1: Distributed Memory Lock (Redis Redlock / Atomic Lua)
- **Mechanism:** Before touching the relational database, the API acquires a distributed lock on the specific compartment key `lock:compartment:{compartment_id}` with a 5000ms auto-expiry TTL.
- **Latency:** ~1-3ms.
- **Purpose:** Acts as a high-speed traffic filter, ensuring that out of 100 concurrent requests, only 1 request proceeds to the database layer at any millisecond.
- **Atomic Lua Release:**
```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

#### Layer 2: ACID Relational Isolation (PostgreSQL `SELECT ... FOR UPDATE`)
- **Mechanism:** Within a `READ COMMITTED` or `REPEATABLE READ` transaction, query the compartment with row-level pessimistic locking:
```sql
SELECT id, station_id, status, version 
FROM compartments 
WHERE id = $1 AND status = 'AVAILABLE' 
FOR UPDATE;
```
- If no row is returned (already reserved by a prior committed transaction), transaction rolls back immediately and throws `CompartmentNotAvailableError`.

#### Layer 3: Physical Database Constraint (Partial Unique Index)
- **Mechanism:** Even if Redis crashes and application concurrency logic fails, the database engine physically rejects duplicate active allocations at the storage engine level.
```sql
CREATE UNIQUE INDEX idx_unique_active_compartment_reservation 
ON reservations (compartment_id) 
WHERE status IN ('PENDING', 'ACTIVE');
```

---

## 2. Dynamic QR Security & Anti-Screenshot Replay Defense

### 2.1 Threat Model
1. **Screenshot Sharing:** User A reserves a locker to store sensitive items or high-value documents. User A sends a screenshot of the QR code to an unauthorized person or has their photo gallery compromised.
2. **Replay Attacks:** An attacker captures the QR payload via network sniffing or camera recording and replays it at the physical scanner later.
3. **Brute Force Pickup PINs:** An attacker guesses a 4-digit PIN on the locker keypad.

---

### 2.2 Dynamic Rolling Token (TOTP / Signed HMAC-SHA256)

```mermaid
sequenceDiagram
    autonumber
    actor Mobile as Mobile App (User)
    participant API as LockGo Auth Service
    actor Scanner as Physical Locker Camera
    participant Edge as Station Edge Daemon
    participant Redis as Redis Cache (Token Burner)

    Note over Mobile: Generates TOTP Token (30s Window)<br/>Payload: HMAC-SHA256(Secret, Window + Nonce)
    Mobile->>Scanner: Presents Dynamic QR Code
    Scanner->>Edge: Raw QR Payload Scanned
    Edge->>API: VerifyToken(reservation_id, token, nonce, timestamp)
    API->>API: 1. Validate HMAC Signature with Reservation Secret
    API->>API: 2. Verify Timestamp Window (Current +/- 1 step)
    API->>Redis: 3. SETNX nonce:used:{nonce} (TTL 60s)
    alt Nonce Already Exists in Redis
        Redis-->>API: 0 (Already Used / Replayed)
        API-->>Edge: REJECT (Replay Attack Detected)
        Edge-->>Scanner: Display Alert: "Token Already Consumed"
    else Nonce Is New
        Redis-->>API: 1 (Consumed Successfully)
        API-->>Edge: APPROVE (Valid Token)
        Edge->>Edge: Trigger Relay Pulse (Unlock Door)
    end
```

### 2.3 Cryptographic Token Structure

The dynamic QR code encodes a compact, URL-safe Base64 payload:

$$\text{QR Payload} = \text{ReservationID} \parallel \text{TimestampWindow} \parallel \text{Nonce} \parallel \text{HMAC-SHA256}(\text{Key}, \text{PayloadBody})$$

- **Time Step:** 30 seconds.
- **Drift Tolerance:** $\pm 1$ step (allows for up to 30 seconds of client/server clock discrepancy).
- **Single-Use Burner:** Each nonce is atomically burned in Redis with `SETNX nonce:{nonce} 1 EX 60`. If the return is 0, the token is flagged as a replay attack and blocked instantly.
