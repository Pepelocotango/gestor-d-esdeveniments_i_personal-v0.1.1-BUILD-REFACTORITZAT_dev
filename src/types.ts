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
  startDate: string;
  endDate: string;
  status: AssignmentStatus;
  notes?: string;
  dailyStatuses?: {
    [dateYYYYMMDD: string]: AssignmentStatus;
  };
}

// <<< NOVES INTERFÍCIES PER A LA FITXA TÈCNICA (Tech Sheet) >>>
export interface TechSheetPersonnel {
  id: string;
  role: string;
  name: string;
  origin: string; // <<< CANVIAT: Ara és un string lliure
}

export interface TechSheetScheduleItem {
  id: string;
  time: string;
  description: string;
}

export interface TechSheetNeed {
  id: string;
  quantity: number | string;
  description: string;
  origin: string; // <<< CANVIAT: Ara és un string lliure
}

export interface TechSheetData {
  // Secció General
  eventName: string;
  location: string;
  date: string;
  showTime: string;
  showDuration: string;
  parkingInfo: string;
  
  // Secció Personal
  technicalPersonnel: TechSheetPersonnel[];
  
  // Secció Horaris
  preAssemblySchedule: string;
  assemblySchedule: TechSheetScheduleItem[];
  
  // Secció Logística
  dressingRooms: string;
  actors: string;
  companyTechnicians: string;
  
  // Seccions de Necessitats Tècniques
  lightingNeeds: TechSheetNeed[];
  soundNeeds: TechSheetNeed[];
  videoNeeds: TechSheetNeed[];
  machineryNeeds: TechSheetNeed[];
  
  // Altres seccions
  controlLocation: string;
  otherEquipment: string;
  rentals: string;
  blueprints: string;
  companyContact: string;
  observations: string;
}
// <<< FI DE LES NOVES INTERFÍCIES >>>


export interface EventFrame {
  id: string;
  name: string;
  place?: string;
  startDate: string;
  endDate: string;
  generalNotes?: string;
  personnelComplete?: boolean;
  assignments: Assignment[];
  googleEventId?: string;
  googleCalendarId?: string;
  lastModified?: string;
  lastSync?: string;
  techSheet?: TechSheetData; // <<< CAMP AFEGIT
}

export type EventFrameForExport = Omit<EventFrame, 'assignments'>;

export interface AppData {
  eventFrames: EventFrameForExport[];
  peopleGroups: PersonGroup[];
  assignments: Assignment[];
}

export interface InitialEventFrameData {
    startDate?: string;
    endDate?: string;
}

export type ShowToastFunction = (
  message: string, 
  type?: 'success' | 'error' | 'info' | 'warning', 
  persistent?: boolean
) => void;


export type ModalType =
  | 'addEventFrame'
  | 'editEventFrame'
  | 'addAssignment'
  | 'editAssignment'
  | 'managePeople'
  | 'eventFrameDetails'
  | 'confirmDeleteEventFrame'
  | 'confirmDeleteAssignment'
  | 'googleSettings'
  | 'confirmHardReset'
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
    onCloseModal?: () => void;
    titleOverride?: string;
}

export interface ModalState {
  type: ModalType;
  data?: ModalData | null;
}


export interface EventDataConteImplicits {
  eventFrames: EventFrame[];
  peopleGroups: PersonGroup[];
  addEventFrame: (eventFrame: Omit<EventFrame, 'id' | 'assignments' | 'personnelComplete' | 'techSheet'>) => EventFrame;
  updateEventFrame: (eventFrame: EventFrame) => void;
  deleteEventFrame: (eventFrameId: string) => void;
  getEventFrameById: (eventFrameId: string) => EventFrame | undefined;
  openModal: (type: ModalType, data?: ModalData) => void;
  showToast: ShowToastFunction; // <<< LÍNIA AFEGIDA
  addPersonGroup: (personGroup: Omit<PersonGroup, 'id'>) => void;
  updatePersonGroup: (personGroup: PersonGroup) => void;
  deletePersonGroup: (personGroupId: string) => void;
  getPersonGroupById: (personGroupId: string) => PersonGroup | undefined;
  addAssignment: (eventFrameId: string, assignment: Omit<Assignment, 'id' | 'eventFrameId' | 'dailyStatuses'>) => { success: boolean; message?: string; warningMessage?: string };
  updateAssignment: (assignment: Assignment, context?: { changedDate?: string }) => { success: boolean; message?: string; warningMessage?: string };
  deleteAssignment: (eventFrameId: string, assignmentId: string) => void;  getAssignmentById: (eventFrameId: string, assignmentId: string) => Assignment | undefined;
  loadData: (data: AppData | null) => void;
  exportData: () => AppData;
  setPersonnelComplete: (eventFrameId: string, complete: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  googleEvents: any[];
  refreshGoogleEvents: () => Promise<void>;
  syncWithGoogle: () => Promise<void>;
  isSyncing: boolean;
  addOrUpdateTechSheet: (eventFrameId: string, fitxaData: TechSheetData) => void;
}

export type EventDataManagerReturn = Omit<EventDataConteImplicits, 'openModal' | 'showToast'>;

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
    assignmentId: string;
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
export interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
  primary?: boolean;
}