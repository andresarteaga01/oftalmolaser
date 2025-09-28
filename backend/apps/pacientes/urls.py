from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PacienteViewSet,
    PacienteSearchAPIView,
    PacienteDiagnosticoAPIView,
    PreprocessImageAPIView,
    PrediccionPacienteAPIView,
    buscar_pacientes,
    upload_imagen_paciente,
    dashboard_stats,
    admin_stats,
    medico_stats,
    generar_gradcam_solo,
    generar_gradcam_clinico,
    generar_gradcam_profesional_medico,
    # Nuevos endpoints profesionales
    enhanced_prediction,
    generate_patient_pdf_report,
    generate_batch_pdf_reports,
)

# 🔁 Rutas automáticas del ViewSet (CRUD básico: listar, crear, actualizar, eliminar)
router = DefaultRouter()
router.register(r'', PacienteViewSet, basename='pacientes')

urlpatterns = [
    # ========== 🚀 NUEVOS ENDPOINTS PROFESIONALES ==========
    # Predicción con confianza mejorada
    path('enhanced-prediction/', enhanced_prediction, name='enhanced-prediction'),

    # Reportes PDF profesionales
    path('<int:paciente_id>/pdf-report/', generate_patient_pdf_report, name='generate-pdf-report'),
    path('batch-pdf-reports/', generate_batch_pdf_reports, name='batch-pdf-reports'),

    # ========== RUTAS OPTIMIZADAS ==========
    # Dashboard y estadísticas
    path('dashboard/stats/', dashboard_stats, name='dashboard-stats'),
    path('dashboard/admin-stats/', admin_stats, name='admin-stats'),
    path('dashboard/medico-stats/', medico_stats, name='medico-stats'),

    # Búsqueda mejorada
    path('buscar/', buscar_pacientes, name='buscar-pacientes-new'),

    # Upload de imágenes
    path('<int:paciente_id>/upload/', upload_imagen_paciente, name='upload-imagen'),

    # ⭐ GradCAM profesional médico (PREMIUM)
    path('gradcam-profesional/', generar_gradcam_profesional_medico, name='generar-gradcam-profesional-medico'),

    # GradCAM clínico de alta calidad para web
    path('gradcam-clinico/', generar_gradcam_clinico, name='generar-gradcam-clinico'),

    # GradCAM bajo demanda (modo híbrido)
    path('gradcam/', generar_gradcam_solo, name='generar-gradcam'),
    
    # ========== RUTAS ORIGINALES ==========
    # Búsqueda por DNI o nombre/apellido
    path('buscar-old/', PacienteSearchAPIView.as_view(), name='buscar-paciente'),

    # Diagnóstico sobre la imagen principal
    path('<int:pk>/diagnostico/', PacienteDiagnosticoAPIView.as_view(), name='diagnostico-paciente'),

    # Preprocesamiento de una imagen individual
    path('preprocesar/', PreprocessImageAPIView.as_view(), name='preprocesar-imagen'),

    # Predicción por múltiples imágenes asociadas a un paciente
    path('predecir/', PrediccionPacienteAPIView.as_view(), name='predecir-paciente'),
]

# Incluir rutas CRUD del ViewSet (GET, POST, PUT, DELETE)
urlpatterns += router.urls