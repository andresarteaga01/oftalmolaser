import React from 'react';

const DashboardStats = ({ stats }) => {
    const getResultadoLabel = (resultado) => {
        const labels = {
            '0': 'Sin retinopatía',
            '1': 'Leve',
            '2': 'Moderada', 
            '3': 'Severa',
            '4': 'Proliferativa'
        };
        return labels[resultado] || 'Desconocido';
    };

    const getResultadoColor = (resultado) => {
        const colors = {
            '0': 'text-green-600 bg-green-100',
            '1': 'text-yellow-600 bg-yellow-100',
            '2': 'text-orange-600 bg-orange-100',
            '3': 'text-red-600 bg-red-100',
            '4': 'text-purple-600 bg-purple-100'
        };
        return colors[resultado] || 'text-gray-600 bg-gray-100';
    };

    return (
        <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Estadísticas del Sistema
            </h2>
            
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Pacientes
                                    </dt>
                                    <dd className="text-2xl font-semibold text-gray-900">
                                        {stats.total_pacientes.toLocaleString()}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Imágenes
                                    </dt>
                                    <dd className="text-2xl font-semibold text-gray-900">
                                        {stats.total_imagenes.toLocaleString()}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Imágenes Procesadas
                                    </dt>
                                    <dd className="text-2xl font-semibold text-gray-900">
                                        {stats.imagenes_procesadas.toLocaleString()}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Distribución de resultados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Distribución de Diagnósticos
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(stats.distribucion_resultados || {}).map(([resultado, count]) => (
                            <div key={resultado} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResultadoColor(resultado)}`}>
                                        {getResultadoLabel(resultado)}
                                    </span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                    {count} casos
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Actividad Reciente (7 días)
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pacientes nuevos</span>
                            <span className="text-lg font-semibold text-blue-600">
                                {stats.actividad_reciente?.pacientes_nuevos || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Imágenes nuevas</span>
                            <span className="text-lg font-semibold text-green-600">
                                {stats.actividad_reciente?.imagenes_nuevas || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Tasa de procesamiento</span>
                            <span className="text-lg font-semibold text-purple-600">
                                {stats.tasa_procesamiento?.toFixed(1) || 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;