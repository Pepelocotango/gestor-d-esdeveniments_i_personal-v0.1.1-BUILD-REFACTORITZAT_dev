import { AppData, PersonGroup, EventFrameForExport, Assignment, AssignmentStatus } from '../types';

interface OldPeopleData {
  people: {
    id: number;
    name: string;
    role?: string;
    tel1?: string;
    tel2?: string;
    email?: string;
    web?: string;
    notes?: string;
  }[];
}

interface OldEventData {
  eventFrames: {
    id: number;
    eventName: string;
    location?: string;
    generalStartDate: string;
    generalEndDate: string | null;
    notesGeneral?: string;
    isPersonnelComplete?: boolean;
  }[];
}

interface OldAssignmentData {
  assignments: {
    id: number;
    eventFrameId: number;
    personId: number;
    assignmentStartDate: string;
    assignmentEndDate: string | null;
    status?: 'Sí' | 'No' | 'Pendent';
    notesAssignment?: string;
  }[];
}

export const migrateData = (
  peopleData?: OldPeopleData, 
  eventData?: OldEventData, 
  assignmentData?: OldAssignmentData
): AppData => {
  // Convertir people a peopleGroups
  const peopleGroups: PersonGroup[] = (peopleData?.people || []).map(p => ({
    id: p.id.toString(),
    name: p.name,
    role: p.role || '',
    tel1: p.tel1 || '',
    tel2: p.tel2 || '',
    email: p.email || '',
    web: p.web || '',
    notes: p.notes || ''
  }));

  // Convertir events a eventFrames
  const eventFrames: EventFrameForExport[] = (eventData?.eventFrames || []).map(e => ({
    id: e.id.toString(),
    name: e.eventName,
    place: e.location || '',
    startDate: e.generalStartDate,
    endDate: e.generalEndDate || e.generalStartDate,
    generalNotes: e.notesGeneral || '',
    personnelComplete: e.isPersonnelComplete || false
  }));

  // Convertir assignments manteniendo las referencias
  const assignments: Assignment[] = (assignmentData?.assignments || []).map(a => ({
    id: a.id.toString(),
    eventFrameId: a.eventFrameId.toString(),
    personGroupId: a.personId.toString(),
    startDate: a.assignmentStartDate,
    endDate: a.assignmentEndDate || a.assignmentStartDate,
    status: convertOldStatus(a.status),
    notes: a.notesAssignment || ''
  }));

  return {
    peopleGroups,
    eventFrames,
    assignments
  };
};

const convertOldStatus = (status?: string): AssignmentStatus => {
  switch (status) {
    case 'Sí':
      return AssignmentStatus.Yes;
    case 'No':
      return AssignmentStatus.No;
    default:
      return AssignmentStatus.Pending;
  }
};

export const validateMigratedData = (data: AppData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validar que todos los IDs sean strings
  if (data.peopleGroups.some(p => typeof p.id !== 'string')) {
    errors.push('Algunos IDs de peopleGroups no son strings');
  }
  if (data.eventFrames.some(e => typeof e.id !== 'string')) {
    errors.push('Algunos IDs de eventFrames no son strings');
  }
  if (data.assignments.some(a => typeof a.id !== 'string')) {
    errors.push('Algunos IDs de assignments no son strings');
  }

  // Validar referencias de assignments
  data.assignments.forEach(a => {
    if (!data.eventFrames.some(e => e.id === a.eventFrameId)) {
      errors.push(`Assignment ${a.id} referencia a un eventFrame que no existe: ${a.eventFrameId}`);
    }
    if (!data.peopleGroups.some(p => p.id === a.personGroupId)) {
      errors.push(`Assignment ${a.id} referencia a una persona que no existe: ${a.personGroupId}`);
    }
  });

  // Validar fechas
  data.eventFrames.forEach(e => {
    if (!isValidDate(e.startDate)) {
      errors.push(`EventFrame ${e.id} tiene una fecha de inicio inválida: ${e.startDate}`);
    }
    if (!isValidDate(e.endDate)) {
      errors.push(`EventFrame ${e.id} tiene una fecha de fin inválida: ${e.endDate}`);
    }
  });

  data.assignments.forEach(a => {
    if (!isValidDate(a.startDate)) {
      errors.push(`Assignment ${a.id} tiene una fecha de inicio inválida: ${a.startDate}`);
    }
    if (!isValidDate(a.endDate)) {
      errors.push(`Assignment ${a.id} tiene una fecha de fin inválida: ${a.endDate}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};
