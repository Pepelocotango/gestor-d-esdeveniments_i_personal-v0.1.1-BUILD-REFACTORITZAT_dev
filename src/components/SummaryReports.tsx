import React, { useMemo } from 'react';
import { useEventData } from '../contexts/EventDataContext';
import { AssignmentStatus, SummaryRow } from '../types';
import { CsvIcon } from '../constants';
import { formatDateDMY, formatDateRangeDMY } from '../utils/dateFormat';
import { getStatusSummaryText } from '../utils/statusUtils';

interface SummaryReportsProps {
  setToastMessage: (message: string, type?: 'success' | 'error' | 'info' | 'warning', persistent?: boolean) => void;
}

const SummaryReports: React.FC<SummaryReportsProps> = ({ setToastMessage }) => {
  const { eventFrames, getPersonGroupById } = useEventData();

  // --- LÒGICA DE DADES (sense canvis) ---
  const allAssignmentsSummary = useMemo((): SummaryRow[] => {
    const summary: SummaryRow[] = [];
    eventFrames.forEach(ef => {
      ef.assignments.forEach(a => {
        const person = getPersonGroupById(a.personGroupId);
        summary.push({
          id: `${ef.id}-${a.id}`,
          primaryGrouping: ef.name,
          secondaryGrouping: person?.name || 'N/A',
          eventFrameName: ef.name,
          eventFramePlace: ef.place || '',
          eventFrameStartDate: ef.startDate,
          eventFrameEndDate: ef.endDate,
          assignmentPersonName: person?.name || 'N/A',
          assignmentStartDate: a.startDate,
          assignmentEndDate: a.endDate,
          assignmentStatus: a.status,
          assignmentNotes: a.notes || '',
          eventFrameGeneralNotes: ef.generalNotes || '',
          isMixedStatusAssignment: a.status === AssignmentStatus.Mixed,
          assignmentObject: a,
        });
      });
    });
    return summary;
  }, [eventFrames, getPersonGroupById]);

  const summaryByEventName = useMemo((): Map<string, SummaryRow[]> => {
    const map = new Map<string, SummaryRow[]>();
    allAssignmentsSummary.forEach(row => {
        if (!map.has(row.eventFrameName)) {
            map.set(row.eventFrameName, []);
        }
        map.get(row.eventFrameName)!.push(row);
    });
    return new Map([...map.entries()].sort((a, b) => {
        const dateA = new Date(a[1][0].eventFrameStartDate).getTime();
        const dateB = new Date(b[1][0].eventFrameStartDate).getTime();
        // CANVI: b - a per ordre descendent
        return dateB - dateA || a[0].localeCompare(b[0]);
    }));
  }, [allAssignmentsSummary]);

  const summaryByStartDate = useMemo((): Map<string, SummaryRow[]> => {
    const map = new Map<string, SummaryRow[]>();
    allAssignmentsSummary.forEach(row => {
        const dateStr = formatDateDMY(row.assignmentStartDate);
        if (!map.has(dateStr)) {
            map.set(dateStr, []);
        }
        map.get(dateStr)!.push(row);
    });
    // CANVI: b - a per ordre descendent
    return new Map([...map.entries()].sort((a, b) => new Date(b[0].split('/').reverse().join('-')).getTime() - new Date(a[0].split('/').reverse().join('-')).getTime()));
  }, [allAssignmentsSummary]);

  const summaryByPerson = useMemo((): Map<string, SummaryRow[]> => {
    const map = new Map<string, SummaryRow[]>();
    allAssignmentsSummary.forEach(row => {
        if (!map.has(row.assignmentPersonName)) map.set(row.assignmentPersonName, []);
        map.get(row.assignmentPersonName)!.push(row);
    });
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [allAssignmentsSummary]);

  // --- LÒGICA D'EXPORTACIÓ (sense canvis) ---
  const escapeCsvCell = (cellData: string | number | boolean | undefined | null): string => {
    if (cellData === undefined || cellData === null) return '';
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
      return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
  };

  const downloadCsv = (csvContent: string, filename: string) => {
    if (!csvContent.trim() || csvContent.split('\n').length <= 1) {
        setToastMessage("No hi ha dades per exportar en aquest resum.", 'info');
        return;
    }
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMessage(`Resum "${filename}" exportat a CSV.`, 'success');
  };

  const generateDetailedCsv = (dataType: 'event-name' | 'start-date' | 'person', groupKey: string | null = null): string => {
    let assignmentsToProcess: SummaryRow[] = allAssignmentsSummary;

    if (groupKey) {
        assignmentsToProcess = assignmentsToProcess.filter(a => {
            if (dataType === 'event-name') return a.eventFrameName === groupKey;
            if (dataType === 'start-date') return formatDateDMY(a.assignmentStartDate) === groupKey;
            if (dataType === 'person') return a.assignmentPersonName === groupKey;
            return false;
        });
    }

    const csvRows: string[][] = [];
    const headers = [
        'Agrupació Principal', 'Esdeveniment Marc', 'Dates Marc', 'Lloc Marc', 
        'Persona/Grup Assignat', 'Dates Assignació', 'Estat General', 'Detall Estats (si mixt)', 'Notes Assignació'
    ];
    csvRows.push(headers);

    assignmentsToProcess.forEach(a => {
        const statusDetail = a.isMixedStatusAssignment ? getStatusSummaryText(a.assignmentObject) : a.assignmentStatus;
        csvRows.push([
            a.primaryGrouping,
            a.eventFrameName,
            formatDateRangeDMY(a.eventFrameStartDate, a.eventFrameEndDate),
            a.eventFramePlace || '',
            a.assignmentPersonName,
            formatDateRangeDMY(a.assignmentStartDate, a.assignmentEndDate),
            a.assignmentStatus,
            statusDetail,
            a.assignmentNotes || ''
        ]);
    });
    
    return csvRows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
  };

  const handleExportCsv = (dataType: 'event-name' | 'start-date' | 'person', groupKey: string | null = null) => {
    const csvContent = generateDetailedCsv(dataType, groupKey);
    const dateSuffix = new Date().toISOString().slice(0, 10);
    const keySuffix = groupKey ? `_${groupKey.replace(/[^a-zA-Z0-9]/g, '-')}` : '';
    const filename = `resum_${dataType}${keySuffix}_${dateSuffix}.csv`;
    downloadCsv(csvContent, filename);
  };
  
  // --- RENDERITZAT (amb la correcció) ---
  const renderSummaryCard = (title: string, data: Map<string, SummaryRow[]>, dataType: 'event-name' | 'start-date' | 'person') => (
    <div className="bg-white dark:bg-gray-700/80 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        <button 
            onClick={() => handleExportCsv(dataType)}
            className="text-sm flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline"
            aria-label={`Exportar tot el resum ${title} a CSV`}
        >
            <CsvIcon className="w-4 h-4" /> Exportar Tot
        </button>
      </div>
      {Array.from(data.entries()).length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No hi ha dades per aquest resum.</p> : null}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2"> 
        {Array.from(data.entries()).map(([groupKey, assignments]) => (
          <div key={groupKey}>
            <div className="flex justify-between items-center mb-1 sticky top-0 bg-white dark:bg-gray-700/80 py-1 z-10">
              <h4 className="font-medium text-md text-indigo-700 dark:text-indigo-400 flex-grow">{groupKey}</h4>
              <button
                onClick={() => handleExportCsv(dataType, groupKey)}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0 ml-2"
                title={`Exportar només "${groupKey}"`}
              >
                <CsvIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
            <ul className="list-disc list-inside pl-4 space-y-1 text-sm">
              {assignments.map(a => {
                const statusColors: { [key in AssignmentStatus]: string } = {
                  [AssignmentStatus.Yes]: 'text-green-600 dark:text-green-400',
                  [AssignmentStatus.Pending]: 'text-yellow-600 dark:text-yellow-400',
                  [AssignmentStatus.No]: 'text-red-600 dark:text-red-400',
                  [AssignmentStatus.Mixed]: 'text-fuchsia-600 dark:text-fuchsia-400',
                };
                
                const getLabel = () => {
                  if (dataType === 'person') return `${a.eventFrameName} (${formatDateRangeDMY(a.assignmentStartDate, a.assignmentEndDate)})`;
                  if (dataType === 'start-date') return `${a.assignmentPersonName} - ${a.eventFrameName}`;
                  return `${a.assignmentPersonName} (${formatDateRangeDMY(a.assignmentStartDate, a.assignmentEndDate)})`;
                };

                return (
                <li key={a.id} className="text-gray-700 dark:text-gray-300">
                  {getLabel()}
                  {' - '}
                  
                  {a.assignmentStatus === AssignmentStatus.Mixed && a.assignmentObject.dailyStatuses ? (
                    <>
                      <span className={`font-semibold ${statusColors[AssignmentStatus.Mixed]}`}>(Mixt)</span>
                      <ul className="pl-5 mt-1 text-xs list-none">
                        {Object.entries(a.assignmentObject.dailyStatuses)
                          .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                          .map(([date, status]) => (
                          <li key={date} className={`font-semibold ${statusColors[status]}`}>
                            {formatDateDMY(date)} - {status}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <span className={`font-semibold ${statusColors[a.assignmentStatus as AssignmentStatus]}`}>
                      ({a.assignmentStatus})
                    </span>
                  )}
                </li>
              )})}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
      {renderSummaryCard("Per Nom d'Esdeveniment", summaryByEventName, "event-name")}
      {renderSummaryCard("Per Data d'Inici d'Assignació", summaryByStartDate, "start-date")}
      {renderSummaryCard("Per Persona/Grup", summaryByPerson, "person")}
    </div>
  );
};

export default SummaryReports;
