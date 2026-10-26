const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const cache = {};
const file = (name) => path.join(app.getPath('userData'), name + '.json');

function load(name, fallback) {
  if (!(name in cache)) {
    try { cache[name] = JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { cache[name] = fallback; }
  }
  return cache[name];
}

function save(name) {
  try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(file(name), JSON.stringify(cache[name])); } catch { /* ignore */ }
}

module.exports = { load, save };
