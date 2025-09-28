import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Navigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import Layout from '../hocs/Layout';

// Componentes comunes
import PatientSearch from '../components/PatientSearch';
import DashboardStats from '../components/DashboardStats';
import PatientList from '../components/PatientList';

// Componentes por rol
import AdminSection from '../components/dashboard/AdminSection';
import EspecialistaSection from '../components/dashboard/EspecialistaSection';
import MedicoSection from '../components/dashboard/MedicoSection';

const UnifiedDashboard = ({ isAuthenticated, user }) => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (isAuthenticated) {
            loadDashboardStats();
            loadRecentPatients();
        }
    }, [isAuthenticated]);

    const loadDashboardStats = async () => {
        try {
            const response = await api.get('/api/pacientes/dashboard/stats/');
            setStats(response.data);
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    };

    const loadRecentPatients = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/pacientes/buscar/');
            setPatients(response.data.results || response.data);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        setLoading(true);
        
        try {
            const url = query 
                ? `/api/pacientes/buscar/?search=${encodeURIComponent(query)}`
                : '/api/pacientes/buscar/';
                
            const response = await api.get(url);
            setPatients(response.data.results || response.data);
        } catch (error) {
            console.error('Error searching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    // Verificar rol del usuario
    const isAdmin = user?.role === 'administrador';
    const isEspecialista = user?.role === 'especialista' || isAdmin;
    const isMedico = user?.role === 'medico' || isAdmin;

    if (!isAuthenticated) {
        return <Navigate to='/login' />;
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Header Principal */}
                    <div className="mb-8">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
                            <h1 className="text-3xl font-bold mb-2">
                                Sistema de Detección de Retinopatía Diabética
                            </h1>
                            <div className="flex items-center justify-between">
                                <p className="text-blue-100">
                                    Bienvenido, <span className="font-semibold">{user?.first_name} {user?.last_name}</span>
                                </p>
                                <div className="flex items-center space-x-2">
                                    <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium">
                                        {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                                    </span>
                                    <span className="text-blue-200 text-sm">
                                        {new Date().toLocaleDateString('es-ES', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estadísticas Generales (Para todos) */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Estadísticas Generales</h2>
                        {stats && <DashboardStats stats={stats} />}
                    </div>

                    {/* Búsqueda Rápida (Para todos) */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">🔍 Búsqueda Rápida de Pacientes</h2>
                        <PatientSearch 
                            onSearch={handleSearch}
                            loading={loading}
                            searchQuery={searchQuery}
                        />
                    </div>

                    {/* Secciones por Rol */}
                    
                    {/* Sección Administrador */}
                    {isAdmin && (
                        <AdminSection user={user} />
                    )}

                    {/* Sección Especialista */}
                    {isEspecialista && (
                        <EspecialistaSection user={user} />
                    )}

                    {/* Sección Médico */}
                    {isMedico && (
                        <MedicoSection user={user} />
                    )}

                    {/* Lista de Pacientes Recientes (Para todos) */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">👥 Pacientes Recientes</h2>
                        <PatientList 
                            patients={patients}
                            loading={loading}
                            onRefresh={loadRecentPatients}
                        />
                    </div>

                    {/* Footer del Dashboard */}
                    <div className="mt-12 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="text-center text-sm text-gray-500">
                            <p>
                                Sistema desarrollado para la detección temprana de retinopatía diabética
                            </p>
                            <p className="mt-1">
                                Clínica Oftalmolaser • Versión 2.0 • {new Date().getFullYear()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

const mapStateToProps = state => ({
    isAuthenticated: state.auth.isAuthenticated,
    user: state.auth.user
});

export default connect(mapStateToProps)(UnifiedDashboard);