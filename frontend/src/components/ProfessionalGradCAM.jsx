/**
 * Componente React para visualizar Grad-CAM de máxima calidad médica
 * 
 * Características:
 * - Visualización de Grad-CAM Enhanced Medical Grade (máxima calidad)
 * - Guía de interpretación médica integrada
 * - Metadatos técnicos completos
 * - Interfaz optimizada para contexto clínico
 * - Superposición automática sobre imagen de retina
 * - Versión única simplificada de alta calidad
 */

import React, { useState, useEffect } from 'react';
import { Upload, Eye, Info, Download, Loader, AlertCircle, CheckCircle } from 'lucide-react';

const ProfessionalGradCAM = ({ 
    retinaImage, 
    onGradCAMGenerated,
    className = ""
}) => {
    const [gradcamData, setGradcamData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showMetadata, setShowMetadata] = useState(false);
    const [overlayOpacity, setOverlayOpacity] = useState(0.7);

    const generateEnhancedGradCAM = async () => {
        if (!retinaImage) {
            setError('Se requiere una imagen de retina');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('imagen', retinaImage);

            const token = localStorage.getItem('token');
            const response = await fetch('/api/pacientes/gradcam/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setGradcamData(data);
            
            if (onGradCAMGenerated) {
                onGradCAMGenerated(data);
            }

        } catch (err) {
            setError(err.message);
            console.error('Error generando GradCAM Enhanced:', err);
        } finally {
            setLoading(false);
        }
    };

    const downloadGradCAM = () => {
        if (!gradcamData?.gradcam) return;
        
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${gradcamData.gradcam}`;
        link.download = `gradcam_enhanced_${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
    };

    const getSeverityColor = (prediction) => {
        const colors = {
            0: 'text-green-600 bg-green-50 border-green-200',    // Sin retinopatía
            1: 'text-yellow-600 bg-yellow-50 border-yellow-200', // Leve
            2: 'text-orange-600 bg-orange-50 border-orange-200', // Moderada
            3: 'text-red-600 bg-red-50 border-red-200',         // Severa
            4: 'text-red-800 bg-red-100 border-red-300'         // Proliferativa
        };
        return colors[prediction] || 'text-gray-600 bg-gray-50 border-gray-200';
    };


    return (
        <div className={`professional-gradcam bg-white rounded-lg shadow-lg border ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-blue-600" />
                        Grad-CAM Enhanced Medical Grade
                    </h3>
                    
                    {!gradcamData && (
                        <button
                            onClick={generateEnhancedGradCAM}
                            disabled={loading || !retinaImage}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                        >
                            {loading ? (
                                <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            {loading ? 'Procesando...' : 'Generar Análisis'}
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400">
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
                        <div>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="p-8 text-center">
                    <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
                    <p className="text-gray-600">Generando análisis Enhanced Medical Grade...</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Procesando con máxima calidad médica (normalización robusta, máscara retinal, anti-aliasing)
                    </p>
                </div>
            )}

            {/* Results */}
            {gradcamData && (
                <div className="p-4 space-y-6">
                    {/* Medical Results */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-3 rounded-lg border ${getSeverityColor(gradcamData.prediccion)}`}>
                            <p className="text-sm font-medium">Diagnóstico</p>
                            <p className="text-lg font-semibold">{gradcamData.prediccion_nombre}</p>
                        </div>
                        
                    </div>

                    {/* Visualization */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-md font-medium text-gray-900">Visualización Enhanced Medical Grade</h4>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600">Opacidad:</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={overlayOpacity}
                                        onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                        className="w-20"
                                    />
                                    <span className="text-sm text-gray-500 w-8">
                                        {Math.round(overlayOpacity * 100)}%
                                    </span>
                                </div>
                                
                                <button
                                    onClick={downloadGradCAM}
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                    title="Descargar Grad-CAM"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Image Container */}
                        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                            {/* Base retina image */}
                            <img 
                                src={URL.createObjectURL(retinaImage)} 
                                alt="Imagen de retina"
                                className="w-full h-auto"
                                style={{ maxWidth: '512px', margin: '0 auto', display: 'block' }}
                            />
                            
                            {/* Enhanced Grad-CAM overlay */}
                            <img 
                                src={`data:image/png;base64,${gradcamData.gradcam}`}
                                alt="Grad-CAM Enhanced Medical Grade"
                                className="absolute top-0 left-0 w-full h-full object-contain"
                                style={{ 
                                    opacity: overlayOpacity,
                                    mixBlendMode: 'normal'
                                }}
                            />
                        </div>

                        {/* Medical Interpretation Guide */}
                        {gradcamData.interpretation_guide && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h5 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Guía de Interpretación Médica
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded" style={{background: 'linear-gradient(to right, #000428, #004e92)'}}></div>
                                        <span className="text-blue-800">{gradcamData.interpretation_guide.azul_verde}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded" style={{background: 'linear-gradient(to right, #f12711, #f5af19)'}}></div>
                                        <span className="text-blue-800">{gradcamData.interpretation_guide.amarillo_naranja}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded" style={{background: 'linear-gradient(to right, #ff0844, #ffb199)'}}></div>
                                        <span className="text-blue-800">{gradcamData.interpretation_guide.rojo_intenso}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded border-2 border-gray-300 bg-transparent"></div>
                                        <span className="text-blue-800">{gradcamData.interpretation_guide.transparente}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Technical Metadata (collapsible) */}
                        <div className="border border-gray-200 rounded-lg">
                            <button
                                onClick={() => setShowMetadata(!showMetadata)}
                                className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
                            >
                                <span className="text-sm font-medium text-gray-700">
                                    Metadatos Técnicos Enhanced Medical Grade
                                </span>
                                <Info className={`w-4 h-4 text-gray-400 transition-transform ${showMetadata ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showMetadata && gradcamData.metadata && (
                                <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p><strong>Método:</strong> {gradcamData.metadata.enhancement_method}</p>
                                            <p><strong>Resolución:</strong> {gradcamData.metadata.output_size}</p>
                                            <p><strong>Interpolación:</strong> {gradcamData.metadata.interpolation}</p>
                                            <p><strong>Suavizado:</strong> {gradcamData.metadata.smoothing}</p>
                                        </div>
                                        <div>
                                            <p><strong>Colormap:</strong> {gradcamData.metadata.colormap}</p>
                                            <p><strong>Normalización:</strong> {gradcamData.metadata.normalization}</p>
                                            <p><strong>Calidad:</strong> {gradcamData.quality}</p>
                                            <p><strong>Máscara retinal:</strong> {gradcamData.metadata.masking}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Success indicator */}
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Análisis Enhanced Medical Grade completado con máxima calidad médica</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfessionalGradCAM;