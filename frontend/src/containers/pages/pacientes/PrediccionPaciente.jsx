import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "utils/axiosConfig";
import { toast } from "react-toastify";
import BackToHomeButton from "components/ui/BackToHomeButton";
import { 
  PhotoIcon,
  UserIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ChartBarIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const PrediccionPaciente = () => {
  // Estados principales
  const [step, setStep] = useState(1); // 1: Seleccionar paciente, 2: Subir imágenes, 3: Resultados
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [imagenes, setImagenes] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gradcamResults, setGradcamResults] = useState({}); // Cache de GradCAM por imagen

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Si viene un paciente específico en la URL
  useEffect(() => {
    const pacienteId = searchParams.get('paciente');
    if (pacienteId) {
      cargarPacienteEspecifico(pacienteId);
    } else {
      cargarPacientes();
    }
  }, [searchParams]);

  const cargarPacienteEspecifico = async (id) => {
    try {
      const response = await api.get(`/api/pacientes/${id}/`);
      setSelectedPaciente(response.data);
      setStep(2);
    } catch (error) {
      toast.error("Error al cargar el paciente especificado");
      cargarPacientes();
    }
  };

  const cargarPacientes = async () => {
    try {
      setLoading(true);
      const url = searchTerm
        ? `/api/pacientes/buscar/?search=${searchTerm}`
        : `/api/pacientes/`;
      
      const response = await api.get(url);
      const data = Array.isArray(response.data) ? response.data : response.data.results;
      setPacientes(data);
    } catch (error) {
      toast.error("Error al cargar pacientes");
    } finally {
      setLoading(false);
    }
  };

  const seleccionarPaciente = (paciente) => {
    setSelectedPaciente(paciente);
    setStep(2);
  };

  const handleImagenesChange = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast.warning("Solo se permiten archivos de imagen");
    }
    
    setImagenes(prev => [...prev, ...imageFiles]);
  };

  const removeImagen = (index) => {
    setImagenes(prev => prev.filter((_, i) => i !== index));
  };

  const procesarImagenes = async () => {
    if (imagenes.length === 0) {
      toast.warning("Debe seleccionar al menos una imagen");
      return;
    }

    // Usar siempre el método servidor (profesional)
    procesarImagenesServidor();
  };


  const procesarImagenesServidor = async () => {
    setProcessingImages(true);
    setProgress(0);

    try {
      const formData = new FormData();
      imagenes.forEach((imagen) => {
        formData.append("imagenes", imagen);
      });
      formData.append("paciente_id", selectedPaciente.id);

      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await api.post("/api/pacientes/predecir/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        const resultados = response.data.resultados || [response.data];
        console.log('🔍 Resultados recibidos del backend:', {
          response_data: response.data,
          resultados: resultados,
          primer_resultado: resultados[0]
        });
        setResultados(resultados);
        setStep(3);
        toast.success("Análisis completado exitosamente");
      }, 500);

    } catch (error) {
      console.error("Error en predicción servidor:", error);
      toast.error("Error al procesar las imágenes");
    } finally {
      setProcessingImages(false);
      setProgress(0);
    }
  };

  const reiniciarProceso = () => {
    setStep(1);
    setSelectedPaciente(null);
    setImagenes([]);
    setResultados([]);
    setSearchTerm("");
    setGradcamResults({}); // Limpiar cache de GradCAM
  };

  // Función para manejar GradCAM híbrido
  const solicitarGradCAMHibrido = async (resultado, imagenFile) => {
    const imagenKey = `${imagenFile.name}_${imagenFile.size}`;
    
    try {
      // Verificar si ya tenemos el GradCAM en cache local
      if (gradcamResults[imagenKey]) {
        console.log('GradCAM ya disponible en cache local');
        return gradcamResults[imagenKey];
      }

      // Importar servicio y solicitar GradCAM
      const { default: gradcamService } = await import('services/gradcamService');
      
      const gradcamResult = await gradcamService.generarGradCAM(imagenFile, resultado);
      
      // Guardar en cache local
      setGradcamResults(prev => ({
        ...prev,
        [imagenKey]: gradcamResult
      }));

      // Actualizar resultado con GradCAM
      setResultados(prev => prev.map(r => 
        r.nombre_imagen === resultado.nombre_imagen 
          ? { ...r, gradcam: gradcamResult.gradcam }
          : r
      ));

      toast.success(`Mapa de calor generado en ${gradcamResult.tiempo_generacion}`);
      return gradcamResult;

    } catch (error) {
      console.error('Error solicitando GradCAM:', error);
      toast.error(`Error generando mapa de calor: ${error.message}`);
      return null;
    }
  };

  const getSeverityInfo = (prediccion) => {
    const severities = {
      0: { 
        text: "Sin Retinopatía", 
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircleIcon,
        description: "No se detectaron signos de retinopatía diabética"
      },
      1: { 
        text: "Retinopatía Leve", 
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: ExclamationTriangleIcon,
        description: "Signos tempranos de retinopatía diabética"
      },
      2: { 
        text: "Retinopatía Moderada", 
        color: "bg-orange-100 text-orange-800 border-orange-200",
        icon: ExclamationTriangleIcon,
        description: "Retinopatía diabética en progresión"
      },
      3: { 
        text: "Retinopatía Severa", 
        color: "bg-red-100 text-red-800 border-red-200",
        icon: ExclamationTriangleIcon,
        description: "Retinopatía diabética avanzada"
      },
      4: { 
        text: "Retinopatía Proliferativa", 
        color: "bg-red-200 text-red-900 border-red-300",
        icon: ExclamationTriangleIcon,
        description: "Retinopatía diabética en estado crítico"
      }
    };
    return severities[prediccion] || severities[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
              <CpuChipIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Análisis de Retinopatía Diabética
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de diagnóstico asistido por inteligencia artificial
          </p>
          
          {/* BackToHome Button */}
          <div className="flex justify-center mt-6">
            <BackToHomeButton variant="secondary" size="md" />
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              {/* Step 1 */}
              <div className={`flex items-center ${step >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > 1 ? <CheckCircleIcon className="w-5 h-5" /> : '1'}
                </div>
                <span className="ml-2 text-sm font-medium">Seleccionar Paciente</span>
              </div>

              <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>

              {/* Step 2 */}
              <div className={`flex items-center ${step >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > 2 ? <CheckCircleIcon className="w-5 h-5" /> : '2'}
                </div>
                <span className="ml-2 text-sm font-medium">Cargar Imágenes</span>
              </div>

              <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>

              {/* Step 3 */}
              <div className={`flex items-center ${step >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step === 3 ? <CheckCircleIcon className="w-5 h-5" /> : '3'}
                </div>
                <span className="ml-2 text-sm font-medium">Resultados</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Selección de Paciente */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-8">
              <div className="flex items-center mb-6">
                <UserIcon className="w-6 h-6 text-purple-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Seleccione un Paciente
                </h2>
              </div>

              {/* Buscador */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por DNI, nombre o apellido..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                </div>
                <button
                  onClick={cargarPacientes}
                  disabled={loading}
                  className="mt-3 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? "Buscando..." : "Buscar"}
                </button>
              </div>

              {/* Lista de pacientes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="col-span-full flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span className="text-gray-600">Cargando pacientes...</span>
                  </div>
                ) : pacientes.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No se encontraron pacientes</p>
                  </div>
                ) : (
                  pacientes.map((paciente) => (
                    <div
                      key={paciente.id}
                      onClick={() => seleccionarPaciente(paciente)}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {paciente.nombres} {paciente.apellidos}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        HC: {paciente.historia_clinica}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        CI: {paciente.ci}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Diabetes: {paciente.tipo_diabetes}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Carga de Imágenes */}
        {step === 2 && selectedPaciente && (
          <div className="space-y-6">
            {/* Información del paciente seleccionado */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserIcon className="w-6 h-6 text-purple-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedPaciente.nombres} {selectedPaciente.apellidos}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      HC: {selectedPaciente.historia_clinica} • CI: {selectedPaciente.ci}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50"
                >
                  Cambiar Paciente
                </button>
              </div>
            </div>

            {/* Historial de Imágenes Existentes */}
            {selectedPaciente?.imagenes && selectedPaciente.imagenes.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <EyeIcon className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Análisis Previos del Paciente
                    </h2>
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {selectedPaciente.imagenes.length} imagen{selectedPaciente.imagenes.length !== 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedPaciente.imagenes.slice(0, 6).map((imagen, index) => {
                      const severityInfo = {
                        0: { text: "Sin Retinopatía", color: "bg-green-50 border-green-200 text-green-800", icon: "✓" },
                        1: { text: "Leve", color: "bg-yellow-50 border-yellow-200 text-yellow-800", icon: "⚠" },
                        2: { text: "Moderada", color: "bg-orange-50 border-orange-200 text-orange-800", icon: "⚠" },
                        3: { text: "Severa", color: "bg-red-50 border-red-200 text-red-800", icon: "⚠" },
                        4: { text: "Proliferativa", color: "bg-red-100 border-red-300 text-red-900", icon: "🚨" }
                      }[imagen.resultado] || { text: "Sin resultado", color: "bg-gray-50 border-gray-200 text-gray-800", icon: "?" };

                      return (
                        <div key={imagen.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                          {/* Imagen Procesada Analizada */}
                          <div className="p-2">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Imagen Analizada</p>
                            {imagen.imagen_procesada ? (
                              <img
                                src={imagen.imagen_procesada}
                                alt="Imagen Analizada"
                                className="w-full h-32 object-cover rounded border border-blue-300"
                              />
                            ) : (
                              <div className="w-full h-32 bg-blue-50 rounded border border-blue-300 flex items-center justify-center">
                                <CpuChipIcon className="w-6 h-6 text-blue-400" />
                              </div>
                            )}
                          </div>

                          {/* Información del Diagnóstico */}
                          <div className="p-3 border-t border-gray-200 dark:border-gray-600">
                            <div className={`text-xs px-2 py-1 rounded-full border ${severityInfo.color} mb-2`}>
                              {severityInfo.icon} R{imagen.resultado !== null ? imagen.resultado : '?'} - {severityInfo.text}
                            </div>


                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {new Date(imagen.fecha_creacion).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedPaciente.imagenes.length > 6 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Y {selectedPaciente.imagenes.length - 6} análisis más...
                      </p>
                      <button
                        onClick={() => navigate(`/pacientes/${selectedPaciente.id}/editar`)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Ver historial completo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Carga de imágenes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-8">
                <div className="flex items-center mb-6">
                  <PhotoIcon className="w-6 h-6 text-purple-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Cargar Imágenes de Retina
                  </h2>
                </div>

                {/* Información del modo de predicción */}
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">
                        🚀 IA Servidor Profesional
                      </span>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Análisis con modelo Keras + preprocesamiento avanzado + GradCAM de alta calidad
                      </p>
                    </div>
                  </div>
                </div>

                {/* Área de carga */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center mb-6">
                  <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Arrastra las imágenes aquí o haz click para seleccionar
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagenesChange}
                    className="hidden"
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer inline-block"
                  >
                    Seleccionar Imágenes
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos soportados: JPG, PNG, JPEG • Procesamiento avanzado con CLAHE y alta calidad mantenida
                  </p>
                </div>

                {/* Vista previa de imágenes */}
                {imagenes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Imágenes Seleccionadas ({imagenes.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagenes.map((imagen, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(imagen)}
                            alt={`Imagen ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => removeImagen(index)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {imagen.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Barra de progreso durante procesamiento */}
                {processingImages && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        Procesando imágenes en servidor...
                      </span>
                      <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300 bg-purple-600"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-purple-600 mt-1">
                      🚀 Procesamiento profesional en servidor con IA avanzada
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    ← Atrás
                  </button>
                  <button
                    onClick={procesarImagenes}
                    disabled={imagenes.length === 0 || processingImages}
                    className={`flex-1 px-6 py-3 rounded-lg text-white font-medium ${
                      imagenes.length === 0 || processingImages
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700"
                    }`}
                  >
                    {processingImages ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Analizando...
                      </div>
                    ) : (
                      `Analizar ${imagenes.length} imagen${imagenes.length !== 1 ? 'es' : ''}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Resultados */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Información del paciente */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DocumentTextIcon className="w-6 h-6 text-purple-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Resultados del Análisis - {selectedPaciente.nombres} {selectedPaciente.apellidos}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {resultados.length} imagen{resultados.length !== 1 ? 'es' : ''} analizada{resultados.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/patient/${selectedPaciente.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Ver Historial
                  </button>
                  <button
                    onClick={reiniciarProceso}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Nuevo Análisis
                  </button>
                </div>
              </div>
            </div>

            {/* Resultados por imagen */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {resultados.map((resultado, index) => {
                const severityInfo = getSeverityInfo(resultado.prediccion);
                const IconComponent = severityInfo.icon;

                return (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {resultado.nombre_imagen || `Imagen ${index + 1}`}
                        </h3>
                        <div className={`px-3 py-1 rounded-full border ${severityInfo.color}`}>
                          <div className="flex items-center">
                            <IconComponent className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">
                              R{resultado.prediccion}
                            </span>
                          </div>
                        </div>
                      </div>

                      {resultado.error ? (
                        <div className="text-red-600 p-4 bg-red-50 rounded-lg">
                          <p className="font-medium">Error en el análisis:</p>
                          <p className="text-sm">{resultado.error}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Información del diagnóstico */}
                          <div className={`p-4 rounded-lg border ${severityInfo.color}`}>
                            <h4 className="font-semibold mb-1">{severityInfo.text}</h4>
                            <p className="text-sm">{severityInfo.description}</p>
                          </div>

                          {/* Imagen Procesada Analizada */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                              Imagen Analizada por IA
                            </h4>
                            {(() => {
                              // Prioridad: imagen_display > imagen_procesada > imagen original como respaldo
                              let imagenSrc = resultado.imagen_display || resultado.imagen_procesada || resultado.imagen;

                              // Agregar prefijo de API si la URL no es completa
                              if (imagenSrc && !imagenSrc.startsWith('http') && !imagenSrc.startsWith('data:')) {
                                const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
                                imagenSrc = imagenSrc.startsWith('/') ? `${baseUrl}${imagenSrc}` : `${baseUrl}/${imagenSrc}`;
                              }

                              console.log('🔍 Verificando imagen para mostrar:', {
                                imagen_display: resultado.imagen_display,
                                imagen_procesada: resultado.imagen_procesada,
                                imagen: resultado.imagen,
                                imagenSrcOriginal: resultado.imagen_display || resultado.imagen_procesada || resultado.imagen,
                                imagenSrcCompleta: imagenSrc,
                                baseUrl: process.env.REACT_APP_API_URL,
                                resultadoCompleto: resultado
                              });

                              if (imagenSrc) {
                                return (
                                  <img
                                    src={imagenSrc}
                                    alt={`Análisis ${index + 1}`}
                                    className="w-full h-64 object-cover rounded-lg border border-blue-200 shadow-sm"
                                    onLoad={() => {
                                      console.log('✅ Imagen cargada exitosamente:', imagenSrc);
                                    }}
                                    onError={(e) => {
                                      console.log('❌ Error cargando imagen:', {
                                        src: imagenSrc,
                                        error: e.target.error,
                                        status: e.target.naturalWidth === 0 ? 'No existe' : 'Error de carga'
                                      });
                                      // Intentar con imagen original como respaldo
                                      const imagenRespaldo = resultado.imagen;
                                      if (imagenRespaldo && imagenSrc !== imagenRespaldo) {
                                        const imagenRespaldoCompleta = imagenRespaldo.startsWith('http')
                                          ? imagenRespaldo
                                          : `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${imagenRespaldo.startsWith('/') ? '' : '/'}${imagenRespaldo}`;
                                        e.target.src = imagenRespaldoCompleta;
                                        console.log('🔄 Intentando con imagen de respaldo:', imagenRespaldoCompleta);
                                      }
                                    }}
                                  />
                                );
                              } else {
                                return (
                                  <div className="w-full h-64 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-center">
                                    <div className="text-center">
                                      <CpuChipIcon className="mx-auto h-8 w-8 text-blue-400 mb-2" />
                                      <p className="text-sm text-blue-600">No hay imagen disponible</p>
                                      <p className="text-xs text-gray-500 mt-1">Verifica la consola para más detalles</p>
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Imagen optimizada y analizada por el modelo de IA
                              {resultado.imagen_size && ` • Resolución: ${resultado.imagen_size}`}
                            </p>
                          </div>

                          {/* Botón y área de GradCAM híbrido */}
                          <div>
                            {!resultado.gradcam && resultado.solicitarGradCAM && (
                              <button
                                onClick={resultado.solicitarGradCAM}
                                className="w-full mb-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                                </svg>
                                Ver Mapa de Calor (GradCAM)
                              </button>
                            )}

                            {/* Imagen GradCAM */}
                            {resultado.gradcam && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                    Mapa de Calor Explicativo
                                  </h4>
                                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                    GradCAM Profesional
                                  </span>
                                </div>
                                <img
                                  src={typeof resultado.gradcam === 'string' 
                                    ? `data:image/png;base64,${resultado.gradcam}`
                                    : resultado.gradcam
                                  }
                                  alt="GradCAM"
                                  className="w-full rounded-lg border border-gray-200"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Las zonas rojas indican las áreas que más influenciaron en el diagnóstico
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumen general */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Resumen del Análisis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{resultados.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Imágenes Analizadas</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {resultados.filter(r => r.prediccion === 0).length}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sin Retinopatía</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {resultados.filter(r => r.prediccion > 0).length}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Con Retinopatía</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrediccionPaciente;