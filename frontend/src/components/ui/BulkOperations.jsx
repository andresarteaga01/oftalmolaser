import React, { useState } from 'react';
import { 
  CheckIcon, 
  DocumentArrowDownIcon, 
  TrashIcon, 
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CircularProgress } from './ProgressIndicator';

const BulkOperations = ({ 
  selectedItems = [], 
  totalItems = 0,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onExportSelected,
  onProcessSelected,
  isProcessing = false,
  onCancelProcessing,
  className = ''
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const hasSelection = selectedItems.length > 0;
  const isAllSelected = selectedItems.length === totalItems && totalItems > 0;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onDeselectAll?.();
    } else {
      onSelectAll?.();
    }
  };

  const handleDelete = () => {
    if (selectedItems.length > 0) {
      setShowConfirmDelete(true);
    }
  };

  const confirmDelete = () => {
    onDeleteSelected?.(selectedItems);
    setShowConfirmDelete(false);
  };

  const handleExport = () => {
    onExportSelected?.(selectedItems);
  };

  const handleProcess = () => {
    onProcessSelected?.(selectedItems);
  };

  const handleCancelProcessing = () => {
    onCancelProcessing?.();
  };

  return (
    <>
      <div className={`bg-white border rounded-lg shadow-sm p-4 transition-all duration-200 ${
        hasSelection ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
      } ${className}`}>
        
        {/* Selection Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                isAllSelected 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : hasSelection 
                  ? 'bg-blue-100 border-blue-400' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                {isAllSelected && <CheckIcon className="w-3 h-3" />}
                {hasSelection && !isAllSelected && <div className="w-2 h-2 bg-blue-600 rounded-sm" />}
              </div>
              <span>
                {isAllSelected 
                  ? `Todos seleccionados (${totalItems})` 
                  : hasSelection 
                  ? `${selectedItems.length} seleccionados` 
                  : `Seleccionar todo (${totalItems})`}
              </span>
            </button>

            {hasSelection && (
              <button
                onClick={onDeselectAll}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Limpiar selección
              </button>
            )}
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="flex items-center space-x-3">
              <CircularProgress 
                percentage={processingProgress} 
                size="sm" 
                color="blue"
                showLabel={false}
              />
              <span className="text-sm text-blue-600">
                Procesando {selectedItems.length} elementos...
              </span>
              <button
                onClick={handleCancelProcessing}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {hasSelection && !isProcessing && (
          <div className="flex items-center space-x-3 border-t pt-4">
            <button
              onClick={handleProcess}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <PlayIcon className="w-4 h-4" />
              <span>Procesar ML ({selectedItems.length})</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Exportar</span>
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          </div>
        )}

        {/* Processing Actions */}
        {isProcessing && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <InformationCircleIcon className="w-4 h-4" />
              <span>Las operaciones masivas pueden tomar varios minutos</span>
            </div>
            
            <button
              onClick={handleCancelProcessing}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <XMarkIcon className="w-4 h-4" />
              <span>Cancelar proceso</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirmar eliminación
                  </h3>
                  <p className="text-sm text-gray-500">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                ¿Estás seguro de que deseas eliminar <strong>{selectedItems.length}</strong> elemento(s) seleccionado(s)?
                Esta acción eliminará permanentemente todos los datos asociados.
              </p>

              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar {selectedItems.length} elemento(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Hook para manejar selecciones múltiples
export const useBulkSelection = (items = []) => {
  const [selectedItems, setSelectedItems] = useState([]);

  const selectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    setSelectedItems(items.map(item => item.id));
  };

  const deselectAll = () => {
    setSelectedItems([]);
  };

  const isSelected = (itemId) => {
    return selectedItems.includes(itemId);
  };

  const selectRange = (startId, endId) => {
    const startIndex = items.findIndex(item => item.id === startId);
    const endIndex = items.findIndex(item => item.id === endId);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);
      const rangeIds = items.slice(minIndex, maxIndex + 1).map(item => item.id);
      
      setSelectedItems(prev => {
        const newSelection = new Set([...prev, ...rangeIds]);
        return Array.from(newSelection);
      });
    }
  };

  return {
    selectedItems,
    selectItem,
    selectAll,
    deselectAll,
    isSelected,
    selectRange,
    hasSelection: selectedItems.length > 0,
    selectionCount: selectedItems.length
  };
};

// Componente de elemento seleccionable
export const SelectableItem = ({ 
  id, 
  isSelected, 
  onSelect, 
  children, 
  className = '',
  disabled = false 
}) => {
  const handleClick = (e) => {
    if (disabled) return;
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + click para selección múltiple
      onSelect(id);
    } else if (e.shiftKey) {
      // Shift + click para selección de rango (implementar en el componente padre)
      onSelect(id, 'range');
    } else {
      onSelect(id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        cursor-pointer transition-all duration-200 border-2 rounded-lg
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-transparent hover:border-gray-300 hover:shadow-sm'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <div className="relative">
        {/* Checkbox indicator */}
        <div className={`
          absolute top-2 right-2 w-5 h-5 border-2 rounded flex items-center justify-center transition-all
          ${isSelected 
            ? 'bg-blue-600 border-blue-600 text-white' 
            : 'border-gray-300 bg-white'
          }
        `}>
          {isSelected && <CheckIcon className="w-3 h-3" />}
        </div>
        
        {children}
      </div>
    </div>
  );
};

export default BulkOperations;