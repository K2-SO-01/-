// Pointer Events のドラッグ補助。指が要素の外に出ても追従（pointer capture）
export function draggable(el, { start, move, end, tap }, { threshold = 6 } = {}) {
  let id = null, sx = 0, sy = 0, st = 0, moved = false, lx = 0, ly = 0, lt = 0, vx = 0, vy = 0;

  const down = (e) => {
    if (id !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const r = start?.(e);
    if (r === false) return;
    id = e.pointerId;
    sx = lx = e.clientX;
    sy = ly = e.clientY;
    st = lt = performance.now();
    moved = false;
    vx = vy = 0;
    try { el.setPointerCapture(id); } catch { /* noop */ }
    e.preventDefault();
  };
  const mv = (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < threshold) return;
    moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - lt);
    vx = (e.clientX - lx) / dt;
    vy = (e.clientY - ly) / dt;
    lx = e.clientX; ly = e.clientY; lt = now;
    move?.(e, dx, dy);
    e.preventDefault();
  };
  const up = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved) {
      if (performance.now() - st < 500) tap?.(e);
      end?.(e, 0, 0, { vx: 0, vy: 0, tap: true });
    } else end?.(e, dx, dy, { vx, vy });
  };
  const cancel = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    end?.(e, e.clientX - sx, e.clientY - sy, { vx: 0, vy: 0, cancel: true });
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', mv);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('lostpointercapture', cancel);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', mv);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('lostpointercapture', cancel);
  };
}

// 吸着：整数付近（zone 以内）では整数に張り付き、間は連続的につなぐ
export function magnet(raw, zone) {
  const f = Math.floor(raw);
  const t = raw - f;
  if (t < zone) return f;
  if (t > 1 - zone) return f + 1;
  return f + (t - zone) / (1 - 2 * zone);
}

export function animate(from, to, ms, onFrame, onDone) {
  const t0 = performance.now();
  let raf = 0;
  const step = (now) => {
    const t = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - t, 3);
    onFrame(from + (to - from) * e);
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export const h = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
