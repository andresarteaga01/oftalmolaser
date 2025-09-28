from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import ImagenPaciente, Paciente
from .ml_enhanced import batch_processor, model_monitor, MLCache
from .image_optimizer import ImageOptimizer
import logging
from typing import List

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def process_image_ml_task(self, imagen_id: int, model_version: str = None):
    """
    Tarea asíncrona para procesamiento ML de imágenes
    """
    try:
        imagen = ImagenPaciente.objects.get(id=imagen_id)
        
        # Verificar cache primero
        if imagen.archivo_hash:
            cached_result = MLCache.get_cached_prediction(
                imagen.archivo_hash, 
                model_version or batch_processor.model_manager.current_version
            )
            
            if cached_result:
                logger.info(f"Usando resultado de cache para imagen {imagen_id}")
                _update_image_with_result(imagen, cached_result)
                return cached_result
        
        # Procesar imagen
        results = batch_processor.process_images_batch([imagen.imagen.path], model_version)
        
        if results:
            result = results[0]
            
            # Actualizar modelo con resultado
            _update_image_with_result(imagen, result)
            
            # Cachear resultado
            if imagen.archivo_hash:
                MLCache.cache_prediction(
                    imagen.archivo_hash,
                    result['model_version'],
                    result
                )
            
            # Registrar para monitoreo
            model_monitor.log_prediction(result)
            
            logger.info(f"Imagen {imagen_id} procesada exitosamente")
            return result
        else:
            raise Exception("No se pudo procesar la imagen")
            
    except ImagenPaciente.DoesNotExist:
        logger.error(f"Imagen {imagen_id} no encontrada")
        raise
    except Exception as e:
        logger.error(f"Error procesando imagen {imagen_id}: {e}")
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (self.request.retries + 1))
        raise

@shared_task
def process_multiple_images_task(imagen_ids: List[int], model_version: str = None):
    """
    Tarea para procesamiento batch de múltiples imágenes
    """
    try:
        imagenes = ImagenPaciente.objects.filter(id__in=imagen_ids)
        image_paths = []
        imagen_objects = []
        
        for imagen in imagenes:
            if imagen.imagen:
                image_paths.append(imagen.imagen.path)
                imagen_objects.append(imagen)
        
        if not image_paths:
            logger.warning("No hay imágenes válidas para procesar")
            return
        
        # Procesamiento batch
        results = batch_processor.process_images_batch(image_paths, model_version)
        
        # Actualizar modelos con resultados
        for imagen, result in zip(imagen_objects, results):
            _update_image_with_result(imagen, result)
            
            # Cachear si tiene hash
            if imagen.archivo_hash:
                MLCache.cache_prediction(
                    imagen.archivo_hash,
                    result['model_version'],
                    result
                )
            
            # Registrar para monitoreo
            model_monitor.log_prediction(result)
        
        logger.info(f"Procesadas {len(results)} imágenes en batch")
        return len(results)
        
    except Exception as e:
        logger.error(f"Error en procesamiento batch: {e}")
        raise

@shared_task
def optimize_uploaded_image_task(imagen_id: int):
    """
    Tarea para optimizar imágenes subidas
    """
    try:
        imagen = ImagenPaciente.objects.get(id=imagen_id)
        
        if not imagen.imagen:
            logger.warning(f"Imagen {imagen_id} no tiene archivo")
            return
        
        # Optimizar imagen
        optimized_results = ImageOptimizer.optimize_medical_image(imagen.imagen)
        
        # Guardar versiones optimizadas
        if 'preview' in optimized_results:
            imagen.imagen_preview.save(
                f"preview_{imagen.id}.jpg",
                optimized_results['preview'],
                save=False
            )
        
        if 'thumbnail' in optimized_results:
            imagen.imagen_thumbnail.save(
                f"thumb_{imagen.id}.jpg",
                optimized_results['thumbnail'],
                save=False
            )
        
        # Generar versión WebP
        webp_version = ImageOptimizer.generate_webp_version(imagen.imagen)
        if webp_version:
            imagen.imagen_webp.save(
                f"webp_{imagen.id}.webp",
                webp_version,
                save=False
            )
        
        # Guardar metadata
        if 'metadata' in optimized_results:
            imagen.metadata = optimized_results['metadata']
        
        imagen.save()
        
        logger.info(f"Imagen {imagen_id} optimizada exitosamente")
        
    except ImagenPaciente.DoesNotExist:
        logger.error(f"Imagen {imagen_id} no encontrada")
    except Exception as e:
        logger.error(f"Error optimizando imagen {imagen_id}: {e}")

@shared_task
def generate_patient_report_task(paciente_id: int, email: str = None):
    """
    Generar reporte completo de paciente
    """
    try:
        paciente = Paciente.objects.get(id=paciente_id)
        imagenes = paciente.imagenes.all().order_by('-fecha_creacion')
        
        # Generar estadísticas
        total_imagenes = imagenes.count()
        con_diagnostico = imagenes.filter(resultado__isnull=False).count()
        
        if con_diagnostico > 0:
            resultados = list(imagenes.filter(resultado__isnull=False).values_list('resultado', flat=True))
            resultado_frecuente = max(set(resultados), key=resultados.count)
        else:
            resultado_frecuente = None
        
        report_data = {
            'paciente': {
                'nombre': paciente.nombre_completo,
                'ci': paciente.ci,
                'historia_clinica': paciente.historia_clinica,
            },
            'estadisticas': {
                'total_imagenes': total_imagenes,
                'con_diagnostico': con_diagnostico,
                'resultado_frecuente': resultado_frecuente,
            },
            'imagenes_recientes': [
                {
                    'fecha': img.fecha_creacion.isoformat(),
                    'resultado': img.resultado,
                    'modelo_version': img.modelo_version,
                }
                for img in imagenes[:10]  # Últimas 10 imágenes
            ]
        }
        
        # Enviar por email si se especifica
        if email:
            send_patient_report_email.delay(email, report_data)
        
        logger.info(f"Reporte generado para paciente {paciente_id}")
        return report_data
        
    except Paciente.DoesNotExist:
        logger.error(f"Paciente {paciente_id} no encontrado")
        raise
    except Exception as e:
        logger.error(f"Error generando reporte para paciente {paciente_id}: {e}")
        raise

@shared_task
def send_patient_report_email(email: str, report_data: dict):
    """
    Enviar reporte de paciente por email
    """
    try:
        subject = f"Reporte Médico - {report_data['paciente']['nombre']}"
        
        message = f"""
        Reporte Médico Automatizado
        
        Paciente: {report_data['paciente']['nombre']}
        CI: {report_data['paciente']['ci']}
        Historia Clínica: {report_data['paciente']['historia_clinica']}
        
        Estadísticas:
        - Total de imágenes: {report_data['estadisticas']['total_imagenes']}
        - Con diagnóstico: {report_data['estadisticas']['con_diagnostico']}
        - Resultado más frecuente: {report_data['estadisticas']['resultado_frecuente']}
        
        Este es un reporte automatizado generado por el sistema de análisis de retinopatía diabética.
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        
        logger.info(f"Reporte enviado por email a {email}")
        
    except Exception as e:
        logger.error(f"Error enviando email a {email}: {e}")
        raise

@shared_task
def monitor_model_performance_task():
    """
    Tarea periódica para monitorear performance del modelo
    """
    try:
        # Obtener métricas actuales
        metrics = model_monitor.get_model_metrics()
        drift_analysis = model_monitor.detect_drift()
        
        # Log de métricas
        if metrics:
            logger.info(f"Métricas del modelo: {metrics}")
        
        # Alertar si hay drift
        if drift_analysis.get('drift_detected'):
            logger.warning(f"Drift detectado en el modelo: {drift_analysis}")
            
            # Enviar alerta por email a administradores
            send_mail(
                subject="Alerta: Drift Detectado en Modelo ML",
                message=f"Se ha detectado drift en el modelo de ML:\n\n{drift_analysis}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=['admin@example.com'],  # Configurar emails de admin
                fail_silently=True,
            )
        
        return {
            'metrics': metrics,
            'drift_analysis': drift_analysis
        }
        
    except Exception as e:
        logger.error(f"Error monitoreando modelo: {e}")
        raise

def _update_image_with_result(imagen: ImagenPaciente, result: dict):
    """
    Helper function para actualizar ImagenPaciente con resultado ML
    """
    from django.utils import timezone
    
    imagen.resultado = result['prediction']
    imagen.modelo_version = result['model_version']
    imagen.fecha_prediccion = timezone.now()
    
    if 'gradcam' in result and result['gradcam']:
        imagen.gradcam_base64 = result['gradcam']
    
    # Actualizar metadata
    if not imagen.metadata:
        imagen.metadata = {}
    
    imagen.metadata.update({
        'all_probabilities': result.get('all_probabilities', []),
        'is_reliable': result.get('is_reliable', False),
        'processed_at': result.get('processed_at')
    })
    
    imagen.save()