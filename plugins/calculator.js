const { copy } = require('../lib/util');

const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  arsinh: Math.asinh, arcosh: Math.acosh, artanh: Math.atanh,
  ceil: Math.ceil, floor: Math.floor, exp: Math.exp, abs: Math.abs,
  log: Math.log10, log10: Math.log10, log2: Math.log2, ln: Math.log,
  sqrt: Math.sqrt, round: Math.round, sign: Math.sign, cbrt: Math.cbrt,
  max: Math.max, min: Math.min, pow: Math.pow,
  rad: (x) => x, deg: (x) => (x * Math.PI) / 180, grad: (x) => (x * Math.PI) / 200,
  factorial: (n) => { if (n < 0 || !Number.isInteger(n) || n > 170) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; },
};
const CONSTS = { pi: Math.PI, e: Math.E };

class CalcError extends Error {}

function tokenize(src) {
  const toks = [];
  const re = /\s*(?:(0x[0-9a-f]+|0b[01]+|0o[0-7]+|(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)|([a-z][a-z0-9]*)|(\*\*|[-+*/^%(),!×÷]))/iy;
  let i = 0;
  src = src.replace(/\s+$/, '');
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) throw new CalcError('invalid');
    i = re.lastIndex;
    if (m[1] !== undefined) toks.push({ t: 'num', v: m[1].toLowerCase().startsWith('0') && /^0[xbo]/i.test(m[1]) ? Number(m[1].toLowerCase()) : parseFloat(m[1]) });
    else if (m[2] !== undefined) toks.push({ t: 'id', v: m[2].toLowerCase() });
    else toks.push({ t: 'op', v: m[3] === '×' ? '*' : m[3] === '÷' ? '/' : m[3] === '**' ? '^' : m[3] });
  }
  return toks;
}

function evaluate(src) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;

  function parseExpr() {
    let v = parseTerm();
    while (isOp('+') || isOp('-')) v = toks[p++].v === '+' ? v + parseTerm() : v - parseTerm();
    return v;
  }
  function startsOperand() {
    const t = peek();
    return t && (t.t === 'num' || t.t === 'id' || (t.t === 'op' && t.v === '('));
  }
  function parseTerm() {
    let v = parseUnary();
    for (;;) {
      if (isOp('*')) { p++; v *= parseUnary(); }
      else if (isOp('/')) { p++; const d = parseUnary(); if (d === 0) throw new CalcError('div0'); v /= d; }
      else if (isOp('%')) { p++; const d = parseUnary(); if (d === 0) throw new CalcError('div0'); v %= d; }
      else if (startsOperand()) v *= parseUnary(); // implicit multiplication: 2(3), 2pi
      else return v;
    }
  }
  function parseUnary() {
    if (isOp('-')) { p++; return -parseUnary(); }
    if (isOp('+')) { p++; return parseUnary(); }
    return parsePow();
  }
  function parsePow() {
    const base = parsePostfix();
    if (isOp('^')) { p++; return Math.pow(base, parseUnary()); }
    return base;
  }
  function parsePostfix() {
    let v = parsePrimary();
    while (isOp('!')) { p++; v = FUNCS.factorial(v); }
    return v;
  }
  function parsePrimary() {
    const t = toks[p++];
    if (!t) throw new CalcError('incomplete');
    if (t.t === 'num') return t.v;
    if (t.t === 'op' && t.v === '(') {
      const v = parseExpr();
      if (!isOp(')')) throw new CalcError('incomplete');
      p++;
      return v;
    }
    if (t.t === 'id') {
      if (t.v in CONSTS) return CONSTS[t.v];
      const fn = FUNCS[t.v];
      if (!fn || !isOp('(')) throw new CalcError('invalid');
      p++;
      const args = [];
      if (!isOp(')')) {
        args.push(parseExpr());
        while (isOp(',')) { p++; args.push(parseExpr()); }
      }
      if (!isOp(')')) throw new CalcError('incomplete');
      p++;
      return fn(...args);
    }
    throw new CalcError('invalid');
  }

  const v = parseExpr();
  if (p < toks.length) throw new CalcError('invalid');
  return v;
}

function format(n) {
  const r = Number(n.toPrecision(15));
  if (Math.abs(r) >= 1e21 || (Math.abs(r) < 1e-7 && r !== 0)) return String(r);
  return String(r);
}

const ERRORS = {
  div0: 'Expression contains division by zero',
  incomplete: 'Expression wrong or incomplete (Did you forget some parentheses?)',
};

module.exports = {
  name: 'Calculator',
  keyword: '=',
  global: true,
  evaluate,
  query({ search, isKeyword }) {
    const src = search.trim().replace(/=$/, '').trim();
    if (!src) return [];
    // Without the keyword, only react to something that looks like math (not a bare number).
    if (!isKeyword && !(/[-+*/^%!×÷(]/.test(src.replace(/^[-+]/, '')) || /[a-z]+\s*\(/i.test(src)) ) return [];
    if (!isKeyword && /[^0-9a-z\s.,+\-*/^%!()×÷]/i.test(src)) return [];
    let value;
    try {
      value = evaluate(src);
    } catch (e) {
      if (isKeyword && e instanceof CalcError && ERRORS[e.message]) {
        return [{ title: ERRORS[e.message], subtitle: 'Calculator', icon: 'Calculator/calculator', score: 300, run: () => false }];
      }
      return [];
    }
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return isKeyword ? [{ title: 'Calculation result is not a valid number (NaN)', subtitle: 'Calculator', icon: 'Calculator/calculator', score: 300, run: () => false }] : [];
    }
    if (!Number.isFinite(value)) return [];
    const text = format(value);
    return [{
      title: text,
      subtitle: 'Copy this number to the clipboard',
      icon: 'Calculator/calculator',
      score: 300,
      run: () => { copy(text); },
    }];
  },
};
