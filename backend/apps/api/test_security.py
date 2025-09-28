import time
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.http import JsonResponse
from unittest.mock import patch, MagicMock
from .middleware import RateLimitMiddleware, SecurityHeadersMiddleware, AuditLogMiddleware

User = get_user_model()

class RateLimitMiddlewareTest(TestCase):
    
    def setUp(self):
        """Configurar factory de requests y middleware"""
        self.factory = RequestFactory()
        self.middleware = RateLimitMiddleware(self._get_response)
        cache.clear()
    
    def _get_response(self, request):
        """Mock response para middleware"""
        return JsonResponse({'status': 'ok'})
    
    def test_non_critical_endpoint_not_rate_limited(self):
        """Test que endpoints no críticos no tienen rate limiting"""
        request = self.factory.get('/some/other/endpoint/')
        response = self.middleware(request)
        
        self.assertEqual(response.status_code, 200)
    
    def test_login_endpoint_rate_limiting(self):
        """Test rate limiting en endpoint de login"""
        # Hacer múltiples requests al endpoint de login
        for i in range(6):  # Límite es 5 por minuto
            request = self.factory.post('/auth/jwt/create/')
            response = self.middleware(request)
            
            if i < 5:
                self.assertEqual(response.status_code, 200)
            else:
                self.assertEqual(response.status_code, 429)
                self.assertIn('Demasiadas peticiones', response.content.decode())
    
    def test_upload_endpoint_rate_limiting_authenticated(self):
        """Test rate limiting en endpoint de upload para usuario autenticado"""
        user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass'
        )
        
        # Hacer múltiples requests de upload
        for i in range(11):  # Límite es 10 por minuto para usuarios
            request = self.factory.post('/api/pacientes/upload/')
            request.user = user  # Usuario autenticado
            response = self.middleware(request)
            
            if i < 10:
                self.assertEqual(response.status_code, 200)
            else:
                self.assertEqual(response.status_code, 429)
    
    def test_rate_limit_sliding_window(self):
        """Test ventana deslizante para rate limiting"""
        # Hacer requests cerca del límite
        for i in range(4):
            request = self.factory.post('/auth/jwt/create/')
            response = self.middleware(request)
            self.assertEqual(response.status_code, 200)
        
        # Esperar que pase la ventana (mock del tiempo)
        with patch('apps.api.middleware.time.time', return_value=time.time() + 70):
            request = self.factory.post('/auth/jwt/create/')
            response = self.middleware(request)
            self.assertEqual(response.status_code, 200)
    
    def test_client_ip_extraction(self):
        """Test extracción correcta de IP del cliente"""
        # IP directa
        request = self.factory.get('/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        ip = self.middleware.get_client_ip(request)
        self.assertEqual(ip, '192.168.1.1')
        
        # IP a través de proxy
        request.META['HTTP_X_FORWARDED_FOR'] = '10.0.0.1, 192.168.1.1'
        ip = self.middleware.get_client_ip(request)
        self.assertEqual(ip, '10.0.0.1')

class SecurityHeadersMiddlewareTest(TestCase):
    
    def setUp(self):
        """Configurar middleware"""
        self.factory = RequestFactory()
        self.middleware = SecurityHeadersMiddleware(self._get_response)
    
    def _get_response(self, request):
        """Mock response para middleware"""
        return JsonResponse({'status': 'ok'})
    
    def test_security_headers_added(self):
        """Test que se agregan headers de seguridad"""
        request = self.factory.get('/')
        response = self.middleware(request)
        
        # Verificar headers de seguridad
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response['X-Frame-Options'], 'DENY')
        self.assertEqual(response['X-XSS-Protection'], '1; mode=block')
        self.assertEqual(response['Referrer-Policy'], 'strict-origin-when-cross-origin')
        self.assertIn('geolocation=()', response['Permissions-Policy'])
    
    def test_csp_header_added(self):
        """Test que se agrega Content Security Policy"""
        request = self.factory.get('/')
        response = self.middleware(request)
        
        csp = response['Content-Security-Policy']
        self.assertIn("default-src 'self'", csp)
        self.assertIn("object-src 'none'", csp)
        self.assertIn("frame-ancestors 'none'", csp)
    
    @patch('django.conf.settings.DEBUG', False)
    def test_hsts_header_in_production(self):
        """Test que HSTS se agrega en producción"""
        request = self.factory.get('/')
        response = self.middleware(request)
        
        self.assertIn('Strict-Transport-Security', response)
        self.assertIn('max-age=31536000', response['Strict-Transport-Security'])

class AuditLogMiddlewareTest(TestCase):
    
    def setUp(self):
        """Configurar middleware y usuario"""
        self.factory = RequestFactory()
        self.middleware = AuditLogMiddleware(self._get_response)
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass'
        )
    
    def _get_response(self, request):
        """Mock response para middleware"""
        return JsonResponse({'status': 'ok'})
    
    def test_audit_critical_endpoints(self):
        """Test que se auditan endpoints críticos"""
        critical_paths = [
            '/auth/jwt/create/',
            '/api/pacientes/',
            '/admin/users/'
        ]
        
        for path in critical_paths:
            with patch('apps.api.middleware.logger') as mock_logger:
                request = self.factory.post(path)
                request.user = self.user
                
                self.middleware(request)
                
                # Verificar que se registró la request
                mock_logger.info.assert_called()
                call_args = mock_logger.info.call_args[0][0]
                self.assertIn('AUDIT_REQUEST', call_args)
                self.assertIn(self.user.email, call_args)
    
    def test_no_audit_non_critical_endpoints(self):
        """Test que no se auditan endpoints no críticos"""
        with patch('apps.api.middleware.logger') as mock_logger:
            request = self.factory.get('/some/other/endpoint/')
            request.user = self.user
            
            self.middleware(request)
            
            # No debería haberse llamado el logger
            mock_logger.info.assert_not_called()
    
    def test_error_response_logging(self):
        """Test logging de respuestas de error"""
        def error_response(request):
            return JsonResponse({'error': 'test error'}, status=400)
        
        middleware = AuditLogMiddleware(error_response)
        
        with patch('apps.api.middleware.logger') as mock_logger:
            request = self.factory.post('/api/pacientes/')
            request.user = self.user
            
            response = middleware(request)
            
            # Verificar que se registró el error
            mock_logger.warning.assert_called()
            call_args = mock_logger.warning.call_args[0][0]
            self.assertIn('AUDIT_ERROR', call_args)
            self.assertIn('Status: 400', call_args)
    
    def test_anonymous_user_logging(self):
        """Test logging para usuario anónimo"""
        from django.contrib.auth.models import AnonymousUser
        
        with patch('apps.api.middleware.logger') as mock_logger:
            request = self.factory.post('/auth/jwt/create/')
            request.user = AnonymousUser()
            
            self.middleware(request)
            
            mock_logger.info.assert_called()
            call_args = mock_logger.info.call_args[0][0]
            self.assertIn('Anonymous', call_args)

class SecurityIntegrationTest(TestCase):
    """Tests de integración para funciones de seguridad"""
    
    def setUp(self):
        """Configurar datos de prueba"""
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass'
        )
    
    def test_middleware_stack_integration(self):
        """Test que todos los middlewares funcionan juntos"""
        # Crear stack de middlewares
        def final_response(request):
            return JsonResponse({'status': 'ok'})
        
        # Aplicar middlewares en orden
        audit_middleware = AuditLogMiddleware(final_response)
        security_middleware = SecurityHeadersMiddleware(audit_middleware)
        rate_limit_middleware = RateLimitMiddleware(security_middleware)
        
        # Hacer request
        request = self.factory.post('/api/pacientes/')
        request.user = self.user
        
        with patch('apps.api.middleware.logger'):
            response = rate_limit_middleware(request)
        
        # Verificar que funciona y tiene headers de seguridad
        self.assertEqual(response.status_code, 200)
        self.assertIn('X-Content-Type-Options', response)
        self.assertIn('X-Frame-Options', response)
    
    @patch('apps.api.middleware.logger')
    def test_rate_limit_with_audit_logging(self, mock_logger):
        """Test que rate limiting se registra en audit log"""
        # Configurar middleware
        def final_response(request):
            return JsonResponse({'status': 'ok'})
        
        audit_middleware = AuditLogMiddleware(final_response)
        rate_limit_middleware = RateLimitMiddleware(audit_middleware)
        
        # Hacer múltiples requests para disparar rate limit
        for i in range(6):
            request = self.factory.post('/auth/jwt/create/')
            request.user = self.user
            
            response = rate_limit_middleware(request)
            
            if i == 5:  # Request que dispara rate limit
                self.assertEqual(response.status_code, 429)
        
        # Verificar que se registraron las requests en audit
        self.assertGreaterEqual(mock_logger.info.call_count, 5)