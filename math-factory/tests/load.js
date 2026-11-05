// ロジック層（画面と無関係な部分）を Node から読み込む
const path = require('path');
const FILES = ['util', 'balance', 'questions', 'game', 'factory', 'research', 'pals', 'battle', 'meta', 'study', 'wellbeing', 'galaxy', 'story'];
module.exports = function load() {
  for (const f of FILES) {
    const p = path.join(__dirname, '..', 'js', 'logic', f + '.js');
    try { require.resolve(p); } catch (e) { continue; }
    require(p);
  }
  return globalThis.MF;
};
module.exports.FILES = FILES;
