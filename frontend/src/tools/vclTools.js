/**
 * VCL Tools - Intégration avec le backend VCL (Voice Command Logic)
 * 
 * Récupère et wrappe les tools exposés par le backend Django.
 * Le backend voice_intent.py expose déjà des actions via l'API Groq.
 */

import api from '../api';

/**
 * Récupère les tools VCL depuis le backend
 * Note: Si le backend n'expose pas encore d'endpoint /vcl-tools/,
 * nous utilisons les actions connues de voice_intent.py
 */
export async function fetchVCLTools(deps) {
    const { speak } = deps;

    // Tentative de récupération depuis l'API
    try {
        const response = await api.get('/api/recommendations/vcl-tools/');
        return response.data.tools.map(tool => wrapVCLTool(tool, deps));
    } catch (error) {
        console.log('[VCL] Backend /vcl-tools/ endpoint not available, using fallback tools');
        return createFallbackVCLTools(deps);
    }
}

/**
 * Wrappe un tool VCL backend en format unifié
 */
function wrapVCLTool(backendTool, deps) {
    return {
        id: `vcl_${backendTool.id}`,
        name: backendTool.name,
        description: backendTool.description,
        source: 'vcl',
        execute: async (params) => {
            try {
                const response = await api.post('/api/recommendations/vcl-execute/', {
                    toolId: backendTool.id,
                    params
                });

                if (response.data.feedback) {
                    deps.speak(response.data.feedback);
                }

                return response.data;
            } catch (error) {
                console.error('[VCL] Tool execution failed:', error);
                return { success: false, error: error.message };
            }
        }
    };
}

/**
 * Tools VCL de fallback basés sur voice_intent.py
 * Ces tools correspondent aux actions déjà implémentées dans le backend
 */
function createFallbackVCLTools(deps) {
    const { speak } = deps;

    return [
        {
            id: 'vcl_check_affordability',
            name: 'Check Product Affordability',
            description: 'Check if user can afford a specific product',
            source: 'vcl',
            execute: async (params) => {
                try {
                    const productId = params.productId || params.value;
                    const transcript = `Can I afford this product?`;

                    const response = await api.post('/api/recommendations/voice-intent/', {
                        transcript,
                        productId
                    });

                    if (response.data.response) {
                        speak(response.data.response);
                    }

                    return {
                        success: true,
                        action: response.data.action,
                        target: response.data.target,
                        message: response.data.response
                    };
                } catch (error) {
                    speak('Unable to check affordability at the moment');
                    return { success: false, error: error.message };
                }
            }
        },
        {
            id: 'vcl_check_balance',
            name: 'Check Bank Balance',
            description: 'Check user bank account balance',
            source: 'vcl',
            execute: async (params) => {
                try {
                    const response = await api.post('/api/recommendations/voice-intent/', {
                        transcript: 'What is my balance?'
                    });

                    if (response.data.response) {
                        speak(response.data.response);
                    }

                    return {
                        success: true,
                        message: response.data.response
                    };
                } catch (error) {
                    speak('Unable to check balance at the moment');
                    return { success: false, error: error.message };
                }
            }
        },
        {
            id: 'vcl_budget_status',
            name: 'Check Budget Status',
            description: 'Check remaining budget for the month',
            source: 'vcl',
            execute: async (params) => {
                try {
                    const response = await api.post('/api/recommendations/voice-intent/', {
                        transcript: 'How is my budget?'
                    });

                    if (response.data.response) {
                        speak(response.data.response);
                    }

                    return {
                        success: true,
                        message: response.data.response
                    };
                } catch (error) {
                    speak('Unable to check budget at the moment');
                    return { success: false, error: error.message };
                }
            }
        },
        {
            id: 'vcl_general_chat',
            name: 'General Chat',
            description: 'Handle general questions and conversation',
            source: 'vcl',
            execute: async (params) => {
                try {
                    const query = params.query || params.value || '';

                    const response = await api.post('/api/recommendations/voice-intent/', {
                        transcript: query
                    });

                    if (response.data.response) {
                        speak(response.data.response);
                    }

                    return {
                        success: true,
                        message: response.data.response
                    };
                } catch (error) {
                    speak('I did not understand that');
                    return { success: false, error: error.message };
                }
            }
        }
    ];
}

/**
 * Exécute une commande via le backend voice_intent.py
 * Utilisé pour les commandes qui ne matchent aucun tool spécifique
 */
export async function executeVoiceIntent(transcript, productId = null) {
    try {
        const response = await api.post('/api/recommendations/voice-intent/', {
            transcript,
            productId
        });

        return {
            success: true,
            action: response.data.action,
            target: response.data.target,
            value: response.data.value,
            response: response.data.response
        };
    } catch (error) {
        console.error('[VCL] Voice intent execution failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
