const fs = require('fs');
const path = require('path');
const { spawnDetached, runAsAdmin } = require('../lib/util');
const { match } = require('../lib/match');

function settingsFiles() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'Packages');
  let dirs = [];
  try { dirs = fs.readdirSync(base).filter((d) => /^Microsoft\.WindowsTerminal(Preview)?_/.test(d)); } catch { return []; }
  return dirs.map((d) => path.join(base, d, 'LocalState', 'settings.json'));
}

function readProfiles() {
  const out = [];
  for (const f of settingsFiles()) {
    try {
      const txt = fs.readFileSync(f, 'utf8').replace(/^﻿/, '').replace(/^\s*\/\/.*$/gm, '');
      const j = JSON.parse(txt);
      const list = Array.isArray(j.profiles) ? j.profiles : j.profiles?.list || [];
      for (const p of list) if (p.name && !p.hidden) out.push({ name: p.name, guid: p.guid, exe: /Preview/.test(f) ? 'wtd.exe' : 'wt.exe' });
    } catch { /* unreadable settings */ }
  }
  return out;
}

module.exports = {
  name: 'WindowsTerminal',
  keyword: '_',
  global: true,
  query({ search, isKeyword }) {
    if (!search && !isKeyword) return [];
    const out = [];
    for (const p of readProfiles()) {
      const m = search ? match(search, p.name) : { score: 50, indexes: [] };
      if (!m || (!isKeyword && m.score < 70)) continue;
      out.push({
        title: p.name,
        subtitle: 'Windows Terminal profile',
        hl: m.indexes,
        icon: 'WindowsTerminal/WindowsTerminal',
        score: 150 + m.score / 10,
        run: () => spawnDetached(p.exe, ['-p', p.name], { windowsHide: false }),
        menu: [{ title: 'Run as administrator (Ctrl+Shift+Enter)', glyph: '', key: 'ctrl+shift+enter', run: () => runAsAdmin(p.exe, ['-p', p.name]) }],
      });
    }
    return out;
  },
};
