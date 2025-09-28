import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import api from "utils/axiosConfig";
import { toast } from "react-toastify";
import { 
  UserPlusIcon,
  CalendarIcon,
  IdentificationIcon,
  HeartIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import DatePicker from 'components/ui/DatePicker';
import SuccessModal from 'components/ui/SuccessModal';
import ConfirmationModal from 'components/ui/ConfirmationModal';
import BackToHomeButton from 'components/ui/BackToHomeButton';

const RegistrarPaciente = () => {
  const [enviando, setEnviando] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [registeredPatient, setRegisteredPatient] = useState(null);
  const navigate = useNavigate();
  
  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm();
  const fechaNacimiento = watch('fecha_nacimiento');

  const onSubmitPaciente = async (data) => {
    setEnviando(true);
    const formData = new FormData();
    for (let key in data) formData.append(key, data[key]);

    try {
      const res = await api.post("/api/pacientes/", formData, {
        headers: {
          Authorization: `JWT ${localStorage.getItem("access")}`,
        },
      });
      
      // Guardar información del paciente registrado
      setRegisteredPatient({
        id: res.data.id,
        name: `${data.nombres} ${data.apellidos}`,
        fullData: res.data
      });
      
      toast.success("✅ Paciente registrado exitosamente");
      
      // Mostrar modal de éxito
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("❌ Error al registrar paciente. Verifique los datos.");
    } finally {
      setEnviando(false);
    }
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return '';
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const diferenciaMes = hoy.getMonth() - fechaNac.getMonth();
    if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad;
  };

  // Funciones para manejar las acciones del modal de éxito
  const handleAnalyzeImages = () => {
    if (registeredPatient) {
      navigate(`/pacientes/prediccion?paciente=${registeredPatient.id}`);
    }
  };

  const handleViewPatients = () => {
    navigate("/pacientes");
  };

  const handleRegisterAnother = () => {
    reset();
    setRegisteredPatient(null);
    toast.info("Formulario listo para registrar otro paciente");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <UserPlusIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Registrar Nuevo Paciente
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Complete la información básica del paciente para agregarlo al sistema
          </p>
          
          {/* Botón para regresar al dashboard */}
          <div className="flex justify-center">
            <BackToHomeButton variant="secondary" size="sm" />
          </div>
        </div>

        {/* Formulario principal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit(onSubmitPaciente)} className="p-8">
            
            {/* Información Personal */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <IdentificationIcon className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Información Personal
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Historia Clínica *
                  </label>
                  <input
                    {...register("historia_clinica", { 
                      required: "Historia clínica es requerida",
                      minLength: { value: 3, message: "Mínimo 3 caracteres" }
                    })}
                    placeholder="HC-000001"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {errors.historia_clinica && (
                    <p className="mt-1 text-sm text-red-600">{errors.historia_clinica.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CI / Carnet de Identidad *
                  </label>
                  <input
                    {...register("ci", {
                      required: "CI es requerido",
                      pattern: {
                        value: /^[0-9]{8,12}$/,
                        message: "CI debe tener entre 8 y 12 dígitos"
                      }
                    })}
                    placeholder="12345678"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {errors.ci && (
                    <p className="mt-1 text-sm text-red-600">{errors.ci.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombres *
                  </label>
                  <input
                    {...register("nombres", { 
                      required: "Nombres son requeridos",
                      minLength: { value: 2, message: "Mínimo 2 caracteres" }
                    })}
                    placeholder="Juan Carlos"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {errors.nombres && (
                    <p className="mt-1 text-sm text-red-600">{errors.nombres.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Apellidos *
                  </label>
                  <input
                    {...register("apellidos", { 
                      required: "Apellidos son requeridos",
                      minLength: { value: 2, message: "Mínimo 2 caracteres" }
                    })}
                    placeholder="Pérez García"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {errors.apellidos && (
                    <p className="mt-1 text-sm text-red-600">{errors.apellidos.message}</p>
                  )}
                </div>

                <div>
                  <Controller
                    name="fecha_nacimiento"
                    control={control}
                    rules={{
                      required: "Fecha de nacimiento es requerida",
                      validate: (value) => {
                        if (!value) return "Fecha de nacimiento es requerida";
                        const fecha = new Date(value);
                        const hoy = new Date();
                        const hace120Anos = new Date();
                        hace120Anos.setFullYear(hace120Anos.getFullYear() - 120);
                        
                        if (fecha > hoy) return "La fecha no puede ser futura";
                        if (fecha < hace120Anos) return "Fecha no válida (muy antigua)";
                        
                        return true;
                      }
                    }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <DatePicker
                        value={value || ''}
                        onChange={onChange}
                        label="Fecha de Nacimiento"
                        placeholder="Seleccionar fecha de nacimiento"
                        maxDate={new Date()}
                        minDate={new Date('1900-01-01')}
                        required={true}
                        error={error?.message}
                      />
                    )}
                  />
                  {fechaNacimiento && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Edad calculada:</strong> {calcularEdad(fechaNacimiento)} años
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Género *
                  </label>
                  <select
                    {...register("genero", { required: "Género es requerido" })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                  {errors.genero && (
                    <p className="mt-1 text-sm text-red-600">{errors.genero.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información Médica */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <HeartIcon className="w-6 h-6 text-red-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Información Médica
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Diabetes *
                  </label>
                  <select
                    {...register("tipo_diabetes", { required: "Tipo de diabetes es requerido" })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccione...</option>
                    <option value="tipo1">Diabetes Tipo 1</option>
                    <option value="tipo2">Diabetes Tipo 2</option>
                    <option value="desconocido">Se desconoce</option>
                  </select>
                  {errors.tipo_diabetes && (
                    <p className="mt-1 text-sm text-red-600">{errors.tipo_diabetes.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado de Dilatación *
                  </label>
                  <select
                    {...register("estado_dilatacion", { required: "Estado de dilatación es requerido" })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccione...</option>
                    <option value="dilatado">Dilatado</option>
                    <option value="no_dilatado">No dilatado</option>
                  </select>
                  {errors.estado_dilatacion && (
                    <p className="mt-1 text-sm text-red-600">{errors.estado_dilatacion.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información del Equipo */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <EyeIcon className="w-6 h-6 text-purple-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Equipo de Captura
                </h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cámara Retinal
                </label>
                <input
                  {...register("camara_retinal")}
                  defaultValue="Cámara retinal TopCon"
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-gray-500">Equipo predeterminado del sistema</p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={() => reset()}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Limpiar Formulario
              </button>

              <button
                type="submit"
                disabled={enviando}
                className={`flex-1 px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                  enviando 
                    ? "bg-blue-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                }`}
              >
                {enviando ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Registrando...
                  </div>
                ) : (
                  "Registrar Paciente"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Información adicional */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Los campos marcados con * son obligatorios. Una vez registrado el paciente, 
            podrá realizar análisis de imágenes desde la sección correspondiente.
          </p>
        </div>

        {/* Modal de éxito */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="¡Paciente Registrado!"
          patientName={registeredPatient?.name || ""}
          onAnalyzeImages={handleAnalyzeImages}
          onViewPatients={handleViewPatients}
          onRegisterAnother={handleRegisterAnother}
        />

        {/* Modal de confirmación para análisis */}
        <ConfirmationModal
          isOpen={showAnalyzeModal}
          onClose={() => setShowAnalyzeModal(false)}
          onConfirm={handleAnalyzeImages}
          title="¿Realizar Análisis de Imágenes?"
          message={
            <div>
              <p className="mb-2">
                ¿Deseas realizar un análisis de imágenes para el paciente{" "}
                <strong>{registeredPatient?.name}</strong> ahora?
              </p>
              <p className="text-sm text-gray-500">
                Serás redirigido a la sección de predicción donde podrás subir y analizar imágenes retinales.
              </p>
            </div>
          }
          confirmText="Sí, Analizar"
          cancelText="Ahora No"
          type="question"
        />

        {/* Modal de confirmación para ver lista */}
        <ConfirmationModal
          isOpen={showListModal}
          onClose={() => setShowListModal(false)}
          onConfirm={handleViewPatients}
          title="¿Ver Lista de Pacientes?"
          message="¿Deseas ver la lista completa de pacientes registrados en el sistema?"
          confirmText="Ver Lista"
          cancelText="Quedar Aquí"
          type="info"
        />
      </div>
    </div>
  );
};

export default RegistrarPaciente;