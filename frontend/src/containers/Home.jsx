import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Navigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import Layout from '../hocs/Layout';
import PatientSearch from '../components/PatientSearch';
import DashboardStats from '../components/DashboardStats';
import PatientList from '../components/PatientList';

const Home = ({ isAuthenticated, user }) => {
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

    if (!isAuthenticated) {
        return <Navigate to='/login' />;
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Sistema de Detección de Retinopatía Diabética
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Bienvenido, {user?.first_name} {user?.last_name} ({user?.role})
                        </p>
                    </div>

                    {/* Dashboard Stats */}
                    {stats && <DashboardStats stats={stats} />}

                    {/* Patient Search */}
                    <div className="mb-8">
                        <PatientSearch 
                            onSearch={handleSearch}
                            loading={loading}
                            searchQuery={searchQuery}
                        />
                    </div>

                    {/* Patient List */}
                    <PatientList 
                        patients={patients}
                        loading={loading}
                        onRefresh={loadRecentPatients}
                    />
                </div>
            </div>
        </Layout>
    );
};

const mapStateToProps = state => ({
    isAuthenticated: state.auth.isAuthenticated,
    user: state.auth.user
});

export default connect(mapStateToProps)(Home);