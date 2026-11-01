import { loadWorld, applyTheme, mapSVG, esc, footerHTML } from './ui/common.js';
import { yen, oneIn } from './engine/util.js';

applyTheme();
const $ = (s) => document.querySelector(s);

const COLS = [
  { k: 'births', label: '年間出生数', fmt: (p) => p.births.toLocaleString('ja-JP'), val: (p) => p.births, ind: 'births' },
  { k: 'birthShare', label: '生まれる確率', fmt: (p) => oneIn(p.birthShare), val: (p) => p.birthShare, ind: 'births' },
  { k: 'population', label: '人口', fmt: (p) => (p.population / 10000).toFixed(1) + '万', val: (p) => p.population, ind: 'population' },
  { k: 'leM', label: '平均寿命 男', fmt: (p) => p.v.lifeExpectancyM, val: (p) => p.v.lifeExpectancyM, ind: 'lifeExpectancyM' },
  { k: 'leF', label: '平均寿命 女', fmt: (p) => p.v.lifeExpectancyF, val: (p) => p.v.lifeExpectancyF, ind: 'lifeExpectancyF' },
  { k: 'u5', label: '5歳までに亡くなる確率', fmt: (p, W) => ((1 - W.survival(p.name, 'M')[5]) * 50 + (1 - W.survival(p.name, 'F')[5]) * 50).toFixed(2) + '%', val: (p, W) => 2 - W.survival(p.name, 'M')[5] - W.survival(p.name, 'F')[5], ind: 'lifeTable' },
  { k: 'inc', label: '1人当たり県民所得', fmt: (p) => yen(p.v.prefIncomePerCapita * 1000), val: (p) => p.v.prefIncomePerCapita, ind: 'prefIncomePerCapita' },
  { k: 'wage', label: '賃金（全国=100）', fmt: (p) => Math.round(p.wage * 100), val: (p) => p.wage, ind: 'wageIndex' },
  { k: 'muni', label: '市区町村の数', fmt: (p) => p.munis.length, val: (p) => p.munis.length, ind: 'munis' },
  { k: 'tax', label: '課税対象所得/人', fmt: (p) => yen(p.v.taxableIncomePerTaxpayer * 1000), val: (p) => p.v.taxableIncomePerTaxpayer, ind: 'taxableIncomePerTaxpayer' },
  { k: 'univ', label: '大学等進学率', fmt: (p) => p.v.univEntryRate + '%', val: (p) => p.v.univEntryRate, ind: 'univEntryRate' },
  { k: 'out', label: '県外の大学へ', fmt: (p) => (100 - p.v.inPrefUnivShare).toFixed(1) + '%', val: (p) => 100 - p.v.inPrefUnivShare, ind: 'inPrefUnivShare' },
  { k: 'tfr', label: '合計特殊出生率', fmt: (p) => p.v.tfr, val: (p) => p.v.tfr, ind: 'tfr' },
  { k: 'mar', label: '婚姻率', fmt: (p) => p.v.marriageRate, val: (p) => p.v.marriageRate, ind: 'marriageRate' },
  { k: 'div', label: '離婚率', fmt: (p) => p.v.divorceRate, val: (p) => p.v.divorceRate, ind: 'divorceRate' },
  { k: 'sui', label: '自殺死亡率', fmt: (p) => p.v.suicideRate, val: (p) => p.v.suicideRate, ind: 'suicideRate' },
  { k: 'crime', label: '刑法犯/千人', fmt: (p) => p.v.crimePer1000, val: (p) => p.v.crimePer1000, ind: 'crimePer1000' },
  { k: 'traffic', label: '交通事故死/10万人', fmt: (p) => p.v.trafficDeathsPer100k, val: (p) => p.v.trafficDeathsPer100k, ind: 'trafficDeathsPer100k' },
  { k: 'doc', label: '医師/10万人', fmt: (p) => p.v.doctorsPer100k, val: (p) => p.v.doctorsPer100k, ind: 'doctorsPer100k' },
  { k: 'beds', label: '一般病床/10万人', fmt: (p) => Math.round(p.v.generalBedsPer100k), val: (p) => p.v.generalBedsPer100k, ind: 'generalBedsPer100k' },
  { k: 'unemp', label: '完全失業率', fmt: (p) => p.v.unemploymentRate + '%', val: (p) => p.v.unemploymentRate, ind: 'unemploymentRate' },
  { k: 'prim', label: '第1次産業の就業者', fmt: (p) => p.industry[0] + '%', val: (p) => p.industry[0], ind: 'industry' },
  { k: 'net', label: '転入超過率', fmt: (p) => p.v.netMigrationRate + '%', val: (p) => p.v.netMigrationRate, ind: 'netMigrationRate' },
  { k: 'own', label: '持ち家比率', fmt: (p) => p.v.homeOwnershipRate + '%', val: (p) => p.v.homeOwnershipRate, ind: 'homeOwnershipRate' },
  { k: 'quake', label: '震度6弱以上（30年）', fmt: (p) => p.quake30 + '%' + (p.quakeEstimated ? '*' : ''), val: (p) => p.quake30, ind: 'quake30' },
];

loadWorld().then((W) => {
  const sel = $('#ind-sel');
  for (const c of COLS) { const o = document.createElement('option'); o.value = c.k; o.textContent = c.label; sel.appendChild(o); }
  const svg = mapSVG(W, { label: '指標の地図' });
  $('#st-map').appendChild(svg);
  const draw = () => {
    const c = COLS.find((x) => x.k === sel.value);
    const vals = W.prefs.map((p) => c.val(p, W));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    for (const path of svg.querySelectorAll('path')) {
      const p = W.pref(path.dataset.pref);
      const t = (c.val(p, W) - lo) / (hi - lo || 1);
      path.style.fill = `color-mix(in srgb, var(--accent) ${Math.round(10 + 80 * t)}%, var(--map-fill))`;
      path.querySelector('title').textContent = `${p.name}：${c.fmt(p, W)}`;
      path.style.cursor = 'pointer';
      path.onclick = () => detail(W, p.name);
    }
    const sorted = W.prefs.slice().sort((a, b) => c.val(b, W) - c.val(a, W));
    const meta = W.D.indicators[c.ind];
    $('#st-rank').innerHTML = `<b>${esc(c.label)}</b> ${badge(W, c.ind)}<br>${meta ? `<small>${esc(sourceLine(W, c.ind))}</small>` : ''}<ol style="padding-left:1.6em;columns:2;column-gap:18px">${sorted.map((p) => `<li><a href="#pref-${p.code}" data-p="${esc(p.name)}">${esc(p.short)}</a> ${esc(String(c.fmt(p, W)))}</li>`).join('')}</ol>`;
    for (const a of $('#st-rank').querySelectorAll('a[data-p]')) a.addEventListener('click', (e) => { e.preventDefault(); detail(W, a.dataset.p); });
  };
  sel.addEventListener('change', draw);
  draw();
  table(W);
  national(W);
  $('#footer').innerHTML = footerHTML();
  const m = location.hash.match(/pref-(\d+)/);
  if (m) { const p = W.prefs.find((x) => x.code === m[1]); if (p) detail(W, p.name); }
});

function badge(W, key) {
  const m = W.D.indicators[key];
  if (!m) return '';
  return (m.estimated ? '<span class="badge">推計</span>' : '') + (m.scope === 'national' ? '<span class="badge nat">全国値</span>' : '');
}
function sourceLine(W, key) {
  const m = W.D.indicators[key];
  if (!m) return '';
  const s = W.D.sources[m.source];
  if (m.source === 'estat_dash') return `出典：${m.stat || ''}（${m.year ?? ''}）· e-Stat 統計ダッシュボード／社会・人口統計体系${m.code ? `（${m.code}）` : ''}${m.note ? ' · ' + m.note : ''}`;
  return `出典：${s ? (s.publisher ? s.publisher + '「' + s.title + '」' : s.title) : m.source}（${m.year ?? ''}）${m.reason ? ' ※' + m.reason : ''}`;
}

function table(W) {
  const t = $('#st-table');
  let sortK = 'births', dir = -1;
  const render = () => {
    const c = COLS.find((x) => x.k === sortK);
    const rows = W.prefs.slice().sort((a, b) => dir * (c.val(a, W) - c.val(b, W)));
    t.innerHTML = `<thead><tr><th scope="col">都道府県</th>${COLS.map((x) => `<th scope="col" aria-sort="${x.k === sortK ? (dir < 0 ? 'descending' : 'ascending') : 'none'}"><button type="button" data-k="${x.k}">${esc(x.label)}${x.k === sortK ? (dir < 0 ? ' ▼' : ' ▲') : ''}</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map((p) => `<tr><td><a href="#pref-${p.code}" data-p="${esc(p.name)}">${esc(p.name)}</a></td>${COLS.map((x) => `<td>${esc(String(x.fmt(p, W)))}</td>`).join('')}</tr>`).join('')}</tbody>`;
    for (const b of t.querySelectorAll('thead button')) b.addEventListener('click', () => { if (sortK === b.dataset.k) dir = -dir; else { sortK = b.dataset.k; dir = -1; } render(); });
    for (const a of t.querySelectorAll('a[data-p]')) a.addEventListener('click', (e) => { e.preventDefault(); detail(W, a.dataset.p); });
  };
  render();
}

function detail(W, name) {
  const p = W.pref(name);
  history.replaceState(null, '', '#pref-' + p.code);
  const rows = [];
  const add = (label, val, key) => rows.push(`<tr><td>${esc(label)} ${badge(W, key)}</td><td>${esc(String(val))}</td><td class="small" style="text-align:left;white-space:normal">${esc(sourceLine(W, key))}</td></tr>`);
  add('年間出生数（2024年）', p.births.toLocaleString('ja-JP') + '人', 'births');
  add('いま生まれる赤ちゃんのうち', oneIn(p.birthShare), 'births');
  add('人口（2025年）', p.population.toLocaleString('ja-JP') + '人', 'population');
  add('平均寿命 男 / 女', `${p.v.lifeExpectancyM}歳 / ${p.v.lifeExpectancyF}歳`, 'lifeExpectancyM');
  add('65歳まで生きる割合 男 / 女', `${(p.lt.M.s65 * 100).toFixed(1)}% / ${(p.lt.F.s65 * 100).toFixed(1)}%`, 'lifeTable');
  add('90歳まで生きる割合 男 / 女', `${(p.lt.M.s90 * 100).toFixed(1)}% / ${(p.lt.F.s90 * 100).toFixed(1)}%`, 'lifeTable');
  for (const [k, m] of Object.entries(W.D.indicators)) {
    if (['births', 'population', 'lifeExpectancyM', 'lifeExpectancyF', 'lifeTable', 'industry', 'quake30', 'surnames'].includes(k)) continue;
    if (p.v[k] == null) continue;
    const v = typeof p.v[k] === 'number' ? (Math.round(p.v[k] * 100) / 100).toLocaleString('ja-JP') : p.v[k];
    add(m.label, `${v}${m.unit && m.unit !== '' ? ' ' + m.unit : ''}`, k);
  }
  add('就業者の産業（第1次・第2次・第3次）', p.industry.map((x) => x + '%').join(' · '), 'industry');
  add('30年以内に震度6弱以上の揺れ', p.quake30 + '%' + (p.quakeEstimated ? '（この県は推計値）' : ''), 'quake30');
  add('多い名字（上位）', p.surnames.map((s) => s[0]).join('・'), 'surnames');
  $('#pref-detail').innerHTML = `<div class="card" style="margin:16px 0" id="pref-${p.code}">
    <h2 style="margin-top:0">${esc(p.name)}</h2>
    <p class="small">${esc(p.region)}地方・県庁所在地 ${esc(p.capital)}　名物の例：${esc(p.food)}・${esc(p.festival)}</p>
    <div class="tbl-wrap"><table class="cmp"><tbody>${rows.join('')}</tbody></table></div>
    <p><a href="index.html">この県に生まれるとは限りません。生まれてみる →</a></p>
  </div>`;
  $('#pref-detail').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function national(W) {
  const N = W.nat;
  const lt = N.lifeTable2024;
  $('#st-national').innerHTML = `<ul>
    <li>出生数 ${N.births2025.toLocaleString('ja-JP')}人・死亡数 ${N.deaths2025.toLocaleString('ja-JP')}人・合計特殊出生率 ${N.tfr2025}（2025年 人口動態統計 確定数）</li>
    <li>平均寿命 男 ${lt.e0.M}年・女 ${lt.e0.F}年（令和6年簡易生命表）</li>
    <li>婚姻 ${N.marriages2025.toLocaleString('ja-JP')}組・離婚 ${N.divorces2025.toLocaleString('ja-JP')}組（2025年）</li>
    <li>一般労働者の平均年収 男 ${yen(N.wages2024.annualAllAges.M)}・女 ${yen(N.wages2024.annualAllAges.F)}（令和6年 賃金構造基本統計調査）</li>
    <li>1世帯当たり平均所得 ${yen(N.household2025.meanIncome)}・相対的貧困率 ${N.household2025.relativePovertyRate}%（2025年 国民生活基礎調査）</li>
    <li>習慣的に喫煙する人 男 ${N.health2024.smoking.M}%・女 ${N.health2024.smoking.F}%（令和6年 国民健康・栄養調査）</li>
    <li>都道府県間の移動者 ${N.migration2025.interPrefMovers.toLocaleString('ja-JP')}人（2025年 住民基本台帳人口移動報告）</li>
  </ul><p class="small"><a href="about.html#sources">すべての出典と、推計で補った項目の一覧</a></p>`;
}
