/* 数学ファクトリー：色つきのドット絵（キャラクター・敵・卵）
 * 絵は16×16の文字の行で書く。文字ごとに色を決めて（パレット）、SVGやキャンバスに描く。「.」は透明。 */
(function (MF) {
  'use strict';
  const Spr = {};
  MF.Sprite = Spr;

  /** 行の配列を、16×16 の行にそろえる（小さい絵は下の真ん中に置く） */
  Spr.grid = function (src, align) {
    const lines = (Array.isArray(src) ? src : src.split('\n')).filter((l) => l.trim());
    const w = Math.max(...lines.map((l) => l.length));
    const left = Math.floor((16 - w) / 2);
    const top = align === 'top' ? 0 : align === 'center' ? Math.floor((16 - lines.length) / 2) : 16 - lines.length;
    const rows = [];
    for (let y = 0; y < 16; y++) { const l = lines[y - top]; rows.push(l === undefined ? '.'.repeat(16) : ('.'.repeat(left) + l.padEnd(w, '.') + '.'.repeat(16)).slice(0, 16)); }
    return rows;
  };
  /** パレットつきの行を SVG にする */
  Spr.svg = function (rows, pal, size, cls, label) {
    const d = {};
    rows.forEach((r, y) => {
      let x = 0;
      while (x < r.length) {
        const c = r[x];
        if (c === '.' || !pal[c]) { x++; continue; }
        let e = x; while (e < r.length && r[e] === c) e++;
        d[c] = (d[c] || '') + 'M' + x + ' ' + y + 'h' + (e - x) + 'v1h' + (x - e) + 'z';
        x = e;
      }
    });
    const w = rows[0].length, hgt = rows.length;
    return '<svg class="' + (cls || 'spr') + '" viewBox="0 0 ' + w + ' ' + hgt + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges"' +
      (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true"') + '>' + Object.keys(d).map((c) => '<path d="' + d[c] + '" fill="' + pal[c] + '"/>').join('') + '</svg>';
  };
  /** キャンバスに描く */
  Spr.draw = function (ctx, rows, pal, x, y, size) {
    const k = size / rows.length;
    rows.forEach((r, yy) => { for (let xx = 0; xx < r.length; xx++) { const c = r[xx]; if (c === '.' || !pal[c]) continue; ctx.fillStyle = pal[c]; ctx.fillRect(Math.floor(x + xx * k), Math.floor(y + yy * k), Math.ceil(k), Math.ceil(k)); } });
  };
  /** 色を明るく/暗く */
  Spr.shade = function (hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
    return '#' + ((1 << 24) + (f((n >> 16) & 255) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
  };

  // ---------- 赤い異星生物（敵） ----------
  // r:体 d:影 l:おなか y:目 k:ひとみ w:きば
  const ENEMY = {
    grub: `
...rrrr.........
..rrrrrr........
.rryrryrr.......
.rrkrrkrrrrr....
.rrrrrrrrrrrrr..
.rrlllrrrrrrrdd.
.rrrrrrrrrrrdddd
..rrrrrrrrrrdddd
...rrrr.rrrr.dd.
...d..d.d..d....`,
    wing: `
d..............d
dd............dd
ddd...rrrr...ddd
dddd.rrrrrr.dddd
ddddrryrryrrdddd
.dddrrkrrkrrddd.
..ddrrrryrrrdd..
...drrrrkrrrd...
....rrrrrrrr....
.....rrrrrr.....
......r..r......`,
    frog: `
..rrr......rrr..
.rryrr....rryrr.
.rrkrr....rrkrr.
.rrrrrrrrrrrrrr.
rrrrrrrrrrrrrrrr
rrrrrrrrrrrrrrrr
rrkkkkkkkkkkkkrr
rrrrllllllllrrrr
rrrllllllllllrrr
.rrrllllllllrrr.
dd.rrrrrrrrrr.dd
ddd..........ddd`,
    beast: `
....d...d...d...
...dd..dd..dd...
..ddd.ddd.ddd...
.ddddddddddddd..
.rrrrrrrrrrrrrr.
rrryrryrryrryrrr
rrrkrrkrrkrrkrrr
rrrrrrrrrrrrrrrr
rrwrwrwrwrwrwrrr
rrrrrrrrrrrrrrrr
.rrrrrrrrrrrrrr.
.ddd..dd..dd.ddd
.ddd..dd..dd.ddd`,
    shell: `
.....dddddd.....
...ddrrrrrrdd...
..drrlrrrrrrrd..
.drrrrrdrrrrrrd.
.drrrrdrrdrrrrd.
ddrrrdrrrrdrrrdd
dddddddddddddddd
.rrryrrrrrryrrr.
.rrrkrrrrrrkrrr.
dd.rrrrrrrrrr.dd
ddd.d.d..d.d.ddd`,
    spore: `
......rrrr......
.....rryyrr.....
.ll..rrkkrr..ll.
.ll..rrrrrr..ll.
...rrrrrrrrrr...
..rrryrrrryrrr..
..rrrkrrrrkrrr..
.rrrrrrrrrrrrrr.
.rrrrryrryrrrrr.
.rrrrrkrrkrrrrr.
..rrrrrrrrrrrr..
...rrrr..rrrr...`,
    queen: `
..y..y....y..y..
..yy.yy..yy.yy..
..yyyyyyyyyyyy..
...rrrrrrrrrr...
..rrrrrrrrrrrr..
.rryrryrryrryrr.
.rrkrrkrrkrrkrr.
.rrrryrrrryrrrr.
.rrrrkrrrrkrrrr.
..rrrrrrrrrrrr..
..rwkwkwkwkwkr..
...rrrrrrrrrr...
.d.d.rrrrrr.d.d.
d..d..d..d..d..d
.d..d.d..d.d..d.`,
  };
  Spr.ENEMY = ENEMY;
  Spr.enemy = function (look, opts) {
    opts = opts || {};
    const rows = Spr.grid(ENEMY[look] || ENEMY.grub);
    const red = opts.boss ? '#ff3a4a' : opts.elite ? '#e0344e' : '#d6404f';
    const pal = { r: red, d: '#7a1426', l: '#ff8a8e', y: '#ffe14a', k: '#2a0008', w: '#fff3e0' };
    return { rows, pal };
  };

  // ---------- 卵 ----------
  // e:から s:分野の色のしま h:光 c:ひび
  const EGG = `
.....eeeeee.....
....eeeeeeee....
...eheeeeeeee...
..eeheeeeeeeee..
..eeeeeeeeeeee..
.eeeeeeeeeeeeee.
.ssseeesssseeess
.eessseeeeesssee
.eeeeeeeeeeeeee.
.eeeeeeeeeeeeee.
..eeeeeeeeeeee..
..eeeeeeeeeeee..
...eeeeeeeeee...
.....eeeeee.....`;
  const CRACK = `
................
................
................
................
................
................
................
................
...c...c...c....
..c.c.c.c.c.c...
.c...c...c...c..`;
  Spr.egg = function (color, crack) {
    const rows = Spr.grid(EGG).map((r) => r.replace(/s/g, 's'));
    if (crack) {
      const cr = Spr.grid(CRACK, 'top');
      for (let y = 0; y < 16; y++) rows[y] = rows[y].split('').map((c, x) => (cr[y][x] === 'c' && c !== '.' ? 'c' : c)).join('');
    }
    return { rows, pal: { e: '#f4efe6', h: '#ffffff', s: color || '#b6ff3b', c: '#5a4a30' } };
  };
})(globalThis.MF = globalThis.MF || {});
