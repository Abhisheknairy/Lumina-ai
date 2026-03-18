from django.db import models
from django.contrib.auth.models import User

class ChatSession(models.Model): # <--- Fixed here
    """Tracks a specific conversation tied to a Google Drive folder."""
    user_id = models.CharField(max_length=255) # We can use standard strings for now like 'test_user_1'
    folder_id = models.CharField(max_length=255)
    folder_name = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_id} - {self.folder_name or self.folder_id}"

class InteractionLog(models.Model): # <--- Fixed here
    """Logs every single question and answer (FR-007)."""
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="interactions")
    user_query = models.TextField()
    ai_response = models.TextField()
    response_time_ms = models.IntegerField(help_text="Tracked to ensure < 3 seconds (NFR-001)")
    ticket_raised = models.BooleanField(default=False, help_text="Did this result in a support ticket? (FR-006)")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Query: {self.user_query[:50]}..."

class SourceDocument(models.Model): # <--- Fixed here
    """Tracks which G-Drive documents were used to answer a specific query."""
    interaction = models.ForeignKey(InteractionLog, on_delete=models.CASCADE, related_name="sources")
    document_name = models.CharField(max_length=255)
    document_link = models.URLField(blank=True, null=True) # To satisfy FR-004

    def __str__(self):
        return self.document_name