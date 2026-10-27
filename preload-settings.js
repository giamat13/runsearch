const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rsSettings', {
  get: () => ipcRenderer.invoke('settings:get'),
  save: (patch) => ipcRenderer.invoke('settings:save', patch),
  close: () => ipcRenderer.send('settings:close'),
});
