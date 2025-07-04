const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadAppData: () => ipcRenderer.invoke('load-app-data'),
  saveAppData: (data) => ipcRenderer.invoke('save-app-data', data),
   loadGoogleConfig: () => ipcRenderer.invoke('load-google-config'),
   onConfirmQuit: (callback) => {
    ipcRenderer.on('confirm-quit-signal', (event, ...args) => callback(...args));
   },
  sendQuitConfirmedByRenderer: () => ipcRenderer.send('quit-confirmed-by-renderer-signal'),
   startGoogleAuth: () => ipcRenderer.invoke('google-auth-start'),
  onGoogleAuthSuccess: (callback) => ipcRenderer.on('google-auth-success', callback),
  onGoogleAuthError: (callback) => ipcRenderer.on('google-auth-error', callback),
  getCalendarList: () => ipcRenderer.invoke('google-get-calendar-list'),
  saveGoogleConfig: (config) => ipcRenderer.invoke('save-google-config', config),
  getGoogleEvents: () => ipcRenderer.invoke('get-google-events'),
  syncWithGoogle: (localData) => ipcRenderer.invoke('sync-with-google', localData),
  clearGoogleAppCalendar: () => ipcRenderer.invoke('clear-google-app-calendar'),
});
