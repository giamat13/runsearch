const { openConsole, runAsAdmin } = require('../lib/util');
const store = require('../lib/store');
const { match } = require('../lib/match');

const LEAVE_OPEN = false; // PowerToys Run default: "Keep shell open" is off

function run(cmd, admin) {
  const h = store.load('shell-history', {});
  h[cmd] = (h[cmd] || 0) + 1;
  store.save('shell-history');
  if (admin) runAsAdmin('cmd.exe', [LEAVE_OPEN ? '/k' : '/c', cmd]);
  else openConsole([LEAVE_OPEN ? '/k' : '/c', `"${cmd}"`]);
}

function make(cmd, subtitle, score) {
  return {
    title: cmd,
    subtitle,
    icon: 'Shell/shell',
    score,
    run: () => run(cmd, false),
    menu: [
      { title: 'Run as administrator (Ctrl+Shift+Enter)', glyph: '', key: 'ctrl+shift+enter', run: () => run(cmd, true) },
    ],
  };
}

module.exports = {
  name: 'Shell',
  keyword: '>',
  global: false,
  query({ search }) {
    const history = store.load('shell-history', {});
    const out = [];
    if (search) out.push(make(search, 'execute command through command shell', 1000));
    for (const [cmd, n] of Object.entries(history)) {
      if (cmd === search) continue;
      const m = search ? match(search, cmd) : { score: 1, indexes: [] };
      if (m) {
        const r = make(cmd, `this command has been executed ${n} times`, 500 + Math.min(n, 50) + m.score / 10);
        r.hl = m.indexes;
        out.push(r);
      }
    }
    return out.slice(0, 20);
  },
};
