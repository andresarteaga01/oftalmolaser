import numpy as np
import tempfile
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from io import BytesIO
from .ml_enhanced import ModelManager, BatchMLProcessor, MLCache, ModelMonitor
from .models import Paciente, ImagenPaciente
from datetime import date

class ModelManagerTest(TestCase):
    
    @patch('apps.pacientes.ml_enhanced.tf')
    def test_model_loading(self, mock_tf):
        """Test carga de modelos"""
        # Mock del modelo TensorFlow
        mock_model = MagicMock()
        mock_tf.keras.models.load_model.return_value = mock_model
        
        with patch('os.path.exists', return_value=True):
            manager = ModelManager()
            
            self.assertIn('v2.0', manager.models)
            self.assertEqual(manager.current_version, 'v2.0')
    
    def test_confidence_threshold_setting(self):
        """Test configuración de umbral de confianza"""
        manager = ModelManager()
        
        # Valor válido
        manager.set_confidence_threshold(0.8)
        self.assertEqual(manager.confidence_threshold, 0.8)
        
        # Valor inválido no debería cambiar
        old_threshold = manager.confidence_threshold
        manager.set_confidence_threshold(1.5)
        self.assertEqual(manager.confidence_threshold, old_threshold)
        
        manager.set_confidence_threshold(-0.1)
        self.assertEqual(manager.confidence_threshold, old_threshold)
    
    def test_get_model_fallback(self):
        """Test fallback al modelo por defecto"""
        manager = ModelManager()
        manager.models = {'v2.0': 'default_model'}
        
        # Versión existente
        model = manager.get_model('v2.0')
        self.assertEqual(model, 'default_model')
        
        # Versión inexistente debería devolver el por defecto
        model = manager.get_model('v999')
        self.assertEqual(model, 'default_model')

class BatchMLProcessorTest(TestCase):
    
    def setUp(self):
        """Configurar datos de prueba"""
        self.processor = BatchMLProcessor()
        
        # Mock del modelo
        self.mock_model = MagicMock()
        self.processor.model_manager.models = {'v2.0': self.mock_model}
    
    @patch('apps.pacientes.ml_enhanced.Image')
    def test_load_and_preprocess_image(self, mock_image_class):
        """Test carga y preprocesamiento de imagen"""
        # Mock de PIL Image
        mock_image = MagicMock()
        mock_image.resize.return_value = mock_image
        mock_image_class.open.return_value = mock_image
        mock_image_class.open.return_value.convert.return_value = mock_image
        
        # Mock numpy array
        with patch('numpy.array', return_value=np.zeros((512, 512, 3))):
            result = self.processor._load_and_preprocess_image('fake_path.jpg')
            
            self.assertIsNotNone(result)
            self.assertEqual(result.shape, (512, 512, 3))
    
    def test_batch_size_limiting(self):
        """Test limitación de tamaño de batch"""
        large_batch = ['img{}.jpg'.format(i) for i in range(20)]
        
        with patch.object(self.processor, '_process_batch_chunk', return_value=[]) as mock_process:
            self.processor.process_images_batch(large_batch)
            
            # Debería llamarse múltiples veces con chunks del tamaño correcto
            call_count = mock_process.call_count
            self.assertGreater(call_count, 1)
            
            # Verificar tamaños de los chunks
            for call in mock_process.call_args_list:
                chunk_size = len(call[0][0])  # Primer argumento de la llamada
                self.assertLessEqual(chunk_size, self.processor.max_batch_size)
    
    @patch('apps.pacientes.ml_enhanced.np')
    def test_prediction_confidence_threshold(self, mock_np):
        """Test aplicación de umbral de confianza"""
        # Configurar predicciones mock
        mock_predictions = np.array([[0.1, 0.2, 0.6, 0.05, 0.05]])  # Confianza baja
        self.mock_model.predict.return_value = mock_predictions
        
        mock_np.array.return_value = np.zeros((1, 512, 512, 3))
        mock_np.argmax.return_value = 2
        mock_np.max.return_value = 0.6
        
        with patch.object(self.processor, '_load_and_preprocess_image', return_value=np.zeros((512, 512, 3))):
            results = self.processor._process_batch_chunk(['test.jpg'])
            
            self.assertEqual(len(results), 1)
            result = results[0]
            
            # Con umbral 0.7, confianza 0.6 no debería ser confiable
            self.assertFalse(result['is_reliable'])
    
    def test_gradcam_generation_skipped_low_confidence(self):
        """Test que GradCAM se omite con baja confianza"""
        mock_predictions = np.array([[0.1, 0.2, 0.5, 0.15, 0.05]])  # Confianza baja
        self.mock_model.predict.return_value = mock_predictions
        
        with patch('apps.pacientes.ml_enhanced.np') as mock_np:
            mock_np.array.return_value = np.zeros((1, 512, 512, 3))
            mock_np.argmax.return_value = 2
            mock_np.max.return_value = 0.5
            
            with patch.object(self.processor, '_load_and_preprocess_image', return_value=np.zeros((512, 512, 3))):
                with patch.object(self.processor, '_generate_gradcam') as mock_gradcam:
                    results = self.processor._process_batch_chunk(['test.jpg'])
                    
                    # GradCAM no debería haberse llamado
                    mock_gradcam.assert_not_called()
                    
                    result = results[0]
                    self.assertNotIn('gradcam', result)

class MLCacheTest(TestCase):
    
    def setUp(self):
        """Limpiar cache antes de cada test"""
        from django.core.cache import cache
        cache.clear()
    
    def test_cache_prediction(self):
        """Test cache de predicciones"""
        test_hash = 'abc123'
        test_version = 'v2.0'
        test_result = {'prediction': 1, 'confidence': 0.85}
        
        # Cachear resultado
        MLCache.cache_prediction(test_hash, test_version, test_result)
        
        # Recuperar desde cache
        cached_result = MLCache.get_cached_prediction(test_hash, test_version)
        
        self.assertEqual(cached_result, test_result)
    
    def test_cache_key_generation(self):
        """Test generación de claves de cache"""
        key = MLCache.get_prediction_cache_key('hash123', 'v2.0')
        expected = 'ml_pred_v2.0_hash123'
        
        self.assertEqual(key, expected)
    
    def test_cache_miss(self):
        """Test cache miss"""
        result = MLCache.get_cached_prediction('nonexistent', 'v1.0')
        self.assertIsNone(result)

class ModelMonitorTest(TestCase):
    
    def setUp(self):
        """Configurar monitor y limpiar cache"""
        from django.core.cache import cache
        cache.clear()
        self.monitor = ModelMonitor()
    
    def test_log_prediction_metrics_update(self):
        """Test actualización de métricas al registrar predicción"""
        prediction_result = {
            'prediction': 1,
            'confidence': 0.85,
            'is_reliable': True
        }
        
        # Registrar predicción
        self.monitor.log_prediction(prediction_result)
        
        # Verificar métricas
        metrics = self.monitor.get_model_metrics()
        
        self.assertEqual(metrics['total_predictions'], 1)
        self.assertEqual(metrics['confidence_sum'], 0.85)
        self.assertEqual(metrics['class_distribution']['1'], 1)
        self.assertEqual(metrics['low_confidence_count'], 0)
        self.assertEqual(metrics['avg_confidence'], 0.85)
    
    def test_multiple_predictions_aggregation(self):
        """Test agregación de múltiples predicciones"""
        predictions = [
            {'prediction': 0, 'confidence': 0.9, 'is_reliable': True},
            {'prediction': 1, 'confidence': 0.8, 'is_reliable': True},
            {'prediction': 0, 'confidence': 0.6, 'is_reliable': False},
        ]
        
        for pred in predictions:
            self.monitor.log_prediction(pred)
        
        metrics = self.monitor.get_model_metrics()
        
        self.assertEqual(metrics['total_predictions'], 3)
        self.assertEqual(metrics['class_distribution']['0'], 2)
        self.assertEqual(metrics['class_distribution']['1'], 1)
        self.assertEqual(metrics['low_confidence_count'], 1)
        self.assertAlmostEqual(metrics['avg_confidence'], (0.9 + 0.8 + 0.6) / 3, places=3)
    
    def test_drift_detection_insufficient_data(self):
        """Test detección de drift con datos insuficientes"""
        # Solo registrar unas pocas predicciones
        for i in range(5):
            self.monitor.log_prediction({
                'prediction': 0,
                'confidence': 0.8,
                'is_reliable': True
            })
        
        drift_result = self.monitor.detect_drift()
        
        self.assertFalse(drift_result['drift_detected'])
        self.assertIn('Insuficientes datos', drift_result['message'])
    
    def test_drift_detection_low_confidence(self):
        """Test detección de drift por baja confianza"""
        # Generar 100 predicciones con baja confianza
        for i in range(100):
            self.monitor.log_prediction({
                'prediction': i % 5,
                'confidence': 0.5,  # Confianza baja
                'is_reliable': False
            })
        
        drift_result = self.monitor.detect_drift()
        
        self.assertTrue(drift_result['drift_detected'])
        self.assertIn('Confianza promedio baja', drift_result['indicators'])
        self.assertLess(drift_result['avg_confidence'], 0.6)
    
    def test_drift_detection_skewed_distribution(self):
        """Test detección de drift por distribución sesgada"""
        # Generar 100 predicciones, 80 de la misma clase
        for i in range(100):
            prediction_class = 0 if i < 80 else 1
            self.monitor.log_prediction({
                'prediction': prediction_class,
                'confidence': 0.8,
                'is_reliable': True
            })
        
        drift_result = self.monitor.detect_drift()
        
        self.assertTrue(drift_result['drift_detected'])
        self.assertIn('Distribución de clases sesgada', drift_result['indicators'])
        
        # Verificar distribución
        class_dist = drift_result['class_distribution']
        self.assertEqual(class_dist['0'], 80)
        self.assertEqual(class_dist['1'], 20)

@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class IntegrationMLTest(TestCase):
    """Tests de integración ML con modelos Django"""
    
    def setUp(self):
        """Configurar datos de prueba"""
        self.paciente = Paciente.objects.create(
            historia_clinica='HC001',
            dni='12345678',
            nombres='Test',
            apellidos='Patient',
            fecha_nacimiento=date(1980, 1, 1),
            genero='M',
            tipo_diabetes='tipo2',
            estado_dilatacion='dilatado'
        )
    
    def _create_test_image(self):
        """Crear imagen de prueba"""
        image = Image.new('RGB', (512, 512), color='blue')
        image_file = BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        return SimpleUploadedFile(
            name='test_image.jpg',
            content=image_file.getvalue(),
            content_type='image/jpeg'
        )
    
    @patch('apps.pacientes.ml_enhanced.batch_processor')
    def test_ml_processing_workflow(self, mock_processor):
        """Test flujo completo de procesamiento ML"""
        # Configurar mock de procesamiento
        mock_result = {
            'prediction': 2,
            'confidence': 0.87,
            'is_reliable': True,
            'model_version': 'v2.0',
            'gradcam': 'base64encodedstring',
            'all_probabilities': [0.05, 0.08, 0.87, 0.0, 0.0],
            'processed_at': '2023-01-01T12:00:00'
        }
        mock_processor.process_images_batch.return_value = [mock_result]
        
        # Crear imagen
        image_file = self._create_test_image()
        imagen = ImagenPaciente.objects.create(
            paciente=self.paciente,
            imagen=image_file
        )
        
        # Simular procesamiento ML (normalmente sería una tarea de Celery)
        from .tasks import _update_image_with_result
        _update_image_with_result(imagen, mock_result)
        
        # Verificar resultados
        imagen.refresh_from_db()
        
        self.assertEqual(imagen.resultado, 2)
        self.assertEqual(imagen.confianza, 0.87)
        self.assertEqual(imagen.modelo_version, 'v2.0')
        self.assertEqual(imagen.gradcam_base64, 'base64encodedstring')
        self.assertIsNotNone(imagen.fecha_prediccion)
        
        # Verificar metadata
        self.assertIn('all_probabilities', imagen.metadata)
        self.assertIn('is_reliable', imagen.metadata)
        self.assertTrue(imagen.metadata['is_reliable'])