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
  onCloseModal?: () => void; // Per a accions alternatives en cancel·lar/tancar
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteProps> = ({
  onClose,
  itemType,
  itemName,
  onConfirm,
  showToast,
  confirmButtonText = "Eliminar",
  cancelButtonText = "Cancel·lar",
  onCloseModal
}) => {
  const handleConfirm = () => {
    onConfirm();
    // Només mostra el toast per a accions de supressió genèriques.
    // Les accions especials (com les dels orfes) gestionen els seus propis toasts.
    if (itemType !== "Acció destructiva" && itemType !== "Actualització massiva" && itemType !== "Acció de Sincronització") {
        showToast(`${itemType} eliminat/da correctament.`, 'success');
    }
    onClose();
  };

  const handleCancelClick = () => {
    if (onCloseModal) {
      onCloseModal(); // Executa l'acció alternativa (p. ex., desvincular orfes)
    }
    onClose(); // Sempre tanca el modal
  };

  const message = itemName;

  return (
    <div>
      <p className="text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: message }} />
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={handleCancelClick}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md border border-gray-300 dark:border-gray-500"
        >
          {cancelButtonText}
        </button>
        <button
          onClick={handleConfirm}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
            confirmButtonText.toLowerCase().includes('esborrar') || confirmButtonText.toLowerCase().includes('eliminar')
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700" // Un color per defecte per a confirmacions no destructives
          }`}
        >
          {confirmButtonText}
        </button>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;