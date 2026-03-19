import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chatbot", "0003_oauthsession"),
    ]

    operations = [
        # 1. Add role field to UserProfile
        migrations.AddField(
            model_name="userprofile",
            name="role",
            field=models.CharField(
                choices=[("super_admin", "Super Admin"), ("admin", "Admin"), ("user", "User")],
                default="user",
                max_length=20,
            ),
        ),

        # 2. KnowledgeBase
        migrations.CreateModel(
            name="KnowledgeBase",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",         models.CharField(max_length=255)),
                ("description",  models.TextField(blank=True, default="")),
                ("folder_id",    models.CharField(max_length=255)),
                ("folder_name",  models.CharField(blank=True, default="", max_length=500)),
                ("created_by",   models.CharField(max_length=255)),
                ("is_active",    models.BooleanField(default=True)),
                ("invite_token", models.CharField(blank=True, default="", max_length=64, unique=True)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("updated_at",   models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),

        # 3. KBMembership
        migrations.CreateModel(
            name="KBMembership",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kb", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="chatbot.knowledgebase")),
                ("user_id",    models.CharField(blank=True, default="", max_length=255)),
                ("user_email", models.EmailField()),
                ("role",       models.CharField(choices=[("viewer", "Viewer"), ("editor", "Editor")], default="viewer", max_length=10)),
                ("invited_at", models.DateTimeField(auto_now_add=True)),
                ("accepted",   models.BooleanField(default=False)),
            ],
            options={"unique_together": {("kb", "user_email")}},
        ),

        # 4. AdminAuditLog
        migrations.CreateModel(
            name="AdminAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("actor_user_id",  models.CharField(max_length=255)),
                ("actor_email",    models.EmailField(blank=True, default="")),
                ("action",         models.CharField(max_length=100)),
                ("target_user_id", models.CharField(blank=True, default="", max_length=255)),
                ("target_email",   models.EmailField(blank=True, default="")),
                ("detail",         models.JSONField(default=dict)),
                ("timestamp",      models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-timestamp"]},
        ),

        # 5. Add kb FK to ChatSession
        migrations.AddField(
            model_name="chatsession",
            name="kb",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sessions",
                to="chatbot.knowledgebase",
            ),
        ),
    ]
