require('./helpers/stub-electron');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../plugins/calculator');

const { evaluate } = calc;

test('arithmetic follows operator precedence', () => {
  assert.equal(evaluate('2+2*3'), 8);
  assert.equal(evaluate('(1+2)*3'), 9);
  assert.equal(evaluate('10 % 4'), 2);
});

test('power is right-associative and binds tighter than unary minus', () => {
  assert.equal(evaluate('2^3^2'), 512);
  assert.equal(evaluate('-2^2'), -4);
});

test('factorial, constants and implicit multiplication', () => {
  assert.equal(evaluate('5!'), 120);
  assert.equal(evaluate('2pi'), 2 * Math.PI);
  assert.equal(evaluate('sqrt(16)'), 4);
});

test('hex literals and the unicode multiply sign', () => {
  assert.equal(evaluate('0x1F + 1'), 32);
  assert.equal(evaluate('2×3'), 6);
});

test('errors are reported with their message code', () => {
  assert.throws(() => evaluate('1/0'), (e) => e.message === 'div0');
  assert.throws(() => evaluate('2+'), (e) => e.message === 'incomplete');
  assert.throws(() => evaluate('2 $'), (e) => e.message === 'invalid');
});

test('the query formats the result and only answers math without the keyword', async () => {
  const [keyed] = await calc.query({ search: '0.1+0.2', isKeyword: true });
  assert.equal(keyed.title, '0.3');
  assert.deepEqual(await calc.query({ search: 'hello', isKeyword: false }), []);
});
