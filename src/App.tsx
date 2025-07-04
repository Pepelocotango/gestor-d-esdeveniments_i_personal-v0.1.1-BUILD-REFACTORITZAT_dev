import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

import { EventDataProvider } from './contexts/EventDataContext';
import { useEventDataManager } from './hooks/useEventDataManager';
import { THEME_STORAGE_KEY } from './constants';
import Modal from './components/ui/Modal';
import { ModalState, ModalType, InitialEventFrameData, ModalData, EventDataConteImplicits, EventFrame, SummaryRow, AppData, Assignment, AssignmentStatus, GoogleCalendar, ShowToastFunction } from './types';
import { formatDateDMY } from './utils/dateFormat';

const MainDisplay = lazy(() => import('./components/MainDisplay'));
const Controls = lazy(() => import('./components/Controls'));
const Navigation = lazy(() => import('./components/Navigation'));
const TechSheetsDisplay = lazy(() => import('./components/TechSheetsDisplay'));
const EventFrameFormModal = lazy(() => import('./components/modals/EventFrameFormModal'));
const AssignmentFormModal = lazy(() => import('./components/modals/AssignmentFormModal'));
const PeopleGroupManagerModal = lazy(() => import('./components/modals/PeopleGroupManagerModal'));
const ConfirmDeleteModal = lazy(() => import('./components/modals/ConfirmDeleteModal'));
const EventFrameDetailsModal = lazy(() => import('./components/modals/EventFrameDetailsModal'));
const GoogleSettingsModal = lazy(() => import('./components/modals/GoogleSettingsModal'));

// Millor posar-ho en un fitxer global.d.ts, però per compatibilitat ràpida:
interface ElectronAPI {
  loadAppData?: () => Promise<AppData | null>;
  saveAppData?: (data: AppData) => Promise<boolean>;
  onConfirmQuit?: (callback: () => Promise<void>) => void;
  sendQuitConfirmedByRenderer?: () => void;
  startGoogleAuth: () => Promise<{ success: boolean; message?: string }>;
  onGoogleAuthSuccess: (callback: () => void) => void;
  onGoogleAuthError: (callback: (event: any, message: string) => void) => void;
  getCalendarList: () => Promise<{ success: boolean; calendars?: GoogleCalendar[]; message?: string }>;
  saveGoogleConfig: (config: { selectedCalendarIds: string[], appCalendarId?: string }) => Promise<{ success: boolean }>;
  loadGoogleConfig: () => Promise<{ selectedCalendarIds: string[], appCalendarId?: string } | null>;
  getGoogleEvents: () => Promise<{ success: boolean, events?: any[], message?: string }>;
  syncWithGoogle: (localData: AppData) => Promise<{ success: boolean, message?: string, data?: AppData }>;
  resolveConflict: (resolutionData: { resolution: 'keep-local' | 'use-remote', localFrame: EventFrame, remoteEvent: any }) => Promise<{ success: boolean, message?: string, resolvedFrame?: EventFrame }>;
  resolveOrphans: (orphanData: { action: 'delete' | 'unlink', orphanIds: string[] }) => Promise<{ success: boolean, message?: string, updatedData?: AppData }>;
  clearGoogleAppCalendar: () => Promise<{ success: boolean, message?: string }>;
  performHardReset: () => Promise<{ success: boolean; message: string }>;
  addOrUpdateTechSheet: (eventFrameId: string, fitxaData: any) => void;
  onAppWillRelaunchAfterReset: (callback: (event: any, messages: string) => void) => (() => void) | undefined;
  onDevModeQuitAfterReset: (callback: () => void) => (() => void) | undefined;
  showLoadingOverlay: (callback: (event: any, message: string) => void) => (() => void) | undefined;
  hideLoadingOverlay: (callback: () => void) => (() => void) | undefined;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    require?: (module: 'electron') => { ipcRenderer: any }; // Afegit per a window.require
  }
}

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  persistent?: boolean;
}

const App: React.FC = () => {
  
    // --- 1. DECLARACIONS D'ESTAT (useState) ---
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'light');
  const [modalState, setModalState] = useState<ModalState>({ type: null, data: null });
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [currentFilterHighlight, setCurrentFilterHighlight] = useState<string>('');
  const [initialLoadAttempted, setInitialLoadAttempted] = useState<boolean>(false);
  const [filterToShowEventFrameId, setFilterToShowEventFrameId] = useState<string | null>(null);
  const [currentlyDisplayedFrames, setCurrentlyDisplayedFrames] = useState<EventFrame[]>([]);
  const [filterUIPerson, setFilterUIPerson] = useState<string>('');

  // --- 2. FUNCIONS D'AJUDA (useCallback) ---
  const clearToastMessage = (toastId: string) => {
    setToastState(prevState => (prevState?.id === toastId ? null : prevState));
  };
  
  const showToast: ShowToastFunction = useCallback((message, type = 'success', persistent = false) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToastState({ id, message, type: type || 'success', persistent });
    if (!persistent) {
      setTimeout(() => clearToastMessage(id), 30000);
    }
  }, []);

  const openModal = useCallback((type: ModalType, data?: ModalData | InitialEventFrameData) => {
    setModalState({ type, data: data as ModalData | null });
  }, []);

  const closeModal = () => {
    setModalState({ type: null, data: null });
  };

  // --- 3. INICIALITZACIÓ DEL HOOK DE DADES ---
  const eventDataManagerHookResult = useEventDataManager(showToast);
  
  const { 
    loadData: loadDataFromManager, 
    exportData: exportDataFromManager, 
    setHasUnsavedChanges, 
    hasUnsavedChanges, 
    syncWithGoogle,
    isSyncing
  } = eventDataManagerHookResult;

  // <<<< NOU REF PER A GESTIONAR L'ESTAT DELS CANVIS SENSE DESAR >>>>
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);
  
  // --- INICI DELS ALTRES EFECTES I FUNCIONS ---
  console.log('App.tsx - RE-RENDER. modalState:', modalState.type, modalState.data);

  const [isLoadingOverlayVisible, setIsLoadingOverlayVisible] = useState(false);
  const [loadingOverlayMessage, setLoadingOverlayMessage] = useState('');

  useEffect(() => {
    let cleanupShowLoading: (() => void) | undefined;
    let cleanupHideLoading: (() => void) | undefined;
    let cleanupAppWillRelaunch: (() => void) | undefined;
    let cleanupDevModeQuit: (() => void) | undefined;

    if (window.electronAPI) {
      if (window.electronAPI.showLoadingOverlay) {
        cleanupShowLoading = window.electronAPI.showLoadingOverlay((_event: any, message: string) => {
          setLoadingOverlayMessage(message);
          setIsLoadingOverlayVisible(true);
        });
      }
      if (window.electronAPI.hideLoadingOverlay) {
        cleanupHideLoading = window.electronAPI.hideLoadingOverlay(() => {
          setIsLoadingOverlayVisible(false);
          setLoadingOverlayMessage('');
        });
      }
      if (window.electronAPI.onAppWillRelaunchAfterReset) {
        cleanupAppWillRelaunch = window.electronAPI.onAppWillRelaunchAfterReset((_event: any, messages: string) => {
          showToast(`Reset completat:\n${messages}\nL'aplicació es reiniciarà.`, 'info', true);
        });
      }
      if (window.electronAPI.onDevModeQuitAfterReset) {
        cleanupDevModeQuit = window.electronAPI.onDevModeQuitAfterReset(() => {
          showToast("Reset completat en mode desenvolupament. Si us plau, tanca i reinicia l'aplicació manualment.", 'warning', true);
        });
      }
    }
    return () => {
      cleanupShowLoading?.();
      cleanupHideLoading?.();
      cleanupAppWillRelaunch?.();
      cleanupDevModeQuit?.();
    };
  }, [showToast]);

  useEffect(() => {
    const body = document.body;
    if (modalState.type !== null) {
      body.style.overflow = 'hidden';
    } else {
      body.style.overflow = 'auto';
    }
    return () => {
      body.style.overflow = 'auto';
    };
  }, [modalState.type]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const Toast: React.FC<{ toast: ToastState }> = ({ toast }) => {
    return (
      <div
        className={`toast toast-${toast.type}`}
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 1000,
          backgroundColor: toast.type === 'success' ? '#4caf50' : toast.type === 'error' ? '#f44336' : '#2196f3',
          color: 'white',
          padding: '1rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <span>{toast.message}</span>
        <button
          onClick={() => clearToastMessage(toast.id)}
          style={{
            marginLeft: '1rem',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          ×
        </button>
      </div>
    );
  };

  

  const handleShowOnList = (eventFrameId: string) => {
      setFilterToShowEventFrameId(eventFrameId);
      setCurrentFilterHighlight(eventFrameId);
      closeModal();
  };

  const contextValue = useMemo((): EventDataConteImplicits => ({
    ...eventDataManagerHookResult,
    openModal,
    showToast, // <<< LÍNIA AFEGIDA
  }), [eventDataManagerHookResult, openModal, showToast]);

  useEffect(() => {
    const attemptInitialLoad = async () => {
      console.log('App.tsx - useEffect [initialLoadAttempted, loadDataFromManager, showToast, setHasUnsavedChanges] executant-se.');
      if (window.electronAPI && typeof window.electronAPI.loadAppData === 'function') {
        try {
          console.log("Intentant carregar dades de l'aplicació via Electron...");
          const data = await window.electronAPI.loadAppData();
          loadDataFromManager(data);
          setHasUnsavedChanges(false); // Important: la càrrega inicial no són "canvis no desats"
          if (data) {
            showToast('Dades de l\'aplicació carregades automàticament.', 'info');
          } else {
            showToast('No s\'han trobat dades anteriors de l\'aplicació per carregar (Electron). Començant buit.', 'info');
          }
        } catch (error) {
          console.error('Error carregant dades de l\'aplicació via Electron:', error);
          showToast(`Error carregant dades (Electron): ${(error as Error).message}`, 'error');
          loadDataFromManager(null);
          setHasUnsavedChanges(false); // Fins i tot si hi ha error, comencem "nets"
        }
      } else {
        console.log("Mode navegador detectat o API d'Electron no disponible. Començant buit.");
        loadDataFromManager(null);
        setHasUnsavedChanges(false); // Comencem "nets"
      }
      setInitialLoadAttempted(true);
    };

    if (!initialLoadAttempted) {
      attemptInitialLoad();
    }
  }, [initialLoadAttempted, loadDataFromManager, showToast, setHasUnsavedChanges]);

  // <<< USEEFFECT CORREGIT PER AL TANCAMENT >>>
  useEffect(() => {
    if (window.electronAPI?.onConfirmQuit) {
      const handleQuit = async () => {
        console.log("Renderer va rebre el senyal 'confirm-quit-signal'");
        try {
          if (hasUnsavedChangesRef.current) { // Utilitza la referència
            const dataToSave = exportDataFromManager();
            console.log("Renderer: Desant dades abans de sortir...");
            await window.electronAPI?.saveAppData?.(dataToSave);
          } else {
            console.log("Renderer: No hi ha canvis per desar.");
          }
        } catch (error) {
          console.error("Renderer: Excepció durant el desat en sortir:", error);
        } finally {
          window.electronAPI?.sendQuitConfirmedByRenderer?.();
        }
      };
      
      // Registrem el listener només un cop
      window.electronAPI.onConfirmQuit(handleQuit);
    }
  }, [exportDataFromManager]); // Array de dependències estable

  useEffect(() => {
    if (window.electronAPI) {
      const onSuccess = () => showToast('Connectat a Google Calendar amb èxit!', 'success');
      const onError = (_event: any, message: string) => showToast(`Error d'autenticació: ${message}`, 'error');
      window.electronAPI.onGoogleAuthSuccess(onSuccess);
      window.electronAPI.onGoogleAuthError(onError);
      return () => {
        if (ipcRenderer) {
          ipcRenderer.removeListener('google-auth-success', onSuccess);
          ipcRenderer.removeListener('google-auth-error', onError);
        }
      };
    }
  }, [showToast]);
  const escapeCsvCell = (cellData: string | number | undefined | null): string => {
    if (cellData === undefined || cellData === null) return '';
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
      return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
  };

  const generateCsvFileName = () => {
    const date = new Date();
    const formattedDate = `${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`;

    const eventName = filterToShowEventFrameId
      ? currentlyDisplayedFrames.find(ef => ef.id === filterToShowEventFrameId)?.name || "tots"
      : "tots";

    const personName = filterUIPerson
      ? eventDataManagerHookResult.getPersonGroupById(filterUIPerson)?.name || "tots"
      : "tots";

    const status = "tots els estats";

    const location = currentlyDisplayedFrames.length === 1
      ? currentlyDisplayedFrames[0].place || "tots"
      : "tots";

    const textFilter = filterUIPerson ? `filtre_${filterUIPerson.replace(/[^a-zA-Z0-9]/g, '_')}` : "sense_filtre";

    return `llista_${eventName}-${personName}-${status}-${textFilter}-${formattedDate}-${location}.csv`;
  };

  const handleExportCurrentViewToCsv = () => {
    const dataToExport: SummaryRow[] = [];

    currentlyDisplayedFrames.forEach(ef => {
      if (ef.assignments.length > 0) {
        ef.assignments.forEach(a => {
          const person = eventDataManagerHookResult.getPersonGroupById(a.personGroupId);
          if (!filterUIPerson || a.personGroupId === filterUIPerson) {
            dataToExport.push({
              id: ef.id + "_" + a.id,
              primaryGrouping: ef.name,
              secondaryGrouping: person?.name || 'N/A',
              eventFrameName: ef.name,
              eventFramePlace: ef.place,
              eventFrameStartDate: formatDateDMY(ef.startDate),
              eventFrameEndDate: formatDateDMY(ef.endDate),
              assignmentPersonName: person?.name || 'N/A',
              assignmentStartDate: formatDateDMY(a.startDate),
              assignmentEndDate: formatDateDMY(a.endDate),
              assignmentStatus: a.status,
              assignmentNotes: a.notes,
              eventFrameGeneralNotes: ef.generalNotes,
              assignmentObject: a,
            });
          }
        });
      } else {
        if (!filterUIPerson) {
          const placeholderAssignment: Assignment = {
              id: `placeholder-no-assignment-${ef.id}`,
              personGroupId: '',
              eventFrameId: ef.id,
              startDate: '',
              endDate: '',
              status: AssignmentStatus.Pending,
              notes: '',
          };
          dataToExport.push({
            id: ef.id,
            primaryGrouping: ef.name,
            secondaryGrouping: "Sense assignacions",
            eventFrameName: ef.name,
            eventFramePlace: ef.place,
            eventFrameStartDate: formatDateDMY(ef.startDate),
            eventFrameEndDate: formatDateDMY(ef.endDate),
            assignmentPersonName: 'N/A',
            assignmentStartDate: 'N/A',
            assignmentEndDate: 'N/A',
            assignmentStatus: '',
            assignmentNotes: '',
            eventFrameGeneralNotes: ef.generalNotes,
            assignmentObject: placeholderAssignment
          });
        }
      }
    });

    if (dataToExport.length === 0) {
      showToast("No hi ha dades a la vista actual per exportar.", 'info');
      return;
    }

    const headers: (keyof SummaryRow)[] = [
      "primaryGrouping", "secondaryGrouping", "eventFrameName", "eventFramePlace",
      "eventFrameStartDate", "eventFrameEndDate", "assignmentPersonName",
      "assignmentStartDate", "assignmentEndDate", "assignmentStatus",
      "assignmentNotes", "eventFrameGeneralNotes"
    ];
    const headerDisplayNames: { [key in keyof SummaryRow]?: string } = {
      primaryGrouping: "Agrupació Principal (Nom Esdeveniment Marc)",
      secondaryGrouping: "Agrupació Secundària (Persona/Grup o 'Sense assignacions')",
      eventFrameName: "Nom Esdeveniment Marc",
      eventFramePlace: "Lloc Esdeveniment Marc",
      eventFrameStartDate: "Inici Esdeveniment Marc",
      eventFrameEndDate: "Fi Esdeveniment Marc",
      assignmentPersonName: "Persona Assignada",
      assignmentStartDate: "Inici Assignació",
      assignmentEndDate: "Fi Assignació",
      assignmentStatus: "Estat Assignació",
      assignmentNotes: "Notes Assignació",
      eventFrameGeneralNotes: "Notes Generals Marc"
    };
    const headerString = headers.map(h => escapeCsvCell(headerDisplayNames[h] || h)).join(',');
    const rows = dataToExport.map(row =>
      headers.map(header => escapeCsvCell(row[header])).join(',')
    );
    const csvContent = [headerString, ...rows].join('\n');
    const fileName = generateCsvFileName();
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Vista actual exportada a CSV.", 'success');
  };


  const renderModalContent = () => {
    if (!modalState.type) return null;
    switch (modalState.type) {
      case 'addEventFrame':
        return <EventFrameFormModal
                  onClose={closeModal}
                  showToast={showToast}
                  initialData={modalState.data ? { startDate: modalState.data.startDate, endDate: modalState.data.endDate } : undefined}
                />;
      case 'editEventFrame':
        return <EventFrameFormModal
                  onClose={closeModal}
                  eventFrameToEdit={modalState.data!.eventFrameToEdit}
                  showToast={showToast}
                />;
      case 'addAssignment':
        return <AssignmentFormModal
                onClose={closeModal}
                eventFrame={modalState.data!.eventFrame!}
                showToast={showToast}
                setExpandedEventFrameId={setFilterToShowEventFrameId} />;
      case 'editAssignment':
        return <AssignmentFormModal
                onClose={closeModal}
                eventFrame={modalState.data!.eventFrame!}
                assignmentToEdit={modalState.data!.assignmentToEdit}
                showToast={showToast}
                setExpandedEventFrameId={setFilterToShowEventFrameId} />;
      case 'managePeople':
        return <PeopleGroupManagerModal onClose={closeModal} showToast={showToast} />;
      case 'eventFrameDetails':
        return <EventFrameDetailsModal onClose={closeModal} eventFrame={modalState.data!.eventFrame!} showToast={showToast} onShowOnList={handleShowOnList}/>;
      case 'confirmHardReset':
      case 'confirmDeleteEventFrame':
        if (modalState.data?.onConfirmSpecial) {
             return <ConfirmDeleteModal
                  onClose={closeModal}
                  itemType={modalState.data.itemType!}
                  itemName={modalState.data.itemName!}
                  onConfirm={modalState.data.onConfirmSpecial}
                  showToast={showToast}
                  titleOverride={modalState.data.titleOverride}
                  confirmButtonText={modalState.data.confirmButtonText}
                  cancelButtonText={modalState.data.cancelButtonText}
                />;
        }
        return <ConfirmDeleteModal
                  onClose={closeModal}
                  itemType="Marc d'Esdeveniment"
                  itemName={modalState.data!.itemName!}
                  onConfirm={() => {
                    eventDataManagerHookResult.deleteEventFrame(modalState.data!.itemId!);
                  }}
                  showToast={showToast}
                />;
      case 'confirmDeleteAssignment':
        return <ConfirmDeleteModal
                  onClose={closeModal}
                  itemType="Assignació"
                  itemName={modalState.data!.itemName!}
                  onConfirm={() => {
                    eventDataManagerHookResult.deleteAssignment(modalState.data!.eventFrameId!, modalState.data!.assignmentId!);
                  }}
                  showToast={showToast}
                />;
      
      case 'googleSettings':
        return <GoogleSettingsModal onClose={closeModal} showToast={showToast} />;
      default:
        return null;
    }
  };

  const getModalTitle = (): string => {
    if (!modalState.type) return '';
    if (modalState.type === 'confirmDeleteEventFrame' && modalState.data?.titleOverride) {
        return modalState.data.titleOverride;
    }
    switch (modalState.type) {
      case 'addEventFrame': return "Afegir Nou Marc d'Esdeveniment";
      case 'editEventFrame': return "Editar Marc d'Esdeveniment";
      case 'addAssignment': return `Nova Assignació per a: ${modalState.data?.eventFrame?.name || ''}`;
      case 'editAssignment': return `Editar Assignació per a: ${modalState.data?.eventFrame?.name || ''}`;
      case 'managePeople': return "Gestionar Persones / Grups";
      case 'eventFrameDetails': return `Detalls de: ${modalState.data?.eventFrame?.name || ''}`;
      case 'confirmHardReset':
      case 'confirmDeleteEventFrame':
      case 'confirmDeleteAssignment':
        return "Confirmar Eliminació";
      default: return "Diàleg";
    }
  };

  const getModalSize = (): 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' => {
    if (!modalState.type) return 'md';
    switch (modalState.type) {
      case 'managePeople': return '5xl';
      case 'addEventFrame':
      case 'editEventFrame':
      case 'addAssignment':
      case 'editAssignment':
      case 'eventFrameDetails':
        return '2xl';
      case 'confirmDeleteEventFrame':
      case 'confirmDeleteAssignment':
      case 'confirmHardReset':
        return 'lg';
      default: return 'md';
    }
  }

  return (
    <EventDataProvider value={contextValue}>
      <HashRouter>
        <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <header className="sticky top-0 z-40 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm py-2">
            <div className="container mx-auto px-4">
              <Suspense fallback={<div className="text-center p-4">Carregant controls...</div>}>
                <Controls
                  theme={theme}
                  toggleTheme={toggleTheme}
                  onOpenModal={openModal}
                  peopleGroups={eventDataManagerHookResult.peopleGroups}
                  showToast={showToast}
                  hasUnsavedChanges={hasUnsavedChanges}
                  onSyncWithGoogle={syncWithGoogle}
                  isSyncing={isSyncing}
                />
              </Suspense>
              <Suspense fallback={<div className="text-center p-2">Carregant navegació...</div>}>
                <Navigation />
              </Suspense>
            </div>
          </header>

          <main className="container mx-auto px-4 pt-2 pb-4 flex-grow">
            <Suspense fallback={<div className="text-center p-8">Carregant vista...</div>}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <MainDisplay
                      openModal={openModal}
                      setToastMessage={showToast}
                      currentFilterHighlight={currentFilterHighlight}
                      setCurrentFilterHighlight={setCurrentFilterHighlight}
                      filterToShowEventFrameId={filterToShowEventFrameId}
                      setFilterToShowEventFrameId={setFilterToShowEventFrameId}
                      setCurrentlyDisplayedFrames={setCurrentlyDisplayedFrames}
                      onExportCurrentViewToCsv={handleExportCurrentViewToCsv}
                      setFilterUIPerson={setFilterUIPerson}
                    />
                  }
                />
                <Route path="/tech-sheets" element={<TechSheetsDisplay />} />
              </Routes>
            </Suspense>
          </main>

          <footer className="bg-white dark:bg-gray-800 p-4 text-center text-sm text-gray-600 dark:text-gray-400 border-t dark:border-gray-700">
            © {new Date().getFullYear()} (Pëp) Gestor de Esdeveniments i Personal v0.3.0 DEV. Evolució Gestió Integral d'Esdeveniments v10.1.
          </footer>

          <Modal
            isOpen={modalState.type !== null}
            onClose={closeModal}
            title={getModalTitle()}
            size={getModalSize()}
          >
            <Suspense fallback={<div className="p-8 text-center">Carregant...</div>}>
              {renderModalContent()}
            </Suspense>
          </Modal>

          {toastState && <Toast toast={toastState} />}

          {isLoadingOverlayVisible && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex flex-col justify-center items-center z-[9999]" aria-live="assertive" role="alert">
              <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-white text-lg">{loadingOverlayMessage || "Processant..."}</p>
            </div>
          )}
        </div>
      </HashRouter>
    </EventDataProvider>
  );
};

export default App;