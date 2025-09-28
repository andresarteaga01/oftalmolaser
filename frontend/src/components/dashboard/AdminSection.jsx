import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  UsersIcon, 
  CogIcon, 
  ChartBarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import DashboardCard from './DashboardCard';
import ChartCard from './ChartCard';
import api from '../../utils/axiosConfig';

const AdminSection = ({ user }) => {
  const [adminStats, setAdminStats] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    sistemasConfiguracion: 0,
    loading: true
  });

  useEffect(() => {
    const loadAdminStats = async () => {
      try {
        const response = await api.get('/api/pacientes/dashboard/admin-stats/');
        setAdminStats({
          totalUsuarios: response.data.total_usuarios || 0,
          usuariosActivos: response.data.usuarios_activos || 0,
          sistemasConfiguracion: response.data.nuevos_usuarios_mes || 0,
          loading: false
        });
      } catch (error) {
        console.error('Error loading admin stats:', error);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        setAdminStats({
          totalUsuarios: 0,
          usuariosActivos: 0,
          sistemasConfiguracion: 0,
          loading: false
        });
      }
    };

    loadAdminStats();
  }, []);

  const adminActions = [
    {
      title: 'Gestión de Usuarios',
      description: 'Crear, editar y administrar usuarios del sistema',
      icon: UsersIcon,
      link: '/usuarios',
      color: 'bg-blue-500 hover:bg-blue-600',
      stats: `${adminStats.totalUsuarios} usuarios registrados`
    },
    {
      title: 'Ver Reportes',
      description: 'Consultar reportes y estadísticas del sistema',
      icon: ChartBarIcon,
      link: '/reportes',
      color: 'bg-green-500 hover:bg-green-600',
      stats: 'Reportes disponibles'
    },
    {
      title: 'Gestión de Pacientes',
      description: 'Ver y administrar todos los pacientes',
      icon: CogIcon,
      link: '/pacientes',
      color: 'bg-purple-500 hover:bg-purple-600',
      stats: 'Gestión completa de pacientes'
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Panel de Administración</h2>
            <p className="text-sm text-gray-600">Gestión completa del sistema</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
          Administrador
        </span>
      </div>

      {/* Estadísticas Rápidas Admin */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <DashboardCard
          title="Total Usuarios"
          value={adminStats.totalUsuarios}
          subtitle="usuarios registrados"
          color="blue"
          loading={adminStats.loading}
        />
        <DashboardCard
          title="Usuarios Activos"
          value={adminStats.usuariosActivos}
          subtitle="activos este mes"
          color="green"
          loading={adminStats.loading}
        />
        <DashboardCard
          title="Nuevos Usuarios"
          value={adminStats.sistemasConfiguracion}
          subtitle="últimos 30 días"
          color="purple"
          loading={adminStats.loading}
        />
      </div>

      {/* Acciones Rápidas Admin */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminActions.map((action, index) => (
          <NavLink
            key={index}
            to={action.link}
            className="block group"
          >
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 group-hover:border-gray-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} text-white`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                        {action.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {action.description}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    {action.stats}
                  </p>
                </div>
                <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default AdminSection;