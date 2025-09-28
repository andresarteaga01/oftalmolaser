from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.shortcuts import render
from django.http import HttpResponse
from .models import UserAccount
from .serializers import UserCreateSerializer, UserSerializer
from .permissions import IsAdministrador
import logging

logger = logging.getLogger(__name__)


#  Registro público
class RegisterView(generics.CreateAPIView):
    queryset = UserAccount.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]


#  Registro de usuario por admin
class AdminCreateUserView(generics.CreateAPIView):
    queryset = UserAccount.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsAuthenticated, IsAdministrador]


#  Obtener datos del usuario actual (usado en /me/)
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# Lista de todos los usuarios (para el dashboard del admin)
class ListUsersView(generics.ListAPIView):
    queryset = UserAccount.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdministrador]

    # Eliminar un usuario (solo Admin)
class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdministrador]

    def delete(self, request, pk):
        try:
            # Verificar que el usuario existe
            try:
                user_to_delete = UserAccount.objects.get(pk=pk)
            except UserAccount.DoesNotExist:
                return Response(
                    {'error': 'Usuario no encontrado'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verificar que no sea el mismo usuario logueado
            if user_to_delete.id == request.user.id:
                return Response(
                    {'error': 'No puedes eliminar tu propio usuario'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verificar que el usuario logueado sea administrador
            if request.user.role != UserAccount.Roles.ADMINISTRADOR:
                return Response(
                    {'error': 'Solo los administradores pueden eliminar usuarios'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            user_email = user_to_delete.email
            user_username = user_to_delete.username
            
            # Eliminar el usuario sin triggering de cascada de monitoring
            try:
                # Intentar eliminar normalmente
                user_to_delete.delete()
            except Exception as delete_error:
                # Si falla por el problema de monitoring, usar raw SQL
                if "monitoring_useractivity" in str(delete_error):
                    from django.db import connection
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "DELETE FROM api_useraccount WHERE id = %s", 
                            [user_to_delete.id]
                        )
                else:
                    raise delete_error
            
            logger.info(f"Usuario eliminado exitosamente: {user_email} por admin: {request.user.email}")
            
            return Response(
                {
                    'message': f'Usuario "{user_username}" ({user_email}) eliminado exitosamente',
                    'deleted_user': {
                        'id': pk,
                        'username': user_username,
                        'email': user_email
                    }
                }, 
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Error eliminando usuario ID {pk}: {str(e)}")
            return Response(
                {'error': f'Error interno al eliminar usuario: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Actualizar un usuario (solo Admin)
class UpdateUserView(generics.UpdateAPIView):
    queryset = UserAccount.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsAuthenticated, IsAdministrador]

    def update(self, request, *args, **kwargs):
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            logger.info(f"Usuario actualizado: {instance.email}")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error actualizando usuario: {str(e)}")
            return Response(
                {'error': 'Error al actualizar el usuario'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomTokenObtainPairView(TokenObtainPairView):
    """Vista personalizada para obtener token JWT"""
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Log successful login
            logger.info(f"Successful login for user: {request.data.get('email', 'unknown')}")
            
            # Get user data
            try:
                user = UserAccount.objects.get(email=request.data.get('email'))
                user_data = UserSerializer(user).data
                response.data['user'] = user_data
            except UserAccount.DoesNotExist:
                pass
        
        return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Obtener perfil del usuario actual"""
    try:
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': 'Error getting user profile'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'message': 'Sistema de Retinopatía Diabética funcionando correctamente'
    })

def index_view(request):
    """Vista principal que sirve el frontend React"""
    try:
        return render(request, 'index.html')
    except:
        # Fallback para desarrollo cuando no existe el build
        return HttpResponse("""
        <html>
        <head><title>Retinopatía Diabética - Backend</title></head>
        <body>
            <h1>Backend Django funcionando</h1>
            <p>Para usar la aplicación:</p>
            <ul>
                <li>Frontend React: <a href="http://localhost:3000">http://localhost:3000</a></li>
                <li>Backend API: <a href="/api/health/">http://127.0.0.1:8000/api/health/</a></li>
                <li>Admin Django: <a href="/admin/">http://127.0.0.1:8000/admin/</a></li>
            </ul>
            <p>Para servir el frontend desde Django: <code>cd frontend && npm run build</code></p>
        </body>
        </html>
        """)

def serve_react_app(request, path=''):
    """Servir la aplicación React para todas las rutas del frontend"""
    try:
        return render(request, 'index.html')
    except:
        # Si no existe index.html, redirigir a la vista de desarrollo
        return index_view(request)