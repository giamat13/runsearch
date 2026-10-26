const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { copy } = require('../lib/util');

// Each category: base unit factor table. Value in base = value * factor. Temperature is handled separately.
const CATEGORIES = {
  Length: { // metre
    m: 1, meter: 1, meters: 1, metre: 1, metres: 1,
    mm: 0.001, millimeter: 0.001, millimeters: 0.001, cm: 0.01, centimeter: 0.01, centimeters: 0.01,
    km: 1000, kilometer: 1000, kilometers: 1000, um: 1e-6, micron: 1e-6, microns: 1e-6, nm: 1e-9,
    in: 0.0254, inch: 0.0254, inches: 0.0254, '"': 0.0254,
    ft: 0.3048, foot: 0.3048, feet: 0.3048, "'": 0.3048,
    yd: 0.9144, yard: 0.9144, yards: 0.9144,
    mi: 1609.344, mile: 1609.344, miles: 1609.344, nmi: 1852, ly: 9.4607304725808e15,
  },
  Mass: { // kilogram
    kg: 1, kilogram: 1, kilograms: 1, g: 0.001, gram: 0.001, grams: 0.001, mg: 1e-6, milligram: 1e-6, milligrams: 1e-6,
    t: 1000, tonne: 1000, tonnes: 1000, lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237, pounds: 0.45359237,
    oz: 0.028349523125, ounce: 0.028349523125, ounces: 0.028349523125, st: 6.35029318, stone: 6.35029318,
  },
  Volume: { // litre
    l: 1, liter: 1, liters: 1, litre: 1, litres: 1, ml: 0.001, milliliter: 0.001, milliliters: 0.001, cl: 0.01, dl: 0.1,
    m3: 1000, cm3: 0.001, cc: 0.001,
    tsp: 0.00492892159375, teaspoon: 0.00492892159375, teaspoons: 0.00492892159375,
    tbsp: 0.01478676478125, tablespoon: 0.01478676478125, tablespoons: 0.01478676478125,
    floz: 0.0295735295625, cup: 0.2365882365, cups: 0.2365882365, pt: 0.473176473, pint: 0.473176473, pints: 0.473176473,
    qt: 0.946352946, quart: 0.946352946, quarts: 0.946352946, gal: 3.785411784, gallon: 3.785411784, gallons: 3.785411784,
  },
  Speed: { // m/s
    'm/s': 1, mps: 1, 'km/h': 1 / 3.6, kph: 1 / 3.6, kmh: 1 / 3.6, mph: 0.44704, 'mi/h': 0.44704,
    kn: 0.514444444, knot: 0.514444444, knots: 0.514444444, 'ft/s': 0.3048, fps: 0.3048,
  },
  Area: { // m2
    m2: 1, sqm: 1, mm2: 1e-6, cm2: 1e-4, km2: 1e6, ha: 10000, hectare: 10000, hectares: 10000,
    in2: 0.00064516, ft2: 0.09290304, sqft: 0.09290304, yd2: 0.83612736, mi2: 2589988.110336, ac: 4046.8564224, acre: 4046.8564224, acres: 4046.8564224,
  },
  Energy: { // joule
    j: 1, joule: 1, joules: 1, kj: 1000, mj: 1e6, cal: 4.184, kcal: 4184, wh: 3600, kwh: 3.6e6, btu: 1055.05585262, ev: 1.602176634e-19,
  },
  Power: { // watt
    w: 1, watt: 1, watts: 1, kw: 1000, mw: 1e6, hp: 745.69987158227, ps: 735.49875,
  },
  Pressure: { // pascal
    pa: 1, kpa: 1000, mpa: 1e6, bar: 1e5, mbar: 100, atm: 101325, psi: 6894.757293168, mmhg: 133.322387415, torr: 133.322387415,
  },
  Information: { // bit
    bit: 1, bits: 1, b: 8, byte: 8, bytes: 8, kb: 8000, mb: 8e6, gb: 8e9, tb: 8e12, pb: 8e15,
    kib: 8192, mib: 8 * 1048576, gib: 8 * 1073741824, tib: 8 * 1099511627776,
  },
  Angle: { // degree
    deg: 1, degree: 1, degrees: 1, '°': 1, rad: 180 / Math.PI, radian: 180 / Math.PI, radians: 180 / Math.PI,
    grad: 0.9, gon: 0.9, turn: 360, turns: 360, arcmin: 1 / 60, arcsec: 1 / 3600,
  },
  Duration: { // second
    s: 1, sec: 1, second: 1, seconds: 1, ms: 0.001, millisecond: 0.001, milliseconds: 0.001, min: 60, minute: 60, minutes: 60,
    h: 3600, hr: 3600, hour: 3600, hours: 3600, d: 86400, day: 86400, days: 86400, wk: 604800, week: 604800, weeks: 604800,
    month: 2629746, months: 2629746, yr: 31556952, year: 31556952, years: 31556952,
  },
};

const TEMP = { c: 'C', celsius: 'C', '°c': 'C', f: 'F', fahrenheit: 'F', '°f': 'F', k: 'K', kelvin: 'K' };
const toKelvin = { C: (v) => v + 273.15, F: (v) => ((v - 32) * 5) / 9 + 273.15, K: (v) => v };
const fromKelvin = { C: (v) => v - 273.15, F: (v) => ((v - 273.15) * 9) / 5 + 32, K: (v) => v };

const LABELS = { C: '°C', F: '°F', K: 'K' };

// Currency (not part of PowerToys Run - added for runsearch). Rates come from the ECB via frankfurter.dev.
const CURRENCY_ALIASES = {
  $: 'USD', dollar: 'USD', dollars: 'USD', '€': 'EUR', euro: 'EUR', euros: 'EUR', '£': 'GBP', pound: 'GBP_', '₪': 'ILS',
  shekel: 'ILS', shekels: 'ILS', nis: 'ILS', '¥': 'JPY', yen: 'JPY', '₹': 'INR', '₩': 'KRW', '฿': 'THB',
};
let rates = null; // { base: 'EUR', rates: {USD: 1.08, ...}, fetchedAt }
let ratesPromise = null;
const cacheFile = () => path.join(app.getPath('userData'), 'rates.json');

function loadRates() {
  if (rates && Date.now() - rates.fetchedAt < 6 * 3600e3) return Promise.resolve(rates);
  if (ratesPromise) return ratesPromise;
  if (!rates) {
    try { rates = JSON.parse(fs.readFileSync(cacheFile(), 'utf8')); } catch { /* no cache yet */ }
    if (rates && Date.now() - rates.fetchedAt < 6 * 3600e3) return Promise.resolve(rates);
  }
  ratesPromise = fetch('https://api.frankfurter.dev/v1/latest?base=EUR', { signal: AbortSignal.timeout(5000) })
    .then((r) => r.json())
    .then((j) => {
      rates = { base: 'EUR', rates: { EUR: 1, ...j.rates }, fetchedAt: Date.now(), date: j.date };
      try { fs.writeFileSync(cacheFile(), JSON.stringify(rates)); } catch { /* ignore */ }
      return rates;
    })
    .catch(() => rates)
    .finally(() => { ratesPromise = null; });
  return ratesPromise;
}

function currencyCode(u) {
  const x = u.trim();
  if (CURRENCY_ALIASES[x.toLowerCase()] && CURRENCY_ALIASES[x.toLowerCase()] !== 'GBP_') return CURRENCY_ALIASES[x.toLowerCase()];
  if (/^[a-z]{3}$/i.test(x)) return x.toUpperCase();
  return null;
}

function findUnit(u) {
  const key = u.trim().toLowerCase().replace(/\s+/g, '').replace(/^(square|sq)/, 'sq');
  if (TEMP[key]) return { cat: 'Temperature', id: TEMP[key] };
  for (const [cat, table] of Object.entries(CATEGORIES)) {
    if (key in table) return { cat, id: key, factor: table[key] };
  }
  return null;
}

function fmt(n) {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  let s = abs !== 0 && (abs >= 1e15 || abs < 1e-6) ? n.toPrecision(6) : String(Number(n.toPrecision(10)));
  if (/e/.test(s)) s = String(Number(s));
  return s;
}

const INPUT = /^\s*(-?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?)\s*([^\s\d][^]*?)\s+(?:in|to|=|->|as)\s+([^\s][^]*?)\s*$/i;

// Quick format: "50ils2usd" / "50 ils 2 usd" - the digit 2 stands for "to".
const COMPACT = /^\s*(-?\d+(?:[.,]\d+)?)\s*([^\d\s]+?)\s*2\s*([^\d\s]+)\s*$/i;

module.exports = {
  name: 'UnitConverter',
  keyword: '%%',
  global: true,
  async query({ search }) {
    const m = INPUT.exec(search) || COMPACT.exec(search);
    if (!m) return [];
    const value = parseFloat(m[1].replace(',', '.'));
    const fromRaw = m[2], toRaw = m[3];

    const a = findUnit(fromRaw), b = findUnit(toRaw);
    if (a && b && a.cat === b.cat) {
      let out, label;
      if (a.cat === 'Temperature') {
        out = fromKelvin[b.id](toKelvin[a.id](value));
        label = LABELS[b.id];
      } else {
        out = (value * a.factor) / b.factor;
        label = toRaw.trim();
      }
      return [result(`${fmt(out)} ${label}`, `${fmt(value)} ${fromRaw.trim()} = ${fmt(out)} ${label}`, 'UnitConverter/unitconverter')];
    }

    const ca = currencyCode(fromRaw), cb = currencyCode(toRaw);
    if (ca && cb && ca !== cb) {
      const r = await loadRates();
      if (!r || !r.rates[ca] || !r.rates[cb]) return [];
      const out = (value / r.rates[ca]) * r.rates[cb];
      const text = `${out.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${cb}`;
      const copyText = out.toFixed(2);
      return [{
        title: text,
        subtitle: `${fmt(value)} ${ca} = ${text} (ECB rate, ${r.date || new Date(r.fetchedAt).toISOString().slice(0, 10)})`,
        icon: 'UnitConverter/unitconverter',
        score: 250,
        run: () => { copy(copyText); },
        menu: [],
      }];
    }
    return [];
  },
};

function result(title, subtitle, icon) {
  const text = title;
  return {
    title,
    subtitle: `Copy ${text} to clipboard`,
    tooltip: subtitle,
    icon,
    score: 250,
    run: () => { copy(text.replace(/ .*$/, '')); },
  };
}
