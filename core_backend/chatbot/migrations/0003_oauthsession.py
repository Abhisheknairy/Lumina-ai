from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chatbot", "0002_userprofile_session_name"),
    ]

    operations = [
        migrations.CreateModel(
            name="OAuthSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("user_id",       models.CharField(max_length=255, unique=True)),
                ("token",         models.TextField(blank=True, default="")),
                ("refresh_token", models.TextField(blank=True, default="")),
                ("token_uri",     models.CharField(max_length=500, blank=True, default="")),
                ("client_id",     models.CharField(max_length=255, blank=True, default="")),
                ("client_secret", models.CharField(max_length=255, blank=True, default="")),
                ("scopes",        models.TextField(blank=True, default="[]")),
                ("display_name",  models.CharField(max_length=255, blank=True, default="")),
                ("email",         models.EmailField(blank=True, default="")),
                ("created_at",    models.DateTimeField(auto_now_add=True)),
                ("updated_at",    models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "OAuth Session"},
        ),
    ]