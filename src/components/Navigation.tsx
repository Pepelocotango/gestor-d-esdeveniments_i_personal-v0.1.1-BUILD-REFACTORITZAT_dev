import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarIcon } from '../constants';

const DocumentTextIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Navigation: React.FC = () => {
  const getLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow'
        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
    }`;

  return (
    <nav className="flex justify-center my-3">
      <div className="flex space-x-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <NavLink to="/" className={getLinkClassName}>
          <CalendarIcon className="h-5 w-5" />
          <span>Calendari i Llista</span>
        </NavLink>
        <NavLink to="/tech-sheets" className={getLinkClassName}>
          <DocumentTextIcon className="h-5 w-5" />
          <span>Fitxes Tècniques</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default Navigation;