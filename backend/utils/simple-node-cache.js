/**
 * Simple in-memory cache implementation matching node-cache API
 * Used as a fallback when node-cache package cannot be installed
 */

class SimpleNodeCache {
  constructor(options = {}) {
    this.stdTTL = options.stdTTL || 600; // 10 minutes default
    this.useClones = options.useClones || false;
    this.deleteOnExpire = options.deleteOnExpire !== false;
    
    this._cache = new Map();
    this._ttls = new Map();
    this._stats = { hits: 0, misses: 0 };
    
    // Start cleanup interval
    this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
    this._cleanupInterval.unref();
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this._ttls.entries()) {
      if (now > expiry) {
        this._cache.delete(key);
        this._ttls.delete(key);
      }
    }
  }

  set(key, value, ttl = this.stdTTL) {
    if (this.useClones) {
      value = JSON.parse(JSON.stringify(value));
    }
    this._cache.set(key, value);
    this._ttls.set(key, Date.now() + (ttl * 1000));
    return true;
  }

  get(key) {
    const expiry = this._ttls.get(key);
    if (!expiry || Date.now() > expiry) {
      this._cache.delete(key);
      this._ttls.delete(key);
      this._stats.misses++;
      return undefined;
    }
    this._stats.hits++;
    const value = this._cache.get(key);
    return this.useClones ? JSON.parse(JSON.stringify(value)) : value;
  }

  has(key) {
    const expiry = this._ttls.get(key);
    if (!expiry || Date.now() > expiry) {
      this._cache.delete(key);
      this._ttls.delete(key);
      return false;
    }
    return true;
  }

  delete(key) {
    const existed = this._cache.has(key);
    this._cache.delete(key);
    this._ttls.delete(key);
    return existed;
  }

  flushAll() {
    this._cache.clear();
    this._ttls.clear();
    this._stats = { hits: 0, misses: 0 };
  }

  keys() {
    this._cleanup();
    return Array.from(this._cache.keys());
  }

  hits() {
    return this._stats.hits;
  }

  misses() {
    return this._stats.misses;
  }

  hitRate() {
    const total = this._stats.hits + this._stats.misses;
    return total === 0 ? 0 : this._stats.hits / total;
  }

  close() {
    clearInterval(this._cleanupInterval);
    this.flushAll();
  }
}

export default SimpleNodeCache;
export { SimpleNodeCache };