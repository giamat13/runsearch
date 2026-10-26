const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const { ps, spawnDetached, runAsAdmin, openConsole } = require('../lib/util');
const { match } = require('../lib/match');

let apps = []; // { name, path, kind: 'win32' | 'uwp' | 'url' | 'path', appId }
let indexing = null;

function walk(dir, exts, out, depth = 0) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (depth < 6) walk(full, exts, out, depth + 1); }
    else if (exts.includes(path.extname(e.name).toLowerCase())) out.push(full);
  }
}

async function buildIndex() {
  const found = new Map();
  const add = (name, entry) => { const k = name.toLowerCase(); if (!found.has(k)) found.set(k, { name, ...entry }); };

  const startDirs = [
    path.join(process.env.ProgramData || '', 'Microsoft/Windows/Start Menu/Programs'),
    path.join(process.env.APPDATA || '', 'Microsoft/Windows/Start Menu/Programs'),
  ];
  const files = [];
  for (const d of startDirs) walk(d, ['.lnk', '.url', '.appref-ms'], files);
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const name = path.basename(f, ext);
    if (/^(uninstall|remove)\b/i.test(name)) continue;
    add(name, { path: f, kind: ext === '.url' ? 'url' : 'win32' });
  }

  try {
    const out = await ps('Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress', { timeout: 30000 });
    const list = [].concat(JSON.parse(out || '[]'));
    for (const a of list) {
      if (a.AppID && a.Name && !/^[a-z]:\\/i.test(a.AppID) && a.AppID.includes('!')) add(a.Name, { kind: 'uwp', appId: a.AppID });
    }
  } catch { /* UWP apps unavailable */ }

  const sysRoot = (process.env.SystemRoot || 'C:\\Windows').toLowerCase();
  for (const dir of (process.env.PATH || '').split(';')) {
    if (!dir || dir.toLowerCase().startsWith(sysRoot)) continue;
    let entries;
    try { entries = fs.readdirSync(dir); } catch { continue; }
    for (const f of entries) {
      if (f.toLowerCase().endsWith('.exe')) add(path.basename(f, '.exe'), { path: path.join(dir, f), kind: 'path' });
    }
  }
  apps = [...found.values()];
}

function ensureIndex() {
  if (!indexing) indexing = buildIndex().catch(() => {});
  return indexing;
}

const SUBTITLES = { win32: 'Application', url: 'Internet shortcut application', uwp: 'Packaged application', path: 'Application' };

function toResult(a, m) {
  const menu = [];
  if (a.path) {
    menu.push(
      { title: 'Run as administrator (Ctrl+Shift+Enter)', glyph: '\uE7EF', key: 'ctrl+shift+enter', run: () => runAsAdmin(a.path) },
      { title: 'Open containing folder (Ctrl+Shift+E)', glyph: '\uE838', key: 'ctrl+shift+e', run: () => shell.showItemInFolder(a.path) },
      { title: 'Open path in console (Ctrl+Shift+C)', glyph: '\uE756', key: 'ctrl+shift+c', run: () => openConsole(['/k'], path.dirname(a.path)) },
    );
  }
  return {
    title: a.name,
    subtitle: SUBTITLES[a.kind],
    hl: m.indexes,
    score: m.score,
    iconFile: a.path,
    icon: a.path ? undefined : 'Program/app',
    tooltip: a.path,
    menu,
    run: () => {
      if (a.kind === 'uwp') spawnDetached('explorer.exe', [`shell:AppsFolder\\${a.appId}`]);
      else shell.openPath(a.path);
    },
  };
}

module.exports = {
  name: 'Program',
  keyword: '.',
  global: true,
  init: ensureIndex,
  async query({ search }) {
    if (!search) return [];
    await ensureIndex();
    const out = [];
    for (const a of apps) {
      const m = match(search, a.name);
      if (m) out.push(toResult(a, m));
    }
    out.sort((x, y) => y.score - x.score);
    return out.slice(0, 12);
  },
};
