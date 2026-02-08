import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaMicrophone } from 'react-icons/fa';
import api from '../api';

const RegisterPage = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        monthly_budget: '',
        max_single_purchase: '',
        preferred_price_range_min: '',
        preferred_price_range_min: '',
        preferred_price_range_max: '',
        currency: 'TND',
        iban: ''
    });
    const [error, setError] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [voiceBlob, setVoiceBlob] = useState(null);
    const errorRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleVoiceEnroll = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setVoiceBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            setIsRecording(true);
            mediaRecorder.start();
            setTimeout(() => {
                mediaRecorder.stop();
                setIsRecording(false);
            }, 3000);
        } catch (err) {
            console.error("Biometric capture failed", err);
            setError("Could not access microphone for VoiceID.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            errorRef.current?.focus();
            return;
        }

        try {
            const { confirmPassword, ...apiData } = formData;
            await register(apiData);

            if (voiceBlob) {
                const voiceForm = new FormData();
                voiceForm.append('audio', voiceBlob, 'enroll.wav');
                await api.post('/api/voiceid/enroll/', voiceForm);
            }

            navigate('/');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Registration failed';
            setError(msg);
            errorRef.current?.focus();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-16 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl w-full border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-primary mb-2">Create Account</h2>
                    <p className="text-gray-medium">Join Pay4All for smarter shopping</p>
                </div>

                {error && (
                    <div
                        ref={errorRef}
                        className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm break-words focus:outline-none focus:ring-2 focus:ring-red-500"
                        role="alert"
                        aria-live="assertive"
                        id="registration-error"
                        tabIndex="-1"
                    >
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Access Credentials */}
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-lg font-semibold text-primary border-b border-gray-100 pb-2">Login Details</h3>
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="reg-email" className="block text-sm font-semibold text-primary mb-2">Email Address (Username)</label>
                        <input
                            id="reg-email"
                            type="email"
                            name="email"
                            className={`w-full px-4 py-3 rounded-lg border bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors ${error ? 'border-red-500' : 'border-gray-light'}`}
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            aria-invalid={!!error}
                            aria-describedby={error ? 'registration-error' : undefined}
                        />
                    </div>

                    <div>
                        <label htmlFor="reg-password" className="block text-sm font-semibold text-primary mb-2">Password</label>
                        <input
                            id="reg-password"
                            type="password"
                            name="password"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="reg-confirm" className="block text-sm font-semibold text-primary mb-2">Confirm Password</label>
                        <input
                            id="reg-confirm"
                            type="password"
                            name="confirmPassword"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Personal Info */}
                    <div className="md:col-span-2 space-y-4 mt-4">
                        <h3 className="text-lg font-semibold text-primary border-b border-gray-100 pb-2">Personal Information</h3>
                    </div>

                    <div>
                        <label htmlFor="reg-first" className="block text-sm font-semibold text-primary mb-2">First Name</label>
                        <input
                            id="reg-first"
                            type="text"
                            name="first_name"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="John"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="reg-last" className="block text-sm font-semibold text-primary mb-2">Last Name</label>
                        <input
                            id="reg-last"
                            type="text"
                            name="last_name"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="Doe"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Financial Context */}
                    <div className="md:col-span-2 space-y-4 mt-4">
                        <h3 className="text-lg font-semibold text-primary border-b border-gray-100 pb-2">Financial Context</h3>
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="reg-iban" className="block text-sm font-semibold text-primary mb-2">Bank Account IBAN</label>
                        <input
                            id="reg-iban"
                            type="text"
                            name="iban"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors font-mono"
                            placeholder="TN1234567890123456789012"
                            value={formData.iban}
                            onChange={handleChange}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Please enter your 24-character Tunisian IBAN associated with Pay4All.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Monthly Budget</label>
                        <input
                            type="number"
                            name="monthly_budget"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="0.00"
                            value={formData.monthly_budget}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Max Single Purchase</label>
                        <input
                            type="number"
                            name="max_single_purchase"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="0.00"
                            value={formData.max_single_purchase}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Min Price Range</label>
                        <input
                            type="number"
                            name="preferred_price_range_min"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="0.00"
                            value={formData.preferred_price_range_min}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Max Price Range</label>
                        <input
                            type="number"
                            name="preferred_price_range_max"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="0.00"
                            value={formData.preferred_price_range_max}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="md:col-span-2 space-y-4 mt-4">
                        <h3 className="text-lg font-semibold text-primary border-b border-gray-100 pb-2">VoiceID Biometrics (Highly Recommended)</h3>
                        <p className="text-sm text-gray-medium italic">Link your voice fingerprint to enable 100% voice login and secure high-value transfers.</p>
                    </div>

                    <div className="md:col-span-2 bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center gap-4">
                        {voiceBlob ? (
                            <div className="flex items-center gap-3 text-accent font-bold">
                                <div className="w-4 h-4 bg-accent rounded-full animate-ping" />
                                Voice Signature Captured
                                <button
                                    type="button"
                                    onClick={() => setVoiceBlob(null)}
                                    className="text-xs text-red-500 underline ml-4"
                                >
                                    Remove and Re-record
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={handleVoiceEnroll}
                                    disabled={isRecording}
                                    className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${isRecording ? 'bg-red-100 text-red-600' : 'bg-white text-accent hover:bg-accent hover:text-white border-2 border-accent'}`}
                                >
                                    <FaMicrophone /> {isRecording ? "Recording... Say 'My voice is my password'" : "Enroll Voice Signature"}
                                </button>
                                <p className="text-[10px] text-gray-400">Captures a 3-second biometric fingerprint</p>
                            </>
                        )}
                    </div>

                    <div className="md:col-span-2 mt-6">
                        <button
                            type="submit"
                            className="w-full py-4 bg-accent text-white rounded-xl font-bold hover:bg-[#0e5a56] transition-all transform hover:-translate-y-1 shadow-lg shadow-accent/20"
                        >
                            Create Account
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center text-sm text-gray-medium">
                    Already have an account?{' '}
                    <Link to="/login" className="text-accent font-semibold hover:underline">
                        Login here
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
