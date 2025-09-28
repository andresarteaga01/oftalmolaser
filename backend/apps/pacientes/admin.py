from django.contrib import admin
from .models import Paciente, ImagenPaciente

@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = ('nombres', 'apellidos', 'ci', 'tipo_diabetes', 'fecha_creacion')
    search_fields = ('nombres', 'apellidos', 'ci')
    list_filter = ('tipo_diabetes', 'genero', 'estado_dilatacion')

@admin.register(ImagenPaciente)
class ImagenPacienteAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'resultado', 'confianza', 'fecha_creacion')
    search_fields = ('paciente__nombres', 'paciente__apellidos')
    list_filter = ('resultado',)
