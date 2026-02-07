/**
 * Tool Registry - Registre unifié de tous les tools
 * 
 * Gère les tools frontend, backend (VCL), et générés dynamiquement.
 * Prévient la duplication de tools (logique agentic).
 */

export class ToolRegistry {
    constructor() {
        this.tools = new Map(); // id -> tool
        this.initialized = false;
    }

    /**
     * Initialise le registry avec les tools frontend et VCL
     */
    async initialize(frontendTools = [], vclTools = []) {
        console.log('[REGISTRY] 🔧 Initializing tool registry...');

        // Charger les tools frontend
        frontendTools.forEach(tool => {
            this.register(tool);
        });

        // Charger les tools VCL backend
        vclTools.forEach(tool => {
            this.register(tool);
        });

        this.initialized = true;
        console.log(`[REGISTRY] ✅ Registry initialized with ${this.tools.size} tools`);
        this.logAllTools();
    }

    /**
     * Enregistre un nouveau tool
     * ⚠️ IMPORTANT : Vérifie la duplication avant d'ajouter
     */
    register(tool) {
        if (!tool.id || !tool.name || !tool.execute) {
            console.error('[REGISTRY] ❌ Invalid tool format:', tool);
            return false;
        }

        // Vérifier si un tool similaire existe déjà
        const duplicate = this.findDuplicate(tool);
        if (duplicate) {
            console.warn(`[REGISTRY] ⚠️ Duplicate tool detected: "${tool.name}" is similar to existing tool "${duplicate.name}"`);
            return false;
        }

        this.tools.set(tool.id, {
            ...tool,
            createdAt: tool.createdAt || Date.now()
        });

        console.log(`[REGISTRY] ➕ Registered tool: ${tool.name} (source: ${tool.source})`);
        return true;
    }

    /**
     * Trouve un tool par ID
     */
    findById(id) {
        return this.tools.get(id);
    }

    /**
     * Trouve les tools correspondant à une intention
     * Utilise la similarité de description/nom
     */
    findByIntent(intent) {
        const matches = [];
        const intentLower = intent.toLowerCase();

        for (const tool of this.tools.values()) {
            const nameLower = tool.name.toLowerCase();
            const descLower = (tool.description || '').toLowerCase();

            // Matching simple par mots-clés
            if (nameLower.includes(intentLower) ||
                descLower.includes(intentLower) ||
                intentLower.includes(nameLower)) {
                matches.push({
                    tool,
                    score: this.calculateMatchScore(intent, tool)
                });
            }
        }

        // Trier par score de pertinence
        matches.sort((a, b) => b.score - a.score);

        return matches.map(m => m.tool);
    }

    /**
     * Calcule un score de pertinence entre une intention et un tool
     */
    calculateMatchScore(intent, tool) {
        let score = 0;
        const intentWords = intent.toLowerCase().split(/\s+/);
        const toolWords = [
            ...tool.name.toLowerCase().split(/\s+/),
            ...(tool.description || '').toLowerCase().split(/\s+/)
        ];

        intentWords.forEach(word => {
            if (toolWords.includes(word)) {
                score += 10;
            }
        });

        return score;
    }

    /**
     * Détecte si un tool est un duplicata d'un tool existant
     */
    findDuplicate(newTool) {
        const newNameLower = newTool.name.toLowerCase();
        const newDescLower = (newTool.description || '').toLowerCase();

        for (const existingTool of this.tools.values()) {
            const existingNameLower = existingTool.name.toLowerCase();
            const existingDescLower = (existingTool.description || '').toLowerCase();

            // Vérifier similarité exacte du nom
            if (newNameLower === existingNameLower) {
                return existingTool;
            }

            // Vérifier similarité de description
            const similarity = this.calculateSimilarity(newDescLower, existingDescLower);
            if (similarity > 0.8) {
                return existingTool;
            }
        }

        return null;
    }

    /**
     * Calcule la similarité entre deux chaînes (Jaccard)
     */
    calculateSimilarity(str1, str2) {
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * Récupère tous les tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }

    /**
     * Récupère les tools par source
     */
    getToolsBySource(source) {
        return this.getAllTools().filter(tool => tool.source === source);
    }

    /**
     * Log tous les tools (debug)
     */
    logAllTools() {
        console.log('[REGISTRY] 📋 Available tools:');
        this.getAllTools().forEach(tool => {
            console.log(`  - ${tool.name} (${tool.source}): ${tool.description}`);
        });
    }

    /**
     * Réinitialise le registry
     */
    clear() {
        this.tools.clear();
        this.initialized = false;
        console.log('[REGISTRY] 🗑️ Registry cleared');
    }
}
