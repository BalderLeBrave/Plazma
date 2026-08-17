const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

/* Stockage persistant : un seul fichier JSON dans le dossier de l'utilisateur.
   C:\Users\<toi>\AppData\Roaming\metre-platrerie\donnees.json */
const fichier = () => path.join(app.getPath("userData"), "donnees.json");
let cache = null;
let minuteur = null;

function lire() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(fichier(), "utf8")); } catch { cache = {}; }
  return cache;
}
function ecrire() {
  clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    try { fs.writeFileSync(fichier(), JSON.stringify(cache)); } catch (e) { console.error(e); }
  }, 200);
}
function vider() {
  clearTimeout(minuteur);
  if (cache) { try { fs.writeFileSync(fichier(), JSON.stringify(cache)); } catch (e) { console.error(e); } }
}

ipcMain.handle("storage:get", (e, key) => {
  const d = lire();
  if (!(key in d)) throw new Error("cle absente");
  return { key, value: d[key] };
});
ipcMain.handle("storage:set", (e, key, value) => { lire()[key] = value; ecrire(); return { key, value }; });
ipcMain.handle("storage:delete", (e, key) => { delete lire()[key]; ecrire(); return { key, deleted: true }; });
ipcMain.handle("storage:list", (e, prefix = "") => ({ keys: Object.keys(lire()).filter((k) => k.startsWith(prefix)), prefix }));

function creerFenetre() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 700,
    backgroundColor: "#F2F2F0", title: "PLAZMA — Metre Platrerie", autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(creerFenetre);
app.on("before-quit", vider);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) creerFenetre(); });
