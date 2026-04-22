// Rate limiter in-memory para endpoints públicos.
// Por instância: zera ao reiniciar e não compartilha entre processos.
// Para produção multi-instância, migrar para Redis/Upstash.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  max: number;       // Máximo de requisições por janela
  windowMs: number;  // Janela em ms
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: options.max - 1,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (bucket.count >= options.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: options.max - bucket.count,
    resetAt: bucket.resetAt,
    retryAfterSeconds: 0,
  };
}

// Limpeza preguiçosa: 1 em cada 100 chamadas remove buckets expirados
let callCount = 0;
export function maybeCleanupBuckets() {
  callCount += 1;
  if (callCount % 100 !== 0) return;
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
