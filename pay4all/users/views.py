from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from .transcription import transcribe_audio

from django.contrib.auth import login
from .forms import CustomUserCreationForm

def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('home') # 'home' is the correct URL name
    else:
        form = CustomUserCreationForm()
    return render(request, 'users/register.html', {'form': form})

@require_POST
def transcribe_view(request):
    if 'audio' not in request.FILES:
        return JsonResponse({'error': 'No audio file provided'}, status=400)
    
    audio_file = request.FILES['audio']
    try:
        text = transcribe_audio(audio_file)
        if text:
            return JsonResponse({'text': text})
        else:
            return JsonResponse({'error': 'Transcription failed'}, status=500)
    except Exception as e:
        # Log error in production
        print(f"Transcription error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

