"""
STEP 1 — Fix the database directly (run this NOW)
==================================================
Open a terminal in your backend directory and run:

  python manage.py shell

Then paste this entire block:
"""

# ── Paste this in python manage.py shell ─────────────────────────────

from chatbot.models import UserProfile, OAuthSession, ROLE_SUPER_ADMIN

SUPER_ADMIN_EMAIL = "n.abhishek@isteer.com"

# Find the profile — try by email first, then by checking OAuthSession
profile = None

# Try by email
try:
    profile = UserProfile.objects.get(email=SUPER_ADMIN_EMAIL)
    print(f"Found by email: {profile.user_id} | role={profile.role} | name={profile.display_name}")
except UserProfile.DoesNotExist:
    print("No UserProfile with that email. Searching OAuthSession...")
    
    # Try OAuthSession which may have the email
    try:
        session = OAuthSession.objects.get(email=SUPER_ADMIN_EMAIL)
        print(f"Found OAuthSession: user_id={session.user_id} | name={session.display_name}")
        profile, created = UserProfile.objects.get_or_create(
            user_id=session.user_id,
            defaults={
                "display_name": session.display_name or "N Abhishek",
                "email":        SUPER_ADMIN_EMAIL,
                "role":         ROLE_SUPER_ADMIN,
            }
        )
        if not created:
            profile.email = SUPER_ADMIN_EMAIL
            profile.save(update_fields=["email"])
    except OAuthSession.DoesNotExist:
        print("No OAuthSession either. Listing all profiles:")
        for p in UserProfile.objects.all():
            print(f"  {p.user_id} | {p.email} | {p.role} | {p.display_name}")
        profile = None

if profile:
    # Derive name from email if blank
    if not profile.display_name:
        local  = SUPER_ADMIN_EMAIL.split("@")[0]
        parts  = local.replace("_", ".").split(".")
        profile.display_name = " ".join(p.capitalize() for p in parts if p)
        print(f"Set display_name to: {profile.display_name}")

    # Set email if blank  
    if not profile.email:
        profile.email = SUPER_ADMIN_EMAIL
        print(f"Set email to: {profile.email}")

    # Set super_admin role
    old_role     = profile.role
    profile.role = ROLE_SUPER_ADMIN
    profile.save(update_fields=["display_name", "email", "role"])
    print(f"✓ Role updated: {old_role} → {profile.role}")
    print(f"✓ UserProfile: user_id={profile.user_id} | email={profile.email} | name={profile.display_name} | role={profile.role}")

    # Also fix the OAuthSession display_name + email if needed
    try:
        session = OAuthSession.objects.get(user_id=profile.user_id)
        changed = False
        if not session.email:
            session.email = SUPER_ADMIN_EMAIL
            changed = True
        if not session.display_name or session.display_name == profile.user_id:
            session.display_name = profile.display_name
            changed = True
        if changed:
            session.save(update_fields=["email", "display_name"])
            print(f"✓ OAuthSession updated: email={session.email} | name={session.display_name}")
    except OAuthSession.DoesNotExist:
        print("No OAuthSession found for this user_id")

print("\nDone. Now refresh the browser — you should see the name and Admin tab.")