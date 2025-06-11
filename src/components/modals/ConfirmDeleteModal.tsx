import React from 'react';

interface CommonFormProps {
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface ConfirmDeleteProps extends CommonFormProps {
  itemType: string;
  itemName: string;
  onConfirm: () => void;
  titleOverride?: string; 
  confirmButtonText?: string; 
  cancelButtonText?: string; 
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteProps> = ({ 
    onClose, 
    itemType, 
    itemName, 
    onConfirm, 
    showToast,
    confirmButtonText = "Eliminar",
    cancelButtonText = "Cancel·lar"
}) => {
  const handleConfirm = () => {
    onConfirm();
    // CANVI: Es mostra un missatge de toast només si no és una acció especial (com "començar de zero").
    // Aquestes accions especials gestionen el seu propi missatge de toast.
    if (itemType !== "Acció destructiva" && itemType !== "Actualització massiva") {
        showToast(`${itemType} "${itemName}" eliminat/da correctament.`, 'success');
    }
    onClose();
  };
  
  const message = itemName; 

  return (
    <div>
      <p className="text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: message }} />
      <div className="flex justify-end space-x-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500">
          {cancelButtonText}
        </button>
        <button 
          onClick={handleConfirm} 
          className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
            confirmButtonText.toLowerCase().includes('esborrar') || confirmButtonText.toLowerCase().includes('eliminar') 
              ? "bg-red-600 hover:bg-red-700" 
              : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {confirmButtonText}
        </button>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
