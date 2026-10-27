// Picks the plugins that answer a query. A plugin keyword at the start of the query makes that plugin the only one to run.
function route(plugins, text) {
  const keyed = plugins.filter((p) => p.keyword).sort((a, b) => b.keyword.length - a.keyword.length);
  for (const p of keyed) {
    // A single letter or digit is not a keyword, so ordinary text starting with it still searches everywhere.
    if (text.startsWith(p.keyword) && (p.keyword.length > 1 || !/^[a-z0-9]/i.test(p.keyword))) {
      return { plugins: [p], search: text.slice(p.keyword.length).trimStart(), isKeyword: true };
    }
  }
  return { plugins: plugins.filter((p) => p.global), search: text.trim(), isKeyword: false };
}

module.exports = { route };
