"""
🎯 Sistema de Ensemble Profesional para Retinopatía Diabética
Combina múltiples modelos para predicciones más robustas y confiables
"""

import numpy as np
import tensorflow as tf
import logging
import os
from typing import Dict, List, Tuple, Optional
import json
from pathlib import Path
import pickle
from scipy.stats import mode
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import threading
import concurrent.futures

logger = logging.getLogger(__name__)

class ModelEnsemble:
    """
    Sistema de ensemble que combina múltiples modelos
    para obtener predicciones más robustas y confiables
    """

    def __init__(self, model_dir: str):
        self.model_dir = Path(model_dir)
        self.models = {}
        self.model_weights = {}
        self.is_loaded = False
        self.ensemble_metadata = {}

    def load_models(self) -> bool:
        """
        Carga todos los modelos disponibles en el directorio
        """
        try:
            model_files = list(self.model_dir.glob("*.keras")) + list(self.model_dir.glob("*.h5"))

            if not model_files:
                logger.warning(f"No se encontraron modelos en {self.model_dir}")
                return False

            logger.info(f"🔄 Cargando {len(model_files)} modelos para ensemble...")

            for model_file in model_files:
                try:
                    model_name = model_file.stem
                    logger.info(f"Cargando modelo: {model_name}")

                    # Cargar modelo
                    model = tf.keras.models.load_model(str(model_file), compile=False)
                    self.models[model_name] = model

                    # Peso inicial igual para todos los modelos
                    self.model_weights[model_name] = 1.0 / len(model_files)

                    logger.info(f"✅ Modelo {model_name} cargado exitosamente")

                except Exception as e:
                    logger.error(f"❌ Error cargando {model_file}: {e}")
                    continue

            if not self.models:
                logger.error("No se pudo cargar ningún modelo")
                return False

            self.is_loaded = True
            logger.info(f"🎯 Ensemble listo con {len(self.models)} modelos")

            # Cargar metadata si existe
            self._load_ensemble_metadata()

            return True

        except Exception as e:
            logger.error(f"Error cargando ensemble: {e}")
            return False

    def _load_ensemble_metadata(self):
        """Carga metadata del ensemble si existe"""
        metadata_file = self.model_dir / "ensemble_metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    self.ensemble_metadata = json.load(f)

                # Actualizar pesos si están en metadata
                if 'model_weights' in self.ensemble_metadata:
                    for model_name, weight in self.ensemble_metadata['model_weights'].items():
                        if model_name in self.model_weights:
                            self.model_weights[model_name] = weight

                logger.info("✅ Metadata del ensemble cargada")
            except Exception as e:
                logger.error(f"Error cargando metadata: {e}")

    def predict_ensemble(self, image: np.ndarray, method: str = "weighted_average") -> Dict:
        """
        Realiza predicción usando ensemble de modelos

        Args:
            image: Imagen de entrada
            method: Método de ensemble ("weighted_average", "majority_vote", "max_confidence")

        Returns:
            Diccionario con predicción y métricas de confianza
        """
        if not self.is_loaded:
            raise ValueError("Ensemble no está cargado. Ejecutar load_models() primero.")

        try:
            # Preparar imagen
            if len(image.shape) == 3:
                image_batch = np.expand_dims(image, axis=0)
            else:
                image_batch = image

            # Obtener predicciones de todos los modelos
            predictions = {}
            confidences = {}

            logger.info(f"🔄 Ejecutando ensemble con {len(self.models)} modelos...")

            for model_name, model in self.models.items():
                try:
                    pred = model.predict(image_batch, verbose=0)[0]
                    predictions[model_name] = pred
                    confidences[model_name] = float(np.max(pred))

                except Exception as e:
                    logger.error(f"Error en predicción de {model_name}: {e}")
                    continue

            if not predictions:
                raise ValueError("Ningún modelo pudo realizar predicciones")

            # Aplicar método de ensemble seleccionado
            if method == "weighted_average":
                result = self._weighted_average_ensemble(predictions, confidences)
            elif method == "majority_vote":
                result = self._majority_vote_ensemble(predictions)
            elif method == "max_confidence":
                result = self._max_confidence_ensemble(predictions, confidences)
            else:
                raise ValueError(f"Método de ensemble desconocido: {method}")

            # Agregar información del ensemble
            result['ensemble_info'] = {
                'method': method,
                'models_used': list(predictions.keys()),
                'individual_confidences': confidences,
                'model_weights': {k: v for k, v in self.model_weights.items() if k in predictions}
            }

            logger.info(f"✅ Ensemble completado: Clase={result['prediction']}, Confianza={result['confidence']:.3f}")

            return result

        except Exception as e:
            logger.error(f"Error en predicción ensemble: {e}")
            raise

    def _weighted_average_ensemble(self, predictions: Dict, confidences: Dict) -> Dict:
        """Ensemble por promedio ponderado"""

        # Calcular pesos dinámicos basados en confianza
        dynamic_weights = {}
        total_weight = 0

        for model_name in predictions.keys():
            base_weight = self.model_weights.get(model_name, 1.0)
            confidence_boost = confidences[model_name] * 0.5  # Boost por confianza
            dynamic_weight = base_weight * (1.0 + confidence_boost)

            dynamic_weights[model_name] = dynamic_weight
            total_weight += dynamic_weight

        # Normalizar pesos
        for model_name in dynamic_weights:
            dynamic_weights[model_name] /= total_weight

        # Calcular predicción ponderada
        ensemble_probs = None

        for model_name, pred in predictions.items():
            weight = dynamic_weights[model_name]

            if ensemble_probs is None:
                ensemble_probs = pred * weight
            else:
                ensemble_probs += pred * weight

        # Calcular métricas
        prediction_class = int(np.argmax(ensemble_probs))
        base_confidence = float(np.max(ensemble_probs))

        # Bonus de confianza por consenso
        agreement_scores = []
        for pred in predictions.values():
            pred_class = np.argmax(pred)
            if pred_class == prediction_class:
                agreement_scores.append(np.max(pred))

        consensus_bonus = len(agreement_scores) / len(predictions) * 0.1
        enhanced_confidence = min(0.99, base_confidence + consensus_bonus)

        return {
            'prediction': prediction_class,
            'probabilities': ensemble_probs.tolist(),
            'confidence': enhanced_confidence,
            'base_confidence': base_confidence,
            'consensus_rate': len(agreement_scores) / len(predictions),
            'method_details': {
                'type': 'weighted_average',
                'dynamic_weights': dynamic_weights
            }
        }

    def _majority_vote_ensemble(self, predictions: Dict) -> Dict:
        """Ensemble por voto mayoritario"""

        # Obtener clase predicha por cada modelo
        votes = []
        all_probs = []

        for pred in predictions.values():
            votes.append(np.argmax(pred))
            all_probs.append(pred)

        # Voto mayoritario
        vote_result = mode(votes, keepdims=True)
        majority_class = int(vote_result.mode[0])
        vote_count = int(vote_result.count[0])

        # Calcular confianza basada en consenso
        consensus_rate = vote_count / len(votes)

        # Promedio de probabilidades para la clase ganadora
        class_probs = []
        for pred in all_probs:
            class_probs.append(pred[majority_class])

        avg_prob_for_class = np.mean(class_probs)

        # Confianza mejorada por consenso
        enhanced_confidence = avg_prob_for_class * (0.5 + consensus_rate * 0.5)

        # Reconstruir vector de probabilidades
        ensemble_probs = np.mean(all_probs, axis=0)

        return {
            'prediction': majority_class,
            'probabilities': ensemble_probs.tolist(),
            'confidence': float(enhanced_confidence),
            'consensus_rate': consensus_rate,
            'vote_distribution': {str(i): votes.count(i) for i in set(votes)},
            'method_details': {
                'type': 'majority_vote',
                'total_votes': len(votes),
                'winning_votes': vote_count
            }
        }

    def _max_confidence_ensemble(self, predictions: Dict, confidences: Dict) -> Dict:
        """Ensemble seleccionando la predicción con mayor confianza"""

        # Encontrar modelo con mayor confianza
        best_model = max(confidences.keys(), key=lambda x: confidences[x])
        best_prediction = predictions[best_model]
        best_confidence = confidences[best_model]

        # Verificar si otros modelos están de acuerdo
        best_class = np.argmax(best_prediction)
        agreement_count = 0
        confidence_sum = 0

        for model_name, pred in predictions.items():
            pred_class = np.argmax(pred)
            if pred_class == best_class:
                agreement_count += 1
                confidence_sum += np.max(pred)

        # Bonus por acuerdo entre modelos
        agreement_bonus = (agreement_count / len(predictions)) * 0.05
        enhanced_confidence = min(0.99, best_confidence + agreement_bonus)

        return {
            'prediction': int(best_class),
            'probabilities': best_prediction.tolist(),
            'confidence': enhanced_confidence,
            'base_confidence': best_confidence,
            'best_model': best_model,
            'agreement_count': agreement_count,
            'method_details': {
                'type': 'max_confidence',
                'selected_model': best_model,
                'agreement_rate': agreement_count / len(predictions)
            }
        }

    def evaluate_ensemble_performance(self, test_images: np.ndarray, true_labels: np.ndarray) -> Dict:
        """
        Evalúa el rendimiento del ensemble en un conjunto de prueba
        """
        if not self.is_loaded:
            raise ValueError("Ensemble no está cargado")

        results = {
            'weighted_average': {'predictions': [], 'confidences': []},
            'majority_vote': {'predictions': [], 'confidences': []},
            'max_confidence': {'predictions': [], 'confidences': []}
        }

        logger.info(f"🔄 Evaluando ensemble en {len(test_images)} imágenes...")

        for i, image in enumerate(test_images):
            if i % 10 == 0:
                logger.info(f"Progreso evaluación: {i}/{len(test_images)}")

            for method in results.keys():
                try:
                    result = self.predict_ensemble(image, method=method)
                    results[method]['predictions'].append(result['prediction'])
                    results[method]['confidences'].append(result['confidence'])
                except Exception as e:
                    logger.error(f"Error evaluando método {method}: {e}")
                    results[method]['predictions'].append(-1)
                    results[method]['confidences'].append(0.0)

        # Calcular métricas para cada método
        performance_metrics = {}

        for method, data in results.items():
            predictions = np.array(data['predictions'])
            confidences = np.array(data['confidences'])

            # Filtrar predicciones válidas
            valid_mask = predictions >= 0
            valid_predictions = predictions[valid_mask]
            valid_true_labels = true_labels[valid_mask]
            valid_confidences = confidences[valid_mask]

            if len(valid_predictions) > 0:
                accuracy = accuracy_score(valid_true_labels, valid_predictions)
                precision, recall, f1, _ = precision_recall_fscore_support(
                    valid_true_labels, valid_predictions, average='weighted', zero_division=0
                )

                performance_metrics[method] = {
                    'accuracy': float(accuracy),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f1_score': float(f1),
                    'mean_confidence': float(np.mean(valid_confidences)),
                    'std_confidence': float(np.std(valid_confidences)),
                    'valid_samples': len(valid_predictions),
                    'total_samples': len(predictions)
                }
            else:
                performance_metrics[method] = {
                    'accuracy': 0.0,
                    'precision': 0.0,
                    'recall': 0.0,
                    'f1_score': 0.0,
                    'mean_confidence': 0.0,
                    'std_confidence': 0.0,
                    'valid_samples': 0,
                    'total_samples': len(predictions)
                }

        logger.info("✅ Evaluación del ensemble completada")
        return performance_metrics

    def update_model_weights(self, performance_metrics: Dict):
        """
        Actualiza los pesos de los modelos basado en su rendimiento
        """
        try:
            # Por ahora usamos accuracy como métrica principal
            # En el futuro se puede sofisticar más

            best_method = max(performance_metrics.keys(),
                            key=lambda x: performance_metrics[x]['accuracy'])

            logger.info(f"Mejor método de ensemble: {best_method} (acc: {performance_metrics[best_method]['accuracy']:.3f})")

            # Guardar información en metadata
            self.ensemble_metadata.update({
                'last_evaluation': performance_metrics,
                'recommended_method': best_method,
                'model_weights': self.model_weights.copy()
            })

            # Guardar metadata
            metadata_file = self.model_dir / "ensemble_metadata.json"
            with open(metadata_file, 'w') as f:
                json.dump(self.ensemble_metadata, f, indent=2)

            logger.info("✅ Pesos del ensemble actualizados")

        except Exception as e:
            logger.error(f"Error actualizando pesos: {e}")

# Clase de utilidad para gestión fácil
class EnsembleManager:
    """Gestor simplificado del sistema de ensemble"""

    def __init__(self, model_dir: str):
        self.ensemble = ModelEnsemble(model_dir)
        self.is_ready = False

    def setup(self) -> bool:
        """Configura el ensemble automáticamente"""
        try:
            success = self.ensemble.load_models()
            self.is_ready = success
            return success
        except Exception as e:
            logger.error(f"Error configurando ensemble: {e}")
            return False

    def predict(self, image: np.ndarray, method: str = "weighted_average") -> Dict:
        """Predicción simplificada"""
        if not self.is_ready:
            raise ValueError("Ensemble no está listo. Ejecutar setup() primero.")

        return self.ensemble.predict_ensemble(image, method=method)

    def get_best_method(self) -> str:
        """Retorna el mejor método basado en evaluaciones previas"""
        if 'recommended_method' in self.ensemble.ensemble_metadata:
            return self.ensemble.ensemble_metadata['recommended_method']
        return "weighted_average"  # Por defecto