/**
 * Agent Vocal - Orchestrateur principal de l'agent agentic
 * 
 * Coordonne tous les modules :
 * - SpeechManager (écoute continue)
 * - ToolRegistry (gestion des tools)
 * - IntentResolver (analyse et sélection)
 * 
 * ⚠️ LOGIQUE AGENTIC :
 * L'agent écoute en continu, analyse chaque commande, sélectionne le meilleur tool,
 * et génère de nouveaux tools si nécessaire.
 */

import { SpeechManager } from './speechManager';
import { ToolRegistry } from './toolRegistry';
import { resolveIntent, explainToolChoice } from './intentResolver';
import { createFrontendTools } from '../tools/frontendTools';
import { fetchVCLTools } from '../tools/vclTools';

export class AgentVocal {
    constructor(config) {
        this.config = config;
        this.speechManager = null;
        this.toolRegistry = null;
        this.initialized = false;
        this.isProcessing = false;

        // Callbacks
        this.onStateChange = config.onStateChange || (() => { });
        this.onError = config.onError || ((error) => console.error('[AGENT]', error));
    }

    /**
     * Initialise l'agent vocal
     * ⚠️ IMPORTANT : Démarre l'écoute automatiquement (pas de bouton)
     */
    async initialize() {
        if (this.initialized) {
            console.warn('[AGENT] Already initialized');
            return;
        }

        console.log('[AGENT] 🚀 Initializing Agentic Voice Agent...');

        try {
            // 1. Initialiser le ToolRegistry
            this.toolRegistry = new ToolRegistry();

            // 2. Charger les tools frontend
            const frontendTools = createFrontendTools(this.config.dependencies);

            // 3. Charger les tools VCL backend
            let vclTools = [];
            try {
                vclTools = await fetchVCLTools(this.config.dependencies);
                console.log(`[AGENT] ✅ Loaded ${vclTools.length} VCL tools from backend`);
            } catch (error) {
                console.warn('[AGENT] ⚠️ Failed to load VCL tools:', error.message);
            }

            // 4. Initialiser le registry avec tous les tools
            await this.toolRegistry.initialize(frontendTools, vclTools);

            // 5. Initialiser le SpeechManager
            this.speechManager = new SpeechManager((transcript) => {
                this.handleVoiceInput(transcript);
            });

            // ✅ CHANGÉ : Ne démarre PAS l'écoute automatiquement
            // L'utilisateur doit cliquer sur le bouton pour démarrer
            // const started = this.speechManager.startContinuousListening();

            // if (!started) {
            //   throw new Error('Failed to start speech recognition');
            // }

            this.initialized = true;
            this.updateState({ initialized: true, listening: false }); // ✅ listening: false

            console.log('[AGENT] ✅ Agent initialized (waiting for button click)');
            // this.speechManager.speak('Voice agent ready'); // ✅ Désactivé


        } catch (error) {
            console.error('[AGENT] ❌ Initialization failed:', error);
            this.onError(error);
            throw error;
        }
    }

    /**
     * Traite une entrée vocale
     * ⚠️ CŒUR DE LA LOGIQUE AGENTIC
     */
    async handleVoiceInput(transcript) {
        if (this.isProcessing) {
            console.log('[AGENT] ⏳ Already processing, skipping...');
            return;
        }

        this.isProcessing = true;
        this.updateState({ lastCommand: transcript, processing: true });

        console.log('\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🎙️ NEW VOICE COMMAND');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`Input: "${transcript}"`);
        console.log('───────────────────────────────────────────────────────────');

        try {
            // 1. Résoudre l'intention (sélectionner ou générer un tool)
            const resolution = await resolveIntent(transcript, this.toolRegistry);

            if (!resolution) {
                console.log('[AGENT] ❌ Unable to resolve intent');
                this.speechManager.speak('I did not understand that command');
                return;
            }

            const { tool, params, reasoning, isNewTool } = resolution;

            // 2. Expliquer le choix du tool
            explainToolChoice(tool, reasoning);

            // 3. Exécuter le tool
            console.log('───────────────────────────────────────────────────────────');
            console.log('⚙️ EXECUTING TOOL');
            console.log('───────────────────────────────────────────────────────────');

            const result = await tool.execute(params);

            console.log('Result:', result);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('\n');

            // 4. Mettre à jour l'état
            this.updateState({
                lastTool: tool.name,
                lastResult: result,
                processing: false
            });

            // 5. Feedback vocal si nécessaire
            if (result.message && !result.spokenAlready) {
                // this.speechManager.speak(result.message);
                // Note: Désactivé pour éviter les doublons avec les tools qui parlent déjà
            }

        } catch (error) {
            console.error('[AGENT] ❌ Error processing voice input:', error);
            this.speechManager.speak('An error occurred');
            this.onError(error);
        } finally {
            this.isProcessing = false;
            this.updateState({ processing: false });
        }
    }

    /**
     * Met à jour l'état de l'agent
     */
    updateState(updates) {
        this.onStateChange(updates);
    }

    /**
     * Arrête l'agent
     */
    shutdown() {
        console.log('[AGENT] 🛑 Shutting down agent...');

        if (this.speechManager) {
            this.speechManager.destroy();
        }

        this.initialized = false;
        this.updateState({ initialized: false, listening: false });

        console.log('[AGENT] ✅ Agent shut down');
    }

    /**
     * Récupère les statistiques de l'agent
     */
    getStats() {
        if (!this.toolRegistry) {
            return null;
        }

        const allTools = this.toolRegistry.getAllTools();
        const frontendTools = this.toolRegistry.getToolsBySource('frontend');
        const vclTools = this.toolRegistry.getToolsBySource('vcl');
        const generatedTools = this.toolRegistry.getToolsBySource('generated');

        return {
            totalTools: allTools.length,
            frontendTools: frontendTools.length,
            vclTools: vclTools.length,
            generatedTools: generatedTools.length,
            isListening: this.speechManager?.getIsListening() || false,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Ajoute un tool manuellement
     */
    registerTool(tool) {
        if (!this.toolRegistry) {
            console.error('[AGENT] Registry not initialized');
            return false;
        }
        return this.toolRegistry.register(tool);
    }

    /**
     * Liste tous les tools disponibles
     */
    listTools() {
        if (!this.toolRegistry) {
            return [];
        }
        return this.toolRegistry.getAllTools();
    }
}
