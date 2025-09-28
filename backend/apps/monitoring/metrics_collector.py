import psutil
import time
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.cache import cache
from django.db import connection
from celery.task.control import inspect
from .models import SystemHealthMetrics, MLModelMetrics, PerformanceMetric, UserActivity
from ..pacientes.ml_enhanced import model_monitor
import statistics

logger = logging.getLogger(__name__)

class MetricsCollector:
    """Recolector de métricas del sistema"""
    
    def __init__(self):
        self.celery_inspect = inspect()
    
    def collect_system_health_metrics(self):
        """Recopilar métricas de salud del sistema"""
        try:
            # Métricas de sistema
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Métricas de base de datos
            db_connections = self._get_db_connections()
            db_query_time = self._get_db_query_time()
            
            # Métricas de cache
            cache_stats = self._get_cache_stats()
            
            # Métricas de Celery
            celery_stats = self._get_celery_stats()
            
            # Métricas de API
            api_stats = self._get_api_response_times()
            
            # Crear registro de métricas
            metrics = SystemHealthMetrics.objects.create(
                cpu_usage_percent=cpu_percent,
                memory_usage_percent=memory.percent,
                disk_usage_percent=disk.percent,
                
                db_connections_active=db_connections['active'],
                db_connections_max=db_connections['max'],
                db_query_avg_time_ms=db_query_time,
                
                cache_hit_rate=cache_stats['hit_rate'],
                cache_memory_usage_mb=cache_stats['memory_usage_mb'],
                
                celery_active_tasks=celery_stats['active'],
                celery_pending_tasks=celery_stats['pending'],
                celery_failed_tasks=celery_stats['failed'],
                
                api_avg_response_time_ms=api_stats['avg_response_time'],
                api_95th_percentile_ms=api_stats['p95_response_time'],
            )
            
            logger.info(f"System health metrics collected: {metrics.overall_health_score:.1f}% health")
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting system health metrics: {e}")
            return None
    
    def collect_ml_metrics(self, period_hours=1):
        """Recopilar métricas del modelo de ML"""
        try:
            end_time = timezone.now()
            start_time = end_time - timedelta(hours=period_hours)
            
            # Obtener métricas del monitor de modelo
            model_metrics = model_monitor.get_model_metrics()
            
            if not model_metrics:
                return None
            
            # Obtener distribución de clases de predicciones recientes
            recent_predictions = cache.get(model_monitor.predictions_key, [])
            class_distribution = {}
            processing_times = []
            
            for pred in recent_predictions:
                if 'timestamp' in pred:
                    pred_time = datetime.fromisoformat(pred['timestamp'])
                    if start_time <= pred_time <= end_time:
                        class_key = str(pred['prediction'])
                        class_distribution[class_key] = class_distribution.get(class_key, 0) + 1
                        
                        if 'processing_time_ms' in pred:
                            processing_times.append(pred['processing_time_ms'])
            
            # Calcular estadísticas de tiempo de procesamiento
            avg_processing_time = statistics.mean(processing_times) if processing_times else None
            max_processing_time = max(processing_times) if processing_times else None
            
            # Crear registro de métricas ML
            ml_metrics = MLModelMetrics.objects.create(
                model_version=model_metrics.get('model_version', 'v2.0'),
                total_predictions=model_metrics.get('total_predictions', 0),
                successful_predictions=model_metrics.get('successful_predictions', 0),
                failed_predictions=model_metrics.get('failed_predictions', 0),
                avg_confidence=model_metrics.get('avg_confidence'),
                low_confidence_count=model_metrics.get('low_confidence_count', 0),
                class_distribution=class_distribution,
                avg_processing_time_ms=avg_processing_time,
                max_processing_time_ms=max_processing_time,
                period_start=start_time,
                period_end=end_time,
            )
            
            logger.info(f"ML metrics collected: {ml_metrics.success_rate:.1f}% success rate")
            return ml_metrics
            
        except Exception as e:
            logger.error(f"Error collecting ML metrics: {e}")
            return None
    
    def collect_endpoint_metrics(self, period_hours=1):
        """Recopilar métricas de endpoints"""
        try:
            end_time = timezone.now()
            start_time = end_time - timedelta(hours=period_hours)
            
            # Obtener actividades de usuario para calcular métricas de endpoints
            activities = UserActivity.objects.filter(
                timestamp__range=[start_time, end_time],
                duration_ms__isnull=False
            )
            
            # Agrupar por endpoint
            endpoint_stats = {}
            
            for activity in activities:
                endpoint_key = f"{activity.action}"
                
                if endpoint_key not in endpoint_stats:
                    endpoint_stats[endpoint_key] = {
                        'response_times': [],
                        'success_count': 0,
                        'error_count': 0,
                        'status_codes': {}
                    }
                
                stats = endpoint_stats[endpoint_key]
                stats['response_times'].append(activity.duration_ms)
                
                if activity.success:
                    stats['success_count'] += 1
                    status_code = '200'
                else:
                    stats['error_count'] += 1
                    status_code = '500'
                
                stats['status_codes'][status_code] = stats['status_codes'].get(status_code, 0) + 1
            
            # Crear métricas para cada endpoint
            metrics_created = []
            
            for endpoint, stats in endpoint_stats.items():
                if not stats['response_times']:
                    continue
                
                response_times = sorted(stats['response_times'])
                
                metric = PerformanceMetric.objects.create(
                    endpoint=endpoint,
                    method='POST',  # Asumir POST para acciones
                    avg_response_time_ms=statistics.mean(response_times),
                    min_response_time_ms=min(response_times),
                    max_response_time_ms=max(response_times),
                    p95_response_time_ms=self._percentile(response_times, 95),
                    p99_response_time_ms=self._percentile(response_times, 99),
                    request_count=len(response_times),
                    success_count=stats['success_count'],
                    error_count=stats['error_count'],
                    status_code_distribution=stats['status_codes'],
                    period_start=start_time,
                    period_end=end_time,
                )
                
                metrics_created.append(metric)
            
            logger.info(f"Endpoint metrics collected for {len(metrics_created)} endpoints")
            return metrics_created
            
        except Exception as e:
            logger.error(f"Error collecting endpoint metrics: {e}")
            return []
    
    def _get_db_connections(self):
        """Obtener estadísticas de conexiones de DB"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
                active_connections = cursor.fetchone()[0]
                
                cursor.execute("SHOW max_connections;")
                max_connections = int(cursor.fetchone()[0])
                
                return {
                    'active': active_connections,
                    'max': max_connections
                }
        except Exception:
            return {'active': 0, 'max': 100}
    
    def _get_db_query_time(self):
        """Obtener tiempo promedio de consultas de DB"""
        try:
            # Esta es una métrica simple, en producción podrías usar pg_stat_statements
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
            end_time = time.time()
            
            return (end_time - start_time) * 1000  # en milisegundos
        except Exception:
            return None
    
    def _get_cache_stats(self):
        """Obtener estadísticas de cache"""
        try:
            # Intentar obtener estadísticas de Redis
            from django_redis import get_redis_connection
            
            redis_conn = get_redis_connection("default")
            info = redis_conn.info()
            
            hit_rate = None
            if 'keyspace_hits' in info and 'keyspace_misses' in info:
                hits = info['keyspace_hits']
                misses = info['keyspace_misses']
                if hits + misses > 0:
                    hit_rate = (hits / (hits + misses)) * 100
            
            memory_usage_mb = info.get('used_memory', 0) / (1024 * 1024)
            
            return {
                'hit_rate': hit_rate,
                'memory_usage_mb': memory_usage_mb
            }
        except Exception:
            return {
                'hit_rate': None,
                'memory_usage_mb': None
            }
    
    def _get_celery_stats(self):
        """Obtener estadísticas de Celery"""
        try:
            if not self.celery_inspect:
                return {'active': 0, 'pending': 0, 'failed': 0}
            
            active_tasks = self.celery_inspect.active()
            scheduled_tasks = self.celery_inspect.scheduled()
            
            active_count = sum(len(tasks) for tasks in (active_tasks or {}).values())
            pending_count = sum(len(tasks) for tasks in (scheduled_tasks or {}).values())
            
            return {
                'active': active_count,
                'pending': pending_count,
                'failed': 0  # Necesitaría configuración adicional para obtener tareas fallidas
            }
        except Exception:
            return {'active': 0, 'pending': 0, 'failed': 0}
    
    def _get_api_response_times(self):
        """Obtener tiempos de respuesta de API"""
        try:
            # Obtener métricas de actividades recientes
            recent_activities = UserActivity.objects.filter(
                timestamp__gte=timezone.now() - timedelta(minutes=10),
                duration_ms__isnull=False
            )
            
            if not recent_activities.exists():
                return {'avg_response_time': None, 'p95_response_time': None}
            
            response_times = list(recent_activities.values_list('duration_ms', flat=True))
            response_times.sort()
            
            avg_time = statistics.mean(response_times)
            p95_time = self._percentile(response_times, 95)
            
            return {
                'avg_response_time': avg_time,
                'p95_response_time': p95_time
            }
        except Exception:
            return {'avg_response_time': None, 'p95_response_time': None}
    
    def _percentile(self, data, percentile):
        """Calcular percentil de una lista de datos"""
        if not data:
            return None
        
        size = len(data)
        index = (percentile / 100) * (size - 1)
        
        if index.is_integer():
            return data[int(index)]
        else:
            lower = data[int(index)]
            upper = data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))

# Instancia global del collector
metrics_collector = MetricsCollector()