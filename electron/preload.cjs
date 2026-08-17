const { contextBridge, ipcRenderer } = require("electron");

/* Seule surface exposee au rendu : les quatre operations de stockage. */
contextBridge.exposeInMainWorld("electronStorage", {
  get: (key) => ipcRenderer.invoke("storage:get", key),
  set: (key, value) => ipcRenderer.invoke("storage:set", key, value),
  delete: (key) => ipcRenderer.invoke("storage:delete", key),
  list: (prefix) => ipcRenderer.invoke("storage:list", prefix),
});
