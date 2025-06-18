import React, { useState, useEffect } from 'react';
import { GoogleCalendar } from '@/types';
import { useEventData } from '@/contexts/EventDataContext';

interface GoogleSettingsModalProps {
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const GoogleSettingsModal: React.FC<GoogleSettingsModalProps> = ({ onClose, showToast }) => {
  const { refreshGoogleEvents } = useEventData();
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndLoadConfig = async () => {
      if (window.electronAPI?.loadGoogleConfig && window.electronAPI?.getCalendarList) {
        try {
          const [configResult, calendarsResult] = await Promise.all([
            window.electronAPI.loadGoogleConfig(),
            window.electronAPI.getCalendarList()
          ]);

          if (configResult?.selectedCalendarIds) {
            setSelectedIds(new Set(configResult.selectedCalendarIds));
          }

          if (calendarsResult.success) {
            setCalendars(calendarsResult.calendars || []);
          } else {
            setError(calendarsResult.message || 'Error desconegut obtenint calendaris.');
          }
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setLoading(false);
        }
      } else {
          setError("Les funcions de l'API d'Electron no estan disponibles.");
          setLoading(false);
      }
    };
    fetchAndLoadConfig();
  }, []);

  const handleToggle = (calendarId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (window.electronAPI?.saveGoogleConfig) {
      const result = await window.electronAPI.saveGoogleConfig({ selectedCalendarIds: Array.from(selectedIds) });
      if (result.success) {
        showToast('Configuració de calendaris desada.', 'success');
        await refreshGoogleEvents();
        onClose();
      } else {
        showToast('No s\'ha pogut desar la configuració.', 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configuració de Google Calendar</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gestiona la teva connexió i selecciona els calendaris que vols sincronitzar.
        </p>
      </div>

      <div className="p-4 border rounded-md min-h-[200px]">
        {loading && <p className="text-center text-gray-500">Carregant calendaris...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && (
          <ul className="space-y-2">
            {calendars.map(cal => (
              <li key={cal.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={cal.id}
                  checked={selectedIds.has(cal.id)}
                  onChange={() => handleToggle(cal.id)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  style={{ accentColor: cal.backgroundColor }}
                />
                <label htmlFor={cal.id} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {cal.summary} {cal.primary && '(Principal)'}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="flex justify-end pt-4 border-t dark:border-gray-700">
        <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
          Desar i Tancar
        </button>
      </div>
    </div>
  );
};

export default GoogleSettingsModal;
