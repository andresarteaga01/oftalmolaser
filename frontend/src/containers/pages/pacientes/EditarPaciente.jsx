import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "utils/axiosConfig";
import HeaderTabs from "components/paciente/HeaderTabs";
import LightboxViewer from "components/LightboxViewer";
import BackToHomeButton from "components/ui/BackToHomeButton";
import { toast } from "react-toastify";
import { 
  UserIcon, 
  IdentificationIcon, 
  CalendarIcon, 
  UserGroupIcon,
  DocumentTextIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  BookmarkSquareIcon,
  TrashIcon,
  EyeIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";

const convertirFecha = (fechaStr) => {
  if (!fechaStr || !fechaStr.includes("/")) return fechaStr;
  const [dia, mes, anio] = fechaStr.split("/");
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
};

const revertirFecha = (fechaStr) => {
  if (!fechaStr || !fechaStr.includes("-")) return fechaStr;
  const [anio, mes, dia] = fechaStr.split("-");
  return `${dia}/${mes}/${anio}`;
};

const EditarPaciente = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    historia_clinica: "",
    ci: "",
    nombres: "",
    apellidos: "",
    fecha_nacimiento: "",
    genero: "M",
    tipo_diabetes: "tipo1",
    estado_dilatacion: "dilatado",
    camara_retinal: "Cámara retinal TopCon",
  });
  const [imagenes, setImagenes] = useState([]);
  const [nuevasImagenes, setNuevasImagenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargandoImagenes, setCargandoImagenes] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const fetchPaciente = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/pacientes/${id}/`);
      const data = {
        ...res.data,
        fecha_nacimiento: convertirFecha(res.data.fecha_nacimiento),
      };
      setFormData(data);
      setImagenes(res.data.imagenes || []);
    } catch {
      toast.error("❌ Error al cargar los datos del paciente");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPaciente();
  }, [fetchPaciente]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'historia_clinica':
        if (!value.trim()) {
          newErrors[name] = 'La historia clínica es obligatoria';
        } else if (value.length < 3) {
          newErrors[name] = 'La historia clínica debe tener al menos 3 caracteres';
        } else {
          delete newErrors[name];
        }
        break;
      case 'ci':
        if (!value.trim()) {
          newErrors[name] = 'El CI es obligatorio';
        } else if (!/^\d{8,12}$/.test(value.trim())) {
          newErrors[name] = 'El CI debe tener entre 8 y 12 dígitos';
        } else {
          delete newErrors[name];
        }
        break;
      case 'nombres':
        if (!value.trim()) {
          newErrors[name] = 'Los nombres son obligatorios';
        } else if (value.trim().length < 2) {
          newErrors[name] = 'Los nombres deben tener al menos 2 caracteres';
        } else {
          delete newErrors[name];
        }
        break;
      case 'apellidos':
        if (!value.trim()) {
          newErrors[name] = 'Los apellidos son obligatorios';
        } else if (value.trim().length < 2) {
          newErrors[name] = 'Los apellidos deben tener al menos 2 caracteres';
        } else {
          delete newErrors[name];
        }
        break;
      case 'fecha_nacimiento':
        if (!value) {
          newErrors[name] = 'La fecha de nacimiento es obligatoria';
        } else {
          const fechaNac = new Date(value);
          const hoy = new Date();
          const edad = hoy.getFullYear() - fechaNac.getFullYear();
          if (fechaNac > hoy) {
            newErrors[name] = 'La fecha de nacimiento no puede ser futura';
          } else if (edad > 120) {
            newErrors[name] = 'La fecha de nacimiento no es válida';
          } else {
            delete newErrors[name];
          }
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const requiredFields = ['historia_clinica', 'ci', 'nombres', 'apellidos', 'fecha_nacimiento'];
    const newTouched = {};
    let hasErrors = false;
    
    requiredFields.forEach(field => {
      newTouched[field] = true;
      if (!validateField(field, formData[field])) {
        hasErrors = true;
      }
    });
    
    setTouched(newTouched);
    
    if (hasErrors) {
      toast.error("Por favor, corrige los errores en el formulario");
      return;
    }
    
    setLoading(true);
    try {
      await api.put(`/api/pacientes/${id}/`, {
        ...formData,
        fecha_nacimiento: revertirFecha(formData.fecha_nacimiento),
      });
      toast.success("✅ Datos del paciente actualizados correctamente");
    } catch (error) {
      console.error('Error al actualizar:', error);
      toast.error("❌ Error al actualizar los datos del paciente");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (nuevasImagenes.length === 0) {
      toast.warn("⚠️ Selecciona al menos una imagen para subir");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    const invalidImages = nuevasImagenes.filter(img => img.size > maxSize);
    
    if (invalidImages.length > 0) {
      toast.error("❌ Algunas imágenes superan el tamaño máximo de 10MB");
      return;
    }

    const data = new FormData();
    data.append("paciente_id", id);
    nuevasImagenes.forEach((img) => data.append("imagenes", img));

    setCargandoImagenes(true);
    try {
      await api.post(`/api/pacientes/predecir/`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("📷 Imágenes cargadas y procesadas correctamente");
      setNuevasImagenes([]);
      document.querySelector('input[type="file"]').value = '';
      fetchPaciente();
    } catch (error) {
      console.error('Error al subir imágenes:', error);
      toast.error("❌ Error al procesar las imágenes");
    } finally {
      setCargandoImagenes(false);
    }
  };

  const removeNewImage = (index) => {
    setNuevasImagenes(prev => prev.filter((_, i) => i !== index));
  };

  const imageSets = imagenes.map((img) => ({
    original: img.imagen_procesada || img.imagen,
    procesada: img.imagen_procesada || null,
    gradcam: img.gradcam || null,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <HeaderTabs hideNavigationTabs={true} />
      
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Volver
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Editar Paciente</h1>
                <p className="text-sm text-gray-500 mt-1">Modifica la información del paciente</p>
              </div>
            </div>
            
            {/* Desktop: BackToHome Button */}
            <div className="hidden md:block">
              <BackToHomeButton variant="secondary" size="md" />
            </div>
          </div>
          
          {/* Mobile: BackToHome Button */}
          <div className="md:hidden mt-4">
            <BackToHomeButton variant="secondary" size="sm" className="w-full justify-center" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Patient Information Form */}
            <div className="bg-white shadow-lg rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Información del Paciente
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Historia Clínica */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      Historia Clínica *
                    </label>
                    <input
                      name="historia_clinica"
                      value={formData.historia_clinica}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.historia_clinica ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Ingrese historia clínica"
                    />
                    {errors.historia_clinica && (
                      <p className="text-red-600 text-xs flex items-center">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        {errors.historia_clinica}
                      </p>
                    )}
                  </div>

                  {/* CI */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <IdentificationIcon className="h-4 w-4 mr-2" />
                      CI / Carnet de Identidad *
                    </label>
                    <input
                      name="ci"
                      value={formData.ci}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength="12"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.ci ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Ingrese CI (8-12 dígitos)"
                    />
                    {errors.ci && (
                      <p className="text-red-600 text-xs flex items-center">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        {errors.ci}
                      </p>
                    )}
                  </div>

                  {/* Nombres */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Nombres *
                    </label>
                    <input
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.nombres ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Ingrese nombres"
                    />
                    {errors.nombres && (
                      <p className="text-red-600 text-xs flex items-center">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        {errors.nombres}
                      </p>
                    )}
                  </div>

                  {/* Apellidos */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Apellidos *
                    </label>
                    <input
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.apellidos ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Ingrese apellidos"
                    />
                    {errors.apellidos && (
                      <p className="text-red-600 text-xs flex items-center">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        {errors.apellidos}
                      </p>
                    )}
                  </div>

                  {/* Fecha de Nacimiento */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Fecha de Nacimiento *
                    </label>
                    <input
                      name="fecha_nacimiento"
                      type="date"
                      value={formData.fecha_nacimiento}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.fecha_nacimiento ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors.fecha_nacimiento && (
                      <p className="text-red-600 text-xs flex items-center">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        {errors.fecha_nacimiento}
                      </p>
                    )}
                  </div>

                  {/* Género */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      Género
                    </label>
                    <select
                      name="genero"
                      value={formData.genero}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>

                  {/* Tipo de Diabetes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Tipo de Diabetes</label>
                    <select
                      name="tipo_diabetes"
                      value={formData.tipo_diabetes}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="tipo1">Tipo 1</option>
                      <option value="tipo2">Tipo 2</option>
                      <option value="desconocido">Se desconoce</option>
                    </select>
                  </div>

                  {/* Estado de Dilatación */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Estado de Dilatación</label>
                    <select
                      name="estado_dilatacion"
                      value={formData.estado_dilatacion}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="dilatado">Dilatado</option>
                      <option value="no_dilatado">No dilatado</option>
                    </select>
                  </div>

                  {/* Cámara Retinal */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <CameraIcon className="h-4 w-4 mr-2" />
                      Cámara Retinal
                    </label>
                    <input
                      name="camara_retinal"
                      value={formData.camara_retinal}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <BookmarkSquareIcon className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Image Upload Section */}
            <div className="bg-white shadow-lg rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <PhotoIcon className="h-5 w-5 mr-2 text-green-600" />
                  Agregar Nuevas Imágenes
                </h2>
                <p className="text-sm text-gray-500 mt-1">Sube imágenes retinales para análisis (máx. 10MB por imagen)</p>
              </div>
              
              <form onSubmit={handleImageUpload} className="p-6">
                <div className="space-y-6">
                  
                  {/* File Input */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Seleccionar imágenes
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const nuevos = Array.from(e.target.files);
                            setNuevasImagenes((prev) => [...prev, ...nuevos]);
                          }}
                          className="sr-only"
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG, JPEG hasta 10MB</p>
                    </div>
                  </div>

                  {/* Preview Images */}
                  {nuevasImagenes.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {nuevasImagenes.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={URL.createObjectURL(img)}
                            alt={`preview-${idx}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {(img.size / 1024 / 1024).toFixed(1)}MB
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  {nuevasImagenes.length > 0 && (
                    <button
                      type="submit"
                      disabled={cargandoImagenes}
                      className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {cargandoImagenes ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                          Procesando imágenes...
                        </>
                      ) : (
                        <>
                          <PhotoIcon className="h-4 w-4 mr-2" />
                          Subir y Analizar {nuevasImagenes.length} imagen{nuevasImagenes.length > 1 ? 'es' : ''}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Image Gallery */}
            <div className="bg-white shadow-lg rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <EyeIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Imágenes del Paciente
                </h2>
                <p className="text-sm text-gray-500 mt-1">{imagenes.length} imagen{imagenes.length !== 1 ? 'es' : ''} registrada{imagenes.length !== 1 ? 's' : ''}</p>
              </div>
              
              <div className="p-6">
                {imagenes.length === 0 ? (
                  <div className="text-center py-8">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No hay imágenes registradas</p>
                    <p className="text-xs text-gray-400">Las imágenes aparecerán aquí después de subirlas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {imagenes.map((img, idx) => (
                      <div key={img.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        
                        {/* Processed Image */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-600 flex items-center">
                            <PhotoIcon className="h-3 w-3 mr-1" />
                            Procesada
                          </p>
                          <img
                            src={img.imagen_procesada || img.imagen}
                            alt="procesada"
                            onClick={() => { setLightboxIndex(idx); setSubIndex(0); setLightboxOpen(true); }}
                            className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </div>

                        {/* Processed Images */}
                        {img.imagen_procesada && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-green-600 flex items-center">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Procesada
                            </p>
                            <img
                              src={img.imagen_procesada}
                              alt="procesada"
                              onClick={() => { setLightboxIndex(idx); setSubIndex(1); setLightboxOpen(true); }}
                              className="w-full h-24 object-cover rounded border border-green-200 cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </div>
                        )}

                        {img.gradcam && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-blue-600 flex items-center">
                              <EyeIcon className="h-3 w-3 mr-1" />
                              GradCAM
                            </p>
                            <img
                              src={img.gradcam}
                              alt="gradcam"
                              onClick={() => { setLightboxIndex(idx); setSubIndex(2); setLightboxOpen(true); }}
                              className="w-full h-24 object-cover rounded border border-blue-200 cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </div>
                        )}

                        {/* Results */}
                        <div className="mt-4 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Resultado:</span>
                            <span className="text-xs font-semibold text-gray-900">R{img.resultado}</span>
                          </div>
                          <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-200">
                            {new Date(img.fecha_creacion).toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <LightboxViewer
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          sets={imageSets}
          index={lightboxIndex}
          subIndex={subIndex}
          setSubIndex={setSubIndex}
        />
      )}
    </div>
  );
};

export default EditarPaciente;

