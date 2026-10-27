const fs = require('fs');
const path = require('path');
const { spawnDetached } = require('../lib/util');
const { match } = require('../lib/match');

// Background helpers that have no window of their own, so they are not worth listing.
const HIDDEN = /runner|interface|host|service|update/i;

function installDirs() {
  return [
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'PowerToys'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'PowerToys'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'PowerToys'),
  ].filter(Boolean);
}

// PowerToys ships its modules as PowerToys.<Module>.exe, in the install folder or in WinUI3Apps on newer builds.
// The list is read from disk, so new modules show up without a code change.
function modules() {
  const found = [];
  for (const dir of installDirs()) {
    for (const folder of [dir, path.join(dir, 'WinUI3Apps')]) {
      let files;
      try { files = fs.readdirSync(folder); } catch { continue; }
      for (const f of files) {
        const m = /^PowerToys\.(.+)\.exe$/i.exec(f);
        if (!m || HIDDEN.test(m[1])) continue;
        found.push({
          title: m[1].replace(/UI$/, '').replace(/([a-z])([A-Z])/g, '$1 $2'),
          exe: path.join(folder, f),
        });
      }
    }
  }
  return found.sort((a, b) => a.title.localeCompare(b.title));
}

module.exports = {
  name: 'PowerToys',
  keyword: '@',
  global: false,
  query({ search }) {
    const list = modules();
    if (!list.length) {
      return [{ title: 'PowerToys is not installed', subtitle: 'Install PowerToys to launch its modules from here', icon: 'Folder/Warning', score: 200, run: () => false }];
    }
    if (!search) return list.map((m) => ({ title: m.title, subtitle: 'Launch PowerToys ' + m.title, iconFile: m.exe, score: 100, run: () => { spawnDetached(m.exe, [], { cwd: path.dirname(m.exe) }); } }));
    return list
      .map((m) => ({ m, hit: match(search, m.title) }))
      .filter((x) => x.hit)
      .map(({ m, hit }) => ({
        title: m.title,
        subtitle: 'Launch PowerToys ' + m.title,
        hl: hit.indexes,
        iconFile: m.exe,
        score: 200 + hit.score,
        run: () => { spawnDetached(m.exe, [], { cwd: path.dirname(m.exe) }); },
      }));
  },
};
