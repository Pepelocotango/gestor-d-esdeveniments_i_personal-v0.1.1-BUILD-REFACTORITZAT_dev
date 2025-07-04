import React, { useState, FormEvent } from 'react';
import { useEventData } from '../../contexts/EventDataContext';
import { EventFrame, TechSheetData } from '../../types';
import TechSheetSection from './TechSheetSection';
import TechSheetField from './TechSheetField';

interface TechSheetFormProps {
  eventFrame: EventFrame;
}

const TechSheetForm: React.FC<TechSheetFormProps> = ({ eventFrame }) => {
  const { addOrUpdateTechSheet, showToast } = useEventData();
  const [formData, setFormData] = useState<TechSheetData>(eventFrame.techSheet!);

  if (!formData) {
    return <div>Error: No s'han trobat les dades de la fitxa tècnica per a aquest esdeveniment.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    addOrUpdateTechSheet(eventFrame.id, formData);
    showToast('Fitxa tècnica desada correctament!', 'success');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Fitxa de Bolo: <span className="text-blue-600 dark:text-blue-400">{eventFrame.name}</span>
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Edita els detalls tècnics de l'esdeveniment.
        </p>
      </div>

      <TechSheetSection title="Informació General">
        <TechSheetField
          id="eventName"
          label="Nom del Bolo"
          value={formData.eventName}
          onChange={handleChange}
          required
        />
        <TechSheetField
          id="location"
          label="Lloc"
          value={formData.location}
          onChange={handleChange}
        />
        <TechSheetField
          id="date"
          label="Data"
          value={formData.date}
          onChange={handleChange}
          type="text"
        />
        <TechSheetField
          id="showTime"
          label="Hora del Show"
          value={formData.showTime}
          onChange={handleChange}
          type="time"
        />
        <TechSheetField
          id="showDuration"
          label="Durada del Show"
          value={formData.showDuration}
          onChange={handleChange}
          placeholder="Ex: 90 min"
        />
        <TechSheetField
          id="parkingInfo"
          label="Informació de Pàrquing"
          value={formData.parkingInfo}
          onChange={handleChange}
          as="textarea"
          rows={2}
        />
      </TechSheetSection>
      
      {/* Aquí aniran les altres seccions */}

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
        >
          Desar Canvis a la Fitxa
        </button>
      </div>
    </form>
  );
};

export default TechSheetForm;