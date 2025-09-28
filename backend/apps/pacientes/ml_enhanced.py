import numpy as np
import tensorflow as tf
import cv2
import os
import base64
import json
import logging
from PIL import Image
from io import BytesIO
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

class ModelManager:
    """Gestor avanzado de modelos ML con versionado"""
    
    def __init__(self):
        self.models = {}
        self.current_version = "v2.0"
        self.confidence_threshold = 0.7
        self.load_models()
    
    def load_models(self):
        """Cargar todos los modelos disponibles"""
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(BASE_DIR, "modelos")
        
        # Cargar metadata del modelo
        metadata_path = os.path.join(models_dir, "retinopathy_model_metadata.json")
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    self.model_metadata = json.load(f)
                self.current_version = self.model_metadata.get('version', 'v1.0')
                logger.info(f"Metadata cargada: {self.model_metadata['model_name']} v{self.current_version}")
            except Exception as e:
                logger.error(f"Error cargando metadata: {e}")
                self.model_metadata = {}
        
        # Modelo principal nuevo
        model_path = os.path.join(models_dir, "retinopathy_model.keras")
        if os.path.exists(model_path):
            try:
                self.models[self.current_version] = tf.keras.models.load_model(model_path)
                # Usar tamaño del nuevo modelo (96x96)
                img_size = self.model_metadata.get('input_shape', [96, 96, 3])[0]
                _ = self.models[self.current_version](tf.zeros((1, img_size, img_size, 3), dtype=tf.float32))
                logger.info(f"Modelo {self.current_version} cargado exitosamente ({img_size}x{img_size})")
            except Exception as e:
                logger.error(f"Error cargando modelo: {e}")
        
        # Cargar modelo GradCAM si existe
        gradcam_path = os.path.join(models_dir, "retinopathy_model_gradcam.keras")
        if os.path.exists(gradcam_path):
            try:
                self.models[f"{self.current_version}_gradcam"] = tf.keras.models.load_model(gradcam_path)
                logger.info(f"Modelo GradCAM {self.current_version} cargado")
            except Exception as e:
                logger.warning(f"Error cargando modelo GradCAM: {e}")
        
        # Cargar modelos adicionales si existen (mantener compatibilidad)
        self._load_additional_models(models_dir)
    
    def _load_additional_models(self, models_dir):
        """Cargar modelos adicionales para A/B testing"""
        # Mantener compatibilidad con modelos anteriores solo si están disponibles
        additional_models = {
            "v1.5": "resnet50_512_final_1.5.keras",
            "v2.1": "resnet50_512_final_2.1.keras",
            "legacy": "resnet50_512_final_2.0.keras",
        }
        
        for version, filename in additional_models.items():
            model_path = os.path.join(models_dir, filename)
            if os.path.exists(model_path):
                try:
                    self.models[version] = tf.keras.models.load_model(model_path)
                    # Determinar tamaño de imagen según el modelo
                    img_size = 512 if "resnet50" in filename else 96
                    _ = self.models[version](tf.zeros((1, img_size, img_size, 3), dtype=tf.float32))
                    logger.info(f"Modelo adicional {version} cargado ({img_size}x{img_size})")
                except Exception as e:
                    logger.warning(f"No se pudo cargar modelo {version}: {e}")
    
    def get_model(self, version: str = None) -> tf.keras.Model:
        """Obtener modelo específico"""
        version = version or self.current_version
        return self.models.get(version, self.models.get(self.current_version))
    
    def set_confidence_threshold(self, threshold: float):
        """Configurar umbral de confianza"""
        if 0.0 <= threshold <= 1.0:
            self.confidence_threshold = threshold
            logger.info(f"Umbral de confianza actualizado a {threshold}")

class BatchMLProcessor:
    """Procesador ML optimizado para operaciones batch"""
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.max_batch_size = 8
        # Usar tamaño del nuevo modelo desde metadata
        img_size = getattr(self.model_manager, 'model_metadata', {}).get('input_shape', [96, 96, 3])[0]
        self.target_size = (img_size, img_size)
    
    def process_images_batch(self, image_paths: List[str], model_version: str = None) -> List[Dict]:
        """Procesar múltiples imágenes en batch para mejor performance"""
        results = []
        
        # Procesar en chunks del tamaño de batch
        for i in range(0, len(image_paths), self.max_batch_size):
            batch_paths = image_paths[i:i + self.max_batch_size]
            batch_results = self._process_batch_chunk(batch_paths, model_version)
            results.extend(batch_results)
        
        return results
    
    def _process_batch_chunk(self, image_paths: List[str], model_version: str = None) -> List[Dict]:
        """Procesar un chunk de imágenes"""
        try:
            # Cargar y preprocesar imágenes
            images_batch = []
            valid_paths = []
            
            for path in image_paths:
                try:
                    img = self._load_and_preprocess_image(path)
                    if img is not None:
                        images_batch.append(img)
                        valid_paths.append(path)
                except Exception as e:
                    logger.warning(f"Error cargando imagen {path}: {e}")
            
            if not images_batch:
                return []
            
            # Predicción batch
            model = self.model_manager.get_model(model_version)
            images_array = np.array(images_batch)
            predictions = model.predict(images_array, batch_size=len(images_batch))
            
            # Procesar resultados
            results = []
            for i, (path, pred) in enumerate(zip(valid_paths, predictions)):
                class_pred = int(np.argmax(pred))
                confidence = float(np.max(pred))
                
                # Verificar umbral de confianza
                is_reliable = confidence >= self.model_manager.confidence_threshold
                
                result = {
                    'image_path': path,
                    'prediction': class_pred,
                    'confidence': round(confidence, 4),
                    'all_probabilities': [round(float(p), 4) for p in pred],
                    'is_reliable': is_reliable,
                    'model_version': model_version or self.model_manager.current_version,
                    'processed_at': datetime.now().isoformat()
                }
                
                # Generar GradCAM si la confianza es suficiente
                if is_reliable:
                    try:
                        gradcam = self._generate_gradcam(images_batch[i], model, class_pred)
                        result['gradcam'] = gradcam
                    except Exception as e:
                        logger.warning(f"Error generando GradCAM para {path}: {e}")
                        result['gradcam'] = None
                
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"Error en procesamiento batch: {e}")
            return []
    
    def _load_and_preprocess_image(self, image_path: str) -> Optional[np.ndarray]:
        """Cargar y preprocesar imagen individual"""
        try:
            if isinstance(image_path, str) and os.path.exists(image_path):
                image = Image.open(image_path).convert("RGB")
            else:
                # Asumir que es un objeto de imagen de Django
                image = Image.open(image_path).convert("RGB")
            
            image = image.resize(self.target_size)
            img_array = np.array(image) / 255.0
            return img_array
            
        except Exception as e:
            logger.error(f"Error preprocesando imagen: {e}")
            return None
    
    def _generate_gradcam(self, image_array: np.ndarray, model: tf.keras.Model, 
                         pred_index: int, layer_name: str = None) -> Optional[str]:
        """Generar GradCAM optimizado"""
        try:
            # Auto-detectar capa convolucional si no se especifica
            if layer_name is None:
                available_layers = [layer.name for layer in model.layers]
                conv_layers = [name for name in available_layers if 'conv2d' in name.lower()]
                
                if conv_layers:
                    # Buscar específicamente la segunda capa convolucional
                    target_conv_layer = None
                    for layer_name_candidate in conv_layers:
                        if 'conv2d_2' in layer_name_candidate or (len(conv_layers) >= 2 and layer_name_candidate == conv_layers[1]):
                            target_conv_layer = layer_name_candidate
                            break
                    
                    # Si no encontramos conv2d_2, usar la última capa conv
                    if target_conv_layer is None:
                        target_conv_layer = conv_layers[-1]
                        
                    layer_name = target_conv_layer
                    print(f"✅ ML Auto-detectada capa GradCAM: {layer_name}")
                else:
                    # Fallback
                    candidates = ['conv2d_2_functional_3', 'conv2d_2', 'conv2d_1_functional_0', 'conv2d_1']
                    for candidate in candidates:
                        if candidate in available_layers:
                            layer_name = candidate
                            break
                    
                    if layer_name is None:
                        layer_name = 'conv2d_2'  # Último recurso
            
            # Crear grad_model con reintentos defensivos
            max_attempts = 3
            grad_model = None
            
            for attempt in range(max_attempts):
                try:
                    grad_model = tf.keras.models.Model(
                        [model.inputs], [model.get_layer(layer_name).output, model.output]
                    )
                    print(f"✅ Grad model ML creado en intento {attempt + 1}")
                    break
                    
                except (AttributeError, RuntimeError, ValueError) as e:
                    print(f"⚠️ Intento ML {attempt + 1} falló: {str(e)}")
                    if "never been called" in str(e) or "no defined input" in str(e):
                        print(f"🔥 Forzando inicialización ML (intento {attempt + 1})...")
                        dummy_input = tf.zeros((1, self.target_size[0], self.target_size[1], 3), dtype=tf.float32)
                        _ = model(dummy_input, training=False)
                        print(f"✅ Modelo ML forzado (intento {attempt + 1})")
                    else:
                        if attempt == max_attempts - 1:
                            raise e
            
            if grad_model is None:
                return None
            
            with tf.GradientTape() as tape:
                conv_outputs, predictions = grad_model(np.array([image_array]))
                class_channel = predictions[:, pred_index]
            
            grads = tape.gradient(class_channel, conv_outputs)
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            conv_outputs = conv_outputs[0]
            heatmap = tf.reduce_sum(tf.multiply(pooled_grads, conv_outputs), axis=-1)
            heatmap = np.maximum(heatmap, 0) / tf.reduce_max(heatmap)
            heatmap_np = heatmap.numpy()
            
            # 🔬 PROCESAMIENTO CLÍNICO DE ALTA CALIDAD
            
            # 1. Trabajar con resolución clínica alta
            clinical_resolution = (512, 512)
            original_img = (image_array * 255).astype(np.uint8)
            original_hires = cv2.resize(original_img, clinical_resolution, interpolation=cv2.INTER_CUBIC)
            
            # 2. Redimensionar heatmap con máxima calidad
            heatmap_hires = cv2.resize(heatmap_np, clinical_resolution, interpolation=cv2.INTER_CUBIC)
            
            # 3. Aplicar sharpening para definición de lesiones
            kernel_sharpen = np.array([[-1,-1,-1],
                                     [-1, 9,-1],
                                     [-1,-1,-1]])
            heatmap_sharp = cv2.filter2D(heatmap_hires, -1, kernel_sharpen)
            heatmap_sharp = np.clip(heatmap_sharp, 0, 1)
            
            # 4. Stretching de contraste médico
            p2, p98 = np.percentile(heatmap_sharp, (2, 98))
            heatmap_contrast = np.clip((heatmap_sharp - p2) / (p98 - p2), 0, 1)
            
            # 5. Detección de lesiones por niveles
            high_activation = heatmap_contrast > 0.7    # Lesiones críticas
            medium_activation = heatmap_contrast > 0.4  # Lesiones moderadas  
            low_activation = heatmap_contrast > 0.15    # Activación leve
            
            # 6. Gamma correction para resaltar microlesiones
            heatmap_medical = np.power(heatmap_contrast, 0.7)
            heatmap_uint8 = np.uint8(255 * heatmap_medical)
            
            # 7. Colormap clínico
            heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
            
            # 8. Superposición estratificada para diagnóstico
            superimposed = original_hires.copy().astype(np.float64)
            
            # Transparencias diferenciadas por severidad
            alpha_high = 0.6    # Lesiones severas muy visibles
            alpha_medium = 0.4  # Lesiones moderadas visibles
            alpha_low = 0.2     # Cambios sutiles
            
            # Aplicar superposición por niveles de severidad
            superimposed[high_activation] = (
                (1 - alpha_high) * original_hires[high_activation] + 
                alpha_high * heatmap_colored[high_activation]
            )
            
            superimposed[medium_activation & ~high_activation] = (
                (1 - alpha_medium) * original_hires[medium_activation & ~high_activation] + 
                alpha_medium * heatmap_colored[medium_activation & ~high_activation]
            )
            
            superimposed[low_activation & ~medium_activation] = (
                (1 - alpha_low) * original_hires[low_activation & ~medium_activation] + 
                alpha_low * heatmap_colored[low_activation & ~medium_activation]
            )
            
            # 9. Sharpening final para nitidez clínica
            superimposed = superimposed.astype(np.uint8)
            kernel_final = np.array([[0,-1,0],
                                   [-1,5,-1],
                                   [0,-1,0]]) * 0.3
            superimposed = cv2.filter2D(superimposed, -1, kernel_final)
            superimposed = np.clip(superimposed, 0, 255).astype(np.uint8)
            
            # 10. Redimensionar al tamaño final
            if clinical_resolution != self.target_size:
                superimposed = cv2.resize(superimposed, self.target_size, interpolation=cv2.INTER_AREA)
            
            # Convertir a base64
            pil_img = Image.fromarray(np.uint8(superimposed))
            buffer = BytesIO()
            pil_img.save(buffer, format="PNG", quality=85)
            img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            
            return img_base64
            
        except Exception as e:
            logger.error(f"Error generando GradCAM: {e}")
            return None

class MLCache:
    """Sistema de cache inteligente para ML"""
    
    @staticmethod
    def get_prediction_cache_key(image_hash: str, model_version: str) -> str:
        """Generar clave de cache para predicción"""
        return f"ml_pred_{model_version}_{image_hash}"
    
    @staticmethod
    def cache_prediction(image_hash: str, model_version: str, result: Dict, timeout: int = 86400):
        """Cachear resultado de predicción (24 horas por defecto)"""
        cache_key = MLCache.get_prediction_cache_key(image_hash, model_version)
        cache.set(cache_key, result, timeout=timeout)
    
    @staticmethod
    def get_cached_prediction(image_hash: str, model_version: str) -> Optional[Dict]:
        """Obtener predicción desde cache"""
        cache_key = MLCache.get_prediction_cache_key(image_hash, model_version)
        return cache.get(cache_key)
    
    @staticmethod
    def invalidate_model_cache(model_version: str):
        """Invalidar cache de un modelo específico"""
        # Implementar invalidación por patrón si Redis está disponible
        logger.info(f"Cache del modelo {model_version} invalidado")

class ModelMonitor:
    """Monitor de performance y drift del modelo"""
    
    def __init__(self):
        self.metrics_cache_key = "ml_model_metrics"
        self.predictions_key = "ml_recent_predictions"
    
    def log_prediction(self, result: Dict):
        """Registrar predicción para monitoreo"""
        try:
            # Obtener métricas actuales
            metrics = cache.get(self.metrics_cache_key, {
                'total_predictions': 0,
                'confidence_sum': 0,
                'class_distribution': {str(i): 0 for i in range(5)},
                'low_confidence_count': 0,
                'last_updated': datetime.now().isoformat()
            })
            
            # Actualizar métricas
            metrics['total_predictions'] += 1
            metrics['confidence_sum'] += result['confidence']
            metrics['class_distribution'][str(result['prediction'])] += 1
            
            if not result['is_reliable']:
                metrics['low_confidence_count'] += 1
            
            metrics['last_updated'] = datetime.now().isoformat()
            metrics['avg_confidence'] = metrics['confidence_sum'] / metrics['total_predictions']
            
            # Guardar métricas actualizadas
            cache.set(self.metrics_cache_key, metrics, timeout=86400 * 7)  # 7 días
            
            # Guardar predicciones recientes para análisis de drift
            recent_preds = cache.get(self.predictions_key, [])
            recent_preds.append({
                'prediction': result['prediction'],
                'confidence': result['confidence'],
                'timestamp': datetime.now().isoformat()
            })
            
            # Mantener solo las últimas 1000 predicciones
            if len(recent_preds) > 1000:
                recent_preds = recent_preds[-1000:]
            
            cache.set(self.predictions_key, recent_preds, timeout=86400 * 7)
            
        except Exception as e:
            logger.error(f"Error registrando predicción para monitoreo: {e}")
    
    def get_model_metrics(self) -> Dict:
        """Obtener métricas del modelo"""
        return cache.get(self.metrics_cache_key, {})
    
    def detect_drift(self) -> Dict:
        """Detectar drift en las predicciones"""
        recent_preds = cache.get(self.predictions_key, [])
        
        if len(recent_preds) < 100:
            return {'drift_detected': False, 'message': 'Insuficientes datos'}
        
        # Análisis simple de drift basado en distribución de clases
        recent_100 = recent_preds[-100:]
        class_dist = {}
        avg_confidence = 0
        
        for pred in recent_100:
            class_key = str(pred['prediction'])
            class_dist[class_key] = class_dist.get(class_key, 0) + 1
            avg_confidence += pred['confidence']
        
        avg_confidence /= len(recent_100)
        
        # Detectar anomalías simples
        drift_indicators = []
        
        if avg_confidence < 0.6:
            drift_indicators.append("Confianza promedio baja")
        
        # Verificar si hay clases dominantes inusuales
        max_class_pct = max(class_dist.values()) / len(recent_100)
        if max_class_pct > 0.7:
            drift_indicators.append("Distribución de clases sesgada")
        
        return {
            'drift_detected': len(drift_indicators) > 0,
            'indicators': drift_indicators,
            'avg_confidence': round(avg_confidence, 3),
            'class_distribution': class_dist,
            'sample_size': len(recent_100)
        }

# Instancias globales
batch_processor = BatchMLProcessor()
model_monitor = ModelMonitor()