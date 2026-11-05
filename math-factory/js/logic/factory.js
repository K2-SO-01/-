/* 数学ファクトリー：工場（ステップ1：かんたんな設備購入版） */
(function (MF) {
  'use strict';
  const G = MF.Game;
  const F = {};
  F.ORES = ['iron', 'copper', 'coal', 'stone', 'uranium', 'silicon', 'oil'];
  F.MINER_BASE = { iron: 6, stone: 4 };
  F.MINER_RATE = 1 / 8; // 1台あたり 8秒に1個

  F.minerCost = function (s, ore) {
    const n = s.factory.miners[ore] || 0;
    const k = Math.pow(1.35, n);
    return { iron: Math.ceil(F.MINER_BASE.iron * k), stone: Math.ceil(F.MINER_BASE.stone * k) };
  };
  F.buyMiner = function (s, ore) {
    if (F.ORES.indexOf(ore) < 0) return false;
    const cost = F.minerCost(s, ore);
    if (!G.pay(s, cost)) return false;
    s.factory.miners[ore] = (s.factory.miners[ore] || 0) + 1;
    G.emit(s, 'build', { type: 'miner', ore });
    return true;
  };
  F.rates = function (s) {
    const out = {};
    for (const o of F.ORES) out[o] = (s.factory.miners[o] || 0) * F.MINER_RATE;
    return out;
  };

  G.register({
    id: 'factory',
    init(s) { s.factory = { miners: {}, acc: {} }; },
    tick(s, dt) {
      const r = F.rates(s);
      for (const o of F.ORES) {
        if (!r[o]) continue;
        s.factory.acc[o] = (s.factory.acc[o] || 0) + r[o] * dt;
        const whole = Math.floor(s.factory.acc[o]);
        if (whole > 0) { s.factory.acc[o] -= whole; G.add(s, o, whole); }
      }
    },
  });
  MF.Factory = F;
})(globalThis.MF = globalThis.MF || {});
