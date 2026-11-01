// 生存曲線と人生地図（SVG / HTML、ライブラリなし）
import { esc } from './common.js';

export function survivalChart(W, { pref, sex, age, compare, national }) {
  const w = 320, h = 170, pl = 30, pr = 8, pt = 10, pb = 24;
  const X = (a) => pl + (a / 105) * (w - pl - pr);
  const Y = (v) => pt + (1 - v) * (h - pt - pb);
  const line = (l) => l.slice(0, 106).map((v, a) => `${a ? 'L' : 'M'}${X(a).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const l = W.survival(pref, sex);
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(pref)}で同じ年に生まれた人のうち、各年齢で生きている人の割合">`;
  for (const v of [0, 0.5, 1]) s += `<line class="axis" x1="${pl}" x2="${w - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="2" y="${Y(v) + 4}">${v * 100}%</text>`;
  for (const a of [0, 20, 40, 60, 80, 100]) s += `<text x="${X(a) - 6}" y="${h - 6}">${a}</text>`;
  if (national) {
    const q = W.nat.lifeTablePrefWeighted[sex].q; const ln = [1];
    for (let a = 0; a < 110; a++) ln.push(ln[a] * (1 - q[a]));
    s += `<path class="curve3" d="${line(ln)}"/>`;
  }
  if (compare && compare !== pref) s += `<path class="curve2" d="${line(W.survival(compare, sex))}"/>`;
  s += `<path class="curve" d="${line(l)}"/>`;
  if (age != null && age <= 105) s += `<circle class="dot" cx="${X(age)}" cy="${Y(l[Math.min(110, age)])}" r="4"/>`;
  s += '</svg>';
  const legend = `<small>実線：${esc(pref)}の生命表（${sex === 'M' ? '男' : '女'}）${national ? '　細い点線：全国平均' : ''}${compare && compare !== pref ? `　赤い点線：${esc(compare)}（あなたの出身県）` : ''}</small>`;
  return `<div class="chart">${s}${legend}</div>`;
}

// 1マス = 1年。色が濃いほど幸せだった年。太枠 = 生まれた県の平均寿命
export function lifeMapHTML(W, L) {
  const le = Math.round(W.lifeExp(L.birthPref, L.sex));
  const n = Math.max(L.age + 1, le + 1, 80);
  const cells = [];
  for (let a = 0; a < Math.ceil(n / 10) * 10; a++) {
    const hap = L.hist.happy[a];
    let style = '', cls = [];
    if (a > (L.alive ? L.age : L.deathAge)) cls.push('empty');
    else if (hap != null) { const op = Math.max(0.08, Math.min(1, (hap - 15) / 75)); style = `background: color-mix(in srgb, var(--accent) ${Math.round(op * 100)}%, var(--bar-bg));`; }
    if (a === le) cls.push('le');
    cells.push(`<span class="${cls.join(' ')}" style="${style}" title="${a}歳${hap != null ? ' 幸福 ' + hap : ''}"></span>`);
  }
  return `<div class="lifemap" role="img" aria-label="人生地図：${L.alive ? L.age : L.deathAge}年分。太枠は${esc(L.birthPref)}の平均寿命${le}歳">${cells.join('')}</div>
  <small>1マス＝1年。色が濃いほど幸せだった年。太枠＝${esc(L.birthPref)}の平均寿命（${le}歳）</small>`;
}
