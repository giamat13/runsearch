const { app, BrowserWindow, globalShortcut, ipcMain, screen, nativeTheme, systemPreferences, shell } = require('electron');
const path = require('path');
const store = require('./lib/store');

const PLUGINS = [
  'calculator', 'unitconverter', 'program', 'folder', 'system', 'timedate', 'uri', 'websearch', 'windowwalker',
  'windowsterminal', 'shell', 'windowssettings', 'registry', 'service', 'valuegenerator', 'history', 'vscodeworkspaces', 'indexer',
].map((n) => require(`./plugins/${n}`));
const history = PLUGINS.find((p) => p.name === 'History');

const WIDTH = 640;
const MAX_SENT = 40;
let win = null;
let seq = 0;
let current = new Map(); // id -> result of the latest query
let lastQuery = '';

const accent = () => {
  try { return '#' + systemPreferences.getAccentColor().slice(0, 6); } catch { return '#0078d4'; }
};
const themeInfo = () => ({ dark: nativeTheme.shouldUseDarkColors, accent: accent() });

// --- query pipeline -------------------------------------------------------

function route(text) {
  // A plugin keyword at the start of the query makes that plugin the only one to run.
  const keyed = PLUGINS.filter((p) => p.keyword).sort((a, b) => b.keyword.length - a.keyword.length);
  for (const p of keyed) {
    if (text.startsWith(p.keyword) && (p.keyword.length > 1 || !/^[a-z0-9]/i.test(p.keyword))) {
      // Alphabetic keywords need a space after them; symbols do not.
      return { plugins: [p], search: text.slice(p.keyword.length).trimStart(), isKeyword: true };
    }
  }
  return { plugins: PLUGINS.filter((p) => p.global), search: text.trim(), isKeyword: false };
}

// Plugin ids keep a stable ordering; each plugin's results are merged as they arrive so slow plugins don't block fast ones.
function startQuery(text, mySeq) {
  lastQuery = text;
  const results = new Map(); // plugin name -> results[]
  const { plugins, search, isKeyword } = route(text);
  if (!text.trim()) { push(mySeq, []); return; }

  const userBoost = store.load('boosts', {});
  for (const plugin of plugins) {
    Promise.resolve()
      .then(() => plugin.query({ raw: text, search, isKeyword }))
      .then((list) => {
        if (mySeq !== seq) return;
        results.set(plugin.name, (list || []).map((r) => ({ ...r, plugin: plugin.name })));
        const all = [...results.values()].flat();
        for (const r of all) r.rank = (r.score || 0) + Math.min(userBoost[`${r.plugin}|${r.title}`] || 0, 10) * 3;
        all.sort((a, b) => b.rank - a.rank);
        push(mySeq, all.slice(0, MAX_SENT));
      })
      .catch(() => {});
  }
}

const iconCache = new Map();
async function fileIcon(file) {
  if (iconCache.has(file)) return iconCache.get(file);
  let url = null;
  let source = file;
  if (/\.lnk$/i.test(file)) {
    // A shortcut's own shell icon is generic; use its icon file or its target instead.
    try {
      const l = shell.readShortcutLink(file);
      source = l.icon && /\.(ico|exe)$/i.test(l.icon) ? l.icon : l.target || file;
    } catch { /* keep the shortcut itself */ }
  }
  try { url = (await app.getFileIcon(source, { size: 'normal' })).toDataURL(); } catch { /* no icon */ }
  iconCache.set(file, url);
  return url;
}

async function push(mySeq, list) {
  current = new Map();
  const items = await Promise.all(list.map(async (r, i) => {
    const id = `${mySeq}:${i}`;
    current.set(id, r);
    return {
      id,
      title: r.title,
      subtitle: r.subtitle || '',
      tooltip: r.tooltip || '',
      hl: r.hl || [],
      icon: r.icon || null,
      iconUrl: r.iconFile ? await fileIcon(r.iconFile) : null,
      menu: (r.menu || []).map((m) => ({ title: m.title, glyph: m.glyph, key: m.key })),
    };
  }));
  if (mySeq === seq && win && !win.isDestroyed()) win.webContents.send('results', { seq: mySeq, items });
}

ipcMain.on('query', (e, text) => { seq += 1; startQuery(text, seq); });

ipcMain.on('run', async (e, { id, menu }) => {
  const r = current.get(id);
  if (!r) return;
  const action = menu === undefined || menu === null ? r.run : r.menu?.[menu]?.run;
  if (!action) return;
  const boosts = store.load('boosts', {});
  const bk = `${r.plugin}|${r.title}`;
  boosts[bk] = (boosts[bk] || 0) + 1;
  store.save('boosts');
  if (history && r.plugin !== 'History') history.record(lastQuery);
  let res;
  try { res = await action(); } catch { res = undefined; }
  if (res === false) return; // action wants the window to stay open
  if (res && res.query !== undefined) { win.webContents.send('set-query', res.query); return; }
  hide();
});

ipcMain.on('resize', (e, h) => {
  if (!win || win.isDestroyed()) return;
  const [w] = win.getContentSize();
  win.setContentSize(w, Math.max(1, Math.ceil(h)));
});
ipcMain.on('hide', () => hide());

// --- window ----------------------------------------------------------------

function createWindow() {
  win = new BrowserWindow({
    width: WIDTH,
    height: 64,
    useContentSize: true,
    show: false,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundMaterial: 'acrylic',
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('console-message', (_e, level, message, line, source) => { if (level >= 2) console.error(`[renderer] ${message} (${source}:${line})`); });
  win.webContents.on('preload-error', (_e, p, err) => console.error('[preload]', p, err));
  win.on('blur', () => { if (!process.argv.includes('--keep-open')) hide(); });
  nativeTheme.on('updated', () => win.webContents.send('theme', themeInfo()));
}

function position() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const wa = display.workArea;
  const [w] = win.getSize();
  win.setPosition(Math.round(wa.x + (wa.width - w) / 2), Math.round(wa.y + wa.height * 0.2));
}

function show() {
  position();
  win.webContents.send('theme', themeInfo());
  win.webContents.send('reset');
  seq += 1;
  win.show();
  win.focus();
  win.webContents.focus();
  PLUGINS.find((p) => p.name === 'WindowWalker')?.refresh?.();
}

function hide() {
  if (win && !win.isDestroyed() && win.isVisible()) win.hide();
}

function toggle() {
  if (win.isVisible()) hide(); else show();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => show());
  app.whenReady().then(() => {
    createWindow();
    for (const p of PLUGINS) p.init?.();
    if (!globalShortcut.register('Alt+Space', toggle)) console.error('runsearch: could not register Alt+Space (already in use?)');
    win.webContents.once('did-finish-load', () => {
      if (process.argv.includes('--show')) show();
      if (process.env.RS_QUERY) setTimeout(() => win.webContents.send('set-query', process.env.RS_QUERY), 800); // dev/testing aid
    });
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', (e) => e.preventDefault());
}
