import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '../../constants';


interface TechSheetSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerActions?: React.ReactNode;
}

const TechSheetSection: React.FC<TechSheetSectionProps> = ({ title, children, defaultOpen = true, headerActions }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700/50 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-expanded={isOpen}
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          {isOpen ? <ChevronUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
        </button>
        {headerActions && <div className="pr-3">{headerActions}</div>}
      </div>
      {isOpen && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default TechSheetSection;