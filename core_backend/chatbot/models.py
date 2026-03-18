from django.db import models


class OAuthSession(models.Model):
    """
    FIX: Replaces the in-memory `user_sessions` dict in api.py.
    Stores OAuth credentials in the DB so sessions survive server restarts
    and work correctly across multiple workers.
    """
    user_id       = models.CharField(max_length=255, unique=True)
    token         = models.TextField(blank=True, default="")
    refresh_token = models.TextField(blank=True, default="")
    token_uri     = models.CharField(max_length=500, blank=True, default="")
    client_id     = models.CharField(max_length=255, blank=True, default="")
    client_secret = models.CharField(max_length=255, blank=True, default="")
    scopes        = models.TextField(blank=True, default="[]")  # JSON list
    display_name  = models.CharField(max_length=255, blank=True, default="")
    email         = models.EmailField(blank=True, default="")
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "OAuth Session"

    def __str__(self):
        return f"OAuthSession({self.user_id})"


class UserProfile(models.Model):
    """Stores Google OAuth profile — real name + email (replaces hardcoded user_id display)."""
    user_id      = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(max_length=255, blank=True, default="")
    email        = models.EmailField(blank=True, default="")
    avatar_url   = models.URLField(blank=True, null=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    last_seen    = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.display_name} ({self.user_id})"


class ChatSession(models.Model):
    """Tracks a specific conversation tied to a Google Drive item."""
    user_id      = models.CharField(max_length=255)
    folder_id    = models.CharField(max_length=255)
    folder_name  = models.CharField(max_length=500, blank=True, default="")
    session_name = models.CharField(max_length=255, blank=True, default="")
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user_id} — {self.session_name or self.folder_name or self.folder_id}"


class InteractionLog(models.Model):
    """Logs every single question and answer (FR-007)."""
    session          = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="interactions")
    user_query       = models.TextField()
    ai_response      = models.TextField()
    response_time_ms = models.IntegerField(help_text="Tracked to ensure < 3 seconds (NFR-001)")
    ticket_raised    = models.BooleanField(default=False, help_text="Did this result in a support ticket? (FR-006)")
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Query: {self.user_query[:50]}..."


class SourceDocument(models.Model):
    """Tracks which Drive documents were used to answer a specific query (FR-004)."""
    interaction   = models.ForeignKey(InteractionLog, on_delete=models.CASCADE, related_name="sources")
    document_name = models.CharField(max_length=255)
    document_link = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.document_name