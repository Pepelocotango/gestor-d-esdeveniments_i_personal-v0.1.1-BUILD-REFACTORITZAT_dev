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
            origin: '',
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

  const handleExportToPdf = async () => {
    if (!formRef.current) {
      showToast('Error: No es pot accedir al contingut del formulari per exportar.', 'error');
      return;
    }
    showToast('Generant PDF... Això pot trigar uns instants.', 'info');

    // Forcem que totes les seccions estiguin obertes temporalment per a la captura
    const sectionButtons = formRef.current.querySelectorAll('button[aria-expanded="false"]');
    sectionButtons.forEach(button => (button as HTMLElement).click());

    // Esperem un breu instant perquè el DOM s'actualitzi amb les seccions obertes
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const canvas = await html2canvas(formRef.current, {
        scale: 2, // Augmenta la resolució per a millor qualitat
        logging: true,
        useCORS: true, // Per si hi ha imatges externes en el futur
        onclone: (documentClone) => {
          // Amaguem els botons d'exportar i eliminar/afegir ítems en la versió clonada per al PDF
          const clone = documentClone.querySelector('.tech-sheet-form-container');
          if (clone) {
            clone.querySelectorAll('.export-pdf-button, .add-item-button, .remove-item-button, .no-print')
              .forEach(el => (el as HTMLElement).style.display = 'none');
            // També podem aplicar estils específics per a la impressió si cal
            // per exemple, assegurar que els camps de text es mostrin completament
            clone.querySelectorAll('input, textarea').forEach(input => {
              (input as HTMLElement).style.overflow = 'visible';
              (input as HTMLElement).style.height = 'auto';
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      
      let finalImgHeight = pdfHeight;
      let finalImgWidth = finalImgHeight * ratio;

      if (finalImgWidth > pdfWidth) {
        finalImgWidth = pdfWidth;
        finalImgHeight = finalImgWidth / ratio;
      }
      
      let position = 0;
      let remainingHeight = imgHeight * (pdfWidth / imgWidth); // Alçada total de la imatge reescalada a l'amplada del PDF

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, remainingHeight);
      remainingHeight -= pdfHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        position = remainingHeight - imgHeight * (pdfWidth / imgWidth); // Aquesta lògica necessita ser revisada per a la paginació correcta
        pdf.addImage(imgData, 'PNG', 0, -position * (pdfHeight / remainingHeight) , pdfWidth, imgHeight * (pdfWidth / imgWidth)); // Això no és correcte, s'ha d'ajustar
        remainingHeight -= pdfHeight;
      }
      
      // Intent simplificat per ara, caldrà millorar la paginació si el contingut és molt llarg
      // La paginació amb html2canvas i jspdf pot ser complexa.
      // Aquesta és una versió bàsica que posa la imatge i afegeix pàgines si cal,
      // però el tall pot no ser perfecte.

      const totalCanvasHeightInMm = (imgHeight * 25.4) / (96 * 2); // 96 DPI, scale 2
      const a4HeightInMm = 297;
      let currentY = 0;
      const pageMargin = 10; // mm
      const contentWidthMm = pdf.internal.pageSize.getWidth() - 2 * pageMargin;
      const contentHeightMm = (imgHeight / imgWidth) * contentWidthMm;


      if (contentHeightMm <= (a4HeightInMm - 2 * pageMargin)) {
        pdf.addImage(imgData, 'PNG', pageMargin, pageMargin, contentWidthMm, contentHeightMm);
      } else {
        // Paginació més robusta (encara simplificada)
        let yPos = 0;
        const pageHeight = pdf.internal.pageSize.getHeight() - 2 * pageMargin;
        const imageTotalHeight = (canvas.height * contentWidthMm) / canvas.width; // Alçada total de la imatge reescalada
        let heightLeft = imageTotalHeight;

        pdf.addImage(imgData, 'PNG', pageMargin, pageMargin, contentWidthMm, imageTotalHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          pdf.addPage();
          yPos -= pageHeight; // Mou la "finestra" de la imatge cap avall
          pdf.addImage(imgData, 'PNG', pageMargin, yPos + pageMargin, contentWidthMm, imageTotalHeight);
          heightLeft -= pageHeight;
        }
      }


      const fileName = `Fitxa_Bolo_${eventFrame.name.replace(/[^a-z0-9]/gi, '_')}_${formData.date.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
      showToast('PDF generat amb èxit!', 'success');

    } catch (error) {
      console.error("Error generant PDF:", error);
      showToast(`Error generant PDF: ${(error as Error).message}`, 'error');
    } finally {
      // Tornem a tancar les seccions que hem obert
      sectionButtons.forEach(button => (button as HTMLElement).click());
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
        <TechSheetField id="parkingInfo" label="ZONA RESERVADA PARKING:" value={formData.parkingInfo} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={3} placeholder="Ex: si, X Camió 5 mts. + 2 furgonetes"/>
      </TechSheetSection>

      <TechSheetSection title="Personal Tècnic">
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
              id={`person-origin-${index}`}
              label={`Origen Personal ${index + 1}`}
              value={person.origin}
              onChange={(e) => handleListChange('technicalPersonnel', index, 'origin', e.target.value)}
              onBlur={handleBlur}
              placeholder="CIA / TÀG / Altre"
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleRemoveListItem('technicalPersonnel', index)}
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
            onClick={() => handleAddListItem('technicalPersonnel')}
            className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
          >
            + Afegir Personal Tècnic
          </button>
        </div>
      </TechSheetSection>

      <TechSheetSection title="Premuntatge i Horaris">
        <TechSheetField id="preAssemblySchedule" label="PREMUNTAGE:" value={formData.preAssemblySchedule} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={3} placeholder="Ex: XX x/x/x X Tomàs i Pep" />

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
      </TechSheetSection>

      <TechSheetSection title="Logística">
        <TechSheetField id="dressingRooms" label="CAMERINOS:" value={formData.dressingRooms} onChange={handleChange} onBlur={handleBlur} placeholder="Ex: SI X"/>
        <TechSheetField id="actors" label="ACTORS:" value={formData.actors} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={2} />
        <TechSheetField id="companyTechnicians" label="TÈCNICS/PRODUCCIÓ CIA:" value={formData.companyTechnicians} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={2} />
      </TechSheetSection>

      <TechSheetSection title="Necessitats Tècniques">
        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 -mb-2">IL·LUMINACIÓ:</h4>
        {formData.lightingNeeds.map((need, index) => (
          <React.Fragment key={need.id || `light-need-${index}`}>
            <TechSheetField id={`light-qty-${index}`} label={`Qt. Il·lu. ${index + 1}`} value={need.quantity} onChange={e => handleListChange('lightingNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
            <TechSheetField id={`light-desc-${index}`} label={`Desc. Il·lu. ${index + 1}`} value={need.description} onChange={e => handleListChange('lightingNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
            <TechSheetField id={`light-origin-${index}`} label={`Origen Il·lu. ${index + 1}`} value={need.origin} onChange={e => handleListChange('lightingNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('lightingNeeds', index)} className="remove-item-button px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm no-print">Eliminar</button></div>
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
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('soundNeeds', index)} className="remove-item-button px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm no-print">Eliminar</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2 no-print">
          <button type="button" onClick={() => handleAddListItem('soundNeeds')} className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat So</button>
        </div>

        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 mt-3 -mb-2">VÍDEO:</h4>
        <TechSheetField id="videoDetails" label="Detalls Generals Vídeo:" value={formData.videoDetails || ''} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={2} placeholder="Ex: NO, o descripció general si no hi ha ítems específics."/>
        {formData.videoNeeds.map((need, index) => (
          <React.Fragment key={need.id || `video-need-${index}`}>
            <TechSheetField id={`video-qty-${index}`} label={`Qt. Vídeo ${index + 1}`} value={need.quantity} onChange={e => handleListChange('videoNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
            <TechSheetField id={`video-desc-${index}`} label={`Desc. Vídeo ${index + 1}`} value={need.description} onChange={e => handleListChange('videoNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
            <TechSheetField id={`video-origin-${index}`} label={`Origen Vídeo ${index + 1}`} value={need.origin} onChange={e => handleListChange('videoNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('videoNeeds', index)} className="remove-item-button px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm no-print">Eliminar</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2 no-print">
          <button type="button" onClick={() => handleAddListItem('videoNeeds')} className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat Vídeo</button>
        </div>

        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 mt-3 -mb-2">MAQUINÀRIA:</h4>
        {formData.machineryNeeds.map((need, index) => (
          <React.Fragment key={need.id || `machinery-need-${index}`}>
            <TechSheetField id={`machinery-qty-${index}`} label={`Qt. Maquin. ${index + 1}`} value={need.quantity} onChange={e => handleListChange('machineryNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
            <TechSheetField id={`machinery-desc-${index}`} label={`Desc. Maquin. ${index + 1}`} value={need.description} onChange={e => handleListChange('machineryNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
            <TechSheetField id={`machinery-origin-${index}`} label={`Origen Maquin. ${index + 1}`} value={need.origin} onChange={e => handleListChange('machineryNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('machineryNeeds', index)} className="remove-item-button px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm no-print">Eliminar</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2 no-print">
          <button type="button" onClick={() => handleAddListItem('machineryNeeds')} className="add-item-button px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat Maquinària</button>
        </div>
      </TechSheetSection>
      
      <TechSheetSection title="Altres Detalls">
        <TechSheetField id="controlLocation" label="CONTROL A:" value={formData.controlLocation} onChange={handleChange} onBlur={handleBlur} placeholder="Ex: X PLATEA"/>
        <TechSheetField id="otherEquipment" label="MATERIAL D’ALTRES EQUIPAMENTS:" value={formData.otherEquipment} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={3}/>
        <TechSheetField id="rentals" label="LLOGUERS:" value={formData.rentals} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={3}/>
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