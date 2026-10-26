// Fuzzy matcher in the spirit of Wox's StringMatcher: returns a score and the matched character indexes.
function match(query, text) {
  const q = query.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!q) return { score: 1, indexes: [] };
  const t = text.toLowerCase();

  const at = t.indexOf(q);
  if (at >= 0) {
    let score = 90 - Math.min(at, 30);
    if (at === 0) score += 10;
    else if (/[\s\-_.\\/]/.test(t[at - 1])) score += 5;
    if (q.length === t.length) score = 110;
    return { score, indexes: Array.from({ length: q.length }, (_, i) => at + i) };
  }

  // Subsequence match preferring word starts and consecutive runs.
  const indexes = [];
  let ti = 0;
  let consecutive = 0;
  let score = 40;
  for (const c of q) {
    if (c === ' ') continue;
    let found = -1;
    for (let i = ti; i < t.length; i++) {
      if (t[i] === c) { found = i; break; }
    }
    if (found < 0) return null;
    if (found === ti && indexes.length) { consecutive++; score += 2 + consecutive; }
    else consecutive = 0;
    if (found === 0 || /[\s\-_.]/.test(t[found - 1])) score += 4;
    indexes.push(found);
    ti = found + 1;
  }
  score -= Math.min(indexes[indexes.length - 1] - indexes[0] - q.length, 25);
  return { score: Math.max(score, 5), indexes };
}

module.exports = { match };
