// START OF FILE: ./preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadAppData: () => ipcRenderer.invoke('load-app-data'),
  saveAppData: (data) => ipcRenderer.invoke('save-app-data', data),
  // Funció perquè el renderer escolti la petició de desat abans de sortir
  onConfirmQuit: (callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on('confirm-quit-signal', listener); // Canviat el nom del canal per claredat
    // Retornar una funció per desregistrar el listener
    return () => ipcRenderer.removeListener('confirm-quit-signal', listener);
  },
  // Funció perquè el renderer notifiqui que ha acabat
  sendQuitConfirmedByRenderer: () => ipcRenderer.send('quit-confirmed-by-renderer-signal'), // Canviat el nom del canal
});
// END OF FILE: ./preload.js