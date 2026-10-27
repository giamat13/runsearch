const { ps, psDetached, psQuote } = require('../lib/util');
const { match } = require('../lib/match');

const TTL = 60 * 1000;

// Reads every page from the desktop OneNote app over COM (HierarchyScope 4 = pages).
// One output line per page: id, notebook, section, title, separated by tabs.
const SCRIPT = [
  '$app = New-Object -ComObject OneNote.Application',
  "$xml = ''",
  "$app.GetHierarchy('', 4, [ref]$xml)",
  '$doc = [xml]$xml',
  "foreach ($p in $doc.SelectNodes('//*[local-name()=\"Page\"]')) {",
  "  $nb = $p.SelectSingleNode('ancestor::*[local-name()=\"Notebook\"][1]')",
  "  $nbName = if ($nb) { $nb.name } else { '' }",
  '  Write-Output ($p.ID + "`t" + $nbName + "`t" + $p.ParentNode.name + "`t" + $p.name)',
  '}',
].join('\n');

let pages = [];
let loadedAt = 0;
let loading = null;

function parse(out) {
  return out.split(/\r?\n/).filter(Boolean).map((line) => {
    const [id, notebook, section, ...rest] = line.split('\t');
    return { id, notebook, section, title: rest.join('\t') || '(untitled page)' };
  }).filter((p) => p.id);
}

// Concurrent queries share one COM read, and the list is reused for a minute.
function load() {
  if (loadedAt && Date.now() - loadedAt < TTL) return Promise.resolve(pages);
  if (!loading) {
    loading = ps(SCRIPT, { timeout: 30000 })
      .then((out) => { pages = parse(out); loadedAt = Date.now(); return pages; })
      .finally(() => { loading = null; });
  }
  return loading;
}

module.exports = {
  name: 'OneNote',
  keyword: 'o:',
  global: false,
  async query({ search }) {
    if (!search) return [];
    let list;
    try {
      list = await load();
    } catch {
      return [{ title: 'OneNote is not available', subtitle: 'This search needs the desktop version of OneNote', icon: 'Folder/Warning', score: 200, run: () => false }];
    }
    return list
      .map((p) => ({ p, hit: match(search, p.title) }))
      .filter((x) => x.hit)
      .sort((a, b) => b.hit.score - a.hit.score)
      .slice(0, 40)
      .map(({ p, hit }) => ({
        title: p.title,
        subtitle: [p.notebook, p.section].filter(Boolean).join(' - ') + ' - Select to open in OneNote',
        hl: hit.indexes,
        score: 200 + hit.score,
        run: () => { psDetached('$app = New-Object -ComObject OneNote.Application; $app.NavigateTo(' + psQuote(p.id) + ", '', $false)"); },
      }));
  },
};
