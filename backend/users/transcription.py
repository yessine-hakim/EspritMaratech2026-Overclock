import os
from groq import Groq
from django.conf import settings

def transcribe_audio(audio_file):
    """
    Transcribe audio file using Groq's Whisper implementation.
    
    Args:
        audio_file: File object containing the audio
        
    Returns:
        str: Transcribed text
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")
        
    client = Groq(api_key=api_key)
    
    # Save temporary file if necessary or pass directly if supported
    # Groq python client usually expects a file path or file-like object with a name
    
    try:
        # Create a temporary file to handle the upload cleanly
        import tempfile
        import shutil
        
        # Determine extension from name or default to .webm (common for web recording)
        ext = os.path.splitext(audio_file.name)[1]
        if not ext:
            ext = ".webm"
            
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_audio:
            for chunk in audio_file.chunks():
                temp_audio.write(chunk)
            temp_path = temp_audio.name
            
        with open(temp_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(temp_path, file.read()),
                model="whisper-large-v3",
                response_format="json",
                language="en",
                temperature=0.0
            )
            
        # cleanup
        os.unlink(temp_path)
        
        return transcription.text
        
    except Exception as e:
        print(f"Transcription error: {e}")
        return None
