import React, { ChangeEvent, useRef } from 'react';
import { useEventData } from '../contexts/EventDataContext';
import { PersonGroup, ModalType, ShowToastFunction } from '../types';
import { SaveIcon, LoadIcon, SunIcon, MoonIcon, UsersIcon, InfoIcon, TrashIcon, GoogleIcon, SyncIcon } from '../constants';
import { migrateData, validateMigratedData } from '../utils/dataMigration';

interface ControlsProps {
  theme: string;
  toggleTheme: () => void;
  onOpenModal: (type: ModalType, data?: any) => void;
  peopleGroups: PersonGroup[];
  showToast: ShowToastFunction;
  hasUnsavedChanges: boolean;
  onSyncWithGoogle: () => void; 
  isSyncing: boolean;
  }

const Controls: React.FC<ControlsProps> = ({
    theme,
    toggleTheme,
    onOpenModal,
    showToast,
    hasUnsavedChanges,
    onSyncWithGoogle,
    isSyncing

}) => {
  const { loadData, exportData, setHasUnsavedChanges } = useEventData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peopleFileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadAllData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        if (!fileContent) {
          showToast("Error: El fitxer està buit.", 'error');
          return;
        }
        const jsonData = JSON.parse(fileContent);
        if (jsonData.eventFrames && jsonData.peopleGroups && jsonData.assignments !== undefined) {
          loadData(jsonData);
          showToast("Totes les dades carregades correctament.", 'success');
          setHasUnsavedChanges(true);
        } else if (jsonData.eventFrames || jsonData.people || jsonData.assignments) {
          const migratedData = migrateData(
            { people: jsonData.people || [] },
            { eventFrames: jsonData.eventFrames || [] },
            { assignments: jsonData.assignments || [] }
          );
          const validation = validateMigratedData(migratedData);
          if (!validation.isValid) {
            showToast(`Error en la migració de dades: ${validation.errors.join(', ')}`, 'error');
            return;
          }
          loadData(migratedData);
          showToast("Dades antigues migrades i carregades correctament.", 'success');
          setHasUnsavedChanges(true);
        } else {
          showToast("Error: El format del fitxer JSON no és vàlid.", 'error');
        }
      } catch (error) {
        showToast(`Error en carregar les dades: ${(error as Error).message}`, 'error');
      } finally {
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleLoadPeopleData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        if (!fileContent) {
          showToast("Error: El fitxer de persones està buit.", 'error');
          return;
        }
        const jsonData = JSON.parse(fileContent);
        if (Array.isArray(jsonData.peopleGroups)) {
          const currentData = exportData();
          loadData({ ...currentData, peopleGroups: jsonData.peopleGroups });
          showToast("Dades de persones carregades correctament.", 'success');
          setHasUnsavedChanges(true);
        } else if (Array.isArray(jsonData.people)) {
          const migratedData = migrateData({ people: jsonData.people });
          const validation = validateMigratedData(migratedData);
          if (!validation.isValid) {
            showToast(`Error en la migració de dades: ${validation.errors.join(', ')}`, 'error');
            return;
          }
          const currentData = exportData();
          loadData({ ...currentData, peopleGroups: migratedData.peopleGroups });
          showToast("Dades de persones antigues migrades i carregades correctament.", 'success');
          setHasUnsavedChanges(true); 
        } else {
          showToast("Error: El format del fitxer JSON de persones no és vàlid.", 'error');
        }
      } catch (error) {
        showToast(`Error en carregar les dades de persones: ${(error as Error).message}`, 'error');
      } finally {
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const triggerLoadFile = () => fileInputRef.current?.click();
  const triggerLoadPeopleFile = () => peopleFileInputRef.current?.click();

  const handleSaveData = (type: 'all' | 'people') => {
    try {
      const dataToSave = type === 'all' ? exportData() : { peopleGroups: exportData().peopleGroups };
      const filename = type === 'all' ? 'gestio_esdeveniments_dades.json' : 'persones_grups_dades.json';
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (type === 'all') {
        setHasUnsavedChanges(false);
      }
      showToast(`Dades de ${type === 'all' ? 'l\'aplicació' : 'persones'} desades correctament.`, 'success');
    } catch (error) {
      console.error(`Error saving ${type} data:`, error);
      showToast(`Error en desar les dades: ${(error as Error).message}`, 'error');
    }
  };

  // <<< NOU FLUX PER AL RESET >>>
  const handleRequestHardReset = () => {
    onOpenModal('confirmHardReset', {
      titleOverride: "Confirmar Reset de Fàbrica",
      itemType: "Reset de Fàbrica",
      itemName: "Estàs segur que vols restablir l'aplicació? S'esborraran <b>TOTES</b> les dades locals de l'aplicació (esdeveniments, persones, assignacions) i la configuració de Google. <br><br><b>Aquesta acció és irreversible.</b>",
      confirmButtonText: "Sí, Resetejar Ara",
      cancelButtonText: "Cancel·lar",
      onConfirmSpecial: async () => {
        if (window.electronAPI?.performHardReset) {
          try {
            const result = await window.electronAPI.performHardReset();
              if (result.success) {
                // El backend ha esborrat els fitxers, ara el frontend neteja el seu estat.
                loadData(null);
                setHasUnsavedChanges(false);
                showToast("L'aplicació s'ha restablert a l'estat de fàbrica.", 'success', true);
              } else {
                showToast(result.message || "Error durant el reset de fàbrica.", 'error', true);
              }
          } catch (error) {
            console.error("Error cridant performHardReset:", error);
            showToast(`Error greu durant el reset de fàbrica: ${(error as Error).message}`, 'error', true);
          }
        } else {
          showToast("La funcionalitat de reset no està disponible.", 'error');
        }
      },
    });
  };

  return (
    <div className="p-2 bg-gray-100 dark:bg-gray-800 shadow-md rounded-lg w-full flex flex-col gap-2">
      {/* Fila Superior */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
            <button onClick={triggerLoadFile} className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm" title="Carregar totes les dades des d'un fitxer JSON">
                <LoadIcon /> Carregar Tot
            </button>
            <input type="file" ref={fileInputRef} onChange={handleLoadAllData} accept=".json" className="hidden" aria-hidden="true" />
            <button onClick={() => handleSaveData('all')} className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm" title="Guardar totes les dades a un fitxer JSON">
                <SaveIcon /> Guardar Tot
            </button>
             <button onClick={handleRequestHardReset} className="flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm" title="Començar de zero (esborra totes les dades actuals)">
                <TrashIcon className="w-4 h-4" /> Començar de Zero
            </button>
        </div>

        {hasUnsavedChanges && (
          <div className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1 font-semibold animate-pulse">
            <InfoIcon className="w-4 h-4" /> Canvis sense desar
          </div>
        )}
        
        <button onClick={toggleTheme} className="rounded-full p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500" title={theme === 'dark' ? 'Canviar a tema clar' : 'Canviar a tema fosc'}>
            {theme === 'dark' ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-gray-700" />}
        </button>
      </div>

      {/* Fila Inferior */}
      <div className="flex items-center justify-between w-full">
         <div className="flex items-center gap-2">
            <button onClick={triggerLoadPeopleFile} className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm" title="Carregar només dades de persones">
                <LoadIcon /> Carregar Persones
            </button>
            <input type="file" ref={peopleFileInputRef} onChange={handleLoadPeopleData} accept=".json" className="hidden" />
            <button onClick={() => handleSaveData('people')} className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm" title="Guardar només les dades de persones">
                <SaveIcon /> Guardar Persones
            </button>
            <button onClick={() => onOpenModal('managePeople')} className="flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm" title="Gestionar la llista de persones i grups">
                <UsersIcon /> Gestionar Persones
            </button>
        </div>
        
        <div className="flex items-center gap-2">
            <button
              onClick={onSyncWithGoogle}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-wait w-40"
              title="Sincronitzar manualment amb Google Calendar"
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sincronitzant...</span>
                </>
              ) : (
                <>
                  <SyncIcon />
                  <span>Sincronitzar</span>
                </>
              )}
            </button>
            <button onClick={() => onOpenModal('googleSettings')} className="flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm" title="Configurar la connexió amb Google">
                <GoogleIcon /> Configurar
            </button>
            <button
                onClick={async () => {
                  if (window.electronAPI) {
                    const result = await window.electronAPI.startGoogleAuth();
                    if (result.success) {
                      showToast('Obrint el navegador per autenticar-se amb Google...', 'info');
                    } else {
                      showToast(result.message || 'No s\'ha pogut iniciar l\'autenticació.', 'error');
                    }
                  } else {
                    showToast('Aquesta funcionalitat només està disponible a l\'aplicació d\'escriptori.', 'warning');
                  }
                }}
                className="flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-md transition-colors text-sm border border-gray-300"
                title="Connectar amb Google Calendar"
            >
                <GoogleIcon />
                <span>Connectar Google</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default Controls;
