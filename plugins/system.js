const os = require('os');
const { dialog } = require('electron');
const { spawnDetached, ps, copy } = require('../lib/util');
const { match } = require('../lib/match');

const CONFIRM = true; // PowerToys Run default: confirm system commands

const COMMANDS = [
  { title: 'Shutdown', sub: 'Shutdown computer', confirm: 'You are about to shut down this computer, are you sure?', icon: 'System/shutdown', run: () => spawnDetached('shutdown', ['/s', '/t', '0'], { windowsHide: true }) },
  { title: 'Restart', sub: 'Restart computer', confirm: 'You are about to restart this computer, are you sure?', icon: 'System/restart', run: () => spawnDetached('shutdown', ['/r', '/t', '0'], { windowsHide: true }) },
  { title: 'Sign out', sub: 'Sign out of computer', confirm: 'You are about to sign out of this computer, are you sure?', icon: 'System/logoff', run: () => spawnDetached('shutdown', ['/l'], { windowsHide: true }) },
  { title: 'Lock', sub: 'Lock computer', confirm: 'You are about to lock this computer, are you sure?', icon: 'System/lock', run: () => spawnDetached('rundll32.exe', ['user32.dll,LockWorkStation'], { windowsHide: true }) },
  { title: 'Sleep', sub: 'Put computer to sleep', confirm: 'You are about to put this computer to sleep, are you sure?', icon: 'System/sleep', run: () => spawnDetached('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0'], { windowsHide: true }) },
  { title: 'Hibernate', sub: 'Hibernate computer', confirm: 'You are about to put this computer into hibernation, are you sure?', icon: 'System/sleep', run: () => spawnDetached('shutdown', ['/h'], { windowsHide: true }) },
  { title: 'UEFI firmware settings', sub: 'Reboot computer into UEFI firmware settings (Requires administrative permissions)', confirm: 'You are about to reboot this computer into UEFI firmware settings menu, are you sure?', icon: 'System/firmwareSettings', run: () => spawnDetached('shutdown', ['/r', '/fw', '/t', '0'], { windowsHide: true }) },
];

function networkResults(search) {
  const out = [];
  const wantsAny = /^(ip|ipv4|ipv6|mac|address|network)/i.test(search);
  if (!wantsAny) return out;
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.internal) continue;
      const v6 = a.family === 'IPv6' || a.family === 6;
      if (v6 && !/ipv6|ip$/i.test(search) && !/^(ip|network|address)/i.test(search)) continue;
      const isMac = /^mac/i.test(search);
      if (isMac) continue;
      out.push({
        title: a.address.replace(/%.*$/, ''),
        subtitle: `${v6 ? 'IPv6' : 'IPv4'} address of ${name} - Select to copy`,
        icon: 'System/networkAdapter',
        score: 200,
        run: () => { copy(a.address.replace(/%.*$/, '')); },
      });
    }
  }
  if (/^(mac|address|network)/i.test(search)) {
    const seen = new Set();
    for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
      for (const a of addrs || []) {
        if (a.internal || !a.mac || a.mac === '00:00:00:00:00:00' || seen.has(name)) continue;
        seen.add(name);
        const mac = a.mac.toUpperCase().replace(/:/g, '-');
        out.push({ title: mac, subtitle: `MAC address of ${name} - Select to copy`, icon: 'System/networkAdapter', score: 190, run: () => { copy(mac); } });
      }
    }
  }
  return out;
}

async function confirm(c) {
  if (!CONFIRM) return true;
  const { response } = await dialog.showMessageBox({
    type: 'question', title: 'Please confirm.', message: c.confirm, buttons: ['Yes', 'No'], defaultId: 1, cancelId: 1, noLink: true,
  });
  return response === 0;
}

module.exports = {
  name: 'SystemCommands',
  keyword: '',
  global: true,
  query({ search }) {
    if (!search) return [];
    const out = [];
    for (const c of COMMANDS) {
      const m = match(search, c.title);
      if (!m || m.score < 60) continue;
      out.push({ title: c.title, subtitle: c.sub, hl: m.indexes, icon: c.icon, score: 300 + m.score, run: async () => { if (await confirm(c)) c.run(); } });
    }
    const rb = match(search, 'Recycle Bin');
    if (rb && rb.score >= 60) {
      out.push(
        { title: 'Open Recycle Bin', subtitle: 'Open the Recycle Bin', icon: 'System/recyclebin', score: 300 + rb.score, run: () => spawnDetached('explorer.exe', ['shell:RecycleBinFolder']) },
        { title: 'Empty Recycle Bin', subtitle: 'Empty Recycle Bin', icon: 'System/recyclebin', score: 299 + rb.score, run: async () => { await ps('Clear-RecycleBin -Force -ErrorAction SilentlyContinue'); } },
      );
    }
    return out.concat(networkResults(search));
  },
};
