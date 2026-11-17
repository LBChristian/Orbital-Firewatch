/**
 * Small bounded in-memory cache with TTL (hackathon scale; no Redis).
 * Entries past their TTL are kept as "stale" (up to maxStaleSeconds) so they can be served
 * as CACHED when the upstream fails. Oldest entries are evicted beyond maxEntries.
 */
export interface CacheEntry<T> {
  value: T;
  storedAtMs: number;
}

export class TtlCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  constructor(
    private ttlSeconds: number,
    private maxEntries = 64,
    private maxStaleSeconds = 24 * 3600,
  ) {}

  set(key: string, value: T, nowMs: number): void {
    this.map.delete(key);
    this.map.set(key, { value, storedAtMs: nowMs });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  /** Returns the entry and whether it is still fresh; undefined if missing or too stale. */
  get(key: string, nowMs: number): { entry: CacheEntry<T>; fresh: boolean; ageSeconds: number } | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    const ageSeconds = (nowMs - entry.storedAtMs) / 1000;
    if (ageSeconds > this.maxStaleSeconds) {
      this.map.delete(key);
      return undefined;
    }
    return { entry, fresh: ageSeconds <= this.ttlSeconds, ageSeconds };
  }

  get size(): number {
    return this.map.size;
  }

  newest(): CacheEntry<T> | undefined {
    let newest: CacheEntry<T> | undefined;
    for (const e of this.map.values()) if (!newest || e.storedAtMs > newest.storedAtMs) newest = e;
    return newest;
  }
}
