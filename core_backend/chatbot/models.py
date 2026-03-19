from django.db import models

# ── Role constants ─────────────────────────────────────────────────────
SUPER_ADMIN_EMAIL = "n.abhishek@isteer.com"

ROLE_SUPER_ADMIN = "super_admin"
ROLE_ADMIN       = "admin"
ROLE_USER        = "user"
ROLE_CHOICES     = [
    (ROLE_SUPER_ADMIN, "Super Admin"),
    (ROLE_ADMIN,       "Admin"),
    (ROLE_USER,        "User"),
]

KB_ROLE_VIEWER  = "viewer"
KB_ROLE_EDITOR  = "editor"
KB_ROLE_CHOICES = [(KB_ROLE_VIEWER, "Viewer"), (KB_ROLE_EDITOR, "Editor")]


class OAuthSession(models.Model):
    """DB-backed OAuth credentials — survives server restarts."""
    user_id       = models.CharField(max_length=255, unique=True)
    token         = models.TextField(blank=True, default="")
    refresh_token = models.TextField(blank=True, default="")
    token_uri     = models.CharField(max_length=500, blank=True, default="")
    client_id     = models.CharField(max_length=255, blank=True, default="")
    client_secret = models.CharField(max_length=255, blank=True, default="")
    scopes        = models.TextField(blank=True, default="[]")
    display_name  = models.CharField(max_length=255, blank=True, default="")
    email         = models.EmailField(blank=True, default="")
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "OAuth Session"

    def __str__(self):
        return f"OAuthSession({self.user_id})"


class UserProfile(models.Model):
    """
    Google OAuth profile + platform role.
    Role auto-assigned on first login:
      - super_admin if email == SUPER_ADMIN_EMAIL
      - user otherwise (can be promoted to admin by super_admin)
    """
    user_id      = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(max_length=255, blank=True, default="")
    email        = models.EmailField(blank=True, default="")
    avatar_url   = models.URLField(blank=True, null=True)
    role         = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)
    created_at   = models.DateTimeField(auto_now_add=True)
    last_seen    = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.display_name} ({self.role})"

    @property
    def is_super_admin(self):
        return self.role == ROLE_SUPER_ADMIN

    @property
    def is_admin_or_above(self):
        return self.role in (ROLE_SUPER_ADMIN, ROLE_ADMIN)


class KnowledgeBase(models.Model):
    """
    A named shared knowledge base tied to a Google Drive folder.
    Created by an admin. Members can chat against its documents.
    invite_token is a unique shareable token sent to members via link.
    """
    name         = models.CharField(max_length=255)
    description  = models.TextField(blank=True, default="")
    folder_id    = models.CharField(max_length=255)
    folder_name  = models.CharField(max_length=500, blank=True, default="")
    created_by   = models.CharField(max_length=255)        # user_id of creator
    is_active    = models.BooleanField(default=True)
    invite_token = models.CharField(max_length=64, unique=True, blank=True, default="")
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} (by {self.created_by})"


class KBMembership(models.Model):
    """Who has access to which KnowledgeBase."""
    kb         = models.ForeignKey(KnowledgeBase, on_delete=models.CASCADE, related_name="memberships")
    user_id    = models.CharField(max_length=255, blank=True, default="")
    user_email = models.EmailField()
    role       = models.CharField(max_length=10, choices=KB_ROLE_CHOICES, default=KB_ROLE_VIEWER)
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted   = models.BooleanField(default=False)

    class Meta:
        unique_together = ("kb", "user_email")

    def __str__(self):
        return f"{self.user_email} → {self.kb.name} ({self.role})"


class AdminAuditLog(models.Model):
    """Immutable log of every admin action. Never deleted."""
    actor_user_id  = models.CharField(max_length=255)
    actor_email    = models.EmailField(blank=True, default="")
    action         = models.CharField(max_length=100)
    target_user_id = models.CharField(max_length=255, blank=True, default="")
    target_email   = models.EmailField(blank=True, default="")
    detail         = models.JSONField(default=dict)
    timestamp      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.actor_email} → {self.action} @ {self.timestamp:%Y-%m-%d %H:%M}"


class ChatSession(models.Model):
    """
    Personal session (kb=None) or shared KB session (kb set).
    Shared sessions visible to all KB members.
    """
    user_id      = models.CharField(max_length=255)
    folder_id    = models.CharField(max_length=255)
    folder_name  = models.CharField(max_length=500, blank=True, default="")
    session_name = models.CharField(max_length=255, blank=True, default="")
    kb           = models.ForeignKey(
        KnowledgeBase, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="sessions"
    )
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        prefix = f"[KB:{self.kb.name}] " if self.kb else ""
        return f"{prefix}{self.user_id} — {self.session_name or self.folder_name}"


class InteractionLog(models.Model):
    """Logs every question + answer (FR-007)."""
    session          = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="interactions")
    user_query       = models.TextField()
    ai_response      = models.TextField()
    response_time_ms = models.IntegerField(help_text="Tracked to ensure < 3 seconds (NFR-001)")
    ticket_raised    = models.BooleanField(default=False)
    
    # ADD THESE THREE LINES:
    asked_by_user_id = models.CharField(max_length=255, blank=True, default="")
    asked_by_display_name = models.CharField(max_length=255, blank=True, default="")
    asked_by_email   = models.EmailField(blank=True, default="")
    
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Query: {self.user_query[:50]}..."


class SourceDocument(models.Model):
    """Which Drive documents answered a query (FR-004)."""
    interaction   = models.ForeignKey(InteractionLog, on_delete=models.CASCADE, related_name="sources")
    document_name = models.CharField(max_length=255)
    document_link = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.document_name