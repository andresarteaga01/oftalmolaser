import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/axiosConfig';

const PatientDetail = () => {
    const { id } = useParams();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [generateGradCAM, setGenerateGradCAM] = useState(true);

    useEffect(() => {
        loadPatientDetail();
    }, [id]);

    const loadPatientDetail = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/pacientes/${id}/`);
            setPatient(response.data);
            setError(null);
        } catch (error) {
            console.error('Error loading patient:', error);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('imagen', file);
        formData.append('generate_gradcam', generateGradCAM.toString());

        try {
            setUploadingImage(true);
            const response = await api.post(`/api/pacientes/${id}/upload/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Recargar datos del paciente
            await loadPatientDetail();
            const message = generateGradCAM 
                ? 'Imagen subida exitosamente. El procesamiento y generación de GradCAM puede tomar unos minutos.'
                : 'Imagen subida exitosamente. El procesamiento puede tomar unos minutos.';
            alert(message);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error de conexión al subir imagen');
        } finally {
            setUploadingImage(false);
            event.target.value = '';
        }
    };

    const getResultadoLabel = (resultado) => {
        const labels = {
            0: 'Sin retinopatía',
            1: 'Leve',
            2: 'Moderada', 
            3: 'Severa',
            4: 'Proliferativa'
        };
        return labels[resultado] || 'Sin diagnóstico';
    };

    const getResultadoColor = (resultado) => {
        const colors = {
            0: 'text-green-800 bg-green-100 border-green-200',
            1: 'text-yellow-800 bg-yellow-100 border-yellow-200',
            2: 'text-orange-800 bg-orange-100 border-orange-200',
            3: 'text-red-800 bg-red-100 border-red-200',
            4: 'text-purple-800 bg-purple-100 border-purple-200'
        };
        return colors[resultado] || 'text-gray-800 bg-gray-100 border-gray-200';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-gray-600">Cargando información del paciente...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{error}</p>
                                </div>
                                <div className="mt-4">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={loadPatientDetail}
                                            className="bg-red-100 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                                        >
                                            Reintentar
                                        </button>
                                        <Link
                                            to="/"
                                            className="bg-red-100 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                                        >
                                            Volver al inicio
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!patient) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Breadcrumb */}
                <nav className="flex mb-6" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-4">
                        <li>
                            <Link to="/" className="text-gray-400 hover:text-gray-500">
                                <svg className="flex-shrink-0 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                </svg>
                                <span className="sr-only">Inicio</span>
                            </Link>
                        </li>
                        <li>
                            <div className="flex items-center">
                                <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="ml-4 text-sm font-medium text-gray-500">
                                    {patient.nombres} {patient.apellidos}
                                </span>
                            </div>
                        </li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="bg-white shadow rounded-lg mb-6">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                                        <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {patient.nombres} {patient.apellidos}
                                    </h1>
                                    <p className="text-sm text-gray-500">
                                        CI: {patient.ci} • {patient.edad} años • {patient.sexo}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                {patient.resultado !== null && (
                                    <div className={`px-4 py-2 rounded-full border ${getResultadoColor(patient.resultado)}`}>
                                        <span className="text-sm font-medium">
                                            {getResultadoLabel(patient.resultado)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Información del paciente */}
                    <div className="lg:col-span-1">
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">
                                Información del Paciente
                            </h2>
                            
                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Historia Clínica</dt>
                                    <dd className="text-sm text-gray-900">{patient.historia_clinica || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Fecha de Nacimiento</dt>
                                    <dd className="text-sm text-gray-900">{formatDate(patient.fecha_nacimiento)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Fecha de Registro</dt>
                                    <dd className="text-sm text-gray-900">{formatDate(patient.fecha_creacion)}</dd>
                                </div>
                            </dl>

                            {/* Upload de nueva imagen */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h3 className="text-sm font-medium text-gray-900 mb-3">
                                    Subir Nueva Imagen
                                </h3>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="generate-gradcam"
                                            checked={generateGradCAM}
                                            onChange={(e) => setGenerateGradCAM(e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="generate-gradcam" className="ml-2 block text-sm text-gray-900">
                                            Generar visualización GradCAM
                                        </label>
                                    </div>
                                    
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                                    />
                                </div>
                                
                                {uploadingImage && (
                                    <div className="mt-2 flex items-center text-sm text-indigo-600">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {generateGradCAM ? 'Subiendo imagen y generando GradCAM...' : 'Subiendo imagen...'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Imágenes y diagnósticos */}
                    <div className="lg:col-span-2">
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">
                                Imágenes y Diagnósticos ({patient.imagenes?.length || 0})
                            </h2>

                            {!patient.imagenes || patient.imagenes.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay imágenes</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Suba una imagen para comenzar el análisis.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {patient.imagenes.map((imagen, index) => (
                                        <div key={imagen.id} className="border border-gray-200 rounded-lg p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-lg font-medium text-gray-900">
                                                    Imagen {index + 1}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    {formatDate(imagen.fecha_creacion)}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Imagen Procesada</h4>
                                                    <img
                                                        src={imagen.imagen_procesada || imagen.imagen_thumbnail || imagen.imagen}
                                                        alt={`Imagen procesada ${index + 1}`}
                                                        className="w-full h-64 object-cover rounded cursor-pointer hover:opacity-75 border"
                                                        onClick={() => setSelectedImage(imagen)}
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Mapa de Atención (GradCAM)</h4>
                                                    {imagen.gradcam ? (
                                                        <img
                                                            src={imagen.gradcam}
                                                            alt={`GradCAM ${index + 1}`}
                                                            className="w-full h-64 object-cover rounded cursor-pointer hover:opacity-75 border"
                                                            onClick={() => setSelectedImage(imagen)}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-64 bg-gray-100 rounded border flex items-center justify-center">
                                                            <div className="text-center">
                                                                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                <p className="text-xs text-gray-500">GradCAM no disponible</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gray-50 rounded p-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-500">Diagnóstico:</span>
                                                        {imagen.resultado !== null ? (
                                                            <div className="mt-1">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResultadoColor(imagen.resultado)}`}>
                                                                    {getResultadoLabel(imagen.resultado)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500 mt-1">Procesando...</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-500">Modelo:</span>
                                                        <p className="text-sm text-gray-900 mt-1">
                                                            {imagen.modelo_version || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal para imagen ampliada */}
                {selectedImage && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setSelectedImage(null)}>
                        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Análisis Detallado
                                </h3>
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Imagen Procesada</h4>
                                    <img
                                        src={selectedImage.imagen_procesada || selectedImage.imagen}
                                        alt="Imagen procesada"
                                        className="w-full h-64 object-cover rounded"
                                    />
                                </div>
                                
                                {selectedImage.gradcam && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Mapa de Atención (GradCAM)</h4>
                                        <img
                                            src={selectedImage.gradcam}
                                            alt="GradCAM"
                                            className="w-full h-64 object-cover rounded"
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 p-4 bg-gray-50 rounded">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-sm font-medium text-gray-500">Diagnóstico:</span>
                                        <p className="text-sm text-gray-900">
                                            {selectedImage.resultado !== null ? getResultadoLabel(selectedImage.resultado) : 'Sin diagnóstico'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500">Fecha de análisis:</span>
                                        <p className="text-sm text-gray-900">
                                            {formatDate(selectedImage.fecha_prediccion)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500">Versión del modelo:</span>
                                        <p className="text-sm text-gray-900">
                                            {selectedImage.modelo_version || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientDetail;