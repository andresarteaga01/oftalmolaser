from django.apps import AppConfig

class MonitoringConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.monitoring'
    verbose_name = 'Sistema de Monitoreo'
    
    def ready(self):
        # Configurar Sentry cuando la app esté lista
        from .sentry_config import configure_sentry
        configure_sentry()