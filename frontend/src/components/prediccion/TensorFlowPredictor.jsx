import React, { useState, useEffect, useRef } from 'react';
import gradcamService from 'services/gradcamService';

const TensorFlowPredictor = ({ 
    imagenFile, 
    onPredictionComplete, 
    onError,
    enableGradCAM = true, // Nueva prop para modo híbrido
    onGradCAMGenerated = null // Callback para cuando se genere GradCAM
}) => {
    const [apiReady, setApiReady] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isPredicting, setIsPredicting] = useState(false);
    const [gradcamState, setGradcamState] = useState(null); // Estado de GradCAM
    const canvasRef = useRef(null);
    const currentImageFile = useRef(null); // Referencia al archivo actual

    // Clases de retinopatía diabética
    const CLASES_RETINOPATIA = [
        'Sin retinopatía diabética',
        'Retinopatía diabética leve',
        'Retinopatía diabética moderada',
        'Retinopatía diabética severa',
        'Retinopatía diabética proliferativa'
    ];

    // Hacer predicción cuando cambie la imagen
    useEffect(() => {
        if (apiReady && imagenFile) {
            makePrediction();
        }
    }, [apiReady, imagenFile]);

    // Función para obtener token de autenticación
    const getAuthToken = () => {
        const token = localStorage.getItem('access_token') || localStorage.getItem('access');
        return token;
    };

    const makePrediction = async () => {
        if (!apiReady || !imagenFile) return;

        try {
            setIsPredicting(true);
            console.log('Iniciando predicción con API backend...');

            const startTime = performance.now();

            // Preparar datos para envío
            const formData = new FormData();
            formData.append('imagen', imagenFile);

            // Obtener token de autenticación
            const token = getAuthToken();
            if (!token) {
                throw new Error('No se encontró token de autenticación');
            }

            // Hacer petición a la API del backend
            const response = await fetch('/api/pacientes/predecir-simple/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const endTime = performance.now();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log('Predicción completada en:', (endTime - startTime).toFixed(2), 'ms');
            console.log('Respuesta del backend:', data);

            // Formatear resultado para compatibilidad con el componente padre
            const resultado = {
                clase: data.clase,
                nombre_clase: data.nombre_clase,
                confianza: data.confianza,
                probabilidades: data.probabilidades,
                tiempo_prediccion: (endTime - startTime).toFixed(2),
                modelo_usado: data.modelo_usado,
                // Imagen de alta calidad del backend
                imagen_display: data.imagen_display,
                imagen_size: data.imagen_size,
                // Funciones híbridas
                solicitarGradCAM: enableGradCAM ? () => generarGradCAMHibrido(data) : null,
                tieneGradCAMCache: enableGradCAM ? gradcamService.tieneEnCache(imagenFile) : false
            };

            console.log('Resultado final:', resultado);
            
            // Guardar referencia para GradCAM posterior
            currentImageFile.current = imagenFile;
            
            onPredictionComplete && onPredictionComplete(resultado);

        } catch (error) {
            console.error('Error en predicción:', error);
            onError && onError('Error en la predicción: ' + error.message);
        } finally {
            setIsPredicting(false);
        }
    };

    // Función para generar GradCAM bajo demanda (modo híbrido)
    const generarGradCAMHibrido = async (prediccionLocal) => {
        if (!currentImageFile.current || !enableGradCAM) {
            console.warn('No hay imagen disponible para GradCAM o está deshabilitado');
            return null;
        }

        try {
            setGradcamState({ loading: true, error: null, data: null });
            console.log('🔥 Generando GradCAM híbrido...');

            const resultado = await gradcamService.generarGradCAM(
                currentImageFile.current, 
                prediccionLocal
            );

            setGradcamState({ 
                loading: false, 
                error: null, 
                data: resultado 
            });

            // Notificar al componente padre si hay callback
            if (onGradCAMGenerated) {
                onGradCAMGenerated(resultado);
            }

            console.log('✅ GradCAM híbrido generado:', resultado);
            return resultado;

        } catch (error) {
            console.error('❌ Error generando GradCAM híbrido:', error);
            
            setGradcamState({ 
                loading: false, 
                error: error.message, 
                data: null 
            });

            if (onError) {
                onError(`Error GradCAM: ${error.message}`);
            }

            return null;
        }
    };

    // Exponer función de GradCAM para uso externo
    const getGradCAMFunction = () => {
        if (!enableGradCAM || !currentImageFile.current) return null;
        return () => generarGradCAMHibrido();
    };

    return (
        <div className="tensorflow-predictor">
            {/* Canvas oculto para procesamiento de imágenes */}
            <canvas 
                ref={canvasRef} 
                style={{ display: 'none' }}
            />
            
            {/* Estado del modelo */}
            {isLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                        <span className="text-blue-800 font-medium">
                            Conectando con API del servidor...
                        </span>
                    </div>
                </div>
            )}

            {/* Estado de predicción */}
            {isPredicting && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-3"></div>
                        <span className="text-yellow-800 font-medium">
                            Analizando imagen en servidor...
                        </span>
                    </div>
                </div>
            )}

            {/* Información del modelo */}
            {apiReady && !isLoading && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-green-800 font-medium">
                            API Servidor conectada (alta precisión) {enableGradCAM && '+ GradCAM híbrido disponible'}
                        </span>
                    </div>
                </div>
            )}

            {/* Estado de GradCAM híbrido */}
            {gradcamState?.loading && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-3"></div>
                        <span className="text-purple-800 font-medium">
                            Generando mapa de calor explicativo...
                        </span>
                    </div>
                </div>
            )}

            {gradcamState?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                        <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-red-800 font-medium">
                            Error GradCAM: {gradcamState.error}
                        </span>
                    </div>
                </div>
            )}

            {gradcamState?.data && !gradcamState.loading && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                        <svg className="h-5 w-5 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-purple-800 font-medium">
                            Mapa de calor generado en {gradcamState.data.tiempo_generacion}
                            {gradcamState.data.desde_cache && ' (desde cache)'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TensorFlowPredictor;