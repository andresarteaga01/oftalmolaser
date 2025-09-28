from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import UserAccount
from .forms import CustomUserCreationForm  # <== Aquí importa el formulario

class UserAccountAdmin(BaseUserAdmin):
    add_form = CustomUserCreationForm  # <== Aquí se usa el formulario personalizado
    class Media:
        js = ('api/js/show_password_toggle.js',)  # Ruta relativa al STATIC

    list_display = ('id', 'email', 'username', 'role', 'is_staff', 'is_superuser')
    list_filter = ('role', 'is_staff', 'is_superuser')
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions', 'role')}),
        ('Dates', {'fields': ('last_login',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'role')}
        ),
    )
    search_fields = ('email', 'username')
    ordering = ('email',)

admin.site.register(UserAccount, UserAccountAdmin)