from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Avg, Count
from .models import ChatSession, InteractionLog, SourceDocument


# ------------------------------------------------------------------
# INLINE: Show SourceDocuments inside InteractionLog detail view
# ------------------------------------------------------------------
class SourceDocumentInline(admin.TabularInline):
    model = SourceDocument
    extra = 0
    readonly_fields = ('document_name', 'clickable_link')
    fields = ('document_name', 'clickable_link')

    def clickable_link(self, obj):
        """FR-004: Render a clickable link to the source Drive document."""
        if obj.document_link:
            return format_html(
                '<a href="{}" target="_blank" style="color:#1a73e8;">Open in Drive ↗</a>',
                obj.document_link
            )
        return "—"
    clickable_link.short_description = "Drive Link"


# ------------------------------------------------------------------
# INLINE: Show InteractionLogs inside ChatSession detail view
# ------------------------------------------------------------------
class InteractionLogInline(admin.TabularInline):
    model = InteractionLog
    extra = 0
    readonly_fields = ('user_query', 'ai_response_short', 'response_time_ms', 'ticket_raised', 'created_at')
    fields = ('user_query', 'ai_response_short', 'response_time_ms', 'ticket_raised', 'created_at')

    def ai_response_short(self, obj):
        return obj.ai_response[:120] + "..." if len(obj.ai_response) > 120 else obj.ai_response
    ai_response_short.short_description = "AI Response (preview)"


# ------------------------------------------------------------------
# CHATSESSION ADMIN — NFR-004
# ------------------------------------------------------------------
@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'folder_name', 'folder_id', 'total_interactions', 'tickets_raised', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user_id', 'folder_name', 'folder_id')
    readonly_fields = ('created_at', 'total_interactions', 'tickets_raised')
    ordering = ('-created_at',)
    inlines = [InteractionLogInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _total_interactions=Count('interactions'),
            _tickets_raised=Count('interactions', filter=__import__('django').db.models.Q(interactions__ticket_raised=True))
        )

    def total_interactions(self, obj):
        return obj._total_interactions
    total_interactions.admin_order_field = '_total_interactions'
    total_interactions.short_description = "Total Queries"

    def tickets_raised(self, obj):
        count = obj._tickets_raised
        color = "#d93025" if count > 0 else "#188038"
        return format_html('<span style="color:{}; font-weight:bold;">{}</span>', color, count)
    tickets_raised.admin_order_field = '_tickets_raised'
    tickets_raised.short_description = "Tickets Raised"


# ------------------------------------------------------------------
# INTERACTIONLOG ADMIN — FR-007, NFR-001, NFR-004
# ------------------------------------------------------------------
@admin.register(InteractionLog)
class InteractionLogAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'session_user', 'query_preview', 'response_time_badge',
        'ticket_raised', 'nfr001_status', 'created_at'
    )
    list_filter = ('ticket_raised', 'created_at', 'session__user_id')
    search_fields = ('user_query', 'ai_response', 'session__user_id')
    readonly_fields = ('session', 'user_query', 'ai_response', 'response_time_ms', 'ticket_raised', 'created_at')
    ordering = ('-created_at',)
    inlines = [SourceDocumentInline]

    # Actions
    actions = ['mark_ticket_raised', 'mark_ticket_resolved']

    def session_user(self, obj):
        return obj.session.user_id
    session_user.short_description = "User"
    session_user.admin_order_field = 'session__user_id'

    def query_preview(self, obj):
        return obj.user_query[:80] + "..." if len(obj.user_query) > 80 else obj.user_query
    query_preview.short_description = "Query"

    def response_time_badge(self, obj):
        """NFR-001: Highlight responses that exceeded 3 seconds."""
        ms = obj.response_time_ms
        if ms > 3000:
            color, label = "#d93025", f"⚠ {ms}ms"
        elif ms > 1500:
            color, label = "#f29900", f"{ms}ms"
        else:
            color, label = "#188038", f"✓ {ms}ms"
        return format_html(
            '<span style="color:{}; font-weight:600;">{}</span>', color, label
        )
    response_time_badge.short_description = "Response Time"
    response_time_badge.admin_order_field = 'response_time_ms'

    def nfr001_status(self, obj):
        """Shows pass/fail for the < 3 second NFR-001 requirement."""
        if obj.response_time_ms <= 3000:
            return format_html('<span style="color:#188038; font-weight:bold;">✓ PASS</span>')
        return format_html('<span style="color:#d93025; font-weight:bold;">✗ FAIL</span>')
    nfr001_status.short_description = "NFR-001 (<3s)"

    @admin.action(description="Mark selected as ticket raised")
    def mark_ticket_raised(self, request, queryset):
        queryset.update(ticket_raised=True)

    @admin.action(description="Mark selected as ticket resolved")
    def mark_ticket_resolved(self, request, queryset):
        queryset.update(ticket_raised=False)


# ------------------------------------------------------------------
# SOURCEDOCUMENT ADMIN — FR-004
# ------------------------------------------------------------------
@admin.register(SourceDocument)
class SourceDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'document_name', 'clickable_link', 'interaction_id', 'interaction_user')
    search_fields = ('document_name', 'interaction__session__user_id')
    readonly_fields = ('interaction', 'document_name', 'document_link')

    def clickable_link(self, obj):
        """FR-004: Show clickable Drive links in admin."""
        if obj.document_link:
            return format_html(
                '<a href="{}" target="_blank" style="color:#1a73e8;">Open in Drive ↗</a>',
                obj.document_link
            )
        return format_html('<span style="color:#999;">No link stored</span>')
    clickable_link.short_description = "Drive Link"

    def interaction_id(self, obj):
        return f"#{obj.interaction_id}"
    interaction_id.short_description = "Interaction"

    def interaction_user(self, obj):
        return obj.interaction.session.user_id
    interaction_user.short_description = "User"