from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chatbot', '0001_initial'),
    ]

    operations = [
        # Add UserProfile table
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id',      models.CharField(max_length=255, unique=True)),
                ('display_name', models.CharField(blank=True, default='', max_length=255)),
                ('email',        models.EmailField(blank=True, default='')),
                ('avatar_url',   models.URLField(blank=True, null=True)),
                ('created_at',   models.DateTimeField(auto_now_add=True)),
                ('last_seen',    models.DateTimeField(auto_now=True)),
            ],
        ),
        # Add session_name to ChatSession
        migrations.AddField(
            model_name='chatsession',
            name='session_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        # Add updated_at to ChatSession
        migrations.AddField(
            model_name='chatsession',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        # Fix folder_name default (was nullable, make it a proper default)
        migrations.AlterField(
            model_name='chatsession',
            name='folder_name',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
    ]