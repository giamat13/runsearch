const { ps, psDetached, psQuote, spawnDetached } = require('../lib/util');
const { match } = require('../lib/match');

let cache = { at: 0, list: [] };

async function load() {
  if (Date.now() - cache.at < 5000) return cache.list;
  const out = await ps('Get-Service | Select-Object Name,DisplayName,@{n="Status";e={"$($_.Status)"}},@{n="StartType";e={"$($_.StartType)"}} | ConvertTo-Json -Compress', { timeout: 15000 }).catch(() => '[]');
  cache = { at: Date.now(), list: [].concat(JSON.parse(out || '[]')) };
  return cache.list;
}

const admin = (verb, name) => psDetached(`Start-Process powershell -Verb RunAs -WindowStyle Hidden -ArgumentList '-NoProfile','-Command','${verb}-Service -Name ${name.replace(/'/g, "''")}'`);

module.exports = {
  name: 'Service',
  keyword: '!',
  global: false,
  async query({ search }) {
    const list = await load();
    const out = [];
    for (const s of list) {
      const m = search ? (match(search, s.DisplayName) || match(search, s.Name)) : { score: 10, indexes: [] };
      if (!m) continue;
      const running = s.Status === 'Running';
      out.push({
        title: s.DisplayName,
        subtitle: `${s.Status} - Startup: ${s.StartType} - Name: ${s.Name}`,
        hl: match(search || '', s.DisplayName)?.indexes,
        icon: 'Service/service',
        score: 200 + m.score,
        run: () => { admin(running ? 'Stop' : 'Start', s.Name); cache.at = 0; },
        menu: [
          { title: running ? 'Stop (Enter)' : 'Start (Enter)', glyph: running ? '' : '', key: 'ctrl+shift+s', run: () => { admin(running ? 'Stop' : 'Start', s.Name); cache.at = 0; } },
          { title: 'Restart (Ctrl+R)', glyph: '', key: 'ctrl+r', run: () => { admin('Restart', s.Name); cache.at = 0; } },
          { title: 'Open services (Ctrl+O)', glyph: '', key: 'ctrl+o', run: () => spawnDetached('mmc.exe', ['services.msc']) },
        ],
      });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 30);
  },
};
