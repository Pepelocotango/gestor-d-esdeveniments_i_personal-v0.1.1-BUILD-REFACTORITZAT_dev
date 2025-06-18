const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { google } = require('googleapis');
const url = require('url');
const http = require('http');

const APP_NAME = 'gestor-esdeveniments';
const CONFIG_DIR = path.join(os.homedir(), '.config', APP_NAME);
const DATA_DIR = path.join(os.homedir(), '.local', 'share', APP_NAME);
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');
const DATA_FILE = path.join(DATA_DIR, 'events_data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const GOOGLE_TOKENS_PATH = path.join(CONFIG_DIR, 'google-tokens.json');
const GOOGLE_CONFIG_PATH = path.join(CONFIG_DIR, 'google-config.json');

let mainWindow;
let isQuitting = false;
let googleAuthClient;
let googleCredentials;

function ensureDirectoriesExist() {
  [CONFIG_DIR, DATA_DIR, BACKUP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function loadGoogleCredentials() {
  try {
    const credentialsPath = path.join(__dirname, 'google-credentials.json');
    if (!fs.existsSync(credentialsPath)) return false;

    const content = fs.readFileSync(credentialsPath);
    googleCredentials = JSON.parse(content).installed;
    googleAuthClient = new google.auth.OAuth2(googleCredentials.client_id, googleCredentials.client_secret);
    
    if (fs.existsSync(GOOGLE_TOKENS_PATH)) {
      const tokens = JSON.parse(fs.readFileSync(GOOGLE_TOKENS_PATH));
      googleAuthClient.setCredentials(tokens);
    }
  } catch (err) {
    console.error('Error carregant credencials de Google:', err);
    return false;
  }
  return true;
}

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
async function cleanupOldBackups() {
  const MAX_BACKUPS_TO_KEEP = 5;
  if (!fs.existsSync(BACKUP_DIR)) {
    return;
  }
  
  try {
    console.log("Netejant backups antics...");
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup-events_data-') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          return { name: file, time: stats.mtime.getTime() };
        } catch (statError) {
          console.error(`No s'ha pogut obtenir informació del fitxer ${file}:`, statError);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.time - a.time);

    if (backupFiles.length > MAX_BACKUPS_TO_KEEP) {
      console.log(`Trobats ${backupFiles.length} backups. Conservant els ${MAX_BACKUPS_TO_KEEP} més recents.`);
      const backupsToDelete = backupFiles.slice(MAX_BACKUPS_TO_KEEP);
      
      backupsToDelete.forEach(backup => {
        try {
          fs.unlinkSync(path.join(BACKUP_DIR, backup.name));
          console.log(`Backup eliminat: ${backup.name}`);
        } catch (unlinkError) {
          console.error(`Error eliminant el backup ${backup.name}:`, unlinkError);
        }
      });
    } else {
      console.log(`Trobats ${backupFiles.length} backups. No cal neteja.`);
    }
  } catch (error) {
    console.error('Error durant la neteja de backups:', error);
  }
}

function loadGoogleConfigFromFile() {
    if (!fs.existsSync(GOOGLE_CONFIG_PATH)) return null;
    try {
        return JSON.parse(fs.readFileSync(GOOGLE_CONFIG_PATH, 'utf8'));
    } catch(err) {
        console.error('Error llegint el fitxer de configuració de Google:', err);
        return null;
    }
}

function createWindow() {
  ensureDirectoriesExist();
  loadGoogleCredentials(); 
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
    return;
  }
  event.preventDefault();
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
  if (choice.response === 0) {
    isQuitting = true;
    await createBackup();
    await cleanupOldBackups();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('confirm-quit-signal');
    }
    setTimeout(() => {
      app.exit();
    }, 1500);
  }
});


ipcMain.handle('load-app-data', async () => {
  if (!DATA_FILE) return null;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
      return fileContent.trim() ? JSON.parse(fileContent) : null;
    }
  } catch (error) { console.error('Error carregant dades:', error); }
  return null;
});

ipcMain.handle('save-app-data', (event, data) => saveDataWithErrorHandling(DATA_FILE, data));


ipcMain.handle('google-auth-start', async () => {
  if (!googleAuthClient) {
    return { success: false, message: "El client d'autenticació de Google no s'ha iniciat correctament." };
  }

  return new Promise((resolve) => {
    const server = http.createServer();

    const closeServer = () => {
        if (server.listening) {
            server.close();
        }
    };

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const redirectUri = `http://localhost:${port}`;
      googleAuthClient.redirectUri = redirectUri;

      const authUrl = googleAuthClient.generateAuthUrl({
        access_type: 'offline', prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar'],
      });
      require('electron').shell.openExternal(authUrl);
    });

    server.on('request', async (req, res) => {
      const qs = new url.URL(req.url, 'http://localhost').searchParams;
      const code = qs.get('code');
      
      if (!code) {
        res.end('<h1>Esperant codi...</h1>');
        return;
      }

      try {
        const { tokens } = await googleAuthClient.getToken(code);
        googleAuthClient.setCredentials(tokens);
        fs.writeFileSync(GOOGLE_TOKENS_PATH, JSON.stringify(tokens));
        
        mainWindow.webContents.send('google-auth-success');
        res.end('<h1>Autenticació completada!</h1><p>Pots tancar aquesta pestanya.</p>');
        resolve({ success: true });

      } catch (e) {
        console.error("Error en el callback d'autenticació:", e);
        mainWindow.webContents.send('google-auth-error', e.message);
        res.writeHead(500);
        res.end('<h1>Error d\'autenticació</h1>');
        resolve({ success: false, message: e.message });
      } finally {
        closeServer();
      }
    });

    server.on('error', (err) => {
      dialog.showErrorBox('Error de Servidor', `No s'ha pogut iniciar el servidor d'autenticació: ${err.message}`);
      resolve({ success: false, message: err.message });
    });
  });
 if (!googleAuthClient) {
    return { success: false, message: "El client d'autenticació de Google no s'ha iniciat correctament." };
  }
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.on('request', async (req, res) => {
      try {
        const port = server.address()?.port;
        if (!port) throw new Error("El servidor d'autenticació ja no està actiu.");

        const qs = new url.URL(req.url, `http://localhost:${port}`).searchParams;
        const code = qs.get('code');
        
        if (!code) {
          res.end('<h1>Esperant resposta...</h1>');
          return;
        }

        res.end('<h1>Autenticació completada!</h1><p>Pots tancar aquesta pestanya.</p>');
        server.close();

        const { tokens } = await googleAuthClient.getToken(code);
        googleAuthClient.setCredentials(tokens);
        fs.writeFileSync(GOOGLE_TOKENS_PATH, JSON.stringify(tokens));
        mainWindow.webContents.send('google-auth-success');
        resolve({ success: true });

      } catch (e) {
        console.error("Error en el callback d'autenticació:", e);
        mainWindow.webContents.send('google-auth-error', e.message);
        if (server.listening) server.close();
        resolve({ success: false, message: e.message });
      }
    });
    
    server.listen(0, '127.0.0.1', () => {
      const port = server.address()?.port;
      if (!port) {
        const msg = "No s'ha pogut assignar un port per a l'autenticació.";
        dialog.showErrorBox('Error de Xarxa', msg);
        resolve({ success: false, message: msg });
        return;
      }

      const redirectUri = `http://localhost:${port}`;
      googleAuthClient.redirectUri = redirectUri;

      const authUrl = googleAuthClient.generateAuthUrl({
        access_type: 'offline', prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events.owned'],
      });
      require('electron').shell.openExternal(authUrl);
    });

    server.on('error', (err) => {
      dialog.showErrorBox('Error de Servidor', `No s'ha pogut iniciar el servidor d'autenticació: ${err.message}`);
      resolve({ success: false, message: err.message });
    });
  });
  
  if (!googleAuthClient) {
    return { success: false, message: "El client d'autenticació de Google no s'ha iniciat correctament." };
  }
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const port = server.address()?.port;
        if (!port) throw new Error("No s'ha pogut obtenir el port del servidor d'autenticació.");
        const qs = new url.URL(req.url, `http://localhost:${port}`).searchParams;
        const code = qs.get('code');
        if (!code) { res.end('<h1>Esperant resposta de Google...</h1>'); return; }
        res.end('<h1>Autenticació completada!</h1><p>Pots tancar aquesta pestanya.</p>');
        server.close();
        const { tokens } = await googleAuthClient.getToken(code);
        googleAuthClient.setCredentials(tokens);
        fs.writeFileSync(GOOGLE_TOKENS_PATH, JSON.stringify(tokens));
        mainWindow.webContents.send('google-auth-success');
        resolve({ success: true });
      } catch (e) {
        console.error("Error en el callback d'autenticació:", e);
        mainWindow.webContents.send('google-auth-error', e.message);
        server.close();
        resolve({ success: false, message: e.message });
      }
    }).listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const redirectUri = `http://localhost:${port}`;
      googleAuthClient.redirectUri = redirectUri;
      const authUrl = googleAuthClient.generateAuthUrl({
        access_type: 'offline', prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar'],
      });
      require('electron').shell.openExternal(authUrl);
    });
    server.on('error', (err) => {
      dialog.showErrorBox('Error de Xarxa', `No s'ha pogut iniciar el servidor d'autenticació: ${err.message}`);
      resolve({ success: false, message: err.message });
    });
  });
});

ipcMain.handle('load-google-config', async () => {
  return loadGoogleConfigFromFile();
});

ipcMain.handle('save-google-config', (event, config) => {
  try {
    fs.writeFileSync(GOOGLE_CONFIG_PATH, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (err) {
    console.error('Error desant configuració de Google:', err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle('google-get-calendar-list', async () => {
  try {
    if (!googleAuthClient || !googleAuthClient.credentials.access_token) {
        throw new Error('No autenticat. Si us plau, connecta\'t a Google primer.');
    }
    const calendar = google.calendar({ version: 'v3', auth: googleAuthClient });
    const res = await calendar.calendarList.list();
    return {
      success: true,
      calendars: res.data.items?.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        backgroundColor: cal.backgroundColor,
        primary: cal.primary,
      })) || [],
    };
  } catch (error) {
    console.error('Error obtenint la llista de calendaris:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('google-get-events', async () => {
  try {
    const config = loadGoogleConfigFromFile(); // <<< CANVI CLAU: Crida a la funció directa
    if (!config?.selectedCalendarIds?.length) return { success: true, events: [] };
    if (!googleAuthClient?.credentials?.access_token) throw new Error('No autenticat.');
    
    const calendar = google.calendar({ version: 'v3', auth: googleAuthClient });
    const timeMin = new Date(); timeMin.setMonth(timeMin.getMonth() - 6);
    const timeMax = new Date(); timeMax.setMonth(timeMax.getMonth() + 6);
    const allEvents = [];

    for (const calendarId of config.selectedCalendarIds) {
      const res = await calendar.events.list({
        calendarId, timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(),
        singleEvents: true, orderBy: 'startTime',
      });
      const events = res.data.items?.map(event => ({
        id: event.id, title: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        allDay: !!event.start.date, backgroundColor: '#D32F2F', borderColor: '#D32F2F',
        extendedProps: { type: 'google' }
      })) || [];
      allEvents.push(...events);
    }
    return { success: true, events: allEvents };
  } catch (error) {
    console.error('Error obtenint esdeveniments de Google:', error);
    return { success: false, message: error.message };
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