const { test } = require('node:test');
const assert = require('node:assert/strict');
const { match } = require('../lib/match');

test('an exact match scores highest', () => {
  assert.equal(match('calculator', 'Calculator').score, 110);
});

test('a prefix match is marked on the matched characters', () => {
  const r = match('calc', 'Calculator');
  assert.deepEqual(r.indexes, [0, 1, 2, 3]);
  assert.equal(r.score, 100);
});

test('a match at the start scores higher than one further in', () => {
  assert.ok(match('calc', 'Calculator').score > match('culator', 'Calculator').score);
});

test('a subsequence match marks the letters in order', () => {
  assert.deepEqual(match('clr', 'calculator').indexes, [0, 2, 9]);
});

test('no match returns null', () => {
  assert.equal(match('xyz', 'calculator'), null);
});

test('an empty query matches everything with a low score', () => {
  assert.deepEqual(match('   ', 'anything'), { score: 1, indexes: [] });
});
