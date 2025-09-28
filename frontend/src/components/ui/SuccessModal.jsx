import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  CheckCircleIcon,
  EyeIcon,
  ListBulletIcon,
  UserPlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const SuccessModal = ({ 
  isOpen, 
  onClose, 
  title = "¡Éxito!",
  patientName = "",
  onAnalyzeImages,
  onViewPatients,
  onRegisterAnother,
  showActions = true
}) => {

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
            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 text-left align-middle shadow-2xl border border-gray-200 dark:border-gray-700">
              
              {/* Success Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 mb-6">
                <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>

              {/* Title */}
              <Dialog.Title className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
                {title}
              </Dialog.Title>

              {/* Message */}
              <div className="text-center mb-8">
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  El paciente <span className="font-semibold text-gray-900 dark:text-white">{patientName}</span> ha sido registrado exitosamente en el sistema.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ya puedes comenzar a trabajar con este paciente.
                </p>
              </div>

              {showActions && (
                <>
                  {/* Action Buttons */}
                  <div className="space-y-3 mb-6">
                    <button
                      onClick={() => {
                        onAnalyzeImages();
                        onClose();
                      }}
                      className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors group"
                    >
                      <EyeIcon className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                      <div className="text-left">
                        <div className="font-semibold">Analizar Imágenes</div>
                        <div className="text-xs text-blue-100">Comenzar diagnóstico por IA</div>
                      </div>
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          onViewPatients();
                          onClose();
                        }}
                        className="flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                      >
                        <ListBulletIcon className="w-4 h-4 mr-2" />
                        Ver Pacientes
                      </button>

                      <button
                        onClick={() => {
                          onRegisterAnother();
                          onClose();
                        }}
                        className="flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                      >
                        <UserPlusIcon className="w-4 h-4 mr-2" />
                        Nuevo Paciente
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full px-6 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SuccessModal;