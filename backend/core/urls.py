from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from apps.api.views import health_check, serve_react_app, index_view

urlpatterns = [
    # Health check
    path('api/health/', health_check, name='health-check'),
    
    # Apps propias
    path('api/user/', include('apps.api.urls')),
    path('api/pacientes/', include('apps.pacientes.urls')),

    # Admin
    path('admin/', admin.site.urls),

    # Autenticación con Djoser + JWT
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    
    # Vista principal
    path('', index_view, name='index'),
]

# Archivos media
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Servir archivos del modelo (solo si son necesarios para el frontend)
from django.views.static import serve
import os
urlpatterns += [
    # Endpoint para servir metadata del modelo
    path('api/modelo/metadata/', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'apps/pacientes/modelos'),
        'path': 'retinopathy_model_metadata.json'
    }),
]

# Servir archivos estáticos en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Servir React App para todas las demás rutas del frontend (debe ir al final)
urlpatterns += [
    re_path(r'^(?!api/|admin/|auth/|static/|media/).*$', serve_react_app, name='react-app'),
]