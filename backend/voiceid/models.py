from django.db import models
from django.conf import settings

class VoiceEnrollment(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='voice_enrollment')
    # Store embedding as a JSON list of floats
    embedding = models.JSONField(help_text="Biometric voice fingerprint (MFCC-based embedding)")
    enrollment_phrase = models.CharField(max_length=255, default="my voice is my password")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"VoiceID for {self.user.email}"
