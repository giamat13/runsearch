const store = require('../lib/store');
const { match } = require('../lib/match');

const MAX = 50;

module.exports = {
  name: 'History',
  keyword: '!!',
  global: false,
  record(query) {
    const q = query.trim();
    if (!q || q.startsWith('!!')) return;
    const h = store.load('query-history', []);
    const i = h.indexOf(q);
    if (i >= 0) h.splice(i, 1);
    h.unshift(q);
    h.length = Math.min(h.length, MAX);
    store.save('query-history');
  },
  query({ search }) {
    const h = store.load('query-history', []);
    return h
      .map((q, i) => ({ q, i, m: search ? match(search, q) : { score: 10, indexes: [] } }))
      .filter((x) => x.m)
      .map((x) => ({
        title: x.q,
        subtitle: 'Select to run this query again',
        hl: x.m.indexes,
        icon: 'History/history',
        score: 200 + x.m.score - x.i / 100,
        run: () => ({ query: x.q }),
      }));
  },
};
