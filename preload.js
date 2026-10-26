const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rs', {
  query: (text) => ipcRenderer.send('query', text),
  run: (id, menu) => ipcRenderer.send('run', { id, menu }),
  resize: (h) => ipcRenderer.send('resize', h),
  hide: () => ipcRenderer.send('hide'),
  on: (channel, cb) => ipcRenderer.on(channel, (_e, data) => cb(data)),
});
