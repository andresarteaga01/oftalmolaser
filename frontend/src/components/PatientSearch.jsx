import React, { useState } from 'react';

const PatientSearch = ({ onSearch, loading, searchQuery }) => {
    const [query, setQuery] = useState(searchQuery || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
    };

    const handleClear = () => {
        setQuery('');
        onSearch('');
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
                Buscar Pacientes
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="DNI, nombre, apellido o historia clínica..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={loading}
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Buscando...
                                </div>
                            ) : (
                                'Buscar'
                            )}
                        </button>
                        
                        {query && (
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={loading}
                                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>
                
                <p className="text-sm text-gray-500">
                    Busca pacientes por DNI, nombre, apellido o número de historia clínica
                </p>
            </form>
        </div>
    );
};

export default PatientSearch;