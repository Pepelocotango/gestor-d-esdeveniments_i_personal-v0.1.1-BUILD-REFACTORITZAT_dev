
import React, { createContext, useContext } from 'react';
import { EventDataConteImplicits } from '../types';

// Initialize with undefined, but the provider will ensure it's set.
export const EventDataContext = createContext<EventDataConteImplicits | undefined>(undefined);

export const useEventData = (): EventDataConteImplicits => {
  const context = useContext(EventDataContext);
  if (context === undefined) { // Check for undefined explicitly
    throw new Error("useEventData must be used within an EventDataProvider");
  }
  return context;
};

// Define a type for the provider's props to include 'value'
interface EventDataProviderProps {
  value: EventDataConteImplicits;
  children: React.ReactNode;
}

export const EventDataProvider: React.FC<EventDataProviderProps> = ({ children, value }) => {
  return (
    <EventDataContext.Provider value={value}>
      {children}
    </EventDataContext.Provider>
  );
};
