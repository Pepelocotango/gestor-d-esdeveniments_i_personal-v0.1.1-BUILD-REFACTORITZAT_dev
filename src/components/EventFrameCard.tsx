import { useRef, forwardRef } from 'react';
import { useEventData } from '@/contexts/EventDataContext';
import { EventFrame, Assignment, AssignmentStatus, ModalType, ModalData } from '@/types';
import { PersonAddIcon, EditIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@/constants';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { formatDateRangeDMY } from '@/utils/dateFormat';
import AssignmentCard from './AssignmentCard';

interface EventFrameCardProps {
  eventFrame: EventFrame;
  isExpanded: boolean;
  expandedDailyViewAssignmentIds: Set<string>;
  filters: { person: string; status: AssignmentStatus | ''; };
  onToggleExpand: (id: string) => void;
  onToggleDailyView: (id: string) => void;
  onUpdateEventFrame: (eventFrame: EventFrame) => void;
  onOpenModal: (type: ModalType, data?: ModalData) => void;
  onGeneralStatusChange: (eventFrameId: string, assignmentId: string, newStatus: AssignmentStatus) => void;
  onDailyStatusChange: (eventFrameId: string, assignment: Assignment, date: string, newStatus: AssignmentStatus) => void;
  onEditAssignment: (eventFrameId: string, assignmentId: string) => void;
  onDeleteAssignment: (eventFrameId: string, assignmentId: string) => void;
  setToastMessage: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const EventFrameCard = forwardRef<HTMLDivElement, EventFrameCardProps>(({
  eventFrame, isExpanded, expandedDailyViewAssignmentIds, filters, onToggleExpand,
  onToggleDailyView, onUpdateEventFrame, onOpenModal, onGeneralStatusChange,
  onDailyStatusChange, onEditAssignment, onDeleteAssignment, setToastMessage,
}, ref) => {
  const { getPersonGroupById } = useEventData();
  const skipNextCollapse = useRef(false);

  const filteredAssignments = eventFrame.assignments
    .filter(assign => 
      (!filters.person || assign.personGroupId === filters.person) && 
      (!filters.status || assign.status === filters.status || (assign.status === AssignmentStatus.Mixed && assign.dailyStatuses && Object.values(assign.dailyStatuses).includes(filters.status)))
    )
    .sort((a, b) => (getPersonGroupById(a.personGroupId)?.name || '').localeCompare(getPersonGroupById(b.personGroupId)?.name || ''));

  return (
    <div ref={ref} className="mb-4 rounded-lg shadow-sm overflow-hidden bg-white dark:bg-gray-800 border-2 border-black" aria-labelledby={`event-frame-title-${eventFrame.id}`}>
      <div
        className="p-4 bg-slate-100 dark:bg-slate-800 cursor-pointer border-b-2 border-slate-200 dark:border-slate-700"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, input, select, a')) {
            skipNextCollapse.current = true;
            return;
          }
          if (!skipNextCollapse.current) onToggleExpand(eventFrame.id);
          skipNextCollapse.current = false;
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
          <div className="mb-2 sm:mb-0 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                skipNextCollapse.current = true;
                onUpdateEventFrame({ ...eventFrame, personnelComplete: !eventFrame.personnelComplete });
                setToastMessage(eventFrame.personnelComplete ? 'Marc marcat com a incomplet.' : 'Marc marcat com a complet.', 'success');
              }}
              className="focus:outline-none"
            >
              <CheckCircleIcon className={`w-6 h-6 transition-colors ${eventFrame.personnelComplete ? 'text-green-500' : 'text-gray-400 dark:text-gray-600'}`} />
            </button>
            <h4
              id={`event-frame-title-${eventFrame.id}`}
              className="text-lg font-semibold hover:text-blue-600 dark:hover:text-blue-400"
              onClick={(e) => {
                e.stopPropagation();
                skipNextCollapse.current = true;
                onOpenModal('eventFrameDetails', { eventFrame });
              }}
            >
              {eventFrame.name}
            </h4>
            {eventFrame.place && <p className="text-sm text-gray-500 dark:text-gray-400">{eventFrame.place}</p>}
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDateRangeDMY(eventFrame.startDate, eventFrame.endDate)}</p>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
            <button onClick={(e) => { e.stopPropagation(); skipNextCollapse.current = true; onOpenModal('editEventFrame', { eventFrameToEdit: eventFrame }); }} className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700"><EditIcon className="w-6 h-6" /></button>
            <button onClick={(e) => { e.stopPropagation(); skipNextCollapse.current = true; onOpenModal('confirmDeleteEventFrame', { itemType: "Marc d'Esdeveniment", itemName: eventFrame.name, itemId: eventFrame.id }); }} className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-md hover:bg-red-100 dark:hover:bg-gray-700"><TrashIcon className="w-6 h-6" /></button>
            <button onClick={(e) => { e.stopPropagation(); skipNextCollapse.current = true; onOpenModal('addAssignment', { eventFrame }); }} className="p-1.5 text-green-600 ..."><PersonAddIcon className="w-6 h-6" /></button>
            <button onClick={(e) => { e.stopPropagation(); onToggleExpand(eventFrame.id); }} className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
              {isExpanded ? <ChevronUpIcon className="w-6 h-6" /> : <ChevronDownIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-800">
          {eventFrame.generalNotes && (
            <div className="mb-4">
              <h5 className="font-medium">Notes Generals</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{eventFrame.generalNotes}</p>
            </div>
          )}
          <h5 className="font-medium mb-2">Assignacions</h5>
          {filteredAssignments.length === 0 ? (
            <p className="text-sm text-gray-500">No hi ha assignacions que coincideixin amb els filtres.</p>
          ) : (
            <ul className="space-y-3">
              {filteredAssignments.map(assign => (
                <AssignmentCard
                  key={assign.id}
                  assignment={assign}
                  eventFrame={eventFrame}
                  isDailyViewExpanded={expandedDailyViewAssignmentIds.has(assign.id)}
                  onToggleDailyView={onToggleDailyView}
                  onGeneralStatusChange={onGeneralStatusChange}
                  onDailyStatusChange={onDailyStatusChange}
                  onEdit={onEditAssignment}
                  onDelete={onDeleteAssignment}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

export default EventFrameCard;
