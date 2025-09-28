# Generated migration for role updates

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        # Actualizar las opciones de roles
        migrations.AlterField(
            model_name='useraccount',
            name='role',
            field=models.CharField(
                choices=[
                    ('administrador', 'Administrador'), 
                    ('especialista', 'Especialista'), 
                    ('medico', 'Médico')
                ], 
                default='medico', 
                max_length=15
            ),
        ),
        # Migrar datos existentes
        migrations.RunSQL(
            "UPDATE api_useraccount SET role = 'administrador' WHERE role = 'admin';",
            reverse_sql="UPDATE api_useraccount SET role = 'admin' WHERE role = 'administrador';"
        ),
        migrations.RunSQL(
            "UPDATE api_useraccount SET role = 'especialista' WHERE role = 'tecnico';",
            reverse_sql="UPDATE api_useraccount SET role = 'tecnico' WHERE role = 'especialista';"
        ),
    ]
