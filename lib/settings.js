const store = require('./store');

const DEFAULTS = {
  hotkey: 'Alt+Space',
  width: 640,
  startWithWindows: false,
  disabledPlugins: [],
};

// Keeps only known keys with the right type, so a hand-edited or broken settings file cannot break the app.
function sanitize(raw) {
  const s = { ...DEFAULTS, disabledPlugins: [] };
  if (!raw || typeof raw !== 'object') return s;
  if (typeof raw.hotkey === 'string' && raw.hotkey.trim()) s.hotkey = raw.hotkey.trim();
  if (Number.isInteger(raw.width) && raw.width >= 360 && raw.width <= 2000) s.width = raw.width;
  if (typeof raw.startWithWindows === 'boolean') s.startWithWindows = raw.startWithWindows;
  if (Array.isArray(raw.disabledPlugins)) s.disabledPlugins = raw.disabledPlugins.filter((n) => typeof n === 'string');
  return s;
}

function get() {
  return sanitize(store.load('settings', {}));
}

// Merges a partial patch into the stored settings and writes them to settings.json in the user data folder.
function set(patch) {
  const next = sanitize({ ...get(), ...patch });
  Object.assign(store.load('settings', {}), next);
  store.save('settings');
  return next;
}

module.exports = { DEFAULTS, sanitize, get, set };
