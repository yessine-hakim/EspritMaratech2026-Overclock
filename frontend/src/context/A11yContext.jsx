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
    const [readabilityMode, setReadabilityMode] = useState(() => {
        try {
            return localStorage.getItem('a11y-readability-mode') === 'true';
        } catch (e) {
            return false;
        }
    });
    const [grayscale, setGrayscale] = useState(() => {
        try {
            return localStorage.getItem('a11y-grayscale') === 'true';
        } catch (e) {
            return false;
        }
    });

    const [visualAlerts, setVisualAlerts] = useState(() => {
        try {
            return localStorage.getItem('a11y-visual-alerts') === 'true';
        } catch (e) {
            return false;
        }
    });
    const [focusMode, setFocusMode] = useState(() => {
        try {
            return localStorage.getItem('a11y-focus-mode') === 'true';
        } catch (e) {
            return false;
        }
    });
    const [activeAlert, setActiveAlert] = useState(null);

    useEffect(() => {
        try {
            // Persist settings
            localStorage.setItem('a11y-high-contrast', highContrast);
            localStorage.setItem('a11y-font-size', fontSize);
            localStorage.setItem('a11y-simplified-mode', simplifiedMode);
            localStorage.setItem('a11y-readability-mode', readabilityMode);
            localStorage.setItem('a11y-grayscale', grayscale);
            localStorage.setItem('a11y-visual-alerts', visualAlerts);
            localStorage.setItem('a11y-focus-mode', focusMode);
        } catch (e) {
            console.warn("localStorage persistence failed", e);
        }

        // Apply classes to body for global styling
        const body = document.body;
        if (highContrast) body.classList.add('high-contrast');
        else body.classList.remove('high-contrast');

        if (simplifiedMode) body.classList.add('simple-mode');
        else body.classList.remove('simple-mode');

        if (readabilityMode) body.classList.add('readability-mode');
        else body.classList.remove('readability-mode');

        if (grayscale) body.classList.add('grayscale-filter');
        else body.classList.remove('grayscale-filter');

        if (focusMode) body.classList.add('focus-mode');
        else body.classList.remove('focus-mode');

        document.documentElement.style.fontSize = `${fontSize}%`;
    }, [highContrast, fontSize, simplifiedMode, readabilityMode, grayscale, visualAlerts, focusMode]);

    const showVisualAlert = useCallback((text) => {
        if (visualAlerts) {
            setActiveAlert(text);
            setTimeout(() => setActiveAlert(null), 3500);
        }
    }, [visualAlerts]);

    const announce = useCallback((text) => {
        // ARIA Live region announcement logic
        const announcement = document.getElementById('a11y-announcer');
        if (announcement) {
            announcement.textContent = text;
        }
        showVisualAlert(text);
    }, [showVisualAlert]);

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
        showVisualAlert(text);
    }, [showVisualAlert]);

    return (
        <A11yContext.Provider value={{
            highContrast, setHighContrast,
            fontSize, setFontSize,
            simplifiedMode, setSimplifiedMode,
            readabilityMode, setReadabilityMode,
            grayscale, setGrayscale,
            visualAlerts, setVisualAlerts,
            focusMode, setFocusMode,
            announce,
            speak
        }}>
            {children}
            {/* Hidden ARIA live region for global announcements */}
            <div id="a11y-announcer" aria-live="polite" className="sr-only"></div>

            {/* Visual Alert Toast */}
            {activeAlert && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-primary text-white px-6 py-3 rounded-2xl shadow-2xl border-2 border-accent animate-bounceIn max-w-[90vw] text-center font-bold">
                    <p>{activeAlert}</p>
                </div>
            )}
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
            readabilityMode: false,
            setReadabilityMode: () => { },
            grayscale: false,
            setGrayscale: () => { },
            visualAlerts: false,
            setVisualAlerts: () => { },
            focusMode: false,
            setFocusMode: () => { },
            announce: () => { },
            speak: () => { }
        };
    }
    return context;
};
