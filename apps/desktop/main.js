const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("path");

const API_BASE = process.env.VID2KNOW_URL || "http://127.0.0.1:8080";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "影知 Vid2Know",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(API_BASE);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("pick-directory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("pick-cookies-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Cookies", extensions: ["txt"] },
      { name: "All", extensions: ["*"] },
    ],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("get-api-base", async () => API_BASE);

ipcMain.handle("open-path", async (_event, target) => {
  if (!target || typeof target !== "string") return false;
  // shell.openPath returns "" on success, or an error string on failure.
  const result = await shell.openPath(target);
  if (result) {
    return result;
  }
  return true;
});
