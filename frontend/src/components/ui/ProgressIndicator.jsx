import React from 'react';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ProgressStep = ({ step, currentStep, title, description, isCompleted, hasError }) => {
  const isActive = step === currentStep;
  const isPast = step < currentStep;
  
  return (
    <div className="flex items-center">
      <div className="flex items-center flex-shrink-0">
        <div className={`
          w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-200
          ${isCompleted 
            ? 'bg-green-100 border-green-500 text-green-700' 
            : hasError 
            ? 'bg-red-100 border-red-500 text-red-700'
            : isActive 
            ? 'bg-blue-100 border-blue-500 text-blue-700 animate-pulse' 
            : isPast 
            ? 'bg-gray-100 border-gray-300 text-gray-500'
            : 'bg-white border-gray-300 text-gray-400'
          }
        `}>
          {isCompleted ? (
            <CheckIcon className="w-5 h-5" />
          ) : hasError ? (
            <ExclamationTriangleIcon className="w-5 h-5" />
          ) : (
            <span className="text-sm font-semibold">{step}</span>
          )}
        </div>
      </div>
      
      <div className="ml-4 min-w-0 flex-1">
        <h3 className={`text-sm font-medium ${
          isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : hasError ? 'text-red-900' : 'text-gray-500'
        }`}>
          {title}
        </h3>
        {description && (
          <p className={`text-xs ${
            isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : hasError ? 'text-red-600' : 'text-gray-400'
          }`}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

const ProgressIndicator = ({ 
  steps = [], 
  currentStep = 1, 
  completedSteps = [], 
  errorSteps = [],
  className = '',
  orientation = 'vertical' // 'vertical' | 'horizontal'
}) => {
  const containerClass = orientation === 'horizontal' 
    ? 'flex items-center space-x-8 overflow-x-auto pb-2'
    : 'space-y-6';

  return (
    <div className={`${containerClass} ${className}`}>
      {steps.map((stepData, index) => {
        const stepNumber = index + 1;
        const isCompleted = completedSteps.includes(stepNumber);
        const hasError = errorSteps.includes(stepNumber);
        
        return (
          <div key={stepNumber} className={orientation === 'horizontal' ? 'flex-shrink-0' : ''}>
            <ProgressStep
              step={stepNumber}
              currentStep={currentStep}
              title={stepData.title}
              description={stepData.description}
              isCompleted={isCompleted}
              hasError={hasError}
            />
            
            {/* Connector line for vertical layout */}
            {orientation === 'vertical' && index < steps.length - 1 && (
              <div className="ml-5 mt-2 mb-2">
                <div className={`w-0.5 h-6 ${
                  stepNumber < currentStep || isCompleted 
                    ? 'bg-green-300' 
                    : 'bg-gray-200'
                }`} />
              </div>
            )}
            
            {/* Connector line for horizontal layout */}
            {orientation === 'horizontal' && index < steps.length - 1 && (
              <div className="flex-1 flex items-center px-3">
                <div className={`h-0.5 flex-1 ${
                  stepNumber < currentStep || isCompleted 
                    ? 'bg-green-300' 
                    : 'bg-gray-200'
                }`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Componente específico para upload de imágenes
export const ImageUploadProgress = ({ 
  isUploading, 
  isProcessing, 
  isCompleted, 
  hasError, 
  errorMessage,
  progress = 0 
}) => {
  const steps = [
    { title: 'Subiendo imagen', description: 'Transfiriendo archivo al servidor' },
    { title: 'Validando', description: 'Verificando formato y contenido' },
    { title: 'Procesando IA', description: 'Analizando con modelo de ML' },
    { title: 'Completado', description: 'Resultado disponible' }
  ];

  let currentStep = 1;
  let completedSteps = [];
  let errorSteps = [];

  if (isUploading) {
    currentStep = 1;
  } else if (isProcessing) {
    currentStep = 3;
    completedSteps = [1, 2];
  } else if (isCompleted) {
    currentStep = 4;
    completedSteps = [1, 2, 3, 4];
  }

  if (hasError) {
    if (isUploading) {
      errorSteps = [1];
    } else if (isProcessing) {
      errorSteps = [3];
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {hasError ? 'Error en procesamiento' : 'Procesando imagen...'}
        </h3>
        {!hasError && !isCompleted && (
          <div className="flex items-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
        )}
      </div>

      <ProgressIndicator
        steps={steps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        errorSteps={errorSteps}
        orientation="vertical"
      />

      {hasError && errorMessage && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {isCompleted && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">¡Imagen procesada exitosamente!</p>
        </div>
      )}
    </div>
  );
};

// Componente de progreso circular
export const CircularProgress = ({ 
  percentage = 0, 
  size = 'md', 
  color = 'blue',
  showLabel = true,
  label = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600'
  };

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeClasses[size]}`}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200" 
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-300 ${colorClasses[color]}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-semibold ${colorClasses[color]}`}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      {showLabel && label && (
        <p className="mt-2 text-sm text-gray-600 text-center">{label}</p>
      )}
    </div>
  );
};

export default ProgressIndicator;