/* 数学ファクトリー：設定画面（遊びやすさ・セーブ管理） */
(function (MF) {
  'use strict';
  const UI = MF.UI, G = MF.Game, U = MF.Util;
  const h = UI.h;
  const SettingsUI = { sections: [] };
  MF.SettingsUI = SettingsUI;

  function toggle(label, key, desc, after) {
    const s = UI.state;
    const id = 'set-' + key;
    return h('label', { class: 'set-row', for: id },
      h('span', { class: 'set-lbl' }, label, desc ? h('span', { class: 'muted small set-desc' }, desc) : null),
      h('input', { type: 'checkbox', id, class: 'switch', checked: !!s.settings[key], onchange: (e) => { s.settings[key] = e.target.checked; MF.App.applySettings(); if (after) after(e.target.checked); } }));
  }
  SettingsUI.toggle = toggle;
  function choice(label, key, options, after) {
    const s = UI.state;
    const seg = h('div', { class: 'seg' });
    options.forEach(([v, l]) => seg.appendChild(h('button', { class: 'seg-btn' + (String(s.settings[key]) === String(v) ? ' on' : ''), onclick: (e) => {
      s.settings[key] = v; MF.App.applySettings(); if (after) after(v);
      seg.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('on', b === e.currentTarget));
    } }, l)));
    return h('div', { class: 'set-row' }, h('span', { class: 'set-lbl' }, label), seg);
  }
  SettingsUI.choice = choice;

  // 音
  SettingsUI.sections.push(() => {
    const s = UI.state;
    const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.settings.volume, class: 'vol', 'aria-label': '音量',
      oninput: (e) => { s.settings.volume = +e.target.value; if (MF.Audio) MF.Audio.applyVolume(); }, onchange: () => { if (MF.Audio) MF.Audio.play('correct'); } });
    return UI.section('音',
      toggle('効果音', 'sound', '正解・建設・バトルなどの音', () => { if (MF.Audio) MF.Audio.applyVolume(); }),
      toggle('BGM', 'bgm', '画面ごとに雰囲気が変わる音楽', () => { if (MF.Audio) { MF.Audio.applyVolume(); MF.Audio.startBgm(); } }),
      h('div', { class: 'set-row' }, h('span', { class: 'set-lbl' }, '音量'), vol));
  });
  // 表示・操作
  SettingsUI.sections.push(() => UI.section('表示・操作',
    choice('文字の大きさ', 'fontScale', [[0.9, '小'], [1, '中'], [1.15, '大'], [1.3, '特大']]),
    choice('テンキー', 'keypad', [['auto', '自動'], ['always', '常に表示'], ['native', 'キーボード']]),
    toggle('正解したら自動で次へ', 'autoNext', '解説をじっくり読みたいときはオフに'),
    toggle('動きを減らす', 'reduceMotion', 'アニメーションや画面のゆれを止める'),
    toggle('ハイコントラスト', 'highContrast', '文字と背景の差を大きくする')));

  // ぬるま湯モード（算数だけ）
  SettingsUI.sections.push(() => {
    const E = MF.Questions.EASY_MODE;
    return UI.section('問題のレベル',
      toggle(E.icon + ' ' + E.name, 'easyMode', E.desc, (on) => { UI.toast(on ? E.onText : E.offText, on ? 'info' : 'good', 3500); }),
      h('p', { class: 'tiny muted' }, '切りかえても、いま出ている問題はそのまま。次の問題から変わるよ。資源・研究・ストーリーはふつうに進む。'));
  });

  // セーブ管理
  SettingsUI.sections.push(() => {
    const s = UI.state;
    const last = new Date(s.lastSaved || Date.now());
    return UI.section('セーブデータ',
      h('p', { class: 'small muted' }, '進み具合はこの端末のブラウザに自動で保存されます（10秒ごと・画面を閉じたとき）。ほかの端末には引きつがれないので、続きを別の場所で遊ぶときは「書き出し」→「読み込み」。最終保存：' + last.toLocaleString('ja-JP')),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => { MF.App.save(); UI.toast('保存したよ', 'good'); } }, '💾 今すぐ保存'),
        h('button', { class: 'btn', onclick: () => exportModal() }, '📤 書き出し'),
        h('button', { class: 'btn', onclick: () => importModal() }, '📥 読み込み'),
        h('button', { class: 'btn danger', onclick: () => resetModal() }, '🗑 リセット')));
  });

  function exportModal() {
    const text = MF.App.exportText();
    const ta = h('textarea', { class: 'save-text', readonly: true, rows: 6 }, text);
    const name = 'math-factory-save-' + U.dateStr(Date.now()) + '.json';
    UI.modal({
      title: 'セーブを書き出す',
      body: h('div', {}, h('p', { class: 'small' }, MF.App.inArtifact ? '下の文字列をコピーして、メモなどに貼りつけておこう。別の端末やブラウザで「読み込み」に貼りつけると続きから遊べるよ。' : 'ファイルとして保存するか、下の文字列をコピーしてメモなどに貼りつけておこう。別の端末で「読み込み」すると続きから遊べるよ。'), ta),
      buttons: [
        { label: 'コピー', cls: MF.App.inArtifact ? 'primary' : 'ghost', action: () => {
          const fallback = () => { ta.focus(); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } UI.toast(ok ? 'コピーしたよ' : '文字列を選んだので、長押しかCtrl+Cでコピーしてね', ok ? 'good' : 'info', 3500); };
          try { navigator.clipboard.writeText(text).then(() => UI.toast('コピーしたよ', 'good'), fallback); } catch (e) { fallback(); }
          return true;
        } },
        MF.App.inArtifact ? null : { label: 'ファイルに保存', cls: 'primary', action: () => { MF.App.download(name, text); return true; } },
        { label: '閉じる' },
      ],
    });
  }
  function importModal() {
    const ta = h('textarea', { class: 'save-text', rows: 6, placeholder: 'ここにセーブの文字列を貼りつけ' });
    const file = h('input', { type: 'file', accept: '.json,application/json,text/plain', onchange: (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader(); rd.onload = () => { ta.value = rd.result; }; rd.readAsText(f);
    } });
    UI.modal({
      title: 'セーブを読み込む',
      body: h('div', {}, h('p', { class: 'small' }, '⚠ 今の進み具合は上書きされます。'), file, ta),
      buttons: [{ label: 'やめる', cls: 'ghost' }, { label: '読み込む', cls: 'primary', action: () => {
        try { MF.App.importText(ta.value); } catch (e) { UI.toast('読み込めなかった：' + e.message, 'bad', 4000); return true; }
      } }],
    });
  }
  function resetModal() {
    const inp = h('input', { class: 'text-in', placeholder: 'リセット と入力' });
    UI.modal({
      title: '最初からやり直す',
      body: h('div', {}, h('p', {}, 'すべての進み具合（資源・工場・相棒・成績）が消えます。元に戻せません。念のため先に「書き出し」しておくのがおすすめ。'), h('p', { class: 'small' }, '確認のため「リセット」と入力してね。'), inp),
      buttons: [{ label: 'やめる', cls: 'ghost' }, { label: 'リセットする', cls: 'danger', action: () => {
        if (inp.value.trim() !== 'リセット') { UI.toast('「リセット」と入力してね', 'warn'); return true; }
        MF.App.reset();
      } }],
    });
  }

  UI.screen('settings', {
    title: '設定', icon: '⚙️', nav: 'more', navOrder: 99,
    render(root) {
      root.appendChild(h('h2', { class: 'screen-title' }, '設定'));
      SettingsUI.sections.forEach((fn) => { const n = fn(); if (n) root.appendChild(n); });
      root.appendChild(h('p', { class: 'muted small' }, '数学ファクトリー ・ 課金要素はありません。問題はすべてその場で自動生成しています。'));
    },
  });
})(globalThis.MF = globalThis.MF || {});
