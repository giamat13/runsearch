require('./helpers/stub-electron');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const converter = require('../plugins/unitconverter');

test('length units convert within their category', async () => {
  const [r] = await converter.query({ search: '1 km to m' });
  assert.equal(r.title, '1000 m');
});

test('a number with a fractional result keeps its precision', async () => {
  const [r] = await converter.query({ search: '10 cm in inches' });
  assert.match(r.title, /^3\.937007874 inches$/);
});

test('temperatures convert with their offsets', async () => {
  const [r] = await converter.query({ search: '100 C to F' });
  assert.equal(r.title, '212 °F');
});

test('mismatched categories give no result', async () => {
  assert.deepEqual(await converter.query({ search: '5 kg to m' }), []);
});
