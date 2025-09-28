from rest_framework import serializers
from .models import UserAccount


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = UserAccount
        fields = ['email', 'username', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        return UserAccount.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            role=validated_data.get('role', UserAccount.Roles.MEDICO)
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAccount
        fields = [
            'id', 'email', 'username', 'account',
            'first_name', 'last_name', 'role'
        ]