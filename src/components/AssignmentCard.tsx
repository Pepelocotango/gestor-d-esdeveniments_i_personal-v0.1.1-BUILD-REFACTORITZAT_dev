import React from 'react';
import { useEventData } from '../contexts/EventDataContext';
import { EventFrame, Assignment, AssignmentStatus } from '../types';
import { EditIcon, TrashIcon } from '../constants';
import { formatDateDMY, formatDateRangeDMY } from '../utils/dateFormat';
import { getStatusSummaryText } from '../utils/statusUtils';

const getDaysInRange = (startDateStr: string, endDateStr: string): string[] => {
  const dates: string[] = [];
  let currentDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  currentDate.setUTCHours(0, 0, 0, 0);
  endDate.setUTCHours(0, 0, 0, 0);
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

interface AssignmentCardProps {
  assignment: Assignment;
  eventFrame: EventFrame;
  isDailyViewExpanded: boolean;
  onToggleDailyView: (assignmentId: string) => void;
  onGeneralStatusChange: (eventFrameId: string, assignmentId: string, newStatus: AssignmentStatus) => void;
  onDailyStatusChange: (eventFrameId: string, assignment: Assignment, date: string, newStatus: AssignmentStatus) => void;
  onEdit: (eventFrameId: string, assignmentId: string) => void;
  onDelete: (eventFrameId: string, assignmentId: string) => void;
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  eventFrame,
  isDailyViewExpanded,
  onToggleDailyView,
  onGeneralStatusChange,
  onDailyStatusChange,
  onEdit,
  onDelete,
}) => {
  const { getPersonGroupById } = useEventData();
  const person = getPersonGroupById(assignment.personGroupId);
  const isMultiDay = assignment.startDate !== assignment.endDate;

  const statusCardClasses: { [key in AssignmentStatus]: string } = {
    [AssignmentStatus.Yes]: 'assignment-card-yes',
    [AssignmentStatus.Pending]: 'assignment-card-pending',
    [AssignmentStatus.No]: 'assignment-card-no',
    [AssignmentStatus.Mixed]: 'assignment-card-mixed',
  };
  const cardClass = `assignment-card ${statusCardClasses[assignment.status] || ''}`;

  const toggleDailyView = () => {
    onToggleDailyView(isDailyViewExpanded ? '' : assignment.id);
  };

  return (
    <li className={cardClass}>
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
        <div className="flex-grow">
          <p className="font-semibold text-lg">{person?.name || 'Persona Desconeguda'}</p>
          <p className="text-sm opacity-80">{formatDateRangeDMY(assignment.startDate, assignment.endDate)}</p>
          <p className="text-sm font-bold opacity-90">
            {getStatusSummaryText(assignment)}
          </p>
          {assignment.notes && <p className="text-xs mt-1 italic opacity-70 whitespace-pre-wrap">Nota: {assignment.notes}</p>}
        </div>
        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-2 self-start sm:self-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            {isMultiDay && (
              <button
                onClick={toggleDailyView}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isDailyViewExpanded ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {isDailyViewExpanded ? "Ocultar Dies" : "Mostrar Dies"}
              </button>
            )}
            {[AssignmentStatus.Yes, AssignmentStatus.Pending, AssignmentStatus.No].map(status => (
              <button
                key={status}
                onClick={() => onGeneralStatusChange(eventFrame.id, assignment.id, status)}
                className={`font-semibold px-3 py-1.5 text-xs rounded-md transition-opacity ${
                  assignment.status === status && assignment.status !== AssignmentStatus.Mixed
                    ? 'opacity-100 ring-2 ring-offset-2 dark:ring-offset-gray-900 ring-black/50'
                    : 'opacity-60 hover:opacity-100'
                } ${status === AssignmentStatus.Yes ? 'bg-green-500 text-white' : status === AssignmentStatus.Pending ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end space-x-1">
            <button onClick={() => onEdit(eventFrame.id, assignment.id)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
              <EditIcon className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(eventFrame.id, assignment.id)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {isMultiDay && isDailyViewExpanded && (
        <div className="daily-details-section p-3">
          <h6 className="text-sm font-semibold mb-2">Estat per dia:</h6>
          <div className="space-y-1">
            {getDaysInRange(assignment.startDate, assignment.endDate).map(date => {
              const currentDailyStatus = assignment.dailyStatuses?.[date] || (assignment.status !== AssignmentStatus.Mixed ? assignment.status : AssignmentStatus.Pending);
              
              const statusRowClasses: { [key: string]: string } = {
                  [AssignmentStatus.Yes]: 'daily-row-yes',
                  [AssignmentStatus.No]: 'daily-row-no',
                  [AssignmentStatus.Pending]: 'daily-row-pending',
              };
              const rowClass = statusRowClasses[currentDailyStatus] || 'daily-row-mixed';

              return (
                <div key={date} className={`flex items-center justify-between p-1.5 rounded-md transition-colors duration-200 ${rowClass}`}>
                  <span className="text-sm font-medium">{formatDateDMY(date)}:</span>
                  <div className="flex space-x-2">
                    {[AssignmentStatus.Yes, AssignmentStatus.Pending, AssignmentStatus.No].map(s => (
                      <button
                        key={s}
                        onClick={() => onDailyStatusChange(eventFrame.id, assignment, date, s)}
                        className={`status-pill ${currentDailyStatus === s ? 
                            (s === AssignmentStatus.Yes ? 'status-pill-selected-yes' : s === AssignmentStatus.No ? 'status-pill-selected-no' : 'status-pill-selected-pending') : 
                            'status-pill-unselected'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </li>
  );
};

export default AssignmentCard;
