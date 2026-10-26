const { ps, psDetached, spawnDetached } = require('../lib/util');
const { match } = require('../lib/match');

let cache = { at: 0, list: [] };
let pending = null;

const SCRIPT = `
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class RsWin { [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); }
"@ -ErrorAction SilentlyContinue
`;

function refresh() {
  if (pending) return pending;
  pending = ps('Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object Id,ProcessName,MainWindowTitle,MainWindowHandle | ConvertTo-Json -Compress', { timeout: 10000 })
    .then((out) => {
      const list = [].concat(JSON.parse(out || '[]'));
      cache = { at: Date.now(), list: list.map((p) => ({ pid: p.Id, proc: p.ProcessName, title: p.MainWindowTitle, hwnd: Number(p.MainWindowHandle) })) };
    })
    .catch(() => {})
    .finally(() => { pending = null; });
  return pending;
}

module.exports = {
  name: 'WindowWalker',
  keyword: '<',
  global: true,
  init: refresh,
  refresh,
  async query({ search, isKeyword }) {
    if (!search && !isKeyword) return [];
    if (Date.now() - cache.at > 3000) { if (!cache.at) await refresh(); else refresh(); }
    const out = [];
    for (const w of cache.list) {
      const m = search ? (match(search, w.title) || match(search, w.proc)) : { score: 10, indexes: [] };
      if (!m) continue;
      out.push({
        title: w.title,
        subtitle: `Running: ${w.proc}`,
        hl: match(search || '', w.title)?.indexes,
        icon: 'WindowWalker/windowwalker',
        score: (isKeyword ? 200 : 30) + m.score / 10, // below programs in global results
        run: () => {
          psDetached(`${SCRIPT};[RsWin]::ShowWindow([IntPtr]${w.hwnd},9)|Out-Null;[RsWin]::SetForegroundWindow([IntPtr]${w.hwnd})|Out-Null`);
        },
        menu: [
          { title: 'Close window (Ctrl+F4)', glyph: '', key: 'ctrl+f4', run: () => psDetached(`(Get-Process -Id ${w.pid}).CloseMainWindow()`) },
          { title: 'Kill process (Ctrl+Delete)', glyph: '', key: 'ctrl+delete', run: () => spawnDetached('taskkill', ['/PID', String(w.pid), '/F'], { windowsHide: true }) },
        ],
      });
    }
    return out.slice(0, 15);
  },
};
