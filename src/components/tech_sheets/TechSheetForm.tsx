import React from 'react';
import { EventFrame } from '../../types';

interface TechSheetFormProps {
  eventFrame: EventFrame;
}

const TechSheetForm: React.FC<TechSheetFormProps> = ({ eventFrame }) => {
  if (!eventFrame.techSheet) {
    return <div>Error: No s'han trobat les dades de la fitxa tècnica.</div>;
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Marcador de posició del formulari */}
      <h3 className="text-xl font-bold">Fitxa per a: {eventFrame.name}</h3>
      <p className="text-gray-500">El formulari complet anirà aquí.</p>
      <pre className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
        {JSON.stringify(eventFrame.techSheet, null, 2)}
      </pre>
    </div>
  );
};

export default TechSheetForm;
