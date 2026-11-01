// トップ → 出生地の抽選 → 出生届 → 人生 → 最期の記録
import { Rng, newSeed } from './engine/rng.js';
import { createLife, beginYear, continueYear, nextYear, answer, setFocus, setAuto, summarize, REFLECT_AGES, curYear, personAge, JOB } from './engine/life.js';
import { FOCUS, focusGroup, QUINTILE, EDU_LABEL, TEMPER } from './engine/content.js';
import { yen, oneIn, pct } from './engine/util.js';
import { TITLE, loadWorld, store, applyTheme, cycleTheme, themeLabel, mapSVG, markMap, hotlineHTML, esc, footerHTML } from './ui/common.js';
import { musicOn, musicOff, musicIsOn } from './ui/audio.js';
import { survivalChart, lifeMapHTML } from './ui/charts.js';
import { shareText, shareImage } from './ui/share.js';

const $ = (s, el = document) => el.querySelector(s);
const SPEEDS = [1, 2, 4, 8, 16];
const TURBO = 60;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let W = null;
let G = null; // { L, peers, settings, speed, paused, turbo, yearElapsed, yearSec, queue, shown }
let ticker = null, lastT = 0;
// 動作確認用（?debug を付けたときだけ）
if (new URLSearchParams(location.search).has('debug')) window.__G = () => G;

applyTheme();
loadWorld().then((w) => { W = w; initTop(); }).catch(() => {
  $('#t-lead').textContent = 'データを読み込めませんでした。ページを再読み込みしてください（ファイルを直接開いた場合は、ローカルサーバーで開いてください）。';
});

// ================================================================ 設定
function settings() {
  return {
    mode: 'births', pace: 60, gentle: false, music: false, realPref: '',
    ...store.get('settings', {}),
  };
}
function saveSettings(s) { store.set('settings', s); }

// ================================================================ トップ
function initTop() {
  const N = W.nat;
  const perSec = N.births2025 / (365 * 86400);
  const deathSec = N.deaths2025 / (365 * 86400);
  $('#t-lead').textContent = `日本では、およそ${Math.round(1 / perSec)}秒にひとり、赤ちゃんが生まれています（2025年の出生数 ${N.births2025.toLocaleString('ja-JP')}人）。そのひとりになって、一度きりの人生を最後まで生きてみます。どの県で、どんな家に生まれるかは選べません。あなたも、そうだったように。`;
  $('#t-perday').textContent = `約${Math.round(N.births2025 / 365).toLocaleString('ja-JP')}`;
  // カウンター（年間の出生数・死亡数を秒割り）
  const t0 = performance.now();
  const cb = $('#c-born'), cd = $('#c-died');
  const upd = () => {
    const s = (performance.now() - t0) / 1000;
    cb.textContent = Math.floor(s * perSec).toLocaleString('ja-JP');
    cd.textContent = Math.floor(s * deathSec).toLocaleString('ja-JP');
  };
  setInterval(upd, 500); upd();
  // 地図（出生の多さで濃淡）
  const svg = mapSVG(W, { label: '日本地図' });
  const max = Math.max(...W.prefs.map((p) => p.birthShare));
  for (const path of svg.querySelectorAll('path')) {
    const p = W.pref(path.dataset.pref);
    path.style.fill = `color-mix(in srgb, var(--accent) ${Math.round(12 + 70 * Math.sqrt(p.birthShare / max))}%, var(--map-fill))`;
  }
  $('#top-map').appendChild(svg);
  // 設定
  const s = settings();
  const sel = $('#real-pref');
  for (const p of W.prefs) { const o = document.createElement('option'); o.value = p.name; o.textContent = p.name; sel.appendChild(o); }
  sel.value = s.realPref || '';
  for (const r of document.querySelectorAll('input[name=mode]')) r.checked = r.value === s.mode;
  for (const r of document.querySelectorAll('input[name=pace]')) r.checked = Number(r.value) === Number(s.pace);
  $('#opt-gentle').checked = !!s.gentle;
  $('#opt-music').checked = !!s.music;
  const readSettings = () => {
    const ns = {
      mode: document.querySelector('input[name=mode]:checked').value,
      pace: Number(document.querySelector('input[name=pace]:checked').value),
      gentle: $('#opt-gentle').checked, music: $('#opt-music').checked, realPref: sel.value,
    };
    saveSettings(ns);
    return ns;
  };
  $('#setup').addEventListener('change', readSettings);
  $('#opt-music').addEventListener('change', (e) => (e.target.checked ? musicOn() : musicOff()));
  $('#btn-born').addEventListener('click', () => {
    const ns = readSettings();
    const saved = store.get('save');
    if (saved && saved.L && saved.L.alive) {
      if (!confirm('続きの人生があります。新しく生まれると、その人生はここで終わり、前世の記録に残ります。よろしいですか？')) return;
      pushPast(saved.L, true);
    }
    if (ns.music) musicOn();
    born(ns);
  });
  // 続きから
  const saved = store.get('save');
  if (saved && saved.L && saved.L.alive && saved.v === 1) {
    $('#resume-box').classList.remove('hidden');
    $('#resume-who').textContent = `${saved.L.name.sei}${saved.L.name.mei}（${saved.L.age}歳・${saved.L.pref}）`;
    $('#btn-resume').addEventListener('click', () => { if (settings().music) musicOn(); resume(saved); });
  }
  renderPast();
  $('#footer').innerHTML = footerHTML();
  $('#btn-clear-past').addEventListener('click', () => { if (confirm('前世の記録をすべて消します。元には戻せません。')) { store.del('past'); renderPast(); } });
}

function renderPast() {
  const past = store.get('past', []);
  $('#past-box').classList.toggle('hidden', !past.length);
  $('#past-list').innerHTML = past.map((p) => `<li><b>${esc(p.name)}</b>（${esc(p.birthPref)}・${p.sex === 'M' ? '男' : '女'}）${esc(p.years)}　${p.unfinished ? `${p.age}歳で中断` : `${p.age}歳`}${p.cause && !settings().gentle ? `・${esc(p.cause)}` : ''}${p.finalWord ? `<br><small>最後のひとこと：「${esc(p.finalWord)}」</small>` : ''}</li>`).join('');
}
function pushPast(L, unfinished = false) {
  const S = summarize(W, L);
  const past = store.get('past', []);
  past.unshift({ name: S.name, sex: L.sex, birthPref: L.birthPref, years: S.years, age: S.age, cause: S.cause, unfinished, finalWord: L.finalWord || '', at: Date.now() });
  store.set('past', past.slice(0, 10));
}

function show(id) {
  for (const s of ['screen-top', 'screen-birth', 'screen-play', 'screen-end']) $('#' + s).classList.toggle('hidden', s !== id);
  window.scrollTo(0, 0);
}

// ================================================================ 誕生
function born(s) {
  const seed = newSeed();
  const L = createLife(W, { seed, mode: s.mode });
  const peers = [1, 2, 3, 4].map((i) => createLife(W, { seed: seed + '-p' + i, mode: s.mode, isPeer: true, auto: true }));
  G = { v: 1, L, peers, settings: s, speed: 1, paused: false, turbo: false, yearElapsed: 0, queue: [], showAll: false };
  G.yearSec = (s.pace * 60) / W.lifeExp(L.birthPref, L.sex);
  show('screen-birth');
  const el = $('#screen-birth');
  el.innerHTML = `<div class="wrap birth-stage"><p class="muted" style="text-align:center" id="b-msg">生まれる県を決めています…</p><div class="mapbox" id="b-map"></div><div id="b-cert"></div></div>`;
  const svg = mapSVG(W, { label: '生まれる県を決めている日本地図' });
  $('#b-map').appendChild(svg);
  const R = new Rng(seed + 'anim');
  let n = reduceMotion ? 0 : 14;
  const step = () => {
    if (n-- > 0) {
      const p = W.drawPref(R, s.mode);
      markMap(svg, { [p]: 'flash' });
      setTimeout(step, 90 + (14 - n) * 12);
    } else {
      markMap(svg, { [L.birthPref]: 'glow' });
      $('#b-msg').textContent = `${L.birthPref}に生まれました。`;
      renderCert();
    }
  };
  step();
}

function renderCert() {
  const { L, peers, settings: s } = G;
  const F = L.family;
  const pf = W.pref(L.birthPref);
  const l = W.survival(L.birthPref, L.sex);
  const parents = [F.mother && `母 ${F.mother.name.mei}（${personAge(L, F.mother)}歳）`, F.father ? `父 ${F.father.name.mei}（${personAge(L, F.father)}歳）` : '父はそばにいません'].filter(Boolean).join('・');
  const sibs = F.siblings.length ? F.siblings.map((x) => `${x.rel}（${personAge(L, x)}歳）`).join('・') : '第一子';
  const shareBirth = `わたしは${L.startYear}年${L.birthMonth}月、${L.birthPref}に${L.sex === 'M' ? '男の子' : '女の子'}として生まれた。いま日本で生まれる赤ちゃんの${oneIn(pf.birthShare)}。5歳までに亡くなる確率は${pct(1 - l[5], 2)}。あなたはどこに生まれるだろう？ #47分の1`;
  const real = s.realPref && s.realPref !== L.birthPref ? W.pref(s.realPref) : null;
  $('#b-cert').innerHTML = `
  <div class="card cert" aria-labelledby="cert-h">
    <div class="cert-head"><span id="cert-h">出生届</span><span>${L.startYear}年${L.birthMonth}月</span></div>
    <div class="name">${esc(L.name.sei)} ${esc(L.name.mei)}</div>
    <div class="kana">${esc(L.name.seiKana)} ${esc(L.name.meiKana)}</div>
    <dl>
      <dt>生まれた場所</dt><dd>${esc(L.birthPref)}（${esc(pf.region)}）</dd>
      <dt>性別</dt><dd>${L.sex === 'M' ? '男の子' : '女の子'}</dd>
      <dt>両親</dt><dd>${esc(parents)}</dd>
      <dt>きょうだい</dt><dd>${esc(sibs)}</dd>
      <dt>生まれた家</dt><dd>${esc(QUINTILE[L.household.quintile])}<br><small>親の仕事と収入から見た、全国の家計の中での位置（5段階の${L.household.quintile}番目）</small></dd>
      <dt>この県に生まれる確率</dt><dd>${oneIn(pf.birthShare)}（${pct(pf.birthShare, 2)}）</dd>
      <dt>5歳までに亡くなる確率</dt><dd>${pct(1 - l[5], 2)}</dd>
      <dt>${esc(L.birthPref)}の平均寿命</dt><dd>${L.sex === 'M' ? '男' : '女'} ${W.lifeExp(L.birthPref, L.sex)}歳${real ? `<br><small>あなたの生まれた${esc(real.name)}は ${W.lifeExp(real.name, L.sex)}歳</small>` : ''}</dd>
    </dl>
    <div><b>同じ日に生まれた4人</b>
      <div class="peers-born">${peers.map((p) => `<div>${esc(p.name.sei)}${esc(p.name.mei)}（${p.sex === 'M' ? '男' : '女'}）— ${esc(p.birthPref)}</div>`).join('')}</div>
      <small>4人とも、生まれる場所を選んではいません。</small>
    </div>
  </div>
  <div style="display:grid;gap:10px;margin-top:16px">
    <button class="btn primary big" id="btn-start" type="button">人生を始める</button>
    <button class="btn" id="btn-share-birth" type="button">誕生カードを共有</button>
  </div>`;
  $('#btn-start').addEventListener('click', startLife);
  $('#btn-share-birth').addEventListener('click', () => doShareText(shareBirth));
  $('#btn-start').focus();
}

// ================================================================ 人生の進行
function startLife() {
  const { L, peers } = G;
  for (const p of peers) { beginYear(W, p); settlePeer(p); }
  const items = beginYear(W, L);
  G.yearElapsed = 0;
  schedule(items, 0);
  renderPlay();
  save();
  run();
}

function resume(saved) {
  G = saved;
  G.paused = false; G.turbo = false;
  G.yearSec = (G.settings.pace * 60) / W.lifeExp(G.L.birthPref, G.L.sex);
  G.queue = G.queue || [];
  show('screen-play');
  renderPlay();
  run();
}

function settlePeer(p) {
  let g = 0;
  while (p.pending && g++ < 20) answer(W, p, 0, {});
}

function schedule(items, from) {
  const remain = Math.max(0.6, G.yearSec - from);
  const gap = Math.min(remain / (items.length + 1), G.yearSec / 3);
  items.forEach((it, i) => G.queue.push({ it, at: from + gap * (i + 1) }));
}

function run() {
  stop();
  lastT = performance.now();
  ticker = setInterval(tick, 100);
}
function stop() { if (ticker) clearInterval(ticker); ticker = null; }

function modalOpen() { return !!$('#overlay').firstChild; }

function tick() {
  const now = performance.now();
  const dt = Math.min(0.5, (now - lastT) / 1000);
  lastT = now;
  if (!G || G.paused || modalOpen()) return;
  const L = G.L;
  const sp = G.turbo ? TURBO : G.speed;
  G.yearElapsed += dt * sp;
  let shown = false;
  while (G.queue.length && G.queue[0].at <= G.yearElapsed) {
    const { it } = G.queue.shift();
    shown = true;
    if (G.turbo && it.big && (it.h === 'grief' || it.k === 'death')) G.turbo = false;
  }
  if (shown) renderLog(), renderTop();
  if (G.queue.length) return;
  if (L.pending) { openPending(); return; }
  if (!L.alive) { finish(); return; }
  if (L.yearDone && G.yearElapsed >= G.yearSec) newYear();
}

function newYear() {
  const { L, peers } = G;
  for (const p of peers) if (p.alive && p.age <= L.age) { nextYear(W, p); settlePeer(p); }
  const items = nextYear(W, L);
  G.yearElapsed = 0;
  schedule(items, 0);
  renderTop(); renderPeers(); renderFocus(); renderPanels();
  save();
}

function save() {
  if (!G) return;
  const { L } = G;
  store.set('save', { v: 1, L, peers: G.peers, settings: G.settings, speed: G.speed, yearElapsed: G.yearElapsed, queue: G.queue });
}

// ================================================================ プレイ画面
function renderPlay() {
  show('screen-play');
  const el = $('#screen-play');
  el.innerHTML = `
  <header class="topbar"><div class="wrap wide">
    <div class="agebig" id="p-age" aria-live="off">0歳</div>
    <div class="who"><div class="nm" id="p-name"></div><div class="sub" id="p-sub"></div></div>
    <button class="iconbtn" id="btn-menu" type="button" aria-label="メニュー" aria-haspopup="dialog">⋯</button>
  </div></header>
  <div class="wrap wide">
    <div class="statstrip" id="p-stats" aria-label="状態（0〜100）"></div>
    <div class="moneyline" id="p-money"></div>
    <div class="layout">
      <div>
        <ul class="log" id="p-log" aria-live="polite" aria-relevant="additions" aria-label="人生の記録（新しい順）"></ul>
        <div class="more"><button class="linkbtn" id="btn-more" type="button">以前の記録をもっと見る</button></div>
        <div id="p-panels"></div>
      </div>
      <aside class="sidecol" aria-labelledby="peers-h">
        <h3 id="peers-h" style="margin-top:6px">同じ日に生まれた4人 <small>いま、同じ年齢で</small></h3>
        <div class="peers" id="p-peers"></div>
      </aside>
    </div>
  </div>
  <nav class="bottombar" aria-label="時間の操作"><div class="wrap wide">
    <div style="flex:1;min-width:0">
      <div class="focusrow" id="p-focus"></div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn primary play-btn" id="btn-pause" type="button" aria-label="一時停止">❚❚</button>
        <div class="speeds" role="group" aria-label="速さ">${SPEEDS.map((s) => `<button type="button" data-sp="${s}" aria-pressed="false">${s}×</button>`).join('')}</div>
        <label class="speedsel"><span class="sr-only">速さ</span><select id="sp-sel" class="sel">${SPEEDS.map((s) => `<option value="${s}">${s}× ▾</option>`).join('')}</select></label>
        <button class="btn small" id="btn-next" type="button" title="次の決断まで早送り（N キー）">次の決断まで »</button>
      </div>
    </div>
  </div></nav>`;
  $('#btn-menu').addEventListener('click', openMenu);
  $('#btn-pause').addEventListener('click', togglePause);
  $('#btn-next').addEventListener('click', () => { G.turbo = !G.turbo; G.paused = false; renderControls(); });
  for (const b of el.querySelectorAll('.speeds button')) b.addEventListener('click', () => { G.speed = Number(b.dataset.sp); G.turbo = false; G.paused = false; renderControls(); save(); });
  $('#sp-sel').addEventListener('change', (e) => { G.speed = Number(e.target.value); G.turbo = false; G.paused = false; renderControls(); save(); });
  $('#btn-more').addEventListener('click', () => { G.showAll = true; renderLog(); });
  $('#p-log').addEventListener('click', onStar);
  renderTop(); renderLog(); renderPeers(); renderFocus(); renderPanels(); renderControls();
}

function togglePause() { G.paused = !G.paused; G.turbo = false; renderControls(); }
function renderControls() {
  const b = $('#btn-pause');
  if (!b) return;
  b.textContent = G.paused ? '▶' : '❚❚';
  b.setAttribute('aria-label', G.paused ? '再開' : '一時停止');
  for (const s of document.querySelectorAll('.speeds button')) s.setAttribute('aria-pressed', String(!G.turbo && Number(s.dataset.sp) === G.speed));
  $('#sp-sel').value = String(G.speed);
  const n = $('#btn-next');
  n.setAttribute('aria-pressed', String(G.turbo));
  n.textContent = G.turbo ? '早送り中 ■' : '次の決断まで »';
  $('#p-log').setAttribute('aria-live', G.turbo || G.speed > 2 ? 'off' : 'polite');
}

function renderTop() {
  const { L } = G;
  $('#p-age').textContent = `${L.age}歳`;
  $('#p-name').textContent = `${L.name.sei} ${L.name.mei}`;
  const moved = L.pref !== L.birthPref ? `${L.pref}で暮らす（${L.birthPref}生まれ）` : `${L.pref}`;
  $('#p-sub').textContent = `${moved} · ${L.sex === 'M' ? '男' : '女'} · ${curYear(L)}年${G.L.auto ? ' · おまかせ中' : ''}`;
  const st = L.stats;
  const bar = (lab, v) => `<div class="stat"><span>${lab}</span><span class="v">${Math.round(v)}</span><div class="bar" role="meter" aria-label="${lab}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v)}"><i style="width:${v}%"></i></div></div>`;
  $('#p-stats').innerHTML = bar('健康', st.health) + bar('幸福', st.happy) + bar('知識', st.know) + bar('人間関係', st.social);
  const M = L.money;
  const parts = [];
  if (L.age < 18) parts.push(`生まれた家：${QUINTILE[L.household.quintile]}`);
  else {
    const job = L.work.status === 'employed' ? `${L.work.title}${L.work.nonreg ? '（非正規）' : ''}` : { unemployed: '求職中', retired: '引退', none: L.work.homemaker ? '家事・子育て' : studentLabel(L) }[L.work.status] || '';
    if (job) parts.push(job);
    parts.push(`年収 ${yen(L.work.income + (L.work.pensionM || 0) * 12)}`);
    parts.push(`貯金 ${yen(M.savings + M.invest)}`);
    if (M.debt + M.scholarship + L.home.mortgage > 0) parts.push(`借入 ${yen(M.debt + M.scholarship + L.home.mortgage)}`);
  }
  $('#p-money').innerHTML = parts.map((p) => `<span>${esc(p)}</span>`).join('');
}
function studentLabel(L) {
  return { univ: '大学生', grad: '大学院生', voc: '専門学校生', jc: '短大生', ronin: '浪人中', hs: '高校生' }[L.edu.stage] || '';
}

function visibleItems() {
  const { L } = G;
  const gentle = G.settings.gentle;
  const pendingSet = new Set(G.queue.map((q) => q.it));
  const out = [];
  for (const it of L.log) {
    if (pendingSet.has(it)) continue;
    if (gentle && it.h && !it.g) continue;
    out.push(it);
  }
  return out;
}
function renderLog() {
  const { L } = G;
  // queue の項目は L.log の同じオブジェクト（保存から戻した場合も JSON の同一性は失われるので t と a で比較）
  const qkeys = new Set(G.queue.map((q) => q.it.a + '|' + q.it.t));
  const gentle = G.settings.gentle;
  let items = L.log.filter((it) => !qkeys.has(it.a + '|' + it.t) && !(gentle && it.h && !it.g));
  items = items.slice().reverse();
  const total = items.length;
  if (!G.showAll) items = items.slice(0, 60);
  const lastAge = items[0]?.a;
  $('#p-log').innerHTML = items.map((it, i) => {
    const idx = L.log.indexOf(it);
    const text = gentle && it.h && it.g ? it.g : it.t;
    const heavy = it.h && !(gentle && it.g && it.k !== 'death') ? ' heavy' : '';
    const help = it.h && i < 8 ? hotlineHTML(W, it.h === 'death' ? (it.k === 'death' ? 'grief' : 'default') : it.h) : '';
    return `<li class="${it.big ? 'big' : ''}${heavy}${it.k === 'death' ? ' death' : ''}${it.k === 'note' ? ' note' : ''}${i === 0 && it.a === lastAge ? ' enter' : ''}"><span class="age">${it.a}歳 · ${it.y}年</span>${esc(text)}${it.note ? `<span class="lnote">ⓘ ${esc(it.note)}</span>` : ''}${help}<button class="star" type="button" data-i="${idx}" aria-pressed="${it.s ? 'true' : 'false'}" aria-label="覚えておく瞬間に${it.s ? 'しない' : 'する'}">${it.s ? '★' : '☆'}</button></li>`;
  }).join('');
  $('#btn-more').parentElement.classList.toggle('hidden', G.showAll || total <= 60);
}
function onStar(e) {
  const b = e.target.closest('.star');
  if (!b) return;
  const it = G.L.log[Number(b.dataset.i)];
  if (!it) return;
  const stars = G.L.log.filter((x) => x.s).length;
  if (!it.s && stars >= 10) { alert('★は10個までつけられます。'); return; }
  it.s = it.s ? 0 : 1;
  renderLog(); save();
}

function renderPeers() {
  const gentle = G.settings.gentle;
  $('#p-peers').innerHTML = G.peers.map((p) => {
    const last = [...p.log].reverse().find((it) => it.big && !(gentle && it.h && !it.g) && it.k !== 'birth');
    const text = last ? (gentle && last.h && last.g ? last.g : last.t) : '生まれたばかりです。';
    const status = p.alive ? `${p.age}歳 · ${p.pref}${p.pref !== p.birthPref ? `（${p.birthPref}生まれ）` : ''}` : `${p.deathAge}歳で永眠 · ${p.birthPref}生まれ`;
    return `<div class="peer${p.alive ? '' : ' dead'}"><div class="ph"><span class="pn">${esc(p.name.sei)}${esc(p.name.mei)}</span><span class="pp">${p.sex === 'M' ? '男' : '女'}</span></div><div class="pp">${esc(status)}</div><div class="pe">${esc(text)}</div></div>`;
  }).join('');
}

function renderFocus() {
  const { L } = G;
  const g = focusGroup(L.age);
  const el = $('#p-focus');
  if (!g) { el.innerHTML = `<span class="small">まだ小さな子どもで、親に育てられています。小さな出来事が積み重なって、5歳ごろに気質が定まります。この時期は速めに進めてもかまいません。</span>`; return; }
  const opts = FOCUS[g].filter((f) => (!f.minAge || L.age >= f.minAge) && (!f.maxAge || L.age <= f.maxAge));
  el.innerHTML = `<span class="lab">今年の重点</span><div class="chips" role="group" aria-label="今年の重点">${opts.map((f) => `<button type="button" class="chip" data-f="${f.id}" aria-pressed="${L.focus === f.id}" title="${esc(f.hint)}">${esc(f.label)}<small>${esc(f.hint)}</small></button>`).join('')}</div>`;
  for (const b of el.querySelectorAll('.chip')) b.addEventListener('click', () => {
    setFocus(L, b.dataset.f);
    if (L.auto) { setAuto(L, false); L.auto = false; }
    renderFocus(); save();
  });
}

function renderPanels() {
  const { L } = G;
  const F = L.family;
  const ageOf = (p) => personAge(L, p);
  const fam = [];
  const add = (label, p, extra = '') => fam.push(`<li class="${p.alive === false ? 'gone' : ''}">${esc(label)}${p.name?.mei ? ` ${esc(p.name.mei)}` : ''}${p.alive === false ? `（${p.diedAt || ''}年に他界）` : `（${ageOf(p)}歳${extra}）`}</li>`);
  if (F.mother) add('母', F.mother, F.mother.care ? '・要介護' : '');
  if (F.father) add('父', F.father, F.father.care ? '・要介護' : '');
  for (const s of F.siblings) add(s.rel, s);
  for (const g of F.grand) if (g.alive || L.age < 20) add(g.rel, g);
  if (F.spouse) add(F.spouse.rel, F.spouse, F.spouse.jobId ? `・${JOB[F.spouse.jobId]?.t || ''}` : '');
  if (F.partner) fam.push(`<li>恋人 ${esc(F.partner.name.mei)}さん</li>`);
  for (const ex of F.exSpouses) fam.push(`<li class="gone">元${esc(ex.rel)} ${esc(ex.name.mei)}</li>`);
  for (const c of F.children) add(c.sex === 'M' ? '息子' : '娘', c);
  if (L.grandkids) fam.push(`<li>孫 ${L.grandkids}人</li>`);
  const conds = Object.keys(L.health.conditions).map((k) => ({ cancer: 'がん', hypertension: '高血圧', diabetes: '糖尿病', heart: '心臓の病気', stroke: '脳卒中のあと', depression: 'うつ病' }[k])).filter(Boolean);
  if (L.health.dementia) conds.push('認知症');
  if (L.health.care) conds.push('要介護');
  const real = G.settings.realPref;
  $('#p-panels').innerHTML = `
  <details class="panel"><summary>家族と暮らし</summary><div class="pbody">
    <ul class="famlist">${fam.join('') || '<li>—</li>'}</ul>
    <p class="small">住まい：${L.home.own ? '持ち家' : L.home.withParents ? '実家' : '賃貸'}　学歴：${esc(EDU_LABEL[L.edu.level] || '—')}${L.temperLabel ? `　気質：${esc(TEMPER[L.temperLabel].label)}` : ''}${L.hobby ? `　趣味：${esc(L.hobby)}` : ''}${L.health.smoker ? '　喫煙' : ''}</p>
    <p class="small">健康のこと：${conds.length ? esc(conds.join('・')) : '大きな病気はありません'}</p>
  </div></details>
  <details class="panel"><summary>お金を使う · 投資</summary><div class="pbody">
    <p class="small">貯金 ${yen(L.money.savings)}・積立 ${yen(L.money.invest)}${L.money.debt ? `・借金 ${yen(L.money.debt)}` : ''}${L.money.scholarship ? `・奨学金の残り ${yen(L.money.scholarship)}` : ''}${L.home.mortgage ? `・住宅ローン ${yen(L.home.mortgage)}` : ''}</p>
    <div style="display:grid;gap:8px">
      <button class="btn small" data-spend="dinner" type="button" ${L.age < 18 ? 'disabled' : ''}>家族や友人にごちそうする（約3万円 · 人間関係↑）</button>
      <button class="btn small" data-spend="trip" type="button" ${L.age < 18 ? 'disabled' : ''}>旅行に行く（約15万円 · 幸福↑）</button>
      <button class="btn small" data-spend="checkup" type="button" ${L.age < 18 ? 'disabled' : ''}>人間ドックを受ける（約4万円 · 健康↑）</button>
      <button class="btn small" data-spend="invest" type="button" ${L.age < 18 ? 'disabled' : ''}>${L.money.investOn ? '積立投資をやめる' : '積立投資を始める'}</button>
    </div>
  </div></details>
  <details class="panel"><summary>人生地図</summary><div class="pbody">${lifeMapHTML(W, L)}</div></details>
  <details class="panel"><summary>生存曲線</summary><div class="pbody">${survivalChart(W, { pref: L.birthPref, sex: L.sex, age: L.age, compare: real })}<p class="small">同じ年に${esc(L.birthPref)}で生まれた${L.sex === 'M' ? '男の子' : '女の子'}のうち、各年齢で生きている人の割合（生命表）。点がいまの年齢です。</p></div></details>
  <details class="panel"><summary>状態は何を表している？</summary><div class="pbody small">
    <p><b>健康</b>：亡くなるリスクや、働き続けられるかどうかに影響します。運動や健康づくりで上がり、年齢とともに下がります。</p>
    <p><b>幸福</b>：暮らしへの満足感です。収入、家族や友人、健康、借金などが影響します。</p>
    <p><b>知識</b>：受験や仕事、最初の収入に影響します。ただし家の暮らし向きや県の進学率のほうが大きく効きます。</p>
    <p><b>人間関係</b>：家族や友人とのつながりです。結婚や離婚、いじめにあう可能性、老後の孤独に影響します。</p>
    <p>どれも可能性を動かすだけで、結果を決めるわけではありません。運や境遇も一緒に働きます。</p>
  </div></details>`;
  for (const b of $('#p-panels').querySelectorAll('[data-spend]')) b.addEventListener('click', () => spend(b.dataset.spend));
}

function spend(kind) {
  const { L } = G;
  const M = L.money;
  const cost = { dinner: 30000, trip: 150000, checkup: 40000 }[kind] || 0;
  const add = (t) => { const it = { a: L.age, y: curYear(L), t, k: 'money' }; L.log.push(it); };
  if (kind === 'invest') { M.investOn = !M.investOn; add(M.investOn ? '積立投資を始めました。' : '積立投資をやめました。'); }
  else {
    if (M.savings < cost) { alert('いまの貯金では足りません。'); return; }
    M.savings -= cost;
    if (kind === 'dinner') { L.stats.social = Math.min(100, L.stats.social + 4); L.stats.happy = Math.min(100, L.stats.happy + 2); add('家族や友人に、ちょっといい夕食をごちそうしました。'); }
    if (kind === 'trip') { L.stats.happy = Math.min(100, L.stats.happy + 5); add(`${['北海道', '沖縄', '京都', '金沢', '長崎', '箱根', '伊勢', '松山'][Math.floor(Math.random() * 8)]}へ旅行に行きました。`); }
    if (kind === 'checkup') { L.stats.health = Math.min(100, L.stats.health + 3); add('人間ドックを受けました。'); }
  }
  renderTop(); renderLog(); renderPanels(); save();
}

// ================================================================ 決断・ひと息
function openPending() {
  const { L } = G;
  const P = L.pending;
  if (!P || modalOpen()) return;
  G.turbo = false; renderControls();
  if (P.type === 'reflect') return openReflect(P);
  const catLabel = { small: '小さな選択', family: '家族と決めること', big: '大きな決断' }[P.cat] || '決断';
  const ov = $('#overlay');
  ov.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="dec-t">
    <div class="cat"><span>${catLabel}</span><span>${L.age}歳 · ${curYear(L)}年</span></div>
    <h2 id="dec-t">${esc(P.title)}</h2>
    ${P.body ? `<p class="body">${esc(P.body)}</p>` : ''}
    ${P.note ? `<p class="small">ⓘ ${esc(P.note)}</p>` : ''}
    <div class="opts">${P.options.map((o, i) => `<button class="opt" type="button" data-i="${i}"><kbd>${i + 1}</kbd><span class="ol">${esc(o.label)}</span>${o.hint ? `<span class="oh">${esc(o.hint)}</span>` : ''}</button>`).join('')}</div>
    <p class="small" style="margin:0">選んでいるあいだ、時間は止まっています。</p>
  </div></div>`;
  ov.querySelector('.opt').focus();
  for (const b of ov.querySelectorAll('.opt')) b.addEventListener('click', () => choose(Number(b.dataset.i)));
}
function choose(i) {
  const { L } = G;
  if (!L.pending || L.pending.type !== 'decision') return;
  $('#overlay').innerHTML = '';
  const items = answer(W, L, i);
  schedule(items, G.yearElapsed);
  renderTop(); renderFocus(); renderPanels(); save();
}

function openReflect(P) {
  const { L } = G;
  const real = G.settings.realPref;
  const facts = [...P.facts];
  if (real && real !== L.birthPref) {
    const l2 = W.survival(real, L.sex);
    facts.push(`あなたの生まれた${real}では、${L.age}歳を迎えるのは約${Math.round(l2[L.age] * 1000) / 10}%です。`);
  }
  const ov = $('#overlay');
  ov.innerHTML = `<div class="reflect" role="dialog" aria-modal="true" aria-labelledby="rf-k"><div class="wrap">
    <div class="rk" id="rf-k">ひと息 · ${P.age}歳</div>
    <p class="q">${esc(P.q)}</p>
    <div class="facts">${facts.map((f) => `<p>${esc(f)}</p>`).join('')}</div>
    <label class="sr-only" for="rf-note">一行メモ（任意）</label>
    <textarea id="rf-note" maxlength="200" rows="3" placeholder="浮かんだことを一行だけ（書かなくても大丈夫です）"></textarea>
    <small>書いたことは、この人生の記録に残り、この端末にだけ保存されます。</small>
    <div class="acts">
      <button class="btn primary big" id="rf-write" type="button">書き残して、続ける</button>
      <button class="btn" id="rf-skip" type="button">そっと胸にしまって、続ける</button>
    </div>
  </div></div>`;
  $('#rf-note').focus();
  const go = (note) => {
    ov.innerHTML = '';
    const items = answer(W, L, 0, { note });
    schedule(items, G.yearElapsed);
    renderTop(); renderFocus(); renderPanels(); save();
  };
  $('#rf-write').addEventListener('click', () => go($('#rf-note').value));
  $('#rf-skip').addEventListener('click', () => go(''));
}

// ================================================================ メニュー
function openMenu() {
  const { L, settings: s } = G;
  const ov = $('#overlay');
  const theme = store.get('theme', 'auto');
  ov.innerHTML = `<div class="scrim" data-close="1"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="menu-t">
    <h2 id="menu-t">メニュー</h2>
    <div class="menu-list">
      <label class="row check"><span>おまかせ（決断と重点を自動で）</span><input type="checkbox" id="m-auto" ${L.auto ? 'checked' : ''}></label>
      <label class="row check"><span>♪ 音楽</span><input type="checkbox" id="m-music" ${musicIsOn() ? 'checked' : ''}></label>
      <label class="row check"><span>怖い場面を除く</span><input type="checkbox" id="m-gentle" ${s.gentle ? 'checked' : ''}></label>
      <div class="row"><span>画面の明るさ</span><button class="btn small" id="m-theme" type="button">◐ ${themeLabel(theme)}</button></div>
      <div class="row"><span>思いを残す</span><button class="btn small" id="m-note" type="button">✎ 書く</button></div>
      <div class="row"><span>中断してトップへ（続きから再開できます）</span><button class="btn small" id="m-exit" type="button">中断</button></div>
    </div>
    <p class="small"><a href="about.html#help" target="_blank" rel="noopener">心がつらいときの相談先</a>　<a href="stats.html" target="_blank" rel="noopener">47都道府県の統計</a></p>
    <button class="btn big" id="m-close" type="button">閉じる</button>
  </div></div>`;
  const close = () => { ov.innerHTML = ''; renderTop(); renderLog(); renderPeers(); renderFocus(); renderControls(); save(); };
  ov.querySelector('.scrim').addEventListener('click', (e) => { if (e.target.dataset.close) close(); });
  $('#m-close').addEventListener('click', close);
  $('#m-auto').addEventListener('change', (e) => setAuto(L, e.target.checked));
  $('#m-music').addEventListener('change', (e) => { G.settings.music = e.target.checked; saveSettings({ ...settings(), music: e.target.checked }); e.target.checked ? musicOn() : musicOff(); });
  $('#m-gentle').addEventListener('change', (e) => { G.settings.gentle = e.target.checked; saveSettings({ ...settings(), gentle: e.target.checked }); });
  $('#m-theme').addEventListener('click', (e) => { const t = cycleTheme(); e.target.textContent = '◐ ' + themeLabel(t); });
  $('#m-note').addEventListener('click', () => {
    const t = prompt('いま思ったことを一行で（この端末にだけ保存されます）');
    if (t && t.trim()) { L.log.push({ a: L.age, y: curYear(L), t: `「${t.trim().slice(0, 200)}」と書き留めました。`, k: 'note' }); }
    close();
  });
  $('#m-exit').addEventListener('click', () => { save(); stop(); ov.innerHTML = ''; location.reload(); });
  $('#m-close').focus();
}

// ================================================================ キーボード
document.addEventListener('keydown', (e) => {
  if (!G || $('#screen-play').classList.contains('hidden')) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
  const P = G.L.pending;
  if (modalOpen()) {
    if (e.key === 'Escape' && !P) { $('#overlay').innerHTML = ''; }
    if (P && P.type === 'decision' && /^[1-9]$/.test(e.key)) { const i = Number(e.key) - 1; if (i < P.options.length) { e.preventDefault(); choose(i); } }
    return;
  }
  if (e.key === ' ') { e.preventDefault(); togglePause(); }
  if (e.key === 'n' || e.key === 'N') { G.turbo = !G.turbo; G.paused = false; renderControls(); }
});

// ================================================================ 人生の終わり
function finish() {
  stop();
  const { L, peers } = G;
  // 同じ日に生まれた4人も最後まで
  for (const p of peers) { let g = 0; while (p.alive && g++ < 130) { if (p.yearDone) nextYear(W, p); else continueYear(W, p); settlePeer(p); } }
  store.del('save');
  setTimeout(() => renderEnd(), reduceMotion ? 0 : 1600);
}

function renderEnd() {
  const { L, peers, settings: s } = G;
  const S = summarize(W, L);
  const gentle = s.gentle;
  show('screen-end');
  const real = s.realPref ? W.pref(s.realPref) : null;
  const bp = W.pref(L.birthPref);
  const l = W.survival(L.birthPref, L.sex);
  const outlive = l[Math.min(110, S.age + 1)];
  // 主な出来事：★をつけた瞬間はすべて、それ以外の大きな出来事は一生を通して均等に選ぶ
  const cand = L.log.filter((it) => it.big && !it.s && it.k !== 'birth' && !(gentle && it.h && !it.g));
  const maxN = Math.max(0, 22 - L.log.filter((it) => it.s).length);
  const picked = new Set(cand.length <= maxN ? cand : Array.from({ length: maxN }, (_, i) => cand[Math.round(i * (cand.length - 1) / Math.max(1, maxN - 1))]));
  const big = L.log.filter((it) => it.s || picked.has(it));
  const notes = Object.entries(L.notes);
  const fy = Object.entries(L.focusYears).sort((a, b) => b[1] - a[1]);
  const focusLabel = (id) => [...FOCUS.adult, ...FOCUS.senior].find((f) => f.id === id)?.label || id;
  const deathItem = L.log.find((it) => it.k === 'death');
  const cmpRows = real ? [
    ['平均寿命（' + (L.sex === 'M' ? '男' : '女') + '）', W.lifeExp(bp.name, L.sex) + '歳', W.lifeExp(real.name, L.sex) + '歳'],
    ['1人当たり県民所得', yen(bp.v.prefIncomePerCapita * 1000), yen(real.v.prefIncomePerCapita * 1000)],
    ['大学等進学率', bp.v.univEntryRate + '%', real.v.univEntryRate + '%'],
    ['合計特殊出生率', bp.v.tfr.toFixed(2), real.v.tfr.toFixed(2)],
    ['自殺死亡率（10万人当たり）', bp.v.suicideRate, real.v.suicideRate],
    ['医師数（10万人当たり）', bp.v.doctorsPer100k, real.v.doctorsPer100k],
    ['持ち家比率', bp.v.homeOwnershipRate + '%', real.v.homeOwnershipRate + '%'],
    ['30年以内に震度6弱以上', bp.quake30 + '%', real.quake30 + '%'],
  ] : [];
  const el = $('#screen-end');
  el.innerHTML = `<div class="wrap">
  <div class="endhead">
    <div class="muted">最期の記録</div>
    <div class="nm">${esc(S.name)}</div>
    <div class="yrs">${esc(S.years)} · ${S.age}歳${!gentle && S.cause ? ` · ${esc(S.cause)}` : ''}</div>
  </div>
  ${deathItem && deathItem.h && deathItem.h !== 'death' ? hotlineHTML(W, deathItem.h) : ''}
  <div class="card">
    <dl class="facts-grid">
      <dt>生まれた県</dt><dd>${esc(L.birthPref)}（${L.sex === 'M' ? '男' : '女'}）・${esc(QUINTILE[S.quintile])}に生まれる</dd>
      <dt>暮らした県</dt><dd>${esc(S.lived.join('・'))}</dd>
      <dt>最終学歴</dt><dd>${esc(S.edu)}</dd>
      <dt>最後の仕事</dt><dd>${esc(S.job || '—')}</dd>
      <dt>家族</dt><dd>${S.married ? '結婚した' : '結婚しなかった'}・子ども${S.children}人${S.childrenLost ? `（うち${S.childrenLost}人に先立たれる）` : ''}${S.grandkids ? `・孫${S.grandkids}人` : ''}</dd>
      <dt>最も稼いだ年</dt><dd>${S.maxIncome ? `${S.maxIncome.age}歳・世帯で${yen(S.maxIncome.v)}` : '—'}</dd>
      <dt>下した決断</dt><dd>${S.decisions}回</dd>
    </dl>
    <p class="small">同じ年に${esc(L.birthPref)}で生まれた${L.sex === 'M' ? '男の子' : '女の子'}のうち、この人より長生きするのは約${Math.round(outlive * 100)}%です。</p>
  </div>

  <h2>人生地図</h2>
  ${lifeMapHTML(W, L)}

  ${fy.length ? `<h2>大人になってから時間を注いだこと</h2><p>${fy.map(([k, v]) => `${esc(focusLabel(k))} ${v}年`).join(' · ')}</p>` : ''}

  <h2>主な出来事</h2>
  <ul class="log">${big.map((it) => `<li class="${it.s ? 'big' : ''}"><span class="age">${it.a}歳 · ${it.y}年</span>${it.s ? '★ ' : ''}${esc(gentle && it.h && it.g ? it.g : it.t)}</li>`).join('')}</ul>

  ${notes.length ? `<h2>残したメモ</h2><ul class="log">${notes.map(([a, t]) => `<li><span class="age">ひと息 · ${a}歳</span>「${esc(t)}」</li>`).join('')}</ul>` : ''}

  <h2>この人に、ひとこと</h2>
  <div class="endbox">
    <label class="sr-only" for="final-word">この人へのひとこと</label>
    <textarea id="final-word" maxlength="200" placeholder="${esc(S.name)}さんへ">${esc(L.finalWord || '')}</textarea>
    <button class="btn" id="btn-final" type="button" style="margin-top:8px">残す</button> <span class="small" id="final-ok"></span>
  </div>

  <h2>同じ日に生まれた4人</h2>
  <ul class="log">${peers.map((p) => { const ps = summarize(W, p); return `<li><b>${esc(ps.name)}</b>（${p.sex === 'M' ? '男' : '女'}・${esc(p.birthPref)}生まれ${p.pref !== p.birthPref ? `、${esc(p.pref)}で` : ''}）<br>${ps.age}歳まで生きました${!gentle && ps.cause ? `（${esc(ps.cause)}）` : ''}。${esc(ps.edu)}・${ps.married ? '結婚' : '未婚'}・子ども${ps.children}人${ps.job ? `・${esc(ps.job)}` : ''}</li>`; }).join('')}</ul>
  <p class="small">誰も、生まれる場所を選んではいません。</p>

  <h2>生存曲線</h2>
  ${survivalChart(W, { pref: L.birthPref, sex: L.sex, age: S.age, compare: s.realPref })}

  ${real ? `<h2>あなたの生まれた県とくらべる</h2>
  <table class="cmp"><thead><tr><th></th><th>${esc(bp.name)}<br><small>この人生</small></th><th>${esc(real.name)}<br><small>あなた</small></th></tr></thead>
  <tbody>${cmpRows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(String(r[1]))}</td><td>${esc(String(r[2]))}</td></tr>`).join('')}</tbody></table>
  <p class="small">出典は<a href="about.html#sources">出典一覧</a>。</p>` : `<p class="small">トップで「あなたが実際に生まれた都道府県」を選ぶと、ここで並べて比べられます。</p>`}

  <h2>共有する</h2>
  <div class="sharebar">
    <button class="btn" id="sh-img" type="button">画像で保存・共有</button>
    <button class="btn" id="sh-text" type="button">テキストをコピー</button>
  </div>
  <div style="display:grid;gap:10px;margin-top:20px">
    <button class="btn primary big" id="btn-again" type="button">もう一度生まれる</button>
    <a class="btn" href="index.html">トップへ</a>
  </div>
  <footer class="footer">${footerHTML()}</footer>
  </div>`;
  pushPast(L, false);
  $('#btn-final').addEventListener('click', () => {
    L.finalWord = $('#final-word').value.trim().slice(0, 200);
    const past = store.get('past', []);
    if (past[0]) { past[0].finalWord = L.finalWord; store.set('past', past); }
    $('#final-ok').textContent = L.finalWord ? '残しました。' : '';
  });
  $('#sh-text').addEventListener('click', () => doShareText(shareText(W, L, S, { gentle })));
  $('#sh-img').addEventListener('click', async () => {
    const blob = await shareImage(W, L, S, { gentle });
    const file = new File([blob], `47bun-no-1-${Date.now()}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: shareText(W, L, S, { gentle }) }); return; } catch { /* キャンセル */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  $('#btn-again').addEventListener('click', () => { G = null; show('screen-top'); born(settings()); });
}

async function doShareText(text) {
  if (navigator.share) { try { await navigator.share({ text, url: location.href.split('#')[0] }); return; } catch { /* キャンセル */ } }
  try { await navigator.clipboard.writeText(text + '\n' + location.href.split('#')[0]); alert('コピーしました。'); }
  catch { prompt('コピーしてお使いください', text); }
}
