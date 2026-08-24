/**
 * LOCKGO — Central Platform Configuration
 */

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  concurrency: {
    redisLockTtlMs: 5000,
    lockRetryDelayMs: 20,
    maxLockRetries: 3,
    reservationHoldMinutes: 15,
  },

  security: {
    totpWindowSeconds: 30,
    totpDriftTolerance: 1, // +/- 1 step (30s)
    nonceTtlSeconds: 60,
    hmacAlgorithm: 'sha256',
  },

  iot: {
    commandTimeoutMs: 3000,
    maxReconciliationRetries: 3,
    pulseDurationMs: 350,
    heartbeatIntervalMs: 15000,
  },

  domains: {
    foodMaxHoldMinutes: 120,
    coldTargetTempRange: { min: 2.0, max: 6.0 },
  }
} as const;
