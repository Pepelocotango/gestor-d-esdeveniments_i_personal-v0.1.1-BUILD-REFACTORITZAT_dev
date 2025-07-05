import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { useEventData } from '../../contexts/EventDataContext';
import { EventFrame, TechSheetData, TechSheetPersonnel, TechSheetScheduleItem, TechSheetNeed } from '../../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import TechSheetSection from './TechSheetSection';
import TechSheetField from './TechSheetField';
import { formatDateDMY } from '../../utils/dateFormat';

interface TechSheetFormProps {
  eventFrame: EventFrame;
}


const TechSheetForm: React.FC<TechSheetFormProps> = ({ eventFrame }) => {
  const { addOrUpdateTechSheet, showToast, getPersonGroupById } = useEventData();
  const [formData, setFormData] = useState<TechSheetData>(eventFrame.techSheet!);
  const [isDirty, setIsDirty] = useState(false); // Per controlar si hi ha canvis pendents de desar
  const formRef = useRef<HTMLDivElement>(null);

  // Omple automàticament el personal tècnic confirmat si la fitxa és nova o buida
  useEffect(() => {
    if (eventFrame && eventFrame.assignments && eventFrame.assignments.length > 0 && formData.technicalPersonnel.length === 0) {
      // Filtra assignacions confirmades (Sí) o Mixt amb almenys un dia Sí
      const confirmedPersonnel = eventFrame.assignments
        .filter(a => a.status === 'Sí' || (a.status === 'Mixt' && a.dailyStatuses && Object.values(a.dailyStatuses).some(st => st === 'Sí')))
        .map(a => {
          const person = getPersonGroupById(a.personGroupId);
          return {
            id: a.personGroupId,
            role: person?.role || '',
            name: person?.name || '',
            notes: a.notes || '',
          };
        });
      if (confirmedPersonnel.length > 0) {
        setFormData(prev => ({ ...prev, technicalPersonnel: confirmedPersonnel }));
        setIsDirty(true);
      }
    }
  }, [eventFrame, formData.technicalPersonnel.length, getPersonGroupById]);

  // Si l'esdeveniment dura més d'un dia, afegeix la informació a la fitxa
  useEffect(() => {
    if (eventFrame.startDate !== eventFrame.endDate) {
      const dateRange = `${formatDateDMY(eventFrame.startDate)} - ${formatDateDMY(eventFrame.endDate)}`;
      if (formData.date !== dateRange) {
        setFormData(prev => ({ ...prev, date: dateRange }));
        setIsDirty(true);
      }
    }
  }, [eventFrame.startDate, eventFrame.endDate, formData.date]);

  // Helper per generar IDs únics per a nous items en llistes
  const generateLocalId = () => `local_${Date.now().toString(36) + Math.random().toString(36).substring(2)}`;

  // Tipus per a les claus de les llistes de TechSheetData
  type TechSheetListKey = 'technicalPersonnel' | 'assemblySchedule' | 'lightingNeeds' | 'soundNeeds' | 'videoNeeds' | 'machineryNeeds';

  useEffect(() => {
    setFormData(currentFormData => {
      const newEventName = eventFrame.name;
      const newLocation = eventFrame.place || '';
      const newDate = formatDateDMY(eventFrame.startDate);

      if (
        currentFormData.eventName !== newEventName ||
        currentFormData.location !== newLocation ||
        currentFormData.date !== newDate
      ) {
        // Si hi ha canvis externs, també marquem com a "dirty" per si l'usuari estava editant
        setIsDirty(true);
        return {
          ...currentFormData,
          eventName: newEventName,
          location: newLocation,
          date: newDate,
        };
      }
      return currentFormData;
    });
  }, [eventFrame.name, eventFrame.place, eventFrame.startDate]);

  useEffect(() => {
    if (eventFrame.techSheet) {
      // Quan la techSheet canvia completament (ex: curació), resetejem l'estat del formulari
      // i considerem que no hi ha canvis "bruts" fets per l'usuari en aquest formulari concret.
      setFormData(eventFrame.techSheet);
      setIsDirty(false);
    }
  }, [eventFrame.techSheet]);

  if (!formData) {
    return <div>Carregant dades de la fitxa tècnica...</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true); // Marquem que hi ha canvis
  };

  const handleBlur = () => {
    if (isDirty) {
      addOrUpdateTechSheet(eventFrame.id, formData);
      showToast('Canvis desats automàticament.', 'success');
      setIsDirty(false);
    }
  };

  const handleListChange = (listName: TechSheetListKey, index: number, field: string, value: any) => {
    setFormData(prev => {
      const newList = [...prev[listName]];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [listName]: newList };
    });
    setIsDirty(true);
    // Considera si vols desar onBlur dels camps de la llista o només quan s'afegeix/elimina un ítem
    // O potser un botó de "Desar llista" si es torna complex. Per ara, el handleBlur general desarà.
  };

  const handleAddListItem = (listName: TechSheetListKey) => {
    setFormData(prev => {
      let newItem: any;
      switch (listName) {
        case 'technicalPersonnel':
          newItem = { id: generateLocalId(), role: '', name: '', origin: '' };
          break;
        case 'assemblySchedule':
          newItem = { id: generateLocalId(), time: '', description: '' };
          break;
        case 'lightingNeeds':
        case 'soundNeeds':
        case 'videoNeeds':
        case 'machineryNeeds':
          newItem = { id: generateLocalId(), quantity: '', description: '', origin: '' };
          break;
        default:
          return prev;
      }
      return { ...prev, [listName]: [...prev[listName], newItem] };
    });
    setIsDirty(true);
    // Després d'afegir, podem forçar el desat si volem, o esperar el proper blur/canvi.
    // Per consistència, esperarem el blur o un canvi en un camp.
  };

  const handleRemoveListItem = (listName: TechSheetListKey, index: number) => {
    setFormData(prev => {
      const newList = [...prev[listName]];
      newList.splice(index, 1);
      return { ...prev, [listName]: newList };
    });
    setIsDirty(true);
    // Forcem el desat immediatament després d'eliminar un ítem per evitar confusió
    // ja que no hi haurà un "blur" directe sobre l'element eliminat.
    // Passem una còpia actualitzada de formData a addOrUpdateTechSheet.
    const updatedList = formData[listName].filter((_, i) => i !== index);
    addOrUpdateTechSheet(eventFrame.id, { ...formData, [listName]: updatedList });
    showToast('Ítem eliminat i canvis desats.', 'info');
     // setIsDirty es manté a true si hi havia altres canvis, o es posa a false si només era aquest.
     // Per simplificar, el toast ja indica que s'ha desat. Si l'usuari fa més canvis, es tornarà dirty.
  };

  const handleExportToPdf = () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let y = 15;
      const left = 12;
      const line = (txt: string, size = 11, bold = false) => {
        pdf.setFontSize(size);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.text(txt, left, y);
        y += size * 0.5 + 5;
      };
      // Títol
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Fitxa Tècnica - ${formData.eventName}`, left, y);
      y += 10;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Lloc: ${formData.location || '-'}`, left, y);
      y += 6;
      pdf.text(`Data: ${formData.date || '-'}`, left, y);
      y += 6;
      pdf.text(`Hora: ${formData.showTime || '-'}   Durada: ${formData.showDuration || '-'}`, left, y);
      y += 8;
      // Secció Personal Tècnic
      line('Personal Tècnic', 13, true);
      if (formData.technicalPersonnel.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Rol', left, y);
        pdf.text('Nom', left + 40, y);
        pdf.text('Notes', left + 100, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        formData.technicalPersonnel.forEach(p => {
          pdf.text((p.role ?? '-') + '', left, y);
          pdf.text((p.name ?? '-') + '', left + 40, y);
          pdf.text((p.notes ?? '-') + '', left + 100, y, { maxWidth: 90 });
          y += 5;
        });
        y += 2;
      } else {
        pdf.text('Cap personal tècnic definit.', left, y);
        y += 5;
      }
      // Secció Horaris
      line('Premuntatge i Horaris', 13, true);
      pdf.setFontSize(10);
      pdf.text(`Premuntatge: ${(formData.preAssemblySchedule ?? '-') + ''}`, left, y);
      y += 5;
      if (Array.isArray(formData.assemblySchedule) && formData.assemblySchedule.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Hora', left, y);
        pdf.text('Descripció', left + 25, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        formData.assemblySchedule.forEach(h => {
          pdf.text((h.time ?? '-') + '', left, y);
          pdf.text((h.description ?? '-') + '', left + 25, y, { maxWidth: 150 });
          y += 5;
        });
        y += 2;
      }
      // Secció Logística
      line('Logística', 13, true);
      pdf.setFontSize(10);
      pdf.text(`Camerinos: ${formData.dressingRooms || '-'}`, left, y);
      y += 5;
      pdf.text(`Actors: ${formData.actorsNumber || '-'}  ${formData.actors || ''}`, left, y, { maxWidth: 180 });
      y += 5;
      pdf.text(`Tècnics/Producció Cia: ${formData.companyTechniciansNumber || '-'}  ${formData.companyTechnicians || ''}`, left, y, { maxWidth: 180 });
      y += 7;
      // Secció Necessitats Tècniques
      line('Necessitats Tècniques', 13, true);
      const printNeeds = (title: string, needs: any[]) => {
        if (needs.length === 0) return;
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, left, y);
        y += 5;
        pdf.text('Qt.', left, y);
        pdf.text('Descripció', left + 15, y);
        pdf.text('Origen', left + 100, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        needs.forEach(n => {
          pdf.text(String(n.quantity || '-'), left, y);
          pdf.text(n.description || '-', left + 15, y, { maxWidth: 80 });
          pdf.text(n.origin || '-', left + 100, y, { maxWidth: 60 });
          y += 5;
        });
        y += 2;
      };
      printNeeds('Il·luminació', formData.lightingNeeds);
      printNeeds('So', formData.soundNeeds);
      if (formData.videoDetails) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Vídeo', left, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Detalls: ${formData.videoDetails}`, left, y, { maxWidth: 180 });
        y += 5;
        printNeeds('', formData.videoNeeds);
      }
      printNeeds('Maquinària', formData.machineryNeeds);
      // Altres detalls
      line('Altres Detalls', 13, true);
      pdf.setFontSize(10);
      pdf.text(`Control a: ${formData.controlLocation || '-'}`, left, y);
      y += 5;
      pdf.text(`Material d’altres equipaments: ${formData.otherEquipment || '-'}`, left, y, { maxWidth: 180 });
      y += 5;
      pdf.text(`Lloguers: ${formData.rentals || '-'}`, left, y, { maxWidth: 180 });
      y += 5;
      pdf.text(`Plànols: ${formData.blueprints || '-'}`, left, y, { maxWidth: 180 });
      y += 7;
      // Contacte i Observacions
      line('Contacte i Observacions', 13, true);
      pdf.setFontSize(10);
      pdf.text(`Contacte companyia: ${formData.companyContact || '-'}`, left, y, { maxWidth: 180 });
      y += 5;
      pdf.text(`Observacions: ${formData.observations || '-'}`, left, y, { maxWidth: 180 });
      // Guarda el PDF
      const fileName = `Fitxa_Bolo_${eventFrame.name.replace(/[^a-z0-9]/gi, '_')}_${formData.date.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
      showToast('PDF generat amb èxit!', 'success');
    } catch (error) {
      showToast('Error generant PDF', 'error');
    }
  };

  return (
    <div ref={formRef} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-6 tech-sheet-form-container">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Fitxa de Bolo: <span className="text-blue-600 dark:text-blue-400">{eventFrame.name}</span>
        </h2>
        <button
          onClick={handleExportToPdf}
          className="export-pdf-button px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-semibold no-print"
        >
          Exportar a PDF
        </button>
      </div>
      <div className="mt-2"> {/* Afegit un div per mantenir el paràgraf si cal o per altres controls futurs */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Edita els detalls tècnics de l'esdeveniment. Els canvis es desen automàticament quan canvies de camp.
        </p>
      </div>

      <TechSheetSection title="Informació General">
        <TechSheetField id="eventName" label="NOM DEL BOLO:" value={formData.eventName} onChange={handleChange} onBlur={handleBlur} required />
        <TechSheetField id="location" label="LLOC:" value={formData.location} onChange={handleChange} onBlur={handleBlur} />
        <TechSheetField id="date" label="DATA:" value={formData.date} onChange={handleChange} onBlur={handleBlur} />
        <TechSheetField id="showTime" label="HORA:" value={formData.showTime} onChange={handleChange} onBlur={handleBlur} type="time" />
        <TechSheetField id="showDuration" label="DURADA ESPECTACLE:" value={formData.showDuration} onChange={handleChange} onBlur={handleBlur} placeholder="XX min" />
        {/* ZONA RESERVADA PARKING: selector SI/NO i detalls */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ZONA RESERVADA PARKING:</label>
          <select
            value={formData.parkingInfo?.startsWith('SI') ? 'SI' : (formData.parkingInfo?.startsWith('NO') ? 'NO' : '')}
            onChange={e => {
              const val = e.target.value;
              setFormData(prev => ({ ...prev, parkingInfo: val === 'NO' ? 'NO' : (val === 'SI' ? 'SI' : '') }));
              setIsDirty(true);
            }}
            className="mt-1 block w-32 pl-3 pr-10 py-1 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">--</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
          {formData.parkingInfo?.startsWith('SI') && (
            <textarea
              className="mt-2 block w-full border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Detalls de la zona de parking..."
              value={formData.parkingInfo.replace(/^SI:?\s*/, '')}
              onChange={e => {
                setFormData(prev => ({ ...prev, parkingInfo: `SI: ${e.target.value}` }));
                setIsDirty(true);
              }}
              onBlur={handleBlur}
            />
          )}
        </div>
      </TechSheetSection>

      <TechSheetSection
        title="Personal Tècnic"
        headerActions={
          <button
            type="button"
            onClick={() => {
              // Llegeix assignacions confirmades i afegeix-les a la llista (sense duplicats)
              const confirmedPersonnel = eventFrame.assignments
                .filter(a => a.status === 'Sí' || (a.status === 'Mixt' && a.dailyStatuses && Object.values(a.dailyStatuses).some(st => st === 'Sí')))
                .map(a => {
                  const person = getPersonGroupById(a.personGroupId);
                  return {
                    id: a.personGroupId,
                    role: person?.role || '',
                    name: person?.name || '',
                    notes: a.notes || '',
                  };
                });
              setFormData(prev => {
                // Evita duplicats per id
                const existingIds = new Set(prev.technicalPersonnel.map(p => p.id));
                const merged = [
                  ...prev.technicalPersonnel,
                  ...confirmedPersonnel.filter(p => !existingIds.has(p.id))
                ];
                return { ...prev, technicalPersonnel: merged };
              });
              setIsDirty(true);
              showToast('Personal tècnic actualitzat des de les assignacions.', 'success');
            }}
            className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium shadow no-print"
            title="Actualitza des d'assignacions"
          >
            <span className="font-bold">⟳</span> <span className="hidden sm:inline">Actualitza des d'assignacions</span>
          </button>
        }
      >
        {formData.technicalPersonnel.map((person, index) => (
          <React.Fragment key={person.id || `person-${index}`}> 
            <TechSheetField
              id={`person-role-${index}`}
              label={`Rol Personal ${index + 1}`}
              value={person.role}
              onChange={(e) => handleListChange('technicalPersonnel', index, 'role', e.target.value)}
              onBlur={handleBlur}
            />
            <TechSheetField
              id={`person-name-${index}`}
              label={`Nom Personal ${index + 1}`}
              value={person.name}
              onChange={(e) => handleListChange('technicalPersonnel', index, 'name', e.target.value)}
              onBlur={handleBlur}
            />
            <TechSheetField
              id={`person-notes-${index}`}
              label={`Notes Assignació ${index + 1}`}
              value={person.notes || ''}
              onChange={(e) => handleListChange('technicalPersonnel', index, 'notes', e.target.value)}
              onBlur={handleBlur}
              as="textarea"
              rows={1}
              placeholder="Comentaris específics de l'assignació..."
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleRemoveListItem('technicalPersonnel', index)}
                className="remove-item-button text-red-500 hover:bg-red-100 rounded-full w-7 h-7 flex items-center justify-center text-lg no-print"
                title="Eliminar"
              >
                ×
              </button>
            </div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2 no-print">
          <button
            type="button"
            onClick={() => handleAddListItem('technicalPersonnel')}
            className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
          >
            + Afegir Personal Tècnic
          </button>
        </div>
      </TechSheetSection>

      <TechSheetSection title="Premuntatge i Horaris">
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Premuntatge:</label>
          <select
            value={formData.preAssemblySchedule?.startsWith('SI') ? 'SI' : (formData.preAssemblySchedule?.startsWith('NO') ? 'NO' : '')}
            onChange={e => {
              const val = e.target.value;
              setFormData(prev => ({ ...prev, preAssemblySchedule: val === 'NO' ? 'NO' : (val === 'SI' ? 'SI' : '') }));
              setIsDirty(true);
            }}
            className="mt-1 block w-32 pl-3 pr-10 py-1 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">--</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
          {formData.preAssemblySchedule?.startsWith('SI') && (
            <textarea
              className="mt-2 block w-full border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Detalls premuntatge, personal, horaris..."
              value={formData.preAssemblySchedule.replace(/^SI:?\s*/, '')}
              onChange={e => {
                setFormData(prev => ({ ...prev, preAssemblySchedule: `SI: ${e.target.value}` }));
                setIsDirty(true);
              }}
              onBlur={handleBlur}
            />
          )}
        </div>
        {formData.preAssemblySchedule?.startsWith('SI') && (
          <>
            <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 mt-3 -mb-2">HORARIS PREMUNTATGE:</h4>
            {formData.assemblySchedule.map((item, index) => (
              <React.Fragment key={item.id || `schedule-${index}`}> 
                <TechSheetField
                  id={`schedule-time-${index}`}
                  label={`Hora ${index + 1}`}
                  value={item.time}
                  onChange={(e) => handleListChange('assemblySchedule', index, 'time', e.target.value)}
                  onBlur={handleBlur}
                  type="time"
                />
                <TechSheetField
                  id={`schedule-desc-${index}`}
                  label={`Descripció Horari ${index + 1}`}
                  value={item.description}
                  onChange={(e) => handleListChange('assemblySchedule', index, 'description', e.target.value)}
                  onBlur={handleBlur}
                  as="textarea"
                  rows={1}
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveListItem('assemblySchedule', index)}
                    className="remove-item-button px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm no-print"
                  >
                    Eliminar
                  </button>
                </div>
              </React.Fragment>
            ))}
            <div className="col-span-full mt-2 no-print">
              <button
                type="button"
                onClick={() => handleAddListItem('assemblySchedule')}
                className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
              >
                + Afegir Ítem Horari
              </button>
            </div>
          </>
        )}
      </TechSheetSection>

      <TechSheetSection title="Logística">
        <TechSheetField id="dressingRooms" label="CAMERINOS:" value={formData.dressingRooms} onChange={handleChange} onBlur={handleBlur} placeholder="Ex: SI X"/>
        {/* Actors: selector numèric i caixa de text si >0 */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ACTORS:</label>
          <select
            value={formData.actorsNumber || ''}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              setFormData(prev => ({ ...prev, actorsNumber: val, actors: val > 0 ? prev.actors : '' }));
              setIsDirty(true);
            }}
            className="mt-1 block w-24 pl-3 pr-10 py-1 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">--</option>
            {[...Array(21).keys()].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {Number(formData.actorsNumber) > 0 && (
            <textarea
              className="mt-2 block w-full border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Noms dels actors..."
              value={formData.actors || ''}
              onChange={e => {
                setFormData(prev => ({ ...prev, actors: e.target.value }));
                setIsDirty(true);
              }}
              onBlur={handleBlur}
            />
          )}
        </div>
        {/* Tècnics companyia: selector numèric i caixa de text si >0 */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">TÈCNICS/PRODUCCIÓ CIA:</label>
          <select
            value={formData.companyTechniciansNumber || ''}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              setFormData(prev => ({ ...prev, companyTechniciansNumber: val, companyTechnicians: val > 0 ? prev.companyTechnicians : '' }));
              setIsDirty(true);
            }}
            className="mt-1 block w-24 pl-3 pr-10 py-1 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">--</option>
            {[...Array(21).keys()].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {Number(formData.companyTechniciansNumber) > 0 && (
            <textarea
              className="mt-2 block w-full border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Noms dels tècnics/producció..."
              value={formData.companyTechnicians || ''}
              onChange={e => {
                setFormData(prev => ({ ...prev, companyTechnicians: e.target.value }));
                setIsDirty(true);
              }}
              onBlur={handleBlur}
            />
          )}
        </div>
      </TechSheetSection>

      <TechSheetSection title="Necessitats Tècniques">
        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 -mb-2">IL·LUMINACIÓ:</h4>
        {formData.lightingNeeds.map((need, index) => (
          <React.Fragment key={need.id || `light-need-${index}`}>
            <TechSheetField id={`light-qty-${index}`} label={`Qt. Il·lu. ${index + 1}`} value={need.quantity} onChange={e => handleListChange('lightingNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
            <TechSheetField id={`light-desc-${index}`} label={`Desc. Il·lu. ${index + 1}`} value={need.description} onChange={e => handleListChange('lightingNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
            <TechSheetField id={`light-origin-${index}`} label={`Origen Il·lu. ${index + 1}`} value={need.origin} onChange={e => handleListChange('lightingNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('lightingNeeds', index)} className="remove-item-button text-red-500 hover:bg-red-100 rounded-full w-7 h-7 flex items-center justify-center text-lg no-print" title="Eliminar">×</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2 no-print">
          <button type="button" onClick={() => handleAddListItem('lightingNeeds')} className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat Il·luminació</button>
        </div>

        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 mt-3 -mb-2">SO:</h4>
        {formData.soundNeeds.map((need, index) => (
          <React.Fragment key={need.id || `sound-need-${index}`}>
            <TechSheetField id={`sound-qty-${index}`} label={`Qt. So ${index + 1}`} value={need.quantity} onChange={e => handleListChange('soundNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
            <TechSheetField id={`sound-desc-${index}`} label={`Desc. So ${index + 1}`} value={need.description} onChange={e => handleListChange('soundNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
            <TechSheetField id={`sound-origin-${index}`} label={`Origen So ${index + 1}`} value={need.origin} onChange={e => handleListChange('soundNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('soundNeeds', index)} className="remove-item-button text-red-500 hover:bg-red-100 rounded-full w-7 h-7 flex items-center justify-center text-lg no-print" title="Eliminar">×</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2 no-print">
          <button type="button" onClick={() => handleAddListItem('soundNeeds')} className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat So</button>
        </div>

        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 mt-3 -mb-2">VÍDEO:</h4>
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">VÍDEO:</label>
          <select
            value={formData.videoDetails?.startsWith('SI') ? 'SI' : (formData.videoDetails?.startsWith('NO') ? 'NO' : '')}
            onChange={e => {
              const val = e.target.value;
              setFormData(prev => ({ ...prev, videoDetails: val === 'NO' ? 'NO' : (val === 'SI' ? 'SI' : '') }));
              setIsDirty(true);
            }}
            className="mt-1 block w-32 pl-3 pr-10 py-1 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">--</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
          {formData.videoDetails?.startsWith('SI') && (
            <textarea
              className="mt-2 block w-full border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Detalls generals de vídeo..."
              value={formData.videoDetails.replace(/^SI:?\s*/, '')}
              onChange={e => {
                setFormData(prev => ({ ...prev, videoDetails: `SI: ${e.target.value}` }));
                setIsDirty(true);
              }}
              onBlur={handleBlur}
            />
          )}
        </div>
        {formData.videoDetails?.startsWith('SI') && (
          <>
            {formData.videoNeeds.map((need, index) => (
              <React.Fragment key={need.id || `video-need-${index}`}>
                <TechSheetField id={`video-qty-${index}`} label={`Qt. Vídeo ${index + 1}`} value={need.quantity} onChange={e => handleListChange('videoNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
                <TechSheetField id={`video-desc-${index}`} label={`Desc. Vídeo ${index + 1}`} value={need.description} onChange={e => handleListChange('videoNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
                <TechSheetField id={`video-origin-${index}`} label={`Origen Vídeo ${index + 1}`} value={need.origin} onChange={e => handleListChange('videoNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
                <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('videoNeeds', index)} className="remove-item-button text-red-500 hover:bg-red-100 rounded-full w-7 h-7 flex items-center justify-center text-lg no-print" title="Eliminar">×</button></div>
              </React.Fragment>
            ))}
            <div className="col-span-full mt-2 no-print">
              <button type="button" onClick={() => handleAddListItem('videoNeeds')} className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat Vídeo</button>
            </div>
          </>
        )}

        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 mt-3 -mb-2">MAQUINÀRIA:</h4>
        {formData.machineryNeeds.map((need, index) => (
          <React.Fragment key={need.id || `machinery-need-${index}`}>
            <TechSheetField id={`machinery-qty-${index}`} label={`Qt. Maquin. ${index + 1}`} value={need.quantity} onChange={e => handleListChange('machineryNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
            <TechSheetField id={`machinery-desc-${index}`} label={`Desc. Maquin. ${index + 1}`} value={need.description} onChange={e => handleListChange('machineryNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
            <TechSheetField id={`machinery-origin-${index}`} label={`Origen Maquin. ${index + 1}`} value={need.origin} onChange={e => handleListChange('machineryNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('machineryNeeds', index)} className="remove-item-button text-red-500 hover:bg-red-100 rounded-full w-7 h-7 flex items-center justify-center text-lg no-print" title="Eliminar">×</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2 no-print">
          <button type="button" onClick={() => handleAddListItem('machineryNeeds')} className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat Maquinària</button>
        </div>
      </TechSheetSection>
      
      <TechSheetSection title="Altres Detalls">
        <TechSheetField id="controlLocation" label="CONTROL A:" value={formData.controlLocation} onChange={handleChange} onBlur={handleBlur} placeholder="Ex: X PLATEA"/>
        {/* MATERIAL D’ALTRES EQUIPAMENTS: SI/NO i detalls */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">MATERIAL D’ALTRES EQUIPAMENTS:</label>
          <select
            value={formData.otherEquipment?.startsWith('SI') ? 'SI' : (formData.otherEquipment?.startsWith('NO') ? 'NO' : '')}
            onChange={e => {
              const val = e.target.value;
              setFormData(prev => ({ ...prev, otherEquipment: val === 'NO' ? 'NO' : (val === 'SI' ? 'SI' : '') }));
              setIsDirty(true);
            }}
            className="mt-1 block w-32 pl-3 pr-10 py-1 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">--</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
          {formData.otherEquipment?.startsWith('SI') && (
            <textarea
              className="mt-2 block w-full border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Detalls del material d’altres equipaments..."
              value={formData.otherEquipment.replace(/^SI:?\s*/, '')}
              onChange={e => {
                setFormData(prev => ({ ...prev, otherEquipment: `SI: ${e.target.value}` }));
                setIsDirty(true);
              }}
              onBlur={handleBlur}
            />
          )}
        </div>
        {/* LLOGUERS: SI/NO i detalls */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">LLOGUERS:</label>
          <select
            value={formData.rentals?.startsWith('SI') ? 'SI' : (formData.rentals?.startsWith('NO') ? 'NO' : '')}
            onChange={e => {
              const val = e.target.value;
              setFormData(prev => ({ ...prev, rentals: val === 'NO' ? 'NO' : (val === 'SI' ? 'SI' : '') }));
              setIsDirty(true);
            }}
            className="mt-1 block w-32 pl-3 pr-10 py-1 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">--</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
          {formData.rentals?.startsWith('SI') && (
            <textarea
              className="mt-2 block w-full border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Detalls dels lloguers..."
              value={formData.rentals.replace(/^SI:?\s*/, '')}
              onChange={e => {
                setFormData(prev => ({ ...prev, rentals: `SI: ${e.target.value}` }));
                setIsDirty(true);
              }}
              onBlur={handleBlur}
            />
          )}
        </div>
        <TechSheetField id="blueprints" label="PLÀNOLS:" value={formData.blueprints} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={3} placeholder="Ex: XX x/x/x HORARIS x/x/x"/>
      </TechSheetSection>

      <TechSheetSection title="Contacte i Observacions">
        <TechSheetField id="companyContact" label="PERSONA DE CONTACTE COMPANYIA:" value={formData.companyContact} onChange={handleChange} onBlur={handleBlur} />
        <TechSheetField id="observations" label="ALTRES / OBSERVACIONS:" value={formData.observations} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={4}/>
      </TechSheetSection>

    </div>
  );
};

export default TechSheetForm;