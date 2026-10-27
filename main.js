const { app, BrowserWindow, globalShortcut, ipcMain, screen, nativeTheme, systemPreferences, shell, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const store = require('./lib/store');
const settings = require('./lib/settings');
const { route } = require('./lib/route');

const ALL_PLUGINS = [
  'calculator', 'unitconverter', 'program', 'folder', 'system', 'timedate', 'uri', 'websearch', 'windowwalker',
  'windowsterminal', 'shell', 'windowssettings', 'registry', 'service', 'valuegenerator', 'history', 'vscodeworkspaces', 'indexer',
  'onenote', 'powertoys',
].map((n) => require(`./plugins/${n}`));

// The plugins that are switched on in Settings. Rebuilt whenever the settings change.
let PLUGINS = [];
function applyPlugins() {
  const off = new Set(settings.get().disabledPlugins);
  PLUGINS = ALL_PLUGINS.filter((p) => !off.has(p.name));
}

const MAX_SENT = 40;
const HEIGHT = 64;
let win = null;
let seq = 0;
let current = new Map(); // id -> result of the latest query
let lastQuery = '';
let hotkey = null; // the global shortcut that is registered right now
let tray = null;
let settingsWin = null;

const accent = () => {
  try { return '#' + systemPreferences.getAccentColor().slice(0, 6); } catch { return '#0078d4'; }
};
const themeInfo = () => ({ dark: nativeTheme.shouldUseDarkColors, accent: accent() });

// --- query pipeline -------------------------------------------------------

// Plugin ids keep a stable ordering; each plugin's results are merged as they arrive so slow plugins don't block fast ones.
function startQuery(text, mySeq) {
  lastQuery = text;
  const results = new Map(); // plugin name -> results[]
  const { plugins, search, isKeyword } = route(PLUGINS, text);
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
  const history = PLUGINS.find((p) => p.name === 'History');
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

// --- settings ---------------------------------------------------------------

ipcMain.handle('settings:get', () => ({
  ...settings.get(),
  defaults: settings.DEFAULTS,
  plugins: ALL_PLUGINS.map((p) => ({ name: p.name, keyword: p.keyword || '' })),
}));
ipcMain.handle('settings:save', (e, patch) => saveSettings(patch));
ipcMain.on('settings:close', () => { if (settingsWin) settingsWin.close(); });

function saveSettings(patch) {
  const before = settings.get();
  if (patch.hotkey !== undefined && patch.hotkey !== hotkey && !setHotkey(patch.hotkey)) {
    return { ok: false, error: `Could not register ${patch.hotkey}. Another app may be using it.` };
  }
  const next = settings.set(patch);
  if (next.startWithWindows !== before.startWithWindows) applyStartWithWindows(next.startWithWindows);
  applyPlugins();
  if (win && !win.isDestroyed()) win.setContentSize(next.width, win.getContentSize()[1]);
  refreshTray();
  return { ok: true, settings: next };
}

function applyStartWithWindows(enabled) {
  const options = { openAtLogin: enabled };
  if (app.isPackaged) {
    // A portable build runs from a temp copy, so the login item must point at the exe the user started.
    options.path = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  } else {
    // In dev mode the login item has to start Electron on this project.
    options.args = [app.getAppPath()];
  }
  app.setLoginItemSettings(options);
}

function openSettings() {
  if (settingsWin) { settingsWin.show(); settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 460,
    height: 620,
    title: 'runsearch settings',
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload-settings.js'), contextIsolation: true, sandbox: true },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => { settingsWin = null; });
}

// --- hotkey, tray and notifications ------------------------------------------

function registerHotkey(accelerator) {
  try { return globalShortcut.register(accelerator, toggle); } catch { return false; }
}

// Swaps the global shortcut. If the new one is taken, the old one stays registered so the app can still be opened.
function setHotkey(accelerator) {
  if (accelerator === hotkey) return true;
  const prev = hotkey;
  if (prev) globalShortcut.unregister(prev);
  if (registerHotkey(accelerator)) { hotkey = accelerator; return true; }
  if (prev && registerHotkey(prev)) return false;
  hotkey = null;
  return false;
}

function notify(body) {
  if (Notification.isSupported()) new Notification({ title: 'runsearch', body }).show();
  else console.error(`runsearch: ${body}`);
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'icons', 'WebSearch', 'WebSearch.dark.png')));
  tray.on('click', toggle);
  refreshTray();
}

function refreshTray() {
  if (!tray) return;
  tray.setToolTip(hotkey ? `runsearch (${hotkey})` : 'runsearch (no shortcut, change it in Settings)');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => show() },
    { label: 'Settings...', click: () => openSettings() },
    { label: 'Start with Windows', type: 'checkbox', checked: settings.get().startWithWindows, click: (item) => saveSettings({ startWithWindows: item.checked }) },
    { type: 'separator' },
    { label: 'Quit runsearch', click: () => app.quit() },
  ]));
}

// --- window ----------------------------------------------------------------

function createWindow() {
  win = new BrowserWindow({
    width: settings.get().width,
    height: HEIGHT,
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
  win.webContents.on('console-message', (event) => { if (event.level === 'error') console.error(`[renderer] ${event.message} (${event.sourceId}:${event.lineNumber})`); });
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
    app.setAppUserModelId('runsearch');
    applyPlugins();
    createWindow();
    createTray();
    if (!setHotkey(settings.get().hotkey)) notify(`Could not register ${settings.get().hotkey}. Another app may be using it. Change the shortcut in Settings.`);
    refreshTray();
    for (const p of PLUGINS) p.init?.();
    win.webContents.once('did-finish-load', () => {
      if (process.argv.includes('--show')) show();
      if (process.env.RS_QUERY) setTimeout(() => win.webContents.send('set-query', process.env.RS_QUERY), 800); // dev/testing aid
    });
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', (e) => e.preventDefault());
}
