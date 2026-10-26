const path = require('path');
const { shell } = require('electron');
const { ps, copy, openConsole } = require('../lib/util');

// Windows Search index via the Search.CollatorDSO OLE DB provider.
function search(term) {
  const safe = term.replace(/'/g, "''").replace(/[%_\[]/g, (c) => `[${c}]`);
  const script = `
$c = New-Object -ComObject ADODB.Connection
$c.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows';")
$r = $c.Execute("SELECT TOP 30 System.ItemPathDisplay, System.ItemType FROM SystemIndex WHERE System.FileName LIKE '%${safe.replace(/"/g, '""')}%' AND System.ItemPathDisplay IS NOT NULL ORDER BY System.DateModified DESC")
$rows = @()
while (-not $r.EOF) { $rows += [pscustomobject]@{ p = $r.Fields.Item(0).Value; t = $r.Fields.Item(1).Value }; $r.MoveNext() }
$c.Close()
ConvertTo-Json -Compress -InputObject @($rows)`;
  return ps(script, { timeout: 8000 }).then((o) => JSON.parse(o || '[]')).catch(() => []);
}

module.exports = {
  name: 'WindowsIndexer',
  keyword: '?',
  global: false,
  async query({ search: term }) {
    if (term.trim().length < 2) return [];
    const rows = await search(term.trim());
    return rows.map((r, i) => ({
      title: path.basename(r.p),
      subtitle: r.p,
      iconFile: r.p,
      score: 300 - i,
      run: () => { shell.openPath(r.p); },
      menu: [
        { title: 'Copy path (Ctrl+C)', glyph: '', key: 'ctrl+c', run: () => { copy(r.p); } },
        { title: 'Open containing folder (Ctrl+Shift+E)', glyph: '', key: 'ctrl+shift+e', run: () => shell.showItemInFolder(r.p) },
        { title: 'Open path in console (Ctrl+Shift+C)', glyph: '', key: 'ctrl+shift+c', run: () => openConsole(['/k'], path.dirname(r.p)) },
      ],
    }));
  },
};
