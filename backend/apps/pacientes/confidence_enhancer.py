"""
🧠 Sistema Profesional de Mejora de Confianza para Retinopatía Diabética
Implementa técnicas avanzadas de calibración y mejora de predicciones ML
"""

import numpy as np
import tensorflow as tf
from sklearn.calibration import CalibratedClassifierCV
from sklearn.isotonic import IsotonicRegression
import logging
import os
from typing import Dict, List, Tuple, Optional
import cv2
from PIL import Image
import json
from scipy import stats
from scipy.special import softmax

logger = logging.getLogger(__name__)

class TemperatureScaling:
    """
    Implementa Temperature Scaling para calibración de confianza
    Técnica profesional utilizada en sistemas médicos
    """

    def __init__(self):
        self.temperature = 1.0
        self.is_fitted = False
        self.validation_accuracy = 0.0

    def fit(self, logits: np.ndarray, true_labels: np.ndarray, lr: float = 0.01, max_iter: int = 50):
        """
        Entrena el parámetro de temperatura usando validación
        Args:
            logits: Logits del modelo (antes del softmax)
            true_labels: Etiquetas verdaderas
            lr: Learning rate
            max_iter: Máximas iteraciones
        """
        try:
            # Convertir a tensores de TensorFlow
            logits_tf = tf.constant(logits, dtype=tf.float32)
            labels_tf = tf.constant(true_labels, dtype=tf.int32)

            # Parámetro de temperatura
            temperature = tf.Variable(1.0, trainable=True, dtype=tf.float32)
            optimizer = tf.keras.optimizers.LBFGS(learning_rate=lr)

            def loss_fn():
                scaled_logits = logits_tf / temperature
                loss = tf.reduce_mean(
                    tf.keras.losses.sparse_categorical_crossentropy(
                        labels_tf, scaled_logits, from_logits=True
                    )
                )
                return loss

            # Optimización
            for i in range(max_iter):
                optimizer.minimize(loss_fn, var_list=[temperature])
                if i % 10 == 0:
                    current_loss = loss_fn()
                    logger.info(f"Temperature scaling iter {i}: loss={current_loss:.4f}, T={temperature.numpy():.3f}")

            self.temperature = float(temperature.numpy())
            self.is_fitted = True

            # Calcular accuracy de validación
            calibrated_probs = self.predict_proba(logits)
            predictions = np.argmax(calibrated_probs, axis=1)
            self.validation_accuracy = np.mean(predictions == true_labels)

            logger.info(f"✅ Temperature Scaling calibrado: T={self.temperature:.3f}, Acc={self.validation_accuracy:.3f}")
            return True

        except Exception as e:
            logger.error(f"Error en Temperature Scaling: {e}")
            self.temperature = 1.0
            self.is_fitted = False
            return False

    def predict_proba(self, logits: np.ndarray) -> np.ndarray:
        """
        Aplica temperature scaling a los logits
        Args:
            logits: Logits del modelo
        Returns:
            Probabilidades calibradas
        """
        if not self.is_fitted:
            logger.warning("Temperature scaling no está calibrado, usando T=1.0")
            return softmax(logits, axis=1)

        scaled_logits = logits / self.temperature
        return softmax(scaled_logits, axis=1)

    def get_confidence(self, logits: np.ndarray) -> float:
        """
        Obtiene confianza calibrada
        Args:
            logits: Logits del modelo
        Returns:
            Confianza calibrada [0,1]
        """
        probs = self.predict_proba(logits)
        return float(np.max(probs))

class TestTimeAugmentation:
    """
    Test-Time Augmentation para mejorar predicciones
    Aplica múltiples transformaciones y promedia resultados
    """

    def __init__(self, n_augmentations: int = 8):
        self.n_augmentations = n_augmentations
        self.augmentations = [
            self._no_augmentation,
            self._horizontal_flip,
            self._vertical_flip,
            self._rotate_90,
            self._rotate_180,
            self._rotate_270,
            self._brightness_augment,
            self._contrast_augment
        ]

    def predict_with_tta(self, model, image: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Realiza predicción con TTA
        Args:
            model: Modelo de TensorFlow
            image: Imagen de entrada
        Returns:
            (probabilidades_promedio, confianza_mejorada)
        """
        predictions = []

        try:
            for i, aug_func in enumerate(self.augmentations[:self.n_augmentations]):
                # Aplicar augmentation
                aug_image = aug_func(image)

                # Normalizar si es necesario
                if aug_image.max() > 1.0:
                    aug_image = aug_image / 255.0

                # Expandir dimensiones para batch
                aug_batch = np.expand_dims(aug_image, axis=0)

                # Predicción
                pred = model.predict(aug_batch, verbose=0)[0]
                predictions.append(pred)

            # Promedio de todas las predicciones
            mean_prediction = np.mean(predictions, axis=0)

            # Calcular confianza mejorada usando varianza
            prediction_variance = np.var(predictions, axis=0)
            confidence_boost = 1.0 - np.mean(prediction_variance)
            base_confidence = np.max(mean_prediction)
            enhanced_confidence = min(0.99, base_confidence * (1.0 + confidence_boost * 0.1))

            logger.info(f"TTA completado: {len(predictions)} augmentations, confianza: {base_confidence:.3f} → {enhanced_confidence:.3f}")

            return mean_prediction, enhanced_confidence

        except Exception as e:
            logger.error(f"Error en TTA: {e}")
            # Fallback a predicción normal
            pred = model.predict(np.expand_dims(image, axis=0), verbose=0)[0]
            return pred, float(np.max(pred))

    def _no_augmentation(self, image: np.ndarray) -> np.ndarray:
        return image.copy()

    def _horizontal_flip(self, image: np.ndarray) -> np.ndarray:
        return np.fliplr(image)

    def _vertical_flip(self, image: np.ndarray) -> np.ndarray:
        return np.flipud(image)

    def _rotate_90(self, image: np.ndarray) -> np.ndarray:
        return np.rot90(image, k=1)

    def _rotate_180(self, image: np.ndarray) -> np.ndarray:
        return np.rot90(image, k=2)

    def _rotate_270(self, image: np.ndarray) -> np.ndarray:
        return np.rot90(image, k=3)

    def _brightness_augment(self, image: np.ndarray) -> np.ndarray:
        # Aumentar brillo ligeramente
        augmented = image * 1.1
        return np.clip(augmented, 0, 255 if image.max() > 1 else 1)

    def _contrast_augment(self, image: np.ndarray) -> np.ndarray:
        # Aumentar contraste ligeramente
        mean_val = np.mean(image)
        augmented = (image - mean_val) * 1.1 + mean_val
        return np.clip(augmented, 0, 255 if image.max() > 1 else 1)

class UncertaintyQuantification:
    """
    Cuantificación de incertidumbre usando múltiples métricas
    """

    @staticmethod
    def calculate_entropy(probabilities: np.ndarray) -> float:
        """Calcula entropía de Shannon"""
        # Evitar log(0)
        probs = np.clip(probabilities, 1e-10, 1.0)
        entropy = -np.sum(probs * np.log(probs))
        # Normalizar por máxima entropía posible
        max_entropy = np.log(len(probs))
        return entropy / max_entropy if max_entropy > 0 else 0.0

    @staticmethod
    def calculate_margin(probabilities: np.ndarray) -> float:
        """Calcula margen entre las dos predicciones más altas"""
        sorted_probs = np.sort(probabilities)[::-1]
        if len(sorted_probs) < 2:
            return 1.0
        return sorted_probs[0] - sorted_probs[1]

    @staticmethod
    def calculate_gini_coefficient(probabilities: np.ndarray) -> float:
        """Calcula coeficiente de Gini para medir dispersión"""
        n = len(probabilities)
        if n <= 1:
            return 0.0

        # Ordenar probabilidades
        sorted_probs = np.sort(probabilities)

        # Calcular índice de Gini
        index = np.arange(1, n + 1)
        gini = (2 * np.sum(index * sorted_probs)) / (n * np.sum(sorted_probs)) - (n + 1) / n
        return gini

class EnhancedConfidenceSystem:
    """
    Sistema integrado de mejora de confianza profesional
    """

    def __init__(self):
        self.temperature_scaling = TemperatureScaling()
        self.tta = TestTimeAugmentation()
        self.uncertainty = UncertaintyQuantification()
        self.is_calibrated = False

    def calibrate_system(self, validation_logits: np.ndarray, validation_labels: np.ndarray):
        """
        Calibra todo el sistema usando datos de validación
        """
        try:
            success = self.temperature_scaling.fit(validation_logits, validation_labels)
            self.is_calibrated = success

            if success:
                logger.info("🎯 Sistema de confianza calibrado exitosamente")
            else:
                logger.warning("⚠️ Calibración falló, usando configuración por defecto")

            return success

        except Exception as e:
            logger.error(f"Error calibrando sistema: {e}")
            self.is_calibrated = False
            return False

    def predict_with_enhanced_confidence(self, model, image: np.ndarray, use_tta: bool = True) -> Dict:
        """
        Predicción con confianza mejorada usando todas las técnicas
        """
        try:
            # Predicción base
            if use_tta:
                base_probs, tta_confidence = self.tta.predict_with_tta(model, image)
            else:
                pred = model.predict(np.expand_dims(image, axis=0), verbose=0)[0]
                base_probs = pred
                tta_confidence = float(np.max(pred))

            # Aplicar temperature scaling si está calibrado
            if self.is_calibrated:
                # Para aplicar temperature scaling necesitamos los logits
                # Como no tenemos acceso directo, usamos una aproximación
                logits_approx = np.log(np.clip(base_probs, 1e-10, 1.0))
                calibrated_probs = self.temperature_scaling.predict_proba(logits_approx.reshape(1, -1))[0]
                calibrated_confidence = float(np.max(calibrated_probs))
            else:
                calibrated_probs = base_probs
                calibrated_confidence = tta_confidence

            # Calcular métricas de incertidumbre
            entropy = self.uncertainty.calculate_entropy(calibrated_probs)
            margin = self.uncertainty.calculate_margin(calibrated_probs)
            gini = self.uncertainty.calculate_gini_coefficient(calibrated_probs)

            # Confianza final combinada
            uncertainty_penalty = (entropy * 0.3) + ((1 - margin) * 0.2)
            final_confidence = calibrated_confidence * (1.0 - uncertainty_penalty)
            final_confidence = max(0.1, min(0.99, final_confidence))

            # Determinar nivel de confianza
            if final_confidence >= 0.85:
                confidence_level = "Muy Alta"
                interpretation = "Diagnóstico altamente confiable"
            elif final_confidence >= 0.75:
                confidence_level = "Alta"
                interpretation = "Diagnóstico confiable"
            elif final_confidence >= 0.65:
                confidence_level = "Moderada"
                interpretation = "Revisar diagnóstico recomendado"
            else:
                confidence_level = "Baja"
                interpretation = "Revisión manual obligatoria"

            prediction_class = int(np.argmax(calibrated_probs))

            result = {
                'prediction': prediction_class,
                'probabilities': calibrated_probs.tolist(),
                'confidence': final_confidence,
                'confidence_level': confidence_level,
                'interpretation': interpretation,
                'uncertainty_metrics': {
                    'entropy': float(entropy),
                    'margin': float(margin),
                    'gini_coefficient': float(gini)
                },
                'technical_details': {
                    'base_confidence': tta_confidence if use_tta else float(np.max(base_probs)),
                    'calibrated_confidence': calibrated_confidence,
                    'temperature_applied': self.is_calibrated,
                    'tta_used': use_tta
                }
            }

            logger.info(f"Predicción mejorada: Clase={prediction_class}, Confianza={final_confidence:.3f} ({confidence_level})")

            return result

        except Exception as e:
            logger.error(f"Error en predicción mejorada: {e}")
            # Fallback básico
            pred = model.predict(np.expand_dims(image, axis=0), verbose=0)[0]
            return {
                'prediction': int(np.argmax(pred)),
                'probabilities': pred.tolist(),
                'confidence': float(np.max(pred)),
                'confidence_level': 'Básica',
                'interpretation': 'Sistema básico de confianza',
                'error': str(e)
            }

# Instancia global del sistema mejorado
enhanced_confidence_system = EnhancedConfidenceSystem()