// 再現できる乱数（sfc32）。状態を保存して、ブラウザを閉じても続きから同じ流れで再開できる。
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export class Rng {
  constructor(seedOrState) {
    if (Array.isArray(seedOrState)) this.s = seedOrState.slice();
    else {
      const h = xmur3(String(seedOrState));
      this.s = [h(), h(), h(), h()];
      for (let i = 0; i < 15; i++) this.next();
    }
  }
  state() { return this.s.slice(); }
  next() {
    let [a, b, c, d] = this.s;
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    this.s = [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    return (r >>> 0) / 4294967296;
  }
  chance(p) { return this.next() < p; }
  int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  range(lo, hi) { return lo + this.next() * (hi - lo); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  normal(mu = 0, sd = 1) {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // [[item, weight], ...] または weights 関数
  weighted(pairs) {
    let total = 0;
    for (const p of pairs) total += Math.max(0, p[1]);
    let r = this.next() * total;
    for (const p of pairs) {
      r -= Math.max(0, p[1]);
      if (r < 0) return p[0];
    }
    return pairs[pairs.length - 1][0];
  }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export function newSeed() {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) {
    const a = new Uint32Array(2);
    c.getRandomValues(a);
    return a[0].toString(36) + a[1].toString(36);
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
