import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createQQProactiveRateLimiter,
  isRateLimitError,
} from '../src/adapters/qqofficial/rate-limit.js';

describe('QQ proactive rate limiter', () => {
  it('detects rate limit errors', () => {
    assert.equal(isRateLimitError(new Error('HTTP 429 Too Many Requests')), true);
    assert.equal(isRateLimitError({ code: 429 }), true);
    assert.equal(isRateLimitError(new Error('频率超限')), true);
    assert.equal(isRateLimitError(new Error('ok')), false);
  });

  it('schedules under per-group + global buckets', async () => {
    const limiter = createQQProactiveRateLimiter({
      enabled: true,
      perGroupPerMin: 60,
      globalPerMin: 120,
      maxQueuePerGroup: 10,
      rateLimitBackoffMs: 10,
    });
    let n = 0;
    await limiter.schedule('group:g1', async () => {
      n += 1;
      return 'ok';
    });
    assert.equal(n, 1);
  });

  it('can be disabled', async () => {
    const limiter = createQQProactiveRateLimiter({ enabled: false });
    const v = await limiter.schedule('group:x', async () => 42);
    assert.equal(v, 42);
  });
});
