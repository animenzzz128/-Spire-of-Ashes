// Deterministic seeded PRNG utilities (Mulberry32 + FNV-1a hash)

let activeRandomFn: () => number = Math.random;

export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededRng(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rand(): number {
  return activeRandomFn();
}

export function withSeededRng<T>(seed: string | undefined, fn: () => T): T {
  if (!seed) return fn();
  const prev = activeRandomFn;
  activeRandomFn = createSeededRng(seed);
  try {
    return fn();
  } finally {
    activeRandomFn = prev;
  }
}

export function generateRandomSeed(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ASH-${suffix}`;
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
