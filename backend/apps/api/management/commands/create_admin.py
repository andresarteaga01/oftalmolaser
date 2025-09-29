from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create admin superuser if it does not exist'

    def handle(self, *args, **options):
        User = get_user_model()

        if not User.objects.filter(email='admin@gmail.com').exists():
            User.objects.create_superuser(
                email='admin@gmail.com',
                username='admin',
                password='Admin1'
            )
            self.stdout.write(
                self.style.SUCCESS('✅ Superuser admin@gmail.com created successfully!')
            )
        else:
            # Si ya existe, resetear la contraseña
            user = User.objects.get(email='admin@gmail.com')
            user.set_password('Admin1')
            user.is_superuser = True
            user.is_staff = True
            user.save()
            self.stdout.write(
                self.style.SUCCESS('✅ Superuser admin@gmail.com password reset to Admin1')
            )