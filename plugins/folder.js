const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const { copy, expandEnv, openConsole } = require('../lib/util');
const { match } = require('../lib/match');

const MAX = 30;

function isPath(s) {
  return /^[a-z]:[\\/]?/i.test(s) || s.startsWith('\\\\') || /^%[^%]+%/.test(s) || /^~([\\/]|$)/.test(s);
}

function makeResult(full, isDir, sub, score, hl) {
  return {
    title: path.basename(full) || full,
    subtitle: sub,
    hl,
    score,
    iconFile: full,
    tooltip: full,
    run: () => { shell.openPath(full); },
    menu: [
      { title: 'Copy path (Ctrl+C)', glyph: '', key: 'ctrl+c', run: () => { copy(full); } },
      { title: 'Open containing folder (Ctrl+Shift+E)', glyph: '', key: 'ctrl+shift+e', run: () => shell.showItemInFolder(full) },
      { title: 'Open path in console (Ctrl+Shift+C)', glyph: '', key: 'ctrl+shift+c', run: () => openConsole(['/k'], isDir ? full : path.dirname(full)) },
    ],
  };
}

module.exports = {
  name: 'Folder',
  keyword: '',
  global: true,
  query({ search }) {
    if (!isPath(search)) return [];
    const q = expandEnv(search.trim().replace(/^"|"$/g, ''));
    const out = [];
    let exists = false, isDir = false;
    try { const st = fs.statSync(q); exists = true; isDir = st.isDirectory(); } catch { /* not a path yet */ }

    if (exists) {
      const r = makeResult(q, isDir, isDir ? 'Folder: ' + q : 'File: ' + q, 1000);
      r.title = `Open: ${q}`;
      r.subtitle = 'Tip: Use > to search in folders, * to search file by mask, >* for both.';
      out.push(r);
    }

    // Children of the typed folder, or siblings matching the typed prefix.
    let dir, prefix;
    if (exists && isDir) { dir = q; prefix = ''; }
    else { dir = path.dirname(q); prefix = path.basename(q); }
    let names = [];
    try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    const rows = [];
    for (const e of names) {
      if (e.name.startsWith('$')) continue;
      const m = prefix ? match(prefix, e.name) : { score: 50, indexes: [] };
      if (!m) continue;
      if (prefix && !e.name.toLowerCase().startsWith(prefix.toLowerCase()) && m.score < 70) continue;
      rows.push({ e, m });
    }
    rows.sort((a, b) => b.m.score - a.m.score || (b.e.isDirectory() - a.e.isDirectory()) || a.e.name.localeCompare(b.e.name));
    for (const { e, m } of rows.slice(0, MAX)) {
      const full = path.join(dir, e.name);
      if (full.toLowerCase() === q.toLowerCase()) continue;
      out.push(makeResult(full, e.isDirectory(), (e.isDirectory() ? 'Folder: ' : 'File: ') + full, 600 + m.score / 10, m.indexes));
    }
    if (rows.length > MAX) {
      out.push({ title: 'Warning: Folder Plugin Results truncated.', subtitle: `Showing ${MAX} of ${rows.length} results`, icon: 'Folder/Warning', score: 1, run: () => false });
    }
    return out;
  },
};
