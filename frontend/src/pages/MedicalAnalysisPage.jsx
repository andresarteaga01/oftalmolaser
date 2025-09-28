/**
 * Página de análisis médico con Grad-CAM profesional
 * Ejemplo de integración del componente ProfessionalGradCAM
 */

import React, { useState } from 'react';
import { Upload, FileImage, ArrowLeft } from 'lucide-react';
import ProfessionalGradCAM from '../components/ProfessionalGradCAM';

const MedicalAnalysisPage = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);

    const handleImageSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validar que sea imagen
            if (!file.type.startsWith('image/')) {
                alert('Por favor selecciona un archivo de imagen válido');
                return;
            }

            setSelectedImage(file);
            
            // Crear preview
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleAnalysisComplete = (results) => {
        setAnalysisResults(results);
    };

    const resetAnalysis = () => {
        setSelectedImage(null);
        setImagePreview(null);
        setAnalysisResults(null);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <button 
                                onClick={() => window.history.back()}
                                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900">
                                Análisis Profesional de Retinopatía Diabética
                            </h1>
                        </div>
                        
                        {selectedImage && (
                            <button
                                onClick={resetAnalysis}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
                            >
                                Nueva Imagen
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!selectedImage ? (
                    // Image Upload Section
                    <div className="text-center">
                        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
                            <FileImage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h2 className="text-lg font-medium text-gray-900 mb-2">
                                Subir Imagen de Retina
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Selecciona una imagen de retina para realizar el análisis profesional con Grad-CAM
                            </p>
                            
                            <label className="cursor-pointer">
                                <div className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                    <Upload className="w-5 h-5" />
                                    Seleccionar Imagen
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                            </label>
                            
                            <div className="mt-6 text-xs text-gray-500">
                                <p>Formatos soportados: JPG, PNG, TIFF</p>
                                <p>Tamaño máximo: 10MB</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Analysis Section
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Processed Image */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Imagen Procesada
                            </h3>
                            <div className="bg-gray-100 rounded-lg p-4">
                                <img
                                    src={imagePreview}
                                    alt="Imagen procesada de retina"
                                    className="w-full h-auto rounded"
                                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                                />
                            </div>
                            
                            <div className="mt-4 text-sm text-gray-600">
                                <p><strong>Archivo:</strong> {selectedImage.name}</p>
                                <p><strong>Tamaño:</strong> {(selectedImage.size / 1024 / 1024).toFixed(2)} MB</p>
                                <p><strong>Tipo:</strong> {selectedImage.type}</p>
                            </div>
                        </div>

                        {/* Professional Grad-CAM Analysis */}
                        <div>
                            <ProfessionalGradCAM 
                                retinaImage={selectedImage}
                                onGradCAMGenerated={handleAnalysisComplete}
                                className="h-fit"
                            />
                        </div>
                    </div>
                )}

                {/* Analysis Summary */}
                {analysisResults && (
                    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Resumen del Análisis Médico
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-600 font-medium">Modelo Utilizado</p>
                                <p className="text-sm text-blue-800 mt-1">{analysisResults.modelo_usado}</p>
                            </div>
                            
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-600 font-medium">Calidad</p>
                                <p className="text-sm text-green-800 mt-1">
                                    {analysisResults.professional_grade ? 'Profesional Médico' : 'Estándar'}
                                </p>
                            </div>
                            
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="text-sm text-purple-600 font-medium">Resolución</p>
                                <p className="text-sm text-purple-800 mt-1">
                                    {analysisResults.professional_metadata?.resolution || '512x512'}
                                </p>
                            </div>
                            
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <p className="text-sm text-orange-600 font-medium">Web Compatible</p>
                                <p className="text-sm text-orange-800 mt-1">
                                    {analysisResults.web_compatible ? 'Sí' : 'No'}
                                </p>
                            </div>
                        </div>

                        {/* Technical Information */}
                        {analysisResults.processing_info && (
                            <div className="mt-6">
                                <h4 className="text-md font-medium text-gray-900 mb-3">
                                    Información Técnica
                                </h4>
                                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-1">
                                    <p><strong>Interpolación:</strong> {analysisResults.processing_info.interpolation}</p>
                                    <p><strong>Suavizado:</strong> {analysisResults.processing_info.smoothing}</p>
                                    <p><strong>Normalización:</strong> {analysisResults.processing_info.normalization}</p>
                                    <p><strong>Estándar:</strong> {analysisResults.processing_info.standards_compliance}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Instructions */}
                <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-yellow-800 mb-3">
                        Instrucciones de Uso
                    </h3>
                    <div className="text-sm text-yellow-700 space-y-2">
                        <p>• <strong>Calidad de imagen:</strong> Use imágenes de retina de alta calidad para mejores resultados</p>
                        <p>• <strong>Interpretación:</strong> Las áreas rojas/amarillas indican alta activación del modelo (zonas de interés)</p>
                        <p>• <strong>Transparencia:</strong> Ajuste la opacidad del overlay para mejor visualización</p>
                        <p>• <strong>Descarga:</strong> Puede descargar el Grad-CAM para incluir en reportes médicos</p>
                        <p>• <strong>Estándares:</strong> Este análisis cumple con estándares de visualización médica profesional</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicalAnalysisPage;