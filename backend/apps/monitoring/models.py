from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

class UserActivity(models.Model):
    """Registro de actividad de usuarios"""
    
    ACTION_CHOICES = [
        ('login', 'Inicio de sesión'),
        ('logout', 'Cierre de sesión'),
        ('create_patient', 'Crear paciente'),
        ('edit_patient', 'Editar paciente'),
        ('delete_patient', 'Eliminar paciente'),
        ('upload_image', 'Subir imagen'),
        ('process_image', 'Procesar imagen ML'),
        ('view_results', 'Ver resultados'),
        ('export_data', 'Exportar datos'),
        ('bulk_operation', 'Operación masiva'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=40, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50, blank=True)  # 'patient', 'image', etc.
    resource_id = models.CharField(max_length=50, blank=True)
    
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    duration_ms = models.IntegerField(null=True, blank=True)  # Duración de la operación
    
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['ip_address', '-timestamp']),
            models.Index(fields=['success', '-timestamp']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        user_str = self.user.email if self.user else 'Anonymous'
        return f"{user_str} - {self.get_action_display()} at {self.timestamp}"

class MLModelMetrics(models.Model):
    """Métricas del modelo de ML"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    model_version = models.CharField(max_length=50)
    
    # Métricas de predicción
    total_predictions = models.IntegerField(default=0)
    successful_predictions = models.IntegerField(default=0)
    failed_predictions = models.IntegerField(default=0)
    
    # Métricas de confianza
    avg_confidence = models.FloatField(null=True, blank=True)
    low_confidence_count = models.IntegerField(default=0)  # Predicciones con confianza < umbral
    
    # Distribución de clases predichas
    class_distribution = models.JSONField(default=dict)
    
    # Métricas de tiempo
    avg_processing_time_ms = models.FloatField(null=True, blank=True)
    max_processing_time_ms = models.FloatField(null=True, blank=True)
    
    # Período de la métrica
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Metadatos
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['model_version', '-period_start']),
            models.Index(fields=['-period_start']),
        ]
        unique_together = ['model_version', 'period_start']
        ordering = ['-period_start']
    
    def __str__(self):
        return f"Metrics {self.model_version} - {self.period_start.date()}"
    
    @property
    def success_rate(self):
        """Tasa de éxito de predicciones"""
        if self.total_predictions == 0:
            return 0
        return (self.successful_predictions / self.total_predictions) * 100
    
    @property
    def reliability_rate(self):
        """Tasa de predicciones confiables"""
        if self.total_predictions == 0:
            return 0
        reliable_count = self.total_predictions - self.low_confidence_count
        return (reliable_count / self.total_predictions) * 100

class SystemHealthMetrics(models.Model):
    """Métricas de salud del sistema"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Métricas de servidor
    cpu_usage_percent = models.FloatField()
    memory_usage_percent = models.FloatField()
    disk_usage_percent = models.FloatField()
    
    # Métricas de base de datos
    db_connections_active = models.IntegerField()
    db_connections_max = models.IntegerField()
    db_query_avg_time_ms = models.FloatField(null=True, blank=True)
    
    # Métricas de cache
    cache_hit_rate = models.FloatField(null=True, blank=True)
    cache_memory_usage_mb = models.FloatField(null=True, blank=True)
    
    # Métricas de Celery
    celery_active_tasks = models.IntegerField(default=0)
    celery_pending_tasks = models.IntegerField(default=0)
    celery_failed_tasks = models.IntegerField(default=0)
    
    # Response times
    api_avg_response_time_ms = models.FloatField(null=True, blank=True)
    api_95th_percentile_ms = models.FloatField(null=True, blank=True)
    
    timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['-timestamp']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"System Health - {self.timestamp}"
    
    @property
    def overall_health_score(self):
        """Score general de salud del sistema (0-100)"""
        scores = []
        
        # CPU score (invertido - menor uso es mejor)
        cpu_score = max(0, 100 - self.cpu_usage_percent)
        scores.append(cpu_score)
        
        # Memory score
        memory_score = max(0, 100 - self.memory_usage_percent)
        scores.append(memory_score)
        
        # Disk score
        disk_score = max(0, 100 - self.disk_usage_percent)
        scores.append(disk_score)
        
        # DB connections score
        if self.db_connections_max > 0:
            db_usage = (self.db_connections_active / self.db_connections_max) * 100
            db_score = max(0, 100 - db_usage)
            scores.append(db_score)
        
        # Cache hit rate score
        if self.cache_hit_rate is not None:
            scores.append(self.cache_hit_rate)
        
        return sum(scores) / len(scores) if scores else 0

class ErrorLog(models.Model):
    """Registro de errores del sistema"""
    
    SEVERITY_CHOICES = [
        ('low', 'Baja'),
        ('medium', 'Media'),
        ('high', 'Alta'),
        ('critical', 'Crítica'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Información del error
    error_type = models.CharField(max_length=100)
    error_message = models.TextField()
    stack_trace = models.TextField(blank=True)
    
    # Contexto
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    url = models.URLField(blank=True)
    method = models.CharField(max_length=10, blank=True)
    
    # Clasificación
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    category = models.CharField(max_length=50, blank=True)  # 'ml', 'auth', 'api', etc.
    
    # Estado
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='resolved_errors'
    )
    
    # Metadatos
    first_occurrence = models.DateTimeField(default=timezone.now)
    last_occurrence = models.DateTimeField(default=timezone.now)
    occurrence_count = models.IntegerField(default=1)
    
    additional_data = models.JSONField(default=dict, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['-last_occurrence']),
            models.Index(fields=['error_type', '-last_occurrence']),
            models.Index(fields=['severity', '-last_occurrence']),
            models.Index(fields=['resolved', '-last_occurrence']),
            models.Index(fields=['category', '-last_occurrence']),
        ]
        ordering = ['-last_occurrence']
    
    def __str__(self):
        return f"{self.error_type} - {self.get_severity_display()}"
    
    def increment_occurrence(self):
        """Incrementar contador de ocurrencias"""
        self.occurrence_count += 1
        self.last_occurrence = timezone.now()
        self.save(update_fields=['occurrence_count', 'last_occurrence'])

class PerformanceMetric(models.Model):
    """Métricas de performance de endpoints específicos"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    endpoint = models.CharField(max_length=200)
    method = models.CharField(max_length=10)
    
    # Métricas de tiempo
    avg_response_time_ms = models.FloatField()
    min_response_time_ms = models.FloatField()
    max_response_time_ms = models.FloatField()
    p95_response_time_ms = models.FloatField()
    p99_response_time_ms = models.FloatField()
    
    # Métricas de requests
    request_count = models.IntegerField()
    success_count = models.IntegerField()
    error_count = models.IntegerField()
    
    # Códigos de estado
    status_code_distribution = models.JSONField(default=dict)
    
    # Período
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['endpoint', '-period_start']),
            models.Index(fields=['-period_start']),
        ]
        unique_together = ['endpoint', 'method', 'period_start']
        ordering = ['-period_start']
    
    def __str__(self):
        return f"{self.method} {self.endpoint} - {self.period_start.date()}"
    
    @property
    def success_rate(self):
        """Tasa de éxito"""
        if self.request_count == 0:
            return 0
        return (self.success_count / self.request_count) * 100
    
    @property
    def error_rate(self):
        """Tasa de error"""
        if self.request_count == 0:
            return 0
        return (self.error_count / self.request_count) * 100