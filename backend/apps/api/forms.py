from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import UserAccount

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = UserAccount
        fields = ('email', 'username', 'first_name', 'last_name', 'password1', 'password2', 'role')