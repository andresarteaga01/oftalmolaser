from django.urls import path
from numpy import delete
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView,
    MeView,
    AdminCreateUserView,
    ListUsersView,  #  vista para listar usuarios desde el frontend
    DeleteUserView,
    UpdateUserView,
)

urlpatterns = [
    #  Autenticación con JWT
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    #  Registro y perfil
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', MeView.as_view(), name='me'),

    #  Administración (solo admin)
    path('admin/create-user/', AdminCreateUserView.as_view(), name='admin_create_user'),
    path('admin/users/', ListUsersView.as_view(), name='admin_list_users'),  #  nueva ruta
    path('admin/users/<int:pk>/', DeleteUserView.as_view(), name='admin_delete_user'),  # DELETE para eliminar
    path('admin/users/<int:pk>/update/', UpdateUserView.as_view(), name='admin_update_user'),  # PUT para actualizar
]