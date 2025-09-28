import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from django.conf import settings
import logging

def configure_sentry():
    """Configurar Sentry para monitoreo de errores"""
    
    if not hasattr(settings, 'SENTRY_DSN') or not settings.SENTRY_DSN:
        return
    
    # Configurar nivel de logging para Sentry
    sentry_logging = LoggingIntegration(
        level=logging.INFO,        # Capturar logs de nivel INFO y superior
        event_level=logging.ERROR  # Enviar eventos de ERROR y superior a Sentry
    )
    
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            DjangoIntegration(
                transaction_style='url',
                middleware_spans=True,
                signals_spans=True,
            ),
            CeleryIntegration(
                monitor_beat_tasks=True,
                propagate_traces=True,
            ),
            RedisIntegration(),
            sentry_logging,
        ],
        
        # Performance monitoring
        traces_sample_rate=0.1,  # 10% de las transacciones para performance
        profiles_sample_rate=0.1,  # 10% para profiling
        
        # Error filtering
        before_send=filter_errors,
        before_send_transaction=filter_transactions,
        
        # Environment settings
        environment=getattr(settings, 'ENVIRONMENT', 'development'),
        release=getattr(settings, 'APP_VERSION', None),
        
        # Additional options
        debug=settings.DEBUG,
        attach_stacktrace=True,
        send_default_pii=False,  # No enviar PII por defecto
        
        # Custom tags
        tags={
            'component': 'retinopatia-ml',
            'server_name': settings.ALLOWED_HOSTS[0] if settings.ALLOWED_HOSTS else 'localhost'
        }
    )

def filter_errors(event, hint):
    """Filtrar errores antes de enviarlos a Sentry"""
    
    # No reportar ciertos tipos de errores comunes
    if 'exc_info' in hint:
        exc_type, exc_value, tb = hint['exc_info']
        
        # Filtrar errores de conectividad
        if isinstance(exc_value, ConnectionError):
            return None
            
        # Filtrar errores de timeout menores
        if 'timeout' in str(exc_value).lower() and 'ReadTimeoutError' in str(exc_type):
            return None
    
    # Filtrar por mensaje de error
    if event.get('message'):
        ignored_messages = [
            'favicon.ico',
            'robots.txt',
            'DisallowedHost',
            'CSRF',
        ]
        
        for ignored in ignored_messages:
            if ignored in event['message']:
                return None
    
    # Agregar contexto adicional
    if 'user' in event:
        # No incluir información sensible del usuario
        user_data = event['user']
        safe_user_data = {
            'id': user_data.get('id'),
            'email': user_data.get('email', '').split('@')[0] + '@***' if user_data.get('email') else None,
            'role': user_data.get('role'),
        }
        event['user'] = safe_user_data
    
    return event

def filter_transactions(event, hint):
    """Filtrar transacciones de performance"""
    
    # No trackear health checks
    if event.get('transaction'):
        transaction_name = event['transaction']
        
        ignored_transactions = [
            '/health',
            '/metrics',
            '/favicon.ico',
            '/robots.txt',
        ]
        
        for ignored in ignored_transactions:
            if ignored in transaction_name:
                return None
    
    return event

def capture_ml_error(error, context=None):
    """Función helper para capturar errores de ML específicamente"""
    
    with sentry_sdk.configure_scope() as scope:
        scope.set_tag('category', 'ml')
        scope.set_tag('component', 'model_prediction')
        
        if context:
            for key, value in context.items():
                scope.set_context(key, value)
        
        sentry_sdk.capture_exception(error)

def capture_security_event(event_type, details):
    """Capturar eventos de seguridad"""
    
    with sentry_sdk.configure_scope() as scope:
        scope.set_tag('category', 'security')
        scope.set_tag('event_type', event_type)
        scope.set_level('warning')
        
        sentry_sdk.capture_message(
            f"Security event: {event_type}",
            level='warning',
            extras=details
        )

def capture_performance_issue(endpoint, response_time, details=None):
    """Capturar problemas de performance"""
    
    # Solo reportar si el tiempo de respuesta es muy alto
    if response_time > 5000:  # 5 segundos
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag('category', 'performance')
            scope.set_tag('endpoint', endpoint)
            scope.set_context('performance', {
                'response_time_ms': response_time,
                'endpoint': endpoint,
                **(details or {})
            })
            
            sentry_sdk.capture_message(
                f"Slow response: {endpoint} took {response_time}ms",
                level='warning'
            )

# Configuración de breadcrumbs personalizados
def add_ml_breadcrumb(message, data=None, level='info'):
    """Agregar breadcrumb para operaciones de ML"""
    sentry_sdk.add_breadcrumb(
        message=message,
        category='ml',
        level=level,
        data=data or {}
    )

def add_user_action_breadcrumb(action, user_id=None, details=None):
    """Agregar breadcrumb para acciones de usuario"""
    sentry_sdk.add_breadcrumb(
        message=f"User action: {action}",
        category='user_action',
        level='info',
        data={
            'user_id': user_id,
            'action': action,
            **(details or {})
        }
    )