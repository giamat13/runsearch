// Joins WindowsSettings.json with Resources.resx English strings -> data/windows-settings.json
const fs = require('fs');
const dir = process.argv[2];
const out = process.argv[3];
const res = fs.readFileSync(dir + '/Properties/Resources.resx', 'utf8');
const strings = {};
for (const m of res.matchAll(/<data name="([^"]+)"[^>]*>\s*<value>([\s\S]*?)<\/value>/g)) strings[m[1]] = m[2].trim();
const json = JSON.parse(fs.readFileSync(dir + '/WindowsSettings.json', 'utf8').replace(/^﻿/, ''));
const tr = (k) => strings[k] || k;
const list = json.Settings.map((s) => ({
  name: tr(s.Name),
  areas: (s.Areas || []).map(tr),
  type: s.Type,
  altNames: (s.AltNames || []).map(tr),
  command: s.Command,
  note: s.Note ? tr(s.Note) : undefined,
  first: !!s.ShowAsFirstResult,
  deprecated: !!s.DeprecatedInBuild || undefined,
}));
fs.writeFileSync(out, JSON.stringify(list));
console.log('settings:', list.length, 'missing strings:', list.filter((s) => s.name === s.name.replace(/\s/g, '') && !strings[s.name] && /^[A-Z][A-Za-z]+$/.test(s.name)).length);
