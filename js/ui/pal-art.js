/* 数学ファクトリー：相棒のドット絵（16×16）。体の形・耳・飾り・着せかえの部品を組み合わせて描く（オリジナルのキャラクター） */
(function (MF) {
  'use strict';
  const Art = {};
  const Spr = MF.Sprite;
  Art.shade = Spr.shade;

  // 体の形。y0：いちばん上の行、eye：[左目の列, 右目の列, 目の行]、belly：おなかの行、ear：[左耳の列, 右耳の列]
  const SHAPES = {
    round: { y0: 4, eye: [5, 10, 8], belly: 11, ear: [3, 12], feet: true, mask: `
.....######.....
...##########...
..############..
.##############.
.##############.
.##############.
.##############.
.##############.
..############..
...##########...
.....######.....` },
    tall: { y0: 3, eye: [5, 10, 6], belly: 10, ear: [4, 11], feet: true, mask: `
.....######.....
....########....
...##########...
...##########...
...##########...
...##########...
...##########...
...##########...
...##########...
...##########...
...##########...
....########....` },
    wide: { y0: 6, eye: [4, 11, 9], belly: 11, ear: [3, 12], feet: true, mask: `
.....######.....
...##########...
.##############.
################
################
################
################
.##############.
...##########...` },
    cube: { y0: 3, eye: [5, 10, 7], belly: 10, ear: [2, 13], feet: true, mask: `
..############..
.##############.
.##############.
.##############.
.##############.
.##############.
.##############.
.##############.
.##############.
.##############.
.##############.
..############..` },
    drop: { y0: 3, eye: [5, 10, 9], belly: 11, ear: [4, 11], feet: false, mask: `
.......##.......
......####......
.....######.....
....########....
...##########...
..############..
.##############.
.##############.
.##############.
.##############.
.##############.
..############..
....########....` },
  };

  // 頭の上の飾り（体のてっぺんの3行上から）。列は 0〜15 の絶対位置
  const TOP = {
    arc:     ['......yyyy......', '.....y....y.....', '....y......y....'],
    peak:    ['.......ww.......', '......wwww......', '.....wwwwww.....'],
    flame:   ['........y.......', '.......yyy......', '......yooy......'],
    antenna: ['.....y....y.....', '.....d....d.....', '.....d....d.....'],
    wave:    ['................', '....a.a.a.a.....', '.....a.a.a.a....'],
    crown:   ['....y..yy..y....', '....yy.yy.yy....', '....yyyyyyyy....'],
    halo:    ['......yyyy......', '....yy....yy....', '......yyyy......'],
  };

  function put(g, x, y, c) { if (y >= 0 && y < 16 && x >= 0 && x < 16) g[y][x] = c; }
  function layer(g, rows, y0, onlyEmpty) {
    rows.forEach((r, i) => { for (let x = 0; x < 16; x++) if (r[x] && r[x] !== '.' && (!onlyEmpty || g[y0 + i] && g[y0 + i][x] === '.')) put(g, x, y0 + i, r[x]); });
  }

  /** 相棒の絵の行とパレット */
  Art.sprite = function (spId, opts) {
    opts = opts || {};
    const sp = MF.Pals.byId[spId];
    if (!sp) return null;
    const L = sp.look, S = SHAPES[L.body] || SHAPES.round, skin = opts.skin || {};
    const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
    const mask = S.mask.split('\n').filter((l) => l.trim());
    const inBody = (x, y) => { const r = mask[y - S.y0]; return !!(r && r[x] === '#'); };
    const t = S.y0, [exL, exR, ey] = S.eye, [eaL, eaR] = S.ear;
    // 背中側
    if (L.extra === 'spiral') layer(g, ['..ddddd', '.dd...dd', '.d..h..d', '.d.hhh.d', '.d..h..d', '.dd...dd', '..ddddd'].map((r) => '........' + r), t - 2);
    if (L.extra === 'tail') [[13, ey + 3], [14, ey + 2], [15, ey + 1], [15, ey], [14, ey - 1]].forEach(([x, y], i) => put(g, x, y, i >= 3 ? 'w' : 'd'));
    // 耳・角
    if (L.ears === 'cat') { [[eaL, t - 3], [eaL, t - 2], [eaL + 1, t - 2], [eaL, t - 1], [eaL + 1, t - 1], [eaL + 2, t - 1]].forEach(([x, y]) => put(g, x, y, 'd')); [[eaR, t - 3], [eaR, t - 2], [eaR - 1, t - 2], [eaR, t - 1], [eaR - 1, t - 1], [eaR - 2, t - 1]].forEach(([x, y]) => put(g, x, y, 'd')); put(g, eaL + 1, t - 1, 'p'); put(g, eaR - 1, t - 1, 'p'); }
    if (L.ears === 'round') [[eaL, t - 2], [eaL + 1, t - 2], [eaL, t - 1], [eaL + 1, t - 1], [eaR, t - 2], [eaR - 1, t - 2], [eaR, t - 1], [eaR - 1, t - 1]].forEach(([x, y]) => put(g, x, y, 'd'));
    if (L.ears === 'bunny') for (let y = t - 4; y < t; y++) { put(g, eaL + 1, y, 'd'); put(g, eaL + 2, y, y > t - 4 ? 'p' : 'd'); put(g, eaR - 1, y, 'd'); put(g, eaR - 2, y, y > t - 4 ? 'p' : 'd'); }
    if (L.extra === 'horns') [[eaL, t - 3], [eaL, t - 2], [eaL + 1, t - 2], [eaL + 1, t - 1], [eaR, t - 3], [eaR, t - 2], [eaR - 1, t - 2], [eaR - 1, t - 1]].forEach(([x, y]) => put(g, x, y, 'c'));
    // 足
    if (S.feet && L.extra !== 'tentacles') [4, 5, 10, 11].forEach((x) => put(g, x, 15, 'd'));
    // からだ（下のふちは影、左上に光）
    let hl = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (inBody(x, y)) put(g, x, y, inBody(x, y + 1) ? 'b' : 'd');
    for (let x = 0; x < 16 && hl < 2; x++) if (inBody(x, t + 1) && inBody(x - 1, t + 1)) { put(g, x, t + 1, 'h'); hl++; }
    if (L.extra === 'tentacles') for (let x = 0; x < 16; x++) if (inBody(x, 15)) put(g, x, 15, x % 2 ? 'd' : '.');
    if (L.extra === 'claws') [[0, ey + 2], [0, ey + 3], [1, ey + 3], [15, ey + 2], [15, ey + 3], [14, ey + 3]].forEach(([x, y]) => put(g, x, y, 'w'));
    if (L.extra === 'dots') [[4, t + 2], [11, t + 2], [11, ey + 4], [4, ey + 4]].forEach(([x, y]) => { if (inBody(x, y)) put(g, x, y, 'd'); });
    if (L.extra === 'wings') [[0, ey - 1], [0, ey], [1, ey], [0, ey + 1], [1, ey + 1], [15, ey - 1], [15, ey], [14, ey], [15, ey + 1], [14, ey + 1]].forEach(([x, y]) => put(g, x, y, 'h'));
    // おなか・顔
    if (!opts.silhouette) {
      const b = S.belly;
      [[6, 9, b], [5, 10, b + 1], [6, 9, b + 2]].forEach(([a, z, y]) => { for (let x = a; x <= z; x++) if (inBody(x, y) && inBody(x, y + 1)) put(g, x, y, 'l'); });
      if (opts.mood === 'sleep') { put(g, exL - 1, ey + 1, 'k'); put(g, exL, ey + 1, 'k'); put(g, exR, ey + 1, 'k'); put(g, exR + 1, ey + 1, 'k'); }
      else { put(g, exL, ey, 'k'); put(g, exL, ey + 1, 'k'); put(g, exR, ey, 'k'); put(g, exR, ey + 1, 'k'); }
      put(g, exL - 1, ey + 2, 'p'); put(g, exR + 1, ey + 2, 'p');
      put(g, 7, ey + 2, 'k'); put(g, 8, ey + 2, 'k');
    }
    // 頭の上
    if (TOP[L.extra]) layer(g, TOP[L.extra], t - 3);
    // 着せかえ
    if (!opts.silhouette) {
      if (skin.acc === 'glasses') { [exL, exR].forEach((ex) => { for (let x = ex - 1; x <= ex + 1; x++) for (let y = ey; y <= ey + 1; y++) put(g, x, y, x === ex ? 'k' : 'a'); }); for (let x = exL + 2; x <= exR - 2; x++) put(g, x, ey, 'k'); }
      if (skin.acc === 'hat') layer(g, ['.....nnnnnn.....', '.....yyyyyy.....', '...nnnnnnnnnn...'], t - 3);
      if (skin.acc === 'scarf') { for (let x = 0; x < 16; x++) if (inBody(x, ey + 3)) put(g, x, ey + 3, 'r'); put(g, 11, ey + 4, 'r'); put(g, 11, ey + 5, 'r'); }
      if (skin.acc === 'bow') layer(g, ['..........p.p...', '..........ppp...'], t - 2);
      if (skin.acc === 'helmet') { layer(g, ['......oooo......'], t - 1); for (let y = t; y <= t + 1; y++) for (let x = 0; x < 16; x++) if (inBody(x, y)) put(g, x, y, 'o'); put(g, 7, t, 'w'); }
    }
    const col = skin.color || L.color;
    const pal = opts.silhouette
      ? { b: '#2b4214', d: '#223610', h: '#2b4214', l: '#2b4214', k: '#2b4214', p: '#2b4214', w: '#223610', c: '#223610', y: '#223610', o: '#223610', a: '#223610' }
      : { b: col, d: Spr.shade(col, -0.24), h: Spr.shade(col, 0.2), l: skin.belly || L.belly, k: '#14110f', p: '#ff8fa3', w: '#ffffff', c: '#f2e6c8', y: '#ffd23b', o: '#ff8a2e', a: '#bfe3ff', n: '#2b2f8a', r: '#ff5a3c' };
    return { rows: g.map((r) => r.join('')), pal };
  };
  /** opts: {size, silhouette, skin:{color, acc}, mood} */
  Art.svg = function (spId, opts) {
    opts = opts || {};
    const sp = MF.Pals.byId[spId];
    const s = Art.sprite(spId, opts);
    if (!s) return '';
    return Spr.svg(s.rows, s.pal, opts.size || 96, 'pal-svg', opts.silhouette ? '？？？' : sp.name);
  };
  Art.egg = function (topic, size, crack) {
    const T = MF.Questions.TOPICS[topic] || { color: '#b6ff3b' };
    const e = Spr.egg(T.color, crack);
    return Spr.svg(e.rows, e.pal, size || 64, 'egg-svg');
  };
  MF.PalArt = Art;
})(globalThis.MF = globalThis.MF || {});
