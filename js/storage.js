// localStorage への保存（プライベートモード等で使えなくても落ちない）
import { CONFIG } from './config.js';

const KEY = 'girigiri.save.v1';

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

function defaults() {
  return {
    best: 0,
    coins: 0,
    plays: 0,
    skin: 'circle',
    unlocked: ['circle'],
    settings: {
      effects: !prefersReducedMotion(),
      sound: true,
      vibration: true,
      sensitivity: CONFIG.input.sensitivity,
    },
  };
}

export const storage = {
  data: defaults(),

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const d = defaults();
        this.data = { ...d, ...saved, settings: { ...d.settings, ...(saved.settings || {}) } };
        if (!Array.isArray(this.data.unlocked)) this.data.unlocked = ['circle'];
      }
    } catch {
      this.data = defaults();
    }
    return this.data;
  },

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* 保存不可でも続行 */ }
  },

  reset() {
    this.data = defaults();
    this.save();
  },
};
