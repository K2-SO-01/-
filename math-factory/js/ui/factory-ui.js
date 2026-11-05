/* 数学ファクトリー：工場画面（ステップ1：設備購入） */
(function (MF) {
  'use strict';
  const G = MF.Game, F = MF.Factory, UI = MF.UI, Qs = MF.Questions;
  const h = UI.h;
  UI.screen('factory', {
    title: '工場', icon: '🏭', nav: 'main', navOrder: 2,
    render(root, s) {
      root.appendChild(h('h2', { class: 'screen-title' }, '工場：採掘機を買う'));
      root.appendChild(h('p', { class: 'muted' }, '問題を解いて集めた資源で採掘機を建てよう。採掘機は自動で鉱石を掘り続ける。'));
      const list = h('div', { class: 'shop-list' });
      F.ORES.forEach((ore) => {
        const t = Object.values(Qs.TOPICS).find((x) => x.resource === ore);
        const n = s.factory.miners[ore] || 0;
        const cost = F.minerCost(s, ore);
        list.appendChild(h('div', { class: 'card shop-item' },
          h('div', { class: 'shop-head' }, UI.itemChip(ore, null), h('span', { class: 'muted small' }, '（' + t.name + 'で入手）')),
          h('div', { class: 'small' }, '所有 ' + n + ' 台・毎分 ' + (n * F.MINER_RATE * 60).toFixed(1) + ' 個'),
          h('div', { class: 'cost' }, UI.costNodes(cost)),
          h('button', { class: 'btn primary', disabled: !G.has(s, cost), onclick: () => { if (F.buyMiner(s, ore)) { UI.toast(G.ITEMS[ore].name + 'の採掘機を建てた！', 'good'); UI.rerender(); } } }, '建てる')));
      });
      root.appendChild(list);
    },
  });
})(globalThis.MF = globalThis.MF || {});
