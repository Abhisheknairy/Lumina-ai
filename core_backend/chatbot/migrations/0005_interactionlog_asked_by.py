"""
Migration 0005 — add asked_by_user_id to InteractionLog

Put this file at:
  chatbot/migrations/0005_interactionlog_asked_by.py

Then run:
  python manage.py migrate
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chatbot", "0004_roles_kb_audit"),
    ]

    operations = [
        migrations.AddField(
            model_name="interactionlog",
            name="asked_by_user_id",
            field=models.CharField(
                max_length=255,
                blank=True,
                default="",
                help_text="user_id of the person who asked this question (for shared KB sessions)",
            ),
        ),
        migrations.AddField(
            model_name="interactionlog",
            name="asked_by_display_name",
            field=models.CharField(
                max_length=255,
                blank=True,
                default="",
                help_text="Display name snapshot at time of query — denormalised for speed",
            ),
        ),
        migrations.AddField(
            model_name="interactionlog",
            name="asked_by_email",
            field=models.EmailField(
                blank=True,
                default="",
                help_text="Email snapshot at time of query",
            ),
        ),
    ]
