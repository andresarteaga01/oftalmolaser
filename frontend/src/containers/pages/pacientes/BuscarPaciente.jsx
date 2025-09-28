import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "utils/axiosConfig";
import { toast } from "react-toastify";
import BackToHomeButton from "components/ui/BackToHomeButton";
import {
  MagnifyingGlassIcon,
  UsersIcon,
  FunnelIcon,
  EyeIcon,
  PencilSquareIcon,
  CpuChipIcon,
  DocumentTextIcon,
  CalendarIcon,
  IdentificationIcon,
  HeartIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function BuscarPaciente() {
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tipo_diabetes: '',
    estado_dilatacion: '',
    resultado: '',
    edad_min: '',
    edad_max: '',
    genero: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    // Cargar pacientes inicialmente
    buscarPacientes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, pacientes]);

  const buscarPacientes = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      
      const url = searchTerm
        ? `/api/pacientes/buscar/?search=${searchTerm}`
        : `/api/pacientes/`;

      const response = await api.get(url);
      const data = Array.isArray(response.data) ? response.data : response.data.results;
      setPacientes(data);
      applyFilters(data);
    } catch (error) {
      console.error("Error al buscar pacientes:", error);
      toast.error("Error al cargar pacientes");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const applyFilters = (data = pacientes) => {
    let filtered = [...data];

    // Filtro por tipo de diabetes
    if (filters.tipo_diabetes) {
      filtered = filtered.filter(p => p.tipo_diabetes === filters.tipo_diabetes);
    }

    // Filtro por estado de dilatación
    if (filters.estado_dilatacion) {
      filtered = filtered.filter(p => p.estado_dilatacion === filters.estado_dilatacion);
    }

    // Filtro por resultado
    if (filters.resultado) {
      filtered = filtered.filter(p => p.resultado?.toString() === filters.resultado);
    }

    // Filtro por género
    if (filters.genero) {
      filtered = filtered.filter(p => p.genero === filters.genero);
    }

    // Filtro por edad (necesitaría calcularse desde fecha_nacimiento)
    if (filters.edad_min || filters.edad_max) {
      filtered = filtered.filter(p => {
        if (!p.fecha_nacimiento) return true;
        const edad = calcularEdad(p.fecha_nacimiento);
        if (filters.edad_min && edad < filters.edad_min) return false;
        if (filters.edad_max && edad > filters.edad_max) return false;
        return true;
      });
    }

    setFilteredPacientes(filtered);
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const diferenciaMes = hoy.getMonth() - fechaNac.getMonth();
    if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad;
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({
      tipo_diabetes: '',
      estado_dilatacion: '',
      resultado: '',
      edad_min: '',
      edad_max: '',
      genero: ''
    });
  };

  const getSeverityInfo = (prediccion) => {
    const severities = {
      0: { text: "Sin Retinopatía", color: "bg-green-100 text-green-800" },
      1: { text: "Retinopatía Leve", color: "bg-yellow-100 text-yellow-800" },
      2: { text: "Retinopatía Moderada", color: "bg-orange-100 text-orange-800" },
      3: { text: "Retinopatía Severa", color: "bg-red-100 text-red-800" },
      4: { text: "Retinopatía Proliferativa", color: "bg-red-200 text-red-900" }
    };
    return severities[prediccion] || { text: "Sin evaluar", color: "bg-gray-100 text-gray-800" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <MagnifyingGlassIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Búsqueda de Pacientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Consulte y analice información de pacientes registrados
          </p>
          
          {/* BackToHome Button */}
          <div className="flex justify-center mt-6">
            <BackToHomeButton variant="secondary" size="md" />
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Encontrados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pacientes.length}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mostrando</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredPacientes.length}</p>
              </div>
              <FunnelIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Con Imágenes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredPacientes.filter(p => p.imagenes && p.imagenes.length > 0).length}
                </p>
              </div>
              <EyeIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Con Retinopatía</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredPacientes.filter(p => p.resultado > 0).length}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Controles de búsqueda */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6">
            {/* Buscador principal */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Buscar por DNI, nombre, apellido o historia clínica..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
              </div>
              
              <button
                onClick={buscarPacientes}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                  isLoading 
                    ? "bg-green-400 cursor-not-allowed" 
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Buscando...
                  </div>
                ) : (
                  "Buscar"
                )}
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  showFilters 
                    ? "bg-gray-700 text-white" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <FunnelIcon className="w-5 h-5 inline mr-2" />
                Filtros
              </button>
            </div>

            {/* Panel de filtros avanzados */}
            {showFilters && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Filtros Avanzados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo de Diabetes
                    </label>
                    <select
                      value={filters.tipo_diabetes}
                      onChange={(e) => handleFilterChange('tipo_diabetes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="tipo1">Tipo 1</option>
                      <option value="tipo2">Tipo 2</option>
                      <option value="desconocido">Desconocido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estado Dilatación
                    </label>
                    <select
                      value={filters.estado_dilatacion}
                      onChange={(e) => handleFilterChange('estado_dilatacion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="dilatado">Dilatado</option>
                      <option value="no_dilatado">No dilatado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Resultado
                    </label>
                    <select
                      value={filters.resultado}
                      onChange={(e) => handleFilterChange('resultado', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="0">Sin retinopatía</option>
                      <option value="1">Leve</option>
                      <option value="2">Moderada</option>
                      <option value="3">Severa</option>
                      <option value="4">Proliferativa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Género
                    </label>
                    <select
                      value={filters.genero}
                      onChange={(e) => handleFilterChange('genero', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Edad Mínima
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={filters.edad_min}
                      onChange={(e) => handleFilterChange('edad_min', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="18"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Edad Máxima
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={filters.edad_max}
                      onChange={(e) => handleFilterChange('edad_max', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="80"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && filteredPacientes.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-3"></div>
              <span className="text-gray-600 dark:text-gray-400">Buscando pacientes...</span>
            </div>
          ) : filteredPacientes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No se encontraron pacientes</p>
              <p className="text-gray-400 text-sm">Intente ajustar sus criterios de búsqueda o filtros</p>
            </div>
          ) : (
            filteredPacientes.map((paciente) => {
              const edad = calcularEdad(paciente.fecha_nacimiento);
              const severityInfo = getSeverityInfo(paciente.resultado);

              return (
                <div
                  key={paciente.id}
                  className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md rounded-xl border border-gray-200 dark:border-gray-700 transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {paciente.nombres} {paciente.apellidos}
                        </h3>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <IdentificationIcon className="w-4 h-4 mr-2" />
                            <span>HC: {paciente.historia_clinica} • CI: {paciente.ci}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            <span>{edad} años • {paciente.genero === 'M' ? 'Masculino' : 'Femenino'}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <HeartIcon className="w-4 h-4 mr-2" />
                            <span>Diabetes {paciente.tipo_diabetes || 'No especificado'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {paciente.resultado !== null && paciente.resultado !== undefined && (
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${severityInfo.color}`}>
                          R{paciente.resultado} - {severityInfo.text}
                        </span>
                      )}
                    </div>

                    {/* Vista previa de imagen */}
                    {Array.isArray(paciente.imagenes) && paciente.imagenes.length > 0 && paciente.imagenes[0].imagen ? (
                      <div className="mb-4">
                        <img
                          src={paciente.imagenes[0].imagen}
                          alt="Vista previa"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {paciente.imagenes.length} imagen(es) disponible(s)
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4 h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div className="text-center">
                          <EyeIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Sin imágenes</p>
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/patient/${paciente.id}`)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        Ver Detalle
                      </button>
                      
                      <button
                        onClick={() => navigate(`/pacientes/prediccion?paciente=${paciente.id}`)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                      >
                        <CpuChipIcon className="w-4 h-4 mr-1" />
                        Analizar
                      </button>

                      <button
                        onClick={() => navigate(`/pacientes/editar/${paciente.id}`)}
                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}