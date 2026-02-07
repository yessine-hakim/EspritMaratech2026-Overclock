import React, { useEffect, useRef } from 'react';
import { useA11y } from '../context/A11yContext';
import { FaTimes, FaEye, FaTextHeight, FaUniversalAccess, FaMicrophone } from 'react-icons/fa';

/**
 * AccessibilityModal Component
 * A centralized modal for all accessibility settings.
 * Features keyboard focus trapping and ARIA support.
 */
const AccessibilityModal = ({ isOpen, onClose }) => {
    const {
        highContrast, setHighContrast,
        fontSize, setFontSize,
        simplifiedMode, setSimplifiedMode,
        readabilityMode, setReadabilityMode,
        grayscale, setGrayscale,
        visualAlerts, setVisualAlerts,
        focusMode, setFocusMode,
        speak
    } = useA11y();

    const modalRef = useRef(null);

    // Handle Escape key to close
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            // Simple focus trap: focus the close button when opened
            modalRef.current?.querySelector('button').focus();
            speak("Accessibility Control Center opened.");
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose, speak]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="a11y-modal-title">
            <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="bg-primary p-6 flex items-center justify-between text-white">
                    <h2 id="a11y-modal-title" className="text-xl font-bold flex items-center gap-2">
                        <FaUniversalAccess aria-hidden="true" /> Accessibility Tools
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        aria-label="Close settings"
                    >
                        <FaTimes size={20} aria-hidden="true" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                    {/* Visual: High Contrast */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${highContrast ? 'bg-black text-yellow-400' : 'bg-gray-100 text-gray-500'}`} aria-hidden="true">
                                <FaEye size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">High Contrast</h3>
                                <p className="text-xs text-gray-500">Enhanced visibility for text</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setHighContrast(!highContrast);
                                speak(`High contrast ${!highContrast ? 'enabled' : 'disabled'}`);
                            }}
                            className={`w-14 h-8 rounded-full transition-all relative ${highContrast ? 'bg-accent' : 'bg-gray-200'}`}
                            role="switch"
                            aria-checked={highContrast}
                            aria-label="Toggle High Contrast"
                        >
                            <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${highContrast ? 'translate-x-6' : ''}`}></span>
                        </button>
                    </div>

                    {/* Visual: Grayscale */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${grayscale ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`} aria-hidden="true">
                                <FaEye size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">Grayscale Mode</h3>
                                <p className="text-xs text-gray-500">Removes all color from UI</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setGrayscale(!grayscale);
                                speak(`Grayscale mode ${!grayscale ? 'enabled' : 'disabled'}`);
                            }}
                            className={`w-14 h-8 rounded-full transition-all relative ${grayscale ? 'bg-accent' : 'bg-gray-200'}`}
                            role="switch"
                            aria-checked={grayscale}
                            aria-label="Toggle Grayscale Mode"
                        >
                            <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${grayscale ? 'translate-x-6' : ''}`}></span>
                        </button>
                    </div>

                    {/* Hearing: Visual Alerts */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${visualAlerts ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500'}`} aria-hidden="true">
                                <FaMicrophone size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">Visual Voice</h3>
                                <p className="text-xs text-gray-500">Show on-screen text for speech</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setVisualAlerts(!visualAlerts);
                                speak(`Visual alerts ${!visualAlerts ? 'enabled' : 'disabled'}`);
                            }}
                            className={`w-14 h-8 rounded-full transition-all relative ${visualAlerts ? 'bg-accent' : 'bg-gray-200'}`}
                            role="switch"
                            aria-checked={visualAlerts}
                            aria-label="Toggle Visual Voice Alerts"
                        >
                            <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${visualAlerts ? 'translate-x-6' : ''}`}></span>
                        </button>
                    </div>

                    {/* Cognitive: Focus Mode */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${focusMode ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`} aria-hidden="true">
                                <FaUniversalAccess size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">Focus Mode</h3>
                                <p className="text-xs text-gray-500">Hide sidebars & distractions</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setFocusMode(!focusMode);
                                speak(`Focus mode ${!focusMode ? 'enabled' : 'disabled'}`);
                            }}
                            className={`w-14 h-8 rounded-full transition-all relative ${focusMode ? 'bg-accent' : 'bg-gray-200'}`}
                            role="switch"
                            aria-checked={focusMode}
                            aria-label="Toggle Focus Mode"
                        >
                            <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${focusMode ? 'translate-x-6' : ''}`}></span>
                        </button>
                    </div>

                    {/* Content: Readability Mode */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${readabilityMode ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500'}`} aria-hidden="true">
                                <FaTextHeight size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">Readability Mode</h3>
                                <p className="text-xs text-gray-500">Increased spacing for focus</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setReadabilityMode(!readabilityMode);
                                speak(`Readability mode ${!readabilityMode ? 'enabled' : 'disabled'}`);
                            }}
                            className={`w-14 h-8 rounded-full transition-all relative ${readabilityMode ? 'bg-accent' : 'bg-gray-200'}`}
                            role="switch"
                            aria-checked={readabilityMode}
                            aria-label="Toggle Readability Mode"
                        >
                            <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${readabilityMode ? 'translate-x-6' : ''}`}></span>
                        </button>
                    </div>

                    {/* Content: Simplified Mode */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${simplifiedMode ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500'}`} aria-hidden="true">
                                <FaUniversalAccess size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">Simplified Mode</h3>
                                <p className="text-xs text-gray-500">Reduced interface complexity</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setSimplifiedMode(!simplifiedMode);
                                speak(`Simplified mode ${!simplifiedMode ? 'enabled' : 'disabled'}`);
                            }}
                            className={`w-14 h-8 rounded-full transition-all relative ${simplifiedMode ? 'bg-accent' : 'bg-gray-200'}`}
                            role="switch"
                            aria-checked={simplifiedMode}
                            aria-label="Toggle Simplified Mode"
                        >
                            <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${simplifiedMode ? 'translate-x-6' : ''}`}></span>
                        </button>
                    </div>

                    {/* Visual: Text Size */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gray-100 text-gray-500" aria-hidden="true">
                                <FaTextHeight size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">Text Scaling</h3>
                                <p className="text-xs text-gray-500">Adjust content size ({fontSize}%)</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[100, 150, 200, 300, 400].map(size => (
                                <button
                                    key={size}
                                    onClick={() => {
                                        setFontSize(size);
                                        speak(`Text scale set to ${size} percent`);
                                    }}
                                    className={`flex-1 min-w-[60px] py-2 rounded-xl font-bold transition-all ${fontSize === size ? 'bg-primary text-white scale-105 shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    aria-label={`Scale text to ${size} percent`}
                                    aria-pressed={fontSize === size}
                                >
                                    {size === 100 ? 'Default' : `${size}%`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Tip */}
                <div className="bg-gray-50 p-6 text-center">
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                        <FaMicrophone aria-hidden="true" /> Tip: Try saying "Open Shopping Cart" using Voice Commands.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccessibilityModal;
