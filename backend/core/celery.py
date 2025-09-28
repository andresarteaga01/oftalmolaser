import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# Configurar Django settings module para Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('retinopatia_ml')

# Configuración usando string object para evitar issues de serialización
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodiscovery de tareas en todas las apps de Django
app.autodiscover_tasks()

# Configuración de Celery
app.conf.update(
    # Broker settings
    broker_url=os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    result_backend=os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
    
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Lima',
    enable_utc=True,
    
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    
    # Task routing
    task_routes={
        'apps.pacientes.tasks.process_image_ml_task': {'queue': 'ml_processing'},
        'apps.pacientes.tasks.process_multiple_images_task': {'queue': 'ml_processing'},
        'apps.pacientes.tasks.optimize_uploaded_image_task': {'queue': 'image_processing'},
        'apps.pacientes.tasks.generate_patient_report_task': {'queue': 'reports'},
        'apps.pacientes.tasks.monitor_model_performance_task': {'queue': 'monitoring'},
    },
    
    # Retry settings
    task_default_retry_delay=60,
    task_max_retries=3,
    
    # Beat schedule para tareas periódicas
    beat_schedule={
        'monitor-model-performance': {
            'task': 'apps.pacientes.tasks.monitor_model_performance_task',
            'schedule': 3600.0,  # Cada hora
        },
        'collect-system-metrics': {
            'task': 'apps.monitoring.tasks.collect_system_metrics',
            'schedule': 300.0,  # Cada 5 minutos
        },
        'collect-ml-metrics': {
            'task': 'apps.monitoring.tasks.collect_ml_metrics',
            'schedule': 3600.0,  # Cada hora
        },
        'collect-endpoint-metrics': {
            'task': 'apps.monitoring.tasks.collect_endpoint_metrics',
            'schedule': 3600.0,  # Cada hora
        },
        'cleanup-old-metrics': {
            'task': 'apps.monitoring.tasks.cleanup_old_metrics',
            'schedule': crontab(hour=2, minute=0),  # Cada día a las 2 AM
        },
        'generate-daily-report': {
            'task': 'apps.monitoring.tasks.generate_daily_report',
            'schedule': crontab(hour=8, minute=0),  # Cada día a las 8 AM
        },
        'check-system-alerts': {
            'task': 'apps.monitoring.tasks.check_system_alerts',
            'schedule': 900.0,  # Cada 15 minutos
        },
    },
)

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')