import { loadWorld, applyTheme, esc, footerHTML, telHref } from './ui/common.js';

applyTheme();
const $ = (s) => document.querySelector(s);

loadWorld().then((W) => {
  const D = W.D;
  // 出典
  $('#src-list').innerHTML = Object.values(D.sources).map((s) => `<li id="src-${esc(s.id)}"><b>${esc(s.title)}</b>${s.publisher ? `　${esc(s.publisher)}` : ''}${s.year ? `（${esc(String(s.year))}）` : ''}${s.scope ? ` <span class="badge ${s.scope === 'national' ? 'nat' : ''}">${s.scope === 'national' ? '全国値' : '県別'}</span>` : ''}${s.estimated ? ' <span class="badge">推計を含む</span>' : ''}${s.verified === false ? ' <span class="badge">未照合</span>' : ''}
    ${s.url ? `<br><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.url)}</a>` : ''}
    ${s.via ? `<br><small>確認経路：${esc(s.via)}</small>` : ''}${s.note ? `<br><small>${esc(s.note)}</small>` : ''}</li>`).join('');
  // 推計・代用
  const est = [];
  for (const [k, m] of Object.entries(D.indicators)) if (m.estimated) est.push([m.label, m.reason || '']);
  const mdl = D.model;
  est.push(['死因の年齢・性別ごとの構成', mdl.causeNote.reason]);
  for (const [k, label] of [['earnings', '賃金の年齢カーブ・非正規の割合・学歴による差'], ['education', '専門学校・短大・大学院への進学、高校中退、いじめの起こりやすさ'], ['family', '結婚・出生・離婚のタイミング、出生順位、母の年齢'], ['health', '喫煙率（全国値）、依存症・うつ病・要介護の起こりやすさ'], ['migration', '年齢別の他県への移住の起こりやすさ']]) {
    if (mdl[k]?.estimated) est.push([label, mdl[k].reason]);
  }
  est.push(['30年以内に震度6弱以上の確率（一部の県）', D.sources.quake.note]);
  est.push(['名字の人数・名前ごとの人数と読み', '名字は県内上位5姓（一部の県は10〜15姓）を電話帳ベースの集計から使い、人数は順位から推計。名前はランキングの順位から重みを推計し、読みは一般的な読み方を付与。ランキング外の名前と親・祖父母世代の名前は作者が作成した例']);
  est.push(['県別の平均寿命の年次', '都道府県別生命表の最新は令和2年（2020年）のため、県別の死亡率はその値に合わせています（全国の最新は令和6年簡易生命表）']);
  est.push(['性暴力被害の経験率（男性）', D.national.violence2023.forcedSexM.note]);
  est.push(['同じ日に生まれた4人', '元の作品では「同じ1秒に生まれた人たち」ですが、日本では約47秒に1人の出生のため、「同じ日に生まれた4人」としています']);
  $('#est-list').innerHTML = est.map(([a, b]) => `<li><b>${esc(a)}</b><br><small>${esc(b)}</small></li>`).join('');
  // 相談先
  $('#hotlines').innerHTML = D.hotlines.list.map((h) => `<li><b>${esc(h.name)}</b>${h.tel ? `<br><a class="tel" href="${telHref(h.tel)}">${esc(h.tel)}</a>` : ''}<br><small>${esc(h.hours)}</small>${h.url ? `<br><a href="${esc(h.url)}" rel="noopener" target="_blank">公式サイト</a>` : ''}</li>`).join('');
  $('#hotline-note').textContent = `${D.hotlines.note}（${D.hotlines.checked} 時点）。命の危険があるときは 119番・110番へ。`;
  $('#footer').innerHTML = footerHTML();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
});
