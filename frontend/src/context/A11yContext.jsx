import React, { createContext, useContext, useState, useEffect } from 'react';

const A11yContext = createContext();

export const A11yProvider = ({ children }) => {
    const [highContrast, setHighContrast] = useState(false);
    const [fontSize, setFontSize] = useState(100); // percentage
    const [simplifiedMode, setSimplifiedMode] = useState(false);

    useEffect(() => {
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
        // ARIA Live region announcement logic can be added here or handled by components
        const announcement = document.getElementById('a11y-announcer');
        if (announcement) {
            announcement.textContent = text;
        }
    };

    return (
        <A11yContext.Provider value={{
            highContrast, setHighContrast,
            fontSize, setFontSize,
            simplifiedMode, setSimplifiedMode,
            announce
        }}>
            {children}
            {/* Hidden ARIA live region for global announcements */}
            <div id="a11y-announcer" aria-live="polite" className="sr-only"></div>
        </A11yContext.Provider>
    );
};

export const useA11y = () => useContext(A11yContext);
