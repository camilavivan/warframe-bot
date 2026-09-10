/**
 * Token-bucket + small queue for QQ official *proactive* sends.
 * Passive event.reply is not routed through this limiter.
 */

export type QQRateLimitOptions = {
  enabled: boolean;
  /** Soft cap per group openid (proactive msgs / minute) */
  perGroupPerMin: number;
  /** Soft cap across the whole bot (proactive msgs / minute) */
  globalPerMin: number;
  /** Max waiting jobs per group before reject */
  maxQueuePerGroup: number;
  /** Extra wait after API rate-limit / 429-style errors */
  rateLimitBackoffMs: number;
};

const DEFAULTS: QQRateLimitOptions = {
  enabled: true,
  perGroupPerMin: 15,
  globalPerMin: 30,
  maxQueuePerGroup: 40,
  rateLimitBackoffMs: 3000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;
  private readonly capacity: number;
  private readonly refillPerMs: number;

  constructor(perMinute: number) {
    const rate = Math.max(1, perMinute);
    this.capacity = rate;
    this.tokens = rate;
    this.refillPerMs = rate / 60_000;
    this.lastRefillMs = Date.now();
  }

  private refill(now: number): void {
    const elapsed = Math.max(0, now - this.lastRefillMs);
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
    this.lastRefillMs = now;
  }

  /** Wait until a token is available, then consume one. */
  async take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.refill(now);
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const need = 1 - this.tokens;
      const waitMs = Math.max(20, Math.ceil(need / this.refillPerMs));
      await sleep(Math.min(waitMs, 2000));
    }
  }
}

export function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) return true;
  if (msg.includes('频率') || msg.includes('限流') || msg.includes('超限')) return true;
  const any = err as { code?: number | string; status?: number; ret?: number };
  const code = Number(any.code ?? any.status ?? any.ret);
  return code === 429 || code === 11264 || code === 11265 || code === 11269;
}

export class QQProactiveRateLimiter {
  private readonly opts: QQRateLimitOptions;
  private readonly global: TokenBucket;
  private readonly groups = new Map<string, TokenBucket>();
  private readonly queueSizes = new Map<string, number>();

  constructor(opts?: Partial<QQRateLimitOptions>) {
    this.opts = { ...DEFAULTS, ...opts };
    this.global = new TokenBucket(this.opts.globalPerMin);
  }

  get options(): Readonly<QQRateLimitOptions> {
    return this.opts;
  }

  private groupBucket(key: string): TokenBucket {
    let b = this.groups.get(key);
    if (!b) {
      b = new TokenBucket(this.opts.perGroupPerMin);
      this.groups.set(key, b);
    }
    return b;
  }

  /**
   * Run a proactive send under per-group + global buckets.
   * On rate-limit API errors, backoff once then rethrow (caller may log).
   */
  async schedule<T>(groupKey: string, fn: () => Promise<T>): Promise<T> {
    if (!this.opts.enabled) return fn();

    const q = this.queueSizes.get(groupKey) ?? 0;
    if (q >= this.opts.maxQueuePerGroup) {
      throw new Error(`QQ proactive send queue full for ${groupKey} (max ${this.opts.maxQueuePerGroup})`);
    }
    this.queueSizes.set(groupKey, q + 1);
    try {
      await this.groupBucket(groupKey).take();
      await this.global.take();
      try {
        return await fn();
      } catch (err) {
        if (isRateLimitError(err)) {
          await sleep(this.opts.rateLimitBackoffMs);
        }
        throw err;
      }
    } finally {
      const n = (this.queueSizes.get(groupKey) ?? 1) - 1;
      if (n <= 0) this.queueSizes.delete(groupKey);
      else this.queueSizes.set(groupKey, n);
    }
  }
}

export function createQQProactiveRateLimiter(
  opts?: Partial<QQRateLimitOptions>,
): QQProactiveRateLimiter {
  return new QQProactiveRateLimiter(opts);
}
