/**
 * LOCKGO — Redis Layer (Simulating Redis Cluster, Redlock Distributed Locking, SETNX, and Lua Scripts)
 */

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class RedisClient {
  private store = new Map<string, CacheEntry>();

  public reset(): void {
    this.store.clear();
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * SET with TTL
   */
  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await new Promise(resolve => setImmediate(resolve));
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity,
    });
  }

  /**
   * SETNX with TTL (Atomic Set If Not Exists)
   */
  public async setnx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    await new Promise(resolve => setImmediate(resolve));
    const existing = this.store.get(key);
    if (existing && !this.isExpired(existing)) {
      return false; // Key already exists and is active
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return true;
  }

  public async get(key: string): Promise<string | null> {
    await new Promise(resolve => setImmediate(resolve));
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  public async del(key: string): Promise<number> {
    await new Promise(resolve => setImmediate(resolve));
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  public async delete(key: string): Promise<boolean> {
    await new Promise(resolve => setImmediate(resolve));
    return this.store.delete(key);
  }

  public async increment(key: string): Promise<number> {
    await new Promise(resolve => setImmediate(resolve));
    const entry = this.store.get(key);
    let currentVal = 0;
    let expiresAt = Infinity;

    if (entry && !this.isExpired(entry)) {
      currentVal = parseInt(entry.value, 10) || 0;
      expiresAt = entry.expiresAt;
    }

    const nextVal = currentVal + 1;
    this.store.set(key, {
      value: nextVal.toString(),
      expiresAt,
    });
    return nextVal;
  }

  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    await new Promise(resolve => setImmediate(resolve));
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) return false;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return true;
  }

  /**
   * Acquire Redlock Distributed Lock with simulated I/O yield
   */
  public async acquireLock(resource: string, lockValue: string, ttlMs: number): Promise<boolean> {
    await new Promise(resolve => setImmediate(resolve));
    const key = `lock:${resource}`;
    const existing = this.store.get(key);
    if (existing && !this.isExpired(existing)) {
      return false;
    }

    this.store.set(key, {
      value: lockValue,
      expiresAt: Date.now() + ttlMs,
    });
    return true;
  }

  /**
   * Release Redlock Distributed Lock atomically using simulated Lua script
   */
  public async releaseLock(resource: string, lockValue: string): Promise<boolean> {
    await new Promise(resolve => setImmediate(resolve));
    const key = `lock:${resource}`;
    const existing = this.store.get(key);
    if (!existing) return false;

    // Atomic compare and delete
    if (existing.value === lockValue) {
      this.store.delete(key);
      return true;
    }
    return false;
  }
}

export const redis = new RedisClient();
