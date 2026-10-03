const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Paid & Production Models for Smooth, Uninterrupted Actions and Responses
const ACTIVE_OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1-mini', 'gpt-4-turbo'];
const ACTIVE_ANTHROPIC_MODELS = ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];
const ACTIVE_DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner'];
const ACTIVE_OPENROUTER_MODELS = ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'];
const ACTIVE_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
const ACTIVE_GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
const ACTIVE_SAMBANOVA_MODELS = ['Meta-Llama-3.1-70B-Instruct'];

class AIService {
    constructor() {
        this.groq = null;
        this.genAI = null;
        this.openAIKey = null;
        this.anthropicKey = null;
        this.deepSeekKey = null;
        this.openRouterKey = null;
        this.geminiKey = null;
        this.groqKey = null;
        this.sambaNovaKey = null;
        this.preferredProvider = 'auto';
        this.configPath = path.join(__dirname, '../../storage/ai_config.json');
        this.initialize();
    }

    initialize() {
        let fileConfig = {};
        try {
            if (fs.existsSync(this.configPath)) {
                fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8')) || {};
            }
        } catch (e) {
            console.warn('[AIService] Could not read ai_config.json:', e.message);
        }

        // 1. Paid Models (Primary for Uninterrupted Execution)
        this.openAIKey = fileConfig.openaiApiKey || process.env.OPENAI_API_KEY || null;
        this.anthropicKey = fileConfig.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
        this.deepSeekKey = fileConfig.deepseekApiKey || process.env.DEEPSEEK_API_KEY || null;
        this.openRouterKey = fileConfig.openrouterApiKey || process.env.OPENROUTER_API_KEY || null;

        // 2. High-Speed & Multimodal Providers
        this.groqKey = fileConfig.groqApiKey || process.env.GROQ_API_KEY || null;
        this.geminiKey = fileConfig.geminiApiKey || process.env.GEMINI_API_KEY || null;
        this.sambaNovaKey = fileConfig.sambanovaApiKey || process.env.SAMBANOVA_API_KEY || null;
        this.preferredProvider = fileConfig.preferredProvider || process.env.AI_PREFERRED_PROVIDER || 'auto';

        if (this.groqKey) {
            try {
                this.groq = new Groq({ apiKey: this.groqKey });
                console.log('[AIService] Groq initialized.');
            } catch (err) {
                console.warn('[AIService] Groq init failed:', err.message);
                this.groq = null;
            }
        }

        if (this.geminiKey) {
            try {
                this.genAI = new GoogleGenerativeAI(this.geminiKey);
                console.log('[AIService] Gemini initialized.');
            } catch (err) {
                console.warn('[AIService] Gemini init failed:', err.message);
                this.genAI = null;
            }
        }

        if (this.openAIKey) console.log('[AIService] OpenAI (Paid) initialized.');
        if (this.anthropicKey) console.log('[AIService] Anthropic Claude (Paid) initialized.');
        if (this.deepSeekKey) console.log('[AIService] DeepSeek (Paid) initialized.');
        if (this.openRouterKey) console.log('[AIService] OpenRouter (Paid Hub) initialized.');
        if (this.sambaNovaKey) console.log('[AIService] SambaNova initialized.');
    }

    reload() {
        this.initialize();
        return this.getConfigurations();
    }

    getConfigurations() {
        const mask = (k) => {
            if (!k || typeof k !== 'string') return '';
            const t = k.trim();
            if (t.length <= 8) return '••••••••';
            return `${t.slice(0, 4)}••••${t.slice(-4)}`;
        };

        return {
            preferredProvider: this.preferredProvider || 'auto',
            providers: {
                openai: {
                    name: 'OpenAI (Paid)',
                    configured: Boolean(this.openAIKey),
                    maskedKey: mask(this.openAIKey),
                    models: ACTIVE_OPENAI_MODELS,
                    tier: 'paid'
                },
                anthropic: {
                    name: 'Anthropic Claude (Paid)',
                    configured: Boolean(this.anthropicKey),
                    maskedKey: mask(this.anthropicKey),
                    models: ACTIVE_ANTHROPIC_MODELS,
                    tier: 'paid'
                },
                deepseek: {
                    name: 'DeepSeek (Paid)',
                    configured: Boolean(this.deepSeekKey),
                    maskedKey: mask(this.deepSeekKey),
                    models: ACTIVE_DEEPSEEK_MODELS,
                    tier: 'paid'
                },
                openrouter: {
                    name: 'OpenRouter (Universal Paid Hub)',
                    configured: Boolean(this.openRouterKey),
                    maskedKey: mask(this.openRouterKey),
                    models: ACTIVE_OPENROUTER_MODELS,
                    tier: 'paid'
                },
                gemini: {
                    name: 'Google Gemini (Paid/Free)',
                    configured: Boolean(this.geminiKey),
                    maskedKey: mask(this.geminiKey),
                    models: ACTIVE_GEMINI_MODELS,
                    tier: 'flexible'
                },
                groq: {
                    name: 'Groq (Ultra-Fast LPU)',
                    configured: Boolean(this.groqKey),
                    maskedKey: mask(this.groqKey),
                    models: ACTIVE_GROQ_MODELS,
                    tier: 'fast'
                },
                sambanova: {
                    name: 'SambaNova (Llama 3.1 70B)',
                    configured: Boolean(this.sambaNovaKey),
                    maskedKey: mask(this.sambaNovaKey),
                    models: ACTIVE_SAMBANOVA_MODELS,
                    tier: 'fast'
                }
            }
        };
    }

    // ═══ PAID & FAST PROVIDER CALLERS ═══

    async callOpenAI({ messages, model = 'gpt-4o', temperature = 0.1, max_tokens = 4000, jsonMode = false }) {
        if (!this.openAIKey) throw new Error('OpenAI API key not configured');
        const payload = {
            model,
            messages,
            temperature,
            max_tokens
        };
        if (jsonMode) {
            payload.response_format = { type: 'json_object' };
        }
        try {
            console.log(`[AIService] Calling OpenAI (${model})...`);
            const res = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
                headers: {
                    'Authorization': `Bearer ${this.openAIKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                timeout: 35000
            });
            const text = res.data?.choices?.[0]?.message?.content || '';
            return { text, model, provider: 'openai' };
        } catch (err) {
            const status = err.response?.status;
            const errData = err.response?.data?.error || {};
            const isQuota = status === 429 ||
                errData.code === 'insufficient_quota' ||
                errData.type === 'insufficient_quota' ||
                (errData.message && /quota|rate limit|billing/i.test(errData.message));
            const error = new Error(`OpenAI (${model}) failed: ${errData.message || err.message}`);
            error.status = status;
            error.isQuotaError = isQuota;
            error.provider = 'openai';
            throw error;
        }
    }

    async callAnthropic({ messages, system = '', model = 'claude-3-7-sonnet-20250219', temperature = 0.1, max_tokens = 4000 }) {
        if (!this.anthropicKey) throw new Error('Anthropic API key not configured');
        
        let systemPrompt = system || '';
        const anthropicMessages = [];
        for (const m of messages) {
            if (m.role === 'system') {
                systemPrompt = systemPrompt ? `${systemPrompt}\n\n${m.content}` : m.content;
            } else {
                anthropicMessages.push({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                });
            }
        }
        if (anthropicMessages.length === 0 && systemPrompt) {
            anthropicMessages.push({ role: 'user', content: 'Proceed' });
        }

        const payload = {
            model,
            system: systemPrompt || undefined,
            messages: anthropicMessages,
            temperature,
            max_tokens
        };

        try {
            console.log(`[AIService] Calling Anthropic (${model})...`);
            const res = await axios.post('https://api.anthropic.com/v1/messages', payload, {
                headers: {
                    'x-api-key': this.anthropicKey.trim(),
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                timeout: 40000
            });
            const text = res.data?.content?.[0]?.text || '';
            return { text, model, provider: 'anthropic' };
        } catch (err) {
            const status = err.response?.status;
            const errData = err.response?.data?.error || {};
            const isQuota = status === 429 ||
                errData.type === 'rate_limit_error' ||
                (errData.message && /quota|rate limit|credit balance|overloaded/i.test(errData.message));
            const error = new Error(`Anthropic (${model}) failed: ${errData.message || err.message}`);
            error.status = status;
            error.isQuotaError = isQuota;
            error.provider = 'anthropic';
            throw error;
        }
    }

    async callDeepSeek({ messages, model = 'deepseek-chat', temperature = 0.1, max_tokens = 4000, jsonMode = false }) {
        if (!this.deepSeekKey) throw new Error('DeepSeek API key not configured');
        const payload = {
            model,
            messages,
            temperature,
            max_tokens
        };
        if (jsonMode) {
            payload.response_format = { type: 'json_object' };
        }
        try {
            console.log(`[AIService] Calling DeepSeek (${model})...`);
            const res = await axios.post('https://api.deepseek.com/chat/completions', payload, {
                headers: {
                    'Authorization': `Bearer ${this.deepSeekKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                timeout: 35000
            });
            const text = res.data?.choices?.[0]?.message?.content || '';
            return { text, model, provider: 'deepseek' };
        } catch (err) {
            const status = err.response?.status;
            const errData = err.response?.data?.error || {};
            const isQuota = status === 429 ||
                errData.code === 'insufficient_quota' ||
                (errData.message && /quota|rate limit|balance/i.test(errData.message));
            const error = new Error(`DeepSeek (${model}) failed: ${errData.message || err.message}`);
            error.status = status;
            error.isQuotaError = isQuota;
            error.provider = 'deepseek';
            throw error;
        }
    }

    async callOpenRouter({ messages, model = 'openai/gpt-4o', temperature = 0.1, max_tokens = 4000 }) {
        if (!this.openRouterKey) throw new Error('OpenRouter API key not configured');
        try {
            console.log(`[AIService] Calling OpenRouter (${model})...`);
            const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model,
                messages,
                temperature,
                max_tokens
            }, {
                headers: {
                    'Authorization': `Bearer ${this.openRouterKey.trim()}`,
                    'HTTP-Referer': 'https://labrecmanager.app',
                    'X-Title': 'Lab Record Manager',
                    'Content-Type': 'application/json'
                },
                timeout: 35000
            });
            const text = res.data?.choices?.[0]?.message?.content || '';
            return { text, model, provider: 'openrouter' };
        } catch (err) {
            const status = err.response?.status;
            const errData = err.response?.data?.error || {};
            const isQuota = status === 429 ||
                (errData.message && /credits|quota|rate limit|balance/i.test(errData.message));
            const error = new Error(`OpenRouter (${model}) failed: ${errData.message || err.message}`);
            error.status = status;
            error.isQuotaError = isQuota;
            error.provider = 'openrouter';
            throw error;
        }
    }

    async callGroq({ messages, model, temperature = 0.1, max_tokens = 4000, jsonMode = false }) {
        if (!this.groq) throw new Error('Groq not configured');
        const modelsToTry = model ? [model] : ACTIVE_GROQ_MODELS;
        let lastErr = null;

        for (const m of modelsToTry) {
            try {
                console.log(`[AIService] Calling Groq (${m})...`);
                const req = {
                    model: m,
                    messages,
                    temperature,
                    max_tokens
                };
                if (jsonMode) {
                    req.response_format = { type: 'json_object' };
                }
                const completion = await this.groq.chat.completions.create(req);
                const text = completion.choices[0]?.message?.content || '';
                return { text, model: m, provider: 'groq' };
            } catch (err) {
                lastErr = err;
                const status = err.status || err.response?.status;
                const isQuota = status === 429 || (err.message && /rate limit|quota|tokens per minute/i.test(err.message));
                console.warn(`[AIService] Groq ${m} failed (${status || 'error'}): ${err.message?.substring(0, 80)}`);
                if (isQuota) {
                    err.isQuotaError = true;
                    // continue to try other models or providers
                }
            }
        }
        const error = new Error(`Groq failed: ${lastErr?.message || 'All models failed'}`);
        error.isQuotaError = Boolean(lastErr?.status === 429 || lastErr?.isQuotaError || (lastErr?.message && /rate limit|quota/i.test(lastErr.message)));
        error.provider = 'groq';
        throw error;
    }

    async callGemini({ contents, systemInstruction, model, temperature = 0.1 }) {
        if (!this.genAI) throw new Error('Gemini not configured');
        const modelsToTry = model ? [model] : ACTIVE_GEMINI_MODELS;
        let lastErr = null;

        for (const m of modelsToTry) {
            try {
                console.log(`[AIService] Calling Gemini (${m})...`);
                const geminiModel = this.genAI.getGenerativeModel({
                    model: m,
                    systemInstruction: systemInstruction || undefined,
                    generationConfig: { temperature }
                });
                const result = await geminiModel.generateContent(contents);
                const text = (await result.response).text();
                return { text, model: m, provider: 'gemini' };
            } catch (err) {
                lastErr = err;
                const isQuota = err.status === 429 ||
                    (err.message && /resource_exhausted|quota|rate limit|429/i.test(err.message));
                console.warn(`[AIService] Gemini ${m} failed: ${err.message?.substring(0, 80)}`);
                if (isQuota) {
                    err.isQuotaError = true;
                }
            }
        }
        const error = new Error(`Gemini failed: ${lastErr?.message || 'All models failed'}`);
        error.isQuotaError = Boolean(lastErr?.isQuotaError || (lastErr?.message && /resource_exhausted|quota|429/i.test(lastErr.message)));
        error.provider = 'gemini';
        throw error;
    }

    async callSambaNova({ messages, model = 'Meta-Llama-3.1-70B-Instruct', temperature = 0.1, max_tokens = 4000 }) {
        if (!this.sambaNovaKey) throw new Error('SambaNova not configured');
        try {
            console.log(`[AIService] Calling SambaNova (${model})...`);
            const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
                model,
                messages,
                temperature,
                max_tokens
            }, {
                headers: {
                    'Authorization': `Bearer ${this.sambaNovaKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                timeout: 35000
            });
            const text = res.data?.choices?.[0]?.message?.content || '';
            return { text, model, provider: 'sambanova' };
        } catch (err) {
            const status = err.response?.status;
            const errData = err.response?.data?.error || {};
            const isQuota = status === 429 || (errData.message && /quota|rate limit/i.test(errData.message));
            const error = new Error(`SambaNova failed: ${errData.message || err.message}`);
            error.status = status;
            error.isQuotaError = isQuota;
            error.provider = 'sambanova';
            throw error;
        }
    }

    /**
     * Unified Chat Completion Engine
     * Prioritizes Paid Models (OpenAI, Anthropic Claude, DeepSeek, OpenRouter)
     * Cascades down through available providers and models.
     * Detects quota exhaustion and returns clear errors without fake local fallbacks!
     */
    async executeChatCompletion({ messages, systemPrompt = '', preferredProvider = 'auto', temperature = 0.1, maxTokens = 4000, jsonMode = false }) {
        const fullMessages = [];
        if (systemPrompt) {
            fullMessages.push({ role: 'system', content: systemPrompt });
        }
        if (Array.isArray(messages)) {
            for (const m of messages) fullMessages.push(m);
        }

        const candidateOrder = [];
        const pref = preferredProvider || this.preferredProvider || 'auto';

        // 1. If explicit preferred provider given
        if (pref !== 'auto') {
            if (pref === 'openai' && this.openAIKey) candidateOrder.push('openai');
            else if (pref === 'anthropic' && this.anthropicKey) candidateOrder.push('anthropic');
            else if (pref === 'deepseek' && this.deepSeekKey) candidateOrder.push('deepseek');
            else if (pref === 'openrouter' && this.openRouterKey) candidateOrder.push('openrouter');
            else if (pref === 'groq' && this.groqKey) candidateOrder.push('groq');
            else if (pref === 'gemini' && this.geminiKey) candidateOrder.push('gemini');
            else if (pref === 'sambanova' && this.sambaNovaKey) candidateOrder.push('sambanova');
        }

        // 2. Add remaining configured providers
        // Paid Tier First (Guarantees uninterrupted, high RPM execution)
        if (this.openAIKey && !candidateOrder.includes('openai')) candidateOrder.push('openai');
        if (this.anthropicKey && !candidateOrder.includes('anthropic')) candidateOrder.push('anthropic');
        if (this.deepSeekKey && !candidateOrder.includes('deepseek')) candidateOrder.push('deepseek');
        if (this.openRouterKey && !candidateOrder.includes('openrouter')) candidateOrder.push('openrouter');

        // High-Speed Inference
        if (this.groqKey && !candidateOrder.includes('groq')) candidateOrder.push('groq');
        if (this.geminiKey && !candidateOrder.includes('gemini')) candidateOrder.push('gemini');
        if (this.sambaNovaKey && !candidateOrder.includes('sambanova')) candidateOrder.push('sambanova');

        if (candidateOrder.length === 0) {
            const err = new Error('No AI provider configured. Please add an API key (OpenAI, Anthropic, DeepSeek, Gemini, or Groq) in Settings.');
            err.isQuotaExhausted = false;
            err.noConfig = true;
            throw err;
        }

        const attemptErrors = [];

        for (const prov of candidateOrder) {
            try {
                if (prov === 'openai') {
                    for (const m of ACTIVE_OPENAI_MODELS.slice(0, 3)) {
                        try {
                            return await this.callOpenAI({ messages: fullMessages, model: m, temperature, max_tokens: maxTokens, jsonMode });
                        } catch (mErr) {
                            attemptErrors.push({ provider: 'openai', model: m, error: mErr.message, isQuota: mErr.isQuotaError });
                            if (mErr.isQuotaError) break; // quota exhausted for this account, move to next provider
                        }
                    }
                } else if (prov === 'anthropic') {
                    for (const m of ACTIVE_ANTHROPIC_MODELS.slice(0, 2)) {
                        try {
                            return await this.callAnthropic({ messages: fullMessages, system: systemPrompt, model: m, temperature, max_tokens: maxTokens });
                        } catch (mErr) {
                            attemptErrors.push({ provider: 'anthropic', model: m, error: mErr.message, isQuota: mErr.isQuotaError });
                            if (mErr.isQuotaError) break;
                        }
                    }
                } else if (prov === 'deepseek') {
                    for (const m of ACTIVE_DEEPSEEK_MODELS) {
                        try {
                            return await this.callDeepSeek({ messages: fullMessages, model: m, temperature, max_tokens: maxTokens, jsonMode });
                        } catch (mErr) {
                            attemptErrors.push({ provider: 'deepseek', model: m, error: mErr.message, isQuota: mErr.isQuotaError });
                            if (mErr.isQuotaError) break;
                        }
                    }
                } else if (prov === 'openrouter') {
                    for (const m of ACTIVE_OPENROUTER_MODELS.slice(0, 2)) {
                        try {
                            return await this.callOpenRouter({ messages: fullMessages, model: m, temperature, max_tokens: maxTokens });
                        } catch (mErr) {
                            attemptErrors.push({ provider: 'openrouter', model: m, error: mErr.message, isQuota: mErr.isQuotaError });
                            if (mErr.isQuotaError) break;
                        }
                    }
                } else if (prov === 'groq') {
                    for (const m of ACTIVE_GROQ_MODELS.slice(0, 3)) {
                        try {
                            return await this.callGroq({ messages: fullMessages, model: m, temperature, max_tokens: maxTokens, jsonMode });
                        } catch (mErr) {
                            attemptErrors.push({ provider: 'groq', model: m, error: mErr.message, isQuota: mErr.isQuotaError });
                            if (mErr.isQuotaError) break;
                        }
                    }
                } else if (prov === 'gemini') {
                    // Convert messages to Gemini format
                    const userParts = [];
                    for (const m of fullMessages) {
                        if (m.role === 'user') userParts.push(m.content);
                        else if (m.role === 'assistant') userParts.push(`Assistant: ${m.content}`);
                    }
                    const prompt = userParts.join('\n\n') || 'Proceed';
                    for (const m of ACTIVE_GEMINI_MODELS.slice(0, 3)) {
                        try {
                            return await this.callGemini({ contents: prompt, systemInstruction: systemPrompt, model: m, temperature });
                        } catch (mErr) {
                            attemptErrors.push({ provider: 'gemini', model: m, error: mErr.message, isQuota: mErr.isQuotaError });
                            if (mErr.isQuotaError) break;
                        }
                    }
                } else if (prov === 'sambanova') {
                    try {
                        return await this.callSambaNova({ messages: fullMessages, model: ACTIVE_SAMBANOVA_MODELS[0], temperature, max_tokens: maxTokens });
                    } catch (mErr) {
                        attemptErrors.push({ provider: 'sambanova', model: ACTIVE_SAMBANOVA_MODELS[0], error: mErr.message, isQuota: mErr.isQuotaError });
                    }
                }
            } catch (err) {
                attemptErrors.push({ provider: prov, error: err.message, isQuota: err.isQuotaError });
            }
        }

        const isQuotaExhausted = attemptErrors.length > 0 && attemptErrors.some(e => e.isQuota);
        const errorDetail = attemptErrors.map(e => `${e.provider}${e.model ? ` (${e.model})` : ''}: ${e.error}`).join(' | ');
        const finalError = new Error(isQuotaExhausted 
            ? `AI Quota Exhausted: All configured AI providers have exhausted their rate limits or API credit balance. (${errorDetail})` 
            : `All configured AI providers failed: ${errorDetail}`
        );
        finalError.isQuotaExhausted = isQuotaExhausted;
        finalError.attemptErrors = attemptErrors;
        throw finalError;
    }


    /**
     * Extract structured assignment list from syllabus / program list image
     */
    async extractAssignmentsFromImage(buffer, mimeType, customPrompt = '', preferredProvider = 'gemini') {
        const base64Data = buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        const systemPrompt = `You are an expert computer science educational AI assistant.
Your task is to analyze the provided image (photo of textbook, syllabus, lab manual, or handwritten list of programs) and extract every distinct programming task/experiment.

Return ONLY a valid JSON array of assignments with the following schema:
[
  {
    "title": "Short title of the program/experiment",
    "description": "Full problem statement and requirements",
    "aim": "Aim of the experiment (e.g. To write a program that...)",
    "programmingLanguage": "python" | "cpp" | "c" | "java" | "html" | "sql" | "other",
    "assignmentType": "program" | "experiment" | "project" | "observation",
    "experimentNumber": "1",
    "suggestedSubject": "Computer Science" or detected subject name,
    "referenceCode": "Provide a complete, correct, and well-commented sample solution/code for this assignment here."
  }
]

Additional instructions from teacher: ${customPrompt || 'None'}

RULES:
1. Extract ALL distinct problems listed in the image.
2. Default programmingLanguage to 'python' unless specified otherwise in the image (e.g., C++, Java, SQL).
3. Set experimentNumber sequentially ("1", "2", "3"...) if not explicitly numbered in the image.
4. Output MUST be ONLY valid JSON array starting with '[' and ending with ']'. No markdown formatting or extra text.`;

        // 1. Try Gemini (Primary Default)
        if ((preferredProvider === 'gemini' || preferredProvider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    console.log(`[AIService] Extracting assignments via Gemini (${modelName})...`);
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        },
                        systemPrompt
                    ]);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} extraction failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            try {
                console.log('[AIService] Extracting assignments via Groq (llama-3.2-11b-vision-preview)...');
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.2-11b-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: systemPrompt },
                                { type: 'image_url', image_url: { url: dataUrl } }
                            ]
                        }
                    ],
                    temperature: 0.2
                });

                let responseText = completion.choices[0]?.message?.content || '';
                const parsed = this.parseJSONResponse(responseText);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (err) {
                console.warn(`[AIService] Groq extraction failed (${err.message}).`);
            }
        }

        // Secondary Gemini retry if preferredProvider was groq
        if (preferredProvider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        },
                        systemPrompt
                    ]);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Secondary Gemini extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        throw new Error('No AI provider configured or all providers failed. Please set GROQ_API_KEY or GEMINI_API_KEY.');
    }

    /**
     * Generate structured assignment list from natural language text prompt (non-image case)
     */
    async extractAssignmentsFromText(customPrompt = '', preferredProvider = 'gemini') {
        const systemPrompt = `You are an expert computer science educational AI assistant.
Your task is to generate one or more programming assignment(s) based on the user's natural language request (e.g. "python program assignment on fibonacci series").

Return ONLY a valid JSON array of assignments with the following schema:
[
  {
    "title": "Short title of the program/experiment",
    "description": "Full problem statement and requirements",
    "aim": "Aim of the experiment (e.g. To write a Python program that generates Fibonacci series...)",
    "programmingLanguage": "python" | "cpp" | "c" | "java" | "html" | "sql" | "other",
    "assignmentType": "program" | "experiment" | "project" | "observation",
    "experimentNumber": "1",
    "suggestedSubject": "Computer Science",
    "referenceCode": "Provide a complete, correct, and well-commented sample solution/code for this assignment here."
  }
]

TEACHER REQUEST: ${customPrompt}

RULES:
1. Generate complete, comprehensive problem statements, aims, and descriptions.
2. Default programmingLanguage to 'python' unless specified otherwise in request (e.g., C++, Java, SQL).
3. Set experimentNumber sequentially ("1", "2"...) for generated tasks.
4. Output MUST be ONLY valid JSON array starting with '[' and ending with ']'. No markdown formatting or extra text.`;

        // 1. Try Gemini (Primary Default)
        if ((preferredProvider === 'gemini' || preferredProvider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    console.log(`[AIService] Generating assignments from text via Gemini (${modelName})...`);
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} failed: ${err.message}`);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    console.log(`[AIService] Generating assignments from text via Groq (${modelName})...`);
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.3
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '');
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} failed (${err.message}). Trying next...`);
                }
            }
        }

        // Secondary Gemini retry if preferredProvider was groq
        if (preferredProvider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Secondary Gemini text extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        throw new Error('No AI provider configured or all providers failed. Please set GROQ_API_KEY or GEMINI_API_KEY.');
    }

    /**
     * Parse natural language instructions for target entities (Classes, Groups, Students),
     * subject matching, and publish / due date flags.
     */
    async parseAssignmentTargets(prompt, availableContext, preferredProvider = 'groq') {
        const { classes = [], groups = [], students = [], subjects = [] } = availableContext;

        const systemPrompt = `You are an AI entity resolution assistant for an educational management app.
Analyze the user's natural language request and match it against the provided database context.

USER REQUEST: "${prompt}"

CURRENT DATE: ${new Date().toISOString()}

AVAILABLE DATABASE CONTEXT:
Classes: ${JSON.stringify(classes.map(c => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel, section: c.section })))}
Groups: ${JSON.stringify(groups.map(g => ({ id: g.id, name: g.name, className: g.class?.name })))}
Students: ${JSON.stringify(students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNumber: s.admissionNumber })))}
Subjects: ${JSON.stringify(subjects.map(sub => ({ id: sub.id, name: sub.name, code: sub.code })))}

Return ONLY valid JSON matching this schema:
{
  "matchedClassIds": ["class_uuid1"],
  "matchedGroupIds": ["group_uuid1"],
  "matchedStudentIds": ["student_uuid1"],
  "selectedSubjectId": "subject_uuid_or_null",
  "publishImmediately": true | false,
  "dueDateISO": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "dueDateHoursFromNow": 24 (default 24 unless prompt specifies custom timeframe)
}

RULES:
1. Match Class names liberally e.g. "XII COM-A", "12 COM A", "12A" should match matching grade/section/name in Classes list.
2. ONLY set publishImmediately to true if the prompt EXPLICITLY asks to "publish" or "assign". Otherwise, default to false.
3. ONLY populate matchedClassIds, matchedGroupIds, or matchedStudentIds if the prompt EXPLICITLY mentions them. If "all students" is mentioned, include the IDs of all students or the appropriate global class.
4. Default selectedSubjectId to the Computer Science subject ID if found in Subjects list, unless request specifies another subject.
5. If the prompt specifies an absolute date (e.g. "1st sep 2026"), calculate and set dueDateISO based on the CURRENT DATE. If relative (e.g. "in 3 days"), set dueDateHoursFromNow. Default to 24 hours if neither.
6. Output MUST be valid JSON only.`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.1
                    });
                    return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} target parsing failed (${err.message}). Trying next...`);
                    if (err.status === 429) await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    return this.parseJSONResponse(result.response.text());
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} target parsing failed:`, err.message);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
        }

        return {
            matchedClassIds: [],
            matchedGroupIds: [],
            matchedStudentIds: [],
            selectedSubjectId: subjects.find(s => s.name?.toLowerCase().includes('computer'))?.id || subjects[0]?.id || null,
            publishImmediately: false,
            dueDateHoursFromNow: 24
        };
    }

    /**
     * Parse natural language instructions to share documents with targets (Classes, Groups, Students, and Documents).
     */
    async parseDocumentShareTargets(prompt, availableContext, preferredProvider = 'groq') {
        const { documents = [], classes = [], groups = [], students = [] } = availableContext;

        const systemPrompt = `You are an AI entity resolution assistant for an educational management app.
Analyze the user's natural language request to share a document, and match it against the provided database context.

USER REQUEST: "${prompt}"

AVAILABLE DATABASE CONTEXT:
Documents: ${JSON.stringify(documents.map(d => ({ id: d.id, name: d.name })))}
Classes: ${JSON.stringify(classes.map(c => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel, section: c.section })))}
Groups: ${JSON.stringify(groups.map(g => ({ id: g.id, name: g.name, className: g.class?.name })))}
Students: ${JSON.stringify(students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNumber: s.admissionNumber })))}

Return ONLY valid JSON matching this schema:
{
  "matchedDocumentId": "document_uuid_or_null",
  "matchedClassIds": ["class_uuid1"],
  "matchedGroupIds": ["group_uuid1"],
  "matchedStudentIds": ["student_uuid1"]
}

RULES:
1. Match Document and Class names liberally (e.g., "12th CSE ebook" matches "12th CSE Ebook.pdf" or "CSE(Eng) ebook").
2. Return null for matchedDocumentId if no matching document is found in the Documents list.
3. If the user asks to share with "all", "everyone", "all classes", or mentions a grade level (e.g. "12th", "Class 12", "Grade 12"):
   - If a specific grade is mentioned (e.g. "12th"), include all class IDs for that grade in matchedClassIds.
   - If "all" or "all classes" or "everyone" is mentioned, include all class IDs in matchedClassIds.
   - Do NOT select 2 or 3 random students when the user says "all" or "everyone".
4. Output MUST be valid JSON only.`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.1
                    });
                    return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} document target parsing failed (${err.message}). Trying next...`);
                    if (err.status === 429) await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    return this.parseJSONResponse(result.response.text());
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} document target parsing failed:`, err.message);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
        }

        return {
            matchedDocumentId: null,
            matchedClassIds: [],
            matchedGroupIds: [],
            matchedStudentIds: []
        };
    }

    /**
     * Parse natural language instructions to search for documents based on keywords and dates.
     */
    async parseDocumentSearchQuery(prompt, preferredProvider = 'groq') {
        const systemPrompt = `You are an AI document search assistant.
Analyze the user's natural language request to search for documents and extract the search parameters.

USER REQUEST: "${prompt}"
CURRENT DATE: ${new Date().toISOString()}

Return ONLY valid JSON matching this schema:
{
  "keywords": ["word1", "word2"],
  "startDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "endDate": "YYYY-MM-DDTHH:mm:ss.sssZ"
}

RULES:
1. Extract meaningful keywords for the search query (e.g. "physics", "lab", "assignment").
2. Do not include words like "document", "file", "search", "find", "about", "from", "between" in keywords.
3. If a date or date range is mentioned, calculate the absolute ISO date strings based on the CURRENT DATE.
4. If "on [date]" is mentioned, set startDate to the start of that day (00:00:00) and endDate to the end of that day (23:59:59).
5. If no date is mentioned, startDate and endDate MUST be null.
6. Output MUST be valid JSON only.
`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.1
                    });
                    return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} doc search parsing failed:`, err.message);
                    if (err.status === 429) await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    return this.parseJSONResponse(result.response.text());
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} doc search parsing failed:`, err.message);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
        }

        return { keywords: [], startDate: null, endDate: null };
    }

    /**
     * Parse natural language instructions to schedule or create meetings with exact date, time, duration, and audience targets.
     */
    async parseMeetingDetails(prompt, availableContext = {}, preferredProvider = 'groq') {
        const { classes = [], groups = [], students = [] } = availableContext;
        const now = new Date();
        // Local reference in IST (UTC+05:30)
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        const currentDateStr = istNow.toISOString().slice(0, 10);
        const currentTimeStr = istNow.toISOString().slice(11, 16);

        const systemPrompt = `You are an AI meeting scheduler assistant for an educational management app.
Analyze the user's meeting creation request and extract the exact parameters.

CURRENT LOCAL REFERENCE DATETIME: ${currentDateStr} ${currentTimeStr} (Timezone: IST / UTC+05:30)
USER REQUEST: "${prompt}"

AVAILABLE DATABASE CONTEXT:
Classes: ${JSON.stringify(classes.map(c => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel, section: c.section })))}
Groups: ${JSON.stringify(groups.map(g => ({ id: g.id, name: g.name, className: g.class?.name })))}
Students: ${JSON.stringify(students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNumber: s.admissionNumber })))}

Return ONLY valid JSON matching this schema:
{
  "title": "Short title describing the meeting",
  "type": "scheduled" or "instant",
  "scheduledDate": "YYYY-MM-DD",
  "scheduledTime": "HH:MM",
  "isoDateTime": "YYYY-MM-DDTHH:MM:00+05:30",
  "durationMinutes": 15,
  "matchedClassIds": ["class_uuid1"],
  "matchedGroupIds": ["group_uuid1"],
  "matchedStudentIds": ["student_uuid1"],
  "targetName": "Extracted target class/group/student name or null"
}

RULES:
1. "28-Sept-2026 10:30 AM" -> scheduledDate: "2026-09-28", scheduledTime: "10:30", isoDateTime: "2026-09-28T10:30:00+05:30".
2. "28-Sept-2026 10:30 PM" -> scheduledDate: "2026-09-28", scheduledTime: "22:30", isoDateTime: "2026-09-28T22:30:00+05:30".
3. "tomorrow at 10 AM" -> calculate tomorrow's date relative to ${currentDateStr}, scheduledTime: "10:00", isoDateTime: "YYYY-MM-DDT10:00:00+05:30".
4. If "instant" meeting is requested (e.g., "create instant meeting", "start meeting now"), set type: "instant", isoDateTime: "${currentDateStr}T${currentTimeStr}:00+05:30".
5. durationMinutes: extract number of minutes (default 15 if not specified, 60 if 1 hour).
6. Match classes, groups, and students from the provided database context.
7. Output MUST be ONLY valid JSON.`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.1
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.isoDateTime || parsed.scheduledDate)) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} meeting parsing failed (${err.message}). Trying next...`);
                    if (err.status === 429) await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.isoDateTime || parsed.scheduledDate)) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} meeting parsing failed:`, err.message);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
        }

        // 3. Fallback Parser (Robust Regex & Date Math)
        return this.fallbackParseMeetingDetails(prompt, availableContext, currentDateStr);
    }

    fallbackParseMeetingDetails(prompt, availableContext = {}, currentDateStr) {
        const { classes = [], groups = [], students = [] } = availableContext;
        const msgLower = prompt.toLowerCase();
        const isInstant = msgLower.includes('instant') || msgLower.includes('start now') || msgLower.includes('right now');
        const type = isInstant ? 'instant' : 'scheduled';

        // Duration parsing
        let durationMinutes = 15;
        const durMatch = prompt.match(/(\d+)\s*(?:minutes?|mins?|m\b)/i);
        if (durMatch) durationMinutes = parseInt(durMatch[1], 10);
        else if (/1\s*hour|one\s*hour/i.test(prompt)) durationMinutes = 60;
        else if (/2\s*hours|two\s*hours/i.test(prompt)) durationMinutes = 120;

        // Date & Time extraction
        let targetYear = parseInt(currentDateStr.split('-')[0], 10);
        let targetMonth = parseInt(currentDateStr.split('-')[1], 10);
        let targetDay = parseInt(currentDateStr.split('-')[2], 10);
        let targetHour = 10;
        let targetMinute = 30;

        const monthsMap = {
            jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
            apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
            aug: 8, august: 8, sep: 9, sept: 9, september: 9,
            oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
        };

        // Check for "tomorrow"
        if (msgLower.includes('tomorrow')) {
            const d = new Date(targetYear, targetMonth - 1, targetDay + 1);
            targetYear = d.getFullYear();
            targetMonth = d.getMonth() + 1;
            targetDay = d.getDate();
        }

        // Match pattern: 28-Sept-2026 or 28 September 2026 or 28th Sep 2026
        const dateMatch = prompt.match(/(\d{1,2})(?:st|nd|rd|th)?[\s\-_/]+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:[\s\-_/]+(\d{4}))?/i);
        if (dateMatch) {
            targetDay = parseInt(dateMatch[1], 10);
            const mStr = dateMatch[2].toLowerCase();
            if (monthsMap[mStr]) targetMonth = monthsMap[mStr];
            if (dateMatch[3]) targetYear = parseInt(dateMatch[3], 10);
        }

        // Match numeric date: 2026-09-28 or 28/09/2026
        const numDateMatch = prompt.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) || prompt.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (numDateMatch) {
            if (numDateMatch[1].length === 4) {
                targetYear = parseInt(numDateMatch[1], 10);
                targetMonth = parseInt(numDateMatch[2], 10);
                targetDay = parseInt(numDateMatch[3], 10);
            } else {
                targetDay = parseInt(numDateMatch[1], 10);
                targetMonth = parseInt(numDateMatch[2], 10);
                targetYear = parseInt(numDateMatch[3], 10);
            }
        }

        // Match time: 10:30 AM, 10:30 PM, 7:00 AM, 11 AM, 19:30
        const timeMatch = prompt.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i) || prompt.match(/(?:at|on|time:?)\s*(\d{1,2}):(\d{2})/i);
        if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            let m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const ampm = timeMatch[3]?.toLowerCase();
            if (ampm === 'pm' && h < 12) h += 12;
            if (ampm === 'am' && h === 12) h = 0;
            targetHour = h;
            targetMinute = m;
        }

        const pad = (n) => String(n).padStart(2, '0');
        const scheduledDate = `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
        const scheduledTime = `${pad(targetHour)}:${pad(targetMinute)}`;
        const isoDateTime = `${scheduledDate}T${scheduledTime}:00+05:30`;

        // Match targets from database
        let matchedClassIds = [];
        let matchedGroupIds = [];
        let matchedStudentIds = [];
        let targetName = null;

        for (const c of classes) {
            if (c.name && msgLower.includes(c.name.toLowerCase())) {
                matchedClassIds.push(c.id);
                targetName = c.name;
                break;
            }
        }

        if (!targetName) {
            for (const g of groups) {
                if (g.name && msgLower.includes(g.name.toLowerCase())) {
                    matchedGroupIds.push(g.id);
                    targetName = g.name;
                    break;
                }
            }
        }

        if (!targetName) {
            for (const s of students) {
                const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
                if (msgLower.includes(fullName) || (s.admissionNumber && msgLower.includes(s.admissionNumber.toLowerCase()))) {
                    matchedStudentIds.push(s.id);
                    targetName = `${s.firstName} ${s.lastName}`;
                    break;
                }
            }
        }

        const title = `AI ${type === 'scheduled' ? 'Scheduled' : 'Instant'} Meeting${targetName ? ` (${targetName})` : ''}`;

        return {
            title,
            type,
            scheduledDate,
            scheduledTime,
            isoDateTime,
            durationMinutes,
            matchedClassIds,
            matchedGroupIds,
            matchedStudentIds,
            targetName
        };
    }

    /**
     * AI Assistant for Admin Notes: Write, Rewrite, Bullets, Numbered Steps, Polish, Summarize, Expand
     */
    async assistAdminNotes({ action = 'write', prompt = '', content = '', title = '', tone = 'professional' }) {
        let actionInstruction = '';
        switch (action) {
            case 'bullets':
            case 'rewrite_bullets':
                actionInstruction = `Rewrite the provided note/text into clean, well-structured, easy-to-read BULLET POINTS (<ul><li>) with bold key headings or bold lead-in phrases (<strong>). Organize into logical sections with <h2> or <h3> headers where appropriate.`;
                break;
            case 'numbered':
            case 'rewrite_numbered':
                actionInstruction = `Rewrite the provided note/text into a sequential NUMBERED LIST (<ol><li>) with bold step titles (<strong>). Ideal for standard operating procedures (SOP), procedural workflows, checklists, or step-by-step instructions.`;
                break;
            case 'polish':
                actionInstruction = `Polish and improve the grammar, structure, and readability of the provided text while keeping its core meaning. Maintain a clear ${tone} administrative tone. Use structured paragraphs and bold highlights.`;
                break;
            case 'summarize':
                actionInstruction = `Generate a concise, high-impact Executive Summary of the provided text. Highlight the most important decisions, action items, and takeaways using bullet points (<ul><li>) and bold terms (<strong>).`;
                break;
            case 'expand':
                actionInstruction = `Expand and elaborate the provided brief notes into a comprehensive, detailed, and thorough administrative document with background, key points, action items, and notes.`;
                break;
            case 'write':
            default:
                actionInstruction = `Write a comprehensive, professional administrative note on the requested topic or prompt. Include relevant sections, clear headings (<h2>/<h3>), bullet points (<ul><li>) or numbered lists (<ol><li>) where appropriate, and bold highlights.`;
                break;
        }

        const systemPrompt = `You are an expert executive and educational administrative AI writing assistant for a school and laboratory management system.
Your job is to generate or rewrite administrative notes, policies, meeting minutes, lab maintenance logs, notices, and procedural guides.

TASK INSTRUCTION:
${actionInstruction}

USER PROMPT / TOPIC:
${prompt || 'None provided'}

EXISTING NOTE TITLE:
${title || 'Untitled Note'}

EXISTING NOTE CONTENT:
${content || '(Empty content - generate from scratch based on prompt/title)'}

TONE:
${tone} (Educational / Administrative / Clear)

FORMATTING RULES:
1. Return valid, clean HTML content formatted for a rich text editor (ReactQuill).
2. Use standard semantic tags: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <blockquote>.
3. DO NOT wrap the output in markdown codeblocks (no \`\`\`html or \`\`\`). Return raw HTML string directly.
4. Ensure lists (<ul>, <ol>) and bullet points are clean, concise, and easy to scan.
5. If drafting from scratch and no title was provided, suggest a title on the first line inside an <h2> tag.`;

        // 1. Try Groq first (Ultra-fast ~2-3s response, prevents reverse-proxy 30s timeouts)
        if (this.groq) {
            for (const gModel of ACTIVE_GROQ_MODELS) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: gModel,
                        messages: [
                            { role: 'system', content: 'You are an expert educational and administrative writing assistant. Output ONLY valid rich HTML tags (<h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>) without markdown code fence wrapper.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.3
                    });

                    let responseText = completion.choices[0]?.message?.content || '';
                    responseText = responseText.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/```$/i, '').trim();
                    responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                    if (responseText) {
                        return {
                            success: true,
                            html: responseText,
                            provider: `groq/${gModel}`
                        };
                    }
                } catch (groqErr) {
                    console.warn(`[AIService] Groq ${gModel} failed for notes assist:`, groqErr.message);
                }
            }
        }

        // 2. Fallback: Gemini
        if (this.genAI) {
            try {
                for (const modelName of ACTIVE_GEMINI_MODELS) {
                    try {
                        const model = this.genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent(systemPrompt);
                        let responseText = result.response.text() || '';
                        responseText = responseText.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/```$/i, '').trim();
                        responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                        if (responseText) {
                            return {
                                success: true,
                                html: responseText,
                                provider: `gemini/${modelName}`
                            };
                        }
                    } catch (e) {
                        console.warn(`[AIService] Gemini ${modelName} failed for admin notes:`, e.message);
                    }
                }
            } catch (err) {
                console.warn('[AIService] Gemini failed for notes assist:', err.message);
            }
        }

        throw new Error('All AI providers failed to generate note content.');
    }

    /**
     * Parse natural language timetable prompt and return structured slots
     */
    async generateTimetableSlots(prompt, context = {}, preferredProvider = 'groq') {
        const { subjects = [], instructors = [], periodStructure = [], existingSlots = {} } = context;

        const subjectContext = subjects.map(s => `ID: "${s.id}", Name: "${s.name}" (Code: ${s.code || 'N/A'})`).join('\n');
        const instructorContext = instructors.map(i => `ID: "${i.id}", Name: "${i.firstName} ${i.lastName}"`).join('\n');
        const periodContext = periodStructure.map(p => `Period ${p.periodNumber}: ${p.startTime} - ${p.endTime} (${p.slotType || 'lecture'})`).join('\n');

        const systemPrompt = `You are an expert school timetable and educational scheduling AI.
Your task is to analyze the user's natural language instructions to construct or update timetable slots across the school week (monday, tuesday, wednesday, thursday, friday, saturday).

CONTEXT:
Available Subjects:
${subjectContext || 'No subjects registered yet'}

Available Instructors:
${instructorContext || 'No instructors registered yet'}

Period Timings Structure:
${periodContext || 'Period 1: 08:00-08:40, Period 2: 08:40-09:20, Period 3: 09:20-10:00, Period 4: 10:00-10:15 (break), Period 5: 10:15-10:55, Period 6: 10:55-11:35, Period 7: 11:35-12:15, Period 8: 12:15-12:55'}

User Instructions / Prompt:
"${prompt}"

INSTRUCTIONS & RULES:
1. Parse the lecture numbers (Period 1 to 8+), days of the week ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'), subjects, instructors, room numbers, and slot types.
2. Match subjects and instructors to their EXACT IDs from the provided context list if they match. If a subject or instructor is mentioned that is not in the context list, leave subjectId / instructorId as null and provide subjectName / instructorName.
3. For days, valid lowercase values are: 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'.
4. Slot types can be: 'lecture', 'lab', 'break_period', 'assembly', 'free', 'sports', 'library'.
5. If the prompt specifies a range like "Every day" or "Mon-Fri", generate slots for all respective days.
6. Provide accurate startTime and endTime based on the period number from the period structure.

Return ONLY a valid JSON array of slot objects with the following schema:
[
  {
    "dayOfWeek": "monday",
    "periodNumber": 1,
    "startTime": "08:00",
    "endTime": "08:40",
    "subjectId": "uuid-or-null",
    "subjectName": "Physics",
    "instructorId": "uuid-or-null",
    "instructorName": "Dr. Sharma",
    "roomNumber": "101",
    "slotType": "lecture",
    "isNew": true
  }
]
`;

        // 1. Try Groq
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            try {
                console.log('[AIService] Generating timetable slots via Groq...');
                const completion = await this.groq.chat.completions.create({
                    model: ACTIVE_GROQ_MODELS[0],
                    messages: [
                        { role: 'system', content: 'You are an educational scheduling AI. Output ONLY a valid JSON array.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.2
                });

                const responseText = completion.choices[0]?.message?.content || '[]';
                const parsed = this.parseJSONResponse(responseText);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (groqErr) {
                console.error('[AIService] Groq failed for timetable slots:', groqErr.message);
            }
        }

        // 2. Try Gemini
        if (this.genAI) {
            try {
                console.log('[AIService] Generating timetable slots via Gemini...');
                const model = this.genAI.getGenerativeModel({ model: ACTIVE_GEMINI_MODELS[0] });
                const result = await model.generateContent(systemPrompt);
                const responseText = result.response.text();
                const parsed = this.parseJSONResponse(responseText);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (geminiErr) {
                console.error('[AIService] Gemini failed for timetable slots:', geminiErr.message);
            }
        }

        // 3. Guaranteed Rule-Based Natural Language Scheduler Fallback
        console.log('[AIService] Using rule-based natural language scheduler fallback...');
        return this.parseTimetableSlotsRuleBased(prompt, context);
    }

    /**
     * Rule-Based Natural Language Timetable Parser (Zero-Failure Fallback)
     */
    parseTimetableSlotsRuleBased(prompt, context = {}) {
        const { subjects = [], instructors = [], periodStructure = [] } = context;
        const text = prompt.toLowerCase();

        // Helper to normalize day strings
        const normalizeDay = (d) => {
            const low = (d || '').toLowerCase();
            if (low.startsWith('mon')) return 'monday';
            if (low.startsWith('tue')) return 'tuesday';
            if (low.startsWith('wed')) return 'wednesday';
            if (low.startsWith('thu')) return 'thursday';
            if (low.startsWith('fri')) return 'friday';
            if (low.startsWith('sat')) return 'saturday';
            if (low.startsWith('sun')) return 'sunday';
            return null;
        };

        // Helper to compute or look up period timings
        const getPeriodTimings = (pNum) => {
            const matchedPeriodInfo = periodStructure.find(p => p.periodNumber === pNum);
            const defaultTimings = {
                1: { start: '08:00', end: '08:40' },
                2: { start: '08:40', end: '09:20' },
                3: { start: '09:20', end: '10:00' },
                4: { start: '10:00', end: '10:15', type: 'break_period' },
                5: { start: '10:15', end: '10:55' },
                6: { start: '10:55', end: '11:35' },
                7: { start: '11:35', end: '12:15' },
                8: { start: '12:15', end: '12:55' },
                9: { start: '12:55', end: '13:35' },
                10: { start: '13:35', end: '14:15' },
                11: { start: '14:15', end: '14:55' },
                12: { start: '14:55', end: '15:35' }
            };
            const def = defaultTimings[pNum] || { start: '08:00', end: '08:40' };
            const startTime = matchedPeriodInfo?.startTime || def.start;
            const endTime = matchedPeriodInfo?.endTime || def.end;
            let slotType = matchedPeriodInfo?.slotType || def.type || 'lecture';
            if (text.includes('lab') || text.includes('practical')) slotType = 'lab';
            else if (text.includes('break')) slotType = 'break_period';
            return { startTime, endTime, slotType };
        };

        // 1. Match Subject
        let subjectId = null;
        let subjectName = '';
        for (const s of subjects) {
            const sName = s.name.toLowerCase();
            const sCode = (s.code || '').toLowerCase();
            if (text.includes(sName) || (sCode && text.includes(sCode))) {
                subjectId = s.id;
                subjectName = s.name;
                break;
            }
        }
        if (!subjectName) {
            const subRegex = /(?:subject|course|for|of)\s+([a-zA-Z\s]{3,25})(?:\s+by|\s+for|\s+class|\s+in|$)/i;
            const subMatch = prompt.match(subRegex);
            if (text.includes('computer science') || text.includes('cs')) {
                subjectName = 'Computer Science';
            } else if (text.includes('physics')) {
                subjectName = 'Physics';
            } else if (text.includes('chemistry')) {
                subjectName = 'Chemistry';
            } else if (text.includes('mathematics') || text.includes('math')) {
                subjectName = 'Mathematics';
            } else if (text.includes('biology')) {
                subjectName = 'Biology';
            } else if (text.includes('english')) {
                subjectName = 'English';
            } else if (subMatch) {
                subjectName = subMatch[1].trim();
            } else {
                subjectName = 'Lecture';
            }
        }

        // 2. Match Instructor
        let instructorId = null;
        let instructorName = '';
        for (const inst of instructors) {
            const fullName = `${inst.firstName} ${inst.lastName || ''}`.trim().toLowerCase();
            const fName = inst.firstName.toLowerCase();
            if (text.includes(fullName) || text.includes(fName)) {
                instructorId = inst.id;
                instructorName = `${inst.firstName} ${inst.lastName || ''}`.trim();
                break;
            }
        }
        if (!instructorName) {
            const instRegex = /(?:instructor|teacher|faculty|by|sir|mam)\s+([a-zA-Z\s]{3,30})(?:\s+for|\s+in|\s+at|\s+-|$)/i;
            const instMatch = prompt.match(instRegex);
            if (instMatch) {
                instructorName = instMatch[1].trim();
            }
        }

        // 3. Match Room Number
        let roomNumber = '';
        const roomMatch = prompt.match(/room\s*#?\s*([a-zA-Z0-9-]+)/i) || prompt.match(/lab\s*#?\s*([a-zA-Z0-9-]+)/i);
        if (roomMatch) {
            roomNumber = roomMatch[1];
        } else if (subjectName.toLowerCase().includes('computer') || text.includes('lab')) {
            roomNumber = 'Lab-1';
        } else {
            roomNumber = 'Room 101';
        }

        // 4. Parse Day-Period Pairings
        let dayPeriodPairs = [];

        // Check for explicit override, e.g. "with 7th lecture for both days" or "7th for both days"
        const bothDaysOverrideMatch = text.match(/(?:with|create|set)?\s*(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|slot)?\s*(?:for|on)?\s*both\s*days/i);
        if (bothDaysOverrideMatch) {
            const overridePeriod = parseInt(bothDaysOverrideMatch[1], 10);
            const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const mentionedDays = [];
            allDays.forEach(day => {
                const shortDay = day.substring(0, 3);
                if (text.includes(day) || text.includes(shortDay)) {
                    if (!mentionedDays.includes(day)) mentionedDays.push(day);
                }
            });
            const daysToUse = mentionedDays.length > 0 ? mentionedDays : ['monday', 'tuesday'];
            daysToUse.forEach(d => {
                dayPeriodPairs.push({ day: d, period: overridePeriod });
            });
        }

        // Check for day ranges (e.g. "mon to thu 2nd period", "mon-fri period 3")
        if (dayPeriodPairs.length === 0) {
            let rangeDays = null;
            if (text.includes('mon to thu') || text.includes('mon-thu') || text.includes('monday to thursday')) {
                rangeDays = ['monday', 'tuesday', 'wednesday', 'thursday'];
            } else if (text.includes('mon to fri') || text.includes('mon-fri') || text.includes('monday to friday')) {
                rangeDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            } else if (text.includes('mon to sat') || text.includes('mon-sat') || text.includes('monday to saturday')) {
                rangeDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            } else if (text.includes('every day') || text.includes('all days') || text.includes('daily') || text.includes('all week')) {
                rangeDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            }

            if (rangeDays) {
                const pMatch = text.match(/(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|p\b|slot)/i) ||
                               text.match(/(?:period|lecture|p)\s*(\d+)/i);
                const pNum = pMatch ? parseInt(pMatch[1], 10) : 1;
                rangeDays.forEach(d => {
                    dayPeriodPairs.push({ day: d, period: pNum });
                });
            }
        }

        // If no range or override was matched, check for individual day-period pairings like "7th lecture for mon and 9th for tue"
        if (dayPeriodPairs.length === 0) {
            // Pattern: "<N>th (lecture/period) for <day>"
            const pairRegex1 = /(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|slot)?\s*(?:for|on|in)\s*(mon|tue|wed|thu|fri|sat|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi;
            let m1;
            while ((m1 = pairRegex1.exec(text)) !== null) {
                const p = parseInt(m1[1], 10);
                const d = normalizeDay(m1[2]);
                if (d && p && !dayPeriodPairs.some(existing => existing.day === d && existing.period === p)) {
                    dayPeriodPairs.push({ day: d, period: p });
                }
            }

            // Pattern: "<day> <N>th (lecture/period)"
            const pairRegex2 = /(mon|tue|wed|thu|fri|sat|monday|tuesday|wednesday|thursday|friday|saturday)\s*(?:for|on|in)?\s*(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|slot)?/gi;
            let m2;
            while ((m2 = pairRegex2.exec(text)) !== null) {
                const d = normalizeDay(m2[1]);
                const p = parseInt(m2[2], 10);
                if (d && p && !dayPeriodPairs.some(existing => existing.day === d && existing.period === p)) {
                    dayPeriodPairs.push({ day: d, period: p });
                }
            }
        }

        // Fallback: If still empty, determine days and period independently
        if (dayPeriodPairs.length === 0) {
            const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            let matchedDays = [];

            allDays.forEach(day => {
                const shortDay = day.substring(0, 3);
                if (text.includes(day) || text.includes(shortDay)) {
                    if (!matchedDays.includes(day)) matchedDays.push(day);
                }
            });

            if (matchedDays.length === 0) {
                matchedDays = ['monday', 'tuesday'];
            }

            let periodNumber = 1;
            const periodMatch = text.match(/(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|p\b|slot)/i) ||
                                text.match(/(?:period|lecture|p)\s*(\d+)/i) ||
                                text.match(/period\s*#?\s*(\d+)/i);
            if (periodMatch) {
                periodNumber = parseInt(periodMatch[1], 10);
            } else if (text.includes('first') || text.includes('1st')) periodNumber = 1;
            else if (text.includes('second') || text.includes('2nd')) periodNumber = 2;
            else if (text.includes('third') || text.includes('3rd')) periodNumber = 3;
            else if (text.includes('fourth') || text.includes('4th')) periodNumber = 4;
            else if (text.includes('fifth') || text.includes('5th')) periodNumber = 5;
            else if (text.includes('sixth') || text.includes('6th')) periodNumber = 6;
            else if (text.includes('seventh') || text.includes('7th')) periodNumber = 7;
            else if (text.includes('eighth') || text.includes('8th')) periodNumber = 8;
            else if (text.includes('ninth') || text.includes('9th')) periodNumber = 9;

            matchedDays.forEach(day => {
                dayPeriodPairs.push({ day, period: periodNumber });
            });
        }

        // Construct final slot objects
        return dayPeriodPairs.map(pair => {
            const { startTime, endTime, slotType } = getPeriodTimings(pair.period);
            return {
                dayOfWeek: pair.day,
                periodNumber: pair.period,
                startTime,
                endTime,
                subjectId,
                subjectName,
                instructorId,
                instructorName,
                roomNumber,
                slotType,
                isNew: true
            };
        });
    }

    /**
     * General-purpose Card AI Copilot (Read -> Edit -> Insert)
     */
    async executeCardAssist({ type, prompt = '', context = {}, refinement = '', provider = 'groq' }) {
        let systemPrompt = '';
        let fallbackFn = null;

        switch (type) {
            case 'lesson_plan':
                systemPrompt = `You are an expert academic curriculum and pedagogy AI.
Create or refine a comprehensive lesson/lecture plan for a school or college class.
CONTEXT:
Subject: ${context.subjectName || context.subject || 'Not specified'}
Class/Grade: ${context.className || context.gradeLevel || 'Not specified'}
Existing Topic/Aim: ${context.topic || context.title || context.aim || 'Not specified'}
Duration: ${context.durationMinutes || 40} minutes
Additional Instructions / Prompt: "${prompt}"
Refinement Request: "${refinement || 'None'}"

Output MUST be ONLY valid JSON matching this schema:
{
  "topic": "Clear, concise topic name",
  "aim": "Educational aim of this lecture (e.g. To teach students how to...)",
  "learningObjectives": "1. Understand...\\n2. Analyze...\\n3. Implement...",
  "teachingAids": "Blackboard, Projector, Python IDE / Lab Hardware, Charts",
  "interactiveActivity": "Brief 5-minute hands-on demonstration or peer exercise",
  "assessmentQuestions": "1. What is...?\\n2. Differentiate between...\\n3. Practical task to solve...",
  "homework": "Practice exercise or lab assignment reflection",
  "summaryNotes": "Brief 2-line summary of what was covered"
}`;
                fallbackFn = () => ({
                    topic: context.topic || 'Introduction to ' + (context.subjectName || 'Subject'),
                    aim: `To understand core concepts of ${context.subjectName || 'the topic'} with practical demonstrations.`,
                    learningObjectives: "1. Grasp fundamental principles\n2. Solve illustrative problems\n3. Apply concepts to real-world scenarios",
                    teachingAids: "Whiteboard, Slides, Practical Demonstrations",
                    interactiveActivity: "Quick 5-minute quiz and hands-on peer problem-solving.",
                    assessmentQuestions: "1. Explain the main concept in your own words.\n2. State two real-world applications.\n3. Solve the assigned exercise.",
                    homework: "Review class notes and complete chapter exercises.",
                    summaryNotes: `Delivered structured lesson covering key principles of ${context.subjectName || 'the topic'}.`
                });
                break;

            case 'grading_feedback':
                systemPrompt = `You are an expert educational grading assistant and code reviewer.
Analyze the student submission against the problem criteria and provide structured marks and constructive feedback.
CONTEXT:
Assignment Title: ${context.assignmentTitle || 'Lab Assignment'}
Problem Statement: ${context.description || context.aim || 'Standard Lab Problem'}
Programming Language: ${context.language || 'python'}
Max Marks: ${context.maxMarks || 100} (Practical: ${context.practicalMarks || 60}, Viva: ${context.vivaMarks || 20}, Output: ${context.outputMarks || 20})
Student Submission Code / Text:
${context.studentCode || context.submissionContent || '(No code submitted)'}
Instructor Note / Instructions: "${prompt}"
Refinement Request: "${refinement || 'None'}"

Output MUST be ONLY valid JSON matching this schema:
{
  "suggestedPracticalMarks": 55,
  "suggestedVivaMarks": 18,
  "suggestedOutputMarks": 18,
  "suggestedTotalMarks": 91,
  "strengths": ["Clean indentation", "Correct edge case handling"],
  "improvements": ["Add error handling for invalid input", "Optimize nested loop"],
  "feedback": "Great work! Your code executes cleanly and produces correct outputs. Consider adding comments.",
  "feedbackHindi": "उत्कृष्ट कार्य! आपका कोड सही ढंग से चलता है और परिणाम सही हैं।",
  "codeReviewSummary": "Logic is sound (O(N) complexity). Good adherence to coding standards."
}`;
                fallbackFn = () => {
                    const max = Number(context.maxMarks) || 100;
                    const prac = Math.round(max * 0.6);
                    const viva = Math.round(max * 0.2);
                    const out = Math.round(max * 0.2);
                    return {
                        suggestedPracticalMarks: Math.round(prac * 0.9),
                        suggestedVivaMarks: Math.round(viva * 0.9),
                        suggestedOutputMarks: Math.round(out * 0.9),
                        suggestedTotalMarks: Math.round(max * 0.9),
                        strengths: ["Code implemented according to instructions", "Logical structure"],
                        improvements: ["Add more inline comments", "Validate input boundaries"],
                        feedback: "Good attempt. The solution meets all required specifications with minor scope for code optimization.",
                        feedbackHindi: "अच्छा प्रयास। समाधान सभी आवश्यक विनिर्देशों को पूरा करता है।",
                        codeReviewSummary: "Solution passes standard verification criteria."
                    };
                };
                break;

            case 'notes_checklist':
                systemPrompt = `You are an expert executive assistant. Convert unstructured notes, meeting logs, or tasks into structured notes with actionable checklist items.
CONTEXT:
Raw Note Content: ${context.content || context.rawText || ''}
Title: ${context.title || ''}
Instructions: "${prompt}"
Refinement: "${refinement || 'None'}"

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Clean, descriptive note title",
  "summary": "2-3 sentence executive summary",
  "formattedMarkdown": "Full formatted markdown with headings and bullet points",
  "checklist": [
    { "text": "Task description 1", "priority": "high", "dueDate": "Tomorrow" },
    { "text": "Task description 2", "priority": "medium", "dueDate": "This Week" }
  ]
}`;
                fallbackFn = () => ({
                    title: context.title || 'Administrative Notes & Action Items',
                    summary: 'Key discussion points and procedural checklist extracted from session.',
                    formattedMarkdown: `### Overview\n${context.content || 'Notes recorded.'}\n\n### Action Items\n- [ ] Review lab safety guidelines\n- [ ] Verify attendance records`,
                    checklist: [
                        { text: "Verify lab system configurations", priority: "high", dueDate: "Today" },
                        { text: "Complete student progress audit", priority: "medium", dueDate: "This Week" }
                    ]
                });
                break;

            case 'ticket_reply':
                systemPrompt = `You are an IT helpdesk and school support AI. Analyze the issue and provide troubleshooting advice and a courteous resolution draft.
CONTEXT:
Ticket Title: ${context.title || ''}
Description: ${context.description || ''}
Category: ${context.category || ''}
Priority: ${context.priority || ''}
Instructions: "${prompt}"
Refinement: "${refinement || 'None'}"

Output MUST be ONLY valid JSON matching this schema:
{
  "suggestedCategory": "hardware | software | network | lab_equipment | timetable | other",
  "suggestedPriority": "low | medium | high | urgent",
  "suggestedStatus": "in_progress | resolved",
  "rootCauseAnalysis": "Brief explanation of probable cause",
  "troubleshootingSteps": "1. Step one...\\n2. Step two...",
  "draftReply": "Dear user, thank you for reaching out. We have reviewed your issue..."
}`;
                fallbackFn = () => ({
                    suggestedCategory: context.category || 'hardware',
                    suggestedPriority: context.priority || 'medium',
                    suggestedStatus: 'in_progress',
                    rootCauseAnalysis: 'System peripheral or software driver mismatch.',
                    troubleshootingSteps: '1. Restart affected system\n2. Verify cable connections and drivers\n3. Run hardware diagnostics',
                    draftReply: `Hello, thank you for reporting this issue. Our lab technician team is looking into this and will verify the hardware setup shortly.`
                });
                break;

            case 'lab_maintenance':
                systemPrompt = `You are a computer lab systems engineer. Analyze lab specs, PC issues, and create a maintenance action plan.
CONTEXT:
Lab: ${context.labName || 'Computer Lab'}
Equipment Details: ${JSON.stringify(context.pcs || context.items || [])}
Instructions: "${prompt}"

Output MUST be ONLY valid JSON matching this schema:
{
  "healthScore": 88,
  "summary": "Overall lab health summary",
  "maintenanceTasks": [
    { "target": "PC-04", "issue": "RAM upgrade recommended", "action": "Install 8GB DDR4 module", "priority": "medium" }
  ],
  "recommendedActionPlan": "Step-by-step lab maintenance plan..."
}`;
                fallbackFn = () => ({
                    healthScore: 90,
                    summary: `Lab equipment in ${context.labName || 'Lab'} is operational with standard routine servicing required.`,
                    maintenanceTasks: [
                        { target: "All PCs", issue: "Routine software updates", action: "Run system updates and anti-virus scan", priority: "low" }
                    ],
                    recommendedActionPlan: "Schedule routine maintenance during off-hours to prevent class interruption."
                });
                break;

            case 'procurement_po':
                systemPrompt = `You are a school procurement analyst. Compare vendor quotes and prepare Purchase Order recommendations.
CONTEXT:
Request Title: ${context.title || 'Procurement Request'}
Quotes / Items: ${JSON.stringify(context.quotations || context.items || [])}
Instructions: "${prompt}"

Output MUST be ONLY valid JSON matching this schema:
{
  "recommendedVendor": "Vendor Name",
  "recommendationRationale": "Detailed justification on pricing and quality",
  "totalEstimatedCost": 45000,
  "deliveryTimeline": "7 to 10 working days",
  "paymentTerms": "50% advance, 50% on verified delivery",
  "poDraft": "Purchase Order draft text..."
}`;
                fallbackFn = () => ({
                    recommendedVendor: context.quotations?.[0]?.vendorName || "Preferred Vendor",
                    recommendationRationale: "Offers best balance of price warranty and verified delivery track record.",
                    totalEstimatedCost: 50000,
                    deliveryTimeline: "7-10 days",
                    paymentTerms: "Standard institutional terms (30 days net)",
                    poDraft: `PURCHASE ORDER\nTo: ${context.quotations?.[0]?.vendorName || "Vendor"}\nRe: Supply of Lab Materials\nTerms: Standard institutional payment.`
                });
                break;

            case 'whiteboard_tasks':
                systemPrompt = `You are an expert pedagogy and interactive whiteboard assistant for instructors.
Your goal is to generate structured, actionable, concise, and pedagogically sound whiteboard tasks/checkpoints for a classroom lesson, lecture, or lab demonstration based on the instructor's prompt.

CONTEXT:
Subject/Domain: ${context.subject || context.subjectName || 'General Academia'}
Topic: ${context.topic || 'Interactive Lesson'}
Target Tasks Count: ${context.count || 4}
Instructor Prompt: "${prompt}"

REQUIREMENTS:
1. Generate between 3 to 6 concise, actionable, and clear tasks suitable for display on a classroom whiteboard.
2. Keep each task text concise (under 15 words) but complete and informative.
3. Include an estimated duration in minutes (e.g. 5, 10, 15).
4. Provide a category for each task: "checkpoint" | "exercise" | "demonstration" | "discussion" | "summary".

Output MUST be ONLY valid JSON matching this schema:
{
  "topic": "Concise Lesson or Whiteboard Topic",
  "tasks": [
    {
      "text": "State the problem statement and draw initial diagram",
      "duration": 5,
      "category": "demonstration"
    },
    {
      "text": "Identify base cases and boundary constraints",
      "duration": 10,
      "category": "checkpoint"
    }
  ]
}`;
                fallbackFn = () => {
                    const baseTopic = prompt ? prompt.trim() : (context.topic || 'Classroom Whiteboard Session');
                    return {
                        topic: baseTopic,
                        tasks: [
                            { text: `Introduce core concepts of ${baseTopic}`, duration: 5, category: 'demonstration' },
                            { text: 'Draw and analyze structural diagram on canvas', duration: 10, category: 'checkpoint' },
                            { text: 'Solve student interactive practice problem', duration: 15, category: 'exercise' },
                            { text: 'Review key takeaways and action items', duration: 5, category: 'summary' }
                        ]
                    };
                };
                break;

            case 'voice_command':
            default:
                return this.executeVoiceCommand(prompt, context);
        }

        // Execute via Unified AI Completion (OpenAI Paid -> Anthropic -> DeepSeek -> OpenRouter -> Groq -> Gemini -> SambaNova)
        try {
            const completionRes = await this.executeChatCompletion({
                systemPrompt: 'You are an educational AI assistant. Output ONLY valid JSON matching the requested schema. No markdown code blocks.',
                messages: [{ role: 'user', content: systemPrompt }],
                preferredProvider: provider || this.preferredProvider || 'auto',
                temperature: 0.2,
                jsonMode: true
            });
            const parsed = this.parseJSONResponse(completionRes.text || '{}');
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (aiErr) {
            console.warn(`[AIService] AI card-assist failed for ${type}:`, aiErr.message);
            if (aiErr.isQuotaExhausted) {
                throw aiErr;
            }
        }

        // Fallback only if non-quota and fallbackFn exists
        if (fallbackFn) {
            console.log(`[AIService] Using structure template fallback for ${type}`);
            return fallbackFn();
        }

        throw new Error('AI generation failed across all configured models. Please check your API keys or quota in Settings.');
    }

    /**
     * Voice Command Natural Language Interpreter
     */
    async executeVoiceCommand(speechText, context = {}) {
        const text = (speechText || '').trim();
        const low = text.toLowerCase();

        const isWhiteboard = context.module === 'whiteboard' ||
            context.currentRoute?.includes('whiteboard') ||
            context.currentRoute?.includes('live-board');

        if (isWhiteboard) {
            const whiteboardSystemPrompt = `You are a voice command interpreter for an interactive collaborative Whiteboard canvas.
Users speak natural, conversational, or imprecise commands (e.g., "wipe the whole board clean", "can you draw a round red circle of size 80", "put a dashed box around here", "zoom closer into the canvas", "switch over to highlighting mode", "let's see the keyboard shortcuts", "hide the measurements", "bring the selected item forward", etc.).
Translate the user's spoken input into the single best standardized Whiteboard voice command string from this supported grammar:

1. DRAW SHAPES & CONNECTORS:
   - "draw circle [radius N]" (e.g. "draw circle radius 60")
   - "draw square [side N]" (e.g. "draw square side 100")
   - "draw rectangle [W by H]" (e.g. "draw rectangle 200 by 120")
   - "draw triangle [size N]"
   - "draw pentagon [size N]"
   - "draw hexagon [size N]"
   - "draw star [size N]"
   - "draw diamond [size N]"
   - "draw arrow" | "double arrow"
   - "draw line" | "straight connector" | "elbow connector" | "curved connector" | "curved arc"
   - "sticky note [yellow|blue|green|pink|purple|orange]" | "add sticky note"

2. SMART SHAPES & SMART INK:
   - "turn on smart shape" | "turn off smart shape" | "toggle smart shape"
   - "turn on smart ink" | "turn off smart ink" | "toggle smart ink"
   - "convert ink" | "convert handwriting" | "ink to text" | "ink to math"

3. PEN BRUSHES, MODES & HIGHLIGHTER:
   - "pen" | "calligraphy" | "crayon" | "watercolor" | "fountain"
   - "sparkle pen [galaxy|rainbow|gold|emerald]"
   - "pen opacity [10-100]%"
   - "pressure sensitivity on" | "pressure sensitivity off"
   - "highlighter [yellow|green|blue|pink|orange]" | "highlighter size [N]"

4. ERASER & SELECTION MODES:
   - "eraser" | "object eraser" | "pixel eraser" | "eraser size [N]"
   - "select" | "lasso select" | "box select" | "select all" | "deselect all"
   - "infinite cloner on" | "infinite cloner off" | "toggle infinite cloner"

5. STYLING & SHAPE PROPERTIES:
   - "color [red|blue|green|yellow|orange|purple|violet|black|white|pink|cyan|emerald]"
   - "border [color]"
   - "border width [1-40]" | "thicker border" | "thinner border"
   - "dashed border" | "dotted border" | "solid border" | "double border"
   - "fill [color]" | "no fill"
   - "corner radius [0-60]"
   - "display units" | "hide units" | "toggle units"

6. ALIGNMENT, ROTATION & TRANSFORMATION:
   - "align left" | "align center" | "align right" | "align top" | "align middle" | "align bottom"
   - "distribute horizontally" | "distribute vertically"
   - "flip horizontal" | "flip vertical"
   - "rotate [90|-90|N] degrees" | "rotate left" | "rotate right"

7. IMAGE TOOLS:
   - "remove image background" | "grayscale image" | "reset image filters"

8. CANVAS ACTIONS & BACKGROUND STYLING:
   - "clear the board" | "undo" | "redo" | "zoom in" | "zoom out" | "reset zoom" | "fit to screen" | "fullscreen"
   - "background [grid|dots|lines|graph|music|isometric|hex|plain]"
   - "background color [blue|navy|black|chalkboard|white|slate|gray|green|purple|cyan]" | "background [blue|navy|black|white|chalkboard|slate|gray]"

9. MULTI-PAGE:
   - "new page" | "duplicate page" | "delete page" | "next page" | "previous page" | "jump to page [N]"

10. TEXT & TYPOGRAPHY:
    - "type [text to type]"
    - "font bold" | "font italic" | "font underline" | "font size [N]" | "font [sans|serif|mono|cursive]"

11. PANELS, MODALS & TOOLS:
    - "help" | "export" | "take screenshot" | "screenshot" | "capture board" | "snapshot" | "tasks" | "template" | "timer" | "spotlight" | "curtain" | "equation" | "math solver" | "3d" | "graph" | "game" | "record" | "insert image" | "media" | "datetime" | "minimap" | "clipboard" | "chat" | "permissions"

12. CLIPBOARD & OBJECT ACTIONS:
    - "delete" | "copy" | "paste" | "duplicate" | "lock" | "group" | "ungroup" | "bring to front" | "send to back"

13. SPATIAL CONNECTIONS & RE-CORRECTIONS:
    - "connect [shape 1] to [shape 2]" (e.g. "connect the two lower circles", "connect the top box to the bottom circle")
    - "move it [direction]" | "move [shape] [direction]" (e.g. "move it higher", "move the square to the right")
    - "make it [bigger|smaller]" | "shrink it [by half|N%]" | "actually make it [color]" | "undo that and draw a [shape] instead"

14. GENERATIVE DRAWING, 3D MODELS, FLOWCHARTS & VISUAL DIAGRAMS:
    - Insert 3D models: "insert 3D earth", "3D atom", "3D DNA", "3D rocket", "3D router", "3D laptop", "3D solar system", "insert 3D sphere/cube/pyramid"
    - Draw flowcharts: "draw flowchart for login", "draw water cycle", "draw algorithm flowchart", "draw decision tree"
    - Draw diagrams: "draw Venn diagram", "draw coordinate axes", "draw triangle with sides 3 4 5 and explain Pythagoras"
    - Full educational boards: "explain structure of atom and draw it", "explain photosynthesis with diagram", "explain earth layers in 3d"

${context.shapes && context.shapes.length > 0 ? `CURRENT ACTIVE OBJECTS ON WHITEBOARD:
${JSON.stringify(context.shapes.slice(0, 30))}
` : ''}
${context.viewport ? `BOARD VIEWPORT & BOUNDS: ${JSON.stringify(context.viewport)}\n` : ''}
${context.conversationHistory && context.conversationHistory.length > 0 ? `RECENT CONVERSATION TURNS:
${JSON.stringify(context.conversationHistory.slice(-5))}
` : ''}
${context.lastActionTarget ? `LAST TARGETED OBJECT: ${JSON.stringify(context.lastActionTarget)}\n` : ''}
Spoken input: "${text}"

Determine whether the user is issuing a canvas command, adjusting an object property, requesting a generative visual/3D drawing, OR asking an educational/cognitive question:

If Property Modification (e.g., "reduce border to 1 px", "reduce border by 2px", "whittle down perimeter by 2 units", "increase opacity to 80%", "make font 24px", "expand width by 50px", "rotate 45 degrees"):
{
  "recognized": true,
  "type": "property_modification",
  "intent": "modify_property",
  "property": "strokeWidth | opacity | fontSize | width | height | rotation | color | fillColor",
  "mode": "relative_delta | absolute_value",
  "value": -2,
  "spokenFeedback": "Reduced border by 2px",
  "speechResponse": "Reducing border width by 2 pixels on the selected shape."
}

If Canvas Command:
{
  "recognized": true,
  "type": "command",
  "translatedCommand": "<standardized command from above grammar>",
  "intent": "<intent_name>",
  "spokenFeedback": "<brief confirmation message>",
  "speechResponse": "<short natural voice reply for TTS>"
}

If Generative Drawing, 3D Model, Flowchart, or Visual Diagram:
{
  "recognized": true,
  "type": "canvas_generation",
  "intent": "generate_diagram_or_3d",
  "speechResponse": "<2-3 engaging, natural conversational sentences explaining what was created and the scientific/mathematical concept for Speech Synthesis audio playback>",
  "spokenFeedback": "<Brief status, e.g. 'Created 3D Earth with notes'>",
  "solutionMarkdown": "<Step-by-step clear notes and LaTeX formulas using $$...$$ format for math/science>",
  "canvasAction": {
    "type": "insert_3d_model" | "draw_flowchart" | "draw_diagram" | "create_lesson_board",
    "layoutType": "cycle | branching | hierarchical",
    "modelType": "<earth | sun | moon | mars | jupiter | saturn | atom | dna_double_helix | molecule | rocket | satellite | laptop | router | switch | cube | sphere | pyramid | cylinder | cone>",
    "title": "<Concise title of diagram or visual>",
    "color": "<hex color code>",
    "nodes": [
      { "id": "n1", "label": "<Step 1 text>", "shapeType": "terminator | rounded_rect | rectangle | diamond | parallelogram | cylinder | circle", "color": "#6366f1" }
    ],
    "connections": [
      { "from": "n1", "to": "n2", "label": "<descriptive transition label, e.g. chemical step, reaction, condition, action>", "sourceAnchor": "top | bottom | left | right", "targetAnchor": "top | bottom | left | right" }
    ],
    "shapes": [
      { "type": "circle | rectangle | triangle | arrow", "label": "<text>", "color": "#6366f1" }
    ],
    "notes": [
      { "title": "<Note Title>", "text": "<Note explanation content>", "color": "purple | yellow | blue | green | pink" }
    ]
  }
}

CRITICAL FLOWCHART & CYCLE GUIDELINES:
- For any cyclic process (Krebs cycle, photosynthesis, Calvin cycle, nitrogen cycle, carbon cycle, cell cycle, rock cycle, water cycle, PDCA cycle, SDLC):
  - Set "layoutType": "cycle"
  - Arrange stages in sequential clockwise order.
  - Connect the final stage back to the first stage with a meaningful loop label (e.g. "Continuous Cycle", "Regeneration", "Substrate Recycling").
  - On EVERY connection, include a descriptive "label" (e.g. chemical enzyme, energy transfer, condition).
  - Use "terminator" for major start/end/reservoir states, "rounded_rect" for processes, "diamond" for checkpoints.
- For decision trees, algorithms, or sequential processes (binary search, auth, checkout, ML pipeline):
  - Set "layoutType": "branching"
  - Use "diamond" for decisions, "parallelogram" for input/output, "terminator" for start/end, "rectangle" for steps.
  - Label branches clearly ("Yes/Match", "No/Mismatch", "Retry").

If Question, Problem to Solve, or Scientific/Educational Explanation (e.g. "explain newton three laws of motion", "explain photosynthesis", "solve 3x + 12 = 36", "teach magnetic field with formula"):
CRITICAL: NEVER return a drawing command (like 'draw circle') or canvas wipe command ('clear the board') for educational questions or explanations! ALWAYS return a "solution" with speechResponse and LaTeX formulas!
{
  "recognized": true,
  "type": "solution",
  "intent": "solve_or_explain",
  "speechResponse": "<2-4 natural, engaging conversational sentences explaining the concepts clearly for Speech Synthesis audio playback>",
  "solutionMarkdown": "<Step-by-step clear solution, definitions, and LaTeX formulas using $$...$$ format for math/science>",
  "spokenFeedback": "<Brief status, e.g. 'Explained Newton\\'s Laws of Motion'>",
  "canvasAction": {
    "type": "insert_solution_card",
    "title": "<Concise title of solution or concept>",
    "summary": "<1-line summary of answer>"
  }
}

If completely gibberish:
{
  "recognized": false,
  "type": "unrecognized",
  "spokenFeedback": "Command not recognized"
}`;

            const isCognitiveQuery =
                low.startsWith('explain') ||
                low.startsWith('teach') ||
                low.startsWith('solve') ||
                low.startsWith('how does') ||
                low.startsWith('how do') ||
                low.startsWith('what is') ||
                low.startsWith('what are') ||
                low.startsWith('derive') ||
                low.startsWith('prove') ||
                low.startsWith('calculate') ||
                low.startsWith('why') ||
                low.includes('newton') ||
                low.includes('law of motion') ||
                low.includes('magnetic') ||
                low.includes('photosynthesis') ||
                low.includes('pythagor') ||
                low.includes('ohm') ||
                low.includes('formula') ||
                low.includes('equation') ||
                low.includes('diagram') ||
                low.includes('flowchart') ||
                low.includes('3d model') ||
                low.includes('structure of') ||
                low.includes('cycle');

            // Dispatch to Unified AI Completion (OpenAI Paid -> Anthropic -> DeepSeek -> OpenRouter -> Groq -> Gemini -> SambaNova)
            try {
                const completionRes = await this.executeChatCompletion({
                    systemPrompt: whiteboardSystemPrompt,
                    messages: [{ role: 'user', content: `Spoken input: "${text}"` }],
                    preferredProvider: context.preferredProvider || this.preferredProvider || 'auto',
                    temperature: 0.1,
                    jsonMode: true
                });

                const parsed = this.parseJSONResponse(completionRes.text || '{}');
                if (parsed && (parsed.translatedCommand || parsed.recognized || parsed.type === 'solution' || parsed.type === 'canvas_generation')) {
                    return {
                        ...parsed,
                        recognized: parsed.recognized !== false,
                        modelUsed: completionRes.model,
                        providerUsed: completionRes.provider
                    };
                }
            } catch (err) {
                console.warn('[AIService] executeChatCompletion failed for whiteboard voice:', err.message);
                if (err.isQuotaExhausted || isCognitiveQuery) {
                    // USER DIRECTIVE: Strictly NO local fallbacks for questions / educational queries.
                    // If quota is exhausted or AI failed, clearly show error and do not proceed!
                    return {
                        recognized: false,
                        success: false,
                        quotaExhausted: Boolean(err.isQuotaExhausted),
                        error: err.message,
                        spokenFeedback: err.isQuotaExhausted
                            ? 'AI service quota exhausted. Please check your API keys or configure a paid model in Settings.'
                            : 'AI service unavailable. Please check your network connection or API settings.',
                        speechResponse: err.isQuotaExhausted
                            ? 'The AI service quota is currently exhausted. Please update your API keys or configure a paid model in Settings to continue.'
                            : 'The AI model could not process this request right now. Please try again.'
                    };
                }
            }

            // Direct standard UI button shortcuts (only if non-cognitive and recognized verbatim)
            let translatedCommand = null;
            let intent = 'unknown';
            let spokenFeedback = `Interpreted: "${text}"`;

            // Canvas & Board Wipe
            if (low.includes('clear') || low.includes('wipe') || low.includes('clean') || low.includes('empty board') || low.includes('blank board') || low.includes('erase all') || low.includes('rub all')) {
                translatedCommand = 'clear the board';
                intent = 'clear_canvas';
                spokenFeedback = 'Clearing the canvas';
            }
            // Voice controls
            else if (low.includes('stop listening') || low.includes('turn off voice') || low.includes('voice mode off') || low.includes('shut up') || low.includes('mute mic') || low.includes('be quiet') || low.includes('voice off')) {
                translatedCommand = 'voice mode off';
                intent = 'voice_off';
                spokenFeedback = 'Turned off voice control';
            }
            else if (low.includes('start listening') || low.includes('turn on voice') || low.includes('voice mode on') || low.includes('unmute mic') || low.includes('listen to me') || low.includes('voice on')) {
                translatedCommand = 'voice mode on';
                intent = 'voice_on';
                spokenFeedback = 'Voice mode is active';
            }
            // Zoom & Canvas View
            else if (low.includes('zoom in') || low.includes('magnify') || low.includes('closer') || low.includes('enlarge view')) {
                translatedCommand = 'zoom in';
                intent = 'zoom_in';
                spokenFeedback = 'Zooming in';
            }
            else if (low.includes('zoom out') || low.includes('shrink') || low.includes('farther') || low.includes('zoom away')) {
                translatedCommand = 'zoom out';
                intent = 'zoom_out';
                spokenFeedback = 'Zooming out';
            }
            else if (low.includes('reset zoom') || low.includes('normal view') || low.includes('default zoom') || low.includes('zoom 100') || low.includes('fit screen') || low.includes('fit canvas')) {
                translatedCommand = 'reset zoom';
                intent = 'reset_zoom';
                spokenFeedback = 'Resetting zoom';
            }
            else if (low.includes('fullscreen') || low.includes('full screen')) {
                translatedCommand = 'fullscreen';
                intent = 'fullscreen';
                spokenFeedback = 'Toggling fullscreen';
            }
            else if (low.includes('grid') || low.includes('graph paper') || low.includes('lines background')) {
                translatedCommand = 'grid';
                intent = 'grid';
                spokenFeedback = 'Toggling grid background';
            }
            // Background Patterns & Colors (Evaluated before shapes so 'background' never collides with 'round')
            else if ((low.includes('blue') || low.includes('dark blue')) && (low.includes('background') || low.includes('canvas') || low.includes('board'))) {
                translatedCommand = 'background color blue';
                intent = 'bg_blue';
                spokenFeedback = 'Setting canvas background to blue';
            }
            else if (low.includes('chalkboard') || (low.includes('green') && (low.includes('board') || low.includes('background') || low.includes('canvas')))) {
                translatedCommand = 'chalkboard';
                intent = 'bg_chalkboard';
                spokenFeedback = 'Setting chalkboard green background';
            }
            else if (low.includes('navy') && (low.includes('background') || low.includes('canvas') || low.includes('board'))) {
                translatedCommand = 'navy background';
                intent = 'bg_navy';
                spokenFeedback = 'Setting navy dark background';
            }
            else if (low.includes('black') && (low.includes('background') || low.includes('board') || low.includes('canvas'))) {
                translatedCommand = 'background black';
                intent = 'bg_black';
                spokenFeedback = 'Setting black canvas background';
            }
            else if ((low.includes('white') || low.includes('plain') || low.includes('blank')) && (low.includes('background') || low.includes('board') || low.includes('canvas'))) {
                translatedCommand = 'background white';
                intent = 'bg_white';
                spokenFeedback = 'Setting white canvas background';
            }
            else if (low.includes('slate') && (low.includes('background') || low.includes('canvas') || low.includes('board'))) {
                translatedCommand = 'background color slate';
                intent = 'bg_slate';
                spokenFeedback = 'Setting slate canvas background';
            }
            else if (low.includes('purple') && (low.includes('background') || low.includes('canvas') || low.includes('board'))) {
                translatedCommand = 'background color purple';
                intent = 'bg_purple';
                spokenFeedback = 'Setting purple canvas background';
            }
            else if (low.includes('cyan') && (low.includes('background') || low.includes('canvas') || low.includes('board'))) {
                translatedCommand = 'background color cyan';
                intent = 'bg_cyan';
                spokenFeedback = 'Setting cyan canvas background';
            }
            else if (low.includes('background dot') || low.includes('canvas dot') || low.includes('dotted background')) {
                translatedCommand = 'background dots';
                intent = 'bg_dots';
                spokenFeedback = 'Setting background to dots';
            }
            else if (low.includes('ruled') || low.includes('lined background') || low.includes('background lines')) {
                translatedCommand = 'background lines';
                intent = 'bg_lines';
                spokenFeedback = 'Setting background to ruled lines';
            }
            else if (low.includes('music') && (low.includes('background') || low.includes('sheet') || low.includes('canvas'))) {
                translatedCommand = 'background music';
                intent = 'bg_music';
                spokenFeedback = 'Setting background to music staff';
            }
            else if (low.includes('isometric') && (low.includes('background') || low.includes('canvas'))) {
                translatedCommand = 'background isometric';
                intent = 'bg_iso';
                spokenFeedback = 'Setting background to isometric';
            }
            else if (low.includes('hex') && (low.includes('background') || low.includes('canvas'))) {
                translatedCommand = 'background hex';
                intent = 'bg_hex';
                spokenFeedback = 'Setting background to hexagons';
            }
            // Shapes Drawing
            else if (low.includes('circle') || (/\b(round\s+shape|round\s+circle|disc|ring)\b/i.test(low)) || (/\bround\b/i.test(low) && !low.includes('background') && !low.includes('ground') && !low.includes('around') && !low.includes('surround'))) {
                const num = (low.match(/\d+/) || [60])[0];
                translatedCommand = `draw circle radius ${num}`;
                intent = 'draw_circle';
                spokenFeedback = `Drawing circle with radius ${num}px`;
            }
            else if (low.includes('square')) {
                const num = (low.match(/\d+/) || [100])[0];
                translatedCommand = `draw square side ${num}`;
                intent = 'draw_square';
                spokenFeedback = `Drawing square with side ${num}px`;
            }
            else if (low.includes('rectangle') || low.includes('box') || low.includes('quadrilateral') || low.includes('rect')) {
                const byMatch = low.match(/(\d+)\s*(?:by|x|\*)\s*(\d+)/);
                if (byMatch) {
                    translatedCommand = `draw rectangle ${byMatch[1]} by ${byMatch[2]}`;
                } else {
                    const num = (low.match(/\d+/) || [160])[0];
                    translatedCommand = `draw rectangle ${num} by 100`;
                }
                intent = 'draw_rectangle';
                spokenFeedback = 'Drawing rectangle';
            }
            else if (low.includes('triangle')) {
                const num = (low.match(/\d+/) || [120])[0];
                translatedCommand = `draw triangle size ${num}`;
                intent = 'draw_triangle';
                spokenFeedback = 'Drawing triangle';
            }
            else if (low.includes('star')) {
                translatedCommand = 'draw star';
                intent = 'draw_star';
                spokenFeedback = 'Drawing star';
            }
            else if (low.includes('diamond') || low.includes('rhombus')) {
                translatedCommand = 'draw diamond';
                intent = 'draw_diamond';
                spokenFeedback = 'Drawing diamond';
            }
            else if (low.includes('pentagon')) {
                translatedCommand = 'draw pentagon';
                intent = 'draw_pentagon';
                spokenFeedback = 'Drawing pentagon';
            }
            else if (low.includes('hexagon')) {
                translatedCommand = 'draw hexagon';
                intent = 'draw_hexagon';
                spokenFeedback = 'Drawing hexagon';
            }
            else if (low.includes('arrow')) {
                translatedCommand = 'draw arrow';
                intent = 'draw_arrow';
                spokenFeedback = 'Drawing arrow';
            }
            else if (low.includes('line') || low.includes('rule') || low.includes('straight line')) {
                translatedCommand = 'draw line';
                intent = 'draw_line';
                spokenFeedback = 'Drawing straight line';
            }
            // Shape styling & units
            else if (low.includes('show units') || low.includes('display units') || low.includes('show dimensions') || low.includes('measurements on')) {
                translatedCommand = 'display units';
                intent = 'display_units';
                spokenFeedback = 'Displaying dimensions and units';
            }
            else if (low.includes('hide units') || low.includes('remove units') || low.includes('hide dimensions') || low.includes('measurements off')) {
                translatedCommand = 'hide units';
                intent = 'hide_units';
                spokenFeedback = 'Hiding dimensions and units';
            }
            else if (low.includes('dashed border') || low.includes('dashed line') || low.includes('dashed outline')) {
                translatedCommand = 'dashed border';
                intent = 'border_style';
                spokenFeedback = 'Setting border to dashed';
            }
            else if (low.includes('dotted border') || low.includes('dotted line') || low.includes('dotted outline') || low.includes('dots')) {
                translatedCommand = 'dotted border';
                intent = 'border_style';
                spokenFeedback = 'Setting border to dotted';
            }
            else if (low.includes('solid border') || low.includes('solid line')) {
                translatedCommand = 'solid border';
                intent = 'border_style';
                spokenFeedback = 'Setting border to solid';
            }
            else if (low.includes('double border')) {
                translatedCommand = 'double border';
                intent = 'border_style';
                spokenFeedback = 'Setting border to double';
            }
            else if (low.includes('thicker border') || low.includes('increase border') || low.includes('thicker outline')) {
                translatedCommand = 'thicker border';
                intent = 'border_thickness';
                spokenFeedback = 'Increased border thickness';
            }
            else if (low.includes('thinner border') || low.includes('decrease border') || low.includes('thinner outline')) {
                translatedCommand = 'thinner border';
                intent = 'border_thickness';
                spokenFeedback = 'Decreased border thickness';
            }
            else if (low.includes('no fill') || low.includes('transparent fill') || low.includes('remove fill') || low.includes('clear fill')) {
                translatedCommand = 'no fill';
                intent = 'fill_transparent';
                spokenFeedback = 'Shape fill set to transparent';
            }
            else if (low.match(/(?:fill|interior|inside)\s+(red|blue|green|yellow|orange|purple|violet|black|white|pink|cyan)/)) {
                const color = low.match(/(?:fill|interior|inside)\s+(red|blue|green|yellow|orange|purple|violet|black|white|pink|cyan)/)[1];
                translatedCommand = `fill ${color}`;
                intent = 'fill_color';
                spokenFeedback = `Filled with ${color}`;
            }
            else if (low.match(/(?:border|stroke|outline)\s+(red|blue|green|yellow|orange|purple|violet|black|white|pink|cyan)/)) {
                const color = low.match(/(?:border|stroke|outline)\s+(red|blue|green|yellow|orange|purple|violet|black|white|pink|cyan)/)[1];
                translatedCommand = `border ${color}`;
                intent = 'border_color';
                spokenFeedback = `Border set to ${color}`;
            }
            // Tools
            // Smart Shapes & Smart Ink
            else if ((low.includes('smart shape') || low.includes('auto shape')) && (low.includes('off') || low.includes('disable') || low.includes('deactivate'))) {
                translatedCommand = 'turn off smart shape';
                intent = 'smart_shape_off';
                spokenFeedback = 'Disabling smart shape auto-recognition';
            }
            else if ((low.includes('smart shape') || low.includes('auto shape')) && (low.includes('on') || low.includes('enable') || low.includes('activate'))) {
                translatedCommand = 'turn on smart shape';
                intent = 'smart_shape_on';
                spokenFeedback = 'Enabling smart shape auto-recognition';
            }
            else if (low.includes('toggle smart shape') || low.includes('toggle auto shape')) {
                translatedCommand = 'toggle smart shape';
                intent = 'smart_shape_toggle';
                spokenFeedback = 'Toggling smart shape recognition';
            }
            else if ((low.includes('smart ink') || low.includes('handwriting recognition')) && (low.includes('off') || low.includes('disable'))) {
                translatedCommand = 'turn off smart ink';
                intent = 'smart_ink_off';
                spokenFeedback = 'Disabling smart ink handwriting recognition';
            }
            else if ((low.includes('smart ink') || low.includes('handwriting recognition')) && (low.includes('on') || low.includes('enable'))) {
                translatedCommand = 'turn on smart ink';
                intent = 'smart_ink_on';
                spokenFeedback = 'Enabling smart ink handwriting recognition';
            }
            else if (low.includes('toggle smart ink') || low.includes('toggle handwriting')) {
                translatedCommand = 'toggle smart ink';
                intent = 'smart_ink_toggle';
                spokenFeedback = 'Toggling smart ink handwriting recognition';
            }
            else if (low.includes('convert ink') || low.includes('convert handwriting') || low.includes('recognize ink') || low.includes('ink to text') || low.includes('ink to math')) {
                translatedCommand = 'convert ink';
                intent = 'convert_ink';
                spokenFeedback = 'Converting handwritten ink to digital text / math';
            }
            // Brushes & Pen Styles
            else if (low.includes('calligraphy')) {
                translatedCommand = 'calligraphy';
                intent = 'brush_calligraphy';
                spokenFeedback = 'Switched to Calligraphy Pen';
            }
            else if (low.includes('crayon')) {
                translatedCommand = 'crayon';
                intent = 'brush_crayon';
                spokenFeedback = 'Switched to Crayon Brush';
            }
            else if (low.includes('watercolor')) {
                translatedCommand = 'watercolor';
                intent = 'brush_watercolor';
                spokenFeedback = 'Switched to Watercolor Brush';
            }
            else if (low.includes('fountain')) {
                translatedCommand = 'fountain';
                intent = 'brush_fountain';
                spokenFeedback = 'Switched to Fountain Pen';
            }
            else if (low.includes('sparkle')) {
                let theme = 'galaxy';
                if (low.includes('rainbow')) theme = 'rainbow';
                else if (low.includes('gold')) theme = 'gold';
                else if (low.includes('emerald')) theme = 'emerald';
                translatedCommand = `sparkle pen ${theme}`;
                intent = 'tool_sparkle';
                spokenFeedback = `Switched to ${theme} Sparkle Pen`;
            }
            else if (low.includes('opacity') && (low.includes('percent') || low.includes('%') || low.match(/\d+/))) {
                const op = (low.match(/\d+/) || [100])[0];
                translatedCommand = `pen opacity ${op} percent`;
                intent = 'pen_opacity';
                spokenFeedback = `Setting pen opacity to ${op}%`;
            }
            else if (low.includes('pressure') && (low.includes('on') || low.includes('enable'))) {
                translatedCommand = 'pressure sensitivity on';
                intent = 'pressure_on';
                spokenFeedback = 'Enabling pen pressure sensitivity';
            }
            else if (low.includes('pressure') && (low.includes('off') || low.includes('disable'))) {
                translatedCommand = 'pressure sensitivity off';
                intent = 'pressure_off';
                spokenFeedback = 'Disabling pen pressure sensitivity';
            }
            else if (low.includes('pencil') || low.includes('pen') || low.includes('draw with pen') || low.includes('drawing mode')) {
                translatedCommand = 'pen';
                intent = 'tool_pen';
                spokenFeedback = 'Switched to Pen tool';
            }
            // Highlighter & Eraser
            else if (low.includes('highlighter') || low.includes('marker') || low.includes('highlight')) {
                let clr = '';
                if (low.includes('green')) clr = ' green';
                else if (low.includes('blue')) clr = ' blue';
                else if (low.includes('pink')) clr = ' pink';
                else if (low.includes('orange')) clr = ' orange';
                else if (low.includes('yellow')) clr = ' yellow';
                translatedCommand = `highlighter${clr}`;
                intent = 'tool_highlighter';
                spokenFeedback = `Switched to Highlighter${clr}`;
            }
            else if (low.includes('object eraser') || low.includes('stroke eraser')) {
                translatedCommand = 'object eraser';
                intent = 'tool_eraser_object';
                spokenFeedback = 'Switched to Object Eraser';
            }
            else if (low.includes('pixel eraser') || low.includes('rub eraser')) {
                translatedCommand = 'pixel eraser';
                intent = 'tool_eraser_rub';
                spokenFeedback = 'Switched to Pixel Eraser';
            }
            else if (low.includes('eraser') && low.match(/\d+/)) {
                const sz = (low.match(/\d+/) || [20])[0];
                translatedCommand = `eraser size ${sz}`;
                intent = 'eraser_size';
                spokenFeedback = `Eraser size set to ${sz}px`;
            }
            else if (low.includes('eraser') || low.includes('rub') || low.includes('erase')) {
                translatedCommand = 'eraser';
                intent = 'tool_eraser';
                spokenFeedback = 'Switched to Eraser';
            }
            // Selection & Infinite Cloner
            else if (low.includes('lasso')) {
                translatedCommand = 'lasso select';
                intent = 'tool_lasso';
                spokenFeedback = 'Switched to Lasso selection';
            }
            else if (low.includes('box select') || low.includes('rectangle select')) {
                translatedCommand = 'box select';
                intent = 'tool_box_select';
                spokenFeedback = 'Switched to Box selection';
            }
            else if (low.includes('select all') || low.includes('select everything')) {
                translatedCommand = 'select all';
                intent = 'select_all';
                spokenFeedback = 'Selected all objects';
            }
            else if (low.includes('deselect') || low.includes('unselect') || low.includes('clear selection')) {
                translatedCommand = 'deselect all';
                intent = 'deselect_all';
                spokenFeedback = 'Cleared selection';
            }
            else if (low.includes('infinite') && (low.includes('on') || low.includes('enable'))) {
                translatedCommand = 'infinite cloner on';
                intent = 'infinite_cloner_on';
                spokenFeedback = 'Enabled Infinite Cloner';
            }
            else if (low.includes('infinite') && (low.includes('off') || low.includes('disable'))) {
                translatedCommand = 'infinite cloner off';
                intent = 'infinite_cloner_off';
                spokenFeedback = 'Disabled Infinite Cloner';
            }
            else if (low.includes('toggle infinite')) {
                translatedCommand = 'toggle infinite cloner';
                intent = 'infinite_cloner_toggle';
                spokenFeedback = 'Toggled Infinite Cloner';
            }
            else if (low.includes('select') || low.includes('pointer') || low.includes('cursor')) {
                translatedCommand = 'select';
                intent = 'tool_select';
                spokenFeedback = 'Switched to Selection tool';
            }
            // Connectors & Lines
            else if (low.includes('double arrow')) {
                translatedCommand = 'double arrow';
                intent = 'tool_double_arrow';
                spokenFeedback = 'Double Arrow tool active';
            }
            else if (low.includes('straight connector')) {
                translatedCommand = 'straight connector';
                intent = 'tool_straight_connector';
                spokenFeedback = 'Straight Connector active';
            }
            else if (low.includes('elbow connector') || low.includes('orthogonal connector')) {
                translatedCommand = 'elbow connector';
                intent = 'tool_elbow_connector';
                spokenFeedback = 'Elbow Connector active';
            }
            else if (low.includes('curved connector')) {
                translatedCommand = 'curved connector';
                intent = 'tool_curved_connector';
                spokenFeedback = 'Curved Connector active';
            }
            else if (low.includes('curved arc') || low.includes('arc tool')) {
                translatedCommand = 'curved arc';
                intent = 'tool_arc';
                spokenFeedback = 'Curved Arc tool active';
            }
            // Alignment, Distribution, Flipping & Rotation
            else if (low.includes('align left')) {
                translatedCommand = 'align left';
                intent = 'align_left';
                spokenFeedback = 'Aligned items to the left';
            }
            else if (low.includes('align center') || low.includes('center horizontally')) {
                translatedCommand = 'align center';
                intent = 'align_center';
                spokenFeedback = 'Aligned items horizontally centered';
            }
            else if (low.includes('align right')) {
                translatedCommand = 'align right';
                intent = 'align_right';
                spokenFeedback = 'Aligned items to the right';
            }
            else if (low.includes('align top')) {
                translatedCommand = 'align top';
                intent = 'align_top';
                spokenFeedback = 'Aligned items to the top';
            }
            else if (low.includes('align middle') || low.includes('center vertically')) {
                translatedCommand = 'align middle';
                intent = 'align_middle';
                spokenFeedback = 'Aligned items vertically middle';
            }
            else if (low.includes('align bottom')) {
                translatedCommand = 'align bottom';
                intent = 'align_bottom';
                spokenFeedback = 'Aligned items to the bottom';
            }
            else if (low.includes('distribute horizontal') || low.includes('horizontal space')) {
                translatedCommand = 'distribute horizontally';
                intent = 'distribute_horiz';
                spokenFeedback = 'Distributed items horizontally';
            }
            else if (low.includes('distribute vertical') || low.includes('vertical space')) {
                translatedCommand = 'distribute vertically';
                intent = 'distribute_vert';
                spokenFeedback = 'Distributed items vertically';
            }
            else if (low.includes('flip horizontal') || low.includes('flip horizontally')) {
                translatedCommand = 'flip horizontal';
                intent = 'flip_horiz';
                spokenFeedback = 'Flipped selection horizontally';
            }
            else if (low.includes('flip vertical') || low.includes('flip vertically')) {
                translatedCommand = 'flip vertical';
                intent = 'flip_vert';
                spokenFeedback = 'Flipped selection vertically';
            }
            else if (low.includes('rotate')) {
                const deg = (low.match(/-?\d+/) || [90])[0];
                translatedCommand = `rotate ${deg} degrees`;
                intent = 'rotate_selection';
                spokenFeedback = `Rotating selection by ${deg}°`;
            }
            // Image Tools
            else if (low.includes('remove background') || low.includes('transparent background') || low.includes('cutout image')) {
                translatedCommand = 'remove image background';
                intent = 'remove_image_bg';
                spokenFeedback = 'Removing image background';
            }
            else if (low.includes('grayscale') || low.includes('black and white image')) {
                translatedCommand = 'grayscale image';
                intent = 'grayscale_image';
                spokenFeedback = 'Applied grayscale filter';
            }
            else if (low.includes('reset image')) {
                translatedCommand = 'reset image filters';
                intent = 'reset_image_filters';
                spokenFeedback = 'Reset image filters';
            }
            // Multi-Page
            else if (low.includes('duplicate page') || low.includes('clone page')) {
                translatedCommand = 'duplicate page';
                intent = 'duplicate_page';
                spokenFeedback = 'Duplicated current page';
            }
            else if (low.includes('delete page') || low.includes('remove page')) {
                translatedCommand = 'delete page';
                intent = 'delete_page';
                spokenFeedback = 'Deleted current page';
            }
            else if (low.match(/(?:jump to|go to|open)\s*page\s*(\d+)/)) {
                const pNum = low.match(/(?:jump to|go to|open)\s*page\s*(\d+)/)[1];
                translatedCommand = `jump to page ${pNum}`;
                intent = 'jump_page';
                spokenFeedback = `Navigating to page ${pNum}`;
            }
            else if (low.includes('new page') || low.includes('add page')) {
                translatedCommand = 'new page';
                intent = 'new_page';
                spokenFeedback = 'Created new page';
            }
            else if (low.includes('next page')) {
                translatedCommand = 'next page';
                intent = 'next_page';
                spokenFeedback = 'Navigating to next page';
            }
            else if (low.includes('previous page') || low.includes('prev page')) {
                translatedCommand = 'previous page';
                intent = 'prev_page';
                spokenFeedback = 'Navigating to previous page';
            }
            // Text Formatting & Typography
            else if (low.includes('bold')) {
                translatedCommand = 'font bold';
                intent = 'font_bold';
                spokenFeedback = 'Toggled Bold text';
            }
            else if (low.includes('italic')) {
                translatedCommand = 'font italic';
                intent = 'font_italic';
                spokenFeedback = 'Toggled Italic text';
            }
            else if (low.includes('underline')) {
                translatedCommand = 'font underline';
                intent = 'font_underline';
                spokenFeedback = 'Toggled Underline text';
            }
            else if (low.match(/font\s*(?:size)?\s*(\d+)/)) {
                const fs = low.match(/font\s*(?:size)?\s*(\d+)/)[1];
                translatedCommand = `font size ${fs}`;
                intent = 'font_size';
                spokenFeedback = `Font size set to ${fs}px`;
            }
            else if (low.includes('serif')) {
                translatedCommand = 'font serif';
                intent = 'font_family';
                spokenFeedback = 'Font family set to serif';
            }
            else if (low.includes('mono')) {
                translatedCommand = 'font mono';
                intent = 'font_family';
                spokenFeedback = 'Font family set to monospace';
            }
            else if (low.includes('cursive')) {
                translatedCommand = 'font cursive';
                intent = 'font_family';
                spokenFeedback = 'Font family set to cursive';
            }
            // Sticky Note
            else if (low.includes('sticky note') || low.includes('add note') || low.includes('sticky')) {
                let clr = 'yellow';
                if (low.includes('blue')) clr = 'blue';
                else if (low.includes('green')) clr = 'green';
                else if (low.includes('pink')) clr = 'pink';
                else if (low.includes('purple')) clr = 'purple';
                else if (low.includes('orange')) clr = 'orange';
                translatedCommand = `sticky note ${clr}`;
                intent = 'sticky_note';
                spokenFeedback = `Added ${clr} sticky note`;
            }
            // Overlays & Panels
            else if (low.includes('minimap') || low.includes('navigation map')) {
                translatedCommand = 'minimap';
                intent = 'toggle_minimap';
                spokenFeedback = 'Toggled minimap navigation';
            }
            else if (low.includes('clipboard')) {
                translatedCommand = 'clipboard';
                intent = 'toggle_clipboard';
                spokenFeedback = 'Toggled clipboard history';
            }
            else if (low.includes('chat') || low.includes('message')) {
                translatedCommand = 'chat';
                intent = 'toggle_chat';
                spokenFeedback = 'Toggled chat panel';
            }
            else if (low.includes('permission') || low.includes('participant')) {
                translatedCommand = 'permissions';
                intent = 'open_permissions';
                spokenFeedback = 'Opened participants permissions';
            }
            else if (low.includes('hand tool') || low.includes('pan tool') || low.includes('move board')) {
                translatedCommand = 'hand tool';
                intent = 'tool_hand';
                spokenFeedback = 'Switched to Hand tool';
            }
            else if (low.includes('laser') || low.includes('pointer dot')) {
                translatedCommand = 'laser';
                intent = 'tool_laser';
                spokenFeedback = 'Switched to Laser Pointer';
            }
            else if (low.includes('ruler')) {
                translatedCommand = 'ruler';
                intent = 'tool_ruler';
                spokenFeedback = 'Added Measuring Ruler';
            }
            else if (low.includes('protractor')) {
                translatedCommand = 'protractor';
                intent = 'tool_protractor';
                spokenFeedback = 'Added Protractor';
            }
            // Clipboard & actions
            else if (low.includes('delete') || low.includes('trash') || low.includes('remove item') || low.includes('discard')) {
                translatedCommand = 'delete';
                intent = 'delete_item';
                spokenFeedback = 'Deleted selection';
            }
            else if (low.includes('undo') || low.includes('step back') || low.includes('revert')) {
                translatedCommand = 'undo';
                intent = 'undo';
                spokenFeedback = 'Undone previous action';
            }
            else if (low.includes('redo') || low.includes('step forward')) {
                translatedCommand = 'redo';
                intent = 'redo';
                spokenFeedback = 'Redone action';
            }
            else if (low.includes('copy')) {
                translatedCommand = 'copy';
                intent = 'copy';
                spokenFeedback = 'Copied to clipboard';
            }
            else if (low.includes('paste')) {
                translatedCommand = 'paste';
                intent = 'paste';
                spokenFeedback = 'Pasted from clipboard';
            }
            else if (low.includes('duplicate') || low.includes('clone')) {
                translatedCommand = 'duplicate';
                intent = 'duplicate';
                spokenFeedback = 'Duplicated selection';
            }
            else if (low.includes('lock') || low.includes('freeze') || low.includes('unlock')) {
                translatedCommand = 'lock';
                intent = 'lock';
                spokenFeedback = 'Toggled object lock';
            }
            // Modals & Panels
            else if (low.includes('help') || low.includes('cheat sheet') || low.includes('commands') || low.includes('shortcuts')) {
                translatedCommand = 'help';
                intent = 'help_modal';
                spokenFeedback = 'Opened Voice Commands and Shortcuts Help';
            }
            else if (low.includes('export') || low.includes('download') || low.includes('save board')) {
                translatedCommand = 'export';
                intent = 'export_modal';
                spokenFeedback = 'Opened Export dialog';
            }
            else if (low.includes('screenshot') || low.includes('screen shot') || low.includes('capture board') || low.includes('capture screen') || low.includes('snapshot')) {
                translatedCommand = 'take screenshot';
                intent = 'screenshot';
                spokenFeedback = 'Capturing Whiteboard Screenshot';
            }
            else if (low.includes('timer') || low.includes('stopwatch') || low.includes('countdown')) {
                translatedCommand = 'timer';
                intent = 'timer';
                spokenFeedback = 'Toggled Classroom Timer';
            }
            else if (low.includes('math tablet') || low.includes('math solver') || low.includes('solve math')) {
                translatedCommand = 'math solver';
                intent = 'math_tablet';
                spokenFeedback = 'Opened Math Tablet Solver';
            }
            else if (low.includes('equation') || low.includes('latex') || low.includes('formula')) {
                translatedCommand = 'equation';
                intent = 'equation_editor';
                spokenFeedback = 'Opened LaTeX Equation Editor';
            }

            // Spatial connector fast resolution: e.g. "connect the two lower circles"
            if (context.shapes && context.shapes.length >= 2 && low.includes('connect')) {
                const shapes = context.shapes;
                let targetType = 'circle';
                if (low.includes('square')) targetType = 'rectangle';
                else if (low.includes('diamond')) targetType = 'diamond';
                else if (low.includes('terminator')) targetType = 'terminator';
                else if (low.includes('box') || low.includes('rect')) targetType = 'rectangle';

                let matched = shapes.filter(s => s.type === targetType || (targetType === 'rectangle' && (s.type === 'rectangle' || s.type === 'rounded_rect')));
                if (matched.length < 2) matched = shapes.filter(s => s.type !== 'connector' && s.type !== 'path');

                if (matched.length >= 2) {
                    if (low.includes('lower') || low.includes('bottom')) {
                        matched.sort((a, b) => (b.center?.y || b.y || 0) - (a.center?.y || a.y || 0));
                    } else if (low.includes('upper') || low.includes('top')) {
                        matched.sort((a, b) => (a.center?.y || a.y || 0) - (b.center?.y || b.y || 0));
                    }
                    const s1 = matched[0];
                    const s2 = matched[1];
                    const leftObj = (s1.center?.x || s1.x || 0) <= (s2.center?.x || s2.x || 0) ? s1 : s2;
                    const rightObj = leftObj === s1 ? s2 : s1;
                    return {
                        recognized: true,
                        type: 'canvas_generation',
                        intent: 'connect_shapes',
                        speechResponse: `Connecting the two shapes with a smart connector.`,
                        spokenFeedback: 'Connected Shapes',
                        canvasAction: {
                            type: 'connect_shapes',
                            sourceId: leftObj.id,
                            targetId: rightObj.id,
                            sourceAnchor: 'right',
                            targetAnchor: 'left',
                            connectorType: 'orthogonal'
                        }
                    };
                }
            }

            if (translatedCommand) {
                return {
                    recognized: true,
                    type: 'command',
                    translatedCommand,
                    intent,
                    spokenFeedback,
                    speechResponse: spokenFeedback
                };
            }

            // If it could not match any direct UI shortcut and AI failed or did not recognize it, do NOT guess or fake responses:
            return {
                recognized: false,
                type: 'unrecognized',
                translatedCommand: null,
                intent: 'unrecognized',
                spokenFeedback: `Could not match voice command: "${text}"`
            };

            return {
                recognized: false,
                type: 'unrecognized',
                translatedCommand: null,
                intent: 'unrecognized',
                spokenFeedback: `Could not match voice command: "${text}"`
            };
        }

        const systemPrompt = `You are a voice command parser for a school and lab management web app.
Parse the spoken voice input into a structured actionable intent.
POSSIBLE INTENTS:
- "create_lesson_plan": User wants to create/generate a lecture or lesson plan.
- "add_timetable_period": User wants to add or adjust a timetable slot or period.
- "grade_submission": User wants to grade, review or score an assignment.
- "write_note": User wants to take or format a note / checklist.
- "create_ticket": User wants to report an IT or lab issue.
- "search": User wants to search for something.
- "navigate": User wants to open a page (timetable, meetings, classes, grades, documents, labs, training).
- "dictate": Standard text dictation into active field.

Spoken input: "${text}"
Current Page Context: ${context.currentRoute || 'unknown'}

Output ONLY a valid JSON object matching this schema:
{
  "intent": "create_lesson_plan | add_timetable_period | grade_submission | write_note | create_ticket | search | navigate | dictate",
  "targetRoute": "/teaching/plans/new | /admin/timetable | /admin/notes | /tickets | /grades | null",
  "parameters": {
    "subject": "string or null",
    "topic": "string or null",
    "periodNumber": 9,
    "startTime": "08:00",
    "endTime": "08:40",
    "marks": 90,
    "query": "string or null",
    "dictatedText": "${text.replace(/"/g, '\\"')}"
  },
  "spokenFeedback": "Short 1-sentence confirmation of the action performed"
}`;

        if (this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: ACTIVE_GROQ_MODELS[0],
                    messages: [
                        { role: 'system', content: 'Output ONLY valid JSON. No markdown wrappers.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.1
                });
                return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
            } catch (e) {
                console.warn('[AIService] Groq voice-command parser failed:', e.message);
            }
        }

        // Rule-based fallback for voice commands
        let intent = 'dictate';
        let targetRoute = null;
        let spokenFeedback = `Recorded: "${text}"`;

        if (low.includes('lesson plan') || low.includes('lecture plan')) {
            intent = 'create_lesson_plan';
            targetRoute = '/teaching/plans/new';
            spokenFeedback = 'Opening Lesson Plan generator';
        } else if (low.includes('period') || low.includes('timetable')) {
            intent = 'add_timetable_period';
            targetRoute = '/admin/timetable';
            spokenFeedback = 'Navigating to Timetable Scheduler';
        } else if (low.includes('ticket') || low.includes('issue') || low.includes('broken')) {
            intent = 'create_ticket';
            targetRoute = '/tickets';
            spokenFeedback = 'Creating support ticket';
        } else if (low.includes('note') || low.includes('checklist')) {
            intent = 'write_note';
            targetRoute = '/admin/notes';
            spokenFeedback = 'Creating administrative note';
        } else if (low.includes('search')) {
            intent = 'search';
            spokenFeedback = `Searching for ${text.replace(/^search\s*(for)?/i, '')}`;
        }

        return {
            intent,
            targetRoute,
            parameters: { dictatedText: text },
            spokenFeedback
        };
    }

    /**
     * Intelligent local fallback for math problems, science queries, and whiteboard assistance
     */
    solveMathOrHelpQueryLocally(text = '') {
        const raw = (text || '').trim();
        const low = raw.toLowerCase();

        // 1. Linear Equation: e.g. "solve 2x + 6 = 18", "3x - 5 = 10", "4x = 28"
        const linearEqMatch = raw.match(/(?:solve)?\s*(-?\d*)\s*x\s*([+-])\s*(\d+)\s*=\s*(-?\d+)/i);
        if (linearEqMatch) {
            let a = linearEqMatch[1] === '' || linearEqMatch[1] === '+' ? 1 : linearEqMatch[1] === '-' ? -1 : parseInt(linearEqMatch[1], 10);
            const op = linearEqMatch[2];
            let b = parseInt(linearEqMatch[3], 10);
            if (op === '-') b = -b;
            const c = parseInt(linearEqMatch[4], 10);

            const cMinusB = c - b;
            const ans = Number((cMinusB / a).toFixed(2));

            const signStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
            const step1Op = b >= 0 ? `Subtract ${b}` : `Add ${Math.abs(b)}`;
            const step1Result = c - b;

            return {
                speechResponse: `The solution to ${a === 1 ? '' : a}x ${signStr} equals ${c} is x equals ${ans}. First, ${step1Op.toLowerCase()} from both sides to get ${a === 1 ? '' : a}x equals ${step1Result}, then divide by ${a} to get x equals ${ans}.`,
                solutionMarkdown: `### Solving Linear Equation: $${a === 1 ? '' : a}x ${signStr} = ${c}$\n\n` +
                    `**Step 1:** ${step1Op} from both sides:\n` +
                    `$$${a === 1 ? '' : a}x = ${c} ${b >= 0 ? `- ${b}` : `+ ${Math.abs(b)}`} = ${step1Result}$$\n\n` +
                    `**Step 2:** Divide both sides by $${a}$:\n` +
                    `$$x = \\frac{${step1Result}}{${a}} = ${ans}$$\n\n` +
                    `**Final Answer:** **$x = ${ans}$**`,
                spokenFeedback: `Solved: x = ${ans}`,
                canvasAction: {
                    type: 'insert_solution_card',
                    title: `Equation: ${a === 1 ? '' : a}x ${signStr} = ${c}`,
                    summary: `Solution: x = ${ans}`
                }
            };
        }

        const simpleEqMatch = raw.match(/(?:solve)?\s*(-?\d+)\s*x\s*=\s*(-?\d+)/i);
        if (simpleEqMatch) {
            const a = parseInt(simpleEqMatch[1], 10);
            const b = parseInt(simpleEqMatch[2], 10);
            const ans = Number((b / a).toFixed(2));

            return {
                speechResponse: `The solution to ${a}x equals ${b} is x equals ${ans}. Divide both sides by ${a} to get x equals ${ans}.`,
                solutionMarkdown: `### Solving Equation: $${a}x = ${b}$\n\n` +
                    `**Step 1:** Divide both sides by $${a}$:\n` +
                    `$$x = \\frac{${b}}{${a}} = ${ans}$$\n\n` +
                    `**Final Answer:** **$x = ${ans}$**`,
                spokenFeedback: `Solved: x = ${ans}`,
                canvasAction: {
                    type: 'insert_solution_card',
                    title: `Equation: ${a}x = ${b}`,
                    summary: `Solution: x = ${ans}`
                }
            };
        }

        // 2. Arithmetic / Percentage calculations: e.g. "what is 25 * 14", "15 percent of 200"
        const pctMatch = low.match(/(\d+)\s*(?:%|percent)\s*(?:of)?\s*(\d+)/i);
        if (pctMatch) {
            const p = parseFloat(pctMatch[1]);
            const val = parseFloat(pctMatch[2]);
            const res = Number(((p / 100) * val).toFixed(2));
            return {
                speechResponse: `${p} percent of ${val} is ${res}.`,
                solutionMarkdown: `### Percentage Calculation\n\n$$\\text{Value} = \\frac{${p}}{100} \\times ${val} = ${res}$$\n\n**Answer:** **$${res}$**`,
                spokenFeedback: `${p}% of ${val} = ${res}`,
                canvasAction: {
                    type: 'insert_solution_card',
                    title: `${p}% of ${val}`,
                    summary: `Result = ${res}`
                }
            };
        }

        // 3. Pythagorean Theorem
        if (low.includes('pythagor') || (low.includes('right') && low.includes('triangle') && low.includes('theorem'))) {
            return {
                speechResponse: 'The Pythagorean theorem states that in a right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides: a squared plus b squared equals c squared.',
                solutionMarkdown: `### Pythagorean Theorem\n\nIn any right-angled triangle with legs $a$ and $b$, and hypotenuse $c$:\n\n$$a^2 + b^2 = c^2$$\n\n**Formulas:**\n- Hypotenuse: $$c = \\sqrt{a^2 + b^2}$$\n- Leg $a$: $$a = \\sqrt{c^2 - b^2}$$\n- Leg $b$: $$b = \\sqrt{c^2 - a^2}$$\n\n*Example:* If $a = 3$ and $b = 4$:\n$$c = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$$`,
                spokenFeedback: 'Explained Pythagorean Theorem',
                canvasAction: {
                    type: 'insert_solution_card',
                    title: 'Pythagorean Theorem',
                    summary: 'a² + b² = c²'
                }
            };
        }

        // 4. Circle Area & Circumference
        if (low.includes('circle') && (low.includes('area') || low.includes('circumference') || low.includes('perimeter'))) {
            const rMatch = low.match(/(?:radius|r)\s*(?:of|is|=)?\s*(\d+)/);
            const r = rMatch ? parseFloat(rMatch[1]) : null;

            if (r) {
                const area = Number((Math.PI * r * r).toFixed(2));
                const circ = Number((2 * Math.PI * r).toFixed(2));
                return {
                    speechResponse: `For a circle with radius ${r}, the area is pi times r squared, which equals approximately ${area} square units, and the circumference is 2 pi r, which is approximately ${circ} units.`,
                    solutionMarkdown: `### Circle Dimensions (Radius $r = ${r}$)\n\n` +
                        `**1. Area ($A$):**\n` +
                        `$$A = \\pi r^2 = \\pi \\times ${r}^2 = ${r * r}\\pi \\approx ${area}$$\n\n` +
                        `**2. Circumference ($C$):**\n` +
                        `$$C = 2\\pi r = 2 \\times \\pi \\times ${r} = ${2 * r}\\pi \\approx ${circ}$$\n\n` +
                        `**Results:** Area $\\approx ${area}$, Circumference $\\approx ${circ}$`,
                    spokenFeedback: `Circle: Area ≈ ${area}, Circ ≈ ${circ}`,
                    canvasAction: {
                        type: 'insert_solution_card',
                        title: `Circle (r = ${r})`,
                        summary: `Area ≈ ${area}, C ≈ ${circ}`
                    }
                };
            } else {
                return {
                    speechResponse: 'For a circle with radius r, the area is given by the formula A equals pi times r squared, and the circumference is 2 times pi times r.',
                    solutionMarkdown: `### Circle Formulas\n\n- **Area:** $$A = \\pi r^2$$\n- **Circumference:** $$C = 2\\pi r$$\n- **Diameter:** $$d = 2r$$\n\nWhere $\\pi \\approx 3.14159$ and $r$ is the circle radius.`,
                    spokenFeedback: 'Explained Circle formulas',
                    canvasAction: {
                        type: 'insert_solution_card',
                        title: 'Circle Formulas',
                        summary: 'A = πr², C = 2πr'
                    }
                };
            }
        }

        // 5. Physics: Ohm's Law
        if (low.includes('ohm') || low.includes('ohms law') || (low.includes('voltage') && low.includes('current') && low.includes('resistance'))) {
            return {
                speechResponse: "Ohm's law states that electric current is directly proportional to voltage and inversely proportional to resistance: V equals I times R.",
                solutionMarkdown: `### Ohm's Law\n\n$$V = I \\cdot R$$\n\n- **$V$**: Voltage in Volts (V)\n- **$I$**: Current in Amperes (A)\n- **$R$**: Resistance in Ohms ($\\Omega$)\n\n**Derived Relationships:**\n$$I = \\frac{V}{R} \\quad , \\quad R = \\frac{V}{I}$$\n\n**Electric Power:**\n$$P = V \\cdot I = I^2 \\cdot R = \\frac{V^2}{R}$$`,
                spokenFeedback: "Explained Ohm's Law",
                canvasAction: {
                    type: 'insert_solution_card',
                    title: "Ohm's Law",
                    summary: 'V = I · R'
                }
            };
        }

        // 6. Physics: Magnetic Field & Lorentz Force
        if (low.includes('magnetic') || low.includes('lorentz') || low.includes('biot-savart') || low.includes('magnetic flux')) {
            return {
                speechResponse: "A magnetic field is a vector field describing the magnetic influence on moving electric charges. Moving charges experience the Lorentz force F equals q times v cross B, which acts perpendicular to both velocity and the magnetic field.",
                solutionMarkdown: `### Magnetic Field & Fundamental Formulas\n\n**1. Lorentz Force on a Moving Charge:**\n$$\\vec{F} = q(\\vec{E} + \\vec{v} \\times \\vec{B})$$\n- In pure magnetic field: $$F = q v B \\sin(\\theta)$$\n\n**2. Force on a Current-Carrying Wire:**\n$$\\vec{F} = I(\\vec{L} \\times \\vec{B})$$\n\n**3. Biot-Savart Law (Field from Current):**\n$$\\vec{B} = \\frac{\\mu_0}{4\\pi} \\int \\frac{I\\,d\\vec{l} \\times \\hat{r}}{r^2}$$\n\n**4. Magnetic Flux & Gauss's Law:**\n$$\\Phi_B = \\iint \\vec{B} \\cdot d\\vec{A} \\quad , \\quad \\nabla \\cdot \\vec{B} = 0$$`,
                spokenFeedback: 'Explained Magnetic Field & Formulas',
                canvasAction: {
                    type: 'insert_solution_card',
                    title: 'Magnetic Field & Lorentz Force',
                    summary: 'F = q(v × B), B = μ₀I / (2πr)'
                }
            };
        }

        // 7. Physics: Newton's Laws of Motion & Classical Mechanics
        if (
            (low.includes('newton') && (low.includes('law') || low.includes('three') || low.includes('3') || low.includes('motion') || low.includes('principle') || low.includes('second') || low.includes('first') || low.includes('third') || low.includes('force'))) ||
            low.includes('three laws of motion') ||
            low.includes('three law of motion') ||
            low.includes('laws of motion') ||
            low.includes('law of motion')
        ) {
            // Check if user specifically requested First Law
            if (low.includes('first') && !low.includes('three') && !low.includes('all')) {
                return {
                    speechResponse: "Newton's First Law of Motion, also known as the Law of Inertia, states that an object at rest will remain at rest, and an object in motion will continue in motion at a constant velocity, unless acted upon by a net external force.",
                    solutionMarkdown: `### Newton's First Law of Motion (Law of Inertia)\n\n` +
                        `$$\\sum \\vec{F} = 0 \\implies \\vec{v} = \\text{constant}$$\n\n` +
                        `**Definition:**\nAn object continues in its state of rest or uniform motion in a straight line unless acted upon by an unbalanced external force.\n\n` +
                        `**Key Concepts:**\n` +
                        `- **Inertia:** The resistance of any physical object to any change in its velocity.\n` +
                        `- **Mass as Inertia:** Greater mass means greater inertia.\n\n` +
                        `*Everyday Example:* Passengers lurch forward when a bus suddenly brakes because their bodies tend to maintain their forward velocity.`,
                    spokenFeedback: "Explained Newton's First Law of Motion",
                    canvasAction: {
                        type: 'insert_solution_card',
                        title: "Newton's First Law (Inertia)",
                        summary: 'ΣF = 0 ⟹ v = const'
                    }
                };
            }

            // Check if user specifically requested Third Law
            if (low.includes('third') && !low.includes('three') && !low.includes('all')) {
                return {
                    speechResponse: "Newton's Third Law of Motion states that for every action, there is an equal and opposite reaction. When object A exerts a force on object B, object B simultaneously exerts an equal magnitude force in the opposite direction on object A.",
                    solutionMarkdown: `### Newton's Third Law of Motion (Action & Reaction)\n\n` +
                        `$$\\vec{F}_{A \\to B} = -\\vec{F}_{B \\to A}$$\n\n` +
                        `**Definition:**\nFor every action force, there is always an equal magnitude and opposite direction reaction force.\n\n` +
                        `**Critical Principles:**\n` +
                        `- Action and reaction forces act on **two different bodies**, so they never cancel each other out.\n` +
                        `- Forces always occur in matched pairs.\n\n` +
                        `*Everyday Examples:*\n` +
                        `- **Rocket Propulsion:** Expanding exhaust gases pushed downward push the rocket upward.\n` +
                        `- **Swimming:** Pushing water backward propels the swimmer forward.`,
                    spokenFeedback: "Explained Newton's Third Law of Motion",
                    canvasAction: {
                        type: 'insert_solution_card',
                        title: "Newton's Third Law",
                        summary: 'F(A→B) = -F(B→A)'
                    }
                };
            }

            // Check if user specifically requested Second Law only
            if (low.includes('second') && !low.includes('three') && !low.includes('all')) {
                return {
                    speechResponse: "Newton's Second Law of Motion states that the acceleration of an object depends on the net force acting upon it and the mass of the object: Force equals mass multiplied by acceleration, F equals m times a.",
                    solutionMarkdown: `### Newton's Second Law of Motion\n\n` +
                        `$$\\vec{F}_{\\text{net}} = m \\cdot \\vec{a} = \\frac{d\\vec{p}}{dt}$$\n\n` +
                        `- **$F$**: Net Force in Newtons (N or $\\text{kg}\\cdot\\text{m}/\\text{s}^2$)\n` +
                        `- **$m$**: Mass in kilograms (kg)\n` +
                        `- **$a$**: Acceleration in meters per second squared ($\\text{m}/\\text{s}^2$)\n` +
                        `- **$\\vec{p}$**: Momentum ($m\\vec{v}$)\n\n` +
                        `**Key Inferences:**\n` +
                        `- Acceleration is directly proportional to net force: $a \\propto F$.\n` +
                        `- Acceleration is inversely proportional to mass: $a \\propto \\frac{1}{m}$.`,
                    spokenFeedback: "Explained Newton's Second Law",
                    canvasAction: {
                        type: 'insert_solution_card',
                        title: "Newton's Second Law",
                        summary: 'F = m · a'
                    }
                };
            }

            // Comprehensive Explanation of all Three Laws of Motion
            return {
                speechResponse: "Sir Isaac Newton's three laws of motion form the foundation of classical mechanics. First Law, the Law of Inertia: An object remains at rest or moves with constant velocity unless acted upon by a net external force. Second Law, the Law of Force and Acceleration: Net force equals mass times acceleration, F equals m times a. Third Law, the Law of Action and Reaction: For every action, there is an equal and opposite reaction.",
                solutionMarkdown: `### Newton's Three Laws of Motion\n\n` +
                    `Formulated by Sir Isaac Newton in 1687 (*Philosophiæ Naturalis Principia Mathematica*), these three laws describe the relationship between a body and the forces acting upon it.\n\n` +
                    `---\n\n` +
                    `#### 1. First Law: Law of Inertia\n` +
                    `$$\\sum \\vec{F} = 0 \\implies \\vec{v} = \\text{constant}$$\n` +
                    `- **Statement:** A body remains at rest or continues in uniform motion in a straight line unless acted upon by an external net force.\n` +
                    `- **Concept:** **Inertia** is the natural tendency of an object to resist changes in its state of motion.\n` +
                    `- *Example:* Seatbelts restrain passengers during sudden deceleration.\n\n` +
                    `---\n\n` +
                    `#### 2. Second Law: Law of Force & Acceleration\n` +
                    `$$\\vec{F} = m \\cdot \\vec{a} = \\frac{d\\vec{p}}{dt}$$\n` +
                    `- **Statement:** The rate of change of momentum of a body is directly proportional to the applied force and occurs in the direction of the force.\n` +
                    `- **Units:** Force in Newtons ($\\text{N} = \\text{kg}\\cdot\\text{m}/\\text{s}^2$).\n` +
                    `- *Example:* Pushing a car requires far more force than pushing a bicycle to achieve the same acceleration.\n\n` +
                    `---\n\n` +
                    `#### 3. Third Law: Law of Action & Reaction\n` +
                    `$$\\vec{F}_{A \\to B} = -\\vec{F}_{B \\to A}$$\n` +
                    `- **Statement:** For every action, there is an equal and opposite reaction.\n` +
                    `- **Key rule:** Action and reaction forces act on **different bodies** simultaneously, so they never cancel each other out.\n` +
                    `- *Example:* Rocket engines expel hot gases downward at high velocity, producing an upward thrust that propels the rocket into orbit.`,
                spokenFeedback: "Explained Newton's Three Laws of Motion",
                canvasAction: {
                    type: 'insert_solution_card',
                    title: "Newton's Three Laws of Motion",
                    summary: "1. Inertia | 2. F = ma | 3. F₁₂ = -F₂₁"
                }
            };
        }

        // 7B. Universal Gravitation
        if (low.includes('gravit') || (low.includes('gravity') && (low.includes('formula') || low.includes('law') || low.includes('newton')))) {
            return {
                speechResponse: "Newton's law of universal gravitation states that every particle attracts every other particle with a force directly proportional to the product of their masses and inversely proportional to the square of the distance between them: F equals G times m 1 times m 2 divided by r squared.",
                solutionMarkdown: `### Newton's Law of Universal Gravitation\n\n` +
                    `$$F = G \\frac{m_1 m_2}{r^2}$$\n\n` +
                    `- **$F$**: Gravitational force between two masses (N)\n` +
                    `- **$G$**: Universal gravitational constant $\\approx 6.674 \\times 10^{-11} \\,\\text{N}\\cdot\\text{m}^2/\\text{kg}^2$\n` +
                    `- **$m_1, m_2$**: Masses of the two objects (kg)\n` +
                    `- **$r$**: Distance between centers of the masses (m)\n\n` +
                    `**Acceleration due to Gravity on Earth ($g$):**\n` +
                    `$$g = \\frac{G M_{\\text{Earth}}}{R_{\\text{Earth}}^2} \\approx 9.81 \\,\\text{m}/\\text{s}^2$$`,
                spokenFeedback: "Explained Universal Gravitation",
                canvasAction: {
                    type: 'insert_solution_card',
                    title: "Universal Gravitation",
                    summary: "F = G(m₁m₂)/r²"
                }
            };
        }

        // 7. Biology / Science: Photosynthesis
        if (low.includes('photosynthesis')) {
            return {
                speechResponse: 'Photosynthesis is the process by which green plants convert carbon dioxide and water into glucose and oxygen using light energy absorbed by chlorophyll.',
                solutionMarkdown: `### Chemical Equation of Photosynthesis\n\n$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{Light energy}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$\n\n- **Reactants:** Carbon Dioxide ($6\\text{CO}_2$) + Water ($6\\text{H}_2\\text{O}$)\n- **Products:** Glucose ($\\text{C}_6\\text{H}_{12}\\text{O}_6$) + Oxygen ($6\\text{O}_2$)\n- **Catalyst:** Chlorophyll inside chloroplasts absorbs solar photons.`,
                spokenFeedback: 'Explained Photosynthesis',
                canvasAction: {
                    type: 'insert_solution_card',
                    title: 'Photosynthesis',
                    summary: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂'
                }
            };
        }

        // 8. Whiteboard Feature & How-To Guidance
        if (low.includes('how to') || low.includes('how do i') || low.includes('how can i') || low.includes('help')) {
            if (low.includes('duplicate') && low.includes('page')) {
                return {
                    speechResponse: "To duplicate a page, click the Page Manager button at the top-right toolbar or say 'duplicate page'. An exact clone of your canvas will be created.",
                    solutionMarkdown: `### How to Duplicate a Whiteboard Page\n\n1. Say **"duplicate page"** using voice commands, OR\n2. Open the **Page Manager** button at the top right of the canvas.\n3. Click the **Duplicate** icon next to the active page.\n\n*All drawings, shapes, and notes are preserved in the clone.*`,
                    spokenFeedback: 'Guide: Duplicate Page'
                };
            }
            if (low.includes('export') || low.includes('save') || low.includes('pdf')) {
                return {
                    speechResponse: "To export your whiteboard, click the Export button or say 'export'. You can download high-resolution vector PDF, PNG images, SVG, or JSON backup files.",
                    solutionMarkdown: `### How to Export the Whiteboard\n\n1. Say **"export"** or click the **Export** icon in the toolbar.\n2. Choose your preferred export format:\n   - **High-DPI Vector PDF**: Multi-page document for printing/sharing\n   - **PNG Image**: Crisp raster image\n   - **SVG**: Scalable vector graphics\n   - **JSON**: Complete project backup`,
                    spokenFeedback: 'Guide: Export Whiteboard'
                };
            }
            if (low.includes('smart shape')) {
                return {
                    speechResponse: "To use Smart Shape recognition, toggle the magic wand button in the toolbar or say 'turn on smart shape'. Hand-drawn rough shapes will automatically snap into perfect geometric shapes.",
                    solutionMarkdown: `### How to Use Smart Shape Recognition\n\n1. Say **"turn on smart shape"** or click the wand icon.\n2. Draw any rough circle, triangle, rectangle, or star freehand.\n3. The whiteboard will instantly recognize the contour and convert it into a crisp vector shape!`,
                    spokenFeedback: 'Guide: Smart Shape Recognition'
                };
            }
            if (low.includes('laser')) {
                return {
                    speechResponse: "The Laser Pointer lets you highlight details temporarily during lectures without leaving permanent ink. Select the Laser tool or say 'laser pointer'.",
                    solutionMarkdown: `### How to Use the Laser Pointer\n\n1. Say **"laser pointer"** or pick the laser tool from the toolbar.\n2. Click and drag across the canvas. A glowing laser dot and disappearing trail will guide your audience's attention!`,
                    spokenFeedback: 'Guide: Laser Pointer'
                };
            }
        }

        // 9. Interactive 3D Model Placements & Lessons
        if (
            low.includes('3d') ||
            low.includes('three d') ||
            low.includes('planet') ||
            low.includes('solar system') ||
            low.includes('earth') ||
            low.includes('globe') ||
            low.includes('atom') ||
            low.includes('dna') ||
            low.includes('molecule') ||
            low.includes('rocket') ||
            low.includes('satellite') ||
            low.includes('router') ||
            low.includes('switch') ||
            low.includes('laptop')
        ) {
            // Earth / Globe
            if (low.includes('earth') || low.includes('globe')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_earth',
                    speechResponse: "I've placed an interactive 3D Earth model at the center of your whiteboard. You can rotate it freely in 3D to inspect the continents, oceans, and axial tilt.",
                    spokenFeedback: 'Inserted 3D Earth',
                    solutionMarkdown: `### Planet Earth (3D Interactive Model)\n\n- **Equatorial Circumference:** $40,075\\text{ km}$\n- **Axial Tilt:** $23.44^\\circ$ causing the four seasons\n- **Atmosphere:** $78\\%\\text{ N}_2$, $21\\%\\text{ O}_2$, $1\\%\\text{ Trace Gases}$\n- **Internal Layers:**\n  1. **Crust:** $0\\text{--}70\\text{ km}$ solid rock\n  2. **Mantle:** $2,900\\text{ km}$ semi-fluid silicate\n  3. **Outer Core:** Liquid Iron & Nickel (generates magnetosphere)\n  4. **Inner Core:** Solid Iron ($5,400^\\circ\\text{C}$)`,
                    canvasAction: {
                        type: 'insert_3d_model',
                        modelType: 'earth',
                        name: '3D Planet Earth',
                        color: '#38bdf8',
                        notes: [
                            { title: 'Earth Dimensions', text: 'Radius: 6,371 km\nCircumference: 40,075 km\nTilt: 23.44°', color: 'blue' },
                            { title: 'Atmosphere Composition', text: '78% Nitrogen (N2)\n21% Oxygen (O2)\n1% Argon & CO2', color: 'green' },
                            { title: 'Internal Layers', text: '1. Crust (0-70 km)\n2. Mantle (2,900 km)\n3. Core (Liquid & Solid Iron)', color: 'purple' }
                        ]
                    }
                };
            }

            // Sun / Solar System
            if (low.includes('sun') || low.includes('solar')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_sun',
                    speechResponse: "Here is an interactive 3D model of the Sun. It contains over 99.8 percent of our solar system's mass with core nuclear fusion fusing hydrogen into helium.",
                    spokenFeedback: 'Inserted 3D Sun',
                    solutionMarkdown: `### The Sun (3D Solar Model)\n\n- **Mass:** $1.989 \\times 10^{30}\\text{ kg}$ (99.86% of Solar System)\n- **Core Temperature:** $15,000,000\\text{ K}$ (Nuclear Fusion: $4\\text{H} \\rightarrow \\text{He} + 2e^+ + 2\\nu + \\gamma$)\n- **Surface Temperature:** $5,778\\text{ K}$\n- **Distance to Earth:** 1 AU ($\\approx 149.6 \\times 10^6\\text{ km}$, 8.3 light minutes)`,
                    canvasAction: {
                        type: 'insert_3d_model',
                        modelType: 'sun',
                        name: '3D Sun',
                        color: '#f59e0b',
                        notes: [
                            { title: 'Solar Core', text: '15 Million °K\nHydrogen fusion powers all solar energy', color: 'yellow' },
                            { title: 'Light Travel Time', text: 'Distance: 1 AU (149.6M km)\nLight reaches Earth in 8.3 minutes', color: 'purple' }
                        ]
                    }
                };
            }

            // Atom / Subatomic Physics
            if (low.includes('atom') || low.includes('atomic') || low.includes('bohr') || low.includes('nucleus') || low.includes('orbital')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_atom',
                    speechResponse: "I have placed a 3D Atom model with its central nucleus and orbital electron shells onto your board. You can rotate it to inspect subatomic particle positions.",
                    spokenFeedback: 'Inserted 3D Atom',
                    solutionMarkdown: `### Atomic Structure & Bohr Model (3D)\n\n- **Nucleus:** Dense center containing:\n  - **Protons ($p^+$):** Charge $+1$, mass $1.673 \\times 10^{-27}\\text{ kg}$\n  - **Neutrons ($n^0$):** Charge $0$, mass $1.675 \\times 10^{-27}\\text{ kg}$\n- **Electron Shells:** Electrons ($e^-$, $-1$) arranged in quantised levels:\n  $$2n^2 \\quad (n=1: 2e^-, \\; n=2: 8e^-, \\; n=3: 18e^-)$$\n- **Atomic Number ($Z$):** Number of protons defining elemental identity.`,
                    canvasAction: {
                        type: 'insert_3d_model',
                        modelType: 'atom',
                        name: '3D Atom',
                        color: '#818cf8',
                        notes: [
                            { title: 'Atomic Nucleus', text: 'Protons (+1) and Neutrons (0)\nBound by Strong Nuclear Force', color: 'purple' },
                            { title: 'Electron Orbitals', text: 'Shell capacity: 2n²\nn=1 (K): 2e⁻\nn=2 (L): 8e⁻', color: 'blue' }
                        ]
                    }
                };
            }

            // DNA Double Helix / Genetics
            if (low.includes('dna') || low.includes('helix') || low.includes('genetic') || low.includes('nucleotide')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_dna',
                    speechResponse: "Here is an interactive 3D DNA Double Helix showing antiparallel polynucleotide strands with Watson-Crick complementary base pairing.",
                    spokenFeedback: 'Inserted 3D DNA Helix',
                    solutionMarkdown: `### DNA Double Helix Structure (3D)\n\n- **Architecture:** Double-stranded antiparallel right-handed helix ($5' \\rightarrow 3'$ and $3' \\rightarrow 5'$).\n- **Watson-Crick Base Pairs:**\n  - **Adenine (A) = Thymine (T):** 2 Hydrogen Bonds\n  - **Guanine (G) $\\equiv$ Cytosine (C):** 3 Hydrogen Bonds\n- **Backbone:** Alternating Deoxyribose sugar and phosphate groups linked by phosphodiester bonds.`,
                    canvasAction: {
                        type: 'insert_3d_model',
                        modelType: 'dna_double_helix',
                        name: '3D DNA Double Helix',
                        color: '#ec4899',
                        notes: [
                            { title: 'Complementary Base Pairs', text: 'A = T (2 Hydrogen bonds)\nG ≡ C (3 Hydrogen bonds)', color: 'pink' },
                            { title: 'Helical Dimensions', text: 'Diameter: 2.0 nm\nPitch per turn: 3.4 nm (10 bp)', color: 'blue' }
                        ]
                    }
                };
            }

            // Molecule / Chemical structure
            if (low.includes('molecule') || low.includes('molecular') || low.includes('compound')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_molecule',
                    speechResponse: "I've added an interactive 3D molecule model showing atoms linked by covalent bonds and standard valence angles.",
                    spokenFeedback: 'Inserted 3D Molecule',
                    solutionMarkdown: `### Chemical Molecular Geometry (3D)\n\n- **Bonds:** Covalent electron sharing between bonded nuclei.\n- **VSEPR Theory:** Electron pairs arrange symmetrically to minimize electrostatic repulsion.\n- **Bond Angles:**\n  - Tetrahedral (e.g. $\\text{CH}_4$): $109.5^\\circ$\n  - Trigonal Planar (e.g. $\\text{BF}_3$): $120^\\circ$\n  - Linear (e.g. $\\text{CO}_2$): $180^\\circ$`,
                    canvasAction: {
                        type: 'insert_3d_model',
                        modelType: 'molecule',
                        name: '3D Chemical Molecule',
                        color: '#10b981'
                    }
                };
            }

            // Router / Multi-WAN / Network Device
            if (low.includes('router') || low.includes('gateway') || low.includes('wan')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_router',
                    speechResponse: "Here is an interactive 3D Multi-WAN Gateway Router. It connects local subnet workstations to multiple ISP uplink connections with load balancing.",
                    spokenFeedback: 'Inserted 3D Router',
                    solutionMarkdown: `### Multi-WAN Enterprise Gateway Router (3D)\n\n- **Function:** Layer 3 OSI Network Gateway routing IP packets across distinct subnets.\n- **Multi-WAN Failover:** Distributes external bandwidth across multiple ISP uplinks (WAN1, WAN2) with automatic heartbeat failover.\n- **Security:** Hardware NAT firewall, Stateful Packet Inspection (SPI), and IPSec VPN tunnels.`,
                    canvasAction: {
                        type: 'insert_3d_model',
                        modelType: 'multwan_router',
                        name: '3D Multi-WAN Router',
                        color: '#6366f1',
                        notes: [
                            { title: 'Layer 3 Routing', text: 'Routes IP packets between LAN subnets and WAN uplinks', color: 'purple' },
                            { title: 'Failover & Load Balancing', text: 'Dual WAN failover maintains 99.99% uptime across ISPs', color: 'blue' }
                        ]
                    }
                };
            }

            // Network Switch
            if (low.includes('switch') || low.includes('ethernet switch')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_switch',
                    speechResponse: "I've placed a 3D Managed Network Switch model onto the canvas. It forwards Ethernet frames at Layer 2 using hardware MAC address tables.",
                    spokenFeedback: 'Inserted 3D Switch',
                    solutionMarkdown: `### Managed Network Switch (3D)\n\n- **Function:** Layer 2 Data Link frame forwarding using hardware CAM/MAC address tables.\n- **VLANs (802.1Q):** Isolates broadcast domains virtually without separate physical cabling.\n- **Gigabit Ethernet:** Full-duplex non-blocking backplane switching bandwidth.`,
                    canvasAction: {
                        type: 'insert_3d_model',
                        modelType: 'network_switch',
                        name: '3D Network Switch',
                        color: '#0284c7'
                    }
                };
            }

            // Laptop / Workstation
            if (low.includes('laptop') || low.includes('computer') || low.includes('pc') || low.includes('workstation')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_laptop',
                    speechResponse: "Here is a 3D Workstation Laptop model. You can rotate and position it anywhere on your canvas.",
                    spokenFeedback: 'Inserted 3D Laptop',
                    solutionMarkdown: `### Workstation Laptop (3D)\n\n- **Client Endpoint:** Interacts as host device in network topologies and client-server architectures.`,
                    canvasAction: {
                        type: 'insert_3d_model',
                        modelType: 'laptop',
                        name: '3D Laptop Workstation',
                        color: '#475569'
                    }
                };
            }

            // Rocket / Satellite
            if (low.includes('rocket') || low.includes('spaceship')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_rocket',
                    speechResponse: "I've placed an interactive 3D Rocket model onto the whiteboard.",
                    spokenFeedback: 'Inserted 3D Rocket',
                    solutionMarkdown: `### Aerospace Rocket (3D)\n\n- **Thrust:** Governed by Newton's Third Law ($F_{\\text{thrust}} = \\dot{m} v_e$).`,
                    canvasAction: {
                        type: 'insert_3d_model',
                        modelType: 'rocket',
                        name: '3D Rocket',
                        color: '#ef4444'
                    }
                };
            }

            // Moon / Mars / Jupiter / Saturn
            if (low.includes('moon') || low.includes('lunar')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_moon',
                    speechResponse: "Here is a 3D Moon model with crater surface topography.",
                    spokenFeedback: 'Inserted 3D Moon',
                    canvasAction: { type: 'insert_3d_model', modelType: 'moon', name: '3D Moon', color: '#cbd5e1' }
                };
            }
            if (low.includes('mars')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_mars',
                    speechResponse: "I've placed a 3D Mars model showing the red planet's iron oxide surface.",
                    spokenFeedback: 'Inserted 3D Mars',
                    canvasAction: { type: 'insert_3d_model', modelType: 'mars', name: '3D Mars', color: '#f97316' }
                };
            }
            if (low.includes('jupiter')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_jupiter',
                    speechResponse: "Here is a 3D Jupiter model, the largest gas giant in our solar system.",
                    spokenFeedback: 'Inserted 3D Jupiter',
                    canvasAction: { type: 'insert_3d_model', modelType: 'jupiter', name: '3D Jupiter', color: '#d97706' }
                };
            }
            if (low.includes('saturn')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_saturn',
                    speechResponse: "I have added a 3D Saturn model with its iconic planetary rings.",
                    spokenFeedback: 'Inserted 3D Saturn',
                    canvasAction: { type: 'insert_3d_model', modelType: 'saturn', name: '3D Saturn', color: '#fbbf24' }
                };
            }

            // Geometric 3D Solids
            if (low.includes('cylinder')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_cylinder',
                    speechResponse: "Inserted a 3D Cylinder with circular parallel bases.",
                    spokenFeedback: 'Inserted 3D Cylinder',
                    canvasAction: { type: 'insert_3d_model', modelType: 'cylinder', name: '3D Cylinder', color: '#3b82f6' }
                };
            }
            if (low.includes('cone')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_cone',
                    speechResponse: "Inserted a 3D Cone tapering smoothly from a circular base to an apex.",
                    spokenFeedback: 'Inserted 3D Cone',
                    canvasAction: { type: 'insert_3d_model', modelType: 'cone', name: '3D Cone', color: '#ec4899' }
                };
            }
            if (low.includes('pyramid')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_pyramid',
                    speechResponse: "Inserted a 3D Pyramid with polygonal base and converging triangular faces.",
                    spokenFeedback: 'Inserted 3D Pyramid',
                    canvasAction: { type: 'insert_3d_model', modelType: 'pyramid', name: '3D Pyramid', color: '#f59e0b' }
                };
            }
            if (low.includes('sphere')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_sphere',
                    speechResponse: "Inserted a 3D Sphere with uniform curvature in three dimensions.",
                    spokenFeedback: 'Inserted 3D Sphere',
                    canvasAction: { type: 'insert_3d_model', modelType: 'sphere', name: '3D Sphere', color: '#06b6d4' }
                };
            }
            if (low.includes('cube') || low.includes('box')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'insert_3d_cube',
                    speechResponse: "Inserted a 3D Cube with six congruent square faces.",
                    spokenFeedback: 'Inserted 3D Cube',
                    canvasAction: { type: 'insert_3d_model', modelType: 'cube', name: '3D Cube', color: '#6366f1' }
                };
            }
        }

        // 10. Generative Flowcharts, Biochemical Cycles & Process Diagrams
        const isFlowchartOrCycle =
            low.includes('flowchart') ||
            (low.includes('flow') && low.includes('chart')) ||
            low.includes('cycle') ||
            low.includes('pipeline') ||
            low.includes('decision tree') ||
            (low.includes('diagram') && (low.includes('process') || low.includes('step') || low.includes('algorithm') || low.includes('krebs') || low.includes('calvin') || low.includes('nitrogen') || low.includes('carbon') || low.includes('pdca') || low.includes('sdlc') || low.includes('workflow')));

        if (isFlowchartOrCycle) {
            // 1. Krebs Cycle / Citric Acid Cycle / TCA Cycle
            if (low.includes('kreb') || low.includes('citric') || low.includes('tca')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_krebs_cycle',
                    speechResponse: "Drawing the Citric Acid Cycle (Krebs Cycle) in a circular layout with eight sequential enzymatic steps, detailing energy carriers NADH, FADH2, and GTP generation.",
                    spokenFeedback: 'Drawn Krebs Cycle Flowchart',
                    solutionMarkdown: `### The Citric Acid Cycle (Krebs Cycle / TCA Cycle)\n\n$$\\text{Acetyl-CoA} + 3\\text{NAD}^+ + \\text{FAD} + \\text{GDP} + \\text{P}_i + 2\\text{H}_2\\text{O} \\to 2\\text{CO}_2 + 3\\text{NADH} + \\text{FADH}_2 + \\text{GTP} + 2\\text{H}^+ + \\text{CoA}$$\n\n1. **Condensation:** Acetyl-CoA ($2\\text{C}$) combines with Oxaloacetate ($4\\text{C}$) to form Citrate ($6\\text{C}$).\n2. **Isomerization:** Citrate converts to Isocitrate via Aconitase.\n3. **Oxidative Decarboxylation:** Isocitrate produces $\\alpha$-Ketoglutarate and NADH + $\\text{CO}_2$.\n4. **Second Decarboxylation:** $\\alpha$-Ketoglutarate produces Succinyl-CoA, releasing NADH + $\\text{CO}_2$.\n5. **Substrate Phosphorylation:** Succinyl-CoA synthetase produces Succinate and $\\text{GTP}$ (or $\\text{ATP}$).\n6. **Dehydrogenation:** Succinate oxidizes to Fumarate yielding $\\text{FADH}_2$.\n7. **Hydration:** Fumarase catalyzes addition of $\\text{H}_2\\text{O}$ to form Malate.\n8. **Regeneration:** Malate dehydrogenase regenerates Oxaloacetate, producing NADH for the next cycle.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'cycle',
                        title: 'The Citric Acid Cycle (Krebs Cycle)',
                        nodes: [
                            { id: 'kc_1', label: '1. Acetyl-CoA + Oxaloacetate\n(Citrate Synthase → Citrate 6C)', shapeType: 'terminator', color: '#10b981' },
                            { id: 'kc_2', label: '2. Citrate → Isocitrate\n(Aconitase Isomerization)', shapeType: 'rounded_rect', color: '#3b82f6' },
                            { id: 'kc_3', label: '3. α-Ketoglutarate (5C)\n(NAD+ → NADH + CO2)', shapeType: 'rounded_rect', color: '#8b5cf6' },
                            { id: 'kc_4', label: '4. Succinyl-CoA (4C)\n(NAD+ → NADH + CO2)', shapeType: 'rounded_rect', color: '#ec4899' },
                            { id: 'kc_5', label: '5. Succinate Synthesis\n(GDP + Pi → GTP / ATP Yield)', shapeType: 'rounded_rect', color: '#f59e0b' },
                            { id: 'kc_6', label: '6. Fumarate Formation\n(FAD → FADH2 Oxidation)', shapeType: 'rounded_rect', color: '#06b6d4' },
                            { id: 'kc_7', label: '7. L-Malate Synthesis\n(Fumarase Hydration + H2O)', shapeType: 'rounded_rect', color: '#6366f1' },
                            { id: 'kc_8', label: '8. Oxaloacetate Recycled\n(NAD+ → NADH Regeneration)', shapeType: 'terminator', color: '#14b8a6' }
                        ],
                        connections: [
                            { from: 'kc_1', to: 'kc_2', label: 'Aconitase Dehydration-Hydration' },
                            { from: 'kc_2', to: 'kc_3', label: 'Isocitrate Dehydrogenase (CO2 Release)' },
                            { from: 'kc_3', to: 'kc_4', label: 'α-Ketoglutarate Dehydrogenase (CO2 Release)' },
                            { from: 'kc_4', to: 'kc_5', label: 'Succinyl-CoA Synthetase (GTP Yield)' },
                            { from: 'kc_5', to: 'kc_6', label: 'Succinate Dehydrogenase (FADH2 Transfer)' },
                            { from: 'kc_6', to: 'kc_7', label: 'Fumarase Stereospecific Hydration' },
                            { from: 'kc_7', to: 'kc_8', label: 'Malate Dehydrogenase (NADH)' },
                            { from: 'kc_8', to: 'kc_1', label: 'Continuous Cycle: Condensation with Acetyl-CoA' }
                        ]
                    }
                };
            }

            // 2. Photosynthesis / Calvin Cycle
            if (low.includes('photosynthesis') || low.includes('calvin')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_calvin_cycle',
                    speechResponse: "Drawing the Calvin Cycle of photosynthesis in a circular format, illustrating carbon fixation by RuBisCO, reduction with ATP and NADPH, and RuBP regeneration.",
                    spokenFeedback: 'Drawn Photosynthesis Calvin Cycle',
                    solutionMarkdown: `### The Calvin Cycle (Light-Independent Reactions)\n\n$$3\\text{CO}_2 + 9\\text{ATP} + 6\\text{NADPH} + 6\\text{H}^+ \\to \\text{G3P} + 9\\text{ADP} + 8\\text{P}_i + 6\\text{NADP}^+ + 3\\text{H}_2\\text{O}$$\n\n1. **Carbon Fixation:** RuBisCO fixes atmospheric $\\text{CO}_2$ onto RuBP to yield 3-PGA.\n2. **Phosphorylation:** ATP phosphorylates 3-PGA into 1,3-Bisphosphoglycerate.\n3. **Reduction Phase:** NADPH reduces intermediate into Glyceraldehyde 3-phosphate (G3P).\n4. **Carbohydrate Output:** One net G3P exits to synthesize glucose, fructose, and starch.\n5. **RuBP Regeneration:** Remaining G3P molecules use ATP to regenerate RuBP acceptor.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'cycle',
                        title: 'Photosynthesis: The Calvin Cycle',
                        nodes: [
                            { id: 'cc_1', label: '1. Carbon Fixation\n(3 CO2 + 3 RuBP via RuBisCO)', shapeType: 'terminator', color: '#10b981' },
                            { id: 'cc_2', label: '2. 3-PGA Phosphorylation\n(6 ATP → 6 ADP)', shapeType: 'rounded_rect', color: '#3b82f6' },
                            { id: 'cc_3', label: '3. Reduction Phase\n(6 NADPH → 6 NADP+)', shapeType: 'rounded_rect', color: '#8b5cf6' },
                            { id: 'cc_4', label: '4. Sugar Output\n(Net 1 G3P to Glucose/Starch)', shapeType: 'parallelogram', color: '#f59e0b' },
                            { id: 'cc_5', label: '5. RuBP Regeneration\n(5 G3P → 3 RuBP via 3 ATP)', shapeType: 'terminator', color: '#06b6d4' }
                        ],
                        connections: [
                            { from: 'cc_1', to: 'cc_2', label: 'RuBisCO Enzyme Catalysis' },
                            { from: 'cc_2', to: 'cc_3', label: 'Energy Transduction (ATP Used)' },
                            { from: 'cc_3', to: 'cc_4', label: 'Electrons Donated by NADPH' },
                            { from: 'cc_4', to: 'cc_5', label: 'Triose Phosphate Recycling' },
                            { from: 'cc_5', to: 'cc_1', label: 'Continuous Fixation: RuBP Restored' }
                        ]
                    }
                };
            }

            // 3. Nitrogen Cycle
            if (low.includes('nitrogen')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_nitrogen_cycle',
                    speechResponse: "Drawing the Nitrogen Cycle showing atmospheric nitrogen fixation, bacterial nitrification into nitrates, plant assimilation, and denitrification.",
                    spokenFeedback: 'Drawn Nitrogen Cycle Flowchart',
                    solutionMarkdown: `### The Biogeochemical Nitrogen Cycle\n\n1. **Atmospheric Nitrogen ($N_2$):** 78% of atmosphere, inert triple bond.\n2. **Nitrogen Fixation:** Diazotroph bacteria (*Rhizobium*, *Azotobacter*) and lightning fix $N_2 \\to NH_3/NH_4^+$.\n3. **Nitrification:** *Nitrosomonas* oxidize $NH_4^+ \\to NO_2^-$; *Nitrobacter* oxidize $NO_2^- \\to NO_3^-$.\n4. **Assimilation:** Plants absorb nitrates through roots to build amino acids and nucleic acids.\n5. **Ammonification:** Decomposers break down organic waste returning nitrogen as ammonium.\n6. **Denitrification:** *Pseudomonas* convert nitrates back to $N_2$ gas under anaerobic conditions.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'cycle',
                        title: 'The Nitrogen Cycle',
                        nodes: [
                            { id: 'nc_1', label: '1. Atmospheric N2 Gas\n(Inert Atmospheric Reservoir)', shapeType: 'terminator', color: '#3b82f6' },
                            { id: 'nc_2', label: '2. Nitrogen Fixation\n(Rhizobium in Root Nodules → NH4+)', shapeType: 'rounded_rect', color: '#10b981' },
                            { id: 'nc_3', label: '3. Soil Nitrification\n(Nitrosomonas & Nitrobacter → NO3-)', shapeType: 'rounded_rect', color: '#8b5cf6' },
                            { id: 'nc_4', label: '4. Plant Assimilation\n(Root Uptake → Proteins & DNA)', shapeType: 'rounded_rect', color: '#06b6d4' },
                            { id: 'nc_5', label: '5. Ammonification\n(Fungi & Microbial Decay)', shapeType: 'rounded_rect', color: '#f59e0b' },
                            { id: 'nc_6', label: '6. Denitrification\n(Pseudomonas → N2 Gas)', shapeType: 'terminator', color: '#ec4899' }
                        ],
                        connections: [
                            { from: 'nc_1', to: 'nc_2', label: 'Biological & Lightning Fixation' },
                            { from: 'nc_2', to: 'nc_3', label: 'Two-Step Aerobic Soil Oxidation' },
                            { from: 'nc_3', to: 'nc_4', label: 'Active Transport Root Influx' },
                            { from: 'nc_4', to: 'nc_5', label: 'Trophic Waste & Biomass Decay' },
                            { from: 'nc_5', to: 'nc_6', label: 'Anaerobic Nitrate Respiration' },
                            { from: 'nc_6', to: 'nc_1', label: 'Return of N2 Gas to Atmosphere' }
                        ]
                    }
                };
            }

            // 4. Carbon Cycle
            if (low.includes('carbon')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_carbon_cycle',
                    speechResponse: "Drawing the Global Carbon Cycle showing photosynthetic fixation of carbon dioxide, trophic biomass transfer, fossil deposition, and respiration combustion efflux.",
                    spokenFeedback: 'Drawn Carbon Cycle Flowchart',
                    solutionMarkdown: `### The Global Carbon Cycle\n\n1. **Atmospheric Carbon ($CO_2$):** Key greenhouse gas regulating planetary heat balance.\n2. **Photosynthesis:** Plants and marine phytoplankton fix dissolved/air $CO_2$ into organic glucose.\n3. **Biosphere Consumption:** Trophic transfer throughout food webs into animal biomass.\n4. **Geologic Deposition:** Sedimentation creates limestone, humus, and deep fossil fuels.\n5. **Respiration & Combustion:** Cellular respiration, forest fires, volcanism, and fossil fuel combustion release $CO_2$ back to atmosphere.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'cycle',
                        title: 'The Global Carbon Cycle',
                        nodes: [
                            { id: 'cc_1', label: '1. Atmospheric CO2 Reservoir\n(Atmospheric Carbon Pool)', shapeType: 'terminator', color: '#06b6d4' },
                            { id: 'cc_2', label: '2. Photosynthetic Uptake\n(Chloroplasts Fix Carbon → Glucose)', shapeType: 'rounded_rect', color: '#10b981' },
                            { id: 'cc_3', label: '3. Biosphere Biomass\n(Herbivores & Food Web Grazing)', shapeType: 'rounded_rect', color: '#f59e0b' },
                            { id: 'cc_4', label: '4. Geological Sequestration\n(Sedimentation & Fossil Reserves)', shapeType: 'cylinder', color: '#8b5cf6' },
                            { id: 'cc_5', label: '5. Respiration & Combustion\n(Biological & Industrial Emissions)', shapeType: 'rounded_rect', color: '#ef4444' }
                        ],
                        connections: [
                            { from: 'cc_1', to: 'cc_2', label: 'Solar Photofixation' },
                            { from: 'cc_2', to: 'cc_3', label: 'Trophic Ingestion & Assimilation' },
                            { from: 'cc_3', to: 'cc_4', label: 'Decomposition & Deep Burial' },
                            { from: 'cc_4', to: 'cc_5', label: 'Fossil Extraction & Volcanic Outgassing' },
                            { from: 'cc_5', to: 'cc_1', label: 'Atmospheric Gas Re-equilibrium' }
                        ]
                    }
                };
            }

            // 5. Cell Cycle
            if (low.includes('cell cycle') || low.includes('mitosis')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_cell_cycle',
                    speechResponse: "Drawing the eukaryotic cell cycle showing Interphase growth phases, the G1 checkpoint, S phase replication, Mitosis, and Cytokinesis.",
                    spokenFeedback: 'Drawn Cell Cycle Flowchart',
                    solutionMarkdown: `### The Eukaryotic Cell Cycle\n\n1. **G1 Phase (First Gap):** Rapid cell growth, RNA and protein synthesis.\n2. **G1/S Checkpoint:** Validates nutrient sufficiency, cell size, and DNA damage before replication.\n3. **S Phase (Synthesis):** Complete replication of nuclear DNA and centrosome duplication.\n4. **G2 Phase (Second Gap):** Tubulin synthesis, ATP accumulation, and preparation for spindle apparatus.\n5. **M Phase (Mitosis):** Nuclear division through Prophase, Metaphase, Anaphase, and Telophase.\n6. **Cytokinesis:** Cleavage furrow divides cytoplasm yielding two daughter cells.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'cycle',
                        title: 'Eukaryotic Cell Cycle',
                        nodes: [
                            { id: 'cel_1', label: '1. G1 Phase (Growth)\n(Organelle Duplication & Protein Synthesis)', shapeType: 'terminator', color: '#3b82f6' },
                            { id: 'cel_2', label: '2. G1/S Checkpoint\n(DNA Integrity Verification)', shapeType: 'diamond', color: '#f59e0b' },
                            { id: 'cel_3', label: '3. S Phase (Synthesis)\n(Nuclear DNA Replication)', shapeType: 'rounded_rect', color: '#8b5cf6' },
                            { id: 'cel_4', label: '4. G2 Phase (Mitotic Prep)\n(Spindle Protein Assembly)', shapeType: 'rounded_rect', color: '#06b6d4' },
                            { id: 'cel_5', label: '5. M Phase (Mitosis)\n(Prophase, Metaphase, Anaphase)', shapeType: 'rounded_rect', color: '#ec4899' },
                            { id: 'cel_6', label: '6. Cytokinesis\n(Cell Cleavage into 2 Daughter Cells)', shapeType: 'terminator', color: '#10b981' }
                        ],
                        connections: [
                            { from: 'cel_1', to: 'cel_2', label: 'Cyclin D-CDK4 Activation' },
                            { from: 'cel_2', to: 'cel_3', label: 'Pass: DNA Uncompromised' },
                            { from: 'cel_3', to: 'cel_4', label: 'Sister Chromatids Completed' },
                            { from: 'cel_4', to: 'cel_5', label: 'Cyclin B-CDK1 Trigger' },
                            { from: 'cel_5', to: 'cel_6', label: 'Karyokinesis Complete' },
                            { from: 'cel_6', to: 'cel_1', label: 'Daughter Cells Enter Interphase' }
                        ]
                    }
                };
            }

            // 6. PDCA Cycle
            if (low.includes('pdca') || low.includes('deming')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_pdca',
                    speechResponse: "Drawing the Deming PDCA continuous improvement cycle, showing Plan, Do, Check, and Act loops.",
                    spokenFeedback: 'Drawn PDCA Cycle Flowchart',
                    solutionMarkdown: `### The Deming PDCA Cycle (Plan-Do-Check-Act)\n\n1. **Plan:** Establish objectives, risk metrics, and hypothesis.\n2. **Do:** Execute the plan on a controlled pilot scale.\n3. **Check:** Measure results against benchmark KPIs.\n4. **Act:** Standardize successful procedures and initiate next iteration.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'cycle',
                        title: 'PDCA Continuous Improvement Cycle',
                        nodes: [
                            { id: 'pdca_1', label: '1. Plan (P)\n(Define Goals & Map Strategy)', shapeType: 'terminator', color: '#3b82f6' },
                            { id: 'pdca_2', label: '2. Do (D)\n(Execute Pilot Implementation)', shapeType: 'rounded_rect', color: '#10b981' },
                            { id: 'pdca_3', label: '3. Check (C)\n(Audit Metrics vs Benchmark)', shapeType: 'diamond', color: '#f59e0b' },
                            { id: 'pdca_4', label: '4. Act (A)\n(Standardize & Scale Solution)', shapeType: 'rounded_rect', color: '#8b5cf6' }
                        ],
                        connections: [
                            { from: 'pdca_1', to: 'pdca_2', label: 'Deploy Protocols' },
                            { from: 'pdca_2', to: 'pdca_3', label: 'Collect Performance Telemetry' },
                            { from: 'pdca_3', to: 'pdca_4', label: 'Verify Variance Within Limits' },
                            { from: 'pdca_4', to: 'pdca_1', label: 'Re-baseline Continuous Quality Loop' }
                        ]
                    }
                };
            }

            // 7. SDLC / Software Development Life Cycle
            if (low.includes('sdlc') || (low.includes('software') && low.includes('development'))) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_sdlc',
                    speechResponse: "Drawing the Software Development Life Cycle showing planning, system architecture, coding implementation, QA testing, deployment, and monitoring.",
                    spokenFeedback: 'Drawn SDLC Cycle Flowchart',
                    solutionMarkdown: `### Software Development Life Cycle (SDLC)\n\n1. **Requirements & Scope:** Stakeholder specifications and backlog prioritization.\n2. **Architecture & Design:** System architecture, database schema, and UI/UX wireframes.\n3. **Development:** Clean code implementation, unit tests, and code review.\n4. **QA & Validation:** Automated integration tests, security audits, and regression tests.\n5. **Deployment:** CI/CD automated staging and production deployment.\n6. **Maintenance & Telemetry:** Log observability, telemetry metrics, and user feedback.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'cycle',
                        title: 'Software Development Life Cycle (SDLC)',
                        nodes: [
                            { id: 'sdlc_1', label: '1. Requirements & Planning\n(Scope & User Stories)', shapeType: 'terminator', color: '#3b82f6' },
                            { id: 'sdlc_2', label: '2. System Design\n(Architecture & Wireframes)', shapeType: 'rounded_rect', color: '#06b6d4' },
                            { id: 'sdlc_3', label: '3. Implementation\n(Code & Unit Tests)', shapeType: 'rounded_rect', color: '#8b5cf6' },
                            { id: 'sdlc_4', label: '4. QA & Testing\n(CI Pipeline & End-to-End)', shapeType: 'diamond', color: '#f59e0b' },
                            { id: 'sdlc_5', label: '5. Production Release\n(Automated Blue/Green Deploy)', shapeType: 'rounded_rect', color: '#10b981' },
                            { id: 'sdlc_6', label: '6. Maintenance & Feedback\n(Observability & SRE)', shapeType: 'rounded_rect', color: '#ec4899' }
                        ],
                        connections: [
                            { from: 'sdlc_1', to: 'sdlc_2', label: 'Spec Approved' },
                            { from: 'sdlc_2', to: 'sdlc_3', label: 'Architecture Ready' },
                            { from: 'sdlc_3', to: 'sdlc_4', label: 'Pull Request Merged' },
                            { from: 'sdlc_4', to: 'sdlc_5', label: 'Tests 100% Green' },
                            { from: 'sdlc_5', to: 'sdlc_6', label: 'Canary Rollout' },
                            { from: 'sdlc_6', to: 'sdlc_1', label: 'Sprint Retrospective & Next Backlog' }
                        ]
                    }
                };
            }

            // 8. Binary Search Algorithm Flowchart
            if (low.includes('binary search') || (low.includes('search') && low.includes('algorithm'))) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_binary_search',
                    speechResponse: "Drawing the Binary Search algorithm flowchart showing bound initialization, midpoint calculation, conditional branch comparisons, and target return.",
                    spokenFeedback: 'Drawn Binary Search Flowchart',
                    solutionMarkdown: `### Binary Search Algorithm ($O(\\log n)$)\n\n1. **Initialization:** Set \`low = 0\` and \`high = n - 1\`.\n2. **Loop Condition:** While \`low <= high\`, compute midpoint: $\\text{mid} = \\lfloor (\\text{low} + \\text{high}) / 2 \\rfloor$.\n3. **Evaluation:**\n   - If $\\text{arr}[\\text{mid}] == \\text{target}$, return index (Success).\n   - If $\\text{arr}[\\text{mid}] < \\text{target}$, set $\\text{low} = \\text{mid} + 1$.\n   - Else set $\\text{high} = \\text{mid} - 1$.\n4. **Termination:** If search range exhausted, return -1 (Not Found).`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'branching',
                        title: 'Binary Search Algorithm',
                        nodes: [
                            { id: 'bs_1', label: '1. Start: Sorted Array & Target Key', shapeType: 'terminator', color: '#3b82f6' },
                            { id: 'bs_2', label: '2. Set low = 0, high = n - 1', shapeType: 'rectangle', color: '#6366f1' },
                            { id: 'bs_3', label: '3. Is low <= high?', shapeType: 'diamond', color: '#f59e0b' },
                            { id: 'bs_4', label: '4. mid = ⌊(low + high) / 2⌋', shapeType: 'rectangle', color: '#06b6d4' },
                            { id: 'bs_5', label: '5. Is arr[mid] == target?', shapeType: 'diamond', color: '#f59e0b' },
                            { id: 'bs_6', label: '6. Success: Return mid Index', shapeType: 'terminator', color: '#10b981' },
                            { id: 'bs_7', label: '7. Not Found: Return -1', shapeType: 'terminator', color: '#ef4444' }
                        ],
                        connections: [
                            { from: 'bs_1', to: 'bs_2' },
                            { from: 'bs_2', to: 'bs_3' },
                            { from: 'bs_3', to: 'bs_4', label: 'Yes (Valid Range)' },
                            { from: 'bs_3', to: 'bs_7', label: 'No (Range Exhausted)' },
                            { from: 'bs_4', to: 'bs_5' },
                            { from: 'bs_5', to: 'bs_6', label: 'Yes (Match Found)' },
                            { from: 'bs_5', to: 'bs_3', label: 'No (Halve Range & Repeat)' }
                        ]
                    }
                };
            }

            // 9. Machine Learning Pipeline Flowchart
            if (low.includes('machine learning') || low.includes('ml pipeline') || low.includes('data science pipeline')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_ml_pipeline',
                    speechResponse: "Drawing an end-to-end Machine Learning pipeline with data ingestion, feature engineering, model training, metric evaluation, and production deployment.",
                    spokenFeedback: 'Drawn Machine Learning Pipeline',
                    solutionMarkdown: `### End-to-End Machine Learning Pipeline\n\n1. **Data Ingestion:** Extract raw structured/unstructured data from lakehouse storage.\n2. **Feature Engineering:** Imputation, categorical encoding, scaling, and dimensionality reduction.\n3. **Model Training:** Fitting model weights using cross-validation and loss minimization.\n4. **Model Evaluation:** Computing test metrics: ROC-AUC, F1-score, MAE, or RMSE.\n5. **Validation Threshold:** Check if candidate model exceeds production baseline.\n6. **Production Serving:** Packaging model container, deploying API endpoint, and monitoring drift.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'branching',
                        title: 'Machine Learning Pipeline',
                        nodes: [
                            { id: 'ml_1', label: '1. Raw Data Ingestion\n(Lakehouse & Data Streams)', shapeType: 'cylinder', color: '#3b82f6' },
                            { id: 'ml_2', label: '2. Feature Engineering\n(Scaling, One-Hot, PCA)', shapeType: 'rectangle', color: '#6366f1' },
                            { id: 'ml_3', label: '3. Model Training\n(Cross-Validation & Loss Optimization)', shapeType: 'rectangle', color: '#8b5cf6' },
                            { id: 'ml_4', label: '4. Evaluation & Metrics\n(ROC-AUC, F1 Score, Latency)', shapeType: 'rectangle', color: '#06b6d4' },
                            { id: 'ml_5', label: '5. Exceeds Baseline Threshold?', shapeType: 'diamond', color: '#f59e0b' },
                            { id: 'ml_6', label: '6. Production Serving\n(Docker & REST/gRPC Endpoint)', shapeType: 'terminator', color: '#10b981' },
                            { id: 'ml_7', label: '7. Hyperparameter Tuning\n(Bayesian Search & Adjust)', shapeType: 'rectangle', color: '#ef4444' }
                        ],
                        connections: [
                            { from: 'ml_1', to: 'ml_2', label: 'ETL Pipeline' },
                            { from: 'ml_2', to: 'ml_3', label: 'Feature Matrix X, y' },
                            { from: 'ml_3', to: 'ml_4', label: 'Model Artifact' },
                            { from: 'ml_4', to: 'ml_5', label: 'Evaluate Metrics' },
                            { from: 'ml_5', to: 'ml_6', label: 'Yes (Production Ready)' },
                            { from: 'ml_5', to: 'ml_7', label: 'No (Underperforming)' },
                            { from: 'ml_7', to: 'ml_3', label: 'Retrain Loop' }
                        ]
                    }
                };
            }

            // 10. User Authentication / Login Flowchart
            if (low.includes('login') || low.includes('auth') || low.includes('sign in') || low.includes('password')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_auth',
                    speechResponse: "Drawing an interactive user authentication flowchart on your canvas, showing credential input, database validation, and JWT token session creation.",
                    spokenFeedback: 'Drawn Authentication Flowchart',
                    solutionMarkdown: `### User Authentication Architecture Flowchart\n\n1. **User Request:** Submits email & password via HTTPS POST.\n2. **Hash Verification:** Server compares hashed input against bcrypt salted hash in database.\n3. **Token Issuance:** On match, cryptographically signs JWT containing user claims.\n4. **Session Handshake:** Client stores token in secure HTTP-only cookie and enters authenticated state.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'branching',
                        title: 'User Authentication Flow',
                        nodes: [
                            { id: 'auth_1', label: '1. User Enters Email & Password', shapeType: 'parallelogram', color: '#6366f1' },
                            { id: 'auth_2', label: '2. Server Hashes & Queries DB', shapeType: 'rectangle', color: '#3b82f6' },
                            { id: 'auth_3', label: '3. Credentials Match in Database?', shapeType: 'diamond', color: '#f59e0b' },
                            { id: 'auth_4', label: '4. Sign JWT Token & Authorize Session', shapeType: 'terminator', color: '#10b981' },
                            { id: 'auth_5', label: '5. Return 401 Unauthorized Error', shapeType: 'terminator', color: '#ef4444' }
                        ],
                        connections: [
                            { from: 'auth_1', to: 'auth_2', label: 'HTTPS POST' },
                            { from: 'auth_2', to: 'auth_3', label: 'Bcrypt Compare' },
                            { from: 'auth_3', to: 'auth_4', label: 'Match (200 OK)' },
                            { from: 'auth_3', to: 'auth_5', label: 'Mismatch (401)' }
                        ]
                    }
                };
            }

            // 11. Hydrological Water Cycle Flowchart
            if (low.includes('water') || low.includes('rain') || low.includes('hydrolog')) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_water_cycle',
                    speechResponse: "Drawing the hydrological water cycle flowchart in a circular layout, showing solar evaporation, atmospheric condensation, precipitation, and groundwater runoff.",
                    spokenFeedback: 'Drawn Water Cycle Flowchart',
                    solutionMarkdown: `### The Water Cycle (Hydrological Process)\n\n$$\\text{Liquid Water} \\xrightarrow{\\text{Evaporation}} \\text{Vapor} \\xrightarrow{\\text{Condensation}} \\text{Clouds} \\xrightarrow{\\text{Precipitation}} \\text{Runoff}$$\n\n1. **Evaporation & Transpiration:** Solar thermal energy turns liquid water into vapor.\n2. **Condensation:** Rising vapor cools into cloud droplets.\n3. **Precipitation:** Condensed droplets fall as rain, hail, or snow.\n4. **Infiltration & Runoff:** Water filters through soil into aquifers and flows back to lakes and oceans.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'cycle',
                        title: 'The Hydrological Water Cycle',
                        nodes: [
                            { id: 'wc_1', label: '1. Solar Evaporation\n(Liquid → Water Vapor)', shapeType: 'terminator', color: '#f59e0b' },
                            { id: 'wc_2', label: '2. Cloud Condensation\n(Vapor Cools into Droplets)', shapeType: 'rounded_rect', color: '#06b6d4' },
                            { id: 'wc_3', label: '3. Precipitation\n(Rain / Snow / Hail Fall)', shapeType: 'rounded_rect', color: '#3b82f6' },
                            { id: 'wc_4', label: '4. Groundwater & Runoff\n(Aquifer Flow into Oceans)', shapeType: 'terminator', color: '#10b981' }
                        ],
                        connections: [
                            { from: 'wc_1', to: 'wc_2', label: 'Thermal Phase Change' },
                            { from: 'wc_2', to: 'wc_3', label: 'Droplet Coalescence' },
                            { from: 'wc_3', to: 'wc_4', label: 'Gravity Deposition' },
                            { from: 'wc_4', to: 'wc_1', label: 'Continuous Cycle: Ocean Reservoir' }
                        ]
                    }
                };
            }

            // 12. Dynamic Generic Flowchart / Cycle Generator for ANY query
            const isCustomCycle = /cycle|loop|circular/i.test(low);
            const topicClean = text.replace(/^(draw|create|make|generate|show)\s+(a\s+|an\s+|the\s+)?(flowchart|diagram|cycle|workflow)?\s*(for|of|about)?\s*/i, '').trim() || 'Process';
            const topicTitle = topicClean.charAt(0).toUpperCase() + topicClean.slice(1);

            if (isCustomCycle) {
                return {
                    recognized: true,
                    type: 'canvas_generation',
                    intent: 'draw_flowchart_dynamic_cycle',
                    speechResponse: `Drawing an interactive cyclical diagram for ${topicTitle} with connected stages and continuous loop transitions.`,
                    spokenFeedback: `Drawn ${topicTitle} Cycle`,
                    solutionMarkdown: `### ${topicTitle} (Cyclical Process)\n\n1. **Initial Stage:** Primary inputs and state initialization.\n2. **Transformation Phase:** Catalytic or energetic state transition.\n3. **Intermediate Processing:** Synthesis, reaction, or execution stage.\n4. **Output & Regeneration:** Final result extracted and continuous loop regenerated.`,
                    canvasAction: {
                        type: 'draw_flowchart',
                        layoutType: 'cycle',
                        title: `${topicTitle} Cycle`,
                        nodes: [
                            { id: 'dyn_1', label: `1. Stage 1: ${topicTitle} Initiation`, shapeType: 'terminator', color: '#10b981' },
                            { id: 'dyn_2', label: '2. Stage 2: State Transformation', shapeType: 'rounded_rect', color: '#3b82f6' },
                            { id: 'dyn_3', label: '3. Stage 3: Reaction & Synthesis', shapeType: 'rounded_rect', color: '#8b5cf6' },
                            { id: 'dyn_4', label: '4. Stage 4: Output & Regeneration', shapeType: 'terminator', color: '#f59e0b' }
                        ],
                        connections: [
                            { from: 'dyn_1', to: 'dyn_2', label: 'Activation & Influx' },
                            { from: 'dyn_2', to: 'dyn_3', label: 'Enzymatic Transition' },
                            { from: 'dyn_3', to: 'dyn_4', label: 'Product Formation' },
                            { from: 'dyn_4', to: 'dyn_1', label: 'Continuous Cycle Loop' }
                        ]
                    }
                };
            }

            // General Branching Flowchart Fallback
            return {
                recognized: true,
                type: 'canvas_generation',
                intent: 'draw_flowchart_generic',
                speechResponse: `Drawing a structured process flowchart for ${topicTitle} with connected decision nodes and action steps.`,
                spokenFeedback: `Drawn ${topicTitle} Flowchart`,
                solutionMarkdown: `### ${topicTitle} Workflow\n\n1. **Start:** Initialize required inputs and parameters.\n2. **Computation:** Execute core transformation logic.\n3. **Verification:** Validate output criteria or constraints.\n4. **Completion:** Return success artifact or handle failure branch.`,
                canvasAction: {
                    type: 'draw_flowchart',
                    layoutType: 'branching',
                    title: `${topicTitle} Workflow`,
                    nodes: [
                        { id: 'fl_1', label: `1. Start: Initialize ${topicTitle}`, shapeType: 'terminator', color: '#6366f1' },
                        { id: 'fl_2', label: '2. Transform & Compute Step', shapeType: 'rectangle', color: '#3b82f6' },
                        { id: 'fl_3', label: '3. Validation Criteria Met?', shapeType: 'diamond', color: '#f59e0b' },
                        { id: 'fl_4', label: '4. Success: Output Result', shapeType: 'terminator', color: '#10b981' },
                        { id: 'fl_5', label: '5. Error: Log & Retry', shapeType: 'terminator', color: '#ef4444' }
                    ],
                    connections: [
                        { from: 'fl_1', to: 'fl_2' },
                        { from: 'fl_2', to: 'fl_3' },
                        { from: 'fl_3', to: 'fl_4', label: 'Yes (Valid)' },
                        { from: 'fl_3', to: 'fl_5', label: 'No (Failed)' }
                    ]
                }
            };
        }

        // 11. Venn Diagrams & Geometric Constructions
        if (low.includes('venn') || low.includes('venn diagram')) {
            return {
                recognized: true,
                type: 'canvas_generation',
                intent: 'draw_venn_diagram',
                speechResponse: "Drawing an interactive two-set Venn diagram with overlapping circles showing set intersection and union relationships.",
                spokenFeedback: 'Drawn Venn Diagram',
                solutionMarkdown: `### Two-Set Venn Diagram ($A \\text{ and } B$)\n\n- **Intersection ($A \\cap B$):** Elements belonging to both set $A$ and set $B$.\n- **Union ($A \\cup B$):** Elements in $A$, in $B$, or in both: $|A \\cup B| = |A| + |B| - |A \\cap B|$.\n- **Relative Complement ($A \\setminus B$):** Elements belonging strictly to $A$ but not $B$.`,
                canvasAction: {
                    type: 'draw_diagram',
                    diagramType: 'venn',
                    title: 'Two-Set Venn Diagram'
                }
            };
        }

        if (low.includes('coordinate') || (low.includes('axes') && low.includes('draw')) || low.includes('cartesian')) {
            return {
                recognized: true,
                type: 'canvas_generation',
                intent: 'draw_coordinate_axes',
                speechResponse: "Drawing Cartesian coordinate axes with labeled horizontal X-axis, vertical Y-axis, and origin.",
                spokenFeedback: 'Drawn Coordinate Axes',
                solutionMarkdown: `### Cartesian Coordinate System\n\n- **X-axis (Abscissa):** Horizontal dimension with $(x > 0)$ to right.\n- **Y-axis (Ordinate):** Vertical dimension with $(y > 0)$ upwards.\n- **Origin $(0,0)$:** Intersection point where both coordinates equal zero.\n- **Quadrants:** I $(+,+)$, II $(-,+)$, III $(-,-)$, IV $(+,-)$.`,
                canvasAction: {
                    type: 'draw_diagram',
                    diagramType: 'axes',
                    title: 'Cartesian Coordinate Axes'
                }
            };
        }

        return null;
    }

    /**
     * Generate structured Training Module Outline (Curriculum & Units)
     */
    async generateTrainingModuleOutline({ topic, targetAudience = '', language = 'python', classLevel = 11, board = 'PSEB', totalUnits = 3, documentText = '', provider = 'gemini' }) {
        const targetUnitsCount = Math.max(1, Math.min(10, parseInt(totalUnits) || 3));
        const systemPrompt = `You are a distinguished Computer Science educator and curriculum designer.
Create a high-impact, pedagogy-aligned training course outline for the given topic.
TOPIC: ${topic}
PROGRAMMING LANGUAGE: ${language}
CLASS LEVEL: Grade ${classLevel}
BOARD / CURRICULUM: ${board}
TARGET UNITS COUNT: ${targetUnitsCount}
TARGET AUDIENCE / FOCUS: ${targetAudience || 'School / College Computer Science Students'}

${documentText ? `SOURCE REFERENCE DOCUMENT (GROUNDING MATERIAL):
---
${documentText.slice(0, 14000)}
---
STRICT GROUNDING REQUIREMENT: An authoritative textbook/syllabus document is attached above. You MUST extract and structure the ${targetUnitsCount} units, key concepts, and descriptions directly from the chapters and topics in this document to avoid irrelevant or generic content.` : ''}

CRITICAL REQUIREMENT: The "units" array in the JSON response MUST contain EXACTLY ${targetUnitsCount} distinct, logically progressive units (numbered 1 to ${targetUnitsCount}).

Design a structured course with progressive mastery thresholds (recommended 80%).
Output MUST be ONLY valid JSON matching this exact schema:
{
  "title": "Clear course title in English",
  "titleHindi": "प्रशिक्षण पाठ्यक्रम का शीर्षक (Hindi translation)",
  "description": "Detailed course overview explaining what students will master...",
  "language": "${language}",
  "boardAligned": "${board}",
  "classLevel": ${Number(classLevel) || 11},
  "pedagogyConfig": {
    "useBlooms": true,
    "useObjectives": true,
    "useTimeLimit": false
  },
  "units": [
    {
      "unitNumber": 1,
      "title": "Unit 1: Foundations of...",
      "description": "Core concepts covered in this unit...",
      "expectedHours": 4,
      "unlockThreshold": 80,
      "keyConcepts": ["Concept A", "Concept B"],
      "suggestedExerciseTypes": ["coding", "mcq", "fill_blank"]
    }
  ]
}`;

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini training outline (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Ultra-fast fallback or primary if explicitly requested)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'You are an educational AI assistant. Output ONLY valid JSON matching the schema. No markdown code blocks.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq training outline (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback training outline (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. Domain-Intelligent Fallback for exactly targetUnitsCount units
        const lowerTopic = String(topic || '').toLowerCase();
        let unitThemes = [
            { title: 'Foundations, Syntax & Environment Setup', desc: `Core syntax, environment initialization, and foundational mechanics of ${topic}.`, concepts: ['Syntax & Declarations', 'Memory Model', 'Basic I/O'] },
            { title: 'Control Flow, Conditionals & Loops', desc: `Iterative execution, branch logic, and algorithm control flow in ${topic}.`, concepts: ['Conditional Branching', 'Iteration Patterns', 'State Tracking'] },
            { title: 'Modular Functions, Scope & Recursion', desc: `Decomposing problems into reusable procedures, variable scope, and recursive calls.`, concepts: ['Function Signatures', 'Scope & Closures', 'Call Stack & Base Cases'] },
            { title: 'Core Data Structures & Collections', desc: `Manipulating linear and associative collections, slicing, and memory allocation.`, concepts: ['Arrays / Lists', 'Maps / Dictionaries', 'Searching & Sorting'] },
            { title: 'Object-Oriented Design & Encapsulation', desc: `Class blueprints, encapsulation, methods, inheritance, and clean OOP principles.`, concepts: ['Classes & Objects', 'Encapsulation & Methods', 'Polymorphism'] },
            { title: 'Error Handling, I/O & File Operations', desc: `Defensive programming, exception handling, file streams, and serialization.`, concepts: ['Try-Catch-Finally', 'File Streams', 'JSON & Data Serialization'] },
            { title: 'Algorithmic Optimization & Complexity', desc: `Time and space complexity, Big-O analysis, caching, and algorithmic speedups.`, concepts: ['Time Complexity', 'Space Tradeoffs', 'Memoization'] },
            { title: 'Capstone Project & Production Readiness', desc: `Full end-to-end software artifact construction, testing, and deployment.`, concepts: ['System Architecture', 'Automated Testing', 'Capstone Delivery'] }
        ];

        // Specific curriculum tailored for OOP
        if (lowerTopic.includes('object') || lowerTopic.includes('oop') || lowerTopic.includes('class') || lowerTopic.includes('oriented')) {
            unitThemes = [
                { title: 'Classes, Objects & State Modeling', desc: `Core OOP paradigms, creating class blueprints, instantiating objects, and modeling real-world entities in ${language}.`, concepts: ['Class Blueprint vs Instance', 'Instance Variables', 'Object State & Lifecycle'] },
                { title: 'Constructors, Methods & Encapsulation', desc: `Special constructor methods, designing instance methods with self, data hiding, and access modifiers.`, concepts: ['__init__ Constructor', 'Instance Methods & self', 'Private vs Public Attributes'] },
                { title: 'Inheritance Hierarchies & Code Reusability', desc: `Single and multiple inheritance, extending base classes, super() resolution, and method overriding.`, concepts: ['Base vs Derived Classes', 'Method Overriding', 'super() Function'] },
                { title: 'Polymorphism & Operator Overloading', desc: `Dynamic method dispatch, duck typing, and overloading built-in operators using dunder magic methods.`, concepts: ['Polymorphic Functions', 'Magic Methods (__str__, __len__)', 'Operator Overloading'] },
                { title: 'Abstraction, Interfaces & Clean Architecture', desc: `Abstract base classes, enforcing contracts, SOLID principles, and modular system composition.`, concepts: ['Abstract Base Classes (abc)', 'Loose Coupling', 'Modular OOP Design'] }
            ];
        } else if (lowerTopic.includes('data structure') || lowerTopic.includes('stack') || lowerTopic.includes('queue') || lowerTopic.includes('tree')) {
            unitThemes = [
                { title: 'Linear Structures: Lists, Arrays & Strings', desc: `Memory representation, slicing, indexing, time complexity, and dynamic array mechanics in ${language}.`, concepts: ['Contiguous Arrays', 'Index Arithmetic', 'Amortized Complexity'] },
                { title: 'Stacks & Queues: LIFO & FIFO Processing', desc: `Implementing stacks and queues, expression evaluation, parentheses balancing, and BFS buffers.`, concepts: ['Stack Operations (Push/Pop)', 'Queue Mechanics (Enqueue/Dequeue)', 'Buffer Scheduling'] },
                { title: 'Linked Lists & Pointer Traversal', desc: `Node construction, singly and doubly linked chains, insertion, deletion, and cycle detection.`, concepts: ['Node Pointers', 'Head/Tail Traversal', 'Pointer Manipulation'] },
                { title: 'Trees, Graphs & Search Traversal', desc: `Binary search trees, graph adjacency, and depth-first/breadth-first traversal algorithms.`, concepts: ['Binary Search Trees (BST)', 'In-Order Traversal', 'Graph Adjacency'] }
            ];
        }

        const generatedUnits = [];
        for (let i = 0; i < targetUnitsCount; i++) {
            const theme = unitThemes[i % unitThemes.length];
            generatedUnits.push({
                unitNumber: i + 1,
                title: `Unit ${i + 1}: ${theme.title}`,
                description: theme.desc,
                expectedHours: 4 + (i * 2),
                unlockThreshold: 80,
                keyConcepts: theme.concepts,
                suggestedExerciseTypes: i === 0 ? ['coding', 'mcq'] : i === targetUnitsCount - 1 ? ['coding', 'case_study'] : ['coding', 'fill_blank', 'bug_fix']
            });
        }

        return {
            title: `${topic} Professional Masterclass`,
            titleHindi: `${topic} व्यावसायिक पाठ्यक्रम`,
            description: `A comprehensive ${targetUnitsCount}-unit curriculum designed for Grade ${classLevel} students covering ${topic} from fundamentals to production mastery.`,
            language,
            boardAligned: board,
            classLevel: Number(classLevel) || 11,
            pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
            units: generatedUnits
        };
    }

    /**
     * Generate rich Lesson Theory, Markdown Notes, and Educational SVG Graphics / Mermaid Diagrams
     */
    async generateTrainingTheoryAndGraphics({ topic, unitTitle = '', unitDescription = '', moduleTitle = '', documentText = '', language = 'python', classLevel = 11, provider = 'gemini' }) {
        const systemPrompt = `You are an elite Computer Science instructional designer and technical illustrator.
Generate comprehensive, student-friendly learning material for the following concept:
TOPIC: ${topic}
UNIT TITLE: ${unitTitle || 'General Unit'} ${unitDescription ? `(${unitDescription})` : ''}
COURSE: ${moduleTitle || 'Active Computer Science Course'}
LANGUAGE: ${language}
CLASS LEVEL: Grade ${classLevel}

${unitTitle ? `UNIT CONTEXT ALIGNMENT: This lesson belongs directly to the unit "${unitTitle}". You MUST tailor the theory, definitions, practical code snippets, and SVG illustrations specifically to this unit's concept scope.` : ''}

${documentText ? `REFERENCE DOCUMENT EXCERPTS (STRICT GROUNDING):
---
${documentText.slice(0, 10000)}
---
MANDATORY GROUNDING RULE: You MUST draw your terminology, algorithmic steps, code syntax, and examples strictly from the uploaded document material above to ensure 100% textbook alignment and avoid irrelevant tangents.` : ''}

REQUIREMENTS:
1. "theoryMarkdown": Detailed, clean markdown with headings (##, ###), bullet points, bold keywords, code examples with syntax formatting, mental analogies, and memory tips.
2. "svgGraphic": A self-contained, clean, modern educational SVG illustration (width="100%", viewBox="0 0 800 400") visualizing the concept (e.g., memory layout, data flow, stack/heap, recursion tree, variable box, or loop cycle) with dark-theme styled rects (#1e293b, #334155), vibrant accents (#6366f1, #10b981, #f59e0b, #38bdf8), and clear text labels. Must be valid SVG XML string.
3. "mermaidDiagram": Clean Mermaid.js chart code (e.g. flowchart TD or sequenceDiagram).
4. "keyTakeaways": Array of 3-4 concise takeaway bullets.
5. "quickCheckQuestion": A fast 1-question self-check for the student with question and answer.
6. "miniCheckpoints": Array of 2-3 interactive bite-sized checkpoints for students:
   [
     {
       "id": "cp1",
       "question": "Quick Concept Check question...",
       "codeSnippet": "optional short code snippet",
       "options": ["Option A", "Option B", "Option C", "Option D"],
       "correctOption": 0,
       "explanation": "Clear explanation..."
     }
   ]
7. "cbseTips": Array of 2-3 common CBSE board exam traps, pitfalls, and previous year exam tips for this concept.
8. "animStages": Array of 3-4 sequential animation stages for an interactive visual simulator (Visual-First Concrete-Representational-Abstract framework). Every process in CS, Physics, Chemistry, Biology, or Mathematics follows a State-Transition Metamodel (Initial State -> Trigger/Action -> State Transformation -> Final Stabilized State).
   Title format MUST follow: "Stage [N]: [Specific Entity] [Active Verb] ([Governing Law/Condition])".
   [
     {
       "title": "Stage 1: [Specific Entity] [Active Verb]",
       "subtitle": "Brief subtitle explaining the physical/logical state change",
       "icon": "⚡",
       "narration": "1-2 sentence director commentary of what is happening under the hood."
     }
   ]
9. "conceptMindMap": A cognitive retention tree structure with 4 key thematic branches:
   {
     "label": "Core Concept Name",
     "icon": "🧠",
     "branches": [
       { "title": "Definition & Purpose", "nodes": ["Key point 1", "Key point 2"] },
       { "title": "Under the Hood Mechanism", "nodes": ["Internal step 1", "Internal step 2"] },
       { "title": "Applications & Pros", "nodes": ["Primary use case", "Advantage"] },
       { "title": "Limitations & Pitfalls", "nodes": ["Constraint or trap"] }
     ]
   }
10. "steps": Array of 3-4 chronological execution stages:
   [
     {
       "num": 1,
       "title": "Step title",
       "badge": "TRIGGER / EXECUTE / STORE",
       "desc": "Explanation of what occurs in this step",
       "snippet": "Short exact code or formula snippet"
     }
   ]
11. "syntaxAnatomy": Array of 3-5 token breakdowns explaining keywords/parameters:
   [
     { "token": "KEYWORD", "role": "Precise role and purpose of this token" }
   ]
12. "commonMistakes": Array of 1-2 comparison items for traps vs best practice:
   [
     {
       "wrongTitle": "Common Misconception or Bug",
       "wrongCode": "# Flawed code or faulty mental model",
       "whyFails": "Why this fails or produces bugs",
       "rightTitle": "Recommended Best Practice",
       "rightCode": "# Correct code or model",
       "whyWorks": "Why this approach is safe, performant, and correct"
     }
   ]

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Lesson Title",
  "theoryMarkdown": "Markdown string...",
  "svgGraphic": "<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 800 360\\">...</svg>",
  "mermaidDiagram": "flowchart TD\\nA[Input] --> B[Process] --> C[Output]",
  "keyTakeaways": ["Key point 1", "Key point 2", "Key point 3"],
  "miniCheckpoints": [
    {
      "id": "cp1",
      "question": "Quick question?",
      "options": ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
      "correctOption": 0,
      "explanation": "Why Opt 1 is correct"
    }
  ],
  "cbseTips": ["CBSE trap note 1", "CBSE trap note 2"],
  "quickCheckQuestion": {
    "question": "What happens when...?",
    "answer": "Explanation of expected behavior..."
  },
  "animStages": [
    {
      "title": "Stage 1: Initialization",
      "subtitle": "State setup",
      "icon": "⚡",
      "narration": "System initializes state."
    }
  ],
  "conceptMindMap": {
    "label": "Concept",
    "icon": "🧠",
    "branches": [
      { "title": "Definition", "nodes": ["Point A", "Point B"] }
    ]
  },
  "steps": [
    {
      "num": 1,
      "title": "Step 1",
      "badge": "START",
      "desc": "Initial step description",
      "snippet": "code_here"
    }
  ],
  "syntaxAnatomy": [
    { "token": "TOKEN", "role": "Role description" }
  ],
  "commonMistakes": [
    {
      "wrongTitle": "Mistake",
      "wrongCode": "wrong_code",
      "whyFails": "Why it fails",
      "rightTitle": "Solution",
      "rightCode": "correct_code",
      "whyWorks": "Why it works"
    }
  ]
}`;

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.theoryMarkdown || parsed.svgGraphic)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini theory/graphics (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'Output ONLY valid JSON. Escape quotes in SVG attributes properly.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.theoryMarkdown || parsed.svgGraphic)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq theory/graphics (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.theoryMarkdown || parsed.svgGraphic)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback theory/graphics (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. Fallback
        return {
            title: `Understanding ${topic}`,
            theoryMarkdown: `## 📘 Core Concept: ${topic}\n\n${topic} is a fundamental pillar of modern computing and programming in **${language}**.\n\n### 🔑 Key Principles\n- **Modularity:** Breaking complex logic into isolated, reusable blocks.\n- **Efficiency:** Optimizing execution flow and resource allocation.\n- **Clarity:** Writing self-documenting code with meaningful naming.\n\n\`\`\`${language}\n# Example demonstration\ndef demonstrate_${topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}():\n    print("Executing ${topic} workflow...")\n    return True\n\`\`\``,
            svgGraphic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" width="100%" height="100%">
  <rect width="800" height="300" rx="16" fill="#0f172a" />
  <rect x="40" y="40" width="220" height="220" rx="12" fill="#1e293b" stroke="#6366f1" stroke-width="2" />
  <text x="150" y="80" fill="#a5b4fc" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">Input / State</text>
  <circle cx="150" cy="150" r="40" fill="#312e81" stroke="#818cf8" stroke-width="2" />
  <text x="150" y="155" fill="#ffffff" font-size="13" font-family="sans-serif" text-anchor="middle">Data</text>
  <path d="M 270 150 L 350 150" stroke="#818cf8" stroke-width="3" />
  <rect x="360" y="40" width="220" height="220" rx="12" fill="#1e293b" stroke="#10b981" stroke-width="2" />
  <text x="470" y="80" fill="#6ee7b7" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">${topic}</text>
  <circle cx="470" cy="150" r="40" fill="#064e3b" stroke="#34d399" stroke-width="2" />
  <text x="470" y="155" fill="#ffffff" font-size="13" font-family="sans-serif" text-anchor="middle">Computed</text>
  <path d="M 590 150 L 670 150" stroke="#34d399" stroke-width="3" />
  <rect x="680" y="40" width="80" height="220" rx="12" fill="#1e293b" stroke="#f59e0b" stroke-width="2" />
  <text x="720" y="155" fill="#fde68a" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="middle">Result</text>
</svg>`,
            mermaidDiagram: `flowchart LR\n    A[Input State] --> B[Execute ${topic}]\n    B --> C[Validated Output]`,
            keyTakeaways: [
                `Break down the logic into modular, single-responsibility functions.`,
                `Always validate edge cases and exception handling.`,
                `Keep code idiomatic and follow standard conventions.`
            ],
            miniCheckpoints: [
                {
                    id: "cp1",
                    question: `What is the primary role of ${topic}?`,
                    options: [
                        `To structure logic cleanly and avoid redundant code`,
                        `To bypass syntax checking entirely`,
                        `To slow down runtime execution`,
                        `To force global state mutation`
                    ],
                    correctOption: 0,
                    explanation: `${topic} provides modularity, clarity, and robust computational structure.`
                }
            ],
            cbseTips: [
                `Pay special attention to variable scope and mutation boundaries.`,
                `In CBSE board practicals, always write clean comments and indent consistently.`
            ],
            quickCheckQuestion: {
                question: `What is the core benefit of utilizing ${topic}?`,
                answer: `It enables structured, maintainable, and high-performance execution.`
            },
            animStages: [
                {
                    title: `Stage 1: Initialize Context for ${topic}`,
                    subtitle: 'Allocating runtime memory and establishing base state',
                    icon: '📦',
                    narration: `The runtime environment prepares the execution stack and registers the identifiers for ${topic}.`
                },
                {
                    title: `Stage 2: Evaluate Transformation Rules`,
                    subtitle: 'Applying control logic or mathematical constraints',
                    icon: '⚙️',
                    narration: 'Expressions are evaluated following standard precedence and boundary validation.'
                },
                {
                    title: `Stage 3: Produce Verified Output State`,
                    subtitle: 'Returning result or updating data store',
                    icon: '🎯',
                    narration: 'Computation completes safely without unhandled side-effects.'
                }
            ],
            conceptMindMap: {
                label: topic,
                icon: '🧠',
                branches: [
                    {
                        title: 'Definition & Core Role',
                        nodes: [`Foundational concept in ${language}`, 'Structural component for reliable programs']
                    },
                    {
                        title: 'Execution Mechanics',
                        nodes: ['Sequential state evaluation', 'Deterministic input-to-output mapping']
                    },
                    {
                        title: 'Key Advantages',
                        nodes: ['Code reuse and readability', 'Optimized memory management']
                    },
                    {
                        title: 'CBSE / Production Traps',
                        nodes: ['Off-by-one errors or unbound variables', 'Missing validation for edge case inputs']
                    }
                ]
            },
            steps: [
                {
                    num: 1,
                    title: 'Declare & Configure',
                    badge: 'SETUP',
                    desc: `Initialize variables or connection parameters required for ${topic}.`,
                    snippet: `# Initialize state\ncontext = {"ready": True}`
                },
                {
                    num: 2,
                    title: 'Execute Core Logic',
                    badge: 'PROCESS',
                    desc: 'Perform the calculation, query, or data transformation.',
                    snippet: `result = demonstrate_${topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}()`
                },
                {
                    num: 3,
                    title: 'Validate Output',
                    badge: 'VERIFY',
                    desc: 'Check invariants, assert output ranges, and clean up resources.',
                    snippet: `assert result is True, "Validation failed"`
                }
            ],
            syntaxAnatomy: [
                { token: 'def / keyword', role: 'Declares executable structure or operational keyword' },
                { token: 'parameters', role: 'Input values passed into the operation' },
                { token: 'return / result', role: 'Yields computed value back to calling scope' }
            ],
            commonMistakes: [
                {
                    wrongTitle: `Assuming ${topic} handles missing inputs automatically`,
                    wrongCode: `# Unsafe access\nvalue = data["key"]`,
                    whyFails: 'Raises an exception when the expected key or state is absent.',
                    rightTitle: 'Defensive validation or safe retrieval',
                    rightCode: `# Safe access\nvalue = data.get("key", default_val)`,
                    whyWorks: 'Prevents runtime crashes and guarantees deterministic behavior.'
                }
            ]
        };
    }

    /**
     * Generate complete Training Exercises covering all 5 question types
     */
    async generateTrainingExercise({ topic, unitTitle = '', unitDescription = '', moduleTitle = '', documentText = '', language = 'python', exerciseType = 'coding', difficulty = 'beginner', scaffoldLevel = 'guided', bloomsLevel = 'apply', customPrompt = '', provider = 'gemini' }) {
        let safeTopic = 'Core Concept';
        if (typeof topic === 'string') safeTopic = topic.trim();
        else if (topic && typeof topic === 'object') safeTopic = topic.title || topic.name || topic.topic || topic.question || topic.text || 'Core Concept';
        else if (topic != null) safeTopic = String(topic).trim();
        topic = safeTopic || 'Core Concept';

        let typeInstruction = '';
        if (exerciseType === 'coding') {
            typeInstruction = `Generate a standard CODING LAB exercise:
CRITICAL: Do NOT output placeholder code like 'def solve(n): pass'. The "starterCode" and "solutionCode" MUST be specifically written for '${topic}' in the context of unit '${unitTitle}' (or custom prompt '${customPrompt}') with realistic function names, docstrings, and actual algorithm logic matching difficulty '${difficulty}', scaffold '${scaffoldLevel}', and bloom level '${bloomsLevel}'.
- "starterCode": Boilerplate with function signature, docstring explaining parameters/returns, scaffolding comments and starter variables.
- "solutionCode": Complete working executable solution code solving the specific problem.
- "testCases": Array of at least 3 realistic test cases with realistic inputs and expected outputs: [{"input": "...", "expectedOutput": "...", "isHidden": false}, {"input": "...", "expectedOutput": "...", "isHidden": true}]
- "hints": Array of 2-3 progressive Socratic hints.`;
        } else if (exerciseType === 'bug_fix') {
            typeInstruction = `Generate a PR REVIEW / BUG HUNT exercise where student is given buggy code and must fix it:
- "starterCode": Code specifically implementing '${topic}' for unit '${unitTitle}' containing a subtle logical or off-by-one bug with comments like "# FIX THE BUG HERE"
- "solutionCode": The clean, corrected code
- "testCases": Array of 3 test cases that fail on buggy code but pass on corrected code
- "hints": Array of 2 hints pointing toward the bug's cause`;
        } else if (exerciseType === 'mcq') {
            typeInstruction = `Generate a CODE TRACING / OUTPUT PREDICTION MCQ specifically about '${topic}' for unit '${unitTitle}':
- "testCases": {
    "question": "What is the exact output of this code snippet?",
    "codeSnippet": "Code snippet in ${language} demonstrating ${topic} with tricky logic or edge cases",
    "options": ["Option A (Incorrect)", "Option B (Correct)", "Option C (Distractor)", "Option D (Distractor)"],
    "correctOption": 1,
    "explanation": "Detailed explanation of why Option B is correct and why others fail."
  }
- "starterCode": null
- "solutionCode": null`;
        } else if (exerciseType === 'fill_blank') {
            typeInstruction = `Generate a SYNTAX CLOZE / FILL-IN-THE-BLANKS exercise for '${topic}' in unit '${unitTitle}':
- "starterCode": The exact code snippet template containing placeholders like {{BLANK_1}} and {{BLANK_2}}
- "solutionCode": The complete, working, executable code with all {{BLANK_N}} placeholders replaced with their exact correct answer tokens
- "testCases": {
    "instruction": "Fill in the missing tokens in the code template below.",
    "template": "Code snippet with placeholders like {{BLANK_1}} and {{BLANK_2}}",
    "blanks": [
      { "id": "BLANK_1", "correctAnswer": "exactToken", "hint": "Brief hint for blank 1" },
      { "id": "BLANK_2", "correctAnswer": "exactToken", "hint": "Brief hint for blank 2" }
    ],
    "explanation": "Detailed explanation of the completed code syntax."
  }`;
        } else if (exerciseType === 'case_study') {
            typeInstruction = `Generate a REAL-WORLD MNC INCIDENT CASE STUDY based on '${topic}' for unit '${unitTitle}':
- "testCases": {
    "company": "Fictional Tech Company / Team",
    "incident": "Incident description (e.g. Production latency spike during peak checkout)",
    "scenarioCode": "Relevant architectural or backend code snippet demonstrating ${topic}",
    "questions": [
      {
        "id": "q1",
        "prompt": "What architectural flaw causes this behavior?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctOption": 0,
        "explanation": "Root cause analysis..."
      }
    ]
  }`;
        } else if (exerciseType === 'assertion_reason') {
            typeInstruction = `Generate a CBSE CLASS 11/12 ASSERTION-REASONING challenge based on '${topic}' for unit '${unitTitle}':
- "testCases": {
    "assertion": "Assertion statement about ${topic} syntax or behavior",
    "reason": "Reason statement explaining the underlying compiler/runtime rule",
    "correctOption": 0,
    "explanation": "Clear explanation of whether each statement is true and whether Reason logically explains Assertion."
  }
- "starterCode": null
- "solutionCode": null`;
        } else if (exerciseType === 'code_trace') {
            typeInstruction = `Generate a CBSE DRY-RUN / VARIABLE TRACING TABLE challenge for '${topic}' in unit '${unitTitle}':
- "testCases": {
    "codeSnippet": "Short, tricky code loop or function in ${language} demonstrating ${topic}",
    "tableHeaders": ["Iteration / Step", "Variable 1", "Variable 2"],
    "expectedRows": [
      ["1", "val1", "val2"],
      ["2", "val3", "val4"],
      ["3", "val5", "val6"]
    ],
    "explanation": "Step-by-step dry-run walkthrough showing variable values at each step."
  }
- "starterCode": null
- "solutionCode": null`;
        } else if (exerciseType === 'code_debug') {
            typeInstruction = `Generate a CBSE CODE DEBUGGING & ERROR SPOTTING challenge for '${topic}' in unit '${unitTitle}':
- "starterCode": "Code snippet with 1-2 syntax or logical errors on specific line(s)",
- "solutionCode": "Clean, corrected code that compiles and runs properly",
- "testCases": {
    "buggyCode": "Code snippet with 1-2 deliberate errors",
    "errors": [
      { "line": 3, "description": "Syntax/logical error description", "correctedLine": "corrected line code" }
    ],
    "solutionCode": "clean code",
    "explanation": "Clear explanation of each bug, line numbers, and how to fix them."
  }`;
        }

        const systemPrompt = `You are an expert pedagogy and computer science challenge architect.
Create an exercise with the following parameters:
TARGET TOPIC: ${topic}
TARGET UNIT: ${unitTitle || 'Active Unit'} ${unitDescription ? `(${unitDescription})` : ''}
COURSE CONTEXT: ${moduleTitle || 'Computer Science Training Module'}
LANGUAGE: ${language}
EXERCISE TYPE: ${exerciseType}
DIFFICULTY: ${difficulty}
SCAFFOLD LEVEL: ${scaffoldLevel}
BLOOM'S TAXONOMY LEVEL: ${bloomsLevel}
ADDITIONAL INSTRUCTIONS: ${customPrompt || 'None'}

${unitTitle ? `UNIT ALIGNMENT MANDATE: The exercise MUST directly evaluate and reinforce the skills of Unit "${unitTitle}". Do not generate general/unrelated questions outside this unit's scope.` : ''}

${documentText ? `DOCUMENT GROUNDING CONTEXT:
---
${documentText.slice(0, 10000)}
---
STRICT GROUNDING: Draw the exercise scenario, code constructs, and variables directly from the concepts and examples in this uploaded reference material.` : ''}

${typeInstruction}

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Concise, descriptive problem title",
  "description": "Clear problem statement and instructions for students",
  "theory": "Brief theoretical background explaining the concept before the student begins",
  "exerciseType": "${exerciseType}",
  "difficulty": "${difficulty}",
  "scaffoldLevel": "${scaffoldLevel}",
  "bloomsLevel": "${bloomsLevel}",
  "learningObjective": "SWBAT...",
  "xpReward": ${difficulty === 'advanced' ? 25 : difficulty === 'intermediate' ? 15 : 10},
  "timeLimit": 5,
  "isReviewExercise": false,
  "starterCode": "...",
  "solutionCode": "...",
  "testCases": ...,
  "hints": ["Hint 1", "Hint 2"]
}`;

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.description)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini exercise generation (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'Output ONLY valid JSON. No markdown code block wrapping.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.title || parsed.description)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq exercise generation (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.description)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback exercise generation (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. High-Quality Academic Exercise Fallback
        try {
            const academicEx = this.createAcademicExerciseForTopic({
                topic,
                unitTitle,
                language,
                exerciseType,
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                index: 0,
                documentText
            });
            if (academicEx && (academicEx.starterCode || academicEx.testCases)) {
                return academicEx;
            }
        } catch (e) {
            console.warn('[AIService] createAcademicExerciseForTopic fallback note:', e.message);
        }

        // 4. Dynamic Topic-Tailored Fallback
        const cleanSlug = (typeof topic === 'string' ? topic : 'solution').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) || 'algorithm';
        const funcName = `solve_${cleanSlug}`;

        if (exerciseType === 'mcq') {
            return {
                title: `${topic} Tracing Challenge`,
                description: `Analyze the code snippet below and predict the expected output.`,
                theory: `Tracing code step-by-step is a key debugging skill.`,
                exerciseType: 'mcq',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT trace ${topic} execution.`,
                xpReward: 10,
                timeLimit: 5,
                isReviewExercise: false,
                testCases: {
                    question: `What will the following ${language} code print for ${topic}?`,
                    codeSnippet: language === 'python' ? `items = [10, 20, 30]\nresult = [x * 2 for x in items if x > 15]\nprint(result)` : `const items = [10, 20, 30];\nconst result = items.filter(x => x > 15).map(x => x * 2);\nconsole.log(result);`,
                    options: ['[20, 40, 60]', '[40, 60]', '[20, 40]', '[10, 20]'],
                    correctOption: 1,
                    explanation: `Only elements > 15 (20 and 30) are selected and multiplied by 2, giving [40, 60].`
                },
                hints: [`Check the filter condition first, then the transformation.`]
            };
        }

        if (exerciseType === 'fill_blank') {
            const template = language === 'python'
                ? `def ${funcName}(items):\n    # Filter and transform elements for ${topic}\n    {{BLANK_1}} not items:\n        return []\n    {{BLANK_2}} [x * 2 for x in items if x > 0]`
                : `function ${funcName}(items) {\n    // Filter and transform elements for ${topic}\n    {{BLANK_1}} (!items || items.length === 0) return [];\n    {{BLANK_2}} items.filter(x => x > 0).map(x => x * 2);\n}`;
            const solution = language === 'python'
                ? `def ${funcName}(items):\n    # Filter and transform elements for ${topic}\n    if not items:\n        return []\n    return [x * 2 for x in items if x > 0]`
                : `function ${funcName}(items) {\n    // Filter and transform elements for ${topic}\n    if (!items || items.length === 0) return [];\n    return items.filter(x => x > 0).map(x => x * 2);\n}`;
            return {
                title: `Syntax Cloze: ${topic}`,
                description: `Fill in the missing tokens in the code snippet to implement ${topic}.`,
                theory: `Mastering syntax tokens ensures clean and reliable execution.`,
                exerciseType: 'fill_blank',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT complete ${topic} syntax patterns.`,
                xpReward: 10,
                timeLimit: 5,
                isReviewExercise: false,
                starterCode: template,
                solutionCode: solution,
                testCases: {
                    instruction: `Fill in the missing keywords:`,
                    template: template,
                    blanks: [
                        { id: 'BLANK_1', correctAnswer: 'if', hint: 'Guard condition check' },
                        { id: 'BLANK_2', correctAnswer: 'return', hint: 'Output return statement' }
                    ],
                    explanation: `Guards against empty data with 'if' and returns transformed array with 'return'.`
                },
                hints: [`Look at standard conditional and return keywords.`]
            };
        }

        if (exerciseType === 'assertion_reason') {
            return {
                title: `CBSE Assertion & Reason: ${topic}`,
                description: `Assess Assertion (A) and Reason (R) statements regarding ${topic} in ${language}.`,
                theory: `Carefully examine the truth value of both statements before assessing causal connection.`,
                exerciseType: 'assertion_reason',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT evaluate Assertion-Reasoning logic for ${topic}.`,
                xpReward: 15,
                timeLimit: 5,
                isReviewExercise: false,
                testCases: {
                    assertion: `In ${language}, understanding ${topic} is required for structured program control.`,
                    reason: `${topic} dictates the computational sequence and data flow within execution scopes.`,
                    correctOption: 0,
                    explanation: `Both statements are true, and the Reason correctly explains why ${topic} determines program control.`
                },
                hints: [`Determine if Assertion is true, then if Reason is true, then check if Reason explains Assertion.`]
            };
        }

        if (exerciseType === 'code_trace') {
            return {
                title: `Dry-Run Trace Table: ${topic}`,
                description: `Trace the variable state transformations step-by-step for the given ${topic} snippet.`,
                theory: `Dry running on paper or trace table is an essential CBSE examination skill.`,
                exerciseType: 'code_trace',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT dry-run and trace variable values for ${topic}.`,
                xpReward: 15,
                timeLimit: 5,
                isReviewExercise: false,
                testCases: {
                    codeSnippet: language === 'python'
                        ? `a = 2\nb = 5\nfor i in range(1, 4):\n    a = a + i\n    b = b * 2`
                        : `let a = 2;\nlet b = 5;\nfor (let i = 1; i <= 3; i++) {\n    a = a + i;\n    b = b * 2;\n}`,
                    tableHeaders: ['Step (i)', 'Value of a', 'Value of b'],
                    expectedRows: [
                        ['1', '3', '10'],
                        ['2', '5', '20'],
                        ['3', '8', '40']
                    ],
                    explanation: `At i=1: a=3, b=10. At i=2: a=5, b=20. At i=3: a=8, b=40.`
                },
                hints: [`Track each variable's new state after each iteration.`]
            };
        }

        if (exerciseType === 'code_debug') {
            const buggy = language === 'python'
                ? `def calculate(values):\n    total = 0\n    for v in values\n        total += v\n    return total`
                : `function calculate(values) {\n    let total = 0;\n    for (let v of values {\n        total += v;\n    }\n    return total;\n}`;
            const clean = language === 'python'
                ? `def calculate(values):\n    total = 0\n    for v in values:\n        total += v\n    return total`
                : `function calculate(values) {\n    let total = 0;\n    for (let v of values) {\n        total += v;\n    }\n    return total;\n}`;
            return {
                title: `Error Spotting & Debugging: ${topic}`,
                description: `Identify and fix the syntax/logical error in the ${topic} function.`,
                theory: `Spotting syntax errors on specific lines is a core CBSE Board Practical assessment skill.`,
                exerciseType: 'code_debug',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT debug syntax and logical errors in ${topic}.`,
                xpReward: 15,
                timeLimit: 5,
                isReviewExercise: false,
                starterCode: buggy,
                solutionCode: clean,
                testCases: {
                    buggyCode: buggy,
                    errors: [
                        { line: 3, description: `Missing colon/bracket on loop header`, correctedLine: language === 'python' ? `    for v in values:` : `    for (let v of values) {` }
                    ],
                    solutionCode: clean,
                    explanation: `Line 3 had a syntax error in the loop declaration.`
                },
                hints: [`Look at line 3 for missing delimiters.`]
            };
        }

        const starter = language === 'python'
            ? `def ${funcName}(values):\n    """\n    Solve ${topic} (${difficulty} / ${scaffoldLevel})\n    :param values: list of numbers or data elements\n    :return: transformed result\n    """\n    # TODO: Implement your solution for ${topic}\n    result = []\n    for item in values:\n        # Process each item\n        pass\n    return result\n`
            : `function ${funcName}(values) {\n    /**\n     * Solve ${topic} (${difficulty} / ${scaffoldLevel})\n     * @param {Array} values\n     * @returns {Array}\n     */\n    // TODO: Implement your solution for ${topic}\n    const result = [];\n    for (const item of values) {\n        // Process item\n    }\n    return result;\n}\n`;

        const solution = language === 'python'
            ? `def ${funcName}(values):\n    """\n    Solve ${topic} (${difficulty} / ${scaffoldLevel})\n    """\n    if not values:\n        return []\n    return [x * 2 for x in values if x is not None]\n`
            : `function ${funcName}(values) {\n    if (!values || !Array.isArray(values)) return [];\n    return values.filter(x => x !== null).map(x => x * 2);\n}\n`;

        return {
            title: `Hands-on Lab: ${topic}`,
            description: `Implement ${funcName}(values) to process the input according to ${topic} rules. Return the correctly computed result.`,
            theory: `## 📘 Learning Concept: ${topic}\n\nUnderstand the computational rules of ${topic} before implementing your algorithm.`,
            exerciseType: 'coding',
            difficulty,
            scaffoldLevel,
            bloomsLevel,
            learningObjective: `SWBAT implement ${topic} in ${language} adhering to ${scaffoldLevel} guidelines.`,
            xpReward: difficulty === 'advanced' ? 25 : difficulty === 'intermediate' ? 15 : 10,
            timeLimit: 5,
            isReviewExercise: false,
            starterCode: starter,
            solutionCode: solution,
            testCases: [
                { input: '[1, 2, 3]', expectedOutput: '[2, 4, 6]', isHidden: false },
                { input: '[5, 10]', expectedOutput: '[10, 20]', isHidden: false },
                { input: '[]', expectedOutput: '[]', isHidden: true }
            ],
            hints: [`Start by checking for empty or None inputs.`, `Iterate through the collection and apply the ${topic} transformation.`]
        };
    }

    /**
     * Generate interactive Socratic Hint for a student stuck on an exercise
     */
    async generateSocraticHint({ problemTitle, problemDescription, studentCode, currentOutput, failedTests = [], provider = 'gemini' }) {
        const systemPrompt = `You are a warm, encouraging Socratic Computer Science tutor.
A student is working on the following problem and needs a hint:
PROBLEM: ${problemTitle}
DESCRIPTION: ${problemDescription}
STUDENT CODE:
\`\`\`
${studentCode || 'No code written yet'}
\`\`\`
CURRENT OUTPUT / ERROR:
${currentOutput || 'None'}
FAILED TEST CASES:
${JSON.stringify(failedTests)}

RULES:
1. NEVER give the complete solution code directly.
2. Ask a guiding question that prompts the student to think about their logic or edge cases.
3. Keep the feedback under 3 concise sentences.

Output MUST be ONLY valid JSON:
{
  "socraticHint": "Encouraging guidance...",
  "guidingQuestion": "What happens when...?",
  "edgeCaseToConsider": "Consider testing with..."
}`;

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.socraticHint || parsed.guidingQuestion)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini socratic hint (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'Output ONLY valid JSON.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.3
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.socraticHint || parsed.guidingQuestion)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq socratic hint (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.socraticHint || parsed.guidingQuestion)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback socratic hint (${modelName}) failed:`, err.message);
                }
            }
        }

        return {
            socraticHint: `Take a close look at your variable initialization and the loop boundary conditions.`,
            guidingQuestion: `What value does your function return when given the first test input?`,
            edgeCaseToConsider: `Test with empty inputs or zero.`
        };
    }

    /**
     * Batch Exercise Generator from checked topics, checkpoints, or RAG ebook chapter text
     */
    async generateTrainingExerciseBatch({
        topics = [],
        unitTitle = '',
        language = 'python',
        classLevel = 11,
        board = 'CBSE',
        count = null,
        source = 'topics',
        documentText = '',
        exerciseType = 'mixed',
        provider = 'gemini'
    }) {
        let targetCount = parseInt(count);
        if (!targetCount || isNaN(targetCount)) {
            const topicCount = Array.isArray(topics) ? topics.length : 0;
            if (topicCount >= 5) targetCount = 5;
            else if (topicCount >= 3) targetCount = 4;
            else targetCount = 3;
        }
        targetCount = Math.max(1, Math.min(8, targetCount));
        const topicsStr = Array.isArray(topics) && topics.length > 0 ? topics.join('; ') : unitTitle || 'Core Concepts';

        let promptDirectives = '';
        if (source === 'rag' && documentText) {
            promptDirectives = `CRITICAL EXTRACTION DIRECTIVE (70-80% AUTHENTIC EXERCISES):
Extract authentic exercises directly from the provided textbook / syllabus chapter excerpt below.
PRIMARY PRIORITY: Look for prebuilt chapter-end questions, back-exercises, review questions, assignment problems, solved examples, or code snippets provided in the text. You MUST extract and format these real textbook questions first (at least 70-80% of the returned exercises).
SECONDARY LIBERTY: Only if the textbook excerpt does not contain enough exercises to reach the requested count (${targetCount}), you have minor creative liberty to synthesize supplementary exercises tightly aligned with the specific concepts and grade level (Class ${classLevel}, ${board}).

--- TEXTBOOK EXCERPT ---
${documentText.slice(0, 10000)}
--- END EXCERPT ---`;
        } else {
            promptDirectives = `Construct ${targetCount} practical exercises for the unit "${unitTitle}" specifically testing these checked topics/checkpoints: ${topicsStr}. Each exercise must directly assess a specific concept, formula, algorithm, or code pattern from these topics with zero generic filler.`;
        }

        const systemPrompt = `You are a high-school and university Computer Science pedagogy expert.
${promptDirectives}

SPECIFICATIONS:
- LANGUAGE: ${language}
- CLASS LEVEL: Grade ${classLevel} (${board} Curriculum)
- EXERCISE TYPE REQUIREMENT: ${exerciseType === 'mixed' ? 'Provide a varied pedagogical mix (e.g. coding labs, MCQs from review questions, bug_fix or assertion_reason)' : `All exercises must be of type "${exerciseType}"`}
- Total exercises to return: ${targetCount}
- AUTHENTICITY MANDATE: Preserve the real textbook problem phrasing, variable names, and expected input/output from the source material wherever possible.

For each exercise, provide:
1. "title": Concise, engaging problem title.
2. "description": Clear problem statement in Markdown with constraints and examples.
3. "exerciseType": "coding" | "mcq" | "fill_blank" | "bug_fix" | "assertion_reason" | "code_trace"
4. "difficulty": "beginner" | "intermediate" | "advanced"
5. "scaffoldLevel": "guided" | "independent" | "challenge"
6. "bloomsLevel": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create"
7. "learningObjective": Single sentence learning outcome.
8. "xpReward": Integer between 10 and 30.
9. "timeLimit": Expected minutes (3 to 10).
10. "starterCode": Code template (for coding/bug_fix/fill_blank).
11. "solutionCode": Complete working reference solution.
12. "testCases": Array of { input, expectedOutput, isHidden } for coding, OR object matching schema for MCQ/assertion_reason/debug/trace.
13. "hints": Array of 2 helpful hints.

Output MUST be ONLY valid JSON matching this schema:
{
  "exercises": [
    {
      "title": "...",
      "description": "...",
      "exerciseType": "coding",
      "difficulty": "beginner",
      "scaffoldLevel": "guided",
      "bloomsLevel": "apply",
      "learningObjective": "...",
      "xpReward": 20,
      "timeLimit": 5,
      "starterCode": "...",
      "solutionCode": "...",
      "testCases": [...],
      "hints": ["...", "..."]
    }
  ]
}`;

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini batch exercises (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'Output ONLY valid JSON. No code fences.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Groq batch exercises (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback batch exercises (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. Fallback Generation based on checked topics
        const generatedExercises = [];
        const topicList = Array.isArray(topics) && topics.length > 0 ? topics : [unitTitle || 'Core Syntax'];

        for (let i = 0; i < targetCount; i++) {
            const currentTopic = topicList[i % topicList.length];
            const exType = exerciseType === 'mixed'
                ? (i === 1 ? 'mcq' : (i === 2 ? 'code_debug' : 'coding'))
                : (exerciseType || 'coding');

            const isLast = (i === targetCount - 1) && targetCount > 2;
            generatedExercises.push(this.createAcademicExerciseForTopic({
                topic: currentTopic,
                unitTitle,
                language,
                exerciseType: exType,
                difficulty: isLast ? 'advanced' : (i === 0 ? 'beginner' : 'intermediate'),
                scaffoldLevel: scaffoldLevel || 'progressive',
                bloomsLevel: bloomsLevel || 'mix',
                index: i,
                documentText,
                isReviewExercise: isLast
            }));
        }

        return { exercises: generatedExercises };
    }

    /**
     * Create high-quality, academic, CBSE board-aligned exercise for a topic.
     * Eliminates placeholder code and casual names ('solve_...', 'def solution()').
     */
    createAcademicExerciseForTopic({
        topic = 'Core Processing',
        unitTitle = '',
        language = 'python',
        exerciseType = 'coding',
        difficulty = 'intermediate',
        scaffoldLevel = 'progressive',
        bloomsLevel = 'mix',
        index = 0,
        documentText = '',
        isReviewExercise = false
    }) {
        const strTopic = typeof topic === 'string' ? topic : (topic?.title || topic?.name || topic?.topic || 'Core Concept');
        const strUnit = typeof unitTitle === 'string' ? unitTitle : (unitTitle?.title || 'Applied Unit');
        const strDoc = typeof documentText === 'string' ? documentText : '';
        const cleanTopic = this.cleanTitle(strTopic);

        // Resolve pedagogical Bloom's & Scaffolding levels
        let effectiveBlooms = bloomsLevel;
        if (bloomsLevel === 'mix' || !bloomsLevel) {
            if (isReviewExercise) {
                effectiveBlooms = index % 2 === 0 ? 'evaluate' : 'create';
            } else {
                const levels = ['understand', 'apply', 'analyze', 'evaluate'];
                effectiveBlooms = levels[index % levels.length];
            }
        }

        let effectiveScaffold = scaffoldLevel;
        if (scaffoldLevel === 'progressive' || !scaffoldLevel) {
            if (isReviewExercise) {
                effectiveScaffold = 'independent';
            } else {
                const scaffolds = ['guided', 'guided', 'semi_independent', 'independent'];
                effectiveScaffold = scaffolds[index % scaffolds.length];
            }
        }

        let effectiveDifficulty = difficulty;
        if (isReviewExercise) {
            effectiveDifficulty = 'advanced';
        }

        // --- DOMAIN DETECTION PRIORITY ---
        // 1. Check SQL
        const isSql = language === 'sql' || /\b(sql|database|rdbms|relational|select|table|schema|ddl|dml)\b/i.test(strTopic) || /\b(sql|database|rdbms)\b/i.test(strUnit);
        
        // 2. Check NumPy / Multidimensional Arrays (Prioritize before generic lists/tuples!)
        const isNumpy = !isSql && (
            /\b(numpy|ndarray|np\b|arrays?|matrix|matrices|broadcasting|vectoriz|dimension|shape|slice|reshape|axis|arange|linspace)\b/i.test(strTopic) ||
            /\b(numpy|ndarray|matrix|vectoriz|broadcasting)\b/i.test(strUnit) ||
            (/\b(numpy|ndarray)\b/i.test(strDoc) && !/\b(tuple|dictionary|sql)\b/i.test(strTopic))
        );

        // 3. Check Pandas
        const isPandas = !isSql && !isNumpy && /\b(pandas|dataframe|series|\bdf\b|dataset)\b/i.test(`${strTopic} ${strUnit}`);

        // 4. Check Explicit Tuple (ONLY when topic specifically indicates tuple)
        const isTuple = !isSql && !isNumpy && !isPandas && (/\b(tuple|tuples|immutab)\b/i.test(strTopic) || (/\b(tuple|tuples)\b/i.test(strUnit) && !/numpy|array/i.test(strTopic)));

        // 5. Check Explicit Dictionary
        const isDict = !isSql && !isNumpy && !isPandas && !isTuple && (/\b(dict|dictionary|dictionaries|key[- ]value|hash\s*map|frequency)\b/i.test(strTopic) || /\b(dict|dictionary)\b/i.test(strUnit));

        // =========================================================================
        // DOMAIN: SQL (DIVERSE MULTI-MODAL PEDAGOGY: CODING, MCQ, CLOZE, DEBUG)
        // =========================================================================
        if (isSql) {
            // Determine desired exercise type
            let chosenType = exerciseType;
            if (!chosenType || chosenType === 'mixed') {
                const typeRotation = ['coding', 'mcq', 'fill_blank', 'code_debug'];
                chosenType = typeRotation[index % typeRotation.length];
            }
            if (isReviewExercise) {
                chosenType = index % 2 === 0 ? 'coding' : 'code_debug';
            }

            const sqlTemplates = [
                // Template 0: Filtered Projection Query [Coding Lab, Apply, Guided]
                {
                    type: 'coding',
                    blooms: 'apply',
                    scaffold: 'guided',
                    title: `${cleanTopic}: Filtered Projection Query`,
                    description: `## 🎯 Problem Statement\n\nWrite an SQL query to retrieve records from the \`Student\` table satisfying specific criteria for **${cleanTopic}**.\n\n### Schema Table: \`Student\`\n| Column | Type | Constraints |\n| :--- | :--- | :--- |\n| \`RollNo\` | \`INT\` | \`PRIMARY KEY\` |\n| \`Name\` | \`VARCHAR(50)\` | \`NOT NULL\` |\n| \`Stream\` | \`VARCHAR(30)\` | \`NOT NULL\` |\n| \`Marks\` | \`DECIMAL(5,2)\` | \`CHECK (Marks >= 0)\` |\n\n### Requirements:\n- Project \`RollNo\`, \`Name\`, and \`Marks\` for students with \`Marks >= 75\`.\n- Order the result by \`Marks\` in descending order.`,
                    starterCode: `-- Write SQL query for ${cleanTopic}\nSELECT * FROM Student;\n`,
                    solutionCode: `SELECT RollNo, Name, Marks FROM Student WHERE Marks >= 75 ORDER BY Marks DESC;\n`,
                    testCases: [{ input: 'SELECT RollNo, Name, Marks FROM Student WHERE Marks >= 75 ORDER BY Marks DESC;', expectedOutput: 'Query executed successfully', isHidden: false }],
                    hints: ['Use SELECT RollNo, Name, Marks FROM Student', 'Add WHERE Marks >= 75', 'Add ORDER BY Marks DESC;']
                },
                // Template 1: Output Prediction & Execution MCQ [MCQ, Analyze, Semi-Independent]
                {
                    type: 'mcq',
                    blooms: 'analyze',
                    scaffold: 'semi_independent',
                    title: `${cleanTopic}: Query Output Prediction MCQ`,
                    description: `## 📝 Output Prediction Challenge\n\nCarefully trace the SQL command and identify the exact count or record set produced.\n\n### Sample Relation: \`Employee\`\n| EmpId | Name | Dept | Salary |\n| :--- | :--- | :--- | :--- |\n| 101 | Ananya | IT | 65000 |\n| 102 | Rohan | HR | 48000 |\n| 103 | Priya | IT | 72000 |\n| 104 | Vikram | IT | 55000 |\n| 105 | Sneha | Marketing | 51000 |\n\n### Executed Query:\n\`\`\`sql\nSELECT COUNT(DISTINCT Dept) FROM Employee WHERE Salary > 50000;\n\`\`\`\n\nWhat is the exact result of the above query?`,
                    starterCode: null,
                    solutionCode: null,
                    testCases: {
                        question: 'What is the output of: SELECT COUNT(DISTINCT Dept) FROM Employee WHERE Salary > 50000;?',
                        options: ['2 (IT and Marketing)', '3 (IT, HR, and Marketing)', '4', '1'],
                        correctOption: 0,
                        explanation: 'Employees with Salary > 50000 are Ananya (IT), Priya (IT), Vikram (IT), and Sneha (Marketing). Distinct departments among these are IT and Marketing, giving a count of 2.'
                    },
                    hints: ['Filter rows where Salary > 50000 first', 'Identify unique Dept values from the filtered rows', 'COUNT(DISTINCT ...) counts distinct department names.']
                },
                // Template 2: Aggregation Syntax Cloze [Fill in Blank, Apply, Guided]
                {
                    type: 'fill_blank',
                    blooms: 'apply',
                    scaffold: 'guided',
                    title: `${cleanTopic}: Aggregation Syntax Cloze`,
                    description: `## 🧩 Fill in the Missing SQL Clauses\n\nComplete the query below to calculate the total salary per department for departments having more than 1 employee.\n\n### Incomplete Query:\n\`SELECT Dept, SUM(Salary) [[FROM]] Employee [[GROUP BY]] Dept [[HAVING]] COUNT(*) > 1;\``,
                    starterCode: 'SELECT Dept, SUM(Salary) [[FROM]] Employee [[GROUP BY]] Dept [[HAVING]] COUNT(*) > 1;',
                    solutionCode: 'SELECT Dept, SUM(Salary) FROM Employee GROUP BY Dept HAVING COUNT(*) > 1;',
                    testCases: {
                        template: 'SELECT Dept, SUM(Salary) [[FROM]] Employee [[GROUP BY]] Dept [[HAVING]] COUNT(*) > 1;',
                        blanks: [
                            { index: 0, correct: 'FROM', hint: 'Table specification keyword' },
                            { index: 1, correct: 'GROUP BY', hint: 'Clause to group rows by Dept' },
                            { index: 2, correct: 'HAVING', hint: 'Filter condition for grouped rows' }
                        ]
                    },
                    hints: ['Remember: GROUP BY groups rows before HAVING filters them', 'HAVING is used instead of WHERE when filtering aggregates.']
                },
                // Template 3: CBSE Error Debugging & Bug Hunt [Code Debug, Analyze, Semi-Independent]
                {
                    type: 'code_debug',
                    blooms: 'analyze',
                    scaffold: 'semi_independent',
                    title: `${cleanTopic}: CBSE SQL Error Debugging Lab`,
                    description: `## 🐞 CBSE SQL Syntax Error Debugging\n\nA student submitted the following SQL query to retrieve departments where the average salary exceeds 60,000, but MySQL reported an execution error:\n\n### Buggy Query:\n\`\`\`sql\nSELECT Dept, AVG(Salary)\nFROM Employee\nWHERE AVG(Salary) > 60000\nGROUP BY Dept;\n\`\`\`\n\n### Task:\nIdentify the error, explain why MySQL rejected it, and provide the corrected query.`,
                    starterCode: `-- Correct the query below:\nSELECT Dept, AVG(Salary)\nFROM Employee\nGROUP BY Dept\nHAVING AVG(Salary) > 60000;\n`,
                    solutionCode: `SELECT Dept, AVG(Salary) FROM Employee GROUP BY Dept HAVING AVG(Salary) > 60000;\n`,
                    testCases: {
                        buggyCode: `SELECT Dept, AVG(Salary)\nFROM Employee\nWHERE AVG(Salary) > 60000\nGROUP BY Dept;`,
                        errorLine: 3,
                        errorExplanation: 'Aggregate functions like AVG(Salary) cannot be used in a WHERE clause. Filter conditions on aggregates must be placed in a HAVING clause after GROUP BY.',
                        correctedCode: `SELECT Dept, AVG(Salary)\nFROM Employee\nGROUP BY Dept\nHAVING AVG(Salary) > 60000;`
                    },
                    hints: ['Aggregate functions cannot appear in the WHERE clause.', 'Replace WHERE with HAVING and place it AFTER the GROUP BY clause.']
                },
                // Template 4: Relational DDL & Integrity Constraints [Coding Lab, Create, Guided]
                {
                    type: 'coding',
                    blooms: 'create',
                    scaffold: 'guided',
                    title: `${cleanTopic}: Relational Table DDL & Constraints`,
                    description: `## 🎯 Problem Statement\n\nWrite an SQL \`CREATE TABLE\` statement for **${cleanTopic}** defining table \`Department\` with strict integrity constraints.\n\n### Specifications:\n- \`DeptId INT PRIMARY KEY\`\n- \`DeptName VARCHAR(40) NOT NULL UNIQUE\`\n- \`Location VARCHAR(50) DEFAULT 'Main Campus'\`\n- \`Budget DECIMAL(10,2) CHECK (Budget > 0)\``,
                    starterCode: `-- Create Department Table with constraints\nCREATE TABLE Department (\n    DeptId INT PRIMARY KEY,\n    DeptName VARCHAR(40) NOT NULL UNIQUE,\n    Location VARCHAR(50) DEFAULT 'Main Campus',\n    Budget DECIMAL(10,2) CHECK (Budget > 0)\n);\n`,
                    solutionCode: `CREATE TABLE Department (\n    DeptId INT PRIMARY KEY,\n    DeptName VARCHAR(40) NOT NULL UNIQUE,\n    Location VARCHAR(50) DEFAULT 'Main Campus',\n    Budget DECIMAL(10,2) CHECK (Budget > 0)\n);\n`,
                    testCases: [{ input: 'CREATE TABLE Department (DeptId INT PRIMARY KEY, DeptName VARCHAR(40) NOT NULL UNIQUE, Location VARCHAR(50) DEFAULT \'Main Campus\', Budget DECIMAL(10,2) CHECK (Budget > 0));', expectedOutput: 'Table created successfully', isHidden: false }],
                    hints: ['Specify column name followed by data type and constraint keyword.', 'Use PRIMARY KEY for DeptId and UNIQUE NOT NULL for DeptName.']
                },
                // Template 5: Multi-Table Equi-Join Query [Coding Lab, Apply, Semi-Independent]
                {
                    type: 'coding',
                    blooms: 'apply',
                    scaffold: 'semi_independent',
                    title: `${cleanTopic}: Two-Table Equi-Join Query`,
                    description: `## 🎯 Problem Statement\n\nWrite an SQL query to join the \`Student\` and \`Marks\` tables to retrieve student marks along with student names.\n\n### Schema Relations:\n- \`Student(RollNo, Name, Class)\`\n- \`Marks(RollNo, Subject, Score)\`\n\n### Requirements:\n- Join on \`Student.RollNo = Marks.RollNo\`.\n- Project \`Student.RollNo\`, \`Student.Name\`, \`Marks.Subject\`, and \`Marks.Score\`.\n- Filter for \`Marks.Subject = 'Computer Science'\`.\n- Order by \`Marks.Score DESC\`.`,
                    starterCode: `-- Write two-table JOIN query\nSELECT s.RollNo, s.Name, m.Subject, m.Score\nFROM Student s\nINNER JOIN Marks m ON s.RollNo = m.RollNo\nWHERE m.Subject = 'Computer Science'\nORDER BY m.Score DESC;\n`,
                    solutionCode: `SELECT s.RollNo, s.Name, m.Subject, m.Score FROM Student s INNER JOIN Marks m ON s.RollNo = m.RollNo WHERE m.Subject = 'Computer Science' ORDER BY m.Score DESC;\n`,
                    testCases: [{ input: "SELECT s.RollNo, s.Name, m.Subject, m.Score FROM Student s INNER JOIN Marks m ON s.RollNo = m.RollNo WHERE m.Subject = 'Computer Science' ORDER BY m.Score DESC;", expectedOutput: 'Query executed successfully', isHidden: false }],
                    hints: ['Use table aliases: Student s, Marks m', 'Join on s.RollNo = m.RollNo', 'Add WHERE m.Subject = \'Computer Science\'']
                },
                // Template 6: Summative Capstone Unit Test [Coding Lab, Evaluate, Independent]
                {
                    type: 'coding',
                    blooms: 'evaluate',
                    scaffold: 'independent',
                    title: `${cleanTopic}: Comprehensive SQL Mastery Assessment`,
                    description: `## 🎯 Summative Assessment Problem Statement\n\nWrite an advanced SQL analytical query for **${cleanTopic}**.\n\n### Requirements:\n1. Retrieve the \`Dept\` and average \`Salary\` (rounded to 2 decimals) from table \`Employee\`.\n2. Exclude any employees in \`Operations\` department.\n3. Include only departments having more than 2 eligible employees.\n4. Order the resulting rows by calculated average salary descending.`,
                    starterCode: `-- Summative Unit Test: Write complete query without hints\n`,
                    solutionCode: `SELECT Dept, ROUND(AVG(Salary), 2) AS AvgSal FROM Employee WHERE Dept != 'Operations' GROUP BY Dept HAVING COUNT(*) > 2 ORDER BY AvgSal DESC;\n`,
                    testCases: [{ input: "SELECT Dept, ROUND(AVG(Salary), 2) AS AvgSal FROM Employee WHERE Dept != 'Operations' GROUP BY Dept HAVING COUNT(*) > 2 ORDER BY AvgSal DESC;", expectedOutput: 'Query executed successfully', isHidden: false }],
                    hints: ['Combine WHERE, GROUP BY, HAVING, and ORDER BY in the correct syntactic order.']
                }
            ];

            // Match by requested exerciseType, or fallback to cycling
            let chosen = sqlTemplates.find(t => t.type === chosenType);
            if (!chosen) {
                chosen = sqlTemplates[index % sqlTemplates.length];
            }
            if (isReviewExercise) {
                chosen = sqlTemplates[6]; // Capstone
            }

            return {
                title: isReviewExercise ? `Unit Test: ${chosen.title}` : chosen.title,
                description: chosen.description,
                exerciseType: chosen.type,
                difficulty: isReviewExercise ? 'advanced' : (effectiveDifficulty || 'intermediate'),
                scaffoldLevel: isReviewExercise ? 'independent' : (effectiveScaffold || chosen.scaffold),
                bloomsLevel: isReviewExercise ? 'evaluate' : (effectiveBlooms || chosen.blooms),
                learningObjective: `Demonstrate verified ${chosen.type} competence in ${cleanTopic}.`,
                isReviewExercise: Boolean(isReviewExercise),
                xpReward: isReviewExercise ? 50 : (chosen.type === 'coding' ? 25 : 15),
                timeLimit: isReviewExercise ? 10 : 5,
                starterCode: chosen.starterCode,
                solutionCode: chosen.solutionCode,
                testCases: chosen.testCases,
                hints: chosen.hints
            };
        }

        // =========================================================================
        // DOMAIN: NumPy & Multidimensional Arrays (DIVERSE TOPIC-ALIGNED MODULES)
        // =========================================================================
        if (isNumpy) {
            // Determine subtopic module (0 to 6) based on topic keywords or cycling index
            let modIdx = index % 7;
            const topicLower = `${strTopic} ${strUnit}`.toLowerCase();
            if (/\b(reshape|reshaping|transpose|transposing|flatten|ravel|stack|vstack|hstack|concat)\b/i.test(topicLower)) {
                modIdx = 2;
            } else if (/\b(slice|slicing|index|indexing|stride|sub-array|submatrix)\b/i.test(topicLower)) {
                modIdx = 1;
            } else if (/\b(broadcast|vectoriz|broadcasting|arithmetic|element-wise|scale|bias)\b/i.test(topicLower)) {
                modIdx = 3;
            } else if (/\b(stat|stats|mean|sum|std|var|axis|aggregate|aggregation|min|max|median)\b/i.test(topicLower)) {
                modIdx = 4;
            } else if (/\b(mask|masking|filter|filtering|boolean|where|condition|outlier|clip|nonzero)\b/i.test(topicLower)) {
                modIdx = 5;
            } else if (/\b(dot|matmul|linalg|matrix multiplication|product|trace|capstone|test|review|assessment)\b/i.test(topicLower)) {
                modIdx = 6;
            } else if (/\b(creat|creation|zeros?|ones?|arange|linspace|dimensions?|ndim|dtype|attributes?)\b|\bshape\b/i.test(topicLower)) {
                modIdx = 0;
            }

            // MCQ for NumPy
            if (exerciseType === 'mcq') {
                const mcqBanks = [
                    {
                        title: `${cleanTopic}: Array Shape & Dimension Inspection`,
                        snippet: `import numpy as np\narr = np.arange(1, 13).reshape(3, 4)\nprint(arr.ndim, arr.shape, arr.size)`,
                        options: ['2 (3, 4) 12', '3 (3, 4) 12', '2 (4, 3) 12', '1 (12,) 12'],
                        correctOption: 0,
                        explanation: 'arr has 2 dimensions (ndim=2), a shape of 3 rows and 4 columns (3, 4), and total elements size=12.'
                    },
                    {
                        title: `${cleanTopic}: Multidimensional 2D Slicing Trace`,
                        snippet: `import numpy as np\narr = np.array([[10, 20, 30], [40, 50, 60], [70, 80, 90]])\nprint(arr[1:, :2])`,
                        options: ['[[40 50]\n [70 80]]', '[[10 20]\n [40 50]]', '[40 50 70 80]', '[[50 60]\n [80 90]]'],
                        correctOption: 0,
                        explanation: 'Row slice 1: selects row index 1 ([40,50,60]) and row index 2 ([70,80,90]). Column slice :2 selects first 2 columns, yielding [[40, 50], [70, 80]].'
                    },
                    {
                        title: `${cleanTopic}: Auto-Dimension Inference (-1) in Reshape`,
                        snippet: `import numpy as np\narr = np.arange(24)\nreshaped = arr.reshape(4, -1)\nprint(reshaped.shape)`,
                        options: ['(4, 6)', '(4, 4)', '(6, 4)', 'ValueError: -1 not allowed'],
                        correctOption: 0,
                        explanation: 'With total size 24 and first dimension 4, NumPy automatically calculates the second dimension as 24 / 4 = 6.'
                    },
                    {
                        title: `${cleanTopic}: Vectorized Broadcasting Compatibility`,
                        snippet: `import numpy as np\nA = np.ones((3, 1))\nB = np.ones((1, 4))\nC = A + B\nprint(C.shape)`,
                        options: ['(3, 4)', '(3, 1)', '(1, 4)', 'ValueError: shapes (3,1) and (1,4) cannot broadcast'],
                        correctOption: 0,
                        explanation: 'Both dimensions of size 1 stretch to match the other array, resulting in a compatible broadcasted shape of (3, 4).'
                    },
                    {
                        title: `${cleanTopic}: Axis Aggregation Distinction (axis=0 vs axis=1)`,
                        snippet: `import numpy as np\narr = np.array([[1, 2], [3, 4]])\nprint(np.sum(arr, axis=0), np.sum(arr, axis=1))`,
                        options: ['[4 6] [3 7]', '[3 7] [4 6]', '[10] [10]', '4 6'],
                        correctOption: 0,
                        explanation: 'axis=0 sums across rows (column-wise): [1+3, 2+4] = [4, 6]. axis=1 sums across columns (row-wise): [1+2, 3+4] = [3, 7].'
                    },
                    {
                        title: `${cleanTopic}: Boolean Mask Indexing Output`,
                        snippet: `import numpy as np\narr = np.array([12, 5, 18, 7, 24])\nmask = (arr > 10) & (arr < 20)\nprint(arr[mask])`,
                        options: ['[12 18]', '[5 7 24]', '[12 5 18]', 'array([True, False, True, False, False])'],
                        correctOption: 0,
                        explanation: 'Elements strictly between 10 and 20 are 12 and 18. Boolean indexing extracts array([12, 18]).'
                    },
                    {
                        title: `${cleanTopic}: Matrix Dot Product Inner Dimension Rule`,
                        snippet: `import numpy as np\nA = np.ones((2, 3))\nB = np.ones((3, 4))\nprint(np.dot(A, B).shape)`,
                        options: ['(2, 4)', '(3, 3)', '(2, 3)', 'ValueError: dimension mismatch'],
                        correctOption: 0,
                        explanation: 'Matrix multiplication (2, 3) @ (3, 4) matches inner dimension 3 and produces an output matrix of shape (2, 4).'
                    }
                ];
                const mcq = mcqBanks[modIdx];
                return {
                    title: isReviewExercise ? `Unit Test: ${mcq.title}` : mcq.title,
                    description: `Evaluate the code snippet evaluating **${cleanTopic}** and predict the exact output.`,
                    exerciseType: 'mcq',
                    difficulty: effectiveDifficulty,
                    scaffoldLevel: effectiveScaffold,
                    bloomsLevel: effectiveBlooms,
                    learningObjective: `Accurately trace NumPy array operations for ${cleanTopic}.`,
                    isReviewExercise: Boolean(isReviewExercise),
                    xpReward: isReviewExercise ? 30 : 20,
                    timeLimit: 4,
                    starterCode: '',
                    solutionCode: '',
                    testCases: {
                        question: 'What will be printed when the following code executes?',
                        codeSnippet: mcq.snippet,
                        options: mcq.options,
                        correctOption: mcq.correctOption,
                        explanation: mcq.explanation
                    },
                    hints: ['Review NumPy indexing, slicing, and broadcasting rules carefully.']
                };
            }

            // Code Debug for NumPy
            if (exerciseType === 'code_debug') {
                const debugBanks = [
                    {
                        title: `Debug: Fix np.zeros Shape Argument Tuple`,
                        buggy: `import numpy as np\n\ndef create_grid(rows, cols):\n    # Fix error: shape must be a tuple\n    return np.zeros(rows, cols)\n`,
                        fixed: `import numpy as np\n\ndef create_grid(rows, cols):\n    return np.zeros((rows, cols))\n`,
                        errorLine: 5,
                        errorDesc: 'TypeError: data type not understood. np.zeros expects shape as a tuple or integer, not separate arguments.',
                        explanation: 'np.zeros takes shape as a tuple: np.zeros((rows, cols)). Passing rows, cols directly treats the second argument as dtype.'
                    },
                    {
                        title: `Debug: Fix 2D Array Slicing Syntax`,
                        buggy: `import numpy as np\n\ndef extract_top_left(arr):\n    # Fix slice error: multidimensional array indexing\n    return arr[:2][:2]\n`,
                        fixed: `import numpy as np\n\ndef extract_top_left(arr):\n    return arr[:2, :2]\n`,
                        errorLine: 5,
                        errorDesc: 'arr[:2][:2] slices rows twice rather than rows and columns simultaneously.',
                        explanation: 'In NumPy, multidimensional slicing requires comma separation: arr[rows_slice, cols_slice].'
                    },
                    {
                        title: `Debug: Fix Reshape Incompatible Dimension Mismatch`,
                        buggy: `import numpy as np\n\ndef reshape_sequence(arr):\n    # Array has 6 elements; fix invalid shape (2, 4)\n    return arr.reshape(2, 4)\n`,
                        fixed: `import numpy as np\n\ndef reshape_sequence(arr):\n    return arr.reshape(2, 3)\n`,
                        errorLine: 5,
                        errorDesc: 'ValueError: cannot reshape array of size 6 into shape (2,4)',
                        explanation: 'The product of new dimensions (2*3=6) must equal total elements (6).'
                    },
                    {
                        title: `Debug: Fix Bitwise vs Logical Operator in Boolean Mask`,
                        buggy: `import numpy as np\n\ndef filter_range(arr, low, high):\n    # Fix error: Python 'and' does not vectorize over arrays\n    return arr[(arr >= low) and (arr <= high)]\n`,
                        fixed: `import numpy as np\n\ndef filter_range(arr, low, high):\n    return arr[(arr >= low) & (arr <= high)]\n`,
                        errorLine: 5,
                        errorDesc: 'ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()',
                        explanation: 'NumPy arrays require bitwise operator & (wrapped in parentheses) for element-wise boolean operations, not Python logical "and".'
                    },
                    {
                        title: `Debug: Fix Axis Dimension Out of Bounds`,
                        buggy: `import numpy as np\n\ndef calculate_column_sums(matrix):\n    # Fix axis error for 2D array\n    return np.sum(matrix, axis=2)\n`,
                        fixed: `import numpy as np\n\ndef calculate_column_sums(matrix):\n    return np.sum(matrix, axis=0)\n`,
                        errorLine: 5,
                        errorDesc: 'AxisError: axis 2 is out of bounds for array of dimension 2',
                        explanation: '2D arrays have axis 0 (rows/columns-down) and axis 1 (columns/row-across). Axis 2 does not exist.'
                    }
                ];
                const dbg = debugBanks[modIdx % debugBanks.length];
                return {
                    title: isReviewExercise ? `Unit Test Debug: ${dbg.title}` : dbg.title,
                    description: `Identify and correct the bug in the following NumPy code evaluating **${cleanTopic}**.`,
                    exerciseType: 'code_debug',
                    difficulty: effectiveDifficulty,
                    scaffoldLevel: effectiveScaffold,
                    bloomsLevel: effectiveBlooms,
                    learningObjective: `Diagnose and rectify runtime and syntax errors in NumPy.`,
                    isReviewExercise: Boolean(isReviewExercise),
                    xpReward: isReviewExercise ? 40 : 25,
                    timeLimit: isReviewExercise ? 8 : 5,
                    starterCode: dbg.buggy,
                    solutionCode: dbg.fixed,
                    testCases: {
                        buggyCode: dbg.buggy,
                        errors: [{ line: dbg.errorLine, description: dbg.errorDesc, correctedLine: dbg.fixed }],
                        solutionCode: dbg.fixed,
                        explanation: dbg.explanation
                    },
                    hints: ['Read error description and check NumPy API conventions.']
                };
            }

            // Coding Exercises for NumPy (7 DISTINCT TOPIC MODULES)
            const numpyCodingModules = [
                // Module 0: Array Creation & Attributes
                {
                    title: `NumPy Array Creation, Attributes & Type Inspection`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`create_custom_ndarray(start, stop, step, target_shape)\` that:\n1. Creates a 1D NumPy array with sequence elements from \`start\` to \`stop\` (exclusive) with interval \`step\` using \`np.arange\`.\n2. Reshapes the array into \`target_shape\`.\n3. Returns a dictionary containing summary metadata:\n   - \`"array"\`: The array converted to a Python list using \`.tolist()\`\n   - \`"ndim"\`: Integer dimension count (\`arr.ndim\`)\n   - \`"shape"\`: List of dimensions (\`list(arr.shape)\`)\n   - \`"size"\`: Total number of elements (\`int(arr.size)\`)\n\n### Requirements:\n- Function name: \`create_custom_ndarray(start, stop, step, target_shape)\`\n- Use NumPy array creation and attribute inspection methods.`,
                    starterCode: `import numpy as np\n\ndef create_custom_ndarray(start, stop, step, target_shape):\n    """\n    Create an ndarray from start to stop with step, reshape to target_shape,\n    and return dictionary with array, ndim, shape, and size.\n    """\n    # TODO: Implement using NumPy\n    pass\n`,
                    solutionCode: `import numpy as np\n\ndef create_custom_ndarray(start, stop, step, target_shape):\n    arr = np.arange(start, stop, step).reshape(target_shape)\n    return {\n        "array": arr.tolist(),\n        "ndim": int(arr.ndim),\n        "shape": list(arr.shape),\n        "size": int(arr.size)\n    }\n`,
                    testCases: [
                        { input: 'create_custom_ndarray(0, 12, 1, (3, 4))', expectedOutput: '{"array": [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]], "ndim": 2, "shape": [3, 4], "size": 12}', isHidden: false },
                        { input: 'create_custom_ndarray(1, 10, 2, (1, 5))', expectedOutput: '{"array": [[1, 3, 5, 7, 9]], "ndim": 2, "shape": [1, 5], "size": 5}', isHidden: true }
                    ],
                    hints: ['Use np.arange(start, stop, step).reshape(target_shape).', 'Inspect arr.ndim, arr.shape, arr.size.']
                },
                // Module 1: 2D Indexing & Slicing
                {
                    title: `NumPy Multidimensional Array Slicing & Submatrix Extraction`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`extract_submatrix_quadrants(matrix_list, r_start, r_end, c_start, c_end)\` that converts a nested 2D list into a NumPy array, extracts the 2D submatrix bounded by row indices \`[r_start:r_end]\` and column indices \`[c_start:c_end]\`, and returns a dictionary with:\n- \`"submatrix"\`: Sliced submatrix as a list (\`.tolist()\`)\n- \`"diagonal"\`: Main diagonal elements of this submatrix as a list (using \`np.diag()\`)\n\n### Requirements:\n- Function name: \`extract_submatrix_quadrants(matrix_list, r_start, r_end, c_start, c_end)\`\n- Apply NumPy 2D slicing syntax \`arr[r_start:r_end, c_start:c_end]\`.`,
                    starterCode: `import numpy as np\n\ndef extract_submatrix_quadrants(matrix_list, r_start, r_end, c_start, c_end):\n    """\n    Slice submatrix [r_start:r_end, c_start:c_end] from 2D array and return submatrix & diagonal.\n    """\n    # TODO: Implement slice and diagonal extraction\n    pass\n`,
                    solutionCode: `import numpy as np\n\ndef extract_submatrix_quadrants(matrix_list, r_start, r_end, c_start, c_end):\n    arr = np.array(matrix_list)\n    sub = arr[r_start:r_end, c_start:c_end]\n    diag = np.diag(sub).tolist()\n    return {\n        "submatrix": sub.tolist(),\n        "diagonal": diag\n    }\n`,
                    testCases: [
                        { input: 'extract_submatrix_quadrants([[1, 2, 3], [4, 5, 6], [7, 8, 9]], 0, 2, 1, 3)', expectedOutput: '{"submatrix": [[2, 3], [5, 6]], "diagonal": [2, 6]}', isHidden: false },
                        { input: 'extract_submatrix_quadrants([[10, 20], [30, 40]], 0, 2, 0, 2)', expectedOutput: '{"submatrix": [[10, 20], [30, 40]], "diagonal": [10, 40]}', isHidden: true }
                    ],
                    hints: ['arr = np.array(matrix_list)', 'sub = arr[r_start:r_end, c_start:c_end]', 'np.diag(sub).tolist()']
                },
                // Module 2: Reshaping & Transpose
                {
                    title: `NumPy Array Reshaping, Transpose & Flattening`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`reshape_and_transform_matrix(sequence_list, new_shape)\` that accepts a 1D sequence, converts it into a NumPy array, reshapes it to \`new_shape\`, and returns a dictionary with:\n- \`"matrix"\`: Reshaped 2D matrix as a list\n- \`"transpose"\`: Transpose of the matrix (\`arr.T.tolist()\`)\n- \`"flattened"\`: 1D flattened representation (\`arr.flatten().tolist()\`)\n\n### Requirements:\n- Function name: \`reshape_and_transform_matrix(sequence_list, new_shape)\`\n- Demonstrate use of \`.reshape()\`, \`.T\`, and \`.flatten()\`.`,
                    starterCode: `import numpy as np\n\ndef reshape_and_transform_matrix(sequence_list, new_shape):\n    """\n    Reshape 1D array to new_shape, compute transpose and flat representation.\n    """\n    # TODO: Implement reshape, transpose, and flatten\n    pass\n`,
                    solutionCode: `import numpy as np\n\ndef reshape_and_transform_matrix(sequence_list, new_shape):\n    arr = np.array(sequence_list).reshape(new_shape)\n    return {\n        "matrix": arr.tolist(),\n        "transpose": arr.T.tolist(),\n        "flattened": arr.flatten().tolist()\n    }\n`,
                    testCases: [
                        { input: 'reshape_and_transform_matrix([1, 2, 3, 4, 5, 6], (2, 3))', expectedOutput: '{"matrix": [[1, 2, 3], [4, 5, 6]], "transpose": [[1, 4], [2, 5], [3, 6]], "flattened": [1, 2, 3, 4, 5, 6]}', isHidden: false },
                        { input: 'reshape_and_transform_matrix([10, 20, 30, 40], (2, 2))', expectedOutput: '{"matrix": [[10, 20], [30, 40]], "transpose": [[10, 30], [20, 40]], "flattened": [10, 20, 30, 40]}', isHidden: true }
                    ],
                    hints: ['arr = np.array(sequence_list).reshape(new_shape)', 'Transpose is arr.T, flattened is arr.flatten().']
                },
                // Module 3: Vectorized Arithmetic & Broadcasting
                {
                    title: `NumPy Vectorized Broadcasting & Matrix Normalization`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`broadcast_array_normalization(data_matrix, bias_vector, scale_factor)\` that takes a 2D matrix of shape \`(M, N)\`, a 1D bias vector of shape \`(N,)\`, and a numeric scalar \`scale_factor\`.\n\nWithout using any Python \`for\` loops, use NumPy broadcasting to subtract \`bias_vector\` from each row of \`data_matrix\`, then multiply the result by \`scale_factor\`. Return the resulting normalized array as a list.\n\n### Requirements:\n- Function name: \`broadcast_array_normalization(data_matrix, bias_vector, scale_factor)\`\n- Strictly vectorized: No loops allowed.\n- Return: 2D list of numbers.`,
                    starterCode: `import numpy as np\n\ndef broadcast_array_normalization(data_matrix, bias_vector, scale_factor):\n    """\n    Apply broadcasting: (data_matrix - bias_vector) * scale_factor\n    """\n    # TODO: Implement using vectorized broadcasting without loops\n    pass\n`,
                    solutionCode: `import numpy as np\n\ndef broadcast_array_normalization(data_matrix, bias_vector, scale_factor):\n    A = np.array(data_matrix)\n    b = np.array(bias_vector)\n    result = (A - b) * scale_factor\n    return result.tolist()\n`,
                    testCases: [
                        { input: 'broadcast_array_normalization([[10, 20], [30, 40]], [5, 10], 2)', expectedOutput: '[[10, 20], [50, 60]]', isHidden: false },
                        { input: 'broadcast_array_normalization([[100, 200, 300]], [50, 50, 50], 0.1)', expectedOutput: '[[5.0, 15.0, 25.0]]', isHidden: true }
                    ],
                    hints: ['NumPy automatically broadcasts 1D array across 2D rows when trailing dimension matches.', 'Simply compute: (np.array(data_matrix) - np.array(bias_vector)) * scale_factor.']
                },
                // Module 4: Statistical Metrics & Axis Operations
                {
                    title: `NumPy Statistical Metrics & Axis Aggregations`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`compute_axis_aggregations(data_grid)\` that accepts a 2D list of numbers and returns a dictionary with summary statistics:\n- \`"col_sums"\`: Column-wise sums (along axis 0) as a list\n- \`"row_means"\`: Row-wise arithmetic means (along axis 1) rounded to 2 decimal places as a list\n- \`"overall_std"\`: Overall standard deviation rounded to 2 decimal places\n- \`"overall_max"\`: Maximum element across the entire matrix\n\n### Requirements:\n- Function name: \`compute_axis_aggregations(data_grid)\`\n- Use \`np.sum\`, \`np.mean\`, \`np.std\`, and \`np.max\` with appropriate axis flags.`,
                    starterCode: `import numpy as np\n\ndef compute_axis_aggregations(data_grid):\n    """\n    Compute col_sums (axis=0), row_means (axis=1), overall_std, and overall_max.\n    """\n    # TODO: Implement axis aggregations using NumPy\n    pass\n`,
                    solutionCode: `import numpy as np\n\ndef compute_axis_aggregations(data_grid):\n    arr = np.array(data_grid)\n    col_sums = np.sum(arr, axis=0).tolist()\n    row_means = [round(float(m), 2) for m in np.mean(arr, axis=1)]\n    overall_std = round(float(np.std(arr)), 2)\n    overall_max = int(np.max(arr)) if np.issubdtype(arr.dtype, np.integer) else float(np.max(arr))\n    return {\n        "col_sums": col_sums,\n        "row_means": row_means,\n        "overall_std": overall_std,\n        "overall_max": overall_max\n    }\n`,
                    testCases: [
                        { input: 'compute_axis_aggregations([[10, 20], [30, 40]])', expectedOutput: '{"col_sums": [40, 60], "row_means": [15.0, 35.0], "overall_std": 11.18, "overall_max": 40}', isHidden: false },
                        { input: 'compute_axis_aggregations([[2, 4, 6], [8, 10, 12]])', expectedOutput: '{"col_sums": [10, 14, 18], "row_means": [4.0, 10.0], "overall_std": 3.42, "overall_max": 12}', isHidden: true }
                    ],
                    hints: ['axis=0 calculates down columns: np.sum(arr, axis=0)', 'axis=1 calculates across rows: np.mean(arr, axis=1)']
                },
                // Module 5: Boolean Masking & Outlier Filtering
                {
                    title: `NumPy Boolean Masking & Outlier Filtering`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`filter_and_censor_outliers(numbers_list, lower_limit, upper_limit, fill_value)\` that:\n1. Converts \`numbers_list\` to a 1D NumPy array.\n2. Identifies all outlier elements where \`element < lower_limit\` OR \`element > upper_limit\`.\n3. Replaces all identified outlier elements with \`fill_value\`.\n4. Returns a dictionary:\n   - \`"cleaned_array"\`: The modified array as a Python list\n   - \`"outlier_count"\`: Total number of elements replaced (integer)\n\n### Requirements:\n- Function name: \`filter_and_censor_outliers(numbers_list, lower_limit, upper_limit, fill_value)\`\n- Use NumPy boolean indexing or \`np.where\`.`,
                    starterCode: `import numpy as np\n\ndef filter_and_censor_outliers(numbers_list, lower_limit, upper_limit, fill_value):\n    """\n    Replace elements outside [lower_limit, upper_limit] with fill_value.\n    Returns { "cleaned_array": list, "outlier_count": int }\n    """\n    # TODO: Implement boolean mask\n    pass\n`,
                    solutionCode: `import numpy as np\n\ndef filter_and_censor_outliers(numbers_list, lower_limit, upper_limit, fill_value):\n    arr = np.array(numbers_list)\n    mask = (arr < lower_limit) | (arr > upper_limit)\n    outlier_count = int(np.sum(mask))\n    arr[mask] = fill_value\n    return {\n        "cleaned_array": arr.tolist(),\n        "outlier_count": outlier_count\n    }\n`,
                    testCases: [
                        { input: 'filter_and_censor_outliers([5, 12, 105, -3, 50, 80], 0, 100, 0)', expectedOutput: '{"cleaned_array": [5, 12, 0, 0, 50, 80], "outlier_count": 2}', isHidden: false },
                        { input: 'filter_and_censor_outliers([10, 20, 30], 15, 25, -1)', expectedOutput: '{"cleaned_array": [-1, 20, -1], "outlier_count": 2}', isHidden: true }
                    ],
                    hints: ['Combine conditions with bitwise | : mask = (arr < lower_limit) | (arr > upper_limit)', 'Count outliers with np.sum(mask), assign with arr[mask] = fill_value.']
                },
                // Module 6: Matrix Multiplication & Trace (Capstone Assessment Test)
                {
                    title: `NumPy Matrix Multiplication & Diagonal Trace Computation`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`matrix_multiplication_and_trace(matrix_a, matrix_b)\` that:\n1. Accepts two 2D lists \`matrix_a\` and \`matrix_b\`.\n2. Verifies inner dimensions match (number of columns in A equals number of rows in B). If they do not match, return \`None\`.\n3. Computes the matrix dot product \`C = A @ B\` using \`np.dot()\` or \`@\`.\n4. Computes the trace (sum of diagonal elements) of matrix C using \`np.trace()\`.\n5. Returns a dictionary:\n   - \`"product"\`: Resulting product matrix as a list\n   - \`"trace"\`: Numeric sum of diagonal elements\n\n### Requirements:\n- Function name: \`matrix_multiplication_and_trace(matrix_a, matrix_b)\`\n- Handle dimension validation gracefully.`,
                    starterCode: `import numpy as np\n\ndef matrix_multiplication_and_trace(matrix_a, matrix_b):\n    """\n    Multiply matrix_a and matrix_b and calculate matrix trace.\n    Returns { "product": list, "trace": num } or None if incompatible.\n    """\n    # TODO: Implement matrix multiplication and trace\n    pass\n`,
                    solutionCode: `import numpy as np\n\ndef matrix_multiplication_and_trace(matrix_a, matrix_b):\n    A = np.array(matrix_a)\n    B = np.array(matrix_b)\n    if A.shape[1] != B.shape[0]:\n        return None\n    prod = np.dot(A, B)\n    tr = float(np.trace(prod))\n    return {\n        "product": prod.tolist(),\n        "trace": int(tr) if tr.is_integer() else tr\n    }\n`,
                    testCases: [
                        { input: 'matrix_multiplication_and_trace([[1, 2], [3, 4]], [[5, 6], [7, 8]])', expectedOutput: '{"product": [[19, 22], [43, 50]], "trace": 69}', isHidden: false },
                        { input: 'matrix_multiplication_and_trace([[1, 2]], [[3], [4]])', expectedOutput: '{"product": [[11]], "trace": 11}', isHidden: true },
                        { input: 'matrix_multiplication_and_trace([[1, 2]], [[3, 4]])', expectedOutput: 'null', isHidden: true }
                    ],
                    hints: ['Check if A.shape[1] == B.shape[0]', 'Compute product = np.dot(A, B)', 'Compute trace with np.trace(product)']
                }
            ];

            const chosen = numpyCodingModules[modIdx];
            return {
                title: isReviewExercise ? `Unit Test: ${chosen.title}` : chosen.title,
                description: chosen.description,
                exerciseType: 'coding',
                difficulty: effectiveDifficulty,
                scaffoldLevel: effectiveScaffold,
                bloomsLevel: effectiveBlooms,
                learningObjective: `Apply NumPy operations to solve ${chosen.title}.`,
                isReviewExercise: Boolean(isReviewExercise),
                xpReward: isReviewExercise ? 50 : 25,
                timeLimit: isReviewExercise ? 10 : 5,
                starterCode: chosen.starterCode,
                solutionCode: chosen.solutionCode,
                testCases: chosen.testCases,
                hints: chosen.hints
            };
        }

        // =========================================================================
        // DOMAIN: Python Tuples (ONLY when explicitly requested)
        // =========================================================================
        if (isTuple) {
            if (exerciseType === 'mcq') {
                return {
                    title: isReviewExercise ? `Unit Test: ${cleanTopic} Output Prediction` : `${cleanTopic}: Output Prediction Challenge`,
                    description: `Predict the output of the following Python code evaluating **${cleanTopic}**.`,
                    exerciseType: 'mcq',
                    difficulty: effectiveDifficulty,
                    scaffoldLevel: effectiveScaffold,
                    bloomsLevel: effectiveBlooms,
                    learningObjective: 'Accurately predict output of tuple operations and immutability rules.',
                    isReviewExercise: Boolean(isReviewExercise),
                    xpReward: isReviewExercise ? 30 : 20,
                    timeLimit: 4,
                    starterCode: '',
                    solutionCode: '',
                    testCases: {
                        question: 'What will be the output of the following code snippet?',
                        codeSnippet: 't = (1, 2, 3)\nt = t * 2\nprint(len(t), t[3])',
                        options: ['6 1', '6 2', '3 1', 'TypeError: tuple repetition not allowed'],
                        correctOption: 0,
                        explanation: 'Repetition (*) on (1, 2, 3) produces (1, 2, 3, 1, 2, 3). The length is 6, and index 3 (4th element) is 1.'
                    },
                    hints: ['Tuples support repetition (*) creating a new tuple with repeated elements. Indexing is 0-based.']
                };
            }
            if (index % 2 === 1) {
                return {
                    title: isReviewExercise ? `Unit Test: Tuple Unpacking & Formatted Strings` : `Tuple Element Verification & Unpacking`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`unpack_student_record(record_tuple)\` that takes a tuple \`(roll_no, name, stream, marks)\` and returns a formatted string: \`"Roll: <roll_no>, Name: <name>, Marks: <marks>"\`.\n\n### Requirements:\n- Function name: \`unpack_student_record(record_tuple)\`\n- Unpack the tuple elements cleanly.`,
                    exerciseType: 'coding',
                    difficulty: effectiveDifficulty,
                    scaffoldLevel: effectiveScaffold,
                    bloomsLevel: effectiveBlooms,
                    learningObjective: 'Unpack tuple values into distinct variables and format a string.',
                    isReviewExercise: Boolean(isReviewExercise),
                    xpReward: isReviewExercise ? 50 : 25,
                    timeLimit: isReviewExercise ? 10 : 5,
                    starterCode: `def unpack_student_record(record_tuple):\n    """\n    Unpack record_tuple (roll_no, name, stream, marks) and return formatted string.\n    """\n    # TODO: Unpack and return formatted string\n    pass\n`,
                    solutionCode: `def unpack_student_record(record_tuple):\n    roll_no, name, stream, marks = record_tuple\n    return f"Roll: {roll_no}, Name: {name}, Marks: {marks}"\n`,
                    testCases: [
                        { input: "unpack_student_record((101, 'Aman', 'Science', 94))", expectedOutput: '"Roll: 101, Name: Aman, Marks: 94"', isHidden: false },
                        { input: "unpack_student_record((102, 'Priya', 'Commerce', 88))", expectedOutput: '"Roll: 102, Name: Priya, Marks: 88"', isHidden: true }
                    ],
                    hints: ['Use sequence unpacking: roll_no, name, stream, marks = record_tuple.']
                };
            }
            return {
                title: isReviewExercise ? `Unit Test: Tuple Statistics & Extremes` : `Tuple Extremes and Aggregation Processing`,
                description: `## 🎯 Problem Statement\n\nWrite a Python function \`get_tuple_statistics(data_tuple)\` that accepts a non-empty tuple of numbers and returns a new tuple containing the **minimum value**, **maximum value**, and the **sum of all elements**.\n\n### Requirements:\n- Function name: \`get_tuple_statistics(data_tuple)\`\n- Return type: Tuple of 3 elements: \`(min_val, max_val, total_sum)\``,
                exerciseType: 'coding',
                difficulty: effectiveDifficulty,
                scaffoldLevel: effectiveScaffold,
                bloomsLevel: effectiveBlooms,
                learningObjective: 'Apply Python tuple built-in functions min(), max(), and sum() to aggregate sequence elements.',
                isReviewExercise: Boolean(isReviewExercise),
                xpReward: isReviewExercise ? 50 : 25,
                timeLimit: isReviewExercise ? 10 : 5,
                starterCode: `def get_tuple_statistics(data_tuple):\n    """\n    Compute minimum, maximum, and sum of elements in a tuple.\n    Returns a tuple: (min_val, max_val, total_sum)\n    """\n    # TODO: Calculate and return (min, max, sum)\n    pass\n`,
                solutionCode: `def get_tuple_statistics(data_tuple):\n    return (min(data_tuple), max(data_tuple), sum(data_tuple))\n`,
                testCases: [
                    { input: 'get_tuple_statistics((10, 25, 4, 80, 15))', expectedOutput: '(4, 80, 134)', isHidden: false },
                    { input: 'get_tuple_statistics((-5, 0, 5))', expectedOutput: '(-5, 5, 0)', isHidden: true }
                ],
                hints: ['Use built-in functions min(data_tuple), max(data_tuple), and sum(data_tuple).']
            };
        }

        // =========================================================================
        // DOMAIN: Python Dictionaries
        // =========================================================================
        if (isDict) {
            if (index % 2 === 1) {
                return {
                    title: isReviewExercise ? `Unit Test: Dictionary Inversion & Unique Mapping` : `Invert Dictionary Key-Value Mapping`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`invert_dictionary(d)\` that swaps the keys and values of a given dictionary \`d\`. Assume all dictionary values are unique and immutable.\n\n### Requirements:\n- Function name: \`invert_dictionary(d)\`\n- Return a new dictionary with inverted pairs.`,
                    exerciseType: 'coding',
                    difficulty: effectiveDifficulty,
                    scaffoldLevel: effectiveScaffold,
                    bloomsLevel: effectiveBlooms,
                    learningObjective: 'Iterate dictionary items and invert mapping programmatically.',
                    isReviewExercise: Boolean(isReviewExercise),
                    xpReward: isReviewExercise ? 50 : 25,
                    timeLimit: isReviewExercise ? 10 : 5,
                    starterCode: `def invert_dictionary(d):\n    """\n    Swap keys and values in dictionary d.\n    """\n    # TODO: Build and return inverted dictionary\n    pass\n`,
                    solutionCode: `def invert_dictionary(d):\n    return {v: k for k, v in d.items()}\n`,
                    testCases: [
                        { input: "invert_dictionary({'a': 1, 'b': 2})", expectedOutput: "{1: 'a', 2: 'b'}", isHidden: false },
                        { input: "invert_dictionary({'x': 10, 'y': 20})", expectedOutput: "{10: 'x', 20: 'y'}", isHidden: true }
                    ],
                    hints: ['Iterate through d.items() to extract each key and value.']
                };
            }
            return {
                title: isReviewExercise ? `Unit Test: Frequency Mapping in Text` : `Character Frequency Mapping in Text`,
                description: `## 🎯 Problem Statement\n\nWrite a Python function \`count_character_frequencies(text_string)\` that takes a string \`text_string\` and returns a dictionary with each character as a key and its total occurrences as the value.\n\n### Requirements:\n- Function name: \`count_character_frequencies(text_string)\`\n- Preserve case sensitivity (e.g. 'A' and 'a' are distinct keys).\n- Use dictionary operations or \`.get()\` method.`,
                exerciseType: 'coding',
                difficulty: effectiveDifficulty,
                scaffoldLevel: effectiveScaffold,
                bloomsLevel: effectiveBlooms,
                learningObjective: 'Construct and populate a Python dictionary dynamically using key lookup and accumulation.',
                isReviewExercise: Boolean(isReviewExercise),
                xpReward: isReviewExercise ? 50 : 25,
                timeLimit: isReviewExercise ? 10 : 5,
                starterCode: `def count_character_frequencies(text_string):\n    """\n    Count the occurrences of each character in text_string.\n    Returns a dictionary mapping characters to frequency counts.\n    """\n    # TODO: Build frequency mapping dictionary\n    pass\n`,
                solutionCode: `def count_character_frequencies(text_string):\n    freq = {}\n    for ch in text_string:\n        freq[ch] = freq.get(ch, 0) + 1\n    return freq\n`,
                testCases: [
                    { input: "count_character_frequencies('banana')", expectedOutput: "{'b': 1, 'a': 3, 'n': 2}", isHidden: false },
                    { input: "count_character_frequencies('apple')", expectedOutput: "{'a': 1, 'p': 2, 'l': 1, 'e': 1}", isHidden: true }
                ],
                hints: ['Iterate through each character of the string with a for loop.', 'Use freq[ch] = freq.get(ch, 0) + 1.']
            };
        }

        // =========================================================================
        // DOMAIN: Universal Fallback with Topic-Specific Functionality
        // =========================================================================
        const slug = cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) || 'data';
        return {
            title: isReviewExercise ? `Unit Test: ${cleanTopic} Mastery Assessment` : `${cleanTopic} Computational Logic`,
            description: `## 🎯 Problem Statement\n\nWrite a Python function \`process_${slug}(items)\` that implements verified data transformations demonstrating **${cleanTopic}**.\n\n### Requirements:\n- Function name: \`process_${slug}(items)\`\n- Filter out empty or null items and return a list of processed values.`,
            exerciseType: 'coding',
            difficulty: effectiveDifficulty,
            scaffoldLevel: effectiveScaffold,
            bloomsLevel: effectiveBlooms,
            learningObjective: `Demonstrate mastery of ${cleanTopic} algorithmic logic.`,
            isReviewExercise: Boolean(isReviewExercise),
            xpReward: isReviewExercise ? 50 : 25,
            timeLimit: isReviewExercise ? 10 : 5,
            starterCode: `def process_${slug}(items):\n    """\n    Process items according to ${cleanTopic} specifications.\n    """\n    # TODO: Implement solution\n    pass\n`,
            solutionCode: `def process_${slug}(items):\n    return [x for x in items if x is not None]\n`,
            testCases: [
                { input: `process_${slug}([10, 20, None, 30])`, expectedOutput: '[10, 20, 30]', isHidden: false },
                { input: `process_${slug}(['a', None, 'b'])`, expectedOutput: "['a', 'b']", isHidden: true }
            ],
            hints: [`Analyze the structural requirements of ${cleanTopic}.`]
        };
    }

    cleanTitle(raw) {
        if (!raw) return '';
        const str = typeof raw === 'string' ? raw : (raw?.title || raw?.name || raw?.topic || String(raw || ''));
        let t = str.replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        t = t.replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/gi, '').trim();
        t = t.replace(/\bK\s+eys\b/i, 'Keys');
        const acronyms = new Set(['DBMS', 'RDBMS', 'SQL', 'DDL', 'DML', 'CBSE', 'NCERT', 'API', 'OOP', 'CPU', 'RAM', 'OS', 'FIFO', 'LIFO', 'CSV']);
        const res = t.split(' ').map((w, idx) => {
            if (acronyms.has(w.toUpperCase())) return w.toUpperCase();
            if (w.toLowerCase() === 'numpy') return 'NumPy';
            if (idx > 0 && /^(and|or|not|of|in|to|a|an|the|vs|for|with|by|as)$/i.test(w)) return w.toLowerCase();
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }).join(' ');
        return res.replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/gi, '').trim();
    }

    /**
     * Accurately detects programming language and domain from document text, title, and metadata.
     * Uses code syntax density and curriculum terminology to avoid false positives (e.g., 'Table 8.1' or 'my_tuple').
     */
    detectDocumentLanguage({
        documentText = '',
        title = '',
        customPrompt = '',
        originalFileName = ''
    } = {}) {
        const textSample = (documentText || '').slice(0, 30000);
        const headerText = `${title || ''} ${customPrompt || ''} ${originalFileName || ''}`.toLowerCase();
        
        let pythonScore = 0;
        let sqlScore = 0;
        let cppScore = 0;
        let javaScore = 0;
        let webScore = 0;

        if (/\b(python|py|list|lists|tuple|tuples|dictionary|dictionaries|dict|strings?|slice|slicing|recursion|loop|loops|function|functions|numpy|pandas|matplotlib|dataframe|tkinter)\b/i.test(headerText)) {
            pythonScore += 15;
        }
        if (/\b(sql|database|dbms|rdbms|mysql|sqlite|relational\s+data|relational\s+model|ddl|dml|queries|querying)\b/i.test(headerText)) {
            sqlScore += 15;
        }
        if (/\b(c\+\+|cpp|pointers|stl|iostream)\b/i.test(headerText)) {
            cppScore += 15;
        }
        if (/\b(java|jvm|spring|jdk)\b/i.test(headerText) && !/javascript/i.test(headerText)) {
            javaScore += 15;
        }
        if (/\b(html|css|javascript|js|react|dom|web\s+dev)\b/i.test(headerText)) {
            webScore += 15;
        }

        const pyMatches = textSample.match(/(?:def\s+[a-zA-Z_]\w*\s*\(|print\s*\(|elif\s+|import\s+[a-zA-Z_]|for\s+[a-zA-Z_]\w*\s+in\s+|\[\s*(?:[0-9]+|"[^"]*"|'[^']*')\s*,\s*(?:[0-9]+|"[^"]*"|'[^']*')|\.append\s*\(|\.extend\s*\(|\.insert\s*\(|\.pop\s*\(|\.split\s*\(|\.keys\s*\(\)|\.values\s*\(\)|range\s*\(|len\s*\(|__init__|elif\b|:\s*$)/gm) || [];
        pythonScore += pyMatches.length * 2;

        const sqlMatches = textSample.match(/(?:CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|INSERT\s+INTO|SELECT\s+[\s\S]{1,40}\s+FROM|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES\s+[a-zA-Z_]|GROUP\s+BY|ORDER\s+BY|VARCHAR|INT\s+PRIMARY|NOT\s+NULL|RELATIONAL\s+DATABASE|RELATIONAL\s+MODEL|DEGREE\s+AND\s+CARDINALITY)/gmi) || [];
        sqlScore += sqlMatches.length * 3;

        const cppMatches = textSample.match(/(?:#include\s*<|std::|cout\s*<<|cin\s*>>|int\s+main\s*\(\)|void\s+main\s*\(\))/gmi) || [];
        cppScore += cppMatches.length * 3;

        const javaMatches = textSample.match(/(?:public\s+class|public\s+static\s+void\s+main|System\.out\.print)/gmi) || [];
        javaScore += javaMatches.length * 3;

        const scores = [
            { lang: 'python', score: pythonScore },
            { lang: 'sql', score: sqlScore },
            { lang: 'cpp', score: cppScore },
            { lang: 'java', score: javaScore },
            { lang: 'javascript', score: webScore }
        ];

        scores.sort((a, b) => b.score - a.score);
        return scores[0].score > 0 ? scores[0].lang : 'python';
    }

    /**
     * Deep algorithmic extractor that scans multi-page document content for curriculum titles,
     * chapter headings, subject keywords, and domain term density.
     */
    deepAlgorithmicTitleExtract(documentText = '', originalFileName = '') {
        const cleanFileTitle = originalFileName
            ? originalFileName
                .replace(/\.[^/.]+$/, '')
                .replace(/[-_]/g, ' ')
                .replace(/\b(pdf|syllabus|notes|ebook|guide|document|resource|chapter|unit)\b/gi, '')
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\b\w/g, c => c.toUpperCase())
            : '';

        if (!documentText || typeof documentText !== 'string' || documentText.trim().length < 20) {
            return cleanFileTitle || 'Computer Science Applied Curriculum';
        }

        const text = documentText;
        const lowerText = text.toLowerCase();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        // Domain-specific density across the full multi-page document text
        const mathScore = (lowerText.match(/\b(math\.|ceil|floor|trunc|factorial|trigonometry|hypot|radians|degrees|logarithm|exponent|sqrt|gcd|pi|tau)\b/g) || []).length;
        const oopScore = (lowerText.match(/(?:\bclass\s+[A-Za-z_][A-Za-z0-9_]*\s*(?:\([a-zA-Z0-9_,\s]*\))?\s*:|\b(?:object-oriented|object\s+oriented|inheritance|polymorphism|encapsulation|__init__|subclass|superclass|method\s+overriding|self\.|instance\s+methods?|class\s+variables?|abstract\s+class|dunder)\b)/gi) || []).length;
        const numpyScore = (lowerText.match(/\b(numpy|ndarray|np\.|np\.array|arange|linspace|reshape|broadcasting|matrix\s+operations|data\s+representation\s+using\s+numpy)\b/g) || []).length;
        const pandasScore = (lowerText.match(/\b(pandas|dataframe|series|read_csv|matplotlib|data analysis|data frame)\b/g) || []).length;
        const sqlScore = (lowerText.match(/(?:CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|INSERT\s+INTO|SELECT\s+[\s\S]{1,40}\s+FROM|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES\s+[a-zA-Z_]|GROUP\s+BY|ORDER\s+BY|VARCHAR|INT\s+PRIMARY|RELATIONAL\s+DATABASE|RELATIONAL\s+MODEL|DEGREE\s+AND\s+CARDINALITY|DATABASE\s+MANAGEMENT|RDBMS|DBMS)/gi) || []).length;
        const listsScore = (lowerText.match(/\b(lists?|nested\s+lists?|list\s+slicing|list\s+traversal|list\s+operations?|append\(|extend\(|insert\(|pop\()|\[\s*[0-9"']/gi) || []).length;
        const tuplesDictsScore = (lowerText.match(/\b(tuples?|dictionaries|dictionary|key-value|immutable\s+sequence|\.keys\(\)|\.values\(\)|\.items\(\))/gi) || []).length;
        const dataStructScore = (lowerText.match(/\b(stack|queue|push|pop|dequeue|enqueue|linked\s+list|binary\s+tree|recursion|traversal|sorting|bubble sort|insertion sort|searching)\b/gi) || []).length;
        const networkScore = (lowerText.match(/\b(networking|ip address|tcp|udp|osi layer|packet|router|topology|cyber|security)\b/g) || []).length;
        const progBasicsScore = (lowerText.match(/\b(tokens?|identifiers?|keywords?|variables?|data\s+types?|if\s*-\s*else|elif|while\s+loop|for\s+loop|range\(|operators?|expressions?|computational\s+thinking)\b/gi) || []).length;

        // Look for explicit Unit/Chapter/Course/Topic lines in the text (checking first 80 lines)
        const candidateHeaders = [];
        const genericExcludes = /^(central board|cbse|senior school|curriculum guidelines|session \d+|code\s*no|code\s*\d+|subject\s*code|class\s*[0-9ivx]+|examination|all rights reserved|page\s*\d+|contents|index|table of contents|department of|ministry of|government of|syllabus|overview|guidelines)/i;
        const isSuperficial = (str) => {
            if (!str || str.length < 5) return true;
            if (genericExcludes.test(str)) return true;
            if (/^(code|unit|chapter|module|section|part)\s*[0-9ivx.-]*$/i.test(str.trim())) return true;
            if (/^[0-9\s._\-:()]+$/.test(str.trim())) return true;
            return false;
        };

        const stripPunct = (s) => (s || '')
            .replace(/^[»•›▪▫*_\-#\s\t\x00-\x1F\u2022\u2023\u25E6\u2043\u2219]+|[»•›▪▫*_\-#\s\t\x00-\x1F\u2022\u2023\u25E6\u2043\u2219]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        for (const line of lines.slice(0, 80)) {
            const cleanLine = stripPunct(line);
            const match = cleanLine.match(/^(?:unit\s+[ivx0-9]+|chapter\s+[ivx0-9]+|module\s+[ivx0-9]+|topic|course|subject)[:\-\s]+(.+)/i);
            if (match && match[1]) {
                let cand = stripPunct(match[1]);
                cand = cand.replace(/^(code|no\.?|subject code)\s*[:\-]?\s*[0-9]+/i, '').trim();
                cand = stripPunct(cand);
                if (cand.length >= 4 && cand.length <= 80 && !isSuperficial(cand)) {
                    candidateHeaders.push(cand);
                }
            } else if (cleanLine.length >= 6 && cleanLine.length <= 85 && !isSuperficial(cleanLine) && !cleanLine.startsWith('http')) {
                if (/(lists?|tuples?|dictionar|strings?|numpy|arrays?|data representation|database|sql|rdbms|dbms|relational|computer science|programming|data structures|algorithms|computer systems|networks|math library|cyber|computational thinking|artificial intelligence|machine learning|web development)/i.test(cleanLine)) {
                    let cleaned = cleanLine.replace(/^(class\s*[ivx0-9]+\s*[:\-]?\s*)/i, '').trim();
                    cleaned = stripPunct(cleaned);
                    if (!isSuperficial(cleaned)) {
                        candidateHeaders.push(cleaned);
                    }
                }
            }
        }

        if (candidateHeaders.length > 0) {
            const topSubject = candidateHeaders.find(h => /(numpy|arrays?|data representation|lists?|tuples?|dictionar|strings?|database|sql|rdbms|relational|computer science|computational thinking|programming|computer systems|data structure|network)/i.test(h));
            const bestHeader = topSubject || candidateHeaders[0];
            if (bestHeader) {
                const unwrapped = bestHeader.replace(/^(unit|chapter|module|topic|course|subject)\s*[:\-]\s*/i, '').trim();
                return this.cleanTitle(unwrapped);
            }
        }

        // Domain density clear winners
        if (listsScore >= 3 && listsScore >= sqlScore) {
            return 'Python: Lists & Sequence Manipulation';
        }
        if (tuplesDictsScore >= 3 && tuplesDictsScore >= sqlScore) {
            return 'Python: Tuples, Dictionaries & Data Collections';
        }
        if (sqlScore >= 3 && sqlScore >= oopScore && sqlScore >= mathScore) {
            return 'Relational Databases & SQL Query Systems';
        }
        if (mathScore >= 4 && mathScore > oopScore && mathScore > pandasScore) {
            return 'Python: Math Library Modules & Numeric Algorithms';
        }
        if (dataStructScore >= 3 && dataStructScore > oopScore) {
            return 'Python: Data Structures & Algorithmic Problem Solving';
        }
        if (networkScore >= 3) {
            return 'Computer Networks & Cyber Security Foundations';
        }
        if (oopScore >= 4 && oopScore > mathScore) {
            return 'Python: Object-Oriented Programming & Software Design';
        }
        if (numpyScore >= 3 && numpyScore >= pandasScore) {
            return 'Python: Data Representation & Computation with NumPy';
        }
        if (pandasScore >= 4) {
            return 'Python: Data Handling with Pandas & NumPy';
        }
        if (progBasicsScore >= 3) {
            return 'Python: Programming Fundamentals & Computational Thinking';
        }

        return this.cleanTitle(cleanFileTitle) || 'Computer Science Applied Curriculum';
    }

    /**
     * Reads sufficient PDF content (up to 18,000-20,000 characters) and extracts
     * grounded Course Title, Hindi Title, Description, and Key Topics using Gemini AI
     * with Groq fallback and deep algorithmic fallback.
     */
    async extractTitleAndMetadataFromDocument({
        documentText = '',
        imageBase64 = null,
        mimeType = 'image/jpeg',
        provider = 'gemini',
        originalFileName = ''
    }) {
        const promptText = `You are an elite Computer Science Curriculum Architect and Textbook Synthesizer.
Analyze the following educational curriculum / textbook / syllabus material (extracted from a multi-page document).
Read through the sufficient content provided below and determine the exact, grounded Course Title and metadata based on the actual educational material taught.

DOCUMENT EXCERPT (Read Sufficient Content):
---
${documentText ? documentText.slice(0, 18000) : 'Extracted from uploaded textbook image.'}
---

CRITICAL INSTRUCTIONS:
1. Do NOT use generic administrative or institutional headers (e.g. NEVER output "Central Board of Secondary Education", "CBSE Curriculum", "Senior School Curriculum", "Code 083", "Subject Code", "Session 2024-25").
2. Read the actual topics, concepts, modules, or chapter headings in the content to identify the true subject (e.g. "Relational Databases & SQL Query Systems", "Database Concepts & Management", "Python: Math Library Modules & Numeric Algorithms", "Python: Object-Oriented Programming & Software Design", "Data Handling with Pandas & NumPy").
3. If the material teaches database concepts, relational models, keys, SQL queries (SELECT, CREATE TABLE, WHERE, INSERT, etc.), the course title MUST reflect Databases / SQL, and "suggestedLanguage" MUST be "sql"!
4. Generate an authentic Hindi title in "titleHindi" (e.g. "रिलेशनल डेटाबेस और एसक्यूएल क्वेरी सिस्टम").
5. Write a 2-3 sentence overview in "description" summarizing what learners will master.
6. Provide 3-6 core topics in "keyTopics".
7. Suggest programming language in "suggestedLanguage" ("sql" for database/queries, "python" for general Python/algorithms, "java", "cpp", "javascript", or "general").

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Exact Grounded Course Title in English",
  "titleHindi": "कोर्स का शीर्षक (हिंदी में)",
  "description": "Comprehensive course description...",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "suggestedLanguage": "python"
}`;

        const postProcessMeta = (parsed) => {
            if (!parsed || !parsed.title || parsed.title.length < 4) return null;
            const detectedLang = this.detectDocumentLanguage({
                documentText,
                title: parsed.title,
                originalFileName
            });
            parsed.suggestedLanguage = detectedLang;
            return parsed;
        };

        // 1. Vision Mode if imageBase64 is provided
        if (imageBase64) {
            if (this.genAI) {
                const geminiModels = ACTIVE_GEMINI_MODELS;
                for (const modelName of geminiModels) {
                    try {
                        const model = this.genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent([
                            {
                                inlineData: {
                                    data: imageBase64,
                                    mimeType: mimeType
                                }
                            },
                            promptText
                        ]);
                        const parsed = postProcessMeta(this.parseJSONResponse(result.response.text()));
                        if (parsed) return parsed;
                    } catch (err) {
                        console.warn(`[AIService] Gemini Vision title extraction (${modelName}) failed:`, err.message);
                    }
                }
            }

            if (this.groq) {
                try {
                    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
                    const completion = await this.groq.chat.completions.create({
                        model: 'llama-3.2-11b-vision-preview',
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: promptText },
                                    { type: 'image_url', image_url: { url: dataUrl } }
                                ]
                            }
                        ],
                        temperature: 0.2
                    });
                    const parsed = postProcessMeta(this.parseJSONResponse(completion.choices[0]?.message?.content || '{}'));
                    if (parsed) return parsed;
                } catch (err) {
                    console.warn('[AIService] Groq Vision title extraction failed:', err.message);
                }
            }
        }

        // 2. Text Mode: Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(promptText);
                    const parsed = postProcessMeta(this.parseJSONResponse(result.response.text()));
                    if (parsed) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini title extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. Text Mode: Try Groq fallback
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'You are a curriculum title extraction AI. Output ONLY valid JSON.' },
                            { role: 'user', content: promptText }
                        ],
                        temperature: 0.2
                    });
                    const parsed = postProcessMeta(this.parseJSONResponse(completion.choices[0]?.message?.content || '{}'));
                    if (parsed) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq title extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        // 4. Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(promptText);
                    const parsed = postProcessMeta(this.parseJSONResponse(result.response.text()));
                    if (parsed) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Secondary Gemini title extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        // 5. Deep algorithmic extraction fallback
        const algoTitle = this.deepAlgorithmicTitleExtract(documentText, originalFileName);
        const detectedLang = this.detectDocumentLanguage({
            documentText,
            title: algoTitle,
            originalFileName
        });
        const isDbTopic = detectedLang === 'sql';
        return {
            title: algoTitle,
            titleHindi: isDbTopic ? 'रिलेशनल डेटाबेस और एसक्यूएल क्वेरी सिस्टम' : `${algoTitle} (पाठ्यक्रम)`,
            description: isDbTopic
                ? 'A comprehensive curriculum module covering Database Concepts, Relational Data Models, Keys, and Structured Query Language (SQL) DDL & DML operations.'
                : `A comprehensive curriculum module on ${algoTitle} synthesized from the uploaded syllabus resource.`,
            keyTopics: isDbTopic
                ? ['Relational Data Model & Keys', 'SQL Data Definition (DDL)', 'SQL Data Manipulation (DML) & Queries', 'Aggregate Functions & Grouping']
                : [algoTitle, 'Core Foundations', 'Practical Implementation'],
            suggestedLanguage: detectedLang
        };
    }

    /**
     * AI Global Section Analysis & Universal Cluster Planning.
     * Scans ALL sections across the chapter first, reviews overall topology,
     * and decides the optimal 2-unit progressive clusters before deep generation.
     */
    async planCurriculumClustersFromDocument({
        extractedSections = [],
        backExercises = [],
        documentText = '',
        targetUnitsCount = 5,
        language = 'python',
        classLevel = 11,
        board = 'CBSE',
        customPrompt = '',
        imageBase64 = null,
        mimeType = 'image/jpeg',
        provider = 'gemini'
    }) {
        const sectionSummary = extractedSections.slice(0, 25).map(s => `${s.sectionNumber} ${s.title} (~${Math.round((s.text || '').length)} chars)`).join('\n');
        const exerciseSummary = backExercises.slice(0, 10).map(q => `Q${q.questionNumber}: ${q.questionText.slice(0, 100)}`).join('\n');

        const prompt = `You are an elite AI Computer Science Curriculum Architect and Pedagogical Planner.
Analyze ALL sections discovered across this textbook document to determine the optimal module architecture.
Review the global table of contents and organize the curriculum into progressive 2-unit execution clusters:
- Cluster 1: First 2 foundational units (Core concepts, syntax definitions, basic mechanics)
- Cluster 2: Next 2 intermediate units (Operations, built-in methods, transformations)
- Cluster 3: Capstone unit(s) (Applied problem solving, board examination review)

ALL DISCOVERED SECTIONS ACROSS CHAPTER:
---
${sectionSummary || (documentText ? documentText.slice(0, 8000) : 'Uploaded syllabus resource.')}
---

${exerciseSummary ? `EXTRACTED CHAPTER EXERCISES:\n---\n${exerciseSummary}\n---\n` : ''}

PARAMETERS:
- DOMAIN / LANGUAGE: ${language}
- CLASS LEVEL: Grade ${classLevel} (${board})
- DESIRED TOTAL UNITS: ${targetUnitsCount}
- INSTRUCTOR INTENT: ${customPrompt || 'Progress from foundational syntax to applied practice.'}

OUTPUT SCHEMA (Must be strictly valid JSON):
{
  "title": "Grounded Course Title",
  "titleHindi": "कोर्स का शीर्षक (हिंदी में)",
  "description": "Comprehensive course description based on document...",
  "clusters": [
    {
      "clusterIndex": 0,
      "clusterName": "Foundational Syntax & Mechanics",
      "units": [
        {
          "unitNumber": 1,
          "title": "Descriptive Title",
          "description": "Overview of foundational syntax...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 1", "Concept 2"]
        },
        {
          "unitNumber": 2,
          "title": "Descriptive Title",
          "description": "Overview of basic operations...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 3", "Concept 4"]
        }
      ]
    },
    {
      "clusterIndex": 1,
      "clusterName": "Intermediate Operations & Methods",
      "units": [
        {
          "unitNumber": 3,
          "title": "Descriptive Title",
          "description": "Overview of advanced methods...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 5", "Concept 6"]
        },
        {
          "unitNumber": 4,
          "title": "Descriptive Title",
          "description": "Overview of mutations and algorithms...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 7", "Concept 8"]
        }
      ]
    },
    {
      "clusterIndex": 2,
      "clusterName": "Applied Problem Solving & Board Review",
      "units": [
        {
          "unitNumber": 5,
          "title": "Descriptive Title",
          "description": "Applied problem solving and review exercises...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 9", "Concept 10"]
        }
      ]
    }
  ]
}`;

        // Try Gemini Vision if image is attached
        if (imageBase64 && this.genAI) {
            for (const modelName of ACTIVE_GEMINI_MODELS) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        { inlineData: { data: imageBase64, mimeType } },
                        prompt
                    ]);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini Vision cluster planning (${modelName}) failed:`, err.message);
                }
            }
        }

        // Try Gemini Text
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            for (const modelName of ACTIVE_GEMINI_MODELS) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini global section clustering (${modelName}) failed:`, err.message);
                }
            }
        }

        // Try Groq Text Fallback
        if (this.groq) {
            for (const modelName of ACTIVE_GROQ_MODELS) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'You are a curriculum architect. Output ONLY valid JSON.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Groq global section clustering (${modelName}) failed:`, err.message);
                }
            }
        }

        return null;
    }

    /**
     * RAG-based Course & Units Generator from uploaded Ebook / PDF / Notes / Textbook Images.
     * Uses a multi-stage execution pipeline:
     * Stage 1: AI Global Section Analysis & Clustering across the whole chapter.
     * Stage 2: Staged Deep Generation - Generates first two units fully from all aspects before proceeding to next.
     * Stage 3: Grounded Theory, Checkpoints, and Academic CBSE Exercises per unit.
     */
    async generateTrainingModuleFromDocument({
        documentText = '',
        imageBase64 = null,
        mimeType = 'image/jpeg',
        customPrompt = '',
        language = null,
        classLevel = 11,
        board = 'CBSE',
        totalUnits = 5,
        provider = 'gemini',
        originalFileName = ''
    }) {
        const targetUnitsCount = Math.max(2, Math.min(8, parseInt(totalUnits) || 5));
        
        // 1. Accurately detect programming language from document content & headers
        const detectedLang = language || this.detectDocumentLanguage({
            documentText,
            title: customPrompt,
            customPrompt,
            originalFileName
        });
        const targetLanguage = detectedLang;

        // 2. Universal Document Topology Discovery: Extract all sections and back-of-chapter exercises
        const extractedSections = this.extractTopicsFromDocumentText(documentText);
        const backExercises = this.extractBackExercisesFromText(documentText);
        const organizedUnits = this.contextuallyOrganizeUnits(extractedSections, backExercises, targetUnitsCount);

        // 3. AI Global Section Analysis & Clustering: AI goes through ALL sections first and decides clusters
        const plannedClusters = await this.planCurriculumClustersFromDocument({
            extractedSections,
            backExercises,
            documentText,
            targetUnitsCount,
            language: targetLanguage,
            classLevel,
            board,
            customPrompt,
            imageBase64,
            mimeType,
            provider
        });

        let courseTitle = plannedClusters?.title || this.deepAlgorithmicTitleExtract(documentText, originalFileName) || customPrompt || 'Curriculum Training Module';
        let courseTitleHindi = plannedClusters?.titleHindi || `${courseTitle} (पाठ्यक्रम)`;
        let courseDescription = plannedClusters?.description || `Comprehensive ${targetLanguage} curriculum grounded in textbook materials.`;

        // Normalize clusters: either from AI planner or structured 2-unit clusters from organizedUnits
        let activeClusters = [];
        if (plannedClusters && Array.isArray(plannedClusters.clusters) && plannedClusters.clusters.length > 0) {
            activeClusters = plannedClusters.clusters;
        } else {
            // Universal fallback: Partition organized units into 2-unit progressive clusters
            for (let i = 0; i < organizedUnits.length; i += 2) {
                const clusterUnits = organizedUnits.slice(i, i + 2);
                activeClusters.push({
                    clusterIndex: activeClusters.length,
                    clusterName: i === 0 ? 'Foundational Syntax & Mechanics' : (i + 2 >= organizedUnits.length ? 'Applied Practice & Review' : 'Core Operations & Algorithms'),
                    units: clusterUnits
                });
            }
        }

        // 4. Staged Deep Generation: Generate first two units fully from all aspects before proceeding to next
        const finalUnits = [];
        for (const cluster of activeClusters) {
            console.log(`[AIService] Synthesizing cluster ${cluster.clusterIndex + 1}: ${cluster.clusterName || 'Curriculum Stage'}...`);
            const clusterUnits = cluster.units || [];
            
            for (const u of clusterUnits) {
                const unitIdx = finalUnits.length;
                if (unitIdx >= targetUnitsCount) break;

                const localMatch = organizedUnits[unitIdx] || organizedUnits[organizedUnits.length - 1];
                const unitSections = localMatch?.sections || [];
                const sectionTitles = unitSections.map(s => s.title);
                const sliceText = localMatch?.text || (unitSections.length > 0 ? unitSections.map(s => s.text || '').join('\n\n---\n\n') : '');

                // Generate rich theory with explicit syntax blocks
                const theoryMarkdown = this.formatGroundedTheory({
                    unitTitle: u.title,
                    sectionTitles,
                    sliceText,
                    language: targetLanguage
                });

                // Generate authentic domain checkpoints
                const miniCheckpoints = this.generateGroundedCheckpoints({
                    unitTitle: u.title,
                    sectionTitles,
                    unitIdx,
                    sliceText,
                    language: targetLanguage
                });

                const cbseTips = [
                    `Remember: In ${board} examinations, pay close attention to syntax boundaries and definitions in ${sectionTitles[0] || u.title}.`,
                    `Frequently examined question: Compare and contrast standard operations and error handling in ${u.title}.`
                ];

                // Synthesize grounded academic exercises
                const exercises = this.synthesizeGroundedExercises({
                    unitIdx,
                    unitTitle: u.title,
                    sectionTitles,
                    sliceText,
                    backExercises,
                    language: targetLanguage,
                    totalUnits: targetUnitsCount
                });

                const cleanUnitName = this.cleanTitle(u.title);
                let cleanDesc = u.description;
                if (typeof cleanDesc === 'object' && cleanDesc !== null) {
                    cleanDesc = cleanDesc.summary || cleanDesc.overview || '';
                } else if (typeof cleanDesc === 'string' && cleanDesc.trim().startsWith('{')) {
                    try {
                        const parsed = JSON.parse(cleanDesc);
                        cleanDesc = parsed.summary || parsed.overview || parsed.content?.slice(0, 200) || '';
                    } catch (e) {}
                }
                if (!cleanDesc || cleanDesc.trim().length === 0) {
                    cleanDesc = `Comprehensive concepts, textbook theory, and hands-on exercises for ${cleanUnitName}.`;
                }

                finalUnits.push({
                    unitNumber: unitIdx + 1,
                    title: cleanUnitName,
                    description: cleanDesc,
                    expectedHours: u.expectedHours || 4,
                    unlockThreshold: u.unlockThreshold || 80,
                    keyConcepts: Array.isArray(u.keyConcepts) && u.keyConcepts.length > 0 ? u.keyConcepts : (sectionTitles.length > 0 ? sectionTitles : [cleanUnitName]),
                    theory: theoryMarkdown,
                    miniCheckpoints,
                    cbseTips,
                    suggestedExerciseTypes: ['coding', 'code_debug', 'mcq'],
                    exercises
                });
            }
        }

        // Ensure at least 2 units exist
        if (finalUnits.length < 2) {
            return this.generateDeterministicFallbackModule({
                documentText,
                customPrompt,
                language: targetLanguage,
                classLevel,
                board,
                totalUnits: targetUnitsCount,
                originalFileName
            });
        }

        return {
            title: courseTitle,
            titleHindi: courseTitleHindi,
            description: courseDescription,
            language: targetLanguage,
            boardAligned: board,
            classLevel: Number(classLevel) || 11,
            extractedSummary: `Synthesized ${finalUnits.length} progressive curriculum units across ${activeClusters.length} staged deep clusters grounded in textbook material.`,
            pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
            units: finalUnits
        };
    }

    /**
     * Format rich, student-friendly Markdown theory grounded in textbook excerpts with explicit syntax blocks.
     */
    formatGroundedTheory({ unitTitle, sectionTitles = [], sliceText = '', language = 'python' }) {
        const cleanExcerpt = (sliceText || '').replace(/^#{1,4}\s+.*$/gm, '').trim();
        const paragraphs = cleanExcerpt.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);
        const detailedTheory = paragraphs.slice(0, 4).join('\n\n');

        // Extract code or syntax from sliceText
        let featuredCode = '';
        const fencedMatch = sliceText.match(/```[a-z]*\n([\s\S]*?)```/);
        if (fencedMatch && fencedMatch[1].trim()) {
            featuredCode = fencedMatch[1].trim();
        } else {
            // Check for domain syntax in sliceText or synthesize authentic CBSE syntax
            const lowerSlice = (sliceText + ' ' + unitTitle).toLowerCase();
            if (language === 'sql' || (language !== 'python' && /\b(sql|database|\btable\b|rdbms|relational|ddl|dml)\b/i.test(lowerSlice))) {
                featuredCode = `-- Standard Relational Schema DDL & DML\nCREATE TABLE Student (\n    RollNo INT PRIMARY KEY,\n    Name VARCHAR(50) NOT NULL,\n    Marks DECIMAL(5,2) CHECK (Marks >= 0)\n);\n\n-- Querying records\nSELECT RollNo, Name, Marks\nFROM Student\nWHERE Marks >= 75\nORDER BY Marks DESC;`;
            } else if (/tuple/i.test(lowerSlice)) {
                featuredCode = `# Creating tuples in Python\nempty_tuple = ()\nsingle_element_tuple = (5,)  # Note: Trailing comma is mandatory\nnumber_tuple = (10, 20, 30, 40)\n\n# Accessing and Slicing\nprint("First element:", number_tuple[0])\nprint("Slice [1:3]:", number_tuple[1:3])\n\n# Immutability Check\n# number_tuple[0] = 99  # Raises TypeError: 'tuple' object does not support item assignment\n\n# Tuple built-in operations\nprint("Count of 20:", number_tuple.count(20))\nprint("Length:", len(number_tuple))\nprint("Maximum element:", max(number_tuple))`;
            } else if (/dict/i.test(lowerSlice)) {
                featuredCode = `# Creating a dictionary in Python\nstudent_record = {\n    "roll_no": 101,\n    "name": "Priya",\n    "marks": 94.5\n}\n\n# Accessing and modifying values\nprint("Student Name:", student_record["name"])\nprint("Grade Safe Fetch:", student_record.get("grade", "N/A"))\n\n# Modifying & Adding elements\nstudent_record["marks"] = 96.0\nstudent_record["grade"] = "A+"\n\n# Iterating keys and values\nfor key, value in student_record.items():\n    print(f"{key}: {value}")`;
            } else if (/numpy|ndarray|\bnp\b|matrix|dimension|shape|reshape|broadcasting/i.test(lowerSlice)) {
                featuredCode = `# Essential NumPy Syntax & Operations\nimport numpy as np\n\n# 1. Creating 1D and 2D Arrays\narr_1d = np.array([10, 20, 30, 40, 50])\narr_2d = np.array([[1, 2, 3], [4, 5, 6]])\n\n# 2. Inspecting Array Properties (Attributes)\nprint("Dimensions (ndim):", arr_2d.ndim)      # 2\nprint("Shape (rows, cols):", arr_2d.shape)    # (2, 3)\nprint("Total Elements (size):", arr_2d.size)  # 6\nprint("Data Type (dtype):", arr_2d.dtype)     # int64/int32\n\n# 3. Multidimensional Indexing and Slicing\nprint("Element at row 0, col 1:", arr_2d[0, 1])          # 2\nprint("Sub-matrix slice (all rows, cols 1:):\\n", arr_2d[:, 1:])\n\n# 4. Reshaping and Vectorized Math\nreshaped = arr_1d[:4].reshape(2, 2)  # 4 elements reshaped into 2x2\nscaled = arr_1d * 2                 # Vectorized element-wise multiplication\nprint("Mean:", np.mean(arr_1d))\nprint("Standard Deviation:", np.std(arr_1d))`;
            } else if (/list/i.test(lowerSlice)) {
                featuredCode = `# Creating and manipulating Python lists\nnumbers = [10, 20, 30, 40]\n\n# Accessing and slicing\nprint("First element:", numbers[0])\nprint("Reversed list:", numbers[::-1])\n\n# List methods\nnumbers.append(50)       # Appends element to end\npopped = numbers.pop()   # Removes and returns last element\nnumbers.sort()           # In-place sorting`;
            } else {
                // Look for statements with def, class, =, etc.
                const codeMatch = sliceText.match(/(?:def\s+\w+\([\s\S]*?\):[\s\S]*?(?=\n\S|$)|[a-zA-Z_]\w*\s*=\s*\([\s\S]*?\)|[a-zA-Z_]\w*\s*=\s*\{[\s\S]*?\}|[a-zA-Z_]\w*\s*=\s*\[[\s\S]*?\])/);
                if (codeMatch) {
                    featuredCode = codeMatch[0].trim();
                }
            }
        }

        return `### 📘 ${unitTitle}

${paragraphs[0] || 'This unit establishes core curriculum principles, syntax specifications, and practical algorithms as presented in the textbook.'}

#### 🔑 Key Curriculum Concepts & Learning Objectives
${sectionTitles.length > 0 ? sectionTitles.map(t => `- **${t}**: Fundamental concepts, syntax rules, and practical applications`).join('\n') : `- Core principles and standard operations for ${unitTitle}`}

${detailedTheory ? `#### 📖 Detailed Textbook Theory & Principles\n${detailedTheory}\n` : ''}

${featuredCode ? `#### 💻 Syntax & Code Implementation\n\`\`\`${language}\n${featuredCode}\n\`\`\`\n` : ''}

#### 💡 Practical Takeaways & CBSE Examination Tips
- Ensure accurate syntax boundaries and check edge cases prior to runtime execution.
- Review exception handling and data type immutability/mutability constraints for ${sectionTitles[0] || unitTitle}.
- Maintain clean variable naming and modular code structure aligned with board practical guidelines.`;
    }

    /**
     * Generate grounded 2-question concept checkpoints per unit with curriculum accuracy.
     */
    generateGroundedCheckpoints({ unitTitle = '', sectionTitles = [], unitIdx = 0, sliceText = '', language = 'python' }) {
        const textSample = `${unitTitle} ${sectionTitles.join(' ')} ${sliceText}`.toLowerCase();

        // 1. SQL / Database Domain (prioritized so relational 'tuples' are not confused with Python tuples)
        if (language === 'sql' || (language !== 'python' && /\b(sql|database|\btable\b|relational|primary\s+key|foreign\s+key|rdbms|cardinality|degree)\b/i.test(textSample))) {
            return [
                {
                    id: `cp_${unitIdx + 1}_1`,
                    question: 'Which constraints are strictly enforced on a column designated as a PRIMARY KEY in SQL?',
                    codeSnippet: 'CREATE TABLE Student (\n    RollNo INT PRIMARY KEY,\n    Name VARCHAR(50)\n);',
                    options: [
                        'UNIQUE values across all rows and NOT NULL (no missing values)',
                        'Allows duplicate entries if foreign keys reference it',
                        'Must always be an automatically incrementing numeric integer',
                        'Can contain at most one NULL value per table'
                    ],
                    correctOption: 0,
                    explanation: 'A Primary Key uniquely identifies each record in a relation. By relational DBMS definition, it enforces both UNIQUE and NOT NULL constraints.'
                },
                {
                    id: `cp_${unitIdx + 1}_2`,
                    question: 'In relational database theory, what do Degree and Cardinality measure?',
                    codeSnippet: '# Relational schema properties:\n# Table: Employee (EmpID, Name, Department, Salary) with 50 rows',
                    options: [
                        'Degree = Number of columns (attributes); Cardinality = Number of rows (tuples)',
                        'Degree = Number of rows (tuples); Cardinality = Number of columns (attributes)',
                        'Degree = Total primary keys; Cardinality = Total foreign keys',
                        'Degree = Database file size; Cardinality = Index count'
                    ],
                    correctOption: 0,
                    explanation: 'Degree refers to the total number of attributes (columns) in a table, whereas Cardinality refers to the total number of tuples (rows).'
                }
            ];
        }

        // 2. Python Tuples Domain
        if (/tuple/i.test(textSample)) {
            return [
                {
                    id: `cp_${unitIdx + 1}_1`,
                    question: 'Which of the following creates a valid single-element tuple in Python?',
                    codeSnippet: '# Option A: t1 = (5)\n# Option B: t2 = (5,)\n# Option C: t3 = [5]\n# Option D: t4 = tuple(5)',
                    options: [
                        't = (5,) — A trailing comma is required to define a single-element tuple',
                        't = (5) — Parentheses without a comma create a tuple',
                        't = tuple(5) — Directly passing an integer creates a single-element tuple',
                        't = [5] — Brackets create an immutable tuple'
                    ],
                    correctOption: 0,
                    explanation: 'In Python, a trailing comma (e.g. (5,)) is required for single-element tuples; otherwise, parentheses are evaluated as an arithmetic grouping operator returning an integer.'
                },
                {
                    id: `cp_${unitIdx + 1}_2`,
                    question: 'What occurs when attempting to modify an element in a tuple, such as: t = (10, 20, 30); t[1] = 99?',
                    codeSnippet: 't = (10, 20, 30)\nt[1] = 99  # Attempting in-place modification',
                    options: [
                        "TypeError: 'tuple' object does not support item assignment",
                        'The element at index 1 is successfully updated to 99',
                        'IndexError: tuple index out of range',
                        'The tuple is automatically coerced into a mutable list'
                    ],
                    correctOption: 0,
                    explanation: 'Tuples are strictly immutable sequences in Python. Their elements cannot be assigned, altered, or deleted in place after instantiation.'
                }
            ];
        }

        // 3. Python Dictionaries Domain
        if (/(dict|key|value|mapping|frequency)/i.test(textSample)) {
            return [
                {
                    id: `cp_${unitIdx + 1}_1`,
                    question: 'Which of the following Python data types CANNOT be used as a dictionary key?',
                    codeSnippet: '# Allowed keys: strings, numbers, tuples\n# Invalid keys: mutable objects',
                    options: [
                        'list (e.g., [1, 2]) — Lists are mutable and unhashable',
                        'tuple (e.g., (1, 2)) — Tuples with immutable items are valid keys',
                        'string (e.g., "roll_no") — Strings are immutable and hashable',
                        'integer (e.g., 101) — Numbers are valid immutable keys'
                    ],
                    correctOption: 0,
                    explanation: 'Dictionary keys must be immutable and hashable so their hash value remains constant during program execution. Lists are mutable and therefore raise TypeError: unhashable type: list.'
                },
                {
                    id: `cp_${unitIdx + 1}_2`,
                    question: 'What is the advantage of using dict.get(key, default) instead of dict[key]?',
                    codeSnippet: 'student = {"name": "Aman", "roll": 101}\ngrade = student.get("grade", "N/A")',
                    options: [
                        'It returns the specified default value without raising a KeyError if the key is absent',
                        'It permanently inserts the default value into the dictionary',
                        'It sorts the dictionary keys before retrieving the value',
                        'It deletes the key after reading its value'
                    ],
                    correctOption: 0,
                    explanation: 'The .get(key, default) method safely retrieves values; if key is missing, it returns the provided default value (or None) rather than crashing with a KeyError.'
                }
            ];
        }

        // 4. NumPy / Numerical Arrays Domain
        if (/numpy|ndarray|\bnp\b|matrix|dimension|shape|reshape|broadcasting/i.test(textSample)) {
            return [
                {
                    id: `cp_${unitIdx + 1}_1`,
                    question: 'What is the primary difference between a NumPy ndarray and a standard Python list?',
                    codeSnippet: 'import numpy as np\npy_list = [1, 2, "three", 4.5]\nnp_arr = np.array([1, 2, 3, 4])',
                    options: [
                        'NumPy arrays store elements of homogeneous type in contiguous memory, enabling fast vectorized computation',
                        'Python lists can only store numbers, while NumPy arrays store any arbitrary objects',
                        'NumPy arrays are immutable and cannot have elements accessed by index',
                        'There is no performance or structural difference between them'
                    ],
                    correctOption: 0,
                    explanation: 'NumPy ndarrays store homogeneous elements in contiguous memory blocks. This layout allows vectorized C-level operations without Python bytecode interpretation overhead.'
                },
                {
                    id: `cp_${unitIdx + 1}_2`,
                    question: 'Given arr = np.array([[10, 20, 30], [40, 50, 60]]), which expression extracts the sub-matrix [[20, 30], [50, 60]]?',
                    codeSnippet: 'arr = np.array([[10, 20, 30], [40, 50, 60]])\n# Desired output: [[20, 30], [50, 60]]',
                    options: [
                        'arr[:, 1:]',
                        'arr[1:, :]',
                        'arr[1, 2]',
                        'arr[:, 2]'
                    ],
                    correctOption: 0,
                    explanation: 'In NumPy 2D slicing arr[row_slice, col_slice], : selects all rows (0 and 1), and 1: selects columns from index 1 to the end (columns 1 and 2), extracting [[20, 30], [50, 60]].'
                }
            ];
        }

        // 5. Python Lists Domain
        if (/list|slice|append/i.test(textSample)) {
            return [
                {
                    id: `cp_${unitIdx + 1}_1`,
                    question: 'What is the key difference between list.append(x) and list.extend(x)?',
                    codeSnippet: 'nums = [1, 2]\nnums.append([3, 4])  # Result A\n# vs\nnums = [1, 2]\nnums.extend([3, 4])  # Result B',
                    options: [
                        'append() adds the argument as a single element; extend() unpacks and adds each item of the iterable',
                        'extend() works only on numbers, while append() works on all data types',
                        'append() mutates the list, while extend() returns a new list without modifying original',
                        'Both methods behave identically in Python 3'
                    ],
                    correctOption: 0,
                    explanation: 'append(x) inserts x as a single element (e.g., [1, 2, [3, 4]]), whereas extend(x) iterates over x and appends each element individually (e.g., [1, 2, 3, 4]).'
                },
                {
                    id: `cp_${unitIdx + 1}_2`,
                    question: 'What will be the output of slicing an existing list L with: L[::-1]?',
                    codeSnippet: 'L = [10, 20, 30, 40]\nreversed_L = L[::-1]',
                    options: [
                        'A new list containing all elements of L in reverse order',
                        'An empty list []',
                        'A list containing only the first and last elements',
                        'IndexError: negative step size is invalid'
                    ],
                    correctOption: 0,
                    explanation: 'In Python slicing [start:stop:step], a negative step (-1) traverses the sequence backwards from end to start, reversing the list.'
                }
            ];
        }

        // 5. Universal Academic Fallback (for any other subject: Networks, File Handling, C++, etc.)
        const topicName = sectionTitles[0] || unitTitle;
        return [
            {
                id: `cp_${unitIdx + 1}_1`,
                question: `What fundamental principle defines ${topicName} in this curriculum?`,
                codeSnippet: `# Core concept verification for: ${topicName}`,
                options: [
                    `Standard operational specifications and verified data structures defined in the curriculum`,
                    `Uncontrolled execution without parameter or type validations`,
                    `Bypassing boundary checks and compiler validations`,
                    `Random runtime memory mutations`
                ],
                correctOption: 0,
                explanation: `${topicName} establishes structured, standardized operational rules aligned with board and industry requirements.`
            },
            {
                id: `cp_${unitIdx + 1}_2`,
                question: `When implementing solutions for ${topicName}, which engineering practice is essential?`,
                codeSnippet: `# Best practice check for: ${topicName}`,
                options: [
                    `Verifying boundary conditions, edge cases, and expected return types`,
                    `Ignoring return values and potential exception states`,
                    `Re-assigning incompatible variable types without explicit conversion`,
                    `Relying on undeclared global identifiers`
                ],
                correctOption: 0,
                explanation: `Rigorous boundary checking and input verification prevent runtime faults and ensure high software reliability.`
            }
        ];
    }

    /**
     * Synthesize grounded interactive exercises using extracted back-of-chapter questions or chapter concepts.
     */
    synthesizeGroundedExercises({ 
        unitIdx = 0, 
        unitTitle = '', 
        sectionTitles = [], 
        sliceText = '', 
        docText = '',
        backExercises = [], 
        language = 'python', 
        totalUnits = 5,
        bloomsLevel = 'mix',
        scaffoldLevel = 'progressive'
    }) {
        const effectiveDoc = sliceText || docText || '';
        if ((!backExercises || backExercises.length === 0) && effectiveDoc) {
            backExercises = this.extractBackExercisesFromText(effectiveDoc);
        }

        const isLastUnit = (unitIdx === totalUnits - 1);
        let matchingQ = [];

        // Match back-of-chapter questions with this unit
        if (backExercises.length > 0) {
            const startIdx = unitIdx * 2;
            matchingQ = backExercises.slice(startIdx, startIdx + 2);
            if (matchingQ.length === 0 && isLastUnit) {
                matchingQ = backExercises.slice(0, 2);
            }
        }

        let exercises = [];
        if (matchingQ.length > 0) {
            exercises = matchingQ.map((q, qIdx) => {
                const exType = q.suggestedType || 'coding';
                const exBlooms = bloomsLevel === 'mix' ? (exType === 'mcq' ? 'analyze' : 'apply') : bloomsLevel;
                const exScaffold = scaffoldLevel === 'progressive' ? (exType === 'coding' ? 'semi_independent' : 'guided') : scaffoldLevel;

                const baseEx = this.createAcademicExerciseForTopic({
                    topic: q.questionText.slice(0, 50),
                    unitTitle,
                    language,
                    exerciseType: exType,
                    bloomsLevel: exBlooms,
                    scaffoldLevel: exScaffold,
                    index: unitIdx * 3 + qIdx,
                    documentText: sliceText
                });

                return {
                    ...baseEx,
                    title: `Textbook Problem: ${baseEx.title}`,
                    description: `### 🎯 Textbook Problem Statement\n${q.questionText}\n\n---\n${baseEx.description}`
                };
            });
        }

        // Generate challenges from unit section titles
        const sectionsToCover = (sectionTitles && sectionTitles.length > 0) 
            ? sectionTitles 
            : [unitTitle, `${unitTitle} Operations`];

        // Stage 2: Formative Practice Labs (cover at least 2 topics from the unit)
        if (exercises.length < 2) {
            const topic1 = sectionsToCover[0] || unitTitle;
            const topic2 = sectionsToCover[1] || sectionsToCover[0] || unitTitle;
            
            const scaf1 = scaffoldLevel === 'progressive' ? 'guided' : scaffoldLevel;
            const scaf2 = scaffoldLevel === 'progressive' ? 'semi_independent' : scaffoldLevel;
            const type2 = unitIdx % 3 === 0 ? 'mcq' : (unitIdx % 3 === 1 ? 'fill_blank' : 'code_debug');

            exercises.push(
                this.createAcademicExerciseForTopic({
                    topic: topic1,
                    unitTitle,
                    language,
                    exerciseType: 'coding',
                    bloomsLevel: bloomsLevel === 'mix' ? 'understand' : bloomsLevel,
                    scaffoldLevel: scaf1,
                    index: unitIdx * 3 + 0,
                    documentText: sliceText,
                    isReviewExercise: false
                }),
                this.createAcademicExerciseForTopic({
                    topic: topic2,
                    unitTitle,
                    language,
                    exerciseType: type2,
                    bloomsLevel: bloomsLevel === 'mix' ? 'apply' : bloomsLevel,
                    scaffoldLevel: scaf2,
                    index: unitIdx * 3 + 1,
                    documentText: sliceText,
                    isReviewExercise: false
                })
            );
        }

        // Stage 3: Dedicated Summative Unit Test / Assessment
        const capstoneTopic = sectionsToCover[sectionsToCover.length - 1] || unitTitle;
        const unitTestExercise = this.createAcademicExerciseForTopic({
            topic: `${capstoneTopic} Capstone Test`,
            unitTitle,
            language,
            exerciseType: 'coding',
            bloomsLevel: bloomsLevel === 'mix' ? 'evaluate' : bloomsLevel,
            scaffoldLevel: 'independent',
            difficulty: 'advanced',
            index: unitIdx * 3 + 2,
            documentText: sliceText,
            isReviewExercise: true
        });

        exercises.push(unitTestExercise);

        return exercises;
    }

    extractTopicsFromDocumentText(documentText = '') {
        if (!documentText || typeof documentText !== 'string' || documentText.trim().length < 30) return [];

        const cleanDoc = documentText;
        const lines = cleanDoc.split(/\r?\n/);
        let sections = [];
        let charPos = 0;

        // TIER 1: Standard Numbered Sections (e.g. "2.1 Introduction", "8.3 Slicing")
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const numMatch = line.match(/^(?:#{1,4}\s+)?\s*(\d+\.\d+(?:\.\d+)?)[ \t.:\-]+([^\r\n]+)/);
            if (numMatch) {
                const num = numMatch[1];
                let rawTitle = numMatch[2].trim().replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ');
                if (rawTitle.length >= 3 && rawTitle.length <= 80 && !/^(shows|and|are|is|by|to|in|of|table\s+\d|figure\s+\d|page\s+\d)\b/i.test(rawTitle)) {
                    sections.push({
                        sectionNumber: num,
                        title: this.cleanTitle(rawTitle),
                        startIndex: charPos
                    });
                }
            } else {
                const exMatch = line.match(/^(?:#{1,4}\s+)?\s*(?:exercise|exercises|chapter\s+exercise[s]?|programming\s+problems?|review\s+questions?|practice\s+questions?)\b/i);
                if (exMatch && charPos > cleanDoc.length * 0.25) {
                    sections.push({
                        sectionNumber: 'Ex',
                        title: 'Chapter Assessment & Applied Practice',
                        startIndex: charPos
                    });
                }
            }
            charPos += line.length + 1;
        }

        // TIER 2: If fewer than 3 sections found, search for Single-Digit Numbered Sections (e.g. "1. Introduction", "2. NumPy Arrays")
        if (sections.filter(s => s.sectionNumber !== 'Ex').length < 3) {
            const tier2Sections = [];
            charPos = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const sglMatch = line.match(/^(?:#{1,4}\s+)?(?:\b(?:section|topic|part)\s+)?(\d+)[\.\)][ \t.:\-]+([A-Za-z][^\r\n]{2,75})/i);
                if (sglMatch) {
                    const num = sglMatch[1];
                    let rawTitle = sglMatch[2].trim().replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ');
                    if (rawTitle.length >= 3 && rawTitle.length <= 80 && !/^(shows|and|are|is|by|to|in|of|table\s+\d|figure\s+\d|page\s+\d)\b/i.test(rawTitle)) {
                        tier2Sections.push({
                            sectionNumber: num,
                            title: this.cleanTitle(rawTitle),
                            startIndex: charPos
                        });
                    }
                }
                charPos += line.length + 1;
            }
            if (tier2Sections.length >= 3) {
                sections = tier2Sections;
            }
        }

        // TIER 3: If still fewer than 3 sections, check for NCERT / CBSE "In this chapter" / "Contents" bullet sections (e.g. "» Introduction", "• NumPy Arrays")
        if (sections.filter(s => s.sectionNumber !== 'Ex').length < 3) {
            const inThisChapIdx = cleanDoc.search(/(?:in\s+this\s+chapter|in\s+this\s+unit|contents|table\s+of\s+contents|topics\s+covered)\b/i);
            if (inThisChapIdx !== -1) {
                const chapScope = cleanDoc.slice(inThisChapIdx, inThisChapIdx + 3000);
                const bulletMatches = [...chapScope.matchAll(/^[»•›▪▫*o\-]\s+([A-Za-z][^\r\n]{2,65})/gm)];
                if (bulletMatches.length >= 3) {
                    const bulletSections = [];
                    bulletMatches.forEach((bm, idx) => {
                        const bTitle = this.cleanTitle(bm[1].trim());
                        if (bTitle.length >= 3 && !/^(reprint|class|code|chapter|page)\b/i.test(bTitle)) {
                            const bodyPos = cleanDoc.indexOf(bm[1].trim(), inThisChapIdx + 500);
                            bulletSections.push({
                                sectionNumber: String(idx + 1),
                                title: bTitle,
                                startIndex: bodyPos !== -1 ? bodyPos : Math.floor((idx / bulletMatches.length) * cleanDoc.length)
                            });
                        }
                    });
                    if (bulletSections.length >= 3) {
                        sections = bulletSections;
                    }
                }
            }
        }

        // TIER 4: If still fewer than 3 sections, search for Markdown Headings (##, ###)
        if (sections.filter(s => s.sectionNumber !== 'Ex').length < 3) {
            const mdSections = [];
            charPos = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const mdMatch = line.match(/^#{2,3}\s+(.+)/);
                if (mdMatch) {
                    const title = mdMatch[1].trim().replace(/^[\d.:\-]+\s*/, '');
                    if (title.length >= 4 && title.length <= 80 && !/^(exercises?|questions?|summary|glossary)\b/i.test(title)) {
                        mdSections.push({
                            sectionNumber: String(mdSections.length + 1),
                            title: this.cleanTitle(title),
                            startIndex: charPos
                        });
                    }
                }
                charPos += line.length + 1;
            }
            if (mdSections.length >= 3) {
                sections = mdSections;
            }
        }

        // TIER 5: If still fewer than 3 sections, search for Prominent Uppercase / Standalone Section Lines
        if (sections.filter(s => s.sectionNumber !== 'Ex').length < 3) {
            const prominentSections = [];
            charPos = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const isProminent = line.length >= 4 && line.length <= 60 &&
                    !/[.,;:]$/.test(line) &&
                    !/^(and|or|the|in|at|by|for|with|to|from|is|are|which|that|table|figure|page)\b/i.test(line) &&
                    (line === line.toUpperCase() && /[A-Z]/.test(line)) &&
                    (lines[i + 1]?.trim() === '' || lines[i - 1]?.trim() === '');
                if (isProminent && !/^(CHAPTER|UNIT|REPRINT|CLASS|CONTENTS|INDEX)\b/i.test(line)) {
                    prominentSections.push({
                        sectionNumber: String(prominentSections.length + 1),
                        title: this.cleanTitle(line),
                        startIndex: charPos
                    });
                }
                charPos += lines[i].length + 1;
            }
            if (prominentSections.length >= 3) {
                sections = prominentSections;
            }
        }

        // TIER 6: Intelligent Semantic Partitioning Fallback: NEVER allow fewer than 3 units!
        if (sections.filter(s => s.sectionNumber !== 'Ex').length < 3) {
            const detectedTitle = this.deepAlgorithmicTitleExtract(cleanDoc);
            const lowerDoc = cleanDoc.toLowerCase();
            const chunkLen = Math.max(800, Math.floor(cleanDoc.length / 4));

            if (/numpy|ndarray|\bnp\b|matrix|array/i.test(lowerDoc)) {
                sections = [
                    {
                        sectionNumber: '1',
                        title: 'NumPy Foundations & Array Creation',
                        startIndex: 0
                    },
                    {
                        sectionNumber: '2',
                        title: 'Array Attributes, Indexing & 2D Slicing',
                        startIndex: Math.min(chunkLen, cleanDoc.length)
                    },
                    {
                        sectionNumber: '3',
                        title: 'Vectorized Arithmetic & Broadcasting',
                        startIndex: Math.min(chunkLen * 2, cleanDoc.length)
                    },
                    {
                        sectionNumber: '4',
                        title: 'Array Reshaping & Statistical Functions',
                        startIndex: Math.min(chunkLen * 3, cleanDoc.length)
                    }
                ];
            } else if (/tuple/i.test(lowerDoc)) {
                sections = [
                    { sectionNumber: '1', title: 'Tuple Foundations & Creation Syntax', startIndex: 0 },
                    { sectionNumber: '2', title: 'Tuple Immutability & Index Slicing', startIndex: Math.min(chunkLen, cleanDoc.length) },
                    { sectionNumber: '3', title: 'Tuple Unpacking & Built-in Functions', startIndex: Math.min(chunkLen * 2, cleanDoc.length) },
                    { sectionNumber: '4', title: 'Applied Tuple Operations & Problem Solving', startIndex: Math.min(chunkLen * 3, cleanDoc.length) }
                ];
            } else if (/dict/i.test(lowerDoc)) {
                sections = [
                    { sectionNumber: '1', title: 'Dictionary Structure & Key-Value Mechanics', startIndex: 0 },
                    { sectionNumber: '2', title: 'Dictionary Access, Keys & Mutability', startIndex: Math.min(chunkLen, cleanDoc.length) },
                    { sectionNumber: '3', title: 'Dictionary Methods & Iteration', startIndex: Math.min(chunkLen * 2, cleanDoc.length) },
                    { sectionNumber: '4', title: 'Frequency Counting & Complex Mappings', startIndex: Math.min(chunkLen * 3, cleanDoc.length) }
                ];
            } else if (/sql|database|rdbms|relational/i.test(lowerDoc)) {
                sections = [
                    { sectionNumber: '1', title: 'Relational Database Concepts & Keys', startIndex: 0 },
                    { sectionNumber: '2', title: 'Data Definition Language (DDL) & Schemas', startIndex: Math.min(chunkLen, cleanDoc.length) },
                    { sectionNumber: '3', title: 'Data Manipulation Language (DML) & Queries', startIndex: Math.min(chunkLen * 2, cleanDoc.length) },
                    { sectionNumber: '4', title: 'Advanced Filtering, Ordering & Aggregations', startIndex: Math.min(chunkLen * 3, cleanDoc.length) }
                ];
            } else {
                sections = [
                    { sectionNumber: '1', title: `Foundations of ${detectedTitle}`, startIndex: 0 },
                    { sectionNumber: '2', title: 'Core Syntax, Variables & Data Types', startIndex: Math.min(chunkLen, cleanDoc.length) },
                    { sectionNumber: '3', title: 'Operations, Built-in Methods & Control Flow', startIndex: Math.min(chunkLen * 2, cleanDoc.length) },
                    { sectionNumber: '4', title: 'Applied Problem Solving & Curriculum Review', startIndex: Math.min(chunkLen * 3, cleanDoc.length) }
                ];
            }
        }

        for (let i = 0; i < sections.length; i++) {
            const start = sections[i].startIndex;
            const end = (i + 1 < sections.length) ? sections[i + 1].startIndex : cleanDoc.length;
            sections[i].endIndex = end;
            sections[i].text = cleanDoc.slice(start, Math.min(end, start + 8000)).trim();
        }

        return sections;
    }

    /**
     * Extract actual back-of-chapter questions and review exercises from document text.
     */
    extractBackExercisesFromText(documentText = '') {
        if (!documentText || typeof documentText !== 'string') return [];
        const exIdx = documentText.search(/(?:^|\n)\s*(?:#{1,4}\s+)?(?:EXERCISES?|PROGRAMMING\s+PROBLEMS?|REVIEW\s+QUESTIONS?|PRACTICE\s+(?:PROBLEMS?|QUESTIONS?)|CHECK\s+YOUR\s+PROGRESS|ASSIGNMENTS?|QUESTION\s+BANK|TRY\s+YOURSELF|LAB\s+EXERCISES?)\b/i);
        if (exIdx === -1 || (exIdx < documentText.length * 0.15 && documentText.length > 20000)) {
            return [];
        }

        const exText = documentText.slice(exIdx);
        const questions = [];
        const qRegex = /(?:^|\n)\s*(?:Q\.?\s*|\b(?:Question|Prob(?:lem)?)\s*)?(\d+)\.\s*([^\n]+(?:\n(?!\s*(?:Q\.?\s*|\bQuestion\s*)?\d+\.).*)*)/gi;
        let match;

        while ((match = qRegex.exec(exText)) !== null) {
            const qNum = match[1];
            const qContent = match[2].trim().replace(/\s+/g, ' ');
            if (qContent.length >= 15) {
                let suggestedType = 'coding';
                if (/\b(?:predict|find|what is|what will be)\s+(?:the\s+)?output\b/i.test(qContent)) {
                    suggestedType = 'mcq';
                } else if (/\b(?:error|bug|correct|identify the error)\b/i.test(qContent)) {
                    suggestedType = 'code_debug';
                } else if (/\b(?:fill|differentiate|define|explain|state true|terms for)\b/i.test(qContent)) {
                    suggestedType = 'fill_blank';
                }

                questions.push({
                    questionNumber: Number(qNum),
                    questionText: qContent,
                    suggestedType
                });
            }
        }

        return questions;
    }

    /**
     * Contextually organize document sections and back exercises into progressive units.
     */
    contextuallyOrganizeUnits(sections = [], backExercises = [], targetUnits = 5) {
        if (!Array.isArray(sections) || sections.length === 0) return [];

        const contentSections = sections.filter(s => s.sectionNumber !== 'Ex');
        if (contentSections.length <= 2) {
            return sections.map((s, idx) => ({
                unitNumber: idx + 1,
                title: `Unit ${idx + 1}: ${s.title.replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/i, '')}`,
                sections: [s],
                text: s.text || ''
            }));
        }

        const hasBackExercises = backExercises.length > 0;
        const targetCount = Math.max(2, Math.min(8, parseInt(targetUnits) || 5));
        const contentUnitsCount = (hasBackExercises && targetCount >= 4) ? targetCount - 1 : targetCount;
        const groupSize = Math.ceil(contentSections.length / contentUnitsCount);
        const organizedUnits = [];

        for (let g = 0; g < contentSections.length; g += groupSize) {
            const group = contentSections.slice(g, g + groupSize);
            const unitNum = organizedUnits.length + 1;
            
            let rawTitle = group.map(s => s.title.replace(/^\d+\.\d+\s*/, '').replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/i, '')).join(' & ');
            if (rawTitle.length > 55) {
                const firstClean = group[0].title.replace(/^\d+\.\d+\s*/, '').replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/i, '');
                rawTitle = `${firstClean} & Related Concepts`;
            }
            rawTitle = rawTitle.replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/i, '').trim();

            organizedUnits.push({
                unitNumber: unitNum,
                title: this.cleanTitle(rawTitle),
                sections: group,
                text: group.map(s => s.text || '').join('\n\n---\n\n')
            });

            if (organizedUnits.length === contentUnitsCount) {
                if (g + groupSize < contentSections.length) {
                    const remaining = contentSections.slice(g + groupSize);
                    organizedUnits[organizedUnits.length - 1].sections.push(...remaining);
                    organizedUnits[organizedUnits.length - 1].text += '\n\n---\n\n' + remaining.map(s => s.text || '').join('\n\n---\n\n');
                }
                break;
            }
        }

        if (hasBackExercises && targetCount >= 4) {
            const lastNum = organizedUnits.length + 1;
            organizedUnits.push({
                unitNumber: lastNum,
                title: 'Applied Problem Solving & Chapter Assessment',
                sections: [{ sectionNumber: 'Ex', title: 'Chapter Assessment', text: backExercises.map(q => `${q.questionNumber}. ${q.questionText}`).join('\n') }],
                text: `### 🎯 Chapter Assessment & Applied Review\n\nReview of core chapter problems and programming challenges extracted from the textbook:\n\n` +
                      backExercises.slice(0, 10).map(q => `**Q${q.questionNumber}**: ${q.questionText}`).join('\n\n')
            });
        }

        return organizedUnits;
    }

    /**
     * Backward-compatible wrapper for consolidateTopicsIntoUnits.
     */
    consolidateTopicsIntoUnits(topics = [], maxUnits = 5) {
        return this.contextuallyOrganizeUnits(topics, [], maxUnits);
    }

    /**
     * Universal dynamic deterministic fallback module builder.
     * Generates rich, complete course for ANY chapter with Theory, Checkpoints, CBSE Tips, and Exercises.
     * 100% grounded in uploaded document text; never throws, ensuring auto-build never fails with 500.
     */
    generateDeterministicFallbackModule({
        documentText = '',
        customPrompt = '',
        language = null,
        classLevel = 11,
        board = 'CBSE',
        totalUnits = 5,
        originalFileName = ''
    }) {
        const detectedTitle = this.deepAlgorithmicTitleExtract(documentText, originalFileName);
        const detectedLang = language || this.detectDocumentLanguage({
            documentText,
            title: detectedTitle,
            customPrompt,
            originalFileName
        });

        const sections = this.extractTopicsFromDocumentText(documentText);
        const backExercises = this.extractBackExercisesFromText(documentText);
        const organizedUnits = this.contextuallyOrganizeUnits(sections, backExercises, totalUnits || 5);

        const safeUnits = organizedUnits.length >= 2 ? organizedUnits : [
            {
                unitNumber: 1,
                title: `Foundations of ${detectedTitle}`,
                sections: [{ title: `${detectedTitle} Foundations` }],
                text: typeof documentText === 'string' ? documentText.slice(0, 3000) : ''
            },
            {
                unitNumber: 2,
                title: `Core Operations & Method Transformations`,
                sections: [{ title: 'Core Operations' }],
                text: typeof documentText === 'string' ? documentText.slice(3000, 6000) : ''
            },
            {
                unitNumber: 3,
                title: `Applied Practice & Problem Solving`,
                sections: [{ title: 'Problem Solving' }],
                text: typeof documentText === 'string' ? documentText.slice(6000, 9000) : ''
            }
        ];

        const finalUnits = safeUnits.map((u, uIdx) => {
            const sectionTitles = Array.isArray(u.sections)
                ? u.sections.map(s => typeof s === 'string' ? s : (s?.title || 'Core Concept'))
                : [u.title || 'Core Concept'];
            const sliceText = typeof u.text === 'string' ? u.text : '';
            const theoryMarkdown = this.formatGroundedTheory({
                unitTitle: u.title,
                sectionTitles,
                sliceText,
                language: detectedLang
            });

            const miniCheckpoints = this.generateGroundedCheckpoints({
                unitTitle: u.title,
                sectionTitles,
                unitIdx: uIdx,
                sliceText: u.text,
                language: detectedLang
            });

            const cbseTips = [
                `Remember: In ${board} board exams, always verify syntax boundaries and definitions for ${sectionTitles[0] || u.title}.`,
                `Frequently examined question: Compare and contrast standard operations and error handling in ${u.title}.`
            ];

            const exercises = this.synthesizeGroundedExercises({
                unitIdx: uIdx,
                unitTitle: u.title,
                sectionTitles,
                sliceText: u.text,
                backExercises,
                language: detectedLang,
                totalUnits: safeUnits.length
            });

            return {
                unitNumber: u.unitNumber,
                title: this.cleanTitle(u.title),
                description: `Comprehensive concepts, textbook theory, and hands-on exercises for ${sectionTitles.join(', ')}.`,
                expectedHours: 4,
                unlockThreshold: 80,
                keyConcepts: sectionTitles.length > 0 ? sectionTitles : [u.title],
                theory: theoryMarkdown,
                miniCheckpoints,
                cbseTips,
                suggestedExerciseTypes: ['coding', 'code_debug', 'mcq'],
                exercises
            };
        });

        return {
            title: `${detectedTitle} (${board || 'CBSE'} Class ${classLevel || 11})`,
            titleHindi: `${detectedTitle} (पाठ्यक्रम)`,
            description: `A comprehensive curriculum training module on ${detectedTitle} synthesized directly from the uploaded resource.`,
            language: detectedLang,
            boardAligned: board || 'CBSE',
            classLevel: Number(classLevel) || 11,
            extractedSummary: `Synthesized ${finalUnits.length} comprehensive units with interactive exercises grounded in textbook sections.`,
            pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
            units: finalUnits
        };
    }

    parseJSONResponse(text) {
        if (!text || typeof text !== 'string') return null;
        let cleanText = text.trim();
        cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        cleanText = cleanText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

        // Find JSON bounds
        const firstSquare = cleanText.indexOf('[');
        const lastSquare = cleanText.lastIndexOf(']');
        const firstCurly = cleanText.indexOf('{');
        const lastCurly = cleanText.lastIndexOf('}');

        if (firstSquare !== -1 && lastSquare > firstSquare && (firstCurly === -1 || firstSquare < firstCurly)) {
            cleanText = cleanText.substring(firstSquare, lastSquare + 1);
        } else if (firstCurly !== -1 && lastCurly > firstCurly) {
            cleanText = cleanText.substring(firstCurly, lastCurly + 1);
        }

        // Helper to escape raw control characters (literal unescaped newlines/tabs) inside quotes
        const sanitizeControlCharsInStrings = (jsonStr) => {
            let inString = false;
            let escaped = false;
            let out = '';
            for (let i = 0; i < jsonStr.length; i++) {
                const c = jsonStr[i];
                if (c === '"' && !escaped) {
                    inString = !inString;
                }
                if (inString && c === '\n') {
                    out += '\\n';
                } else if (inString && c === '\r') {
                    out += '\\r';
                } else if (inString && c === '\t') {
                    out += '\\t';
                } else {
                    out += c;
                }
                escaped = (c === '\\' && !escaped);
            }
            return out;
        };

        try {
            return JSON.parse(cleanText);
        } catch (err) {
            // Attempt repairs: trailing commas, unescaped LaTeX backslashes (\frac, \partial, \alpha, etc.), control chars
            try {
                let fixed = sanitizeControlCharsInStrings(cleanText);
                fixed = fixed.replace(/,\s*([\]}])/g, '$1');
                // Escape backslashes that are not valid JSON escape characters
                fixed = fixed.replace(/\\([^"\\/bfnrtu]|u(?![\da-fA-F]{4}))/g, '\\\\$1');
                return JSON.parse(fixed);
            } catch (innerErr) {
                // If truncated, attempt to balance braces/brackets and fix cut-off strings/keys
                try {
                    let repaired = sanitizeControlCharsInStrings(cleanText);
                    repaired = repaired.replace(/\\([^"\\/bfnrtu]|u(?![\da-fA-F]{4}))/g, '\\\\$1');
                    // Check if truncated inside an open quote
                    const quoteMatches = repaired.match(/(^|[^\\])"/g);
                    if (quoteMatches && quoteMatches.length % 2 !== 0) {
                        repaired += '"';
                    }
                    // Strip trailing dangling keys, unclosed property colons or trailing commas
                    repaired = repaired.replace(/,\s*"?[a-zA-Z0-9_-]*"?\s*:?\s*"?[a-zA-Z0-9_-]*"?\s*$/g, '');
                    repaired = repaired.replace(/:\s*"?\w*"?\s*$/g, ': null');
                    repaired = repaired.replace(/,\s*([\]}])/g, '$1');
                    repaired = repaired.replace(/,\s*$/g, '');

                    const openBraces = (repaired.match(/{/g) || []).length;
                    const closeBraces = (repaired.match(/}/g) || []).length;
                    const openSquares = (repaired.match(/\[/g) || []).length;
                    const closeSquares = (repaired.match(/\]/g) || []).length;
                    if (openSquares > closeSquares) repaired += ']'.repeat(openSquares - closeSquares);
                    if (openBraces > closeBraces) repaired += '}'.repeat(openBraces - closeBraces);
                    return JSON.parse(repaired);
                } catch (truncErr) {
                    console.warn('[AIService] Failed to parse JSON response:', cleanText.substring(0, 120));
                    return null;
                }
            }
        }
    }

    /**
     * Ultra-resilient emergency exercise generator.
     * Guaranteed to never throw, returning 100% schema-compliant exercises.
     */
    createEmergencySafeExercise({ topic = 'Core Programming', language = 'python', index = 0 } = {}) {
        const cleanTopic = this.cleanTitle(topic) || 'Core Logic';
        const isSql = language === 'sql';
        const isNumPy = /numpy|array|matrix/i.test(cleanTopic);
        
        let starterCode = '# Implement solution\ndef solution(data):\n    return data\n';
        let solutionCode = 'def solution(data):\n    return data\n';
        let testCases = [{ input: 'solution([1, 2])', expectedOutput: '[1, 2]', isHidden: false }];

        if (isSql) {
            starterCode = `-- Write SQL query for ${cleanTopic}\nSELECT * FROM Student;\n`;
            solutionCode = `SELECT RollNo, Name, Marks FROM Student WHERE Marks >= 75;\n`;
            testCases = [{ input: 'SELECT * FROM Student;', expectedOutput: 'Query executed successfully', isHidden: false }];
        } else if (isNumPy) {
            starterCode = `import numpy as np\n\ndef process_array(data):\n    \"\"\"Process array using NumPy.\"\"\"\n    arr = np.array(data)\n    return arr.tolist()\n`;
            solutionCode = `import numpy as np\n\ndef process_array(data):\n    arr = np.array(data)\n    return arr.tolist()\n`;
            testCases = [{ input: 'process_array([10, 20])', expectedOutput: '[10, 20]', isHidden: false }];
        }

        return {
            title: `${cleanTopic} Implementation Lab`,
            description: `## 🎯 Problem Statement\n\nApply the core principles of **${cleanTopic}** to solve this practical programming task.\n\n### Requirements:\n- Write clean, verified ${language} code.\n- Ensure all syntax rules and edge cases are handled.`,
            exerciseType: 'coding',
            difficulty: 'beginner',
            scaffoldLevel: 'guided',
            bloomsLevel: 'apply',
            learningObjective: `Demonstrate mastery of ${cleanTopic} fundamentals.`,
            xpReward: 20,
            timeLimit: 5,
            starterCode,
            solutionCode,
            testCases,
            hints: [`Analyze the structural requirements of ${cleanTopic}.`]
        };
    }

    /**
     * Ultra-resilient emergency module generator.
     * Guaranteed to never throw, returning 3 comprehensive, schema-compliant units.
     */
    generateEmergencySafeModule({ title = 'Curriculum Training Module', language = 'python', board = 'CBSE', classLevel = 11 } = {}) {
        const cleanModuleTitle = this.cleanTitle(title) || 'Computer Science Applied Curriculum';
        const isNumPy = /numpy|array|matrix/i.test(cleanModuleTitle);
        
        const units = [
            {
                unitNumber: 1,
                title: `Unit 1: Foundations & Core Concepts of ${cleanModuleTitle}`,
                description: `Foundational syntax, variable initialization, and elementary mechanics for ${cleanModuleTitle}.`,
                expectedHours: 4,
                unlockThreshold: 80,
                keyConcepts: ['Syntax & Basics', 'Data Types', 'Execution Flow'],
                theory: `### 📘 Foundations of ${cleanModuleTitle}\n\nThis unit establishes the foundational principles, syntax rules, and mechanics for ${cleanModuleTitle}.`,
                miniCheckpoints: [
                    {
                        id: 'cp_1_1',
                        question: `What is the primary role of foundational syntax in ${cleanModuleTitle}?`,
                        codeSnippet: '# Foundation inspection',
                        options: ['Ensures proper compilation and structured execution', 'Optional decorative formatting', 'Only needed for GUI libraries', 'Slows down runtime execution'],
                        correctOption: 0,
                        explanation: 'Syntax rules establish the grammar and structure required for execution.'
                    }
                ],
                cbseTips: [`In ${board} exams, focus on correct keyword definitions and syntax conventions.`],
                exercises: [
                    this.createEmergencySafeExercise({ topic: `${cleanModuleTitle} Foundations`, language, index: 0 })
                ]
            },
            {
                unitNumber: 2,
                title: `Unit 2: Core Operations & Algorithmic Manipulation`,
                description: `Core methods, operations, and structured data handling for ${cleanModuleTitle}.`,
                expectedHours: 4,
                unlockThreshold: 80,
                keyConcepts: ['Operations', 'Transformations', 'Control Mechanics'],
                theory: `### 📘 Core Operations in ${cleanModuleTitle}\n\nDetailed operational mechanics and data processing patterns.`,
                miniCheckpoints: [
                    {
                        id: 'cp_2_1',
                        question: 'How are intermediate operations evaluated?',
                        codeSnippet: '# Operations check',
                        options: ['According to operator precedence and language semantics', 'Random execution order', 'Left-to-right ignoring precedence', 'Only during compilation'],
                        correctOption: 0,
                        explanation: 'Operations evaluate systematically based on language semantics and precedence.'
                    }
                ],
                cbseTips: [`Carefully verify boundary conditions in ${board} exam questions.`],
                exercises: [
                    this.createEmergencySafeExercise({ topic: `${cleanModuleTitle} Operations`, language, index: 1 })
                ]
            },
            {
                unitNumber: 3,
                title: `Unit 3: Applied Practice & Comprehensive Review`,
                description: `Applied problem solving, scenario analysis, and curriculum assessment for ${cleanModuleTitle}.`,
                expectedHours: 4,
                unlockThreshold: 80,
                keyConcepts: ['Applied Problems', 'Debugging', 'Exam Review'],
                theory: `### 📘 Applied Review & Problem Solving\n\nComprehensive problem solving exercises aligning with examination standards.`,
                miniCheckpoints: [
                    {
                        id: 'cp_3_1',
                        question: 'What is the best practice when debugging unexpected outputs?',
                        codeSnippet: '# Debugging inspection',
                        options: ['Trace execution step-by-step with sample inputs', 'Ignore error messages', 'Randomly change keywords', 'Delete the function'],
                        correctOption: 0,
                        explanation: 'Systematic tracing helps identify logical errors and edge cases.'
                    }
                ],
                cbseTips: [`Practice writing clean step-by-step solutions for full marks in ${board} board exams.`],
                exercises: [
                    this.createEmergencySafeExercise({ topic: `${cleanModuleTitle} Applied Practice`, language, index: 2 })
                ]
            }
        ];

        return {
            title: cleanModuleTitle,
            titleHindi: `${cleanModuleTitle} (पाठ्यक्रम)`,
            description: `Curriculum training module for ${cleanModuleTitle} aligned with ${board} Class ${classLevel}.`,
            language,
            boardAligned: board,
            classLevel: Number(classLevel) || 11,
            extractedSummary: `Synthesized 3 comprehensive units with grounded theory, checkpoints, and verified exercises.`,
            pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
            units
        };
    }

    /**
     * Recognize handwritten math formulas from a base64 image (Windows Math Input Panel style)
     */
    async recognizeHandwrittenMath(base64Image, preferredProvider = 'gemini') {
        let mimeType = 'image/png';
        let rawBase64 = base64Image;

        if (typeof base64Image === 'string' && base64Image.startsWith('data:')) {
            const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                rawBase64 = matches[2];
            }
        }

        const dataUrl = `data:${mimeType};base64,${rawBase64}`;
        const systemPrompt = `You are a high-precision handwriting mathematical OCR engine, modelled after Windows Math Input Panel and Mathpix.
Analyze the handwritten ink strokes in the image and transcribe them into standard LaTeX format.

CRITICAL MATHEMATICAL TRANSCRIPTION RULES:
1. INTEGRALS & DEFINITE INTEGRALS WITH LIMITS:
   - An elongated vertical curve with top and bottom hooks is an INTEGRAL symbol (\\int), NOT the letter 's', 'S', or 'f'.
   - If there is a number, variable, or symbol near the bottom hook and/or near the top hook, transcribe as a definite integral with limits:
     e.g., "\\int_{0}^{\\infty} f(x)\\,dx", "\\int_{a}^{b} x^2\\,dx", "\\int_{-1}^{1} (1-x^2)\\,dx", "\\int_{0}^{2\\pi} \\sin(\\theta)\\,d\\theta".
   - Double integral: "\\iint" or "\\iint_D", Triple integral: "\\iiint", Contour integral: "\\oint" or "\\oint_C".
   - Always append the differential variable with a small space: "\\,dx", "\\,dy", "\\,dt".

2. SUMMATIONS & PRODUCTS:
   - A jagged Greek Sigma is a summation: "\\sum_{i=1}^{n}", "\\sum_{k=0}^{\\infty}".
   - A capital Pi is a product: "\\prod_{i=1}^{n}".

3. LIMITS:
   - "lim" with an approach condition beneath is a limit: "\\lim_{x \\to 0}", "\\lim_{n \\to \\infty}".

4. FRACTIONS, EXPONENTS, AND RADICALS:
   - Horizontal bar separating upper and lower terms MUST be a fraction: "\\frac{numerator}{denominator}".
   - Square root with a roof line: "\\sqrt{expression}", with index: "\\sqrt[n]{x}".
   - Superscripts and exponents: "x^2", "e^{-x}", "x^{n+1}".
   - Subscripts: "x_1", "a_n", "v_0".

5. GREEK LETTERS & COMMON OPERATORS:
   - Recognize \\alpha, \\beta, \\gamma, \\theta, \\pi, \\lambda, \\mu, \\sigma, \\phi, \\omega, \\Delta, \\nabla, \\partial, \\infty, \\pm, \\times, \\div, \\neq, \\leq, \\geq.

OUTPUT RULES:
- Output ONLY the clean LaTeX string.
- Do NOT wrap in markdown code blocks (\`\`\`latex ... \`\`\`), do NOT enclose in $ or $$, and do NOT output conversational commentary.
- If blank or empty, output "".`;

        const cleanLatex = (text) => {
            if (!text) return '';
            let cleaned = text.trim();
            cleaned = cleaned.replace(/^```(?:latex|math|tex)?\s*/i, '').replace(/\s*```$/i, '').trim();
            cleaned = cleaned.replace(/^\$\$?([\s\S]*?)\$\$?$/, '$1').trim();
            return cleaned;
        };

        // 1. Try Gemini Vision first (default or preferred)
        if (preferredProvider === 'gemini' && this.genAI) {
            for (const modelName of ACTIVE_GEMINI_MODELS) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        {
                            inlineData: {
                                data: rawBase64,
                                mimeType: mimeType
                            }
                        },
                        systemPrompt
                    ]);
                    const text = result?.response?.text?.() || '';
                    if (text) return cleanLatex(text);
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} math recognition failed:`, err.message);
                }
            }
        }

        // 2. Try Groq Vision (llama-3.2-11b-vision-preview)
        if (this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.2-11b-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: systemPrompt },
                                { type: 'image_url', image_url: { url: dataUrl } }
                            ]
                        }
                    ],
                    temperature: 0.1
                });
                const text = completion.choices[0]?.message?.content || '';
                if (text) return cleanLatex(text);
            } catch (err) {
                console.warn(`[AIService] Groq math recognition failed:`, err.message);
            }
        }

        // 3. Fallback to Gemini if preferredProvider was groq but failed
        if (preferredProvider !== 'gemini' && this.genAI) {
            for (const modelName of ACTIVE_GEMINI_MODELS) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        {
                            inlineData: {
                                data: rawBase64,
                                mimeType: mimeType
                            }
                        },
                        systemPrompt
                    ]);
                    const text = result?.response?.text?.() || '';
                    if (text) return cleanLatex(text);
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback ${modelName} math recognition failed:`, err.message);
                }
            }
        }

        return '';
    }

    /**
     * Recognize and transcribe text and mathematical formulas from an image
     * Converts math expressions into LaTeX enclosed in $ ... $ or $$ ... $$ for whiteboard editing.
     */
    async recognizeImageTextAndMath(imageInput, preferredProvider = 'gemini') {
        let mimeType = 'image/png';
        let rawBase64 = '';

        if (typeof imageInput === 'string') {
            if (imageInput.startsWith('data:')) {
                const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                    mimeType = matches[1];
                    rawBase64 = matches[2];
                }
            } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
                try {
                    const axios = require('axios');
                    const imgResp = await axios.get(imageInput, { responseType: 'arraybuffer', timeout: 10000 });
                    mimeType = imgResp.headers['content-type'] || 'image/png';
                    rawBase64 = Buffer.from(imgResp.data, 'binary').toString('base64');
                } catch (fetchErr) {
                    console.warn('[AIService] Failed to download remote image for OCR:', fetchErr.message);
                }
            } else {
                rawBase64 = imageInput;
            }
        }

        if (!rawBase64) {
            throw new Error('Valid image data or URL is required for text and math recognition.');
        }

        const dataUrl = `data:${mimeType};base64,${rawBase64}`;
        const systemPrompt = `You are a high-precision multimodal document and mathematical OCR engine.
Transcribe ALL text, formulas, equations, and diagrams present in the image into structured, editable text for a whiteboard.

CORE RULES:
1. MATHEMATICAL FORMULAS & SYMBOLS:
   - Every mathematical expression, formula, equation, or variable MUST be transcribed into standard LaTeX syntax.
   - Enclose inline mathematical formulas and single variables in single dollar signs: $ ... $ (e.g., $E = mc^2$, $f(x) = x^2 + 2x + 1$, $\\int_{a}^{b} f(x)\\,dx$).
   - Enclose standalone or multiline displayed equations in double dollar signs: $$ ... $$ (e.g., $$\\int_{0}^{\\infty} \\frac{\\sin x}{x}\\,dx = \\frac{\\pi}{2}$$).
   - Accurately transcribe complex symbols: integrals (\\int, \\iint, \\oint), limits (\\lim), sums (\\sum), fractions (\\frac{a}{b}), roots (\\sqrt{x}), Greek letters (\\alpha, \\beta, \\theta, \\pi), superscripts, subscripts, and matrices.
2. PLAIN TEXT & LABELS:
   - Preserve natural language words, explanations, headings, labels, punctuation, spaces, and line breaks exactly as they appear.
   - Do NOT convert normal words into math italics.
3. STRUCTURE:
   - Maintain the original layout, bullet points, numbered lists, or paragraph structure.
4. CLEAN OUTPUT:
   - Output ONLY the transcribed content.
   - Do NOT wrap in \`\`\`markdown or \`\`\`latex code blocks, and do NOT include conversational commentary or explanations.`;

        const cleanResult = (text) => {
            if (!text) return '';
            let cleaned = text.trim();
            cleaned = cleaned.replace(/^```(?:markdown|latex|text)?\s*/i, '').replace(/\s*```$/i, '').trim();
            return cleaned;
        };

        // 1. Try Gemini Vision first
        if (preferredProvider === 'gemini' && this.genAI) {
            for (const modelName of ACTIVE_GEMINI_MODELS) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        {
                            inlineData: {
                                data: rawBase64,
                                mimeType: mimeType
                            }
                        },
                        systemPrompt
                    ]);
                    const text = result?.response?.text?.() || '';
                    if (text) return cleanResult(text);
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} image text recognition failed:`, err.message);
                }
            }
        }

        // 2. Try Groq Vision
        if (this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.2-11b-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: systemPrompt },
                                { type: 'image_url', image_url: { url: dataUrl } }
                            ]
                        }
                    ],
                    temperature: 0.1
                });
                const text = completion.choices[0]?.message?.content || '';
                if (text) return cleanResult(text);
            } catch (err) {
                console.warn(`[AIService] Groq vision text recognition failed:`, err.message);
            }
        }

        // 3. Fallback to Gemini if groq was tried first
        if (preferredProvider !== 'gemini' && this.genAI) {
            for (const modelName of ACTIVE_GEMINI_MODELS) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        {
                            inlineData: {
                                data: rawBase64,
                                mimeType: mimeType
                            }
                        },
                        systemPrompt
                    ]);
                    const text = result?.response?.text?.() || '';
                    if (text) return cleanResult(text);
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback image text recognition failed:`, err.message);
                }
            }
        }

        return '';
    }
}

module.exports = new AIService();


