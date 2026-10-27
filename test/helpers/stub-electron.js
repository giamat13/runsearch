// Plugins and lib/util import 'electron' at load time. Tests run under plain Node, so 'electron' is replaced
// with this stub. Only the parts the tested modules touch are here.
const Module = require('module');
const fs = require('fs');
const os = require('os');
const path = require('path');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'runsearch-test-'));

const stub = {
  app: {
    getPath: () => userData,
    getFileIcon: async () => ({ toDataURL: () => '' }),
    isPackaged: false,
    getAppPath: () => process.cwd(),
  },
  clipboard: { writeText() {} },
  shell: { openPath() {}, readShortcutLink() { return {}; } },
  dialog: {},
  ipcMain: { on() {}, handle() {} },
};

const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'electron') return stub;
  return load.call(this, request, ...rest);
};

module.exports = stub;
