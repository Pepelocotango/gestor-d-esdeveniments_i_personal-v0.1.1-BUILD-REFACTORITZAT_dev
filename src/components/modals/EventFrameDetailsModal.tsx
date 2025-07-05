import React from 'react';
import { useEventData } from '../../contexts/EventDataContext';
import { EventFrame, AssignmentStatus, ShowToastFunction } from '../../types';
import { formatDateDMY, formatDateRangeDMY } from '../../utils/dateFormat';
import { getStatusSummaryText } from '../../utils/statusUtils';

interface CommonFormProps {
  onClose: () => void;
  showToast: ShowToastFunction;
}

interface EventFrameDetailsModalProps extends CommonFormProps {
  eventFrame: EventFrame;
  onShowOnList: (eventFrameId: string) => void;
}

export const EventFrameDetailsModal: React.FC<EventFrameDetailsModalProps> = ({ onClose, eventFrame, onShowOnList }) => {
  const { peopleGroups, openModal: contextOpenModal } = useEventData();

  const handleDeleteClick = () => {
    contextOpenModal('confirmDeleteEventFrame', {
      itemType: "Marc d'Esdeveniment",
      itemName: eventFrame.name,
      itemId: eventFrame.id,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">{eventFrame.name}</h4>
        {eventFrame.place && <p className="text-sm text-gray-600 dark:text-gray-400">{eventFrame.place}</p>}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {eventFrame.startDate === eventFrame.endDate
            ? formatDateDMY(eventFrame.startDate)
            : formatDateRangeDMY(eventFrame.startDate, eventFrame.endDate)}
        </p>
      </div>
      {eventFrame.generalNotes && (
        <div>
          <h5 className="font-semibold text-gray-700 dark:text-gray-300">Notes Generals:</h5>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap p-2 bg-gray-50 dark:bg-gray-700/50 rounded">{eventFrame.generalNotes}</p>
        </div>
      )}
      <div>
        <h5 className="font-semibold text-gray-700 dark:text-gray-300">Assignacions ({eventFrame.assignments.length}):</h5>
        {eventFrame.assignments.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 pl-2 text-sm max-h-60 overflow-y-auto">
            {eventFrame.assignments
              .sort((a, b) => (peopleGroups.find(p => p.id === a.personGroupId)?.name || '').localeCompare(peopleGroups.find(p => p.id === b.personGroupId)?.name || ''))
              .map(assign => {
              const person = peopleGroups.find(p => p.id === assign.personGroupId);
              let statusColor = 'text-yellow-600 dark:text-yellow-400';
              if (assign.status === AssignmentStatus.Yes) statusColor = 'text-green-600 dark:text-green-400';
              if (assign.status === AssignmentStatus.No) statusColor = 'text-red-600 dark:text-red-400';
              if (assign.status === AssignmentStatus.Mixed) statusColor = 'text-blue-600 dark:text-blue-400';
              return (
                <li key={assign.id} className="text-gray-700 dark:text-gray-300 py-1">
                  <strong className="text-gray-800 dark:text-gray-200">{person?.name || 'N/A'}</strong>: {assign.startDate === assign.endDate ? formatDateDMY(assign.startDate) : formatDateRangeDMY(assign.startDate, assign.endDate)} <span className={`${statusColor} font-semibold`}>{getStatusSummaryText(assign)}</span>
                  {assign.notes && <span className="block text-xs italic pl-4 text-gray-500 dark:text-gray-400 mt-0.5">Nota: {assign.notes}</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No hi ha assignacions per aquest esdeveniment.</p>
        )}
      </div>
      <div className="flex justify-between items-center pt-4 mt-4 border-t dark:border-gray-700">
        <button
          onClick={() => onShowOnList(eventFrame.id)}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
        >
          Mostrar a la Llista
        </button>
        <div className="space-x-2">
            <button
            onClick={() => contextOpenModal('editEventFrame', { eventFrameToEdit: eventFrame })}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50"
            >
            Editar Marc
            </button>
            <button
            onClick={handleDeleteClick} 
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
            Eliminar Marc
            </button>
            <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
            Tancar
            </button>
        </div>
      </div>
    </div>
  );
};

export default EventFrameDetailsModal;