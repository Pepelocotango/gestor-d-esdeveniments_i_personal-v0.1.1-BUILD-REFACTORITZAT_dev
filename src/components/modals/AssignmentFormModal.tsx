import React, { useState, useEffect, FormEvent } from 'react';
import { useEventData } from '../../contexts/EventDataContext';
import { EventFrame, Assignment, AssignmentStatus, ShowToastFunction } from '../../types';
import { ASSIGNMENT_STATUS_OPTIONS } from '../../constants';
import { formatDateDMY } from '../../utils/dateFormat';

interface AssignmentFormProps {
  onClose: () => void;
  showToast: ShowToastFunction;
  eventFrame: EventFrame;
  assignmentToEdit?: Assignment;
  setExpandedEventFrameId?: (id: string) => void;
}

export const AssignmentFormModal: React.FC<AssignmentFormProps> = ({ onClose, eventFrame, assignmentToEdit, showToast, setExpandedEventFrameId }) => {
  const { peopleGroups, addAssignment, updateAssignment } = useEventData();
  const [personGroupId, setPersonGroupId] = useState('');
  const [startDate, setStartDate] = useState(eventFrame.startDate);
  const [endDate, setEndDate] = useState(eventFrame.endDate);
  const [status, setStatus] = useState<AssignmentStatus>(AssignmentStatus.Pending);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isEditingMixed, setIsEditingMixed] = useState(false);

  useEffect(() => {
    if (assignmentToEdit) {
      setPersonGroupId(assignmentToEdit.personGroupId);
      setStartDate(assignmentToEdit.startDate);
      setEndDate(assignmentToEdit.endDate);
      setNotes(assignmentToEdit.notes || '');
      
      if (assignmentToEdit.status === AssignmentStatus.Mixed) {
        setIsEditingMixed(true);
        setStatus(AssignmentStatus.Pending); // Posem un valor per defecte al selector
      } else {
        setIsEditingMixed(false);
        setStatus(assignmentToEdit.status);
      }
    } else {
      setPersonGroupId(peopleGroups[0]?.id || '');
      setStartDate(eventFrame.startDate);
      setEndDate(eventFrame.endDate);
      setStatus(AssignmentStatus.Pending);
      setNotes('');
      setIsEditingMixed(false);
    }
    setErrors({});
  }, [assignmentToEdit, eventFrame, peopleGroups]);

  const validate = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    if (!personGroupId) newErrors.personGroupId = "Cal seleccionar una persona o grup.";
    if (!startDate) newErrors.startDate = "La data d'inici és obligatòria.";
    if (!endDate) newErrors.endDate = "La data de fi és obligatòria.";
    if (new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = "La data de fi ha de ser posterior o igual a la data d'inici.";
    }
    if (new Date(startDate) < new Date(eventFrame.startDate) || new Date(endDate) > new Date(eventFrame.endDate)) {
      newErrors.datesRange = `Les dates han d'estar dins del rang del marc (${formatDateDMY(eventFrame.startDate)} - ${formatDateDMY(eventFrame.endDate)}).`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let result;
    if (assignmentToEdit) {
      const updatedData: Assignment = {
        ...assignmentToEdit,
        personGroupId, startDate, endDate, notes,
        status: isEditingMixed ? AssignmentStatus.Mixed : status,
        dailyStatuses: isEditingMixed ? assignmentToEdit.dailyStatuses : undefined
      };
      
      if (isEditingMixed && status !== AssignmentStatus.Pending) {
        updatedData.status = status;
        updatedData.dailyStatuses = undefined;
      }
      
      result = updateAssignment(updatedData);
      if (result.success) showToast("Assignació actualitzada.", 'success');

    } else {
      const assignmentData = { personGroupId, startDate, endDate, status, notes };
      result = addAssignment(eventFrame.id, assignmentData);
      if (result.success && setExpandedEventFrameId) {
        showToast("Assignació afegida.", 'success');
        setExpandedEventFrameId(eventFrame.id);
      }
    }

    if (result.success) {
      if (result.warningMessage) showToast(result.warningMessage, 'warning');
      onClose();
    } else if (result.message) {
      showToast(`Error: ${result.message}`, 'error');
    }
  };

  const commonInputClass = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="assignment-form-title">
      <h2 id="assignment-form-title" className="sr-only">{assignmentToEdit ? 'Formulari Edició Assignació' : 'Formulari Nova Assignació'} per {eventFrame.name}</h2>
      {isEditingMixed && (
        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 dark:border-blue-400 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Aquesta assignació té estats diaris personalitzats. Canviar l'estat aquí sobreescriurà tots els estats diaris amb el nou valor seleccionat.
          </p>
        </div>
      )}
      <div>
        <label htmlFor="as-person" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Persona/Grup</label>
        <select id="as-person" value={personGroupId} onChange={e => setPersonGroupId(e.target.value)} className={commonInputClass} required disabled={peopleGroups.length === 0}>
          {peopleGroups.length === 0 ? <option value="" disabled>No hi ha persones/grups</option> :
            <>
              <option value="" disabled>Selecciona una persona o grup</option>
              {peopleGroups.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </>
          }
        </select>
        {errors.personGroupId && <p className="text-red-500 text-xs mt-1">{errors.personGroupId}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="as-startDate" className="block text-sm font-medium">Data d'Inici</label>
          <input type="date" id="as-startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className={commonInputClass} required />
          {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
        </div>
        <div>
          <label htmlFor="as-endDate" className="block text-sm font-medium">Data de Fi</label>
          <input type="date" id="as-endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className={commonInputClass} required />
          {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
        </div>
      </div>
      {errors.datesRange && <p className="text-red-500 text-xs text-center -mt-2">{errors.datesRange}</p>}
      <div>
        <label htmlFor="as-status" className="block text-sm font-medium">Estat</label>
        <select id="as-status" value={status} onChange={e => setStatus(e.target.value as AssignmentStatus)} className={commonInputClass}>
          {ASSIGNMENT_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="as-notes" className="block text-sm font-medium">Notes (Opcional)</label>
        <textarea id="as-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={commonInputClass}></textarea>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md border border-gray-300">Cancel·lar</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md" disabled={peopleGroups.length === 0 && !assignmentToEdit}>{assignmentToEdit ? 'Actualitzar' : 'Crear'}</button>
      </div>
    </form>
  );
};

export default AssignmentFormModal;