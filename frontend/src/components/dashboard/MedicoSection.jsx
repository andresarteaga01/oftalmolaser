import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  UserPlusIcon, 
  FolderIcon, 
  CpuChipIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import DashboardCard from './DashboardCard';
import api from '../../utils/axiosConfig';

const MedicoSection = ({ user }) => {
  const [medicoStats, setMedicoStats] = useState({
    pacientesRegistrados: 0,
    pacientesGestionados: 0,
    analisisML: 0,
    loading: true
  });

  useEffect(() => {
    const loadMedicoStats = async () => {
      try {
        // Usar endpoint correcto según el rol del usuario
        const endpoint = user?.role === 'administrador'
          ? '/api/pacientes/dashboard/stats/'
          : '/api/pacientes/dashboard/medico-stats/';

        const response = await api.get(endpoint);

        // Mapeo diferente según el endpoint usado
        if (user?.role === 'administrador') {
          // Endpoint /api/pacientes/dashboard/stats/
          setMedicoStats({
            pacientesRegistrados: response.data.total_pacientes || 0,
            pacientesGestionados: response.data.total_pacientes || 0,
            analisisML: response.data.imagenes_procesadas || 0,
            loading: false
          });
        } else {
          // Endpoint /api/pacientes/dashboard/medico-stats/
          setMedicoStats({
            pacientesRegistrados: response.data.pacientes_registrados || 0,
            pacientesGestionados: response.data.pacientes_gestionados || 0,
            analisisML: response.data.analisis_ml || 0,
            loading: false
          });
        }
      } catch (error) {
        console.error('Error loading medico stats:', error);
        setMedicoStats({
          pacientesRegistrados: 0,
          pacientesGestionados: 0,
          analisisML: 0,
          loading: false
        });
      }
    };

    loadMedicoStats();
  }, [user]);

  const medicoActions = [
    {
      title: 'Registrar Pacientes',
      description: 'Registrar nuevos pacientes en el sistema',
      icon: UserPlusIcon,
      link: '/pacientes/nuevo',
      color: 'bg-blue-500 hover:bg-blue-600',
      stats: `${medicoStats.pacientesRegistrados} pacientes registrados`
    },
    {
      title: 'Gestión de Pacientes',
      description: 'Administrar y actualizar información de pacientes',
      icon: FolderIcon,
      link: '/pacientes',
      color: 'bg-green-500 hover:bg-green-600',
      stats: `${medicoStats.pacientesGestionados} pacientes gestionados`
    },
    {
      title: 'Análisis ML',
      description: 'Realizar análisis de machine learning en imágenes',
      icon: CpuChipIcon,
      link: '/pacientes/prediccion',
      color: 'bg-purple-500 hover:bg-purple-600',
      stats: `${medicoStats.analisisML} análisis ML realizados`
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <HeartIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Panel Médico</h2>
            <p className="text-sm text-gray-600">Registro, gestión y análisis ML</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          Médico
        </span>
      </div>

      {/* Estadísticas Rápidas Médico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <DashboardCard
          title="Registros"
          value={medicoStats.pacientesRegistrados}
          subtitle="pacientes registrados"
          color="blue"
          loading={medicoStats.loading}
        />
        <DashboardCard
          title="Gestión"
          value={medicoStats.pacientesGestionados}
          subtitle="pacientes gestionados"
          color="green"
          loading={medicoStats.loading}
        />
        <DashboardCard
          title="Análisis ML"
          value={medicoStats.analisisML}
          subtitle="análisis realizados"
          color="purple"
          loading={medicoStats.loading}
        />
      </div>

      {/* Acciones Rápidas Médico */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {medicoActions.map((action, index) => (
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
                <CpuChipIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MedicoSection;