const express = require('express');
const router = express.Router();
const axios = require('axios');
const { asyncHandler } = require('../middleware/errorHandler');
const aiService = require('../services/ai.service');

const WIKI_HEADERS = {
    'User-Agent': 'LabRecManager/1.0 (academic-whiteboard; contact@labrecmanager.com)',
    'Accept': 'application/json'
};

/**
 * Generate AI-synthesized Google Search AI-style crisp overview
 */
async function generateAiSearchOverview(query) {
    const systemPrompt = `You are a Google Search AI Overview engine for an interactive classroom whiteboard.
Your goal is to provide a very crisp, concise, high-impact conceptual summary of the requested topic for students and teachers.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object matching the schema below.
2. "summary": Exactly 2 to 3 concise, clear sentences defining the concept and why it matters.
3. "keyPoints": An array of 3 to 4 impactful bullet points highlighting the core mechanisms, steps, or principles.
4. "diagramPrompt": A descriptive, prompt describing an ideal scientific or educational diagram for this topic (e.g. "Detailed labeled diagram of plant photosynthesis light and dark reactions").
5. "formulaOrEquation": An important formula, law, or key equation if applicable (or null if not applicable).
6. "quickTakeaway": 1 punchy sentence summarizing the most important thing to remember.

JSON SCHEMA:
{
  "title": "Crisp Topic Title",
  "summary": "2-3 concise sentences...",
  "keyPoints": [
    "Key mechanism 1...",
    "Key mechanism 2...",
    "Key mechanism 3..."
  ],
  "diagramPrompt": "detailed educational diagram description",
  "formulaOrEquation": "e.g. 6CO2 + 6H2O -> C6H12O6 + 6O2",
  "quickTakeaway": "1 punchy sentence..."
}`;

    const userPrompt = `Provide a crisp AI Overview for the academic topic: "${query}".`;

    try {
        const response = await aiService.executeChatCompletion({
            messages: [{ role: 'user', content: userPrompt }],
            systemPrompt,
            preferredProvider: 'auto',
            temperature: 0.2,
            maxTokens: 1000,
            jsonMode: true
        });

        let raw = response.text || '';
        raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(raw);
        
        // Generate an AI diagram URL via Pollinations AI
        const diagramPrompt = parsed.diagramPrompt || `${query} educational diagram infographic scientific chart`;
        const aiDiagramUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${diagramPrompt}, clean educational diagram, high resolution, detailed labels, vector graphics style, white background`)}?width=800&height=500&nologo=true`;

        return {
            ...parsed,
            aiDiagramUrl
        };
    } catch (err) {
        console.warn('[BrowserRoutes] AI Overview generation fallback:', err.message);
        const diagramPrompt = `${query} educational concept diagram infographic`;
        return {
            title: query,
            summary: `${query} is a fundamental concept in science and education. Explore its core principles, structures, and practical applications in this research panel.`,
            keyPoints: [
                `Core foundation of ${query}`,
                'Key processes, characteristics, and real-world significance',
                'Visual and structural breakdown'
            ],
            diagramPrompt,
            formulaOrEquation: null,
            quickTakeaway: `Mastering ${query} provides essential knowledge for advanced problem solving.`,
            aiDiagramUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${diagramPrompt}, clean scientific diagram, detailed labels`)}?width=800&height=500&nologo=true`
        };
    }
}

/**
 * @route   GET /api/browser/search
 * @desc    Search Wikipedia REST API, generate Google AI-style overview, and curated diagrams
 * @access  Public
 */
router.get('/search', asyncHandler(async (req, res) => {
    const { q = '', type = 'all', includeAi = 'true' } = req.query;

    if (!q || !q.trim()) {
        return res.json({
            success: true,
            data: {
                query: '',
                aiOverview: null,
                articles: [],
                images: []
            }
        });
    }

    const query = q.trim();
    let articles = [];
    let images = [];
    let aiOverview = null;

    // Run AI Overview concurrently with Wikipedia REST search
    const aiPromise = includeAi === 'true' 
        ? generateAiSearchOverview(query) 
        : Promise.resolve(null);

    const wikiPromise = (async () => {
        try {
            // Use modern Wikimedia REST API (official, highly reliable, no 403 blocks)
            const restRes = await axios.get('https://en.wikipedia.org/w/rest.php/v1/search/page', {
                params: {
                    q: query,
                    limit: 8
                },
                headers: WIKI_HEADERS,
                timeout: 8000
            });

            if (restRes.data?.pages && Array.isArray(restRes.data.pages)) {
                return restRes.data.pages.map(p => ({
                    id: p.id || p.key,
                    key: p.key,
                    title: p.title,
                    extract: p.description || p.excerpt ? `${p.description || ''} ${p.excerpt || ''}`.replace(/<[^>]*>/g, '').trim() : '',
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key || p.title.replace(/ /g, '_'))}`,
                    thumbnail: p.thumbnail?.url ? (p.thumbnail.url.startsWith('//') ? `https:${p.thumbnail.url}` : p.thumbnail.url) : null,
                    originalImage: p.thumbnail?.url ? (p.thumbnail.url.startsWith('//') ? `https:${p.thumbnail.url}` : p.thumbnail.url) : null
                }));
            }
        } catch (wikiErr) {
            console.warn('[BrowserRoutes] Wikimedia REST search error:', wikiErr.message);
        }
        return [];
    })();

    // Run searches in parallel
    const [aiResult, wikiArticles] = await Promise.all([aiPromise, wikiPromise]);
    aiOverview = aiResult;
    articles = wikiArticles;

    // Collect diagrams and figures
    // 1. First, include AI-generated diagram if available
    if (aiOverview?.aiDiagramUrl) {
        images.push({
            title: `${aiOverview.title || query} (AI Illustrated Diagram)`,
            url: aiOverview.aiDiagramUrl,
            thumbnail: aiOverview.aiDiagramUrl,
            source: 'AI Diagram Engine',
            isAi: true
        });
    }

    // 2. Add Wikipedia article images
    articles.forEach(art => {
        if (art.thumbnail && !images.some(img => img.url === art.thumbnail)) {
            images.push({
                title: art.title,
                url: art.thumbnail,
                thumbnail: art.thumbnail,
                source: 'Wikipedia'
            });
        }
    });

    // 3. Educational diagrams fallback
    if (images.length < 3) {
        images.push(
            {
                title: `${query} Concept Map`,
                url: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${query} concept map mental diagram flow chart educational`)}?width=800&height=500&nologo=true`,
                thumbnail: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${query} concept map mental diagram flow chart educational`)}?width=400&height=250&nologo=true`,
                source: 'AI Diagram Engine',
                isAi: true
            },
            {
                title: `${query} Technical Infographic`,
                url: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${query} technical schematic scientific structure labeled parts`)}?width=800&height=500&nologo=true`,
                thumbnail: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${query} technical schematic scientific structure labeled parts`)}?width=400&height=250&nologo=true`,
                source: 'AI Diagram Engine',
                isAi: true
            }
        );
    }

    res.json({
        success: true,
        data: {
            query,
            aiOverview,
            articles,
            images
        }
    });
}));

/**
 * @route   GET /api/browser/article
 * @desc    Fetch complete Wikipedia article content with clean section text
 * @access  Public
 */
router.get('/article', asyncHandler(async (req, res) => {
    const { title = '' } = req.query;

    if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Article title is required' });
    }

    const cleanTitle = title.trim();

    try {
        // Use Wikipedia REST summary API
        const summaryRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle.replace(/ /g, '_'))}`, {
            headers: WIKI_HEADERS,
            timeout: 8000
        });

        const data = summaryRes.data || {};
        const paragraphs = (data.extract || '')
            .split(/\n\n+/)
            .map(p => p.trim())
            .filter(p => p.length > 20);

        res.json({
            success: true,
            data: {
                id: data.pageid || data.titles?.canonical,
                title: data.title || cleanTitle,
                description: data.description || '',
                url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTitle.replace(/ /g, '_'))}`,
                heroImage: data.originalimage?.source || data.thumbnail?.source || null,
                paragraphs: paragraphs.length > 0 ? paragraphs : [data.extract || 'No text content available.']
            }
        });
    } catch (error) {
        console.warn('[BrowserRoutes] REST summary error:', error.message);
        // Fallback: Generate an informative article overview using AI
        try {
            const aiSummary = await aiService.executeChatCompletion({
                messages: [{ role: 'user', content: `Write a comprehensive, 4-paragraph educational overview of "${cleanTitle}" for a student whiteboard.` }],
                systemPrompt: 'You are an educational encyclopedia. Output clear, well-structured paragraphs explaining the topic.',
                preferredProvider: 'auto',
                temperature: 0.3,
                maxTokens: 1500
            });

            const paragraphs = (aiSummary.text || '')
                .split(/\n\n+/)
                .map(p => p.trim())
                .filter(p => p.length > 20);

            res.json({
                success: true,
                data: {
                    id: cleanTitle,
                    title: cleanTitle,
                    description: 'Educational Overview',
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTitle.replace(/ /g, '_'))}`,
                    heroImage: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${cleanTitle} scientific educational illustration`)}?width=800&height=500&nologo=true`,
                    paragraphs
                }
            });
        } catch (aiErr) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve article content'
            });
        }
    }
}));

/**
 * @route   POST /api/browser/generate-slides
 * @desc    Generate AI presentation slide deck for the roll-down curtain module
 * @access  Public
 */
router.post('/generate-slides', asyncHandler(async (req, res) => {
    const {
        topic = '',
        slideCount = 5,
        boardContext = '',
        language = 'English'
    } = req.body;

    if (!topic && !boardContext) {
        return res.status(400).json({
            success: false,
            message: 'Topic or whiteboard content context is required to generate slides'
        });
    }

    const count = Math.min(Math.max(parseInt(slideCount) || 5, 3), 8);
    const targetTopic = (topic || 'Whiteboard Presentation').trim();

    const systemPrompt = `You are a master presentation designer and academic lecturer.
Your task is to create an engaging, highly structured ${count}-slide classroom presentation.
Target Language: ${language}

CRITICAL RULES:
1. Return ONLY a valid JSON array of ${count} slide objects.
2. Each slide MUST have:
   - "id": 1-based sequential integer (1, 2, ...).
   - "title": Short, powerful slide heading (3-7 words).
   - "subtitle": Brief concept hook (1 sentence).
   - "bullets": Array of 3 to 4 concise, impactful bullet points.
   - "diagramPrompt": Detailed description of an ideal visual illustration/diagram for this slide.
   - "speakerNotes": 2 sentences of teacher talking points or lecture hints.
3. Keep the content educational, structured, and easy to read during presentations.

JSON SCHEMA:
[
  {
    "id": 1,
    "title": "Slide Title",
    "subtitle": "Subtitle or core question",
    "bullets": [
      "Key point 1 with highlight",
      "Key point 2...",
      "Key point 3..."
    ],
    "diagramPrompt": "detailed visual illustration description",
    "speakerNotes": "Teacher talking note for this slide..."
  }
]`;

    const userPrompt = `Create a ${count}-slide deck on:
TOPIC: "${targetTopic}"
${boardContext ? `CURRENT BOARD CONTENT / CONTEXT: """${boardContext.slice(0, 1500)}"""` : ''}

Ensure each slide is conceptually progressive from introduction to deep dive to conclusions.`;

    try {
        const response = await aiService.executeChatCompletion({
            messages: [{ role: 'user', content: userPrompt }],
            systemPrompt,
            preferredProvider: 'auto',
            temperature: 0.3,
            maxTokens: 3000,
            jsonMode: true
        });

        let raw = response.text || '';
        raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        let slides = [];
        try {
            slides = JSON.parse(raw);
        } catch (jsonErr) {
            const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (match) slides = JSON.parse(match[0]);
            else throw new Error('Failed to parse slide show JSON');
        }

        // Attach high quality AI diagram URLs to each slide
        slides = slides.map((slide, idx) => {
            const prompt = slide.diagramPrompt || `${targetTopic} slide ${idx + 1} diagram`;
            const diagramUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${prompt}, clean educational infographic presentation visual, vector style, white background`)}?width=700&height=420&nologo=true`;
            return {
                ...slide,
                id: idx + 1,
                diagramUrl
            };
        });

        res.json({
            success: true,
            data: {
                topic: targetTopic,
                slideCount: slides.length,
                slides
            }
        });
    } catch (error) {
        console.error('[BrowserRoutes] Generate slides error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to generate slide show: ' + error.message
        });
    }
}));

module.exports = router;
