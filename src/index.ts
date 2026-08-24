/**
 * LOCKGO — Server Entrypoint & Live REST API Server
 */

import { config } from './core/config';
import { appApi } from './api/app';

console.log(`[LOCKGO] Starting Smart Locker Platform in ${config.env} mode...`);
console.log(`[LOCKGO] 3-Layer Concurrency Engine: READY (Redlock + ACID DB + Unique Constraints)`);
console.log(`[LOCKGO] Dynamic Security Guard: READY (30s Rolling TOTP / HMAC-SHA256)`);
console.log(`[LOCKGO] IoT Gateway: READY (MQTT 2-Phase Lock Reconciliation)`);

const server = Bun.serve({
  port: config.port,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname, searchParams } = url;

    // CORS Headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    try {
      // 1. Health Check
      if (pathname === '/api/health' && req.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          engines: {
            concurrency: '3-Layer Redlock+ACID',
            security: 'TOTP 30s + Nonce Burner',
            iot: 'MQTT 2-Phase Reconciliation',
          }
        }), { status: 200, headers });
      }

      // 2. GET /api/stations
      if (pathname === '/api/stations' && req.method === 'GET') {
        const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
        const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
        const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : undefined;
        const result = await appApi.getStations(lat, lng, radius);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }

      // 3. GET /api/stations/:id/compartments
      const matchComp = pathname.match(/^\/api\/stations\/([^/]+)\/compartments$/);
      if (matchComp && req.method === 'GET') {
        const stationId = matchComp[1];
        const result = await appApi.getAvailableCompartments(stationId);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }

      // 4. POST /api/reservations
      if (pathname === '/api/reservations' && req.method === 'POST') {
        const body = await req.json();
        const result = await appApi.createReservation(body);
        return new Response(JSON.stringify(result), { status: 201, headers });
      }

      // 5. POST /api/reservations/:id/upgrade-size
      const matchUpgrade = pathname.match(/^\/api\/reservations\/([^/]+)\/upgrade-size$/);
      if (matchUpgrade && req.method === 'POST') {
        const body = await req.json();
        const result = await appApi.upgradeReservationSize({
          reservationId: matchUpgrade[1],
          targetSizeTier: body.targetSizeTier,
        });
        return new Response(JSON.stringify(result), { status: 200, headers });
      }

      // 6. POST /api/unlock/dynamic-qr
      if (pathname === '/api/unlock/dynamic-qr' && req.method === 'POST') {
        const body = await req.json();
        const result = await appApi.unlockWithDynamicQR(body);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }

      // 7. POST /api/unlock/emergency-pin
      if (pathname === '/api/unlock/emergency-pin' && req.method === 'POST') {
        const body = await req.json();
        const result = await appApi.unlockWithEmergencyPin(body);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }

      // 8. GET /api/admin/audit-logs
      if (pathname === '/api/admin/audit-logs' && req.method === 'GET') {
        const result = await appApi.getAuditLogs();
        return new Response(JSON.stringify(result), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: 'Endpoint Not Found', code: 'NOT_FOUND' }), { status: 404, headers });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return new Response(JSON.stringify({
        status: 'error',
        code: err.code || 'INTERNAL_ERROR',
        message: err.message,
      }), { status: statusCode, headers });
    }
  },
});

console.log(`[LOCKGO] HTTP REST API Server running live at http://localhost:${server.port}`);
