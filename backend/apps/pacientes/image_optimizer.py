import os
from PIL import Image, ImageEnhance, ImageFilter
import io
from django.core.files.base import ContentFile
from django.conf import settings
import hashlib

class ImageOptimizer:
    """Optimizador de imágenes médicas para mejor performance"""
    
    # Configuraciones de optimización
    THUMBNAIL_SIZE = (256, 256)
    PREVIEW_SIZE = (512, 512)
    FULL_SIZE = (1024, 1024)
    QUALITY_HIGH = 95
    QUALITY_MEDIUM = 85
    QUALITY_LOW = 75
    
    @staticmethod
    def optimize_medical_image(image_file, optimization_level='medium'):
        """
        Optimizar imagen médica manteniendo calidad diagnóstica
        
        Args:
            image_file: Archivo de imagen Django
            optimization_level: 'low', 'medium', 'high'
            
        Returns:
            dict: {
                'original': archivo original optimizado,
                'preview': versión preview,
                'thumbnail': miniatura,
                'metadata': información de la imagen
            }
        """
        try:
            # Abrir imagen
            with Image.open(image_file) as img:
                # Convertir a RGB si es necesario
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Obtener metadata
                metadata = ImageOptimizer._extract_metadata(img)
                
                # Aplicar optimizaciones según nivel
                if optimization_level == 'high':
                    img = ImageOptimizer._enhance_image(img)
                
                # Crear diferentes versiones
                original_optimized = ImageOptimizer._create_optimized_version(
                    img, ImageOptimizer.FULL_SIZE, ImageOptimizer.QUALITY_HIGH
                )
                
                preview = ImageOptimizer._create_optimized_version(
                    img, ImageOptimizer.PREVIEW_SIZE, ImageOptimizer.QUALITY_MEDIUM
                )
                
                thumbnail = ImageOptimizer._create_optimized_version(
                    img, ImageOptimizer.THUMBNAIL_SIZE, ImageOptimizer.QUALITY_LOW
                )
                
                return {
                    'original': original_optimized,
                    'preview': preview,
                    'thumbnail': thumbnail,
                    'metadata': metadata
                }
                
        except Exception as e:
            raise Exception(f"Error optimizando imagen: {str(e)}")
    
    @staticmethod
    def _enhance_image(img):
        """Mejorar calidad de imagen médica"""
        # Mejorar contraste ligeramente
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.1)
        
        # Reducir ruido si es necesario
        img = img.filter(ImageFilter.MedianFilter(size=3))
        
        # Mejorar nitidez sutilmente
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.05)
        
        return img
    
    @staticmethod
    def _create_optimized_version(img, target_size, quality):
        """Crear versión optimizada de la imagen"""
        # Redimensionar manteniendo aspecto
        img.thumbnail(target_size, Image.Resampling.LANCZOS)
        
        # Guardar en memoria
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        return ContentFile(output.getvalue())
    
    @staticmethod
    def _extract_metadata(img):
        """Extraer metadata relevante de la imagen"""
        return {
            'width': img.width,
            'height': img.height,
            'mode': img.mode,
            'format': img.format,
            'size_bytes': len(img.tobytes()) if hasattr(img, 'tobytes') else 0
        }
    
    @staticmethod
    def generate_webp_version(image_file):
        """Generar versión WebP para web moderna"""
        try:
            with Image.open(image_file) as img:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                output = io.BytesIO()
                img.save(output, format='WebP', quality=85, optimize=True)
                output.seek(0)
                
                return ContentFile(output.getvalue())
        except Exception:
            return None

class ImageCache:
    """Sistema de cache para imágenes procesadas"""
    
    @staticmethod
    def get_cache_key(image_path, version='original'):
        """Generar clave de cache única"""
        image_hash = hashlib.md5(image_path.encode()).hexdigest()
        return f"img_{version}_{image_hash}"
    
    @staticmethod
    def cache_processed_image(image_path, processed_data, version='original'):
        """Cachear imagen procesada"""
        from django.core.cache import cache
        cache_key = ImageCache.get_cache_key(image_path, version)
        cache.set(cache_key, processed_data, timeout=3600*24)  # 24 horas
    
    @staticmethod
    def get_cached_image(image_path, version='original'):
        """Obtener imagen desde cache"""
        from django.core.cache import cache
        cache_key = ImageCache.get_cache_key(image_path, version)
        return cache.get(cache_key)