// 振動。navigator.vibrate が無い端末（iOS Safari など）では何もしない
import { CONFIG } from './config.js';
import { settings } from './storage.js';

const can = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function buzz(kind) {
  if (!can || !settings().vibe) return;
  const p = typeof kind === 'string' ? CONFIG.haptics[kind] : kind;
  if (p == null) return;
  try {
    navigator.vibrate(p);
  } catch {
    /* 権限やユーザー操作前の呼び出しで失敗しても無視 */
  }
}
