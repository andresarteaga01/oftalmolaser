import time
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class RateLimitMiddleware:
    """Middleware para rate limiting por IP y usuario"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Rate limiting para endpoints críticos
        if self.should_rate_limit(request.path):
            if not self.check_rate_limit(request):
                return JsonResponse({
                    'error': 'Demasiadas peticiones. Intente más tarde.'
                }, status=429)
        
        response = self.get_response(request)
        return response
    
    def should_rate_limit(self, path):
        """Determinar si el endpoint necesita rate limiting"""
        critical_endpoints = [
            '/auth/jwt/create/',  # Login
            '/api/pacientes/',    # Crear paciente
            '/api/pacientes/upload/',  # Upload de imágenes
        ]
        return any(path.startswith(endpoint) for endpoint in critical_endpoints)
    
    def check_rate_limit(self, request):
        """Verificar límites de rate"""
        client_ip = self.get_client_ip(request)
        # Verificar si user existe y está autenticado (puede no estar disponible aún)
        user_id = None
        if hasattr(request, 'user') and hasattr(request.user, 'is_authenticated'):
            user_id = request.user.id if request.user.is_authenticated else None
        
        # Rate limits diferentes por endpoint
        if '/auth/jwt/create/' in request.path:
            # Login: 5 intentos por minuto por IP
            return self.check_limit(f"login_ip_{client_ip}", 5, 60)
        
        elif '/api/pacientes/upload/' in request.path:
            # Upload: 10 archivos por minuto por usuario
            if user_id:
                return self.check_limit(f"upload_user_{user_id}", 10, 60)
            else:
                return self.check_limit(f"upload_ip_{client_ip}", 5, 60)
        
        elif '/api/pacientes/' in request.path and request.method == 'POST':
            # Crear paciente: 30 por hora por usuario
            if user_id:
                return self.check_limit(f"create_user_{user_id}", 30, 3600)
            
        return True
    
    def check_limit(self, key, limit, window):
        """Verificar límite usando sliding window"""
        current_time = int(time.time())
        window_start = current_time - window
        
        # Obtener requests en la ventana actual
        requests = cache.get(key, [])
        
        # Filtrar requests dentro de la ventana
        requests = [req_time for req_time in requests if req_time > window_start]
        
        # Verificar si excede el límite
        if len(requests) >= limit:
            logger.warning(f"Rate limit exceeded for key: {key}")
            return False
        
        # Agregar request actual y guardar
        requests.append(current_time)
        cache.set(key, requests, window + 60)  # TTL un poco mayor que la ventana
        
        return True
    
    def get_client_ip(self, request):
        """Obtener IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class SecurityHeadersMiddleware:
    """Middleware para headers de seguridad"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Headers de seguridad
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # HSTS en producción
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # CSP básico
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "media-src 'self'; "
            "object-src 'none'; "
            "frame-ancestors 'none';"
        )
        response['Content-Security-Policy'] = csp_policy
        
        return response

class AuditLogMiddleware:
    """Middleware para logging de auditoría"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Log operaciones críticas
        if self.should_audit(request):
            self.log_request(request)
            
        response = self.get_response(request)
        
        # Log respuestas críticas
        if self.should_audit(request) and hasattr(response, 'status_code'):
            self.log_response(request, response)
            
        return response
    
    def should_audit(self, request):
        """Determinar si se debe auditar la request"""
        audit_paths = [
            '/auth/',
            '/api/pacientes/',
            '/admin/',
        ]
        return any(request.path.startswith(path) for path in audit_paths)
    
    def log_request(self, request):
        """Log de request"""
        user = 'Anonymous'
        if hasattr(request, 'user') and hasattr(request.user, 'is_authenticated'):
            user = request.user if request.user.is_authenticated else 'Anonymous'
        client_ip = self.get_client_ip(request)
        
        logger.info(f"AUDIT_REQUEST - User: {user}, IP: {client_ip}, "
                   f"Method: {request.method}, Path: {request.path}")
    
    def log_response(self, request, response):
        """Log de response"""
        user = 'Anonymous'
        if hasattr(request, 'user') and hasattr(request.user, 'is_authenticated'):
            user = request.user if request.user.is_authenticated else 'Anonymous'
        
        if response.status_code >= 400:
            logger.warning(f"AUDIT_ERROR - User: {user}, "
                          f"Path: {request.path}, Status: {response.status_code}")
    
    def get_client_ip(self, request):
        """Obtener IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip