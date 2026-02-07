import React, { createContext, useContext, useState, useEffect } from 'react';

const A11yContext = createContext();

export const A11yProvider = ({ children }) => {
    const [highContrast, setHighContrast] = useState(() => {
        return localStorage.getItem('a11y-high-contrast') === 'true';
    });
    const [fontSize, setFontSize] = useState(() => {
        return parseInt(localStorage.getItem('a11y-font-size')) || 100;
    });
    const [simplifiedMode, setSimplifiedMode] = useState(() => {
        return localStorage.getItem('a11y-simplified-mode') === 'true';
    });

    useEffect(() => {
        // Persist settings
        localStorage.setItem('a11y-high-contrast', highContrast);
        localStorage.setItem('a11y-font-size', fontSize);
        localStorage.setItem('a11y-simplified-mode', simplifiedMode);

        // Apply classes to body for global styling
        if (highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }

        document.documentElement.style.fontSize = `${fontSize}%`;

        if (simplifiedMode) {
            document.body.classList.add('simple-mode');
        } else {
            document.body.classList.remove('simple-mode');
        }
    }, [highContrast, fontSize, simplifiedMode]);

    const announce = (text) => {
        // ARIA Live region announcement logic
        const announcement = document.getElementById('a11y-announcer');
        if (announcement) {
            announcement.textContent = text;
        }
    };

    const speak = (text) => {
        if ('speechSynthesis' in window) {
            // Cancel any current speech to prioritize the new one
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <A11yContext.Provider value={{
            highContrast, setHighContrast,
            fontSize, setFontSize,
            simplifiedMode, setSimplifiedMode,
            announce,
            speak
        }}>
            {children}
            {/* Hidden ARIA live region for global announcements */}
            <div id="a11y-announcer" aria-live="polite" className="sr-only"></div>
        </A11yContext.Provider>
    );
};

export const useA11y = () => useContext(A11yContext);
