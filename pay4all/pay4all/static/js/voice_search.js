document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.querySelector('.search-container');
    if (!searchForm) return;

    const input = searchForm.querySelector('input[name="q"]');
    const micBtn = document.createElement('button');
    micBtn.type = 'button';
    micBtn.className = 'mic-btn';
    micBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    `;

    // Insert after input, before submit button
    input.parentNode.insertBefore(micBtn, input.nextSibling);

    let mediaRecorder;
    let audioChunks = [];

    micBtn.addEventListener('click', async () => {
        if (micBtn.classList.contains('recording')) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    async function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support audio recording.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                sendAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            });

            mediaRecorder.start();
            micBtn.classList.add('recording');
            input.placeholder = "Listening...";
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone.');
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            micBtn.classList.remove('recording');
            input.placeholder = "What are you looking for?";
        }
    }

    async function sendAudio(blob) {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        // CSRF Token
        const csrfToken = getCookie('csrftoken');

        micBtn.classList.add('processing'); // Add loading state

        try {
            const response = await fetch('/api/transcribe/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                body: formData
            });

            const data = await response.json();

            if (data.text) {
                if (input.value) {
                    input.value += ' ' + data.text;
                } else {
                    input.value = data.text;
                }
                console.log('Voice transcription added to search:', data.text);
            } else {
                console.error('Transcription failed:', data.error);
                // alert('Could not hear you well. Please try again.');
            }
        } catch (error) {
            console.error('Error sending audio:', error);
        } finally {
            micBtn.classList.remove('processing');
        }
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});
