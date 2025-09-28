import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { connect } from 'react-redux';
import DashboardCard from 'components/dashboard/DashboardCard';
import ChartCard from 'components/dashboard/ChartCard';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
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

const MedicoDashboard = ({ user }) => {
  const [stats, setStats] = useState({
    pacientesAtendidos: 0,
    consultasHoy: 0,
    imagenesAnalizadas: 0,
    seguimientos: 0,
    casosUrgentes: 0,
    satisfaccionPromedio: 0,
    loading: true
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/pacientes/dashboard/stats/', {
          headers: {
            'Authorization': `JWT ${localStorage.getItem('access')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats({
            pacientesAtendidos: data.total_pacientes,
            consultasHoy: data.actividad_reciente?.imagenes_nuevas || 0,
            imagenesAnalizadas: data.imagenes_procesadas || 0,
            seguimientos: data.imagenes_procesadas,
            casosUrgentes: data.distribucion_resultados?.['4'] || 0,
            satisfaccionPromedio: 0,
            loading: false
          });
        } else {
          console.error('Error al cargar estadísticas');
          setStats(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Error:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    loadStats();
  }, []);

  // Datos para evolución de pacientes
  const evolucionData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Pacientes Mejorados',
        data: [12, 15, 18, 14, 20, 25],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Casos Estables',
        data: [8, 12, 10, 15, 12, 18],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Distribución de tratamientos
  const tratamientosData = {
    labels: ['Observación', 'Medicamento', 'Láser', 'Cirugía'],
    datasets: [
      {
        data: [45, 25, 20, 10],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Consultas por día
  const consultasData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
    datasets: [
      {
        label: 'Consultas',
        data: [8, 12, 15, 10, 14],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 2,
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
            Panel Médico
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Bienvenido, Dr. {user?.first_name || user?.username} 👨‍⚕️
          </p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Pacientes Atendidos"
            value={stats.loading ? "..." : stats.pacientesAtendidos}
            icon="👥"
            color="blue"
            trend="up"
            trendValue="+7.2%"
          />
          <DashboardCard
            title="Consultas Hoy"
            value={stats.loading ? "..." : stats.consultasHoy}
            icon="📋"
            color="green"
            trend="up"
            trendValue="+2"
          />
          <DashboardCard
            title="Imágenes Analizadas"
            value={stats.loading ? "..." : stats.imagenesAnalizadas}
            icon="🔬"
            color="yellow"
            trend="up"
            trendValue="+12"
          />
          <DashboardCard
            title="Seguimientos"
            value={stats.loading ? "..." : stats.seguimientos}
            icon="🔄"
            color="purple"
            trend="up"
            trendValue="+5.1%"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Evolución de Pacientes" loading={stats.loading}>
            <Line data={evolucionData} options={chartOptions} />
          </ChartCard>
          
          <ChartCard title="Distribución de Tratamientos" loading={stats.loading}>
            <Doughnut data={tratamientosData} options={chartOptions} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard title="Consultas por Día" loading={stats.loading}>
              <Bar data={consultasData} options={chartOptions} />
            </ChartCard>
          </div>

          {/* Panel de herramientas médicas */}
          <div className="space-y-6">
            {/* Acciones rápidas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Herramientas Médicas
              </h3>
              <div className="space-y-3">
                
                <NavLink
                  to="/pacientes/buscar"
                  className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <span className="text-green-600 dark:text-green-400 mr-3">🔍</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Buscar Paciente
                  </span>
                </NavLink>
                
                <NavLink
                  to="/pacientes"
                  className="flex items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <span className="text-purple-600 dark:text-purple-400 mr-3">👥</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Lista de Pacientes
                  </span>
                </NavLink>
              </div>
            </div>

            {/* Próximas citas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Próximas Citas
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Ana Martínez
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      10:00 AM - Control
                    </p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Ver →
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Pedro López
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      2:30 PM - Seguimiento
                    </p>
                  </div>
                  <button className="text-green-600 hover:text-green-800 text-sm">
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

export default connect(mapStateToProps)(MedicoDashboard);