/**
 * LOCKGO — Single-Use Nonce Burner (Anti-Replay Attack Guard)
 */

import { redis } from '../../core/redis';
import { config } from '../../core/config';
import { TokenAlreadyConsumedError } from '../../core/errors';

export class NonceBurner {
  /**
   * Atomically burns a nonce in Redis with SETNX.
   * If the nonce already exists, throws TokenAlreadyConsumedError.
   */
  public async burnNonce(nonce: string): Promise<void> {
    const key = `nonce:burned:${nonce}`;
    const consumed = await redis.setnx(key, '1', config.security.nonceTtlSeconds);
    
    if (!consumed) {
      throw new TokenAlreadyConsumedError(nonce);
    }
  }

  public async isNonceBurned(nonce: string): Promise<boolean> {
    const key = `nonce:burned:${nonce}`;
    const val = await redis.get(key);
    return val !== null;
  }
}

export const nonceBurner = new NonceBurner();
