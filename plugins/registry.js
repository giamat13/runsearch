const { execFile } = require('child_process');
const { spawnDetached, copy } = require('../lib/util');
const { match } = require('../lib/match');

const ROOTS = {
  HKCR: 'HKEY_CLASSES_ROOT', HKCU: 'HKEY_CURRENT_USER', HKLM: 'HKEY_LOCAL_MACHINE', HKU: 'HKEY_USERS', HKCC: 'HKEY_CURRENT_CONFIG',
};
const LONG_ROOTS = Object.values(ROOTS);

function reg(args) {
  return new Promise((resolve) => {
    execFile('reg.exe', args, { windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => resolve(err ? '' : stdout));
  });
}

function normalize(p) {
  let [root, ...rest] = p.replace(/^computer\\/i, '').split('\\');
  const long = ROOTS[root.toUpperCase()] || LONG_ROOTS.find((r) => r === root.toUpperCase());
  return long ? [long, ...rest].join('\\') : null;
}

function openInRegedit(key) {
  const { execFileSync } = require('child_process');
  try {
    execFileSync('reg.exe', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Applets\\Regedit', '/v', 'LastKey', '/t', 'REG_SZ', '/d', 'Computer\\' + key, '/f'], { windowsHide: true });
  } catch { /* ignore */ }
  spawnDetached('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', 'Start-Process regedit -Verb RunAs'], { windowsHide: true });
}

module.exports = {
  name: 'Registry',
  keyword: ':',
  global: false,
  async query({ search }) {
    const s = search.trim();
    if (!s) {
      return LONG_ROOTS.map((r) => keyResult(r, 100));
    }
    // Typing only a root prefix ("hkc") or a full path with an optional partial last segment.
    const parts = s.split('\\');
    if (parts.length === 1) {
      return LONG_ROOTS.concat(Object.keys(ROOTS)).map((r) => ({ r, m: match(s, r) })).filter((x) => x.m && x.r.length > 4)
        .map((x) => keyResult(x.r, 100 + x.m.score, x.m.indexes));
    }
    const full = normalize(s);
    if (!full) return [];
    const out = [];
    const segs = full.split('\\');
    const last = segs[segs.length - 1];
    const parent = segs.slice(0, -1).join('\\');
    const exact = s.endsWith('\\');
    const listKey = exact ? segs.slice(0, -1).join('\\') : parent;
    const prefix = exact ? '' : last;

    const text = await reg(['query', listKey]);
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (/^HKEY_/i.test(line) && line.toLowerCase() !== listKey.toLowerCase()) {
        const name = line.slice(listKey.length + 1);
        if (name.includes('\\')) continue;
        const m = prefix ? match(prefix, name) : { score: 50, indexes: [] };
        if (m) out.push(keyResult(line, 200 + m.score, m.indexes.map((i) => i + listKey.length + 1)));
      }
    }
    // Values of the listed key when the user ended with a backslash.
    if (exact) {
      for (const line of lines) {
        const v = /^ {4}(.*?) {4}(REG_[A-Z_]+)(?: {4}(.*))?$/.exec(line);
        if (v) out.push({
          title: v[1] || '(Default)', subtitle: `${v[2]}: ${v[3] ?? ''}`, icon: 'Registry/reg', score: 150,
          run: () => { copy(v[3] ?? ''); },
          menu: [{ title: 'Copy value name', glyph: '', key: 'ctrl+c', run: () => { copy(v[1]); } }],
        });
      }
    }
    return out.slice(0, 40);
  },
};

function keyResult(key, score, hl) {
  return {
    title: key,
    subtitle: 'Registry key',
    hl,
    icon: 'Registry/reg',
    score,
    run: () => openInRegedit(key),
    menu: [
      { title: 'Copy key name (path)', glyph: '', key: 'ctrl+c', run: () => { copy(key); } },
      { title: 'Open key in registry editor', glyph: '', key: 'ctrl+o', run: () => openInRegedit(key) },
    ],
  };
}
