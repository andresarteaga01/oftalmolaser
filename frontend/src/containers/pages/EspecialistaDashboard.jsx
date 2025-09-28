import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { connect } from 'react-redux';
import DashboardCard from 'components/dashboard/DashboardCard';
import ChartCard from 'components/dashboard/ChartCard';
import { Bar, Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

const EspecialistaDashboard = ({ user }) => {
  const [stats, setStats] = useState({
    pacientesAsignados: 0,
    diagnosticosRealizados: 0,
    casosPendientes: 0,
    precisionPromedio: 0,
    distribucionResultados: {},
    loading: true
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/pacientes/dashboard/medico-stats/', {
          method: 'GET',
          headers: {
            'Authorization': `JWT ${localStorage.getItem('access')}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();

          setStats({
            pacientesAsignados: data.total_pacientes || 0,
            diagnosticosRealizados: data.imagenes_procesadas || 0,
            casosPendientes: data.total_imagenes - data.imagenes_procesadas || 0,
            precisionPromedio: data.tasa_procesamiento || 0,
            distribucionResultados: data.distribucion_resultados || {},
            loading: false
          });
        } else {
          // Fallback en caso de error
          setStats({
            pacientesAsignados: 0,
            diagnosticosRealizados: 0,
            casosPendientes: 0,
            precisionPromedio: 0,
            distribucionResultados: {},
            loading: false
          });
        }
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
        setStats({
          pacientesAsignados: 0,
          diagnosticosRealizados: 0,
          casosPendientes: 0,
          precisionPromedio: 0,
          distribucionResultados: {},
          loading: false
        });
      }
    };

    loadStats();
  }, []);

  // Datos para análisis de diagnósticos (usando datos reales)
  const severidadData = {
    labels: ['Sin Retinopatía', 'Leve', 'Moderada', 'Severa', 'Proliferativa'],
    datasets: [
      {
        label: 'Casos Diagnosticados',
        data: [
          stats.distribucionResultados['0'] || 0,
          stats.distribucionResultados['1'] || 0,
          stats.distribucionResultados['2'] || 0,
          stats.distribucionResultados['3'] || 0,
          stats.distribucionResultados['4'] || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(127, 29, 29, 0.8)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Datos de precisión del modelo
  const precisionData = {
    labels: ['Sensibilidad', 'Especificidad', 'Precisión', 'F1-Score', 'AUC'],
    datasets: [
      {
        label: 'Métricas del Modelo',
        data: [92, 95, 94, 93, 96],
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 2,
      },
    ],
  };

  // Tendencia semanal
  const tendenciaData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Diagnósticos',
        data: [12, 15, 18, 14, 20, 8, 5],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Panel de Especialista
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Bienvenido, {user?.first_name || user?.username} 🔬
          </p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Total Pacientes"
            value={stats.loading ? "..." : stats.pacientesAsignados}
            icon="👥"
            color="blue"
            trend="up"
            trendValue=""
          />
          <DashboardCard
            title="Imágenes Procesadas"
            value={stats.loading ? "..." : stats.diagnosticosRealizados}
            icon="🔬"
            color="green"
            trend="up"
            trendValue=""
          />
          <DashboardCard
            title="Imágenes Pendientes"
            value={stats.loading ? "..." : stats.casosPendientes}
            icon="⏳"
            color="yellow"
            trend="neutral"
            trendValue=""
          />
          <DashboardCard
            title="Tasa de Procesamiento"
            value={stats.loading ? "..." : `${stats.precisionPromedio.toFixed(1)}%`}
            icon="📊"
            color="purple"
            trend="up"
            trendValue=""
          />
        </div>

        {/* Gráficos de análisis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Distribución por Severidad" loading={stats.loading}>
            <Bar data={severidadData} options={chartOptions} />
          </ChartCard>
          
          <ChartCard title="Métricas del Modelo IA" loading={stats.loading}>
            <Radar data={precisionData} options={chartOptions} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard title="Diagnósticos por Día" loading={stats.loading}>
              <Line data={tendenciaData} options={chartOptions} />
            </ChartCard>
          </div>

          {/* Panel de herramientas */}
          <div className="space-y-6">
            {/* Acciones rápidas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Herramientas de Diagnóstico
              </h3>
              <div className="space-y-3">
                <NavLink
                  to="/pacientes/nuevo"
                  className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <span className="text-blue-600 dark:text-blue-400 mr-3">➕</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Nuevo Paciente
                  </span>
                </NavLink>
                
                <NavLink
                  to="/diagnostico"
                  className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <span className="text-green-600 dark:text-green-400 mr-3">🔬</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Análisis IA
                  </span>
                </NavLink>
                
                <NavLink
                  to="/pacientes/buscar"
                  className="flex items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <span className="text-purple-600 dark:text-purple-400 mr-3">🔍</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Buscar Paciente
                  </span>
                </NavLink>
              </div>
            </div>

            {/* Casos urgentes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Casos Urgentes
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      María González
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Retinopatía Severa
                    </p>
                  </div>
                  <button className="text-red-600 hover:text-red-800 text-sm">
                    Ver →
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Carlos Ruiz
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Seguimiento Requerido
                    </p>
                  </div>
                  <button className="text-yellow-600 hover:text-yellow-800 text-sm">
                    Ver →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  user: state.auth.user,
});

export default connect(mapStateToProps)(EspecialistaDashboard);
