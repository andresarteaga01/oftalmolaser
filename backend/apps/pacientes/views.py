import os
import base64
import numpy as np
import cv2
from PIL import Image as PILImage
from io import BytesIO
from django.db import models
from django.core.files.base import ContentFile
from django.http import HttpResponse, JsonResponse
from rest_framework import viewsets, generics, permissions, filters, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.shortcuts import get_object_or_404

from .models import Paciente, ImagenPaciente
from .serializers import PacienteSerializer, ImagenPacienteSerializer
from .validators import ImageValidator
from .tasks import process_image_ml_task, optimize_uploaded_image_task
from .prediction import model
from .prediction import get_gradcam_heatmap
from .utils import preprocess_retina_image_file, preprocess_retina_image_file_to_jpeg, preprocess_retina_image_enhanced, preprocess_retina_image_enhanced_to_jpeg
from apps.api.permissions import CanRegisterPatients

from rest_framework.permissions import IsAuthenticated
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Importar sistemas mejorados
try:
    from .confidence_enhancer import enhanced_confidence_system
    from .ensemble_predictor import EnsembleManager
    from .pdf_professional_report import pdf_generator
    ENHANCED_SYSTEMS_AVAILABLE = True
    logger.info("✅ Sistemas mejorados cargados exitosamente")
except ImportError as e:
    logger.warning(f"⚠️ Sistemas mejorados no disponibles: {e}")
    ENHANCED_SYSTEMS_AVAILABLE = False


def heatmap_to_base64(heatmap, original_image):
    """
    Convierte un heatmap numpy a imagen base64 superpuesta.
    Helper function para evitar duplicación de código.
    """
    # Generar imagen superpuesta simple para compatibilidad
    original = (original_image * 255).astype(np.uint8)
    heatmap_resized = cv2.resize(heatmap, (original.shape[1], original.shape[0]), interpolation=cv2.INTER_CUBIC)
    heatmap_norm = (heatmap_resized - np.min(heatmap_resized)) / (np.max(heatmap_resized) - np.min(heatmap_resized) + 1e-8)
    heatmap_color = cv2.applyColorMap((heatmap_norm * 255).astype(np.uint8), cv2.COLORMAP_JET)
    
    superimposed = cv2.addWeighted(original, 0.6, heatmap_color, 0.4, 0)
    img_pil = PILImage.fromarray(superimposed)
    buffer = BytesIO()
    img_pil.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), CanRegisterPatients()]
        return [IsAuthenticated()]


class PacienteSearchAPIView(generics.ListAPIView):
    serializer_class = PacienteSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Paciente.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['ci', 'nombres', 'apellidos']


class PacienteDiagnosticoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            paciente = Paciente.objects.get(pk=pk)

            image = cv2.imread(paciente.imagen.path)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image = cv2.resize(image, (96, 96))
            image = image.astype(np.float32) / 255.0
            input_array = np.expand_dims(image, axis=0)

            prediction = model.predict(input_array)
            predicted_class = int(np.argmax(prediction))
            # Verificar que el modelo esté disponible y inicializado
            if model is None:
                raise ValueError("Modelo no disponible para GradCAM")

            # Usar nueva función get_gradcam_heatmap desde prediction.py
            heatmap = get_gradcam_heatmap(model, image)
            gradcam_base64 = heatmap_to_base64(heatmap, image)

            return Response({
                'prediccion': predicted_class,
                'gradcam': gradcam_base64
            })

        except Paciente.DoesNotExist:
            return Response({'error': 'Paciente no encontrado'}, status=404)
        except Exception as e:
            logger.error(f"Error en PacienteDiagnosticoAPIView: {e}")
            return Response({'error': f'Error en el análisis: {str(e)}'}, status=500)


class PreprocessImageAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No se envió ninguna imagen.'}, status=400)

        try:
            image = preprocess_retina_image_file(image_file, target_size=(96, 96))
            _, buffer = cv2.imencode('.png', cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
            image_base64 = base64.b64encode(buffer).decode('utf-8')

            return Response({'image_base64': image_base64}, status=200)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class PrediccionPacienteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        paciente_id = request.data.get("paciente_id")
        imagenes = request.FILES.getlist("imagenes")

        if not paciente_id:
            return Response({"error": "Falta el ID del paciente."}, status=400)
        if not imagenes:
            return Response({"error": "No se recibieron imágenes."}, status=400)

        try:
            paciente = Paciente.objects.get(pk=paciente_id)
        except Paciente.DoesNotExist:
            return Response({"error": "Paciente no encontrado."}, status=404)

        resultados = []

        for img in imagenes:
            try:
                if not img.content_type.startswith("image/"):
                    resultados.append({
                        "nombre_imagen": img.name,
                        "error": "Archivo no es una imagen válida"
                    })
                    continue

                # Procesamiento - usar el tamaño correcto para el modelo (96x96)
                image_np = preprocess_retina_image_file(img, target_size=(96, 96))

                img.seek(0)  # 🔁 Reiniciar el archivo antes de volver a leer
                image_jpeg = preprocess_retina_image_file_to_jpeg(img)
                input_array = np.expand_dims(image_np, axis=0)

                # Predicción con detalles completos
                prediction = model.predict(input_array)
                predicted_class = int(np.argmax(prediction))

                # Variable para compatibilidad (sin usar en frontend)
                is_reliable = True  # Para prototipo, siempre True


                # Grad-CAM - verificar modelo disponible
                if model is None:
                    raise ValueError("Modelo no disponible para GradCAM") 
                    
                # Usar nueva función get_gradcam_heatmap desde prediction.py
                heatmap = get_gradcam_heatmap(model, image_np)
                gradcam_base64 = heatmap_to_base64(heatmap, image_np)
                gradcam_content = base64.b64decode(gradcam_base64)

                # Guardar en la BD
                imagen_instancia = ImagenPaciente.objects.create(
                    paciente=paciente,
                    resultado=predicted_class
                )
                imagen_instancia.imagen.save(img.name, img, save=False)
                imagen_instancia.imagen_procesada.save(f"procesada_{img.name}", image_jpeg, save=False)
                imagen_instancia.gradcam.save(f"gradcam_{img.name}", ContentFile(gradcam_content), save=True)

                # Debug: Verificar que las imágenes se guardaron correctamente
                logger.info(f"📁 Archivos guardados:")
                logger.info(f"  - Imagen original: {imagen_instancia.imagen.name if imagen_instancia.imagen else 'None'}")
                logger.info(f"  - Imagen procesada: {imagen_instancia.imagen_procesada.name if imagen_instancia.imagen_procesada else 'None'}")
                logger.info(f"  - GradCAM: {imagen_instancia.gradcam.name if imagen_instancia.gradcam else 'None'}")
                logger.info(f"🔗 URLs generadas:")
                logger.info(f"  - Original URL: {imagen_instancia.imagen.url if imagen_instancia.imagen else 'None'}")
                logger.info(f"  - Procesada URL: {imagen_instancia.imagen_procesada.url if imagen_instancia.imagen_procesada else 'None'}")
                logger.info(f"  - GradCAM URL: {imagen_instancia.gradcam.url if imagen_instancia.gradcam else 'None'}")

                # Actualizar paciente
                paciente.imagen = imagen_instancia.imagen
                paciente.gradcam = imagen_instancia.gradcam
                paciente.resultado = predicted_class
                paciente.save()

                resultados.append({
                    "nombre_imagen": img.name,
                    "prediccion": predicted_class,
                    "gradcam": gradcam_base64,
                    "imagen_display": imagen_instancia.imagen_procesada.url if imagen_instancia.imagen_procesada else None,
                    "imagen_procesada": imagen_instancia.imagen_procesada.url if imagen_instancia.imagen_procesada else None,
                    "imagen": imagen_instancia.imagen.url if imagen_instancia.imagen else None,
                    "imagen_size": f"{image_np.shape[1]}x{image_np.shape[0]}"
                })

            except Exception as e:
                resultados.append({
                    "nombre_imagen": img.name,
                    "error": str(e)
                })

        return Response({"resultados": resultados}, status=200)


# ========== NUEVAS VISTAS OPTIMIZADAS ==========

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buscar_pacientes(request):
    """Búsqueda de pacientes por DNI, nombre o apellido"""
    search = request.GET.get('search', '').strip()
    
    if not search:
        pacientes = Paciente.objects.all().order_by('-fecha_creacion')[:50]
    else:
        pacientes = Paciente.objects.filter(
            models.Q(ci__icontains=search) |
            models.Q(nombres__icontains=search) |
            models.Q(apellidos__icontains=search) |
            models.Q(historia_clinica__icontains=search)
        ).order_by('-fecha_creacion')[:50]
    
    # Incluir imágenes en la respuesta
    data = []
    for paciente in pacientes:
        paciente_data = PacienteSerializer(paciente).data
        imagenes = ImagenPaciente.objects.filter(paciente=paciente).order_by('-fecha_creacion')
        paciente_data['imagenes'] = ImagenPacienteSerializer(imagenes, many=True).data
        data.append(paciente_data)
    
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_imagen_paciente(request, paciente_id):
    """Subir imagen de paciente y procesarla con ML"""
    try:
        paciente = get_object_or_404(Paciente, id=paciente_id)
        
        if 'imagen' not in request.FILES:
            return Response(
                {'error': 'No se proporcionó ninguna imagen'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        imagen_file = request.FILES['imagen']
        
        # Validar imagen
        try:
            ImageValidator.validate_image_file(imagen_file)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear registro de imagen
        imagen = ImagenPaciente.objects.create(
            paciente=paciente,
            imagen=imagen_file
        )
        
        # Iniciar tareas de procesamiento asíncrono
        try:
            optimize_uploaded_image_task.delay(imagen.id)
            process_image_ml_task.delay(imagen.id)
        except Exception as e:
            logger.warning(f"Could not start async tasks: {e}")
        
        logger.info(f"Imagen subida para paciente {paciente_id}: {imagen.id}")
        
        return Response({
            'message': 'Imagen subida correctamente',
            'imagen_id': imagen.id,
            'status': 'processing'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error subiendo imagen: {e}")
        return Response(
            {'error': 'Error interno del servidor'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Estadísticas para el dashboard"""
    try:
        from django.db.models import Count, Avg
        from datetime import datetime, timedelta
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"Dashboard stats requested by user: {request.user.username}, role: {request.user.role}")

        # Estadísticas básicas - usando las mismas consultas que medico-stats
        total_pacientes = Paciente.objects.count()
        total_imagenes = ImagenPaciente.objects.count()
        imagenes_procesadas = ImagenPaciente.objects.filter(resultado__isnull=False).count()

        # Como prueba, usar exactamente las mismas consultas que medico-stats
        pacientes_medico_test = Paciente.objects.count()
        imagenes_medico_test = ImagenPaciente.objects.filter(resultado__isnull=False).count()

        # Log para debug detallado
        logger.info(f"Dashboard stats query results:")
        logger.info(f"  - Paciente.objects.count(): {total_pacientes}")
        logger.info(f"  - ImagenPaciente.objects.count(): {total_imagenes}")
        logger.info(f"  - ImagenPaciente with resultado not null: {imagenes_procesadas}")
        logger.info(f"  - Test with medico queries: pacientes={pacientes_medico_test}, imagenes={imagenes_medico_test}")

        # Verificar si existen los modelos
        try:
            all_pacientes = Paciente.objects.all()
            logger.info(f"  - All patients: {[p.id for p in all_pacientes[:5]]}")  # Primeros 5 IDs

            all_imagenes = ImagenPaciente.objects.all()
            logger.info(f"  - All images: {[img.id for img in all_imagenes[:5]]}")  # Primeros 5 IDs

            processed_images = ImagenPaciente.objects.filter(resultado__isnull=False)
            logger.info(f"  - Processed images: {[img.id for img in processed_images[:5]]}")
        except Exception as query_error:
            logger.error(f"Error in detailed queries: {query_error}")
        
        # Estadísticas por resultado
        resultados_dist = ImagenPaciente.objects.filter(
            resultado__isnull=False
        ).values('resultado').annotate(
            count=Count('id')
        ).order_by('resultado')
        
        
        # Actividad reciente (últimos 7 días)
        fecha_limite = datetime.now() - timedelta(days=7)
        pacientes_recientes = Paciente.objects.filter(
            fecha_creacion__gte=fecha_limite
        ).count()

        imagenes_recientes = ImagenPaciente.objects.filter(
            fecha_creacion__gte=fecha_limite
        ).count()

        # Tendencia mensual de diagnósticos (últimos 6 meses, solo datos actuales)
        tendencia_mensual = []
        meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

        for i in range(6):
            fecha_fin = datetime.now().replace(day=1) - timedelta(days=i*30)
            fecha_inicio = fecha_fin - timedelta(days=30)

            # Contar solo imágenes procesadas que existen actualmente
            casos_mes = ImagenPaciente.objects.filter(
                fecha_prediccion__gte=fecha_inicio,
                fecha_prediccion__lt=fecha_fin,
                resultado__isnull=False
            ).count()

            mes_nombre = meses[fecha_fin.month - 1]
            tendencia_mensual.insert(0, {
                'mes': mes_nombre,
                'casos': casos_mes
            })

        data = {
            'total_pacientes': total_pacientes,
            'total_imagenes': total_imagenes,
            'imagenes_procesadas': imagenes_procesadas,
            'tasa_procesamiento': (imagenes_procesadas / total_imagenes * 100) if total_imagenes > 0 else 0,
            'distribucion_resultados': {
                str(item['resultado']): item['count'] for item in resultados_dist
            },
            'actividad_reciente': {
                'pacientes_nuevos': pacientes_recientes,
                'imagenes_nuevas': imagenes_recientes
            },
            'tendencia_mensual': tendencia_mensual
        }
        
        return Response(data)
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}")
        return Response(
            {'error': 'Error interno del servidor'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """Estadísticas específicas para administradores"""
    try:
        from apps.api.models import UserAccount
        from django.db.models import Count, Q
        from datetime import datetime, timedelta
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"Admin stats requested by user: {request.user.username}, role: {request.user.role}")

        # Permitir acceso a administradores y especialistas para debug
        if request.user.role not in ['administrador', 'especialista']:
            logger.warning(f"Access denied for user {request.user.username} with role {request.user.role}")
            return Response(
                {'error': f'Tu rol actual es: {request.user.role}. Se requiere administrador.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Estadísticas de usuarios
        total_usuarios = UserAccount.objects.count()
        usuarios_activos = UserAccount.objects.filter(is_active=True).count()
        usuarios_por_rol = UserAccount.objects.values('role').annotate(count=Count('id'))

        # Estadísticas del mes pasado
        fecha_limite = datetime.now() - timedelta(days=30)
        nuevos_usuarios = UserAccount.objects.filter(
            date_created__gte=fecha_limite
        ).count()

        # Log para debug
        logger.info(f"Found {total_usuarios} total users, {usuarios_activos} active users")

        data = {
            'total_usuarios': total_usuarios,
            'usuarios_activos': usuarios_activos,
            'nuevos_usuarios_mes': nuevos_usuarios,
            'distribucion_roles': {
                item['role']: item['count'] for item in usuarios_por_rol
            },
            'debug_info': {
                'user_role': request.user.role,
                'user_name': request.user.username
            }
        }

        return Response(data)
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de admin: {e}")
        return Response(
            {'error': 'Error interno del servidor'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def medico_stats(request):
    """Estadísticas específicas para médicos"""
    try:
        from django.db.models import Count, Q
        from datetime import datetime, timedelta
        
        # Solo médicos, especialistas y administradores pueden acceder
        if request.user.role not in ['medico', 'especialista', 'administrador']:
            return Response(
                {'error': 'No tienes permisos para acceder a estas estadísticas'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Si es administrador, mostrar estadísticas globales
        # Si es médico, mostrar solo las suyas (si implementamos creado_por en el futuro)
        
        # Por ahora, estadísticas generales para médicos
        pacientes_registrados = Paciente.objects.count()
        imagenes_analizadas = ImagenPaciente.objects.filter(resultado__isnull=False).count()
        
        # Análisis ML realizados en los últimos 30 días
        fecha_limite = datetime.now() - timedelta(days=30)
        analisis_recientes = ImagenPaciente.objects.filter(
            fecha_creacion__gte=fecha_limite,
            resultado__isnull=False
        ).count()

        # Tendencia mensual de diagnósticos (últimos 6 meses, solo datos actuales)
        tendencia_mensual = []
        meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

        for i in range(6):
            fecha_fin = datetime.now().replace(day=1) - timedelta(days=i*30)
            fecha_inicio = fecha_fin - timedelta(days=30)

            # Contar solo imágenes procesadas que existen actualmente
            casos_mes = ImagenPaciente.objects.filter(
                fecha_prediccion__gte=fecha_inicio,
                fecha_prediccion__lt=fecha_fin,
                resultado__isnull=False
            ).count()

            mes_nombre = meses[fecha_fin.month - 1]
            tendencia_mensual.insert(0, {
                'mes': mes_nombre,
                'casos': casos_mes
            })

        data = {
            'pacientes_registrados': pacientes_registrados,
            'pacientes_gestionados': Paciente.objects.count(),  # Misma cifra por ahora
            'analisis_ml': imagenes_analizadas,
            'analisis_recientes': analisis_recientes,
            'tendencia_mensual': tendencia_mensual
        }
        
        return Response(data)
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de médico: {e}")
        return Response(
            {'error': 'Error interno del servidor'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generar_gradcam_profesional_medico(request):
    """
    Endpoint premium: Genera GradCAM de estándar profesional médico para retina.
    
    Características profesionales médicas:
    - Alta resolución 512×512 con interpolación bicúbica
    - Gaussian Blur σ=2.0 para suavización profesional
    - Normalización estándar médica 0-1
    - Colormap Inferno perceptualmente uniforme
    - Detección automática de área circular retinal
    - Transparencia profesional con canal alpha
    - PNG optimizado para superposición web médica
    - Estilo limpio, sin pixelación, interpretable por médicos
    """
    try:
        # Validar que se envió una imagen
        if 'imagen' not in request.FILES:
            return Response(
                {'error': 'Se requiere una imagen de retina'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        imagen_file = request.FILES['imagen']
        
        # Validar formato de imagen
        try:
            ImageValidator.validate_image_file(imagen_file)
        except Exception as e:
            return Response(
                {'error': f'Imagen inválida: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"Generando GradCAM profesional médico para: {imagen_file.name}")
        
        # Verificar modelo disponible
        if model is None:
            return Response(
                {'error': 'Modelo no disponible para análisis médico'}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Procesar imagen con función profesional médica
        try:
            # Guardar temporalmente el archivo
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                for chunk in imagen_file.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name
            
            try:
                # Usar función de procesamiento profesional médico
                from .prediction import procesar_imagenes
                
                result = procesar_imagenes(temp_path, colormap_type='inferno')
                
                if 'error' in result:
                    return Response(
                        {'error': result['error']}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                # Preparar respuesta profesional médica
                response_data = {
                    # INFORMACIÓN MÉDICA
                    'prediccion': result.get('prediccion'),
                    'prediccion_nombre': result.get('prediccion_nombre'),

                    # ⭐ GRAD-CAM PROFESIONAL MÉDICO (PRINCIPAL)
                    'gradcam_professional_medical': result.get('gradcam_professional_medical'),
                    'interpretation_guide': result.get('interpretation_guide'),
                    
                    # METADATOS PROFESIONALES
                    'professional_metadata': result.get('professional_metadata'),
                    'processing_info': result.get('processing_info'),
                    
                    # INFORMACIÓN DEL SISTEMA
                    'modelo_usado': result.get('modelo_usado'),
                    'version': result.get('version'),
                    'professional_grade': result.get('professional_grade', True),
                    'medical_ready': result.get('medical_ready', True),
                    'web_compatible': result.get('web_compatible', True),
                    
                    # INSTRUCCIONES DE USO
                    'usage_instructions': result.get('usage_instructions'),
                    
                    # INFORMACIÓN DE LA IMAGEN
                    'nombre_imagen': imagen_file.name,
                    'tipo': 'professional_medical_gradcam',
                    'mensaje': 'GradCAM profesional médico generado con estándares clínicos'
                }
                
                logger.info(f"GradCAM profesional médico completado")
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            finally:
                # Limpiar archivo temporal
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            
        except Exception as e:
            logger.error(f"Error procesando imagen profesional médica: {e}")
            return Response(
                {'error': f'Error en procesamiento médico: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f"Error en endpoint GradCAM profesional médico: {e}")
        return Response(
            {'error': 'Error interno del servidor médico'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generar_gradcam_clinico(request):
    """
    Endpoint avanzado: Genera GradCAM de calidad clínica web para imágenes de retina.
    
    Características:
    - Alta resolución (≥512×512) con interpolación bicúbica
    - Colormaps médicos (Inferno/Jet)
    - Detección automática de área circular de retina
    - Versiones overlay transparente y opaca
    - Barra de color SVG independiente
    """
    try:
        # Validar que se envió una imagen
        if 'imagen' not in request.FILES:
            return Response(
                {'error': 'Se requiere una imagen'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        imagen_file = request.FILES['imagen']
        colormap_type = request.data.get('colormap', 'inferno')  # Por defecto inferno
        
        # Validar colormap
        valid_colormaps = ['inferno', 'jet_medical']
        if colormap_type not in valid_colormaps:
            return Response(
                {'error': f'Colormap debe ser uno de: {valid_colormaps}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar formato de imagen
        try:
            ImageValidator.validate_image_file(imagen_file)
        except Exception as e:
            return Response(
                {'error': f'Imagen inválida: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"Generando GradCAM clínico para imagen: {imagen_file.name}, colormap: {colormap_type}")
        
        # Verificar modelo disponible
        if model is None:
            return Response(
                {'error': 'Modelo no disponible para GradCAM'}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Procesar imagen con nueva función clínica
        try:
            # Guardar temporalmente el archivo
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                for chunk in imagen_file.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name
            
            try:
                # Usar nueva función de procesamiento clínico
                from .prediction import procesar_imagenes
                
                result = procesar_imagenes(temp_path, colormap_type=colormap_type)
                
                if 'error' in result:
                    return Response(
                        {'error': result['error']}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                # Preparar respuesta con todas las versiones clínicas
                response_data = {
                    'prediccion': result.get('prediccion'),
                    'prediccion_nombre': result.get('prediccion_nombre'),
                    
                    # Versiones clínicas web-ready
                    'gradcam_overlay_40': result.get('gradcam_overlay_40'),
                    'gradcam_opaque_100': result.get('gradcam_opaque_100'), 
                    'gradcam_traditional': result.get('gradcam_traditional'),
                    'colorbar_svg': result.get('colorbar_svg'),
                    
                    # Versión alternativa si está disponible
                    'alternative_colormap': result.get('alternative_colormap'),
                    
                    # Metadatos
                    'colormap_used': colormap_type,
                    'clinical_grade': result.get('clinical_grade', True),
                    'web_ready': result.get('web_ready', True),
                    'processing_info': result.get('processing_info'),
                    'usage_instructions': result.get('usage_instructions'),
                    
                    # Info del modelo
                    'modelo_usado': result.get('modelo_usado'),
                    'version': result.get('version'),
                    
                    # Imagen procesada
                    'nombre_imagen': imagen_file.name,
                    'tipo': 'clinical_gradcam',
                    'mensaje': f'GradCAM clínico generado exitosamente con colormap {colormap_type}'
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            finally:
                # Limpiar archivo temporal
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            
        except Exception as e:
            logger.error(f"Error procesando imagen clínica: {e}")
            return Response(
                {'error': f'Error procesando imagen: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f"Error en endpoint GradCAM clínico: {e}")
        return Response(
            {'error': 'Error interno del servidor'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generar_gradcam_solo(request):
    """
    Endpoint híbrido: Genera solo GradCAM para una imagen ya procesada con IA local.
    Recibe imagen y predicción local, devuelve solo el mapa de calor explicativo.
    """
    try:
        # Validar que se envió una imagen
        if 'imagen' not in request.FILES:
            return Response(
                {'error': 'Se requiere una imagen'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        imagen_file = request.FILES['imagen']
        prediccion_local = request.data.get('prediccion_local')  # Opcional, para logging
        
        # Validar formato de imagen
        try:
            ImageValidator.validate_image_file(imagen_file)
        except Exception as e:
            return Response(
                {'error': f'Imagen inválida: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"Generando GradCAM híbrido para imagen: {imagen_file.name}")
        
        # Preprocesar imagen para el modelo servidor (96x96)
        try:
            from .utils import preprocess_retina_image_file
            processed_image = preprocess_retina_image_file(imagen_file, target_size=(96, 96))
            
            if processed_image is None:
                raise ValueError("Error en preprocesamiento de imagen")
                
        except Exception as e:
            logger.error(f"Error preprocesando imagen: {e}")
            return Response(
                {'error': 'Error procesando la imagen'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cargar modelo servidor para GradCAM
        if model is None:
            return Response(
                {'error': 'Modelo no disponible'}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Generar solo GradCAM (sin predicción)
        try:
            # Intentar usar modelo real si está disponible
            if model is not None:
                try:
                    # Usar nueva función get_gradcam_heatmap desde prediction.py
                    heatmap = get_gradcam_heatmap(model, processed_image)
                    gradcam_base64 = heatmap_to_base64(heatmap, processed_image)
                    response_data = {
                        'gradcam': gradcam_base64,
                        'mensaje': 'GradCAM real generado exitosamente',
                        'nombre_imagen': imagen_file.name,
                        'tipo': 'real'
                    }
                except Exception as model_error:
                    logger.warning(f"Modelo real falló, usando simulado: {model_error}")
                    # Fallback a GradCAM simulado
                    from .gradcam_tfjs_bridge import generate_gradcam_from_tfjs_prediction
                    import json
                    
                    prediccion_dict = None
                    if prediccion_local:
                        try:
                            prediccion_dict = json.loads(prediccion_local)
                        except:
                            prediccion_dict = None
                    
                    result = generate_gradcam_from_tfjs_prediction(processed_image, prediccion_dict)
                    response_data = {
                        'gradcam': result['gradcam'],
                        'mensaje': result['mensaje'],
                        'nombre_imagen': imagen_file.name,
                        'tipo': result['tipo'],
                        'nota': result.get('nota', '')
                    }
            else:
                # Usar GradCAM simulado directamente
                from .gradcam_tfjs_bridge import generate_gradcam_from_tfjs_prediction
                import json
                
                prediccion_dict = None
                if prediccion_local:
                    try:
                        prediccion_dict = json.loads(prediccion_local)
                    except:
                        prediccion_dict = None
                
                result = generate_gradcam_from_tfjs_prediction(processed_image, prediccion_dict)
                response_data = {
                    'gradcam': result['gradcam'],
                    'mensaje': result['mensaje'],
                    'nombre_imagen': imagen_file.name,
                    'tipo': result['tipo'],
                    'nota': result.get('nota', '')
                }
            
            # Si se proporcionó predicción local, incluirla en logs
            if prediccion_local:
                logger.info(f"GradCAM para predicción local: {prediccion_local}")
                response_data['prediccion_local_recibida'] = prediccion_local
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generando GradCAM: {e}")
            return Response(
                {'error': f'Error generando mapa de calor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f"Error en endpoint GradCAM híbrido: {e}")
        return Response(
            {'error': 'Error interno del servidor'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==========================================
# 🚀 NUEVAS FUNCIONES PROFESIONALES
# ==========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enhanced_prediction(request):
    """
    Endpoint para predicción con confianza mejorada usando:
    - Temperature Scaling
    - Test-Time Augmentation
    - Ensemble de modelos
    """
    try:
        if not ENHANCED_SYSTEMS_AVAILABLE:
            return Response(
                {'error': 'Sistemas mejorados no disponibles'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if 'imagen' not in request.FILES:
            return Response(
                {'error': 'Se requiere una imagen'},
                status=status.HTTP_400_BAD_REQUEST
            )

        imagen_file = request.FILES['imagen']
        use_tta = request.data.get('use_tta', 'true').lower() == 'true'
        use_ensemble = request.data.get('use_ensemble', 'false').lower() == 'true'

        # Validar imagen
        try:
            ImageValidator.validate_image_file(imagen_file)
        except Exception as e:
            return Response(
                {'error': f'Imagen inválida: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Preprocesar imagen
        from .utils import preprocess_retina_image_file
        processed_image = preprocess_retina_image_file(imagen_file, target_size=(224, 224))

        if processed_image is None:
            return Response(
                {'error': 'Error procesando imagen'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if use_ensemble:
                # Usar ensemble si está disponible
                ensemble_manager = EnsembleManager(os.path.join(settings.BASE_DIR, 'apps/pacientes/modelos'))
                if not ensemble_manager.setup():
                    # Fallback a sistema mejorado individual
                    result = enhanced_confidence_system.predict_with_enhanced_confidence(
                        model, processed_image, use_tta=use_tta
                    )
                    result['method'] = 'enhanced_individual'
                else:
                    result = ensemble_manager.predict(processed_image, method="weighted_average")
                    result['method'] = 'ensemble'
            else:
                # Sistema mejorado individual
                result = enhanced_confidence_system.predict_with_enhanced_confidence(
                    model, processed_image, use_tta=use_tta
                )
                result['method'] = 'enhanced_individual'

            # Mapear resultados
            resultados_map = {
                0: "Sin retinopatía",
                1: "Leve",
                2: "Moderada",
                3: "Severa",
                4: "Proliferativa"
            }

            response_data = {
                'prediction': result['prediction'],
                'prediction_name': resultados_map.get(result['prediction'], 'Desconocido'),
                'interpretation': result.get('interpretation', ''),
                'probabilities': result.get('probabilities', []),
                'method_used': result.get('method', 'enhanced'),
                'timestamp': datetime.now().isoformat(),
                'image_name': imagen_file.name
            }

            logger.info(f"✅ Predicción mejorada: {result['prediction']}")

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error en predicción mejorada: {e}")
            return Response(
                {'error': f'Error en predicción: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        logger.error(f"Error en endpoint de predicción mejorada: {e}")
        return Response(
            {'error': 'Error interno del servidor'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_patient_pdf_report(request, paciente_id):
    """
    Genera reporte PDF profesional para un paciente específico
    """
    try:
        # Obtener paciente
        paciente = get_object_or_404(Paciente, id=paciente_id)

        # Obtener imagen más reciente con predicción
        imagen_reciente = paciente.imagenes.filter(
            resultado__isnull=False
        ).order_by('-fecha_prediccion').first()

        if not imagen_reciente:
            return Response(
                {'error': 'No hay diagnósticos disponibles para este paciente'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Preparar datos del paciente
        patient_data = {
            'historia_clinica': paciente.historia_clinica,
            'ci': paciente.ci,
            'nombres': paciente.nombres,
            'apellidos': paciente.apellidos,
            'fecha_nacimiento': paciente.fecha_nacimiento.strftime('%Y-%m-%d') if paciente.fecha_nacimiento else None,
            'genero': paciente.get_genero_display(),
            'tipo_diabetes': paciente.get_tipo_diabetes_display(),
            'estado_dilatacion': paciente.get_estado_dilatacion_display(),
            'camara_retinal': paciente.camara_retinal,
        }

        # Preparar datos del diagnóstico
        diagnosis_data = {
            'resultado': imagen_reciente.resultado,
            'modelo_version': imagen_reciente.modelo_version,
            'fecha_prediccion': imagen_reciente.fecha_prediccion.isoformat() if imagen_reciente.fecha_prediccion else None,
            'processing_id': f"IMG_{imagen_reciente.id}_{int(datetime.now().timestamp())}"
        }


        # Datos de GradCAM si están disponibles
        gradcam_data = None
        if imagen_reciente.gradcam_base64:
            gradcam_data = {
                'gradcam_base64': imagen_reciente.gradcam_base64,
                'method': 'GradCAM Enhanced',
                'size': '512x512',
            }

        # Generar PDF
        pdf_content = pdf_generator.generate_patient_report(
            patient_data=patient_data,
            diagnosis_data=diagnosis_data,
            gradcam_data=gradcam_data
        )

        # Crear respuesta HTTP con PDF
        response = HttpResponse(pdf_content, content_type='application/pdf')
        filename = f"reporte_{paciente.ci}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(pdf_content)

        logger.info(f"✅ PDF generado para paciente {paciente_id}: {len(pdf_content)} bytes")

        return response

    except Exception as e:
        logger.error(f"Error generando PDF para paciente {paciente_id}: {e}")
        return JsonResponse(
            {'error': f'Error generando reporte: {str(e)}'},
            status=500
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_batch_pdf_reports(request):
    """
    Genera múltiples reportes PDF para una lista de pacientes
    """
    try:
        paciente_ids = request.data.get('paciente_ids', [])

        if not paciente_ids or not isinstance(paciente_ids, list):
            return Response(
                {'error': 'Se requiere una lista de IDs de pacientes'},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = []
        errors = []

        for paciente_id in paciente_ids:
            try:
                paciente = Paciente.objects.get(id=paciente_id)

                # Verificar si tiene diagnósticos
                has_diagnosis = paciente.imagenes.filter(resultado__isnull=False).exists()

                if has_diagnosis:
                    results.append({
                        'paciente_id': paciente_id,
                        'nombre': f"{paciente.nombres} {paciente.apellidos}",
                        'ci': paciente.ci,
                        'status': 'ready',
                        'pdf_url': f'/api/pacientes/{paciente_id}/pdf-report/'
                    })
                else:
                    errors.append({
                        'paciente_id': paciente_id,
                        'error': 'Sin diagnósticos disponibles'
                    })

            except Paciente.DoesNotExist:
                errors.append({
                    'paciente_id': paciente_id,
                    'error': 'Paciente no encontrado'
                })
            except Exception as e:
                errors.append({
                    'paciente_id': paciente_id,
                    'error': str(e)
                })

        return Response({
            'generated_reports': len(results),
            'errors': len(errors),
            'results': results,
            'error_details': errors,
            'timestamp': datetime.now().isoformat()
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error en generación batch de PDFs: {e}")
        return Response(
            {'error': f'Error procesando solicitud: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


