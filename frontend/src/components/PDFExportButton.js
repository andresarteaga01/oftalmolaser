/**
 * 📄 Componente Profesional de Exportación PDF
 * Botón inteligente para generar reportes médicos en PDF
 */

import React, { useState } from 'react';
import { FaFilePdf, FaDownload, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PDFExportButton = ({
  pacienteId,
  pacienteData = null,
  className = '',
  variant = 'primary',
  size = 'md',
  showLabel = true,
  onExportStart = null,
  onExportComplete = null,
  onExportError = null
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastExportTime, setLastExportTime] = useState(null);

  // Configuración de estilos por variante
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
    medical: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600',
    outline: 'bg-transparent hover:bg-blue-50 text-blue-600 border-blue-600'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  const handleExportPDF = async () => {
    if (!pacienteId) {
      toast.error('ID de paciente no válido');
      return;
    }

    try {
      setIsGenerating(true);

      // Callback de inicio
      if (onExportStart) {
        onExportStart();
      }

      // Obtener token de autenticación
      const token = localStorage.getItem('access');
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      // Realizar petición al endpoint
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/pacientes/${pacienteId}/pdf-report/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob' // Important for binary data
        }
      );

      // Verificar respuesta exitosa
      if (response.status !== 200) {
        throw new Error('Error generando el reporte PDF');
      }

      // Crear URL del blob para descarga
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);

      // Crear nombre del archivo
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const patientName = pacienteData?.nombres && pacienteData?.apellidos
        ? `${pacienteData.nombres}_${pacienteData.apellidos}`.replace(/\s+/g, '_')
        : `Paciente_${pacienteId}`;

      const filename = `Reporte_${patientName}_${timestamp}.pdf`;

      // Crear enlace de descarga temporal
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpiar URL temporal
      window.URL.revokeObjectURL(downloadUrl);

      // Actualizar estado
      setLastExportTime(new Date());

      // Mostrar mensaje de éxito
      toast.success(
        <div className="flex items-center">
          <FaCheckCircle className="text-green-500 mr-2" />
          <span>Reporte PDF generado exitosamente</span>
        </div>,
        {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );

      // Callback de éxito
      if (onExportComplete) {
        onExportComplete(filename);
      }

    } catch (error) {
      console.error('Error exportando PDF:', error);

      let errorMessage = 'Error generando el reporte PDF';

      if (error.response?.status === 400) {
        errorMessage = 'No hay diagnósticos disponibles para este paciente';
      } else if (error.response?.status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente';
      } else if (error.response?.status === 403) {
        errorMessage = 'No tiene permisos para generar reportes';
      } else if (error.response?.status === 404) {
        errorMessage = 'Paciente no encontrado';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error interno del servidor. Intente nuevamente';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(
        <div className="flex items-center">
          <FaExclamationTriangle className="text-red-500 mr-2" />
          <span>{errorMessage}</span>
        </div>,
        {
          position: "top-right",
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );

      // Callback de error
      if (onExportError) {
        onExportError(error, errorMessage);
      }

    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleExportPDF}
        disabled={isGenerating}
        className={`
          inline-flex items-center justify-center
          border rounded-lg font-medium
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${className}
          ${isGenerating ? 'animate-pulse' : ''}
        `}
        title={isGenerating ? 'Generando reporte PDF...' : 'Descargar reporte PDF'}
      >
        {/* Icono */}
        <span className="flex items-center">
          {isGenerating ? (
            <FaSpinner className="animate-spin mr-2" />
          ) : (
            <FaFilePdf className={`${showLabel ? 'mr-2' : ''}`} />
          )}

          {/* Etiqueta */}
          {showLabel && (
            <span>
              {isGenerating ? 'Generando PDF...' : 'Exportar PDF'}
            </span>
          )}
        </span>
      </button>

      {/* Indicador de última exportación */}
      {lastExportTime && !isGenerating && (
        <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
          Último: {format(lastExportTime, 'HH:mm', { locale: es })}
        </div>
      )}
    </div>
  );
};

// Componente para exportación en lote
export const BatchPDFExportButton = ({
  pacienteIds = [],
  className = '',
  onBatchComplete = null
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleBatchExport = async () => {
    if (!pacienteIds.length) {
      toast.warning('No hay pacientes seleccionados para exportar');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress({ current: 0, total: pacienteIds.length });

      const token = localStorage.getItem('access');
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      // Solicitar generación en lote
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/pacientes/batch-pdf-reports/`,
        { paciente_ids: pacienteIds },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const { results, errors, generated_reports } = response.data;

      if (generated_reports > 0) {
        toast.success(
          <div>
            <strong>Reportes preparados:</strong> {generated_reports} de {pacienteIds.length}
            <br />
            <small>Haga clic en cada botón PDF individual para descargar</small>
          </div>,
          { autoClose: 8000 }
        );

        if (onBatchComplete) {
          onBatchComplete(results, errors);
        }
      } else {
        toast.warning('No se pudieron generar reportes para los pacientes seleccionados');
      }

      if (errors.length > 0) {
        console.warn('Errores en generación batch:', errors);
      }

    } catch (error) {
      console.error('Error en exportación batch:', error);
      toast.error('Error procesando exportación en lote');
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <button
      onClick={handleBatchExport}
      disabled={isProcessing || pacienteIds.length === 0}
      className={`
        inline-flex items-center justify-center
        px-4 py-2 bg-purple-600 hover:bg-purple-700
        text-white border border-purple-600 rounded-lg
        font-medium transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isProcessing ? (
        <>
          <FaSpinner className="animate-spin mr-2" />
          <span>Procesando... ({progress.current}/{progress.total})</span>
        </>
      ) : (
        <>
          <FaDownload className="mr-2" />
          <span>Exportar Lote ({pacienteIds.length})</span>
        </>
      )}
    </button>
  );
};

// Componente compacto para tablas
export const PDFExportTableButton = ({ pacienteId, className = '' }) => {
  return (
    <PDFExportButton
      pacienteId={pacienteId}
      variant="outline"
      size="sm"
      showLabel={false}
      className={`w-8 h-8 p-0 ${className}`}
    />
  );
};

export default PDFExportButton;