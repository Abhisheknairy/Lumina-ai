from django.contrib import admin
from django.urls import path
from chatbot.api import api # We will create this file next!

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls), # All our endpoints will now start with /api/
]