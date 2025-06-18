const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadAppData: () => ipcRenderer.invoke('load-app-data'),
  saveAppData: (data) => ipcRenderer.invoke('save-app-data', data),
  loadGoogleConfig: () => ipcRenderer.invoke('load-google-config'),
  onConfirmQuit: (callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on('confirm-quit-signal', listener); // Canviat el nom del canal per claredat
    // Retornar una funció per desregistrar el listener
    return () => ipcRenderer.removeListener('confirm-quit-signal', listener);
  },
  // Funció perquè el renderer notifiqui que ha acabat
  sendQuitConfirmedByRenderer: () => ipcRenderer.send('quit-confirmed-by-renderer-signal'), // Canviat el nom del canal
  startGoogleAuth: () => ipcRenderer.invoke('google-auth-start'),
  onGoogleAuthSuccess: (callback) => ipcRenderer.on('google-auth-success', callback),
  onGoogleAuthError: (callback) => ipcRenderer.on('google-auth-error', callback),
  getCalendarList: () => ipcRenderer.invoke('google-get-calendar-list'),
  saveGoogleConfig: (config) => ipcRenderer.invoke('save-google-config', config),
  getGoogleEvents: () => ipcRenderer.invoke('google-get-events'),
});
