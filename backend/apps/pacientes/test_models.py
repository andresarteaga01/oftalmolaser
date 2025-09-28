import os
import tempfile
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.core.cache import cache
from PIL import Image
from io import BytesIO
from .models import Paciente, ImagenPaciente
from .validators import ImageValidator
from datetime import date

@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class PacienteModelTest(TestCase):
    
    def setUp(self):
        """Configurar datos de prueba"""
        self.paciente_data = {
            'historia_clinica': 'HC001',
            'dni': '12345678',
            'nombres': 'Juan Carlos',
            'apellidos': 'Pérez García',
            'fecha_nacimiento': date(1980, 5, 15),
            'genero': 'M',
            'tipo_diabetes': 'tipo2',
            'estado_dilatacion': 'dilatado',
            'camara_retinal': 'Canon CR-2'
        }
    
    def test_create_paciente(self):
        """Test creación de paciente"""
        paciente = Paciente.objects.create(**self.paciente_data)
        
        self.assertEqual(paciente.historia_clinica, 'HC001')
        self.assertEqual(paciente.dni, '12345678')
        self.assertEqual(paciente.nombre_completo, 'Juan Carlos Pérez García')
        self.assertIsNotNone(paciente.fecha_creacion)
    
    def test_paciente_unique_constraints(self):
        """Test constraints únicos"""
        Paciente.objects.create(**self.paciente_data)
        
        # DNI duplicado
        with self.assertRaises(Exception):
            duplicate_data = self.paciente_data.copy()
            duplicate_data['historia_clinica'] = 'HC002'
            Paciente.objects.create(**duplicate_data)
        
        # Historia clínica duplicada
        with self.assertRaises(Exception):
            duplicate_data = self.paciente_data.copy()
            duplicate_data['dni'] = '87654321'
            Paciente.objects.create(**duplicate_data)
    
    def test_resultado_texto_property(self):
        """Test método resultado_texto"""
        paciente = Paciente.objects.create(**self.paciente_data)
        
        # Sin resultado
        self.assertEqual(paciente.resultado_texto(), "Sin resultado")
        
        # Con resultado
        paciente.resultado = 0
        self.assertEqual(paciente.resultado_texto(), "Sin retinopatía")
        
        paciente.resultado = 4
        self.assertEqual(paciente.resultado_texto(), "Proliferativa")
    
    def test_get_latest_prediction_cache(self):
        """Test cache de predicción más reciente"""
        paciente = Paciente.objects.create(**self.paciente_data)
        
        # Sin predicciones
        prediction = paciente.get_latest_prediction()
        self.assertIsNone(prediction['resultado'])
        
        # Con imagen y predicción
        image_file = self._create_test_image()
        imagen = ImagenPaciente.objects.create(
            paciente=paciente,
            imagen=image_file,
            resultado=2,
            confianza=0.85
        )
        
        # Limpiar cache
        cache.clear()
        
        prediction = paciente.get_latest_prediction()
        self.assertEqual(prediction['resultado'], 2)
        self.assertEqual(prediction['confianza'], 0.85)
        
        # Verificar que está en cache
        cache_key = f"patient_latest_pred_{paciente.id}"
        cached_result = cache.get(cache_key)
        self.assertIsNotNone(cached_result)
    
    def _create_test_image(self):
        """Crear imagen de prueba"""
        image = Image.new('RGB', (512, 512), color='red')
        image_file = BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        return SimpleUploadedFile(
            name='test_image.jpg',
            content=image_file.getvalue(),
            content_type='image/jpeg'
        )

@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class ImagenPacienteModelTest(TestCase):
    
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
    
    def test_create_imagen_paciente(self):
        """Test creación de imagen de paciente"""
        image_file = self._create_test_image()
        
        imagen = ImagenPaciente.objects.create(
            paciente=self.paciente,
            imagen=image_file,
            resultado=1,
            confianza=0.92,
            modelo_version='v2.0'
        )
        
        self.assertEqual(imagen.paciente, self.paciente)
        self.assertEqual(imagen.resultado, 1)
        self.assertEqual(imagen.confianza, 0.92)
        self.assertEqual(imagen.modelo_version, 'v2.0')
        self.assertIsNotNone(imagen.archivo_hash)
    
    def test_image_hash_generation(self):
        """Test generación de hash de archivo"""
        image_file = self._create_test_image()
        
        imagen = ImagenPaciente.objects.create(
            paciente=self.paciente,
            imagen=image_file
        )
        
        self.assertIsNotNone(imagen.archivo_hash)
        self.assertEqual(len(imagen.archivo_hash), 64)  # SHA-256 hex
    
    def test_duplicate_hash_constraint(self):
        """Test constraint de hash único"""
        image_file1 = self._create_test_image()
        image_file2 = self._create_test_image()
        
        # Primera imagen
        imagen1 = ImagenPaciente.objects.create(
            paciente=self.paciente,
            imagen=image_file1
        )
        
        # Segunda imagen con mismo contenido debería fallar
        with self.assertRaises(Exception):
            ImagenPaciente.objects.create(
                paciente=self.paciente,
                imagen=image_file2
            )
    
    def test_get_optimized_images(self):
        """Test método get_optimized_images"""
        image_file = self._create_test_image()
        
        imagen = ImagenPaciente.objects.create(
            paciente=self.paciente,
            imagen=image_file
        )
        
        optimized = imagen.get_optimized_images()
        
        self.assertIn('original', optimized)
        self.assertIn('preview', optimized)
        self.assertIn('thumbnail', optimized)
        self.assertIn('webp', optimized)
        
        self.assertIsNotNone(optimized['original'])
        # Los otros serán None hasta que se generen
    
    def test_cache_invalidation_on_save(self):
        """Test invalidación de cache al guardar"""
        # Crear predicción en cache
        prediction_cache_key = f"patient_latest_pred_{self.paciente.id}"
        cache.set(prediction_cache_key, {'test': 'data'})
        
        # Verificar que está en cache
        self.assertIsNotNone(cache.get(prediction_cache_key))
        
        # Crear imagen (debería limpiar el cache)
        image_file = self._create_test_image()
        ImagenPaciente.objects.create(
            paciente=self.paciente,
            imagen=image_file
        )
        
        # Verificar que el cache se limpió
        self.assertIsNone(cache.get(prediction_cache_key))
    
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

class ImageValidatorTest(TestCase):
    
    def test_valid_image_validation(self):
        """Test validación de imagen válida"""
        image = Image.new('RGB', (512, 512), color='green')
        image_file = BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        uploaded_file = SimpleUploadedFile(
            name='valid_image.jpg',
            content=image_file.getvalue(),
            content_type='image/jpeg'
        )
        
        # No debería lanzar excepción
        result = ImageValidator.validate_image_file(uploaded_file)
        self.assertTrue(result)
    
    def test_invalid_file_extension(self):
        """Test validación falla con extensión inválida"""
        uploaded_file = SimpleUploadedFile(
            name='test.txt',
            content=b'not an image',
            content_type='text/plain'
        )
        
        with self.assertRaises(ValidationError) as context:
            ImageValidator.validate_image_file(uploaded_file)
        
        self.assertIn('Extensión no permitida', str(context.exception))
    
    def test_file_too_large(self):
        """Test validación falla con archivo muy grande"""
        # Crear archivo muy grande (mock)
        large_content = b'x' * (11 * 1024 * 1024)  # 11MB
        
        uploaded_file = SimpleUploadedFile(
            name='large_image.jpg',
            content=large_content,
            content_type='image/jpeg'
        )
        
        with self.assertRaises(ValidationError) as context:
            ImageValidator.validate_image_file(uploaded_file)
        
        self.assertIn('demasiado grande', str(context.exception))
    
    def test_image_too_small(self):
        """Test validación falla con imagen muy pequeña"""
        image = Image.new('RGB', (100, 100), color='red')  # Muy pequeña
        image_file = BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        uploaded_file = SimpleUploadedFile(
            name='small_image.jpg',
            content=image_file.getvalue(),
            content_type='image/jpeg'
        )
        
        with self.assertRaises(ValidationError) as context:
            ImageValidator.validate_image_file(uploaded_file)
        
        self.assertIn('muy pequeña', str(context.exception))
    
    def test_suspicious_content_detection(self):
        """Test detección de contenido sospechoso"""
        suspicious_content = b'<script>alert("xss")</script>' + b'\xFF\xD8\xFF'  # JPEG header falso
        
        uploaded_file = SimpleUploadedFile(
            name='suspicious.jpg',
            content=suspicious_content,
            content_type='image/jpeg'
        )
        
        with self.assertRaises(ValidationError) as context:
            ImageValidator.validate_image_file(uploaded_file)
        
        self.assertIn('contenido sospechoso', str(context.exception))
    
    def test_file_hash_generation(self):
        """Test generación de hash de archivo"""
        content = b'test content'
        uploaded_file = SimpleUploadedFile(
            name='test.txt',
            content=content,
            content_type='text/plain'
        )
        
        hash1 = ImageValidator.get_file_hash(uploaded_file)
        hash2 = ImageValidator.get_file_hash(uploaded_file)
        
        # Mismo contenido debe generar mismo hash
        self.assertEqual(hash1, hash2)
        self.assertEqual(len(hash1), 64)  # SHA-256 hex