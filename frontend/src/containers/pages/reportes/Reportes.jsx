import { useEffect, useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import api from "utils/axiosConfig";
import { useNavigate } from "react-router-dom";
import BackToHomeButton from "components/ui/BackToHomeButton";
import {
  ChartBarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  UserIcon,
  IdentificationIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  HeartIcon,
  ArrowDownTrayIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChartPieIcon
} from "@heroicons/react/24/outline";

const labelMap = {
  0: "Sin retinopatía",
  1: "Leve",
  2: "Moderada",
  3: "Severa",
  4: "Proliferativa",
};

const Reportes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [filtro, setFiltro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("fecha");
  const [viewMode, setViewMode] = useState("grid");
  const navigate = useNavigate();

  const obtenerPacientes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/pacientes/");
      const filtrados = res.data.results.filter(
        (p) => Array.isArray(p.imagenes) && p.imagenes.length > 0
      );
      setPacientes(filtrados);
    } catch (error) {
      console.error("Error al obtener pacientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerPacientes();

    // ❗Descomenta para actualizar cada 30 segundos automáticamente
    // const interval = setInterval(obtenerPacientes, 30000);
    // return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (resultado) => {
    switch (resultado) {
      case 0: return { bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" };
      case 1: return { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200", dot: "bg-yellow-500" };
      case 2: return { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200", dot: "bg-orange-500" };
      case 3: return { bg: "bg-red-100", text: "text-red-800", border: "border-red-200", dot: "bg-red-500" };
      case 4: return { bg: "bg-red-200", text: "text-red-900", border: "border-red-300", dot: "bg-red-600" };
      default: return { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200", dot: "bg-gray-500" };
    }
  };

  const getSeverityIcon = (resultado) => {
    switch (resultado) {
      case 0: return <CheckCircleIcon className="h-5 w-5" />;
      case 1: return <ClockIcon className="h-5 w-5" />;
      case 2: return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 3: return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 4: return <HeartIcon className="h-5 w-5" />;
      default: return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  const opcionesGrafico = useMemo(() => {
    const conteo = pacientes.reduce((acc, p) => {
      const resultado = p.imagenes?.[0]?.resultado;
      if (resultado !== undefined) {
        acc[resultado] = (acc[resultado] || 0) + 1;
      }
      return acc;
    }, {});

    const colors = ['#10B981', '#F59E0B', '#F97316', '#EF4444', '#DC2626'];

    return {
      tooltip: { 
        trigger: "item",
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: { 
        orient: "horizontal", 
        bottom: 0,
        itemGap: 20 
      },
      series: [
        {
          name: "Diagnósticos",
          type: "pie",
          radius: ["40%", "70%"],
          center: ['50%', '45%'],
          data: Object.entries(conteo).map(([key, value], index) => ({
            name: labelMap[key],
            value,
            itemStyle: {
              color: colors[index] || '#6B7280'
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          label: {
            show: true,
            formatter: '{b}\n{c} casos'
          }
        },
      ],
    };
  }, [pacientes]);

  const estadisticas = useMemo(() => {
    const total = pacientes.length;
    const conteo = pacientes.reduce((acc, p) => {
      const resultado = p.imagenes?.[0]?.resultado;
      if (resultado !== undefined) {
        acc[resultado] = (acc[resultado] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      total,
      sinRetinopatia: conteo[0] || 0,
      leve: conteo[1] || 0,
      moderada: conteo[2] || 0,
      severa: conteo[3] || 0,
      proliferativa: conteo[4] || 0,
      conRiesgo: (conteo[2] || 0) + (conteo[3] || 0) + (conteo[4] || 0)
    };
  }, [pacientes]);

  const pacientesFiltrados = useMemo(() => {
    let resultado = pacientes;

    // Filtrar por resultado de diagnóstico
    if (filtro !== null) {
      resultado = resultado.filter((p) => p.imagenes?.[0]?.resultado === parseInt(filtro));
    }

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter((p) => 
        p.nombres.toLowerCase().includes(term) ||
        p.apellidos.toLowerCase().includes(term) ||
        p.ci.includes(term) ||
        p.historia_clinica.toLowerCase().includes(term)
      );
    }

    // Ordenar
    resultado.sort((a, b) => {
      switch (sortBy) {
        case 'fecha':
          const fechaA = new Date(a.imagenes?.[0]?.fecha_creacion || 0);
          const fechaB = new Date(b.imagenes?.[0]?.fecha_creacion || 0);
          return fechaB - fechaA;
        case 'nombre':
          return `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`);
        case 'severidad':
          const sevA = a.imagenes?.[0]?.resultado || 0;
          const sevB = b.imagenes?.[0]?.resultado || 0;
          return sevB - sevA;
        default:
          return 0;
      }
    });

    return resultado;
  }, [pacientes, filtro, searchTerm, sortBy]);

  const exportarDatos = () => {
    const csv = [
      ['Nombre', 'DNI', 'Historia Clínica', 'Diagnóstico', 'Fecha'],
      ...pacientesFiltrados.map(p => [
        `${p.nombres} ${p.apellidos}`,
        p.ci,
        p.historia_clinica,
        labelMap[p.imagenes?.[0]?.resultado] || 'Sin resultado',
        p.imagenes?.[0]?.fecha_creacion ? new Date(p.imagenes[0].fecha_creacion).toLocaleDateString() : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reportes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Reportes</h1>
              <p className="text-sm text-gray-500 mt-1">
                Análisis y seguimiento de diagnósticos de retinopatía diabética
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <BackToHomeButton variant="secondary" size="md" />
              <button
                onClick={exportarDatos}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Exportar CSV
              </button>
              <button
                onClick={obtenerPacientes}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                )}
                {loading ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Reportes</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Sin Retinopatía</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.sinRetinopatia}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Con Riesgo</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.conRiesgo}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HeartIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Casos Críticos</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.severa + estadisticas.proliferativa}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-lg rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ChartPieIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Distribución de Diagnósticos
                </h2>
              </div>
              <div className="p-6">
                {pacientes.length > 0 ? (
                  <ReactECharts
                    option={opcionesGrafico}
                    style={{ height: "400px", width: "100%" }}
                    onEvents={{
                      click: (params) => {
                        const seleccionado = Object.entries(labelMap).find(
                          ([key, label]) => label === params.name
                        );
                        if (seleccionado) {
                          setFiltro(seleccionado[0]);
                        }
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No hay datos para mostrar</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="space-y-6">
            
            {/* Search and Filters */}
            <div className="bg-white shadow-lg rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FunnelIcon className="h-5 w-5 mr-2 text-green-600" />
                  Filtros y Búsqueda
                </h2>
              </div>
              <div className="p-6 space-y-4">
                
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar paciente
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nombre, DNI o HC..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordenar por
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="fecha">Fecha más reciente</option>
                    <option value="nombre">Nombre A-Z</option>
                    <option value="severidad">Severidad</option>
                  </select>
                </div>

                {/* Severity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrar por diagnóstico
                  </label>
                  <div className="space-y-2">
                    {Object.entries(labelMap).map(([key, label]) => {
                      const colors = getSeverityColor(parseInt(key));
                      const count = estadisticas.total > 0 ? (
                        key === '0' ? estadisticas.sinRetinopatia :
                        key === '1' ? estadisticas.leve :
                        key === '2' ? estadisticas.moderada :
                        key === '3' ? estadisticas.severa :
                        estadisticas.proliferativa
                      ) : 0;
                      
                      return (
                        <button
                          key={key}
                          onClick={() => setFiltro(filtro === key ? null : key)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                            filtro === key 
                              ? `${colors.bg} ${colors.border} ${colors.text}` 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full ${colors.dot} mr-2`}></div>
                              <span className="text-sm font-medium">{label}</span>
                            </div>
                            <span className="text-sm text-gray-500">{count}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {filtro && (
                    <button
                      onClick={() => setFiltro(null)}
                      className="w-full mt-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Limpiar filtro
                    </button>
                  )}
                </div>

                {/* View Mode Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modo de vista
                  </label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Squares2X2Icon className="h-4 w-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ListBulletIcon className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Patients List */}
        <div className="mt-8">
          <div className="bg-white shadow-lg rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Reportes de Pacientes
                </h2>
                <span className="text-sm text-gray-500">
                  {pacientesFiltrados.length} de {pacientes.length} reportes
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {pacientesFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    {searchTerm || filtro ? 'No se encontraron reportes con los filtros aplicados' : 'No hay reportes disponibles'}
                  </p>
                  {(searchTerm || filtro) && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFiltro(null);
                      }}
                      className="mt-2 text-blue-600 text-sm hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                  : "space-y-4"
                }>
                  {pacientesFiltrados.map((p) => {
                    const imagen = p.imagenes?.[0];
                    const colors = getSeverityColor(imagen?.resultado);
                    
                    return (
                      <div 
                        key={p.id} 
                        className={`bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow ${
                          viewMode === 'list' ? 'flex items-center justify-between' : ''
                        }`}
                      >
                        <div className={viewMode === 'list' ? 'flex items-center space-x-4 flex-1' : 'space-y-3'}>
                          
                          {/* Patient Info */}
                          <div className={viewMode === 'list' ? 'flex-1' : ''}>
                            <div className="flex items-center space-x-2 mb-2">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                              <p className="font-semibold text-gray-900">
                                {p.nombres} {p.apellidos}
                              </p>
                            </div>
                            
                            <div className={`space-y-1 ${viewMode === 'list' ? 'flex space-x-4 space-y-0' : ''}`}>
                              <p className="text-sm text-gray-600 flex items-center">
                                <IdentificationIcon className="h-3 w-3 mr-1" />
                                CI: {p.ci}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center">
                                <DocumentTextIcon className="h-3 w-3 mr-1" />
                                HC: {p.historia_clinica}
                              </p>
                              {imagen?.fecha_creacion && (
                                <p className="text-sm text-gray-600 flex items-center">
                                  <CalendarIcon className="h-3 w-3 mr-1" />
                                  {new Date(imagen.fecha_creacion).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Diagnosis Badge */}
                          {imagen && (
                            <div className={viewMode === 'list' ? 'flex items-center space-x-4' : 'mt-3'}>
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
                                {getSeverityIcon(imagen.resultado)}
                                <span className="ml-1">{labelMap[imagen.resultado]}</span>
                              </div>
                              
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <div className={viewMode === 'list' ? 'ml-4' : 'mt-4'}>
                          <button
                            onClick={() => navigate(`/reportes/${p.id}`)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Ver detalle
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;