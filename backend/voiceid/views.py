import os
import json
import numpy as np
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import VoiceEnrollment
import scipy.io.wavfile as wav
import io

# Helper to extract a simple voice fingerprint
def extract_fingerprint(audio_file):
    """
    Extracts a simple spectral fingerprint from audio.
    In a real-world scenario, we'd use a deep d-vector model.
    Here we use normalized MFCC-like features using numpy/scipy.
    """
    try:
        # Read WAV from memory
        rate, data = wav.read(io.BytesIO(audio_file.read()))
        
        # Convert to mono if necessary
        if len(data.shape) > 1:
            data = data.mean(axis=1)
            
        # Normalize
        data = data.astype(np.float32)
        data /= (np.max(np.abs(data)) + 1e-6)
        
        # Simple Spectral Flattening / Feature extraction (Mock MFCC)
        # We take the FFT and get the amplitude of various frequency bins
        fft_data = np.abs(np.fft.rfft(data))
        # Log scale
        fft_data = np.log1p(fft_data)
        
        # Reduce dimensionality to 128 "features" by averaging bins
        chunk_size = len(fft_data) // 128
        fingerprint = [float(np.mean(fft_data[i*chunk_size : (i+1)*chunk_size])) for i in range(128)]
        
        # Normalize the fingerprint vector
        fingerprint = np.array(fingerprint)
        fingerprint /= (np.linalg.norm(fingerprint) + 1e-6)
        
        return fingerprint.tolist()
    except Exception as e:
        print(f"Fingerprint extraction error: {e}")
        return None

@csrf_exempt
@require_http_methods(["POST"])
def enroll_voice(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Auth required"}, status=401)
        
    audio = request.FILES.get("audio")
    if not audio:
        return JsonResponse({"error": "No audio provided"}, status=400)
        
    embedding = extract_fingerprint(audio)
    if not embedding:
        return JsonResponse({"error": "Failed to extract fingerprint"}, status=500)
        
    enrollment, created = VoiceEnrollment.objects.update_or_create(
        user=request.user,
        defaults={"embedding": embedding}
    )
    
    return JsonResponse({
        "status": "success",
        "message": "VoiceID enrolled successfully",
        "is_new": created
    })

@csrf_exempt
@require_http_methods(["POST"])
def verify_voice(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Auth required"}, status=401)
        
    try:
        enrollment = VoiceEnrollment.objects.get(user=request.user)
    except VoiceEnrollment.DoesNotExist:
        return JsonResponse({"error": "No VoiceID enrolled"}, status=404)
        
    audio = request.FILES.get("audio")
    if not audio:
        return JsonResponse({"error": "No audio provided"}, status=400)
        
    current_embedding = extract_fingerprint(audio)
    if not current_embedding:
        return JsonResponse({"error": "Failed to extract fingerprint"}, status=500)
        
    # Cosine Similarity
    stored_embedding = np.array(enrollment.embedding)
    current_embedding = np.array(current_embedding)
    
    similarity = np.dot(stored_embedding, current_embedding)
    
    # Threshold for match
    # In a simplified spectral model, 0.8 is usually a good starting point
    IS_MATCH = similarity > 0.85
    
    return JsonResponse({
        "status": "success",
        "match": bool(IS_MATCH),
        "score": float(similarity)
    })
