/* 数学ファクトリー：相棒の絵をその場でSVGで描く（オリジナルのキャラクター） */
(function (MF) {
  'use strict';
  const Art = {};
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r + amt * 255))); g = Math.max(0, Math.min(255, Math.round(g + amt * 255))); b = Math.max(0, Math.min(255, Math.round(b + amt * 255)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  Art.shade = shade;
  let uid = 0;
  /** opts: {size, silhouette, skin:{color, acc}, mood} */
  Art.svg = function (spId, opts) {
    opts = opts || {};
    const sp = MF.Pals.byId[spId];
    if (!sp) return '';
    const L = sp.look;
    const sil = !!opts.silhouette;
    const skin = opts.skin || {};
    const col = sil ? '#2a2f37' : (skin.color || L.color);
    const dark = sil ? '#22262d' : shade(col, -0.22);
    const belly = sil ? '#2a2f37' : (skin.belly || L.belly);
    const id = 'pg' + (++uid);
    const size = opts.size || 96;
    const p = [];
    p.push('<defs><radialGradient id="' + id + '" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="' + (sil ? col : shade(col, 0.15)) + '"/><stop offset="1" stop-color="' + col + '"/></radialGradient></defs>');
    const fill = 'url(#' + id + ')';
    // 背中側のパーツ
    if (L.extra === 'tail') p.push('<path d="M78 70 C98 62 96 40 84 36 C90 50 84 60 72 62 Z" fill="' + dark + '"/><path d="M90 40 C94 46 92 52 88 54" stroke="' + (sil ? dark : '#fff') + '" stroke-width="3" fill="none" stroke-linecap="round"/>');
    if (L.extra === 'spiral') p.push('<circle cx="70" cy="50" r="22" fill="' + dark + '"/><path d="M70 50 m0 -3 a3 3 0 1 1 -3 3 a7 7 0 1 1 7 7 a12 12 0 1 1 -12 -12 a17 17 0 1 1 17 17" stroke="' + (sil ? col : shade(col, 0.25)) + '" stroke-width="3" fill="none"/>');
    if (L.extra === 'wings') p.push('<path d="M20 58 C2 46 4 30 14 34 C18 44 22 50 28 54 Z" fill="' + (sil ? dark : shade(col, 0.25)) + '"/><path d="M80 58 C98 46 96 30 86 34 C82 44 78 50 72 54 Z" fill="' + (sil ? dark : shade(col, 0.25)) + '"/>');
    if (L.extra === 'tentacles') for (let i = 0; i < 4; i++) p.push('<path d="M' + (32 + i * 12) + ' 82 q-4 8 0 14" stroke="' + dark + '" stroke-width="4" fill="none" stroke-linecap="round"/>');
    // 耳
    if (L.ears === 'cat') p.push('<path d="M26 40 L30 14 L46 32 Z" fill="' + dark + '"/><path d="M74 40 L70 14 L54 32 Z" fill="' + dark + '"/>' + (sil ? '' : '<path d="M31 34 L32 22 L40 31 Z" fill="#ffb3c1"/><path d="M69 34 L68 22 L60 31 Z" fill="#ffb3c1"/>'));
    if (L.ears === 'round') p.push('<circle cx="28" cy="36" r="10" fill="' + dark + '"/><circle cx="72" cy="36" r="10" fill="' + dark + '"/>');
    if (L.ears === 'bunny') p.push('<ellipse cx="38" cy="18" rx="7" ry="20" fill="' + dark + '" transform="rotate(-12 38 18)"/><ellipse cx="62" cy="18" rx="7" ry="20" fill="' + dark + '" transform="rotate(12 62 18)"/>');
    if (L.extra === 'horns') p.push('<path d="M32 36 C22 24 24 12 30 8 C32 18 38 26 42 32 Z" fill="#f2e6c8"/><path d="M68 36 C78 24 76 12 70 8 C68 18 62 26 58 32 Z" fill="#f2e6c8"/>');
    // からだ
    const shapes = {
      round: '<ellipse cx="50" cy="60" rx="32" ry="30" fill="' + fill + '"/>',
      tall: '<rect x="23" y="26" width="54" height="66" rx="27" fill="' + fill + '"/>',
      wide: '<ellipse cx="50" cy="64" rx="38" ry="26" fill="' + fill + '"/>',
      cube: '<rect x="20" y="30" width="60" height="58" rx="12" fill="' + fill + '"/>',
      drop: '<path d="M50 20 C68 38 84 50 84 66 A34 28 0 0 1 16 66 C16 50 32 38 50 20 Z" fill="' + fill + '"/>',
    };
    // 足
    p.push('<ellipse cx="38" cy="90" rx="9" ry="5" fill="' + dark + '"/><ellipse cx="62" cy="90" rx="9" ry="5" fill="' + dark + '"/>');
    p.push(shapes[L.body] || shapes.round);
    if (L.extra === 'claws') p.push('<path d="M22 74 l-6 4 M22 78 l-6 2 M78 74 l6 4 M78 78 l6 2" stroke="' + dark + '" stroke-width="3" stroke-linecap="round"/>');
    if (!sil) {
      p.push('<ellipse cx="50" cy="72" rx="18" ry="13" fill="' + belly + '"/>');
      p.push('<text x="50" y="77" text-anchor="middle" font-size="' + (L.sym.length > 2 ? 9 : 13) + '" font-family="serif" font-weight="700" fill="' + shade(col, -0.35) + '">' + L.sym + '</text>');
      // 顔
      const blink = opts.mood === 'sleep';
      if (blink) p.push('<path d="M32 54 q6 4 12 0 M56 54 q6 4 12 0" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/>');
      else p.push('<ellipse cx="38" cy="53" rx="7.5" ry="8.5" fill="#fff"/><ellipse cx="62" cy="53" rx="7.5" ry="8.5" fill="#fff"/><circle cx="39" cy="55" r="4.6" fill="#1b1d22"/><circle cx="61" cy="55" r="4.6" fill="#1b1d22"/><circle cx="40.6" cy="53" r="1.6" fill="#fff"/><circle cx="62.6" cy="53" r="1.6" fill="#fff"/>');
      p.push('<ellipse cx="28" cy="63" rx="5" ry="3" fill="#ff8fa3" opacity=".55"/><ellipse cx="72" cy="63" rx="5" ry="3" fill="#ff8fa3" opacity=".55"/>');
      p.push('<path d="M45 62 q5 5 10 0" stroke="#1b1d22" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
      if (L.extra === 'dots') p.push('<circle cx="28" cy="40" r="3" fill="' + dark + '"/><circle cx="72" cy="40" r="3" fill="' + dark + '"/><circle cx="72" cy="84" r="3" fill="' + dark + '"/>');
    }
    // 頭の上
    if (L.extra === 'arc') p.push('<path d="M30 22 Q50 -6 70 22" stroke="' + (sil ? dark : '#ffb02e') + '" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="50" cy="8" r="3" fill="' + (sil ? dark : '#ffb02e') + '"/>');
    if (L.extra === 'peak') p.push('<path d="M34 28 L50 4 L66 28 Z" fill="' + (sil ? dark : '#e8edf2') + '"/><path d="M44 13 L50 4 L56 13 Z" fill="' + (sil ? dark : '#fff') + '"/>');
    if (L.extra === 'flame') p.push('<path d="M50 4 C60 16 64 22 58 30 C56 24 52 22 50 18 C48 22 44 24 42 30 C36 22 40 14 50 4 Z" fill="' + (sil ? dark : '#ffd23d') + '"/>');
    if (L.extra === 'antenna') p.push('<path d="M44 30 L38 10 M56 30 L62 10" stroke="' + dark + '" stroke-width="3"/><circle cx="38" cy="9" r="4.5" fill="' + (sil ? dark : '#ffd23d') + '"/><circle cx="62" cy="9" r="4.5" fill="' + (sil ? dark : '#ffd23d') + '"/>');
    if (L.extra === 'wave') p.push('<path d="M20 30 q7.5 -10 15 0 t15 0 t15 0 t15 0" stroke="' + (sil ? dark : '#bfe3ff') + '" stroke-width="4" fill="none" stroke-linecap="round"/>');
    if (L.extra === 'crown') p.push('<path d="M34 26 L36 10 L44 20 L50 6 L56 20 L64 10 L66 26 Z" fill="' + (sil ? dark : '#ffd23d') + '" stroke="' + (sil ? dark : '#c98412') + '" stroke-width="1.5"/>');
    if (L.extra === 'halo') p.push('<ellipse cx="50" cy="12" rx="16" ry="5" stroke="' + (sil ? dark : '#fff6a8') + '" stroke-width="3.5" fill="none"/>');
    // 着せかえ（ガチャのスキン）
    if (!sil && skin.acc === 'glasses') p.push('<circle cx="38" cy="54" r="10" stroke="#222" stroke-width="2.5" fill="rgba(160,220,255,.25)"/><circle cx="62" cy="54" r="10" stroke="#222" stroke-width="2.5" fill="rgba(160,220,255,.25)"/><path d="M48 54 h4" stroke="#222" stroke-width="2.5"/>');
    if (!sil && skin.acc === 'hat') p.push('<path d="M28 30 h44 l-6 -4 h-32 z" fill="#2b2f8a"/><rect x="36" y="8" width="28" height="20" rx="3" fill="#2b2f8a"/><rect x="36" y="22" width="28" height="4" fill="#ffb02e"/>');
    if (!sil && skin.acc === 'scarf') p.push('<path d="M24 66 q26 12 52 0 l0 7 q-26 12 -52 0 z" fill="#ff5d5d"/><path d="M66 72 l6 16 l-8 -2 z" fill="#ff5d5d"/>');
    if (!sil && skin.acc === 'bow') p.push('<path d="M62 24 l12 -8 l0 16 z M62 24 l-12 -8 l0 16 z" fill="#ff7ab8"/><circle cx="62" cy="24" r="3.5" fill="#ff4f9a"/>');
    if (!sil && skin.acc === 'helmet') p.push('<path d="M22 44 A28 26 0 0 1 78 44 Z" fill="#ffb02e" stroke="#7a4f08" stroke-width="2"/><rect x="44" y="18" width="12" height="6" fill="#fff"/>');
    return '<svg class="pal-svg" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" role="img" aria-label="' + (sil ? '？？？' : sp.name) + '">' + p.join('') + '</svg>';
  };
  Art.egg = function (topic, size, crack) {
    const T = MF.Questions.TOPICS[topic] || { color: '#ccc' };
    const c = T.color;
    return '<svg class="egg-svg" viewBox="0 0 100 100" width="' + (size || 64) + '" height="' + (size || 64) + '"><ellipse cx="50" cy="56" rx="30" ry="38" fill="#f4efe6"/><path d="M22 52 q14 -10 28 0 t28 0" stroke="' + c + '" stroke-width="7" fill="none"/><circle cx="38" cy="72" r="5" fill="' + c + '"/><circle cx="62" cy="76" r="4" fill="' + c + '"/><circle cx="56" cy="30" r="4" fill="' + c + '"/>' +
      (crack ? '<path d="M30 46 l8 6 l6 -8 l8 8 l6 -7 l8 6 l6 -5" stroke="#5a4a30" stroke-width="2.5" fill="none"/>' : '') + '<ellipse cx="40" cy="36" rx="7" ry="11" fill="#fff" opacity=".6"/></svg>';
  };
  MF.PalArt = Art;
})(globalThis.MF = globalThis.MF || {});
