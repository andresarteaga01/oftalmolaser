import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class UserAccountManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('El usuario debe tener un email')
        if not username:
            raise ValueError('El usuario debe tener un nombre de usuario')

        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.is_active = True
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        user = self.create_user(email, username, password, **extra_fields)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class UserAccount(AbstractBaseUser, PermissionsMixin):
    # Identificación interna
    account = models.CharField(max_length=255, unique=True, blank=True, editable=False)

    # Credenciales
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(max_length=255, unique=True)

    # Datos personales
    first_name = models.CharField(max_length=255, blank=True)
    last_name = models.CharField(max_length=255, blank=True)

    # Estado del usuario
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_created = models.DateTimeField(auto_now_add=True)

    # Rol
    class Roles:
        ADMINISTRADOR = 'administrador'
        ESPECIALISTA = 'especialista'
        MEDICO = 'medico'
        CHOICES = [
            (ADMINISTRADOR, 'Administrador'),
            (ESPECIALISTA, 'Especialista'),
            (MEDICO, 'Médico'),
        ]

    role = models.CharField(max_length=15, choices=Roles.CHOICES, default=Roles.MEDICO)

    objects = UserAccountManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def save(self, *args, **kwargs):
        if not self.account:
            self.account = str(uuid.uuid4())
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email