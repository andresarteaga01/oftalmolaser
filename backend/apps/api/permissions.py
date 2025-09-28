from rest_framework.permissions import BasePermission
from .models import UserAccount

class IsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserAccount.Roles.ADMINISTRADOR

class IsEspecialista(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserAccount.Roles.ESPECIALISTA

class IsMedico(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserAccount.Roles.MEDICO

class IsEspecialistaOrAdministrador(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserAccount.Roles.ESPECIALISTA,
            UserAccount.Roles.ADMINISTRADOR
        ]

class IsMedicoOrEspecialista(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserAccount.Roles.MEDICO,
            UserAccount.Roles.ESPECIALISTA
        ]

# Permisos específicos por funcionalidad
class CanRegisterPatients(BasePermission):
    """Médico y Administrador pueden registrar pacientes"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserAccount.Roles.MEDICO,
            UserAccount.Roles.ADMINISTRADOR
        ]

class CanPerformAIAnalysis(BasePermission):
    """Médico y Administrador pueden realizar análisis IA"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserAccount.Roles.MEDICO,
            UserAccount.Roles.ADMINISTRADOR
        ]

class CanViewReports(BasePermission):
    """Especialista y Administrador pueden ver reportes"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserAccount.Roles.ESPECIALISTA,
            UserAccount.Roles.ADMINISTRADOR
        ]

class CanViewMetrics(BasePermission):
    """Especialista y Administrador pueden ver métricas"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            UserAccount.Roles.ESPECIALISTA,
            UserAccount.Roles.ADMINISTRADOR
        ] 