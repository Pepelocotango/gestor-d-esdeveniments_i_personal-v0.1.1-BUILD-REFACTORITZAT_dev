import { Assignment, AssignmentStatus } from '../types';
import { formatDateRanges } from './dateRangeFormatter';

/**
 * Genera un text descriptiu per a l'estat d'una assignació.
 * Si l'estat és Mixt, agrupa les dates per estat i mostra els rangs.
 * @param assignment - L'objecte de l'assignació.
 * @returns Una cadena de text com "(Sí)" o "(Mixt: Sí [14/05-15/05] No [16/05])".
 */
export const getStatusSummaryText = (assignment: Assignment): string => {
  if (assignment.status !== AssignmentStatus.Mixed || !assignment.dailyStatuses) {
    return `(${assignment.status})`;
  }

  const datesByStatus: { [key in AssignmentStatus]?: string[] } = {};

  Object.entries(assignment.dailyStatuses).forEach(([date, status]) => {
    if (!datesByStatus[status]) {
      datesByStatus[status] = [];
    }
    datesByStatus[status]!.push(date);
  });
  
  const parts = [];
  if (datesByStatus[AssignmentStatus.Yes]?.length) {
    parts.push(`Sí [${formatDateRanges(datesByStatus[AssignmentStatus.Yes])}]`);
  }
  if (datesByStatus[AssignmentStatus.No]?.length) {
    parts.push(`No [${formatDateRanges(datesByStatus[AssignmentStatus.No])}]`);
  }
  if (datesByStatus[AssignmentStatus.Pending]?.length) {
    parts.push(`Pendent [${formatDateRanges(datesByStatus[AssignmentStatus.Pending])}]`);
  }

  if (parts.length === 0) {
     return `(${AssignmentStatus.Mixed})`; // Fallback per si no hi ha estats diaris
  }

  return `(Mixt: ${parts.join(' ')})`;
};
