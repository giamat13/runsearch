const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { spawnDetached } = require('../lib/util');
const { match } = require('../lib/match');

function recent() {
  const out = new Map();
  const add = (uri) => { if (uri && !out.has(uri)) out.set(uri, uri); };
  const dirs = [path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage')];
  for (const d of dirs) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(d, 'storage.json'), 'utf8'));
      for (const e of j.openedPathsList?.entries || []) add(e.folderUri || e.workspace?.configPath);
      for (const f of j.backupWorkspaces?.folders || []) add(f.folderUri);
    } catch { /* no storage.json */ }
    try {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(path.join(d, 'state.vscdb'), { readOnly: true });
      const row = db.prepare("SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'").get();
      db.close();
      for (const e of JSON.parse(row?.value || '{}').entries || []) add(e.folderUri || e.workspace?.configPath);
    } catch { /* sqlite unavailable */ }
  }
  return [...out.keys()].filter((u) => u.startsWith('file:'));
}

module.exports = {
  name: 'VSCodeWorkspaces',
  keyword: '{',
  global: false,
  query({ search }) {
    const out = [];
    for (const uri of recent()) {
      let p;
      try { p = fileURLToPath(uri); } catch { continue; }
      const name = path.basename(p).replace(/\.code-workspace$/, '');
      const m = search ? match(search, name) : { score: 10, indexes: [] };
      if (!m) continue;
      out.push({
        title: name,
        subtitle: p,
        hl: m.indexes,
        icon: 'VSCodeWorkspaces/code',
        score: 200 + m.score,
        run: () => spawnDetached('cmd.exe', ['/c', 'code', /\.code-workspace$/.test(p) ? '--file-uri' : '--folder-uri', uri], { windowsHide: true }),
      });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 20);
  },
};
