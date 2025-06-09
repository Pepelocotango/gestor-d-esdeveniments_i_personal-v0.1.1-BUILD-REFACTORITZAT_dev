// START OF FILE: ./main.js
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const APP_NAME = 'gestor-esdeveniments';
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.config', APP_NAME);
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.local', 'share', APP_NAME);
const DEFAULT_CACHE_DIR = path.join(os.homedir(), '.cache', APP_NAME);

let CONFIG_DIR = DEFAULT_CONFIG_DIR;
let DATA_DIR = DEFAULT_DATA_DIR;
let CACHE_DIR = DEFAULT_CACHE_DIR;

let SESSION_FILE;
let DATA_FILE;
let BACKUP_DIR;

// --- Funcions de gestió de directoris (sense canvis) ---
function checkWritePermissions(dir) {
  try {
    const testFile = path.join(dir, '.write-test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    return false;
  }
}

function getAlternativeDirectory(baseDir) {
  return path.join(app.getPath('userData'), baseDir);
}

function ensureDirectoriesExist() {
  const dirs = [
    { name: 'CONFIG_DIR', currentVal: CONFIG_DIR, defaultPath: DEFAULT_CONFIG_DIR, altBaseName: 'config' },
    { name: 'DATA_DIR', currentVal: DATA_DIR, defaultPath: DEFAULT_DATA_DIR, altBaseName: 'data' },
    { name: 'CACHE_DIR', currentVal: CACHE_DIR, defaultPath: DEFAULT_CACHE_DIR, altBaseName: 'cache' }
  ];

  dirs.forEach(dirInfo => {
    let chosenPath = dirInfo.defaultPath;
    try {
      if (!fs.existsSync(chosenPath)) {
        fs.mkdirSync(chosenPath, { recursive: true });
      }
      if (!checkWritePermissions(chosenPath)) {
        chosenPath = getAlternativeDirectory(dirInfo.altBaseName);
        if (!fs.existsSync(chosenPath)) {
          fs.mkdirSync(chosenPath, { recursive: true });
        }
        if (!checkWritePermissions(chosenPath)) {
             console.error(`FATAL: No s'han pogut establir permisos d'escriptura ni a ${dirInfo.defaultPath} ni a ${chosenPath}`);
             dialog.showErrorBox('Error Crític de Permisos', `No s'han pogut establir permisos d'escriptura per a ${dirInfo.name}. L'aplicació podria no funcionar correctament.`);
        } else {
          dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Canvi de directori',
            message: `No hi ha permisos per escriure a ${dirInfo.defaultPath}.\nS'utilitzarà ${chosenPath} per a ${dirInfo.name}.`
          });
        }
      }
    } catch (error) {
      console.error(`Error gestionant el directori ${dirInfo.name} (${chosenPath}):`, error);
      chosenPath = getAlternativeDirectory(dirInfo.altBaseName);
      try {
        if (!fs.existsSync(chosenPath)) {
          fs.mkdirSync(chosenPath, { recursive: true });
        }
         if (!checkWritePermissions(chosenPath)) {
            console.error(`FATAL: No s'han pogut establir permisos d'escriptura ni a ${dirInfo.defaultPath} ni a ${chosenPath} (fallback)`);
            dialog.showErrorBox('Error Crític de Permisos', `No s'han pogut establir permisos d'escriptura per a ${dirInfo.name} (fallback). L'aplicació podria no funcionar correctament.`);
        }
      } catch (fallbackError) {
         console.error(`Error crític creant directori alternatiu ${dirInfo.name}:`, fallbackError);
         dialog.showErrorBox('Error Crític de Directoris', `No s'ha pogut crear un directori funcional per a ${dirInfo.name}.`);
      }
    }
    if (dirInfo.name === 'CONFIG_DIR') CONFIG_DIR = chosenPath;
    if (dirInfo.name === 'DATA_DIR') DATA_DIR = chosenPath;
    if (dirInfo.name === 'CACHE_DIR') CACHE_DIR = chosenPath;
  });

  SESSION_FILE = path.join(CONFIG_DIR, 'session.json');
  DATA_FILE = path.join(DATA_DIR, 'events_data.json');
  BACKUP_DIR = path.join(DATA_DIR, 'backups');
}
// --- Fi de funcions de gestió de directoris ---


let mainWindow;
let isQuitting = false;

// --- Funcions de gestió de dades (sense canvis) ---
function loadSessionData() {
  if (!SESSION_FILE) return {};
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error carregant les dades de la sessió:', error);
  }
  return {};
}

async function saveDataWithErrorHandling(filePath, data) {
  if (!filePath) {
    console.error("filePath no està definit.");
    return false;
  }
  try {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    if (!checkWritePermissions(dirPath)) throw new Error(`No hi ha permisos d'escriptura a ${dirPath}`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Dades desades correctament a ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error guardant a ${filePath}:`, error);
    dialog.showMessageBoxSync({ type: 'error', title: 'Error guardant dades', message: `No s'han pogut guardar les dades a ${filePath}\nError: ${error.message}` });
    return false;
  }
}

async function saveSessionWindowData(data) {
  return saveDataWithErrorHandling(SESSION_FILE, data);
}

async function createBackup() {
  if (!DATA_FILE || !BACKUP_DIR) return false;
  try {
    if (fs.existsSync(DATA_FILE)) {
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
      if (!checkWritePermissions(BACKUP_DIR)) throw new Error(`No hi ha permisos d'escriptura a ${BACKUP_DIR}`);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(BACKUP_DIR, `backup-events_data-${timestamp}.json`);
      fs.copyFileSync(DATA_FILE, backupFile);
      console.log(`Còpia de seguretat creada a: ${backupFile}`);
      return true;
    }
  } catch (error) {
    console.error('Error creant còpia de seguretat:', error);
  }
  return false;
}
// --- Fi de funcions de gestió de dades ---

function createWindow() {
  ensureDirectoriesExist();
  const sessionData = loadSessionData();

  mainWindow = new BrowserWindow({
    width: sessionData.width || 1200,
    height: sessionData.height || 800,
    x: sessionData.x,
    y: sessionData.y,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.NODE_ENV === 'development') {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl).catch(err => {
      console.error('Error loading dev URL:', devUrl, err);
      dialog.showErrorBox('Error de Desenvolupament', `No s'ha pogut carregar ${devUrl}: ${err.message}`);
    });
  } else {
    const indexPath = path.resolve(__dirname, 'dist', 'index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Error loading production index file:', indexPath, err);
      dialog.showErrorBox('Error de Càrrega', `No s'ha pogut carregar l'aplicació: ${err.message}`);
    });
  }

  const template = [
    {
      label: 'Arxiu',
      submenu: [{ label: 'Sortir', accelerator: 'CmdOrCtrl+Q', click: () => { app.quit(); } }]
    },
    {
      label: 'Veure',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // >>> CANVI PRINCIPAL EN LA LÒGICA DE TANCAMENT <<<
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault(); // Prevenim que la finestra es tanqui directament
      app.quit(); // Iniciem el flux de sortida de l'aplicació
    }
  });
}

app.on('before-quit', async (event) => {
  if (isQuitting) {
    return; // Si ja estem sortint, no fem res i deixem que es tanqui
  }

  event.preventDefault(); // Aturem el primer intent de sortida

  // Desa la sessió de la finestra abans de mostrar el diàleg
  if (mainWindow && !mainWindow.isDestroyed()) {
    const windowBounds = mainWindow.getBounds();
    await saveSessionWindowData({
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y
    });
  }

  const choice = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Sí, sortir', 'No, cancel·lar'],
    defaultId: 1,
    title: 'Confirmar sortida',
    message: 'Estàs segur que vols sortir?',
    cancelId: 1,
  });

  if (choice.response === 0) { // Si l'usuari confirma la sortida
    isQuitting = true;

    // Primer, fem la còpia de seguretat.
    await createBackup();

    // Després, notifiquem al renderer que desi les seves dades.
    // Això es fa de forma asíncrona, no esperem resposta.
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('confirm-quit-signal');
    }
    
    // Donem un petit marge de temps al renderer per desar i després tanquem.
    // Això és més robust que esperar un senyal de tornada.
    setTimeout(() => {
      app.exit(); // Usem app.exit() per a un tancament més directe
    }, 1500); // 1.5 segons hauria de ser suficient per a l'escriptura a disc.
  }
});

// --- Gestors IPC i esdeveniments de l'App (sense canvis funcionals) ---
ipcMain.handle('load-app-data', async () => {
  if (!DATA_FILE) return null;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
      return fileContent.trim() ? JSON.parse(fileContent) : null;
    }
  } catch (error) {
    console.error('Error carregant les dades de l\'aplicació:', error);
    dialog.showErrorBox("Error de Càrrega", `No s'han pogut carregar les dades des de ${DATA_FILE}.\nError: ${error.message}`);
  }
  return null;
});

ipcMain.handle('save-app-data', (event, data) => saveDataWithErrorHandling(DATA_FILE, data));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

process.on('uncaughtException', (error) => {
  console.error('Excepció no capturada:', error);
  dialog.showErrorBox('Error Inesperat', `S'ha produït un error no controlat: ${error.message}`);
  app.exit(1);
});

app.whenReady().then(createWindow);
// END OF FILE: ./main.js