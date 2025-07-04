import { useState, useCallback, useEffect, useRef } from 'react';
import { EventFrame, PersonGroup, Assignment, AppData, EventFrameForExport, EventDataManagerReturn, AssignmentStatus, ShowToastFunction, TechSheetData } from '../types';
import { formatDateDMY } from '../utils/dateFormat';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const createDefaultTechSheet = (eventFrame: Omit<EventFrame, 'id' | 'assignments' | 'personnelComplete' | 'techSheet'>): TechSheetData => ({
  eventName: eventFrame.name,
  location: eventFrame.place || '',
  date: formatDateDMY(eventFrame.startDate),
  showTime: '',
  showDuration: '',
  parkingInfo: '',
  technicalPersonnel: [],
  preAssemblySchedule: '',
  assemblySchedule: [],
  dressingRooms: '',
  actors: '',
  companyTechnicians: '',
  lightingNeeds: [],
  soundNeeds: [],
  videoNeeds: [],
  machineryNeeds: [],
  controlLocation: '',
  otherEquipment: '',
  rentals: '',
  blueprints: '',
  companyContact: '',
  observations: '',
});

type AssignmentOperationResult = { success: boolean; message?: string; warningMessage?: string };

export const useEventDataManager = (
  showToast: ShowToastFunction,
): EventDataManagerReturn => {
  const [eventFrames, setEventFrames] = useState<EventFrame[]>([]);
  const [peopleGroups, setPeopleGroups] = useState<PersonGroup[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const eventFramesRef = useRef(eventFrames);
  const peopleGroupsRef = useRef(peopleGroups);

  useEffect(() => { eventFramesRef.current = eventFrames; }, [eventFrames]);
  useEffect(() => { peopleGroupsRef.current = peopleGroups; }, [peopleGroups]);


  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const refreshGoogleEvents = useCallback(async () => {
    if (window.electronAPI?.getGoogleEvents) {
        const result = await window.electronAPI.getGoogleEvents();
        if (result.success && result.events) {
            setGoogleEvents(result.events);
        } else if (result.message) {
            console.error("Error refrescant esdeveniments de Google:", result.message);
        }
    }
  }, []);

  const addEventFrame = useCallback((newEventFrameData: Omit<EventFrame, 'id' | 'assignments' | 'personnelComplete' | 'techSheet'>): EventFrame => {
    const newEventFrame: EventFrame = {
      ...newEventFrameData,
      id: generateId(),
      assignments: [],
      personnelComplete: false,
      techSheet: createDefaultTechSheet(newEventFrameData),
    };
    setEventFrames(prev => [...prev, newEventFrame].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime() || a.name.localeCompare(b.name)));
    markUnsaved();
    return newEventFrame;
  }, [markUnsaved]);
  
  const updateEventFrame = useCallback((updatedEventFrame: EventFrame) => {
    setEventFrames(prev => prev.map(ef => ef.id === updatedEventFrame.id ? updatedEventFrame : ef)
      .sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime() || a.name.localeCompare(b.name))
    );
    markUnsaved();
  }, [markUnsaved]);
  
  const addOrUpdateTechSheet = useCallback((eventFrameId: string, techSheetData: TechSheetData) => {
    setEventFrames(prevFrames => 
      prevFrames.map(ef => {
        if (ef.id === eventFrameId) {
          return { ...ef, techSheet: techSheetData };
        }
        return ef;
      })
    );
    markUnsaved();
  }, [markUnsaved]);


 const deleteEventFrame = useCallback((eventFrameId: string) => {
    setEventFrames(prev => prev.filter(ef => ef.id !== eventFrameId));
markUnsaved();
}, [markUnsaved]);

  const getEventFrameById = useCallback((eventFrameId: string): EventFrame | undefined => {
    return eventFrames.find(ef => ef.id === eventFrameId);
  }, [eventFrames]);

  const addPersonGroup = useCallback((newPersonGroupData: Omit<PersonGroup, 'id'>) => {
    const newPersonGroup: PersonGroup = {
        id: generateId(),
        name: newPersonGroupData.name,
        role: newPersonGroupData.role || '',
        tel1: newPersonGroupData.tel1 || '',
        tel2: newPersonGroupData.tel2 || '',
        email: newPersonGroupData.email || '',
        web: newPersonGroupData.web || '',
        notes: newPersonGroupData.notes || ''
    };
    setPeopleGroups(prev => [...prev, newPersonGroup].sort((a,b) => a.name.localeCompare(b.name)));
    markUnsaved();
  }, [markUnsaved]);

  const updatePersonGroup = useCallback((updatedPersonGroup: PersonGroup) => {
    setPeopleGroups(prev => prev.map(pg => pg.id === updatedPersonGroup.id ? updatedPersonGroup : pg)
      .sort((a,b) => a.name.localeCompare(b.name))
    );
    markUnsaved();
  }, [markUnsaved]);

  const deletePersonGroup = useCallback((personGroupId: string) => {
    setPeopleGroups(prev => prev.filter(pg => pg.id !== personGroupId));
    setEventFrames(prevFrames => prevFrames.map(ef => ({
      ...ef,
      assignments: ef.assignments.filter(a => a.personGroupId !== personGroupId)
    })));
    markUnsaved();
  }, [markUnsaved]);

  const getPersonGroupById = useCallback((personGroupId: string): PersonGroup | undefined => {
    return peopleGroups.find(pg => pg.id === personGroupId);
  }, [peopleGroups]);

  const addAssignment = useCallback((eventFrameId: string, newAssignmentData: Omit<Assignment, 'id' | 'eventFrameId' | 'dailyStatuses'>): AssignmentOperationResult => {
    const eventFrame = eventFrames.find(ef => ef.id === eventFrameId);
    if (!eventFrame) return { success: false, message: "Marc d'esdeveniment no trobat." };

    if (newAssignmentData.status === AssignmentStatus.Yes || newAssignmentData.status === AssignmentStatus.Pending) {
      const allOtherAssignments = eventFrames.flatMap(ef => ef.assignments.filter(a => a.personGroupId === newAssignmentData.personGroupId));
      
      const newStartDate = new Date(newAssignmentData.startDate);
      const newEndDate = new Date(newAssignmentData.endDate);
      
      for (let d = newStartDate; d <= newEndDate; d.setDate(d.getDate() + 1)) {
        const currentDateStr = d.toISOString().split('T')[0];
        
        const conflictingAssignments = allOtherAssignments.filter(existing => {
            const existingStart = new Date(existing.startDate);
            const existingEnd = new Date(existing.endDate);
            if (d < existingStart || d > existingEnd) return false;

            if(existing.status === AssignmentStatus.Yes || existing.status === AssignmentStatus.Pending) return true;
            if(existing.status === AssignmentStatus.Mixed && existing.dailyStatuses?.[currentDateStr] && existing.dailyStatuses[currentDateStr] !== AssignmentStatus.No) return true;
            
            return false;
        });

        if (conflictingAssignments.length > 0) {
          const conflictDetails = conflictingAssignments.map(conflict => {
              const conflictingEvent = eventFrames.find(ef => ef.id === conflict.eventFrameId);
              return `"${conflictingEvent?.name}" el ${formatDateDMY(currentDateStr)}`;
          }).join(", ");
          return { success: true, warningMessage: `Conflicte detectat: La persona ja està assignada a ${conflictDetails}.` };
        }
      }
    }

    const newAssignment: Assignment = {
      ...newAssignmentData,
      id: generateId(),
      eventFrameId,
    };
    setEventFrames(prev => prev.map(ef_loc =>
      ef_loc.id === eventFrameId
        ? { ...ef_loc, assignments: [...ef_loc.assignments, newAssignment].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) }
        : ef_loc
    ));
    markUnsaved();
    return { success: true };
  }, [eventFrames, markUnsaved]);

  const updateAssignment = useCallback((updatedAssignment: Assignment, context?: { changedDate?: string }): AssignmentOperationResult => {
    let finalAssignment = { ...updatedAssignment };
    if (finalAssignment.status === AssignmentStatus.Mixed) {
      if (!finalAssignment.dailyStatuses) finalAssignment.dailyStatuses = {};
    } else {
      finalAssignment.dailyStatuses = undefined;
    }

    const allOtherAssignments = eventFrames.flatMap(ef => 
        ef.assignments.filter(a => a.personGroupId === finalAssignment.personGroupId && a.id !== finalAssignment.id)
    );

    const checkDateRange = (start: Date, end: Date, statusToCheck: AssignmentStatus | { [date: string]: AssignmentStatus }) => {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const currentDateStr = d.toISOString().split('T')[0];
            
            let currentDayStatus: AssignmentStatus | undefined;
            if (typeof statusToCheck === 'string') {
                currentDayStatus = statusToCheck;
            } else {
                currentDayStatus = statusToCheck[currentDateStr];
            }

            if (!currentDayStatus || currentDayStatus === AssignmentStatus.No) continue;

            const conflictingAssignments = allOtherAssignments.filter(existing => {
                const existingStart = new Date(existing.startDate);
                const existingEnd = new Date(existing.endDate);
                if (d < existingStart || d > existingEnd) return false;

                if (existing.status === AssignmentStatus.Yes || existing.status === AssignmentStatus.Pending) return true;
                if (existing.status === AssignmentStatus.Mixed && existing.dailyStatuses?.[currentDateStr] && existing.dailyStatuses[currentDateStr] !== AssignmentStatus.No) return true;

                return false;
            });
            
            if (conflictingAssignments.length > 0) {
                const conflictDetails = conflictingAssignments.map(conflict => `"${eventFrames.find(ef => ef.id === conflict.eventFrameId)?.name}" el ${formatDateDMY(currentDateStr)}`).join(", ");
                return `Conflicte detectat: La persona ja està assignada a ${conflictDetails}.`;
            }
        }
        return null;
    };
    
    let warningMessage: string | null = null;
    if (finalAssignment.status !== AssignmentStatus.No) {
        if (context?.changedDate) {
            const specificDate = new Date(context.changedDate);
            warningMessage = checkDateRange(specificDate, specificDate, finalAssignment.dailyStatuses || finalAssignment.status);
        } else {
            warningMessage = checkDateRange(new Date(finalAssignment.startDate), new Date(finalAssignment.endDate), finalAssignment.dailyStatuses || finalAssignment.status);
        }
    }
    
    setEventFrames(prev => prev.map(ef_loc =>
      ef_loc.id === finalAssignment.eventFrameId
        ? { ...ef_loc, assignments: ef_loc.assignments.map(a => a.id === finalAssignment.id ? finalAssignment : a).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) }
        : ef_loc
    ));
    markUnsaved();
    return { success: true, warningMessage: warningMessage || undefined };
  }, [eventFrames, markUnsaved]);

  const deleteAssignment = useCallback((eventFrameId: string, assignmentId: string) => {
    setEventFrames(prev => prev.map(ef =>
      ef.id === eventFrameId
        ? { ...ef, assignments: ef.assignments.filter(a => a.id !== assignmentId) }
        : ef
    ));
    markUnsaved();
  }, [markUnsaved]);

  const getAssignmentById = useCallback((eventFrameId: string, assignmentId: string): Assignment | undefined => {
    const eventFrame = eventFrames.find(ef => ef.id === eventFrameId);
    return eventFrame?.assignments.find(a => a.id === assignmentId);
  }, [eventFrames]);

  const loadData = useCallback((data: AppData | null) => {
    if (!data) {
      setEventFrames([]);
      setPeopleGroups([]);
      return;
    }

    const loadedEventFrames: EventFrame[] = (data.eventFrames || []).map((efExport: EventFrameForExport) => ({
      ...efExport,
      assignments: [],
      personnelComplete: efExport.personnelComplete || false,
    }));

    if (data.assignments && data.assignments.length > 0) {
      data.assignments.forEach(assignmentFromFile => {
        const targetFrame = loadedEventFrames.find(ef => ef.id === assignmentFromFile.eventFrameId);
        if (targetFrame) {
          const assignmentWithDefaults: Partial<Assignment> = { ...assignmentFromFile };
          
          const oldAssignment = assignmentFromFile as any;
          if (oldAssignment.isMixedStatus === true && assignmentWithDefaults.status !== AssignmentStatus.Mixed) {
            assignmentWithDefaults.status = AssignmentStatus.Mixed;
          }
          delete oldAssignment.isMixedStatus;

          if (assignmentWithDefaults.status !== AssignmentStatus.Mixed) {
            assignmentWithDefaults.dailyStatuses = undefined;
          }

          targetFrame.assignments.push(assignmentWithDefaults as Assignment);
        } else {
          console.warn(`L'assignació amb ID ${assignmentFromFile.id} fa referència a un eventFrameId (${assignmentFromFile.eventFrameId}) que no existeix. S'ometrà.`);
        }
      });
    }

    loadedEventFrames.forEach(ef => {
      ef.assignments.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    });

    setEventFrames(loadedEventFrames.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime() || a.name.localeCompare(b.name)));
    setPeopleGroups((data.peopleGroups || []).sort((a,b) => a.name.localeCompare(b.name)));
  }, []);

  const exportData = useCallback((): AppData => {
    const allAssignmentsList: Assignment[] = eventFramesRef.current.flatMap(ef => ef.assignments);
    const eventFramesForExport: EventFrameForExport[] = eventFramesRef.current.map(({ assignments, ...restOfFrame }) => restOfFrame);

    return {
      peopleGroups: peopleGroupsRef.current,
      eventFrames: eventFramesForExport,
      assignments: allAssignmentsList,
    };
   }, []);

  const setPersonnelComplete = useCallback((eventFrameId: string, complete: boolean) => {
    setEventFrames(prev => prev.map(ef => ef.id === eventFrameId ? {...ef, personnelComplete: complete} : ef));
    markUnsaved();
  }, [markUnsaved]);

  const syncWithGoogle = useCallback(async () => {
    setIsSyncing(true);
    if (!window.electronAPI) {
        showToast('La sincronització només està disponible a l\'aplicació d\'escriptori.', 'warning');
        setIsSyncing(false);
        return;
    }

    const localData = exportData();
    const result = await window.electronAPI.syncWithGoogle(localData);

    if (result.success && result.data) {
        loadData(result.data);
        await refreshGoogleEvents();
        showToast(result.message || 'Sincronització completada.', 'success');
    } else {
        showToast(result.message || 'Hi ha hagut un error durant la sincronització.', 'error');
    }
    setIsSyncing(false);
  }, [showToast, exportData, loadData, refreshGoogleEvents]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "Teniu canvis sense desar. Esteu segur que voleu sortir?";
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    eventFrames,
    peopleGroups,
    addEventFrame,
    updateEventFrame,
    deleteEventFrame,
    getEventFrameById,
    addPersonGroup,
    updatePersonGroup,
    deletePersonGroup,
    getPersonGroupById,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    getAssignmentById,
    loadData,
    exportData,
    setPersonnelComplete,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    googleEvents,
    refreshGoogleEvents,
    syncWithGoogle,
    isSyncing,
    addOrUpdateTechSheet,
  };
};
