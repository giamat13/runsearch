const { spawn, execFile } = require('child_process');
const { clipboard, shell } = require('electron');

// Runs a PowerShell script and resolves with its stdout (UTF-8).
function ps(script, { timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const full = '[Console]::OutputEncoding=[Text.Encoding]::UTF8;$ProgressPreference="SilentlyContinue";' + script;
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(full, 'utf16le').toString('base64')],
      { timeout, windowsHide: true, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' },
      (err, stdout) => (err && !stdout ? reject(err) : resolve(stdout))
    );
  });
}

// Fire-and-forget PowerShell (no output needed), script passed encoded to avoid quoting problems.
function psDetached(script) {
  spawnDetached('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true });
}

function psQuote(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function spawnDetached(file, args = [], opts = {}) {
  const child = spawn(file, args, { detached: true, stdio: 'ignore', windowsHide: false, ...opts });
  child.on('error', () => {});
  child.unref();
}

function runAsAdmin(file, args = []) {
  const argList = args.length ? ` -ArgumentList ${args.map(psQuote).join(',')}` : '';
  psDetached(`Start-Process -FilePath ${psQuote(file)}${argList} -Verb RunAs`);
}

// Opens a visible console window (cmd) with the given arguments, e.g. ['/k'] or ['/c', 'dir'].
function openConsole(cmdArgs = ['/k'], cwd) {
  spawnDetached('cmd.exe', ['/c', 'start', '""', 'cmd.exe', ...cmdArgs], { cwd: cwd || process.env.USERPROFILE, windowsHide: true, windowsVerbatimArguments: true });
}

const copy = (text) => clipboard.writeText(String(text));
const openPath = (p) => shell.openPath(p);

function expandEnv(p) {
  return p.replace(/%([^%]+)%/g, (m, n) => process.env[n] ?? m).replace(/^~(?=[\\/]|$)/, process.env.USERPROFILE || '~');
}

module.exports = { ps, psDetached, psQuote, spawnDetached, runAsAdmin, openConsole, copy, openPath, expandEnv };
