// 振動。navigator.vibrate が無い端末（iOS Safari など）では何もしない。
export const haptics = {
  enabled: true,
  supported: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',

  pulse(pattern) {
    if (!this.enabled || !this.supported) return;
    try { navigator.vibrate(pattern); } catch { /* 無視 */ }
  },
};
