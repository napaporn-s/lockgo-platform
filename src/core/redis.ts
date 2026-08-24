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
   * SETNX with TTL (Atomic Set If Not Exists)
   */
  public async setnx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
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
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  public async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  /**
   * Acquire Redlock Distributed Lock
   */
  public async acquireLock(resource: string, lockValue: string, ttlMs: number): Promise<boolean> {
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
