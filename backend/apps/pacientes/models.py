from django.db import models
from django.core.cache import cache
from .validators import ImageValidator

class Paciente(models.Model):
    historia_clinica = models.CharField(max_length=100, unique=True)
    ci = models.CharField(max_length=20, unique=True)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    fecha_nacimiento = models.DateField()

    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
    ]
    genero = models.CharField(max_length=1, choices=GENERO_CHOICES)

    DIABETES_CHOICES = [
        ('tipo1', 'Tipo 1'),
        ('tipo2', 'Tipo 2'),
        ('desconocido', 'Se desconoce'),
    ]
    tipo_diabetes = models.CharField(max_length=20, choices=DIABETES_CHOICES)

    DILATACION_CHOICES = [
        ('dilatado', 'Dilatado'),
        ('no_dilatado', 'No dilatado'),
    ]
    estado_dilatacion = models.CharField(max_length=20, choices=DILATACION_CHOICES)

    camara_retinal = models.CharField(max_length=100, blank=True, null=True)

    # Imagen principal (opcional ahora)
    imagen = models.ImageField(upload_to='pacientes/', null=True, blank=True)
    gradcam = models.ImageField(upload_to='gradcams/', null=True, blank=True)

    RESULTADOS_CHOICES = [
        (0, "Sin retinopatía"),
        (1, "Leve"),
        (2, "Moderada"),
        (3, "Severa"),
        (4, "Proliferativa"),
    ]
    resultado = models.IntegerField(choices=RESULTADOS_CHOICES, null=True, blank=True)
    confianza = models.FloatField(null=True, blank=True)

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['ci']),
            models.Index(fields=['historia_clinica']),
            models.Index(fields=['nombres', 'apellidos']),
            models.Index(fields=['fecha_creacion']),
            models.Index(fields=['resultado']),
        ]
        verbose_name = "Paciente"
        verbose_name_plural = "Pacientes"

    def __str__(self):
        return f"{self.nombres} {self.apellidos} - {self.ci}"

    def resultado_texto(self):
        return dict(self.RESULTADOS_CHOICES).get(self.resultado, "Sin resultado")
    
    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}"
    
    def get_latest_prediction(self):
        """Obtener la predicción más reciente"""
        cache_key = f"patient_latest_pred_{self.id}"
        result = cache.get(cache_key)
        
        if result is None:
            latest_image = self.imagenes.filter(resultado__isnull=False).order_by('-fecha_creacion').first()
            result = {
                'resultado': latest_image.resultado if latest_image else None,
                'fecha': latest_image.fecha_creacion if latest_image else None
            }
            cache.set(cache_key, result, timeout=3600)  # Cache por 1 hora
        
        return result

class ImagenPaciente(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='imagenes')
    
    # Imágenes optimizadas
    imagen = models.ImageField(upload_to='pacientes/', validators=[ImageValidator.validate_image_file])
    imagen_thumbnail = models.ImageField(upload_to='thumbnails/', null=True, blank=True)
    imagen_preview = models.ImageField(upload_to='previews/', null=True, blank=True)
    imagen_webp = models.ImageField(upload_to='webp/', null=True, blank=True)
    imagen_procesada = models.ImageField(upload_to='procesadas/', null=True, blank=True)    
    
    # GradCAM
    gradcam = models.ImageField(upload_to='gradcams/', null=True, blank=True)
    gradcam_base64 = models.TextField(null=True, blank=True)
    
    # Resultados ML
    resultado = models.IntegerField(choices=Paciente.RESULTADOS_CHOICES, null=True, blank=True)
    confianza = models.FloatField(null=True, blank=True)
    modelo_version = models.CharField(max_length=50, default='v2.0')
    
    # Metadata
    archivo_hash = models.CharField(max_length=64, unique=True, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_prediccion = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['paciente', '-fecha_creacion']),
            models.Index(fields=['resultado']),
            models.Index(fields=['fecha_prediccion']),
            models.Index(fields=['archivo_hash']),
        ]
        verbose_name = "Imagen de Paciente"
        verbose_name_plural = "Imágenes de Pacientes"

    def __str__(self):
        return f"{self.paciente} - {self.imagen.name}"
    
    def save(self, *args, **kwargs):
        # Generar hash del archivo si no existe
        if self.imagen and not self.archivo_hash:
            self.archivo_hash = ImageValidator.get_file_hash(self.imagen)
        
        super().save(*args, **kwargs)
        
        # Limpiar cache relacionado
        if self.paciente_id:
            cache.delete(f"patient_latest_pred_{self.paciente_id}")
    
    def get_optimized_images(self):
        """Obtener URLs de todas las versiones optimizadas"""
        return {
            'original': self.imagen.url if self.imagen else None,
            'preview': self.imagen_preview.url if self.imagen_preview else None,
            'thumbnail': self.imagen_thumbnail.url if self.imagen_thumbnail else None,
            'webp': self.imagen_webp.url if self.imagen_webp else None,
        }