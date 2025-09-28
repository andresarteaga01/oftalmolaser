import api from "utils/axiosConfig";

/**
 * Servicio para GradCAM de máxima calidad médica (versión única simplificada)
 */
class GradCAMService {
    constructor() {
        this.cache = new Map(); // Cache simple en memoria
    }

    /**
     * Genera GradCAM de máxima calidad médica (Enhanced Medical Grade)
     * @param {File} imagenFile - Archivo de imagen
     * @param {string} colormap - 'inferno' | 'jet' | 'viridis' (opcional)
     * @returns {Promise<Object>} - Resultado con GradCAM base64 de máxima calidad
     */
    async generarGradCAM(imagenFile, colormap = 'inferno') {
        try {
            // Crear clave de cache basada en archivo y colormap
            const cacheKey = this.createCacheKey(imagenFile, colormap);
            
            // Verificar cache primero
            if (this.cache.has(cacheKey)) {
                console.log('🔄 GradCAM obtenido desde cache');
                return {
                    ...this.cache.get(cacheKey),
                    desde_cache: true
                };
            }

            console.log(`🔥 Solicitando GradCAM de máxima calidad médica al servidor...`);
            const startTime = performance.now();

            // Preparar FormData
            const formData = new FormData();
            formData.append('imagen', imagenFile);
            if (colormap !== 'inferno') {
                formData.append('colormap', colormap);
            }

            // Usar endpoint único de máxima calidad
            const endpoint = '/api/pacientes/gradcam/';

            // Llamada al servidor
            const response = await api.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 45000 // 45 segundos para procesamiento de alta calidad
            });

            const endTime = performance.now();
            const tiempoGeneracion = (endTime - startTime).toFixed(0);

            // Resultado simplificado de máxima calidad
            const resultado = {
                // Imagen principal (RGBA transparente de máxima calidad)
                gradcam: response.data.gradcam,
                gradcam_overlay: response.data.gradcam_overlay,
                colorbar_svg: response.data.colorbar_svg,
                
                // Predicción médica
                prediccion: response.data.prediccion,
                prediccion_nombre: response.data.prediccion_nombre,
                confianza: response.data.confianza,
                
                // Metadatos de calidad
                mask_confidence: response.data.mask_confidence,
                medical_grade: response.data.medical_grade,
                quality: response.data.quality,
                
                // Interpretación médica
                interpretation_guide: response.data.interpretation_guide,
                metadata: response.data.metadata,
                
                // Info técnica
                modelo_usado: response.data.modelo_usado,
                colormap_used: response.data.colormap_used,
                tiempo_generacion: tiempoGeneracion + 'ms',
                desde_cache: false,
                
                // Instrucciones de uso
                usage_instructions: response.data.usage_instructions
            };

            // Guardar en cache
            this.cache.set(cacheKey, resultado);
            console.log(`✅ GradCAM generado en ${tiempoGeneracion}ms`);

            return resultado;

        } catch (error) {
            console.error('❌ Error generando GradCAM:', error);
            
            let mensajeError = 'Error generando mapa de calor';
            
            if (error.response) {
                // Error del servidor
                mensajeError = error.response.data?.error || 
                              `Error del servidor (${error.response.status})`;
            } else if (error.request) {
                // Error de conexión
                mensajeError = 'Error de conexión. Verifique su internet.';
            }

            throw new Error(mensajeError);
        }
    }

    /**
     * Crea una clave única para cache basada en archivo y colormap
     */
    createCacheKey(imagenFile, colormap) {
        const fileInfo = `${imagenFile.name}_${imagenFile.size}_${imagenFile.lastModified}`;
        return `gradcam_enhanced_${colormap}_${fileInfo}`;
    }

    /**
     * Limpia el cache de GradCAM
     */
    limpiarCache() {
        this.cache.clear();
        console.log('🧹 Cache de GradCAM limpiado');
    }

    /**
     * Obtiene estadísticas del cache
     */
    getEstadisticasCache() {
        return {
            tamaño: this.cache.size,
            claves: Array.from(this.cache.keys())
        };
    }

    /**
     * Verifica si una imagen tiene GradCAM en cache
     */
    tieneEnCache(imagenFile, colormap = 'inferno') {
        const cacheKey = this.createCacheKey(imagenFile, colormap);
        return this.cache.has(cacheKey);
    }
}

// Singleton instance
const gradcamService = new GradCAMService();

export default gradcamService;