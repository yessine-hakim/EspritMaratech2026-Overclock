/**
 * Speech Manager - Web Speech API Wrapper
 * 
 * Gère l'écoute continue via SpeechRecognition et la synthèse vocale.
 * Redémarre automatiquement l'écoute en cas d'arrêt (logique agentic).
 */

export class SpeechManager {
  constructor(onTranscriptCallback) {
    this.onTranscript = onTranscriptCallback;
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.shouldRestart = false; // ✅ CHANGÉ : false par défaut (mode bouton)
    this.buttonMode = true; // ✅ NOUVEAU : Mode bouton activé
  }

  /**
   * Active/désactive le mode continu
   */
  setContinuousMode(enabled) {
    this.shouldRestart = enabled;
    this.buttonMode = !enabled;
  }

  /**
   * Démarre l'écoute continue
   * ⚠️ IMPORTANT : Redémarre automatiquement sur onend (logique agentic)
   */
  startContinuousListening() {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('[SPEECH] Web Speech API not supported');
      return false;
    }

    // ✅ Éviter les démarrages concurrents
    if (this.isListening) {
      console.log('[SPEECH] Already listening, skipping start');
      return true;
    }

    // Arrêter proprement l'ancienne instance si elle existe
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore si déjà arrêté
      }
      // Attendre un peu pour que l'arrêt soit complet
      this.recognition = null;
    }

    this.recognition = new window.webkitSpeechRecognition();
    this.recognition.continuous = false; // ✅ CHANGÉ : false pour mode bouton
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('[SPEECH] 🎙️ Recognition started - Listening continuously...');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('[SPEECH] Recognition ended');

      // ✅ MODE BOUTON : Ne redémarre PAS automatiquement
      // L'utilisateur doit cliquer à nouveau sur le bouton
      if (this.shouldRestart && !this.buttonMode) {
        console.log('[SPEECH] 🔄 Auto-restarting recognition...');
        setTimeout(() => {
          this.startContinuousListening();
        }, 300);
      } else {
        console.log('[SPEECH] 🛑 Waiting for button click...');
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[SPEECH] Recognition error:', event.error);
      this.isListening = false;

      // Gestion spécifique des erreurs
      switch (event.error) {
        case 'aborted':
          console.log('[SPEECH] ⚠️ Recognition aborted - will retry');
          // Attendre un peu plus longtemps avant de redémarrer
          if (this.shouldRestart) {
            setTimeout(() => {
              this.startContinuousListening();
            }, 500);
          }
          break;

        case 'network':
          console.log('[SPEECH] Network error - will retry in 5s');
          if (this.shouldRestart) {
            setTimeout(() => {
              this.startContinuousListening();
            }, 5000);
          }
          break;

        case 'not-allowed':
        case 'service-not-allowed':
          console.error('[SPEECH] ❌ Microphone access denied');
          this.shouldRestart = false;
          alert('Microphone access is required for voice commands. Please allow microphone access and reload the page.');
          break;

        case 'no-speech':
          console.log('[SPEECH] No speech detected - continuing to listen');
          // Pas besoin de redémarrer, onend le fera
          break;

        default:
          console.log('[SPEECH] Unknown error - will retry');
          if (this.shouldRestart) {
            setTimeout(() => {
              this.startContinuousListening();
            }, 1000);
          }
      }
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      console.log('[SPEECH] 📝 Transcript:', transcript);

      if (this.onTranscript) {
        this.onTranscript(transcript);
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('[SPEECH] Failed to start recognition:', error);
      return false;
    }
  }

  /**
   * Arrête l'écoute (désactive le redémarrage automatique)
   */
  stopListening() {
    this.shouldRestart = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
        console.log('[SPEECH] ⏹️ Listening stopped');
      } catch (e) {
        console.error('[SPEECH] Error stopping recognition:', e);
      }
    }
  }

  /**
   * Synthèse vocale
   */
  speak(text, options = {}) {
    if (!text) return;

    // Annuler toute synthèse en cours
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    utterance.onstart = () => {
      console.log('[SPEECH] 🔊 Speaking:', text);
    };

    utterance.onerror = (event) => {
      console.error('[SPEECH] Speech synthesis error:', event);
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Vérifie si l'écoute est active
   */
  getIsListening() {
    return this.isListening;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopListening();
    this.synthesis.cancel();
  }
}
