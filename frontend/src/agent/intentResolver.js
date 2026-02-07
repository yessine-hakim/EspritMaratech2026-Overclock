/**
 * Intent Resolver - Analyse d'intention et sélection/génération de tools
 * 
 * ⚠️ LOGIQUE AGENTIC FONDAMENTALE :
 * 1. Analyse l'intention via LLM (Groq)
 * 2. Cherche un tool existant (frontend + VCL)
 * 3. Si trouvé → utilise, sinon → génère un nouveau tool
 * 4. Évite toute duplication
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Analyse l'intention utilisateur et retourne un tool à exécuter
 * @param {string} transcript - Transcription vocale
 * @param {ToolRegistry} toolRegistry - Registre de tools
 * @returns {Object} - { tool, params, reasoning }
 */
export async function resolveIntent(transcript, toolRegistry) {
    console.log('[INTENT] 🧠 Analyzing intent:', transcript);

    // 1. Récupérer tous les tools disponibles
    const availableTools = toolRegistry.getAllTools();
    console.log('[INTENT] 📋 Available tools count:', availableTools.length);
    console.log('[INTENT] 📋 Available tool IDs:', availableTools.map(t => t.id));

    // 2. Analyser l'intention via LLM
    const analysis = await analyzeIntentWithLLM(transcript, availableTools);

    console.log('[INTENT] 💡 Analysis result:');
    console.log('  - matchingToolId:', analysis.matchingToolId);
    console.log('  - shouldCreateNew:', analysis.shouldCreateNew);
    console.log('  - reasoning:', analysis.reasoning);
    console.log('  - params:', analysis.params);

    // 3. Chercher un tool existant qui correspond
    if (analysis.matchingToolId) {
        console.log('[INTENT] 🔍 Searching for tool with ID:', analysis.matchingToolId);
        const tool = toolRegistry.findById(analysis.matchingToolId);

        if (tool) {
            console.log(`[AGENTIC] ✅ Using existing tool: "${tool.name}" (source: ${tool.source})`);
            console.log(`[AGENTIC] 📝 Reasoning: ${analysis.reasoning}`);
            return {
                tool,
                params: analysis.params || {},
                reasoning: analysis.reasoning,
                isNewTool: false
            };
        } else {
            console.warn('[INTENT] ⚠️ Tool ID not found in registry:', analysis.matchingToolId);
        }
    } else {
        console.warn('[INTENT] ⚠️ No matchingToolId returned from analysis');
    }

    // 4. Si aucun tool existant ne correspond, générer un nouveau tool
    console.log('[AGENTIC] ⚠️ No matching tool found. Generating new tool...');
    const newTool = await generateNewTool(transcript, analysis, toolRegistry);

    if (newTool) {
        console.log(`[AGENTIC] ✨ Generated new tool: "${newTool.name}"`);
        toolRegistry.register(newTool);
        return {
            tool: newTool,
            params: analysis.params || {},
            reasoning: `Generated new tool because: ${analysis.reasoning}`,
            isNewTool: true
        };
    }

    // 5. Fallback : aucun tool trouvé ni généré
    console.log('[AGENTIC] ❌ Unable to resolve intent');
    return null;
}

/**
 * Analyse l'intention via l'API Groq
 */
async function analyzeIntentWithLLM(transcript, availableTools) {
    console.log('[INTENT] 🤖 Starting LLM analysis...');

    if (!GROQ_API_KEY) {
        console.error('[INTENT] ❌ GROQ_API_KEY not configured');
        console.log('[INTENT] 🔄 Falling back to keyword matching...');
        return fallbackMatching(transcript, availableTools);
    }

    console.log('[INTENT] ✅ GROQ_API_KEY found');

    // Préparer la liste des tools pour le LLM
    const toolsList = availableTools.map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        source: tool.source
    }));

    console.log('[INTENT] 📤 Sending to LLM:', {
        toolsCount: toolsList.length,
        transcript: transcript
    });

    const systemPrompt = `You are an intelligent voice assistant that matches user commands to available tools.

AVAILABLE TOOLS:
${JSON.stringify(toolsList, null, 2)}

Your task:
1. Analyze the user's voice command
2. Find the BEST MATCHING existing tool from the list above
3. Extract any parameters needed for the tool
4. Explain your reasoning

CRITICAL RULES:
- ALWAYS prefer an existing tool over creating a new one
- Only suggest creating a new tool if NO existing tool can satisfy the request
- Be flexible with matching (e.g., "go to cart" matches "Navigate to Cart")
- Extract parameters intelligently (e.g., product IDs, search queries, values)

Respond in JSON format:
{
  "matchingToolId": "tool_id or null if no match",
  "params": { "key": "value" },
  "reasoning": "explanation of your choice",
  "shouldCreateNew": false
}`;

    try {
        console.log('[INTENT] 🌐 Calling Groq API...');

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `User command: "${transcript}"` }
                ],
                temperature: 0,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[INTENT] ❌ Groq API error:', response.status, errorText);
            throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[INTENT] 📥 LLM raw response:', data);

        const result = JSON.parse(data.choices[0].message.content);
        console.log('[INTENT] ✅ LLM parsed result:', result);

        return {
            matchingToolId: result.matchingToolId,
            params: result.params || {},
            reasoning: result.reasoning || 'No reasoning provided',
            shouldCreateNew: result.shouldCreateNew || false
        };
    } catch (error) {
        console.error('[INTENT] ❌ LLM analysis failed:', error);
        console.log('[INTENT] 🔄 Falling back to keyword matching...');

        // Fallback : matching simple par mots-clés
        return fallbackMatching(transcript, availableTools);
    }
}

/**
 * Matching de fallback si l'API Groq échoue
 */
function fallbackMatching(transcript, availableTools) {
    console.log('[FALLBACK] 🔍 Starting keyword matching...');
    console.log('[FALLBACK] Input:', transcript);

    const transcriptLower = transcript.toLowerCase();

    // Règles simples de matching
    const rules = [
        { keywords: ['cart', 'basket', 'shopping cart'], toolId: 'navigate_cart' },
        { keywords: ['home', 'main', 'homepage'], toolId: 'navigate_home' },
        { keywords: ['banking', 'bank', 'balance', 'account'], toolId: 'navigate_banking' },
        { keywords: ['profile', 'my profile', 'user profile'], toolId: 'navigate_profile' },
        { keywords: ['login', 'sign in', 'log in'], toolId: 'navigate_login' },
        { keywords: ['products', 'results', 'all products', 'show products', 'browse'], toolId: 'navigate_results' },
        { keywords: ['search', 'find', 'look for'], toolId: 'search_products' },
        { keywords: ['add to cart', 'add product'], toolId: 'add_to_cart' },
        { keywords: ['checkout', 'pay', 'purchase'], toolId: 'checkout_cart' },
        { keywords: ['high contrast'], toolId: 'toggle_high_contrast' },
        { keywords: ['font size'], toolId: 'change_font_size' },
        { keywords: ['logout', 'sign out', 'log out'], toolId: 'logout_user' }
    ];

    for (const rule of rules) {
        const matchedKeyword = rule.keywords.find(keyword => transcriptLower.includes(keyword));
        if (matchedKeyword) {
            console.log(`[FALLBACK] ✅ Matched keyword "${matchedKeyword}" → tool: ${rule.toolId}`);
            return {
                matchingToolId: rule.toolId,
                params: extractParams(transcript),
                reasoning: `Matched by keyword: ${matchedKeyword}`,
                shouldCreateNew: false
            };
        }
    }

    console.log('[FALLBACK] ❌ No keyword match found');
    return {
        matchingToolId: null,
        params: {},
        reasoning: 'No matching tool found',
        shouldCreateNew: true
    };
}

/**
 * Extrait les paramètres d'une commande vocale
 */
function extractParams(transcript) {
    const params = {};

    // Extraire une query de recherche
    const searchMatch = transcript.match(/(?:search|find|look for)\s+(.+)/i);
    if (searchMatch) {
        params.query = searchMatch[1].trim();
    }

    // Extraire un nombre (pour font size, etc.)
    const numberMatch = transcript.match(/(\d+)/);
    if (numberMatch) {
        params.value = parseInt(numberMatch[1]);
    }

    return params;
}

/**
 * Génère un nouveau tool dynamiquement avec du code exécutable via LLM
 * ⚠️ IMPORTANT : Ce tool doit être fonctionnel et réutilisable
 */
async function generateNewTool(transcript, analysis, toolRegistry) {
    console.log('[INTENT] 🔨 Generating new executable tool for:', transcript);

    // Récupérer les dépendances disponibles pour le code généré
    const availableTools = toolRegistry.getAllTools();
    const toolsList = availableTools.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description
    }));

    // Demander au LLM de générer du code JavaScript exécutable
    const codePrompt = `You are a code generator for a voice-controlled web application.

USER REQUEST: "${transcript}"

AVAILABLE TOOLS (you can compose them):
${JSON.stringify(toolsList, null, 2)}

AVAILABLE FUNCTIONS in the execution context:
- navigate(path) - Navigate to a route (e.g., navigate('/cart'))
- speak(text) - Speak text to the user
- api - Axios instance for API calls (e.g., await api.get('/api/products/'))
- document - DOM access (e.g., document.body.style.zoom = '0.8')
- Any existing tool can be called via toolRegistry.findById(id).execute(params)

COMMON USE CASES:

1. DOM MANIPULATION (change page appearance):
\`\`\`javascript
try {
  document.body.style.zoom = '0.8'; // Make page smaller
  speak("Page zoomed out");
  return { success: true, message: "Page size reduced" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}
\`\`\`

2. API CALLS (fetch data from backend):
\`\`\`javascript
try {
  const response = await api.get('/api/products/');
  speak("Found " + response.data.length + " products");
  return { success: true, message: "Products loaded", data: response.data };
} catch (error) {
  return { success: false, message: "API error: " + error.message };
}
\`\`\`

3. NAVIGATION + SEARCH:
\`\`\`javascript
try {
  navigate('/results?q=laptop');
  speak("Showing laptops");
  return { success: true, message: "Navigated to laptop search" };
} catch (error) {
  return { success: false, message: "Navigation failed: " + error.message };
}
\`\`\`

4. COMPOSE EXISTING TOOLS:
\`\`\`javascript
try {
  const cartTool = toolRegistry.findById('get_cart_status');
  const result = await cartTool.execute({});
  speak("You have " + result.data.itemCount + " items");
  return { success: true, message: "Cart info retrieved", data: result.data };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}
\`\`\`

YOUR TASK:
Generate a JavaScript function body that fulfills: "${transcript}"

CRITICAL RULES:
- Generate ONLY the function body (no function declaration, no async keyword)
- ALWAYS use try/catch for error handling
- ALWAYS return { success: boolean, message: string, data?: any }
- Be creative and use all available functions
- For DOM changes, use document directly
- For API calls, use api.get(), api.post(), etc.

Respond with ONLY the JavaScript code (no markdown backticks, no explanation).`;

    try {
        if (!GROQ_API_KEY) {
            console.warn('[INTENT] ⚠️ Cannot generate executable code without API key');
            return createPlaceholderTool(transcript);
        }

        console.log('[INTENT] 🤖 Asking LLM to generate executable code...');

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'user', content: codePrompt }
                ],
                temperature: 0.3,
                max_tokens: 800
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[INTENT] ❌ Code generation failed:', response.status, errorText);
            return createPlaceholderTool(transcript);
        }

        const data = await response.json();
        let generatedCode = data.choices[0].message.content.trim();

        // Nettoyer le code (enlever les markdown backticks si présents)
        generatedCode = generatedCode
            .replace(/```javascript\n?/g, '')
            .replace(/```js\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/^async\s+/g, '') // Enlever async si présent
            .trim();

        console.log('[INTENT] ✅ Generated code:', generatedCode);

        // Créer le tool avec le code généré
        const toolId = `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const toolName = `Custom: ${transcript.substring(0, 40)}`;
        const toolDescription = `AI-generated tool for: ${transcript}`;

        // Créer une fonction exécutable à partir du code généré
        // ⚠️ SÉCURITÉ : En production, il faudrait valider/sandboxer le code
        const executeFunction = new Function('params', 'navigate', 'speak', 'toolRegistry', 'api', 'document', generatedCode);

        const newTool = {
            id: toolId,
            name: toolName,
            description: toolDescription,
            source: 'generated',
            execute: async (params) => {
                console.log(`[GENERATED TOOL] Executing AI-generated code for: ${toolName}`);
                console.log(`[GENERATED TOOL] Code:\n${generatedCode}`);

                try {
                    // Récupérer les dépendances du contexte global
                    const agent = window.__VOICE_AGENT__;
                    const deps = agent?.config?.dependencies || {};

                    // Importer axios depuis le module
                    const api = (await import('../api.js')).default;

                    const result = await executeFunction(
                        params,
                        deps.navigate || (() => console.warn('navigate not available')),
                        deps.speak || (() => console.warn('speak not available')),
                        toolRegistry,
                        api,
                        document
                    );

                    console.log(`[GENERATED TOOL] ✅ Execution result:`, result);
                    return result;
                } catch (error) {
                    console.error('[GENERATED TOOL] ❌ Execution error:', error);
                    return {
                        success: false,
                        message: `Execution error: ${error.message}`,
                        error: error.message
                    };
                }
            },
            createdAt: Date.now(),
            originalTranscript: transcript,
            generatedCode: generatedCode
        };

        return newTool;

    } catch (error) {
        console.error('[INTENT] ❌ Failed to generate executable tool:', error);
        console.error('[INTENT] Error details:', error.stack);
        return createPlaceholderTool(transcript);
    }
}

/**
 * Crée un tool avec génération de code intelligente si l'API LLM échoue
 * Utilise des patterns simples pour les cas courants
 */
function createPlaceholderTool(transcript) {
    console.log('[INTENT] 🔨 Creating intelligent fallback tool for:', transcript);

    const toolId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const toolName = `Fallback: ${transcript.substring(0, 40)}`;
    const transcriptLower = transcript.toLowerCase();

    // Générer du code simple basé sur des patterns courants
    let generatedCode = null;

    // Pattern 1: Zoom/Size manipulation
    if (transcriptLower.includes('bigger') || transcriptLower.includes('larger') || transcriptLower.includes('zoom in')) {
        generatedCode = `
try {
  document.body.style.zoom = '1.2';
  speak("Page zoomed in to 120%");
  return { success: true, message: "Page size increased" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}`;
    }
    else if (transcriptLower.includes('smaller') || transcriptLower.includes('zoom out')) {
        generatedCode = `
try {
  document.body.style.zoom = '0.8';
  speak("Page zoomed out to 80%");
  return { success: true, message: "Page size reduced" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}`;
    }
    else if (transcriptLower.includes('normal size') || transcriptLower.includes('reset zoom')) {
        generatedCode = `
try {
  document.body.style.zoom = '1';
  speak("Page zoom reset to normal");
  return { success: true, message: "Page size reset" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}`;
    }
    // Pattern 2: Dark/Light mode
    else if (transcriptLower.includes('dark') && (transcriptLower.includes('mode') || transcriptLower.includes('theme') || transcriptLower.includes('background'))) {
        generatedCode = `
try {
  document.body.style.backgroundColor = '#1a1a1a';
  document.body.style.color = '#ffffff';
  speak("Dark mode activated");
  return { success: true, message: "Dark mode enabled" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}`;
    }
    else if (transcriptLower.includes('light') && (transcriptLower.includes('mode') || transcriptLower.includes('theme') || transcriptLower.includes('background'))) {
        generatedCode = `
try {
  document.body.style.backgroundColor = '#ffffff';
  document.body.style.color = '#000000';
  speak("Light mode activated");
  return { success: true, message: "Light mode enabled" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}`;
    }
    // Pattern 3: Show/Get products
    else if ((transcriptLower.includes('show') || transcriptLower.includes('get') || transcriptLower.includes('fetch')) && transcriptLower.includes('product')) {
        generatedCode = `
try {
  const response = await api.get('/api/products/');
  speak("Found " + response.data.length + " products");
  navigate('/results');
  return { success: true, message: "Products loaded", data: response.data };
} catch (error) {
  return { success: false, message: "API error: " + error.message };
}`;
    }
    // Pattern 4: Generic fallback
    else {
        generatedCode = `
try {
  speak("I understood: ${transcript.replace(/"/g, '\\"')}. But I don't know how to do that yet.");
  return { success: true, message: "Command acknowledged but not implemented" };
} catch (error) {
  return { success: false, message: "Error: " + error.message };
}`;
    }

    console.log('[INTENT] ✅ Generated fallback code:', generatedCode);

    // Créer une fonction exécutable
    const executeFunction = new Function('params', 'navigate', 'speak', 'toolRegistry', 'api', 'document', generatedCode);

    return {
        id: toolId,
        name: toolName,
        description: `Intelligent fallback tool for: ${transcript}`,
        source: 'fallback',
        execute: async (params) => {
            console.log(`[FALLBACK TOOL] Executing intelligent fallback for: ${toolName}`);
            console.log(`[FALLBACK TOOL] Code:\n${generatedCode}`);

            try {
                // Récupérer les dépendances du contexte global
                const agent = window.__VOICE_AGENT__;
                const deps = agent?.config?.dependencies || {};

                // Importer axios
                const api = (await import('../api.js')).default;

                const result = await executeFunction(
                    params,
                    deps.navigate || (() => console.warn('navigate not available')),
                    deps.speak || (() => console.warn('speak not available')),
                    toolRegistry,
                    api,
                    document
                );

                console.log(`[FALLBACK TOOL] ✅ Execution result:`, result);
                return result;
            } catch (error) {
                console.error('[FALLBACK TOOL] ❌ Execution error:', error);
                return {
                    success: false,
                    message: `Execution error: ${error.message}`,
                    error: error.message
                };
            }
        },
        createdAt: Date.now(),
        originalTranscript: transcript,
        generatedCode: generatedCode,
        isFallback: true
    };
}

/**
 * Explique le choix d'un tool (pour debugging)
 */
export function explainToolChoice(tool, reasoning) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 TOOL SELECTION EXPLANATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Tool: ${tool.name}`);
    console.log(`Source: ${tool.source}`);
    console.log(`Reasoning: ${reasoning}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
