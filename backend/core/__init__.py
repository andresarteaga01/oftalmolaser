# Esto asegura que Celery se importe cuando Django se inicia
from .celery import app as celery_app

__all__ = ('celery_app',)