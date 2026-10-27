require('./helpers/stub-electron');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const settings = require('../lib/settings');

test('missing or broken input falls back to the defaults', () => {
  assert.deepEqual(settings.sanitize(null), settings.DEFAULTS);
  assert.deepEqual(settings.sanitize('oops'), settings.DEFAULTS);
});

test('a width outside the allowed range is replaced with the default', () => {
  assert.equal(settings.sanitize({ width: 100 }).width, settings.DEFAULTS.width);
  assert.equal(settings.sanitize({ width: 800 }).width, 800);
  assert.equal(settings.sanitize({ width: '800' }).width, settings.DEFAULTS.width);
});

test('the hotkey is trimmed and an empty one is ignored', () => {
  assert.equal(settings.sanitize({ hotkey: '  Ctrl+Alt+R  ' }).hotkey, 'Ctrl+Alt+R');
  assert.equal(settings.sanitize({ hotkey: '   ' }).hotkey, settings.DEFAULTS.hotkey);
});

test('the plugin list keeps only names and wrong types become false', () => {
  assert.deepEqual(settings.sanitize({ disabledPlugins: ['Calculator', 42, null] }).disabledPlugins, ['Calculator']);
  assert.equal(settings.sanitize({ startWithWindows: 'yes' }).startWithWindows, false);
});

test('set stores a patch and get returns it', () => {
  settings.set({ width: 800, disabledPlugins: ['Folder'] });
  const s = settings.get();
  assert.equal(s.width, 800);
  assert.deepEqual(s.disabledPlugins, ['Folder']);
  assert.equal(s.hotkey, settings.DEFAULTS.hotkey);
});
