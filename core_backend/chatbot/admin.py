from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Q
from .models import (
    OAuthSession, UserProfile, ChatSession, InteractionLog,
    SourceDocument, KnowledgeBase, KBMembership, AdminAuditLog,
    ROLE_SUPER_ADMIN, ROLE_ADMIN,
)


# ── Inlines ───────────────────────────────────────────────────────────
class SourceDocumentInline(admin.TabularInline):
    model = SourceDocument
    extra = 0
    readonly_fields = ('document_name', 'clickable_link')
    fields = ('document_name', 'clickable_link')

    def clickable_link(self, obj):
        if obj.document_link:
            return format_html('<a href="{}" target="_blank" style="color:#1a73e8;">Open in Drive ↗</a>', obj.document_link)
        return "—"
    clickable_link.short_description = "Drive Link"


class InteractionLogInline(admin.TabularInline):
    model = InteractionLog
    extra = 0
    readonly_fields = ('user_query', 'ai_response_short', 'response_time_ms', 'ticket_raised', 'created_at')
    fields = ('user_query', 'ai_response_short', 'response_time_ms', 'ticket_raised', 'created_at')

    def ai_response_short(self, obj):
        return obj.ai_response[:100] + "..." if len(obj.ai_response) > 100 else obj.ai_response
    ai_response_short.short_description = "AI Response (preview)"


class KBMembershipInline(admin.TabularInline):
    model = KBMembership
    extra = 0
    readonly_fields = ('user_email', 'user_id', 'role', 'accepted', 'invited_at')
    fields = ('user_email', 'user_id', 'role', 'accepted', 'invited_at')


# ── OAuthSession ──────────────────────────────────────────────────────
@admin.register(OAuthSession)
class OAuthSessionAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'display_name', 'email', 'created_at', 'updated_at')
    search_fields = ('user_id', 'email', 'display_name')
    readonly_fields = ('user_id', 'token', 'refresh_token', 'token_uri', 'client_id',
                       'client_secret', 'scopes', 'display_name', 'email', 'created_at', 'updated_at')
    ordering = ('-updated_at',)


# ── UserProfile ───────────────────────────────────────────────────────
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'email', 'role_badge', 'last_seen', 'created_at')
    list_filter  = ('role',)
    search_fields = ('display_name', 'email', 'user_id')
    readonly_fields = ('user_id', 'created_at', 'last_seen')
    ordering = ('-last_seen',)
    fields = ('user_id', 'display_name', 'email', 'role', 'avatar_url', 'created_at', 'last_seen')

    def role_badge(self, obj):
        colors = {
            ROLE_SUPER_ADMIN: ("#1a0a3c", "#7f77dd"),
            ROLE_ADMIN:       ("#0a3c1a", "#1d9e75"),
            "user":           ("#3c2a0a", "#ba7517"),
        }
        fg, bg = colors.get(obj.role, ("#333", "#eee"))
        return format_html(
            '<span style="background:{};color:{};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            bg, fg, obj.get_role_display()
        )
    role_badge.short_description = "Role"


# ── KnowledgeBase ─────────────────────────────────────────────────────
@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display  = ('name', 'created_by_name', 'folder_name', 'member_count', 'is_active', 'created_at')
    list_filter   = ('is_active',)
    search_fields = ('name', 'created_by', 'folder_name')
    readonly_fields = ('invite_token', 'created_at', 'updated_at')
    ordering      = ('-created_at',)
    inlines       = [KBMembershipInline]

    def created_by_name(self, obj):
        try:
            p = UserProfile.objects.get(user_id=obj.created_by)
            return p.display_name or p.email
        except UserProfile.DoesNotExist:
            return obj.created_by
    created_by_name.short_description = "Created By"

    def member_count(self, obj):
        return obj.memberships.filter(accepted=True).count()
    member_count.short_description = "Members"


# ── KBMembership ──────────────────────────────────────────────────────
@admin.register(KBMembership)
class KBMembershipAdmin(admin.ModelAdmin):
    list_display  = ('user_email', 'kb', 'role', 'accepted', 'invited_at')
    list_filter   = ('role', 'accepted')
    search_fields = ('user_email', 'kb__name')
    readonly_fields = ('invited_at',)


# ── AdminAuditLog ─────────────────────────────────────────────────────
@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display  = ('timestamp', 'actor_email', 'action_badge', 'target_email', 'detail')
    list_filter   = ('action',)
    search_fields = ('actor_email', 'target_email', 'action')
    readonly_fields = ('actor_user_id', 'actor_email', 'action', 'target_user_id',
                       'target_email', 'detail', 'timestamp')
    ordering      = ('-timestamp',)

    def has_add_permission(self, request):
        return False  # audit log is immutable

    def has_change_permission(self, request, obj=None):
        return False

    def action_badge(self, obj):
        color = "#d93025" if "demote" in obj.action else "#188038"
        return format_html('<span style="color:{};font-weight:600;">{}</span>', color, obj.action)
    action_badge.short_description = "Action"


# ── ChatSession ───────────────────────────────────────────────────────
@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'session_name', 'folder_name', 'kb', 'total_interactions', 'tickets_raised', 'updated_at')
    list_filter  = ('kb', 'created_at')
    search_fields = ('user_id', 'session_name', 'folder_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering     = ('-updated_at',)
    inlines      = [InteractionLogInline]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _total=Count('interactions'),
            _tickets=Count('interactions', filter=Q(interactions__ticket_raised=True))
        )

    def total_interactions(self, obj):
        return obj._total
    total_interactions.admin_order_field = '_total'
    total_interactions.short_description = "Queries"

    def tickets_raised(self, obj):
        c = obj._tickets
        color = "#d93025" if c > 0 else "#188038"
        return format_html('<span style="color:{};font-weight:bold;">{}</span>', color, c)
    tickets_raised.short_description = "Tickets"


# ── InteractionLog ────────────────────────────────────────────────────
@admin.register(InteractionLog)
class InteractionLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'session_user', 'query_preview', 'response_time_badge', 'ticket_raised', 'nfr001_status', 'created_at')
    list_filter  = ('ticket_raised', 'created_at', 'session__user_id')
    search_fields = ('user_query', 'ai_response', 'session__user_id')
    readonly_fields = ('session', 'user_query', 'ai_response', 'response_time_ms', 'ticket_raised', 'created_at')
    ordering     = ('-created_at',)
    inlines      = [SourceDocumentInline]
    actions      = ['mark_ticket_raised', 'mark_ticket_resolved']

    def session_user(self, obj):
        return obj.session.user_id
    session_user.short_description = "User"

    def query_preview(self, obj):
        return (obj.user_query[:80] + "...") if len(obj.user_query) > 80 else obj.user_query
    query_preview.short_description = "Query"

    def response_time_badge(self, obj):
        ms = obj.response_time_ms
        if ms > 3000:
            color, label = "#d93025", f"⚠ {ms}ms"
        elif ms > 1500:
            color, label = "#f29900", f"{ms}ms"
        else:
            color, label = "#188038", f"✓ {ms}ms"
        return format_html('<span style="color:{};font-weight:600;">{}</span>', color, label)
    response_time_badge.short_description = "Response Time"

    def nfr001_status(self, obj):
        if obj.response_time_ms <= 3000:
            return format_html('<span style="color:#188038;font-weight:bold;">✓ PASS</span>')
        return format_html('<span style="color:#d93025;font-weight:bold;">✗ FAIL</span>')
    nfr001_status.short_description = "NFR-001 (<3s)"

    @admin.action(description="Mark selected as ticket raised")
    def mark_ticket_raised(self, request, queryset):
        queryset.update(ticket_raised=True)

    @admin.action(description="Mark selected as ticket resolved")
    def mark_ticket_resolved(self, request, queryset):
        queryset.update(ticket_raised=False)


# ── SourceDocument ────────────────────────────────────────────────────
@admin.register(SourceDocument)
class SourceDocumentAdmin(admin.ModelAdmin):
    list_display  = ('document_name', 'clickable_link', 'interaction_user')
    search_fields = ('document_name', 'interaction__session__user_id')
    readonly_fields = ('interaction', 'document_name', 'document_link')

    def clickable_link(self, obj):
        if obj.document_link:
            return format_html('<a href="{}" target="_blank" style="color:#1a73e8;">Open in Drive ↗</a>', obj.document_link)
        return format_html('<span style="color:#999;">No link</span>')
    clickable_link.short_description = "Drive Link"

    def interaction_user(self, obj):
        return obj.interaction.session.user_id
    interaction_user.short_description = "User"