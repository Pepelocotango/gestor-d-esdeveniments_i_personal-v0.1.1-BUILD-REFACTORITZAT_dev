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
  performHardReset: () => ipcRenderer.invoke('perform-hard-reset'),
  onAppWillRelaunchAfterReset: (callback) => {
    const handler = (event, ...args) => callback(...args);
    ipcRenderer.on('app-will-relaunch-after-reset', handler);
    return () => ipcRenderer.removeListener('app-will-relaunch-after-reset', handler);
  },
  onDevModeQuitAfterReset: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('dev-mode-quit-after-reset', handler);
    return () => ipcRenderer.removeListener('dev-mode-quit-after-reset', handler);
  },
  showLoadingOverlay: (callback) => {
    const handler = (event, message) => callback(message);
    ipcRenderer.on('show-loading-overlay', handler);
    return () => ipcRenderer.removeListener('show-loading-overlay', handler);
  },
  hideLoadingOverlay: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('hide-loading-overlay', handler);
    return () => ipcRenderer.removeListener('hide-loading-overlay', handler);
  },
});
