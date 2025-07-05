import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useEventData } from '../contexts/EventDataContext';
import { EventFrame } from '../types';

const TechSheetForm = lazy(() => import('./tech_sheets/TechSheetForm')); 

const TechSheetsDisplay: React.FC = () => {
  const { eventFrames } = useEventData();
  const [selectedEventFrameId, setSelectedEventFrameId] = useState<string>('');

  const sortedEventFrames = useMemo(() => {
    return [...eventFrames].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [eventFrames]);

  const selectedEventFrame = useMemo((): EventFrame | undefined => {
    return eventFrames.find((ef: EventFrame) => ef.id === selectedEventFrameId);
  }, [eventFrames, selectedEventFrameId]);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Gestor de Fitxes de Bolo</h2>
        
        <div className="max-w-md">
          <label htmlFor="event-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Selecciona un esdeveniment per veure o editar la seva fitxa:
          </label>
          <select
            id="event-selector"
            value={selectedEventFrameId}
            onChange={(e) => setSelectedEventFrameId(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="" disabled>-- Tria un esdeveniment --</option>
            {sortedEventFrames.map((event) => (
              <option key={event.id} value={event.id}>
                {new Date(event.startDate).toLocaleDateString('ca-ES')} - {event.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedEventFrame && selectedEventFrame.techSheet ? (
        <Suspense fallback={<div className="text-center p-8">Carregant formulari...</div>}>
          <TechSheetForm 
            key={selectedEventFrame.id}
            eventFrame={selectedEventFrame} 
          />
        </Suspense>
      ) : (
        selectedEventFrameId && (
          <div className="p-4 text-center text-orange-500 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <p>Aquest esdeveniment no té una fitxa tècnica associada. Pot ser de dades antigues. Desa l'esdeveniment per generar-ne una.</p>
          </div>
        )
      )}
    </div>
  );
};

export default TechSheetsDisplay;
