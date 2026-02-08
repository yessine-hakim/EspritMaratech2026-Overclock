import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '', // Empty for relative proxy in dev
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// CSRF Token handling
api.interceptors.request.use((config) => {
    // Function to get cookie by name
    const getCookie = (name) => {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    const csrftoken = getCookie('pay4all_csrftoken');
    console.log(`DEBUG: Interceptor - Cookies available: ${document.cookie.substring(0, 50)}...`);
    console.log(`DEBUG: Interceptor - pay4all_csrftoken found: ${!!csrftoken}`);

    if (csrftoken) {
        config.headers['X-CSRFToken'] = csrftoken;
        console.log("DEBUG: Interceptor - Set X-CSRFToken header");
    } else {
        console.warn("DEBUG: Interceptor - CSRF Token MISSING from cookies");
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
