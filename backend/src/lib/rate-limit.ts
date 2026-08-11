// Rate limit em memória (janela fixa por chave, ex.: IP no login).
// Suficiente para dev local e instância única; em produção com múltiplas
// instâncias do Worker, trocar por Cloudflare Rate Limiting ou KV.

type Bucket = { count: number; resetAt: number };

export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return {
    /** true = permitido; false = estourou o limite */
    check(key: string): boolean {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      bucket.count += 1;
      return bucket.count <= limit;
    },
  };
}
