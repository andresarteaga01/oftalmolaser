from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .metrics_collector import metrics_collector
from .models import SystemHealthMetrics, MLModelMetrics, PerformanceMetric, ErrorLog, UserActivity
import logging

logger = logging.getLogger(__name__)

@shared_task
def collect_system_metrics():
    """Tarea para recopilar métricas del sistema cada 5 minutos"""
    try:
        metrics = metrics_collector.collect_system_health_metrics()
        if metrics:
            logger.info(f"System metrics collected - Health score: {metrics.overall_health_score:.1f}%")
        return True
    except Exception as e:
        logger.error(f"Error collecting system metrics: {e}")
        return False

@shared_task
def collect_ml_metrics():
    """Tarea para recopilar métricas del modelo ML cada hora"""
    try:
        metrics = metrics_collector.collect_ml_metrics(period_hours=1)
        if metrics:
            logger.info(f"ML metrics collected - Success rate: {metrics.success_rate:.1f}%")
        return True
    except Exception as e:
        logger.error(f"Error collecting ML metrics: {e}")
        return False

@shared_task
def collect_endpoint_metrics():
    """Tarea para recopilar métricas de endpoints cada hora"""
    try:
        metrics_list = metrics_collector.collect_endpoint_metrics(period_hours=1)
        logger.info(f"Endpoint metrics collected for {len(metrics_list)} endpoints")
        return len(metrics_list)
    except Exception as e:
        logger.error(f"Error collecting endpoint metrics: {e}")
        return 0

@shared_task
def cleanup_old_metrics():
    """Limpiar métricas antiguas para mantener la base de datos optimizada"""
    try:
        cutoff_date = timezone.now() - timedelta(days=30)
        
        # Limpiar métricas de sistema antiguas (mantener una por día)
        old_system_metrics = SystemHealthMetrics.objects.filter(
            timestamp__lt=cutoff_date
        ).exclude(
            id__in=SystemHealthMetrics.objects.filter(
                timestamp__lt=cutoff_date
            ).extra(
                select={'day': 'DATE(timestamp)'}
            ).values('day').annotate(
                first_id=models.Min('id')
            ).values_list('first_id', flat=True)
        )
        
        deleted_system = old_system_metrics.delete()[0]
        
        # Limpiar métricas ML antiguas
        deleted_ml = MLModelMetrics.objects.filter(
            created_at__lt=cutoff_date
        ).delete()[0]
        
        # Limpiar métricas de performance antiguas
        deleted_perf = PerformanceMetric.objects.filter(
            created_at__lt=cutoff_date
        ).delete()[0]
        
        # Limpiar actividades de usuario antiguas (mantener solo últimos 90 días)
        user_activity_cutoff = timezone.now() - timedelta(days=90)
        deleted_activities = UserActivity.objects.filter(
            timestamp__lt=user_activity_cutoff
        ).delete()[0]
        
        # Limpiar logs de error resueltos antiguos
        error_cutoff = timezone.now() - timedelta(days=60)
        deleted_errors = ErrorLog.objects.filter(
            resolved=True,
            resolved_at__lt=error_cutoff
        ).delete()[0]
        
        logger.info(
            f"Cleaned up old metrics - System: {deleted_system}, "
            f"ML: {deleted_ml}, Performance: {deleted_perf}, "
            f"Activities: {deleted_activities}, Errors: {deleted_errors}"
        )
        
        return {
            'system_metrics': deleted_system,
            'ml_metrics': deleted_ml,
            'performance_metrics': deleted_perf,
            'user_activities': deleted_activities,
            'error_logs': deleted_errors,
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up old metrics: {e}")
        return False

@shared_task
def generate_daily_report():
    """Generar reporte diario de métricas"""
    try:
        end_time = timezone.now()
        start_time = end_time - timedelta(days=1)
        
        # Obtener métricas del día
        system_metrics = SystemHealthMetrics.objects.filter(
            timestamp__range=[start_time, end_time]
        )
        
        ml_metrics = MLModelMetrics.objects.filter(
            period_start__range=[start_time, end_time]
        )
        
        error_logs = ErrorLog.objects.filter(
            first_occurrence__range=[start_time, end_time]
        )
        
        user_activities = UserActivity.objects.filter(
            timestamp__range=[start_time, end_time]
        )
        
        # Calcular estadísticas
        report_data = {
            'date': end_time.date().isoformat(),
            'system_health': {
                'avg_cpu_usage': system_metrics.aggregate(
                    avg=models.Avg('cpu_usage_percent')
                )['avg'] or 0,
                'avg_memory_usage': system_metrics.aggregate(
                    avg=models.Avg('memory_usage_percent')
                )['avg'] or 0,
                'avg_health_score': sum(m.overall_health_score for m in system_metrics) / len(system_metrics) if system_metrics else 0,
            },
            'ml_performance': {
                'total_predictions': ml_metrics.aggregate(
                    total=models.Sum('total_predictions')
                )['total'] or 0,
                'avg_success_rate': sum(m.success_rate for m in ml_metrics) / len(ml_metrics) if ml_metrics else 0,
                'avg_confidence': ml_metrics.aggregate(
                    avg=models.Avg('avg_confidence')
                )['avg'] or 0,
            },
            'user_activity': {
                'total_actions': user_activities.count(),
                'unique_users': user_activities.values('user').distinct().count(),
                'success_rate': (user_activities.filter(success=True).count() / user_activities.count() * 100) if user_activities.count() > 0 else 0,
            },
            'errors': {
                'total_errors': error_logs.count(),
                'critical_errors': error_logs.filter(severity='critical').count(),
                'unresolved_errors': error_logs.filter(resolved=False).count(),
            }
        }
        
        logger.info(f"Daily report generated: {report_data}")
        
        # Aquí podrías enviar el reporte por email o guardarlo en un archivo
        # send_daily_report_email(report_data)
        
        return report_data
        
    except Exception as e:
        logger.error(f"Error generating daily report: {e}")
        return False

@shared_task
def check_system_alerts():
    """Verificar alertas del sistema y enviar notificaciones"""
    try:
        alerts = []
        
        # Verificar salud del sistema
        latest_health = SystemHealthMetrics.objects.first()
        if latest_health:
            health_score = latest_health.overall_health_score
            if health_score < 70:
                alerts.append({
                    'type': 'system_health',
                    'severity': 'high' if health_score < 50 else 'medium',
                    'message': f'System health score is low: {health_score:.1f}%',
                    'details': {
                        'cpu_usage': latest_health.cpu_usage_percent,
                        'memory_usage': latest_health.memory_usage_percent,
                        'disk_usage': latest_health.disk_usage_percent,
                    }
                })
        
        # Verificar errores no resueltos
        unresolved_critical_errors = ErrorLog.objects.filter(
            resolved=False,
            severity='critical',
            first_occurrence__gte=timezone.now() - timedelta(hours=1)
        ).count()
        
        if unresolved_critical_errors > 0:
            alerts.append({
                'type': 'critical_errors',
                'severity': 'critical',
                'message': f'{unresolved_critical_errors} unresolved critical errors',
                'details': {'count': unresolved_critical_errors}
            })
        
        # Verificar performance del modelo ML
        recent_ml_metrics = MLModelMetrics.objects.filter(
            period_start__gte=timezone.now() - timedelta(hours=2)
        ).first()
        
        if recent_ml_metrics and recent_ml_metrics.success_rate < 90:
            alerts.append({
                'type': 'ml_performance',
                'severity': 'medium',
                'message': f'ML model success rate is low: {recent_ml_metrics.success_rate:.1f}%',
                'details': {
                    'success_rate': recent_ml_metrics.success_rate,
                    'total_predictions': recent_ml_metrics.total_predictions,
                }
            })
        
        # Procesar alertas
        for alert in alerts:
            logger.warning(f"ALERT: {alert['message']}")
            # Aquí podrías enviar notificaciones por email, Slack, etc.
            # send_alert_notification(alert)
        
        return alerts
        
    except Exception as e:
        logger.error(f"Error checking system alerts: {e}")
        return []