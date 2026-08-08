const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vid2know", {
  platform: process.platform,
  pickDirectory: () => ipcRenderer.invoke("pick-directory"),
  pickCookiesFile: () => ipcRenderer.invoke("pick-cookies-file"),
  getApiBase: () => ipcRenderer.invoke("get-api-base"),
});
