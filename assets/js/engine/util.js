export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function yen(n, { sign = false } = {}) {
  if (n == null || !Number.isFinite(n)) return '—';
  const neg = n < 0; const a = Math.abs(n);
  let s;
  if (a >= 1e8) s = (a / 1e8).toFixed(a >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '億円';
  else if (a >= 1e4) s = Math.round(a / 1e4).toLocaleString('ja-JP') + '万円';
  else s = Math.round(a).toLocaleString('ja-JP') + '円';
  return (neg ? '−' : sign ? '+' : '') + s;
}
export const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
export const oneIn = (p) => {
  if (p <= 0) return '—';
  const n = 1 / p;
  if (n >= 100) return `約${Math.round(n).toLocaleString('ja-JP')}人に1人`;
  if (n >= 10) return `約${Math.round(n)}人に1人`;
  return `約${n.toFixed(1).replace(/\.0$/, '')}人に1人`;
};
export function fill(tpl, o) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (o[k] != null ? o[k] : ''));
}
export const fullName = (n) => `${n.sei} ${n.mei}`;
export const fullKana = (n) => `${n.seiKana || ''} ${n.meiKana || ''}`.trim();
