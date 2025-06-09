// START OF FILE: ./components/Controls.tsx
import React, { ChangeEvent, useRef, useState } from 'react';
import { useEventData } from '../contexts/EventDataContext';
import { PersonGroup, ModalType } from '../types';
import { SaveIcon, LoadIcon, SunIcon, MoonIcon, UsersIcon } from '../constants';
import { migrateData, validateMigratedData } from '../utils/dataMigration';

interface ControlsProps {
  theme: string;
  toggleTheme: () => void;
  onOpenModal: (type: ModalType) => void;
  peopleGroups: PersonGroup[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const Controls: React.FC<ControlsProps> = ({
    theme,
    toggleTheme,
    onOpenModal,
    peopleGroups,
    showToast
}) => {
  const { loadData, exportData, setHasUnsavedChanges } = useEventData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peopleFileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleLoadAllDataLikeInitial = (event: ChangeEvent<HTMLInputElement>) => {
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
          setHasUnsavedChanges(true); // MODIFICAT: Sempre marcar com a canvis
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
          setHasUnsavedChanges(true); // Es manté true
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

  const handleLoadPeopleLikeInitial = (event: ChangeEvent<HTMLInputElement>) => {
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
          setHasUnsavedChanges(true); // MODIFICAT: Marcar com a canvis
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
          setHasUnsavedChanges(true); // Es manté true
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

  const handleSaveData = () => {
    try {
      const data = exportData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gestio_esdeveniments_dades.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setHasUnsavedChanges(false);
      showToast("Dades desades correctament.", 'success');
    } catch (error) {
      console.error("Error saving data:", error);
      showToast(`Error en desar les dades: ${(error as Error).message}`, 'error');
    }
  };

  const handleSavePeopleData = () => {
    try {
      const dataToSave = { peopleGroups: peopleGroups }; // Canviat de people a peopleGroups
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'persones_grups_dades.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Dades de persones desades correctament.", 'success');
    } catch (error) {
      console.error("Error saving people data:", error);
      showToast(`Error en desar les dades de persones: ${(error as Error).message}`, 'error');
    }
  };

  const handleStartEmpty = () => {
    setShowConfirmReset(true);
  };

  const confirmStartEmpty = () => {
    loadData({ eventFrames: [], peopleGroups: [], assignments: [] });
    showToast('Dades esborrades. Comences de zero!', 'info');
    setHasUnsavedChanges(false); // Després de començar de zero, no hi ha canvis no desats
    setShowConfirmReset(false);
  };

  const cancelStartEmpty = () => {
    setShowConfirmReset(false);
  };

  return (
    <React.Fragment>
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-w-[320px]">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Confirmar esborrat de dades</h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">Aquesta acció esborrarà <b>TOTES</b> les dades de l'aplicació. Estàs segur que vols continuar?</p>
            <div className="flex justify-end gap-3">
              <button onClick={cancelStartEmpty} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel·lar</button>
              <button onClick={confirmStartEmpty} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Sí, esborrar tot</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleStartEmpty}
          className="mb-2 px-4 py-2 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 font-semibold border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800 transition"
          title="Començar de zero (esborra totes les dades)"
        >
          Començar de zero
        </button>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 shadow rounded-lg w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Gestió de Dades Globals</h3>
              <button
                onClick={triggerLoadFile}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                aria-label="Carregar totes les dades des d'un fitxer JSON"
              >
                <LoadIcon /> Carregar Tot (JSON)
              </button>
              <input type="file" ref={fileInputRef} onChange={handleLoadAllDataLikeInitial} accept=".json" className="hidden" aria-hidden="true" />
              <button
                onClick={handleSaveData}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                aria-label="Guardar totes les dades a un fitxer JSON"
              >
                <SaveIcon /> Guardar Tot (JSON)
              </button>
            </div>

            <div className="flex flex-col items-center justify-center">
              <button
                onClick={toggleTheme}
                className="rounded-full p-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label={theme === 'dark' ? 'Canviar a tema clar' : 'Canviar a tema fosc'}
                title={theme === 'dark' ? 'Canviar a tema clar' : 'Canviar a tema fosc'}
              >
                {theme === 'dark' ? <SunIcon className="w-7 h-7 text-yellow-400" /> : <MoonIcon className="w-7 h-7 text-gray-700" />}
              </button>
              <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">Tema {theme === 'dark' ? 'fosc' : 'clar'}</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Persones / Grups</h3>
              <button
                onClick={triggerLoadPeopleFile}
                className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                aria-label="Carregar dades de persones des d'un fitxer JSON"
              >
                <LoadIcon /> Carregar Persones (JSON)
              </button>
              <input type="file" ref={peopleFileInputRef} onChange={handleLoadPeopleLikeInitial} accept=".json" className="hidden" aria-hidden="true" />
              <button
                onClick={handleSavePeopleData}
                className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                aria-label="Guardar dades de persones a un fitxer JSON"
              >
                <SaveIcon /> Guardar Persones (JSON)
              </button>
               <button
                onClick={() => onOpenModal('managePeople')}
                className="w-full flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                aria-label="Gestionar persones i grups"
              >
                <UsersIcon /> Gestionar Persones/Grups
              </button>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Controls;
// END OF FILE: ./components/Controls.tsx