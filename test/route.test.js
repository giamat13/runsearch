const { test } = require('node:test');
const assert = require('node:assert/strict');
const { route } = require('../lib/route');

const plugins = [
  { name: 'Calculator', keyword: '=', global: true },
  { name: 'Program', keyword: '.', global: true },
  { name: 'Bang', keyword: '!', global: false },
  { name: 'History', keyword: '!!', global: false },
  { name: 'OneNote', keyword: 'o:', global: false },
  { name: 'X', keyword: 'x', global: true },
  { name: 'Folder', keyword: '', global: true },
];

test('plain text goes to every global plugin', () => {
  const r = route(plugins, '  open  ');
  assert.deepEqual(r.plugins.map((p) => p.name), ['Calculator', 'Program', 'X', 'Folder']);
  assert.equal(r.search, 'open');
  assert.equal(r.isKeyword, false);
});

test('a symbol keyword makes only its plugin run, without needing a space', () => {
  const r = route(plugins, '=2+2');
  assert.deepEqual(r.plugins.map((p) => p.name), ['Calculator']);
  assert.equal(r.search, '2+2');
  assert.equal(r.isKeyword, true);
});

test('the longest matching keyword wins', () => {
  assert.equal(route(plugins, '!! car').plugins[0].name, 'History');
  assert.equal(route(plugins, '!car').plugins[0].name, 'Bang');
});

test('a multi-character keyword is matched', () => {
  const r = route(plugins, 'o:powertoys');
  assert.deepEqual(r.plugins.map((p) => p.name), ['OneNote']);
  assert.equal(r.search, 'powertoys');
});

test('text that only starts like a keyword is an ordinary query', () => {
  assert.equal(route(plugins, 'open').isKeyword, false);
});

test('a single letter is not a keyword, so it does not swallow searches', () => {
  const r = route(plugins, 'xylophone');
  assert.equal(r.isKeyword, false);
  assert.ok(r.plugins.some((p) => p.name === 'X'));
});
