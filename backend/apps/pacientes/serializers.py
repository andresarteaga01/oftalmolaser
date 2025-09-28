from rest_framework import serializers
from .models import Paciente, ImagenPaciente

class ImagenPacienteSerializer(serializers.ModelSerializer):
    """Serializer para imágenes de pacientes"""
    
    resultado_texto = serializers.SerializerMethodField()
    optimized_images = serializers.SerializerMethodField()
    
    class Meta:
        model = ImagenPaciente
        fields = [
            'id', 'imagen', 'imagen_thumbnail', 'imagen_preview', 'imagen_webp',
            'imagen_procesada', 'gradcam', 'gradcam_base64',
            'resultado', 'resultado_texto', 'modelo_version',
            'archivo_hash', 'metadata', 'fecha_creacion', 'fecha_prediccion',
            'optimized_images'
        ]
        read_only_fields = [
            'archivo_hash', 'metadata', 'fecha_creacion', 'fecha_prediccion',
            'resultado', 'modelo_version', 'gradcam_base64'
        ]
    
    def get_resultado_texto(self, obj):
        """Obtener texto descriptivo del resultado"""
        if obj.resultado is not None:
            return dict(Paciente.RESULTADOS_CHOICES).get(obj.resultado, "Sin resultado")
        return "Sin resultado"
    
    def get_optimized_images(self, obj):
        """Obtener URLs de imágenes optimizadas"""
        return obj.get_optimized_images()

class PacienteSerializer(serializers.ModelSerializer):
    resultado_texto = serializers.SerializerMethodField()
    imagen = serializers.SerializerMethodField()
    imagen_procesada = serializers.SerializerMethodField()
    gradcam = serializers.SerializerMethodField()
    actualizado = serializers.SerializerMethodField()
    imagenes = ImagenPacienteSerializer(many=True, read_only=True)

    class Meta:
        model = Paciente
        fields = '__all__'

    def get_resultado_texto(self, obj):
        if obj.resultado is None:
            return None
        return {
            0: "Sin retinopatía",
            1: "Leve",
            2: "Moderada",
            3: "Severa",
            4: "Proliferativa"
        }.get(obj.resultado, "Desconocido")

    def get_imagen(self, obj):
        ultima = obj.imagenes.order_by('-fecha_creacion').first()
        try:
            return ultima.imagen.url
        except:
            return None

    def get_imagen_procesada(self, obj):
        ultima = obj.imagenes.order_by('-fecha_creacion').first()
        try:
            return ultima.imagen_procesada.url
        except:
            return None

    def get_gradcam(self, obj):
        ultima = obj.imagenes.order_by('-fecha_creacion').first()
        try:
            return ultima.gradcam.url
        except:
            return None


    def get_actualizado(self, obj):
        ultima = obj.imagenes.order_by('-fecha_creacion').first()
        if ultima:
            return ultima.fecha_creacion.strftime("%d/%m/%Y %H:%M")
        return None