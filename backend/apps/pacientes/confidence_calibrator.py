import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.calibration import CalibratedClassifierCV
import pickle
import os
import logging
from datetime import datetime
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

class ConfidenceCalibrator:
    """Sistema de calibración de confianza para mejorar predicciones"""

    def __init__(self):
        self.calibrator = None
        self.is_fitted = False
        self.calibration_data = []
        self.model_dir = os.path.join(settings.BASE_DIR, 'apps', 'pacientes', 'modelos')
        self.calibrator_path = os.path.join(self.model_dir, 'confidence_calibrator.pkl')
        self.load_calibrator()

    def calibrate_predictions(self, predictions, true_labels=None):
        """Calibrar predicciones para obtener confianza más precisa"""

        if not self.is_fitted and true_labels is not None:
            self._fit_calibrator(predictions, true_labels)

        if self.calibrator is not None:
            # Aplicar calibración
            max_probs = np.max(predictions, axis=1) if len(predictions.shape) > 1 else [predictions]
            calibrated_probs = self.calibrator.transform(max_probs)
            return calibrated_probs

        return predictions

    def _fit_calibrator(self, predictions, true_labels):
        """Entrenar calibrador con datos reales"""
        try:
            # Usar Isotonic Regression para calibración
            self.calibrator = IsotonicRegression(out_of_bounds='clip')

            # Entrenar con máximas probabilidades
            max_probs = np.max(predictions, axis=1)
            correct_predictions = (np.argmax(predictions, axis=1) == true_labels).astype(int)

            self.calibrator.fit(max_probs, correct_predictions)
            self.is_fitted = True

            # Guardar calibrador automáticamente
            self.save_calibrator(self.calibrator_path)

            logger.info("Calibrador de confianza entrenado exitosamente")

        except Exception as e:
            logger.error(f"Error entrenando calibrador: {e}")

    def get_calibrated_confidence(self, prediction_array):
        """Obtener confianza calibrada para una predicción"""
        max_prob = np.max(prediction_array) if hasattr(prediction_array, '__len__') else prediction_array

        if self.calibrator is not None:
            try:
                calibrated_conf = self.calibrator.transform([max_prob])[0]
                return float(np.clip(calibrated_conf, 0.0, 1.0))
            except Exception as e:
                logger.warning(f"Error aplicando calibración: {e}")
                return float(max_prob)

        return float(max_prob)

    def add_training_sample(self, prediction, true_label):
        """Añadir muestra para entrenamiento incremental"""
        self.calibration_data.append({
            'prediction': prediction,
            'true_label': true_label,
            'timestamp': datetime.now().isoformat()
        })

        # Reentrenar cada 100 muestras
        if len(self.calibration_data) % 100 == 0:
            self._retrain_calibrator()

    def _retrain_calibrator(self):
        """Reentrenar calibrador con nuevas muestras"""
        if len(self.calibration_data) < 50:
            return

        try:
            predictions = np.array([sample['prediction'] for sample in self.calibration_data])
            true_labels = np.array([sample['true_label'] for sample in self.calibration_data])

            # Asegurar que predictions sea 2D
            if len(predictions.shape) == 1:
                predictions = predictions.reshape(-1, 1)

            self._fit_calibrator(predictions, true_labels)
            logger.info(f"Calibrador reentrenado con {len(self.calibration_data)} muestras")

        except Exception as e:
            logger.error(f"Error reentrenando calibrador: {e}")

    def save_calibrator(self, path):
        """Guardar calibrador entrenado"""
        if self.is_fitted and self.calibrator is not None:
            try:
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'wb') as f:
                    pickle.dump({
                        'calibrator': self.calibrator,
                        'is_fitted': self.is_fitted,
                        'training_samples': len(self.calibration_data),
                        'created_at': datetime.now().isoformat()
                    }, f)
                logger.info(f"Calibrador guardado en {path}")
            except Exception as e:
                logger.error(f"Error guardando calibrador: {e}")

    def load_calibrator(self):
        """Cargar calibrador pre-entrenado"""
        if os.path.exists(self.calibrator_path):
            try:
                with open(self.calibrator_path, 'rb') as f:
                    data = pickle.load(f)
                    self.calibrator = data['calibrator']
                    self.is_fitted = data['is_fitted']
                    training_samples = data.get('training_samples', 0)
                    created_at = data.get('created_at', 'Unknown')
                logger.info(f"Calibrador cargado: {training_samples} muestras, creado: {created_at}")
            except Exception as e:
                logger.warning(f"No se pudo cargar calibrador: {e}")
                self._create_default_calibrator()
        else:
            self._create_default_calibrator()

    def _create_default_calibrator(self):
        """Crear calibrador por defecto con datos simulados"""
        try:
            # Generar datos simulados realistas para calibración inicial
            np.random.seed(42)
            n_samples = 500

            # Simular predicciones con sesgo típico (overconfident)
            raw_probs = np.random.beta(2, 2, n_samples)  # Distribución más realista

            # Simular etiquetas verdaderas con correlación realista
            true_accuracy = 0.85  # Precisión real típica
            true_labels = (np.random.rand(n_samples) < (raw_probs * true_accuracy + 0.1)).astype(int)

            # Entrenar calibrador
            self.calibrator = IsotonicRegression(out_of_bounds='clip')
            self.calibrator.fit(raw_probs, true_labels)
            self.is_fitted = True

            # Guardar calibrador por defecto
            self.save_calibrator(self.calibrator_path)

            logger.info("Calibrador por defecto creado con datos simulados")

        except Exception as e:
            logger.error(f"Error creando calibrador por defecto: {e}")

class EnhancedConfidenceAnalyzer:
    """Analizador avanzado de confianza para múltiples modelos"""

    def __init__(self):
        self.calibrator = ConfidenceCalibrator()
        self.confidence_history = []

    def analyze_prediction_confidence(self, prediction_result):
        """Análisis completo de confianza de predicción"""
        try:
            raw_confidence = prediction_result.get('confidence', 0.0)
            probabilities = prediction_result.get('probabilities', [])

            if not probabilities:
                probabilities = [0.0] * 5
                probabilities[prediction_result.get('prediction', 0)] = raw_confidence

            # Calibrar confianza
            calibrated_confidence = self.calibrator.get_calibrated_confidence(probabilities)

            # Análisis de entropía
            entropy = self._calculate_entropy(probabilities)

            # Análisis de margin
            sorted_probs = sorted(probabilities, reverse=True)
            margin = sorted_probs[0] - sorted_probs[1] if len(sorted_probs) > 1 else sorted_probs[0]

            # Análisis de incertidumbre
            uncertainty_metrics = self._analyze_uncertainty(probabilities)

            # Determinar nivel de confianza
            confidence_level = self._determine_confidence_level(
                calibrated_confidence, entropy, margin, uncertainty_metrics
            )

            # Generar recomendaciones
            recommendations = self._generate_recommendations(confidence_level, uncertainty_metrics)

            analysis = {
                'raw_confidence': float(raw_confidence),
                'calibrated_confidence': float(calibrated_confidence),
                'final_confidence': max(calibrated_confidence, raw_confidence * 0.8),  # Conservador
                'entropy': float(entropy),
                'margin': float(margin),
                'uncertainty_metrics': uncertainty_metrics,
                'confidence_level': confidence_level,
                'recommendations': recommendations,
                'analysis_timestamp': datetime.now().isoformat()
            }

            # Registrar para histórico
            self.confidence_history.append(analysis)
            if len(self.confidence_history) > 1000:
                self.confidence_history = self.confidence_history[-1000:]

            return analysis

        except Exception as e:
            logger.error(f"Error analizando confianza: {e}")
            return {
                'raw_confidence': prediction_result.get('confidence', 0.0),
                'calibrated_confidence': prediction_result.get('confidence', 0.0),
                'final_confidence': prediction_result.get('confidence', 0.0),
                'confidence_level': 'Baja',
                'recommendations': ['Error en análisis - Revisar manualmente'],
                'error': str(e)
            }

    def _calculate_entropy(self, probabilities):
        """Calcular entropía de la distribución de probabilidades"""
        probs = np.array(probabilities)
        probs = probs + 1e-8  # Evitar log(0)
        entropy = -np.sum(probs * np.log(probs))
        return entropy

    def _analyze_uncertainty(self, probabilities):
        """Análizar diferentes tipos de incertidumbre"""
        probs = np.array(probabilities)

        # Incertidumbre aleatoria (entropía normalizada)
        max_entropy = np.log(len(probs))
        aleatoric_uncertainty = -np.sum(probs * np.log(probs + 1e-8)) / max_entropy

        # Incertidumbre epistémica (varianza)
        epistemic_uncertainty = np.var(probs)

        # Incertidumbre total
        total_uncertainty = aleatoric_uncertainty + epistemic_uncertainty

        return {
            'aleatoric': float(aleatoric_uncertainty),
            'epistemic': float(epistemic_uncertainty),
            'total': float(total_uncertainty)
        }

    def _determine_confidence_level(self, calibrated_conf, entropy, margin, uncertainty):
        """Determinar nivel de confianza basado en múltiples métricas"""
        score = 0

        # Puntaje basado en confianza calibrada
        if calibrated_conf >= 0.9:
            score += 40
        elif calibrated_conf >= 0.8:
            score += 30
        elif calibrated_conf >= 0.7:
            score += 20
        elif calibrated_conf >= 0.6:
            score += 10

        # Puntaje basado en entropía (menor es mejor)
        if entropy <= 0.3:
            score += 25
        elif entropy <= 0.6:
            score += 15
        elif entropy <= 1.0:
            score += 10

        # Puntaje basado en margin (mayor es mejor)
        if margin >= 0.4:
            score += 25
        elif margin >= 0.3:
            score += 15
        elif margin >= 0.2:
            score += 10

        # Puntaje basado en incertidumbre total (menor es mejor)
        if uncertainty['total'] <= 0.2:
            score += 10
        elif uncertainty['total'] <= 0.4:
            score += 5

        # Determinar nivel
        if score >= 80:
            return 'Muy Alta'
        elif score >= 60:
            return 'Alta'
        elif score >= 40:
            return 'Moderada'
        elif score >= 20:
            return 'Baja'
        else:
            return 'Muy Baja'

    def _generate_recommendations(self, confidence_level, uncertainty_metrics):
        """Generar recomendaciones basadas en el análisis"""
        recommendations = []

        if confidence_level in ['Muy Alta', 'Alta']:
            recommendations.append("Diagnóstico confiable - Proceder con el tratamiento recomendado")
        elif confidence_level == 'Moderada':
            recommendations.append("Confianza moderada - Considerar segunda opinión")
            recommendations.append("Revisar imágenes adicionales si están disponibles")
        elif confidence_level == 'Baja':
            recommendations.append("Baja confianza - Revisión manual obligatoria")
            recommendations.append("Considerar repetir el estudio con mejor calidad de imagen")
        else:  # Muy Baja
            recommendations.append("Confianza muy baja - NO usar para diagnóstico")
            recommendations.append("Revisión inmediata por especialista requerida")
            recommendations.append("Verificar calidad de imagen y repetir si es necesario")

        # Recomendaciones específicas por incertidumbre
        if uncertainty_metrics['epistemic'] > 0.3:
            recommendations.append("Alta incertidumbre del modelo - Considerar modelo adicional")

        if uncertainty_metrics['aleatoric'] > 0.6:
            recommendations.append("Imagen ambigua - Buscar características clínicas adicionales")

        return recommendations

    def get_confidence_statistics(self):
        """Obtener estadísticas de confianza históricas"""
        if not self.confidence_history:
            return {}

        recent_analyses = self.confidence_history[-100:]  # Últimas 100

        calibrated_confs = [a['calibrated_confidence'] for a in recent_analyses]
        confidence_levels = [a['confidence_level'] for a in recent_analyses]

        stats = {
            'mean_calibrated_confidence': np.mean(calibrated_confs),
            'median_calibrated_confidence': np.median(calibrated_confs),
            'std_calibrated_confidence': np.std(calibrated_confs),
            'confidence_level_distribution': {
                level: confidence_levels.count(level) for level in set(confidence_levels)
            },
            'total_analyses': len(recent_analyses),
            'high_confidence_rate': sum(1 for level in confidence_levels if level in ['Alta', 'Muy Alta']) / len(confidence_levels) * 100
        }

        return stats

# Instancia global
confidence_calibrator = ConfidenceCalibrator()
confidence_analyzer = EnhancedConfidenceAnalyzer()