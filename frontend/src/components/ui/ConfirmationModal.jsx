import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  CheckCircleIcon, 
  QuestionMarkCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "question", // "success", "question", "warning", "info"
  confirmButtonClass = "",
  showCloseButton = true
}) => {
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-12 h-12 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-12 h-12 text-amber-500" />;
      case 'info':
        return <InformationCircleIcon className="w-12 h-12 text-blue-500" />;
      default:
        return <QuestionMarkCircleIcon className="w-12 h-12 text-blue-500" />;
    }
  };

  const getConfirmButtonStyles = () => {
    if (confirmButtonClass) return confirmButtonClass;
    
    switch (type) {
      case 'success':
        return "bg-green-600 hover:bg-green-700 focus:ring-green-500";
      case 'warning':
        return "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500";
      case 'info':
        return "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
      default:
        return "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-40" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-2xl border border-gray-200 dark:border-gray-700">
              
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getIcon()}
                </div>
                
                <div className="flex-1">
                  <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {title}
                  </Dialog.Title>
                  
                  <div className="text-gray-700 dark:text-gray-300 text-sm leading-6">
                    {typeof message === 'string' ? (
                      <p>{message}</p>
                    ) : (
                      message
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  {cancelText}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-6 py-2 text-white rounded-lg font-medium transition-colors focus:ring-2 focus:ring-offset-2 ${getConfirmButtonStyles()}`}
                >
                  {confirmText}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmationModal;