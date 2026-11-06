// 数学ファクトリー：ロジックの自動テスト（依存なし）。 node tests/run.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const load = require('./load');
const MF = load();
const tests = [];
global.test = (name, fn) => tests.push({ name, fn });
global.assert = assert;
global.MF = MF;
const only = process.argv[2];
for (const f of fs.readdirSync(__dirname).filter((x) => x.endsWith('.test.js')).sort()) {
  if (only && !f.includes(only)) continue;
  require(path.join(__dirname, f));
}
let pass = 0, fail = 0;
const t0 = Date.now();
for (const t of tests) {
  try { t.fn(); pass++; }
  catch (e) { fail++; console.log('✗ ' + t.name + '\n   ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n   ')); }
}
console.log((fail ? '✗' : '✓') + ' ' + pass + ' passed, ' + fail + ' failed (' + (Date.now() - t0) + 'ms)');
process.exit(fail ? 1 : 0);
