import React from 'react';
import { XMarkIcon } from '../../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) {
    return null;
  }

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  // No hi ha handleOverlayClick aquí, ja que hem eliminat la funcionalitat de tancar en clicar l'overlay.

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50"
      // L'onClick de l'overlay s'ha eliminat per evitar tancaments accidentals.
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`relative p-5 border shadow-lg rounded-md bg-white dark:bg-gray-800 w-full ${sizeClasses[size]} mx-4`}
        // Aquest onClick evita que un clic dins del contingut es propagui a elements externs,
        // tot i que amb l'eliminació de l'onClick de l'overlay, el seu efecte principal aquí és menys crític.
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700">
          <h3 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose} // Aquest onClose és per al botó X
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Tancar modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="mt-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
