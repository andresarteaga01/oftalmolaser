/**
 * 🧠 Componente de Predicción Mejorada con IA Avanzada
 * Incluye Temperature Scaling, TTA y Análisis de Confianza
 */

import React, { useState, useCallback } from 'react';
import {
  FaBrain,
  FaChartLine,
  FaEye,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCog,
  FaRocket
} from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';

const EnhancedPrediction = ({
  onPredictionComplete = null,
  onError = null,
  className = '',
  showAdvancedOptions = true
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [advancedOptions, setAdvancedOptions] = useState({
    useTTA: true,
    useEnsemble: false,
    showTechnicalDetails: false
  });

  // Configuración de severidad con colores profesionales
  const severityConfig = {
    0: {
      name: 'Sin retinopatía',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: FaCheckCircle,
      urgency: 'normal'
    },
    1: {
      name: 'Retinopatía leve',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: FaInfoCircle,
      urgency: 'monitor'
    },
    2: {
      name: 'Retinopatía moderada',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: FaExclamationTriangle,
      urgency: 'attention'
    },
    3: {
      name: 'Retinopatía severa',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: FaExclamationTriangle,
      urgency: 'urgent'
    },
    4: {
      name: 'Retinopatía proliferativa',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: FaExclamationTriangle,
      urgency: 'critical'
    }
  };


  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error('Por favor seleccione una imagen válida (JPG, JPEG, PNG)');
        return;
      }

      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La imagen no debe superar los 10MB');
        return;
      }

      setSelectedFile(file);
      setPredictionResult(null); // Limpiar resultado anterior
    }
  }, []);

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.warning('Por favor seleccione una imagen para analizar');
      return;
    }

    try {
      setIsAnalyzing(true);

      // Preparar datos del formulario
      const formData = new FormData();
      formData.append('imagen', selectedFile);
      formData.append('use_tta', advancedOptions.useTTA);
      formData.append('use_ensemble', advancedOptions.useEnsemble);

      // Obtener token de autenticación
      const token = localStorage.getItem('access');
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      // Realizar petición al endpoint mejorado
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/pacientes/enhanced-prediction/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const result = response.data;

      // Procesar resultado
      setPredictionResult({
        ...result,
        analysisTime: new Date().toLocaleString(),
        fileName: selectedFile.name
      });

      // Callback de éxito
      if (onPredictionComplete) {
        onPredictionComplete(result);
      }

      // Mostrar notificación de éxito
      const severity = severityConfig[result.prediction];
      toast.success(
        <div className="flex items-center">
          <FaBrain className="text-blue-500 mr-2" />
          <div>
            <strong>Análisis completado</strong>
            <br />
            <small>Diagnóstico: {severity?.name || 'Desconocido'}</small>
          </div>
        </div>,
        { autoClose: 5000 }
      );

    } catch (error) {
      console.error('Error en análisis mejorado:', error);

      let errorMessage = 'Error en el análisis de la imagen';

      if (error.response?.status === 503) {
        errorMessage = 'Sistema de análisis mejorado no disponible temporalmente';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Imagen no válida';
      } else if (error.response?.status === 401) {
        errorMessage = 'Sesión expirada. Inicie sesión nuevamente';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast.error(errorMessage, { autoClose: 6000 });

      // Callback de error
      if (onError) {
        onError(error, errorMessage);
      }

    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderConfidenceMetrics = (result) => {
    if (!result.uncertainty_metrics) return null;

    const { entropy, margin, gini_coefficient } = result.uncertainty_metrics;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Métricas de Incertidumbre
        </h4>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="font-medium text-gray-600">Entropía</div>
            <div className="text-lg font-bold text-blue-600">{entropy?.toFixed(3)}</div>
            <div className="text-gray-500">Incertidumbre</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600">Margen</div>
            <div className="text-lg font-bold text-green-600">{margin?.toFixed(3)}</div>
            <div className="text-gray-500">Separación</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600">Gini</div>
            <div className="text-lg font-bold text-purple-600">{gini_coefficient?.toFixed(3)}</div>
            <div className="text-gray-500">Dispersión</div>
          </div>
        </div>
      </div>
    );
  };

  const renderTechnicalDetails = (result) => {
    if (!advancedOptions.showTechnicalDetails || !result.technical_details) return null;

    const details = result.technical_details;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center">
          <FaCog className="mr-2" />
          Detalles Técnicos
        </h4>
        <div className="text-xs space-y-2 text-blue-800">
          <div className="flex justify-between">
            <span>Temperature Scaling:</span>
            <span className={`font-semibold ${details.temperature_applied ? 'text-green-600' : 'text-gray-500'}`}>
              {details.temperature_applied ? 'Aplicado' : 'No aplicado'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Test-Time Augmentation:</span>
            <span className={`font-semibold ${details.tta_used ? 'text-green-600' : 'text-gray-500'}`}>
              {details.tta_used ? 'Activo' : 'Desactivado'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Método:</span>
            <span className="font-mono capitalize">{result.method_used}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FaRocket className="text-2xl text-blue-600 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Análisis IA Avanzado
            </h2>
            <p className="text-sm text-gray-600">
              Sistema mejorado con calibración de confianza
            </p>
          </div>
        </div>

        {/* Badge de tecnología */}
        <div className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          <FaBrain className="mr-1" />
          AI Enhanced
        </div>
      </div>

      {/* Selección de archivo */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagen de Retina
        </label>
        <div className="relative">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              file:transition-colors file:duration-200"
          />
        </div>
        {selectedFile && (
          <div className="mt-2 text-sm text-green-600 flex items-center">
            <FaCheckCircle className="mr-1" />
            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}
      </div>

      {/* Opciones avanzadas */}
      {showAdvancedOptions && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <FaCog className="mr-2" />
            Opciones Avanzadas
          </h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={advancedOptions.useTTA}
                onChange={(e) => setAdvancedOptions(prev => ({ ...prev, useTTA: e.target.checked }))}
                className="mr-2 rounded"
              />
              <span className="text-sm text-gray-700">
                Test-Time Augmentation (TTA) - Mejora precisión
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={advancedOptions.useEnsemble}
                onChange={(e) => setAdvancedOptions(prev => ({ ...prev, useEnsemble: e.target.checked }))}
                className="mr-2 rounded"
              />
              <span className="text-sm text-gray-700">
                Ensemble de modelos - Mayor robustez (experimental)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={advancedOptions.showTechnicalDetails}
                onChange={(e) => setAdvancedOptions(prev => ({ ...prev, showTechnicalDetails: e.target.checked }))}
                className="mr-2 rounded"
              />
              <span className="text-sm text-gray-700">
                Mostrar detalles técnicos
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Botón de análisis */}
      <button
        onClick={handleAnalyze}
        disabled={!selectedFile || isAnalyzing}
        className={`
          w-full flex items-center justify-center
          py-3 px-4 rounded-lg font-semibold text-white
          transition-all duration-200
          ${!selectedFile || isAnalyzing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
          }
        `}
      >
        {isAnalyzing ? (
          <>
            <FaSpinner className="animate-spin mr-2" />
            Analizando con IA avanzada...
          </>
        ) : (
          <>
            <FaBrain className="mr-2" />
            Iniciar Análisis Avanzado
          </>
        )}
      </button>

      {/* Resultados */}
      {predictionResult && (
        <div className="mt-8 border-t pt-8">
          <div className="flex items-center mb-6">
            <FaChartLine className="text-green-500 text-xl mr-3" />
            <h3 className="text-lg font-semibold text-gray-800">Resultados del Análisis</h3>
          </div>

          {/* Diagnóstico principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel de diagnóstico */}
            <div className={`p-6 rounded-lg border-2 ${severityConfig[predictionResult.prediction]?.borderColor} ${severityConfig[predictionResult.prediction]?.bgColor}`}>
              <div className="flex items-center mb-4">
                {React.createElement(severityConfig[predictionResult.prediction]?.icon || FaInfoCircle, {
                  className: `text-2xl ${severityConfig[predictionResult.prediction]?.color} mr-3`
                })}
                <div>
                  <h4 className="text-lg font-bold text-gray-800">
                    {severityConfig[predictionResult.prediction]?.name}
                  </h4>
                  <p className="text-sm text-gray-600">Diagnóstico IA</p>
                </div>
              </div>

            </div>

            {/* Panel de interpretación */}
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                <FaEye className="mr-2" />
                Interpretación Clínica
              </h4>
              <p className="text-sm text-blue-700 mb-4">
                {predictionResult.interpretation}
              </p>

              <div className="text-xs text-blue-600 space-y-1">
                <div>Método: <span className="font-mono">{predictionResult.method_used}</span></div>
                <div>Análisis: {predictionResult.analysisTime}</div>
                <div>Imagen: {predictionResult.fileName}</div>
              </div>
            </div>
          </div>

          {/* Métricas de incertidumbre */}
          {renderConfidenceMetrics(predictionResult)}

          {/* Detalles técnicos */}
          {renderTechnicalDetails(predictionResult)}

          {/* Distribución de probabilidades */}
          {predictionResult.probabilities && predictionResult.probabilities.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Distribución de Probabilidades
              </h4>
              <div className="space-y-2">
                {predictionResult.probabilities.map((prob, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-32 text-xs text-gray-600">
                      {severityConfig[index]?.name || `Clase ${index}`}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          index === predictionResult.prediction ? 'bg-blue-600' : 'bg-gray-400'
                        }`}
                        style={{ width: `${prob * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs font-mono text-gray-600 w-12 text-right">
                      {(prob * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedPrediction;