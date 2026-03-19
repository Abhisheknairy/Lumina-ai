"""
Django settings for core_backend project.
All secrets and environment-specific values are read from environment variables.
"""

from pathlib import Path
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY    = os.environ["DJANGO_SECRET_KEY"]
DEBUG         = os.environ.get("DJANGO_DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "chatbot",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core_backend.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE     = "UTC"
USE_I18N      = True
USE_TZ        = True

STATIC_URL            = "static/"
DEFAULT_AUTO_FIELD    = "django.db.models.BigAutoField"

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS   = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173"
).split(",")

APPEND_SLASH = False

# ── Email ─────────────────────────────────────────────────────────────
# Uses Gmail SMTP by default.
# In development with no Gmail set up, use console backend:
#   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
# This prints emails to the terminal so you can see invite links without
# configuring real SMTP.
#
# For Gmail production:
#   1. Enable 2-Step Verification on your Google account
#   2. Go to Google Account → Security → App passwords
#   3. Create an App Password for "Mail"
#   4. Use that 16-char password as EMAIL_HOST_PASSWORD (NOT your login password)

EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST          = os.environ.get("EMAIL_HOST",          "smtp.gmail.com")
EMAIL_PORT          = int(os.environ.get("EMAIL_PORT",      "587"))
EMAIL_USE_TLS       = os.environ.get("EMAIL_USE_TLS",       "True").lower() == "true"
EMAIL_HOST_USER     = os.environ.get("EMAIL_HOST_USER",     "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL  = os.environ.get(
    "DEFAULT_FROM_EMAIL",
    f"Lumina AI <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "Lumina AI <noreply@lumina.ai>",
)