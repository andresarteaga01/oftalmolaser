import os
import magic
from django.core.exceptions import ValidationError
from django.conf import settings
from PIL import Image
import hashlib

class ImageValidator:
    """Validador de seguridad para imágenes médicas"""
    
    ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
    ALLOWED_MIME_TYPES = [
        'image/jpeg', 
        'image/png', 
        'image/bmp', 
        'image/tiff'
    ]
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MIN_DIMENSIONS = (512, 512)
    MAX_DIMENSIONS = (4096, 4096)
    
    @staticmethod
    def validate_image_file(file):
        """Validación completa de archivos de imagen"""
        
        # 1. Validar tamaño
        if file.size > ImageValidator.MAX_FILE_SIZE:
            raise ValidationError(f"El archivo es demasiado grande. Máximo {ImageValidator.MAX_FILE_SIZE // (1024*1024)}MB")
        
        # 2. Validar extensión
        file_extension = os.path.splitext(file.name)[1].lower()
        if file_extension not in ImageValidator.ALLOWED_EXTENSIONS:
            raise ValidationError(f"Extensión no permitida. Use: {', '.join(ImageValidator.ALLOWED_EXTENSIONS)}")
        
        # 3. Validar MIME type usando python-magic
        file.seek(0)
        mime_type = magic.from_buffer(file.read(1024), mime=True)
        file.seek(0)
        
        if mime_type not in ImageValidator.ALLOWED_MIME_TYPES:
            raise ValidationError(f"Tipo de archivo no válido: {mime_type}")
        
        # 4. Validar que es una imagen real usando PIL
        try:
            with Image.open(file) as img:
                img.verify()
                
                # Validar dimensiones
                if img.size[0] < ImageValidator.MIN_DIMENSIONS[0] or img.size[1] < ImageValidator.MIN_DIMENSIONS[1]:
                    raise ValidationError(f"Imagen muy pequeña. Mínimo: {ImageValidator.MIN_DIMENSIONS}")
                
                if img.size[0] > ImageValidator.MAX_DIMENSIONS[0] or img.size[1] > ImageValidator.MAX_DIMENSIONS[1]:
                    raise ValidationError(f"Imagen muy grande. Máximo: {ImageValidator.MAX_DIMENSIONS}")
                    
        except Exception as e:
            raise ValidationError("Archivo de imagen corrupto o inválido")
        
        # 5. Validar contra posibles malware básicos
        file.seek(0)
        content = file.read()
        file.seek(0)
        
        # Buscar patrones sospechosos
        suspicious_patterns = [
            b'<script',
            b'javascript:',
            b'<?php',
            b'<%',
            b'#!/bin/',
        ]
        
        content_lower = content.lower()
        for pattern in suspicious_patterns:
            if pattern in content_lower:
                raise ValidationError("Archivo contiene contenido sospechoso")
        
        return True
    
    @staticmethod
    def get_file_hash(file):
        """Generar hash SHA-256 del archivo para detección de duplicados"""
        file.seek(0)
        content = file.read()
        file.seek(0)
        return hashlib.sha256(content).hexdigest()

class ContentValidator:
    """Validador para inputs de texto y formularios"""
    
    DANGEROUS_PATTERNS = [
        r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>',
        r'javascript:',
        r'vbscript:',
        r'onload\s*=',
        r'onerror\s*=',
        r'onclick\s*=',
        r'<iframe',
        r'<object',
        r'<embed',
        r'<form',
    ]
    
    @staticmethod
    def validate_text_input(value, field_name="campo"):
        """Validar inputs de texto contra XSS y injection"""
        import re
        
        if not value:
            return value
            
        # Convertir a string y limpiar
        value = str(value).strip()
        
        # Verificar patrones peligrosos
        for pattern in ContentValidator.DANGEROUS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                raise ValidationError(f"Contenido no válido en {field_name}")
        
        # Limitar longitud
        if len(value) > 1000:
            raise ValidationError(f"{field_name} demasiado largo")
            
        return value