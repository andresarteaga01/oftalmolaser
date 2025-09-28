import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ChartBarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import DashboardCard from './DashboardCard';
import api from '../../utils/axiosConfig';

const EspecialistaSection = ({ user }) => {
  const [especialistaStats, setEspecialistaStats] = useState({
    pacientesBuscados: 0,
    reportesRevisados: 0,
    estadisticasGeneradas: 0,
    loading: true
  });

  useEffect(() => {
    const loadEspecialistaStats = async () => {
      try {
        // Usar endpoint correcto según el rol del usuario
        const endpoint = user?.role === 'administrador'
          ? '/api/pacientes/dashboard/stats/'
          : '/api/pacientes/dashboard/medico-stats/';

        const response = await api.get(endpoint);
        const data = response.data;

        // Mapeo diferente según el endpoint usado
        if (user?.role === 'administrador') {
          // Endpoint /api/pacientes/dashboard/stats/
          setEspecialistaStats({
            pacientesBuscados: data.total_pacientes || 0,
            reportesRevisados: data.imagenes_procesadas || 0,
            estadisticasGeneradas: (data.total_imagenes || 0) - (data.imagenes_procesadas || 0),
            loading: false
          });
        } else {
          // Endpoint /api/pacientes/dashboard/medico-stats/
          setEspecialistaStats({
            pacientesBuscados: data.pacientes_registrados || 0,
            reportesRevisados: data.analisis_ml || 0,
            estadisticasGeneradas: (data.pacientes_registrados || 0) - (data.analisis_ml || 0),
            loading: false
          });
        }
      } catch (error) {
        console.error('Error cargando estadísticas del especialista:', error);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        setEspecialistaStats({
          pacientesBuscados: 0,
          reportesRevisados: 0,
          estadisticasGeneradas: 0,
          loading: false
        });
      }
    };

    loadEspecialistaStats();
  }, [user]);

  const especialistaActions = [
    {
      title: 'Buscar Pacientes',
      description: 'Buscar y revisar información de pacientes registrados',
      icon: MagnifyingGlassIcon,
      link: '/pacientes/buscar',
      color: 'bg-blue-500 hover:bg-blue-600',
      stats: `${especialistaStats.pacientesBuscados} pacientes registrados`
    },
    {
      title: 'Ver Reportes',
      description: 'Revisar reportes médicos y diagnósticos de pacientes',
      icon: DocumentTextIcon,
      link: '/reportes',
      color: 'bg-green-500 hover:bg-green-600',
      stats: `${especialistaStats.reportesRevisados} imágenes procesadas`
    },
    {
      title: 'Estadísticas Clínicas',
      description: 'Analizar estadísticas y tendencias clínicas',
      icon: ChartBarIcon,
      link: '/estadisticas',
      color: 'bg-purple-500 hover:bg-purple-600',
      stats: `${especialistaStats.estadisticasGeneradas} imágenes pendientes`
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <EyeIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Panel de Especialista</h2>
            <p className="text-sm text-gray-600">Búsqueda, reportes y análisis clínico</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          Especialista
        </span>
      </div>

      {/* Estadísticas Rápidas Especialista */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <DashboardCard
          title="Pacientes"
          value={especialistaStats.pacientesBuscados}
          subtitle="total registrados"
          color="blue"
          loading={especialistaStats.loading}
        />
        <DashboardCard
          title="Imágenes Procesadas"
          value={especialistaStats.reportesRevisados}
          subtitle="con diagnóstico IA"
          color="green"
          loading={especialistaStats.loading}
        />
        <DashboardCard
          title="Pendientes"
          value={especialistaStats.estadisticasGeneradas}
          subtitle="por procesar"
          color="purple"
          loading={especialistaStats.loading}
        />
      </div>

      {/* Acciones Rápidas Especialista */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {especialistaActions.map((action, index) => (
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
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
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
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default EspecialistaSection;