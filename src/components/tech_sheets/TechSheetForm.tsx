import React, { useState, FormEvent, useEffect } from 'react';
import { useEventData } from '../../contexts/EventDataContext';
import { EventFrame, TechSheetData } from '../../types';
import TechSheetSection from './TechSheetSection';
import TechSheetField from './TechSheetField';
import { formatDateDMY } from '../../utils/dateFormat';

interface TechSheetFormProps {
  eventFrame: EventFrame;
}

const TechSheetForm: React.FC<TechSheetFormProps> = ({ eventFrame }) => {
  const { addOrUpdateTechSheet, showToast } = useEventData();
  const [formData, setFormData] = useState<TechSheetData>(eventFrame.techSheet!);
  const [isDirty, setIsDirty] = useState(false); // Per controlar si hi ha canvis pendents de desar

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

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Fitxa de Bolo: <span className="text-blue-600 dark:text-blue-400">{eventFrame.name}</span>
        </h2>
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
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                Eliminar
              </button>
            </div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2">
          <button
            type="button"
            onClick={() => handleAddListItem('technicalPersonnel')}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
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
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                Eliminar
              </button>
            </div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2">
          <button
            type="button"
            onClick={() => handleAddListItem('assemblySchedule')}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
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
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('lightingNeeds', index)} className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm">Eliminar</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2">
          <button type="button" onClick={() => handleAddListItem('lightingNeeds')} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat Il·luminació</button>
        </div>

        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 mt-3 -mb-2">SO:</h4>
        {formData.soundNeeds.map((need, index) => (
          <React.Fragment key={need.id || `sound-need-${index}`}>
            <TechSheetField id={`sound-qty-${index}`} label={`Qt. So ${index + 1}`} value={need.quantity} onChange={e => handleListChange('soundNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
            <TechSheetField id={`sound-desc-${index}`} label={`Desc. So ${index + 1}`} value={need.description} onChange={e => handleListChange('soundNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
            <TechSheetField id={`sound-origin-${index}`} label={`Origen So ${index + 1}`} value={need.origin} onChange={e => handleListChange('soundNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('soundNeeds', index)} className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm">Eliminar</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2">
          <button type="button" onClick={() => handleAddListItem('soundNeeds')} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat So</button>
        </div>

        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 mt-3 -mb-2">VÍDEO:</h4>
        <TechSheetField id="videoDetails" label="Detalls Generals Vídeo:" value={formData.videoDetails || ''} onChange={handleChange} onBlur={handleBlur} as="textarea" rows={2} placeholder="Ex: NO, o descripció general si no hi ha ítems específics."/>
        {formData.videoNeeds.map((need, index) => (
          <React.Fragment key={need.id || `video-need-${index}`}>
            <TechSheetField id={`video-qty-${index}`} label={`Qt. Vídeo ${index + 1}`} value={need.quantity} onChange={e => handleListChange('videoNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
            <TechSheetField id={`video-desc-${index}`} label={`Desc. Vídeo ${index + 1}`} value={need.description} onChange={e => handleListChange('videoNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
            <TechSheetField id={`video-origin-${index}`} label={`Origen Vídeo ${index + 1}`} value={need.origin} onChange={e => handleListChange('videoNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('videoNeeds', index)} className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm">Eliminar</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2">
          <button type="button" onClick={() => handleAddListItem('videoNeeds')} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat Vídeo</button>
        </div>

        <h4 className="col-span-full text-md font-semibold text-gray-700 dark:text-gray-300 mt-3 -mb-2">MAQUINÀRIA:</h4>
        {formData.machineryNeeds.map((need, index) => (
          <React.Fragment key={need.id || `machinery-need-${index}`}>
            <TechSheetField id={`machinery-qty-${index}`} label={`Qt. Maquin. ${index + 1}`} value={need.quantity} onChange={e => handleListChange('machineryNeeds', index, 'quantity', e.target.value)} onBlur={handleBlur} placeholder="XX"/>
            <TechSheetField id={`machinery-desc-${index}`} label={`Desc. Maquin. ${index + 1}`} value={need.description} onChange={e => handleListChange('machineryNeeds', index, 'description', e.target.value)} onBlur={handleBlur} />
            <TechSheetField id={`machinery-origin-${index}`} label={`Origen Maquin. ${index + 1}`} value={need.origin} onChange={e => handleListChange('machineryNeeds', index, 'origin', e.target.value)} onBlur={handleBlur} placeholder="CIA / TÀG"/>
            <div className="flex items-end"><button type="button" onClick={() => handleRemoveListItem('machineryNeeds', index)} className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm">Eliminar</button></div>
          </React.Fragment>
        ))}
        <div className="col-span-full mt-2">
          <button type="button" onClick={() => handleAddListItem('machineryNeeds')} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">+ Afegir Necessitat Maquinària</button>
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