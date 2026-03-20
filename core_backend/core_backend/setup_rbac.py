import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_backend.settings')
django.setup()

from chatbot.models import PlatformRole, UserProfile, ROLE_SUPER_ADMIN, ROLE_ADMIN

# Define our base permissions
PERM_VIEW_ANALYTICS = "can_view_analytics"
PERM_MANAGE_KBS     = "can_manage_kbs"
PERM_MANAGE_USERS   = "can_manage_users"
PERM_MANAGE_ROLES   = "can_manage_roles"

print("1. Creating System Roles...")

super_admin_role, _ = PlatformRole.objects.get_or_create(
    name="Super Admin",
    defaults={
        "description": "Full access to all platform settings.",
        "is_system": True,
        "permissions": {
            PERM_VIEW_ANALYTICS: True,
            PERM_MANAGE_KBS: True,
            PERM_MANAGE_USERS: True,
            PERM_MANAGE_ROLES: True,
        }
    }
)

admin_role, _ = PlatformRole.objects.get_or_create(
    name="Admin",
    defaults={
        "description": "Can manage knowledge bases and view analytics.",
        "is_system": True,
        "permissions": {
            PERM_VIEW_ANALYTICS: True,
            PERM_MANAGE_KBS: True,
            PERM_MANAGE_USERS: False,
            PERM_MANAGE_ROLES: False,
        }
    }
)

user_role, _ = PlatformRole.objects.get_or_create(
    name="User",
    defaults={
        "description": "Standard user access. Can chat and view shared KBs.",
        "is_system": True,
        "permissions": {
            PERM_VIEW_ANALYTICS: False,
            PERM_MANAGE_KBS: False,
            PERM_MANAGE_USERS: False,
            PERM_MANAGE_ROLES: False,
        }
    }
)

print("2. Migrating existing users to new roles...")
for profile in UserProfile.objects.all():
    if profile.role == ROLE_SUPER_ADMIN:
        profile.platform_role = super_admin_role
    elif profile.role == ROLE_ADMIN:
        profile.platform_role = admin_role
    else:
        profile.platform_role = user_role
    
    profile.save(update_fields=["platform_role"])
    print(f"   Mapped {profile.email} -> {profile.platform_role.name}")

print("\nRBAC Setup Complete!")