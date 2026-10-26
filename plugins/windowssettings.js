const path = require('path');
const fs = require('fs');
const { spawnDetached, copy } = require('../lib/util');
const { match } = require('../lib/match');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'windows-settings.json'), 'utf8'))
  .filter((s) => !s.deprecated);

function launch(s) {
  const c = s.command;
  if (/^ms-settings:/i.test(c) || /^ms-/i.test(c)) spawnDetached('explorer.exe', [c]);
  else if (/^control\.exe$/i.test(c)) spawnDetached('control.exe');
  else if (/^control\.exe\s/i.test(c)) spawnDetached('cmd.exe', ['/c', c], { windowsHide: true });
  else spawnDetached('cmd.exe', ['/c', 'start', '""', ...c.split(' ')], { windowsHide: true });
}

module.exports = {
  name: 'WindowsSettings',
  keyword: '$',
  global: false,
  query({ search }) {
    const out = [];
    for (const s of data) {
      let best = null;
      if (!search) best = s.first ? { score: 90, indexes: [] } : { score: 1, indexes: [] };
      else {
        const names = [s.name, ...s.altNames];
        for (const [i, n] of names.entries()) {
          const m = match(search, n);
          if (m && (!best || m.score - i > best.score)) best = { score: m.score - (i ? 5 : 0), indexes: i ? [] : m.indexes };
        }
        if (!best) { const m = match(search, s.areas.join(' ') + ' ' + s.name); if (m && m.score > 60) best = { score: m.score - 20, indexes: [] }; }
      }
      if (!best) continue;
      const area = s.areas.length ? s.areas[0] : 'Windows Settings';
      out.push({
        title: s.name,
        subtitle: s.areas.length ? `Area "${area}"` : 'Windows Settings',
        tooltip: s.note,
        hl: best.indexes,
        icon: s.type === 'AppControlPanel' ? 'WindowsSettings/WindowsSettings' : 'WindowsSettings/WindowsSettings',
        score: 200 + best.score,
        run: () => launch(s),
        menu: [{ title: 'Copy settings command (Ctrl+C)', glyph: '', key: 'ctrl+c', run: () => { copy(s.command); } }],
      });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 40);
  },
};
