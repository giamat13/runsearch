const { copy } = require('../lib/util');
const { match } = require('../lib/match');

const pad = (n, l = 2) => String(n).padStart(l, '0');

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

function dayOfYear(d) {
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
}

function entries(now) {
  const L = 'en-US';
  const date = now.toLocaleDateString(L);
  const time = now.toLocaleTimeString(L);
  const longDate = now.toLocaleDateString(L, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const offset = -now.getTimezoneOffset();
  const tz = `UTC${offset >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  const isoLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return [
    { v: time, label: 'Time', keys: ['time', 'now'], icon: 'time' },
    { v: date, label: 'Date', keys: ['date', 'now'], icon: 'calendar' },
    { v: `${time} ${date}`, label: 'Now', keys: ['now'], icon: 'timeDate' },
    { v: longDate, label: 'Date (long)', keys: ['date', 'long'], icon: 'calendar' },
    { v: isoLocal, label: 'Date and time, ISO 8601', keys: ['iso', 'now', 'date', 'time'], icon: 'timeDate' },
    { v: now.toISOString(), label: 'Date and time, UTC (ISO 8601)', keys: ['utc', 'iso', 'now'], icon: 'timeDate' },
    { v: now.toUTCString(), label: 'Date and time, UTC (RFC 1123)', keys: ['utc', 'rfc', 'now'], icon: 'timeDate' },
    { v: String(Math.floor(now.getTime() / 1000)), label: 'Unix epoch time', keys: ['unix', 'epoch', 'timestamp'], icon: 'timeDate' },
    { v: String(now.getTime()), label: 'Unix epoch time in milliseconds', keys: ['unix', 'epoch', 'ms', 'timestamp'], icon: 'timeDate' },
    { v: now.toLocaleDateString(L, { weekday: 'long' }), label: 'Day of the week', keys: ['day', 'week', 'weekday'], icon: 'calendar' },
    { v: String(now.getDate()), label: 'Day of the month', keys: ['day', 'month'], icon: 'calendar' },
    { v: String(dayOfYear(now)), label: 'Day of the year', keys: ['day', 'year'], icon: 'calendar' },
    { v: String(isoWeek(now)), label: 'Week of the year (ISO)', keys: ['week', 'year'], icon: 'calendar' },
    { v: String(Math.floor(now.getMonth() / 3) + 1), label: 'Quarter of the year', keys: ['quarter', 'year'], icon: 'calendar' },
    { v: now.toLocaleDateString(L, { month: 'long' }), label: 'Month', keys: ['month'], icon: 'calendar' },
    { v: String(now.getFullYear()), label: 'Year', keys: ['year'], icon: 'calendar' },
    { v: tz, label: 'Time zone offset', keys: ['zone', 'utc', 'time'], icon: 'time' },
    { v: `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`, label: 'Date and time (file name safe)', keys: ['file', 'now', 'date', 'time'], icon: 'timeDate' },
  ];
}

module.exports = {
  name: 'Timeanddate',
  keyword: ')',
  global: true,
  query({ search, isKeyword }) {
    const s = search.trim().toLowerCase();
    if (!s && !isKeyword) return [];
    const list = entries(new Date());
    const out = [];
    for (const e of list) {
      let score = 0;
      if (!s) score = 100;
      else if (isKeyword) { const m = match(s, e.label + ' ' + e.keys.join(' ')); if (m) score = m.score; }
      else if (e.keys.includes(s) || e.label.toLowerCase() === s) score = 100; // global: exact keyword only
      if (!score) continue;
      out.push({
        title: e.v,
        subtitle: `${e.label} - Select to copy this value`,
        icon: `TimeDate/${e.icon}`,
        score: 150 + score / 10,
        run: () => { copy(e.v); },
      });
    }
    return out;
  },
};
