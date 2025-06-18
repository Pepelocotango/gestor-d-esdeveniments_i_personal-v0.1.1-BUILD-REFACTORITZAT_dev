import React from 'react';

interface GoogleSettingsModalProps {
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const GoogleSettingsModal: React.FC<GoogleSettingsModalProps> = ({ onClose, showToast }) => {
  // En futurs passos, aquí afegirem la lògica per carregar l'estat,
  // llistar calendaris i gestionar la desconnexió.

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configuració de Google Calendar</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gestiona la teva connexió i selecciona els calendaris que vols sincronitzar.
        </p>
      </div>

      {/* Aquí anirà la llista de calendaris */}
      <div className="p-4 border rounded-md">
        <p className="text-center text-gray-500">La llista de calendaris apareixerà aquí.</p>
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
        <button
          onClick={() => { /* Lògica de desconnexió */ showToast('Desconnectat de Google (funció no implementada).', 'info'); }}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
        >
          Desconnectar
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md border border-gray-300 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500"
        >
          Tancar
        </button>
      </div>
    </div>
  );
};

export default GoogleSettingsModal;