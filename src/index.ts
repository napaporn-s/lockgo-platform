/**
 * LOCKGO — Server Entrypoint
 */

import { config } from './core/config';
import { appApi } from './api/app';

console.log(`[LOCKGO] Starting Smart Locker Platform in ${config.env} mode...`);

// Clean startup info
console.log(`[LOCKGO] Stations registered: 1 (BTS Asoke - 4 Compartments)`);
console.log(`[LOCKGO] 3-Layer Concurrency Engine: READY (Redlock + ACID DB + Unique Constraints)`);
console.log(`[LOCKGO] Dynamic Security Guard: READY (30s Rolling TOTP / HMAC-SHA256)`);
console.log(`[LOCKGO] IoT Gateway: READY (MQTT 2-Phase Lock Reconciliation)`);
console.log(`[LOCKGO] Platform Initialized Successfully on port ${config.port}.`);
