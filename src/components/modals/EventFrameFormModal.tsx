// ruta: src/components/modals/EventFrameFormModal.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { useEventData } from '../../contexts/EventDataContext';
import { EventFrame, InitialEventFrameData } from '../../types';
import { formatDateDMY } from '../../utils/dateFormat';

interface EventFrameFormProps {
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  eventFrameToEdit?: Partial<EventFrame>;
  initialData?: InitialEventFrameData;
}

export const EventFrameFormModal: React.FC<EventFrameFormProps> = ({ onClose, eventFrameToEdit, showToast, initialData }) => {
  const { addEventFrame, updateEventFrame, eventFrames, openModal } = useEventData(); 
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const [eventNameDatalistId] = useState(() => `event-name-datalist-${Math.random().toString(36).substring(2,9)}`);
  const [locationDatalistId] = useState(() => `location-datalist-${Math.random().toString(36).substring(2,9)}`);

  useEffect(() => {
    if (eventFrameToEdit && eventFrameToEdit.id) { 
      setName(eventFrameToEdit.name || '');
      setPlace(eventFrameToEdit.place || '');
      setStartDate(eventFrameToEdit.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(eventFrameToEdit.endDate || new Date().toISOString().split('T')[0]);
      setGeneralNotes(eventFrameToEdit.generalNotes || '');
    } else if (initialData) { 
      setName('');
      setPlace('');
      setStartDate(initialData.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(initialData.endDate || initialData.startDate || new Date().toISOString().split('T')[0]);
      setGeneralNotes('');
    } else { 
      setName('');
      setPlace('');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setGeneralNotes('');
    }
    setErrors({});
  }, [eventFrameToEdit, initialData]);

  const validate = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    if (!name.trim()) newErrors.name = "El nom és obligatori.";
    if (!startDate) newErrors.startDate = "La data d'inici és obligatòria.";
    if (!endDate) newErrors.endDate = "La data de fi és obligatòria.";
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = "La data de fi ha de ser posterior o igual a la data d'inici.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const eventData = { name, place, startDate, endDate, generalNotes };
    if (eventFrameToEdit && eventFrameToEdit.id) { 
      updateEventFrame({ ...eventFrameToEdit, ...eventData } as EventFrame); 
      showToast("Marc d'esdeveniment actualitzat.", 'success');
    } else {
      addEventFrame(eventData);
      showToast("Marc d'esdeveniment afegit.", 'success');
    }
    onClose();
  };

   const handleCreateAndAssign = () => {
    if (!validate()) return;

    if (eventFrameToEdit && eventFrameToEdit.id) {
      onClose();
      openModal('addAssignment', { eventFrame: eventFrameToEdit as EventFrame });
    } else {
      const eventData = { name, place, startDate, endDate, generalNotes };
      const newEventFrame = addEventFrame(eventData);
      showToast("Marc d'esdeveniment afegit.", 'success');
      onClose();
      openModal('addAssignment', { eventFrame: newEventFrame });
    }
  };
  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50";
  
  const uniqueEventNames = Array.from(new Set(eventFrames.map(ef => ef.name).filter(Boolean)));
  const uniqueLocations = Array.from(new Set(eventFrames.map(ef => ef.place).filter(Boolean)));

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="event-frame-form-title" id="event-frame-form-modal-actual-form">
      <h2 id="event-frame-form-title" className="sr-only">{eventFrameToEdit && eventFrameToEdit.id ? 'Formulari Edició Marc Esdeveniment' : 'Formulari Nou Marc Esdeveniment'}</h2>
      <div>
        <label htmlFor="ef-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom de l'Esdeveniment</label>
        <input type="text" id="ef-name" value={name} onChange={e => setName(e.target.value)} className={commonInputClass} required aria-required="true" list={eventNameDatalistId}/>
        <datalist id={eventNameDatalistId}>
            {uniqueEventNames.map(n => <option key={n} value={n} />)}
        </datalist>
        {errors.name && <p className="text-red-500 text-xs mt-1" role="alert">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="ef-place" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lloc (Opcional)</label>
        <input type="text" id="ef-place" value={place} onChange={e => setPlace(e.target.value)} className={commonInputClass} list={locationDatalistId} />
        <datalist id={locationDatalistId}>
            {uniqueLocations.map(loc => <option key={loc} value={loc} />)}
        </datalist>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ef-startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data d'Inici</label>
          <input type="date" id="ef-startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className={commonInputClass} required aria-required="true" placeholder="dd/mm/yyyy" />
          {startDate && <p className="text-xs text-blue-600 dark:text-blue-300 mt-1"><span className="font-semibold">Data seleccionada:</span> {formatDateDMY(startDate)}</p>}
          {errors.startDate && <p className="text-red-500 text-xs mt-1" role="alert">{errors.startDate}</p>}
        </div>
        <div>
          <label htmlFor="ef-endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Fi</label>
          <input type="date" id="ef-endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className={commonInputClass} required aria-required="true" placeholder="dd/mm/yyyy" />
          {endDate && <p className="text-xs text-blue-600 dark:text-blue-300 mt-1"><span className="font-semibold">Data seleccionada:</span> {formatDateDMY(endDate)}</p>}
          {errors.endDate && <p className="text-red-500 text-xs mt-1" role="alert">{errors.endDate}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="ef-generalNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes Generals (Opcional)</label>
        <textarea id="ef-generalNotes" value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} rows={3} className={commonInputClass}></textarea>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500">Cancel·lar</button>
        {/* <<< AFEGIR AQUEST BLOC >>> */}
        {!eventFrameToEdit?.id && (
          <button
            type="button"
            onClick={handleCreateAndAssign}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
          >
            Crear i Assignar
          </button>
        )}
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">{eventFrameToEdit && eventFrameToEdit.id ? 'Actualitzar' : 'Crear'}</button>
      </div>
    </form>
  );
};

export default EventFrameFormModal;