import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const A11yContext = createContext();

export const A11yProvider = ({ children }) => {
    const [highContrast, setHighContrast] = useState(() => {
        try {
            return localStorage.getItem('a11y-high-contrast') === 'true';
        } catch (e) {
            return false;
        }
    });
    const [fontSize, setFontSize] = useState(() => {
        try {
            return parseInt(localStorage.getItem('a11y-font-size')) || 100;
        } catch (e) {
            return 100;
        }
    });
    const [simplifiedMode, setSimplifiedMode] = useState(() => {
        try {
            return localStorage.getItem('a11y-simplified-mode') === 'true';
        } catch (e) {
            return false;
        }
    });

    useEffect(() => {
        try {
            // Persist settings
            localStorage.setItem('a11y-high-contrast', highContrast);
            localStorage.setItem('a11y-font-size', fontSize);
            localStorage.setItem('a11y-simplified-mode', simplifiedMode);
        } catch (e) {
            console.warn("localStorage persistence failed", e);
        }

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

    const announce = useCallback((text) => {
        // ARIA Live region announcement logic
        const announcement = document.getElementById('a11y-announcer');
        if (announcement) {
            announcement.textContent = text;
        }
    }, []);

    const speak = useCallback((text) => {
        if ('speechSynthesis' in window) {
            try {
                // Cancel any current speech to prioritize the new one
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
            } catch (e) {
                console.warn("Speech synthesis failed", e);
            }
        }
    }, []);

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

export const useA11y = () => {
    const context = useContext(A11yContext);
    if (!context) {
        // Fallback to empty functions if context is missing (prevent crash)
        return {
            highContrast: false,
            setHighContrast: () => { },
            fontSize: 100,
            setFontSize: () => { },
            simplifiedMode: false,
            setSimplifiedMode: () => { },
            announce: () => { },
            speak: () => { }
        };
    }
    return context;
};
