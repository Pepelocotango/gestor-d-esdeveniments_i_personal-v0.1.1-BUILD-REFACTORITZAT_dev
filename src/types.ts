export enum AssignmentStatus {
  Pending = 'Pendent',
  Yes = 'Sí',
  No = 'No',
  Mixed = 'Mixt',
}

export interface PersonGroup {
  id: string;
  name: string;
  role?: string;
  tel1?: string;
  tel2?: string;
  email?: string;
  web?: string;
  notes?: string;
}

export interface Assignment {
  id:string;
  personGroupId: string;
  eventFrameId: string;
  startDate: string; // Data d'inici de l'assignació general
  endDate: string;   // Data de fi de l'assignació general
  status: AssignmentStatus; // Ara pot ser 'Pendent', 'Sí', 'No', o 'Mixt'
  notes?: string;
  dailyStatuses?: { // Opcional: només existirà si l'status és 'Mixt'
    [dateYYYYMMDD: string]: AssignmentStatus;
  };
}

export interface EventFrame {
  id: string;
  name: string;
  place?: string;
  startDate: string;
  endDate: string;
  generalNotes?: string;
  personnelComplete?: boolean;
  assignments: Assignment[];
}

export type EventFrameForExport = Omit<EventFrame, 'assignments'>;

export interface AppData {
  eventFrames: EventFrameForExport[];
  peopleGroups: PersonGroup[];
  assignments: Assignment[]; // Les assignacions aquí contindran la nova estructura si escau
}

export interface InitialEventFrameData {
    startDate?: string;
    endDate?: string;
}

export type ModalType =
  | 'addEventFrame'
  | 'editEventFrame'
  | 'addAssignment'
  | 'editAssignment'
  | 'managePeople'
  | 'eventFrameDetails'
  | 'confirmDeleteEventFrame'
  | 'confirmDeleteAssignment'
  | 'confirmDeletePersonGroup'
  | null;

export interface ModalData {
    eventFrameToEdit?: EventFrame;
    eventFrame?: EventFrame;
    assignmentToEdit?: Assignment;
    itemName?: string;
    itemId?: string;
    eventFrameId?: string;
    assignmentId?: string;
    startDate?: string;
    endDate?: string;
    itemType?: string;
    onConfirmSpecial?: () => void;
    confirmButtonText?: string;
    cancelButtonText?: string;
    titleOverride?: string;
}

export interface ModalState {
  type: ModalType;
  data?: ModalData | null;
}


export interface EventDataConteImplicits {
  eventFrames: EventFrame[];
  peopleGroups: PersonGroup[];
  addEventFrame: (eventFrame: Omit<EventFrame, 'id' | 'assignments' | 'personnelComplete'>) => void;
  updateEventFrame: (eventFrame: EventFrame) => void;
  deleteEventFrame: (eventFrameId: string) => void;
  getEventFrameById: (eventFrameId: string) => EventFrame | undefined;
  openModal: (type: ModalType, data?: ModalData) => void;
  addPersonGroup: (personGroup: Omit<PersonGroup, 'id'>) => void;
  updatePersonGroup: (personGroup: PersonGroup) => void;
  deletePersonGroup: (personGroupId: string) => void;
  getPersonGroupById: (personGroupId: string) => PersonGroup | undefined;
  addAssignment: (eventFrameId: string, assignment: Omit<Assignment, 'id' | 'eventFrameId' | 'dailyStatuses' | 'isMixedStatus'>) => { success: boolean; message?: string; warningMessage?: string };
  updateAssignment: (assignment: Assignment) => { success: boolean; message?: string; warningMessage?: string };
  deleteAssignment: (eventFrameId: string, assignmentId: string) => void;
  getAssignmentById: (eventFrameId: string, assignmentId: string) => Assignment | undefined;
  loadData: (data: AppData | null) => void;
  exportData: () => AppData;
  setPersonnelComplete: (eventFrameId: string, complete: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
}

export type EventDataManagerReturn = Omit<EventDataConteImplicits, 'openModal'>;

export interface SummaryRow {
  id: string;
  primaryGrouping: string;
  secondaryGrouping?: string;
  eventFrameName: string;
  eventFramePlace?: string;
  eventFrameStartDate: string;
  eventFrameEndDate: string;
  assignmentPersonName: string;
  assignmentStartDate: string;
  assignmentEndDate: string;
  assignmentStatus: AssignmentStatus | '';
  assignmentNotes?: string;
  eventFrameGeneralNotes?: string;
  isMixedStatusAssignment?: boolean;
  assignmentObject: Assignment;
  [key: string]: any;
}


export interface Person {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface BaseCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}

export interface CalendarAssignmentEvent extends BaseCalendarEvent {
  extendedProps: {
    type: 'assignment';
    eventFrameId: string;
    assignmentId: string; // L'ID de l'assignació general
    // Podríem afegir informació sobre si és mixta aquí si el calendari ho necessita
  };
}

export interface CalendarEventFrameEvent extends BaseCalendarEvent {
  extendedProps: {
    type: 'eventFrame';
    eventFrameId: string;
    assignmentId?: undefined;
  };
  allDay: true;
}

export type CalendarEventType = CalendarAssignmentEvent | CalendarEventFrameEvent;
