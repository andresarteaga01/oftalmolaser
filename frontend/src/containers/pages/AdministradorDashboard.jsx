import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { connect } from 'react-redux';
import DashboardCard from 'components/dashboard/DashboardCard';
import ChartCard from 'components/dashboard/ChartCard';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdministradorDashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalPacientes: 0,
    diagnosticosHoy: 0,
    casosUrgentes: 0,
    loading: true
  });

  // Simular carga de datos (reemplazar con API real)
  useEffect(() => {
    const loadStats = async () => {
      // Simular delay de API
      setTimeout(() => {
        setStats({
          totalUsuarios: 45,
          totalPacientes: 1247,
          diagnosticosHoy: 23,
          casosUrgentes: 5,
          loading: false
        });
      }, 1000);
    };
    loadStats();
  }, []);

  // Datos para gráficos
  const diagnosticosData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Diagnósticos por mes',
        data: [65, 59, 80, 81, 56, 89],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
    ],
  };

  const rolesData = {
    labels: ['Médicos', 'Especialistas', 'Administradores'],
    datasets: [
      {
        data: [25, 15, 5],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const tendenciaData = {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    datasets: [
      {
        label: 'Casos Detectados',
        data: [12, 19, 15, 25],
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
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
            Panel de Administración
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Bienvenido, {user?.first_name || user?.username} 👨‍💼
          </p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Total Usuarios"
            value={stats.loading ? "..." : stats.totalUsuarios}
            icon="👥"
            color="blue"
            trend="up"
            trendValue="+5.2%"
          />
          <DashboardCard
            title="Total Pacientes"
            value={stats.loading ? "..." : stats.totalPacientes}
            icon="🏥"
            color="green"
            trend="up"
            trendValue="+12.3%"
          />
          <DashboardCard
            title="Diagnósticos Hoy"
            value={stats.loading ? "..." : stats.diagnosticosHoy}
            icon="🔬"
            color="purple"
            trend="up"
            trendValue="+8.1%"
          />
          <DashboardCard
            title="Casos Urgentes"
            value={stats.loading ? "..." : stats.casosUrgentes}
            icon="⚠️"
            color="red"
            trend="down"
            trendValue="-2.4%"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Diagnósticos por Mes" loading={stats.loading}>
            <Bar data={diagnosticosData} options={chartOptions} />
          </ChartCard>
          
          <ChartCard title="Distribución de Roles" loading={stats.loading}>
            <Doughnut data={rolesData} options={chartOptions} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard title="Tendencia de Casos" loading={stats.loading}>
              <Line data={tendenciaData} options={chartOptions} />
            </ChartCard>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Acciones Rápidas
            </h3>
            <div className="space-y-3">
              <NavLink
                to="/users"
                className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <span className="text-blue-600 dark:text-blue-400 mr-3">👥</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Gestionar Usuarios
                </span>
              </NavLink>
              
              <NavLink
                to="/reportes"
                className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <span className="text-green-600 dark:text-green-400 mr-3">📊</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Ver Reportes
                </span>
              </NavLink>
              
              <NavLink
                to="/pacientes"
                className="flex items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <span className="text-purple-600 dark:text-purple-400 mr-3">🏥</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Lista de Pacientes
                </span>
              </NavLink>
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

export default connect(mapStateToProps)(AdministradorDashboard);
