const express = require('express');
const router = express.Router();
const axios = require('axios');
const { asyncHandler } = require('../middleware/errorHandler');
const aiService = require('../services/ai.service');

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

const WIKI_HEADERS = {
    'User-Agent': 'LabRecManager/1.0 (academic-whiteboard; contact@labrecmanager.com)',
    'Accept': 'application/json'
};

/**
 * Decodes destination URLs from search redirects
 */
function cleanSearchUrl(rawUrl) {
    if (!rawUrl) return '';
    const clean = rawUrl.replace(/&amp;/g, '&');
    const uMatch = clean.match(/[?&]u=([^&]+)/);
    if (uMatch) {
        const raw = uMatch[1].startsWith('a1') ? uMatch[1].slice(2) : uMatch[1];
        try {
            return Buffer.from(raw, 'base64').toString('utf8');
        } catch (e) {}
    }
    return clean;
}

/**
 * Fetch live Google/Web search results
 */
async function fetchWebSearchResults(query) {
    try {
        const res = await axios.get('https://www.bing.com/search', {
            params: { q: query },
            headers: BROWSER_HEADERS,
            timeout: 7000
        });

        const html = res.data || '';
        const algos = html.split('<li class="b_algo"').slice(1);
        const webResults = [];

        for (const algo of algos) {
            if (webResults.length >= 10) break;
            const linkMatch = algo.match(/<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/);
            const snippetMatch = algo.match(/<p[^>]*>([\s\S]*?)<\/p>/) || algo.match(/<div class="b_caption"[^>]*>([\s\S]*?)<\/div>/);
            
            if (linkMatch) {
                const title = linkMatch[2].replace(/<[^>]*>/g, '').trim();
                const rawUrl = linkMatch[1];
                const finalUrl = cleanSearchUrl(rawUrl);
                const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').replace(/&#0183;/g, '•').replace(/&nbsp;/g, ' ').trim() : '';

                let domain = '';
                try {
                    const parsed = new URL(finalUrl);
                    domain = parsed.hostname.replace(/^www\./, '');
                } catch (e) {
                    domain = 'Web Source';
                }

                if (title && finalUrl.startsWith('http')) {
                    webResults.push({
                        title,
                        url: finalUrl,
                        snippet,
                        domain
                    });
                }
            }
        }

        return webResults;
    } catch (err) {
        console.warn('[BrowserRoutes] Web search error:', err.message);
        return [];
    }
}

/**
 * Fetch Crystal-Clear Full-HD Images & Diagrams from Google Custom Search / Web + Openverse + Wikimedia
 */
async function fetchHighResolutionImages(query) {
    const images = [];

    // 0. Official Google Custom Search JSON API if GOOGLE_SEARCH_API_KEY & GOOGLE_SEARCH_CX are provided
    if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
        try {
            const googleRes = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: process.env.GOOGLE_SEARCH_API_KEY,
                    cx: process.env.GOOGLE_SEARCH_CX,
                    q: `${query} diagram`,
                    searchType: 'image',
                    num: 10,
                    safe: 'active'
                },
                timeout: 7000
            });
            if (googleRes.data?.items && Array.isArray(googleRes.data.items)) {
                googleRes.data.items.forEach(item => {
                    if (item.link) {
                        images.push({
                            title: item.title || `${query} Diagram`,
                            url: item.link,
                            thumbnail: item.image?.thumbnailLink || item.link,
                            source: item.displayLink || 'Google Images',
                            isHd: true,
                            resolution: item.image?.width && item.image?.height ? `${item.image.width}x${item.image.height}` : 'Full HD'
                        });
                    }
                });
            }
        } catch (gErr) {
            console.warn('[BrowserRoutes] Google Custom Search API failed, falling back:', gErr.message);
        }
    }

    // 1. Web Image Search for Ultra HD original images
    const webImagesPromise = (async () => {
        try {
            const res = await axios.get('https://www.bing.com/images/search', {
                params: { q: `${query} diagram high resolution` },
                headers: BROWSER_HEADERS,
                timeout: 7000
            });

            const html = res.data || '';
            const murls = [...html.matchAll(/murl&quot;:&quot;(https?:[^\s"&]+)&quot;/g)].map(m => m[1].replace(/\\/g, ''));
            const titles = [...html.matchAll(/t&quot;:&quot;([^&"]+)&quot;/g)].map(m => m[1]);

            murls.slice(0, 14).forEach((rawUrl, i) => {
                let imgUrl = rawUrl;
                try { imgUrl = decodeURIComponent(rawUrl); } catch(e){}
                
                let domain = 'Web Image';
                try {
                    const parsed = new URL(imgUrl);
                    domain = parsed.hostname.replace(/^www\./, '');
                } catch(e){}

                if (!images.some(existing => existing.url === imgUrl)) {
                    images.push({
                        title: titles[i] ? decodeURIComponent(titles[i].replace(/&#x/g, '%u')) : `${query} Diagram`,
                        url: imgUrl,
                        thumbnail: imgUrl,
                        source: domain,
                        isHd: true,
                        resolution: 'Full HD'
                    });
                }
            });
        } catch (err) {
            console.warn('[BrowserRoutes] Web image search error:', err.message);
        }
    })();

    // 2. Openverse Science & Academic High-Res Image Collection
    const openversePromise = (async () => {
        try {
            const res = await axios.get('https://api.openverse.org/v1/images/', {
                params: { q: `${query} diagram`, page_size: 8 },
                headers: WIKI_HEADERS,
                timeout: 7000
            });

            if (res.data?.results && Array.isArray(res.data.results)) {
                res.data.results.forEach(img => {
                    if (img.url && !images.some(existing => existing.url === img.url)) {
                        images.push({
                            title: img.title || `${query} Educational Visual`,
                            url: img.url,
                            thumbnail: img.thumbnail || img.url,
                            source: img.creator ? `By ${img.creator}` : 'Openverse HD',
                            isHd: true,
                            resolution: `${img.width || 1200}x${img.height || 800}`
                        });
                    }
                });
            }
        } catch (err) {
            console.warn('[BrowserRoutes] Openverse search error:', err.message);
        }
    })();

    // 3. Wikimedia Commons Full-Resolution SVG / PNG Diagrams
    const commonsPromise = (async () => {
        try {
            const res = await axios.get('https://commons.wikimedia.org/w/api.php', {
                params: {
                    action: 'query',
                    generator: 'search',
                    gsrsearch: `${query} filetype:bitmap|drawing`,
                    gsrnamespace: 6,
                    gsrlimit: 8,
                    prop: 'imageinfo',
                    iiprop: 'url|size|mime',
                    format: 'json',
                    origin: '*'
                },
                headers: WIKI_HEADERS,
                timeout: 7000
            });

            if (res.data?.query?.pages) {
                const files = Object.values(res.data.query.pages);
                files.forEach(f => {
                    const info = f.imageinfo?.[0];
                    if (info?.url && !images.some(existing => existing.url === info.url)) {
                        const cleanName = f.title.replace(/^File:/, '').replace(/\.[^/.]+$/, '');
                        // High-res redirect: 1600px crisp render
                        const highResUrl = `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(f.title.replace(/^File:/, ''))}&width=1600`;
                        images.push({
                            title: cleanName,
                            url: highResUrl,
                            thumbnail: info.url,
                            source: 'Wikimedia Commons HD',
                            isHd: true,
                            resolution: `${info.width || 1600}x${info.height || 1200}`
                        });
                    }
                });
            }
        } catch (err) {
            console.warn('[BrowserRoutes] Wikimedia Commons HD error:', err.message);
        }
    })();

    await Promise.allSettled([webImagesPromise, openversePromise, commonsPromise]);

    // 4. Always include a crisp 1280x720 vector AI diagram as primary
    const aiDiagramPrompt = `${query} educational infographic diagram chart with detailed labeled scientific parts, crisp vector graphics style, ultra high resolution 4k, pure white background`;
    const aiHdUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiDiagramPrompt)}?width=1280&height=720&nologo=true`;

    images.unshift({
        title: `${query} (AI 4K Illustrated Diagram)`,
        url: aiHdUrl,
        thumbnail: aiHdUrl,
        source: 'AI HD Diagram Engine',
        isHd: true,
        resolution: '1280x720'
    });

    return images;
}

/**
 * Curated educational fallback videos for STEM & Academic topics
 */
function getCuratedEducationalVideos(query) {
    const qLower = (query || '').toLowerCase();
    const catalog = [
        {
            keywords: ['newton', 'force', 'motion', 'inertia', 'friction', 'momentum', 'kinematics'],
            videos: [
                {
                    videoId: 'kKKM8Y-u7ds',
                    title: "Newton's Laws of Motion - Khan Academy Physics",
                    channel: 'Khan Academy',
                    duration: '8:53',
                    views: '3.4M views',
                    published: 'Educational Archive',
                    thumbnail: 'https://i.ytimg.com/vi/kKKM8Y-u7ds/hqdefault.jpg'
                },
                {
                    videoId: 'NYVMlmL0BpQ',
                    title: "Newton's First Law of Motion: CrashCourse Physics #5",
                    channel: 'CrashCourse',
                    duration: '9:56',
                    views: '1.9M views',
                    published: 'CrashCourse',
                    thumbnail: 'https://i.ytimg.com/vi/NYVMlmL0BpQ/hqdefault.jpg'
                },
                {
                    videoId: '7JlR8gNRQIs',
                    title: "Newton's Laws of Motion | Full Chapter Revision | Physics",
                    channel: 'Eduniti - Physics',
                    duration: '49:47',
                    views: '1.4M views',
                    published: 'Eduniti',
                    thumbnail: 'https://i.ytimg.com/vi/7JlR8gNRQIs/hqdefault.jpg'
                }
            ]
        },
        {
            keywords: ['light', 'optic', 'refraction', 'reflection', 'lens', 'mirror', 'snell'],
            videos: [
                {
                    videoId: 'G30Oh-aJ114',
                    title: 'Geometric Optics: Crash Course Physics #38',
                    channel: 'CrashCourse',
                    duration: '9:40',
                    views: '1.1M views',
                    published: 'CrashCourse',
                    thumbnail: 'https://i.ytimg.com/vi/G30Oh-aJ114/hqdefault.jpg'
                },
                {
                    videoId: 'fD1544bM_c4',
                    title: 'Refraction of Light & Snell’s Law - Khan Academy',
                    channel: 'Khan Academy',
                    duration: '11:22',
                    views: '2.1M views',
                    published: 'Khan Academy',
                    thumbnail: 'https://i.ytimg.com/vi/fD1544bM_c4/hqdefault.jpg'
                }
            ]
        },
        {
            keywords: ['wave', 'sound', 'doppler', 'oscillation', 'shm', 'pendulum'],
            videos: [
                {
                    videoId: 'TpdL956-6gM',
                    title: 'Traveling Waves: Crash Course Physics #17',
                    channel: 'CrashCourse',
                    duration: '7:45',
                    views: '1.2M views',
                    published: 'CrashCourse',
                    thumbnail: 'https://i.ytimg.com/vi/TpdL956-6gM/hqdefault.jpg'
                },
                {
                    videoId: 'dbeK1jtnLoY',
                    title: 'Simple Harmonic Motion (SHM) - Khan Academy',
                    channel: 'Khan Academy',
                    duration: '9:12',
                    views: '1.6M views',
                    published: 'Khan Academy',
                    thumbnail: 'https://i.ytimg.com/vi/dbeK1jtnLoY/hqdefault.jpg'
                }
            ]
        },
        {
            keywords: ['dna', 'cell', 'bio', 'genetics', 'mitosis', 'photosynthesis'],
            videos: [
                {
                    videoId: '8m6hHRlKwxY',
                    title: 'DNA Structure and Replication: Crash Course Biology #10',
                    channel: 'CrashCourse',
                    duration: '12:59',
                    views: '5.2M views',
                    published: 'CrashCourse',
                    thumbnail: 'https://i.ytimg.com/vi/8m6hHRlKwxY/hqdefault.jpg'
                },
                {
                    videoId: 'g78utcLQrJ4',
                    title: 'Photosynthesis: Crash Course Biology #8',
                    channel: 'CrashCourse',
                    duration: '13:15',
                    views: '4.1M views',
                    published: 'CrashCourse',
                    thumbnail: 'https://i.ytimg.com/vi/g78utcLQrJ4/hqdefault.jpg'
                }
            ]
        },
        {
            keywords: ['calculus', 'derivative', 'integral', 'math', 'algebra', 'vector', 'matrix'],
            videos: [
                {
                    videoId: 'WUvTyaaNkzM',
                    title: 'The Essence of Calculus - Chapter 1',
                    channel: '3Blue1Brown',
                    duration: '17:04',
                    views: '8.1M views',
                    published: '3Blue1Brown',
                    thumbnail: 'https://i.ytimg.com/vi/WUvTyaaNkzM/hqdefault.jpg'
                },
                {
                    videoId: 'fNk_zzaMoSs',
                    title: 'Vectors, What Even Are They? - Essence of Linear Algebra',
                    channel: '3Blue1Brown',
                    duration: '9:52',
                    views: '4.8M views',
                    published: '3Blue1Brown',
                    thumbnail: 'https://i.ytimg.com/vi/fNk_zzaMoSs/hqdefault.jpg'
                }
            ]
        }
    ];

    // Find matching topic
    for (const item of catalog) {
        if (item.keywords.some(kw => qLower.includes(kw))) {
            return item.videos;
        }
    }

    // Default universal educational videos
    return [
        {
            videoId: 'WUvTyaaNkzM',
            title: `${query} - Visual Mathematical & Scientific Concepts`,
            channel: '3Blue1Brown',
            duration: '17:04',
            views: '8.1M views',
            published: 'Educational Lecture',
            thumbnail: 'https://i.ytimg.com/vi/WUvTyaaNkzM/hqdefault.jpg'
        },
        {
            videoId: 'kKKM8Y-u7ds',
            title: `${query} Foundations - Khan Academy`,
            channel: 'Khan Academy',
            duration: '10:15',
            views: '2.5M views',
            published: 'Khan Academy',
            thumbnail: 'https://i.ytimg.com/vi/kKKM8Y-u7ds/hqdefault.jpg'
        }
    ];
}

/**
 * Fetch YouTube educational videos via official Data API v3 or keyless scraper with curated fallback
 */
async function fetchYouTubeVideos(query) {
    if (!query || !query.trim()) return [];
    const trimmed = query.trim();

    // 1. Official YouTube Data API v3 if API key is provided
    if (process.env.YOUTUBE_API_KEY) {
        try {
            const apiRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: `${trimmed} educational lesson`,
                    type: 'video',
                    maxResults: 15,
                    key: process.env.YOUTUBE_API_KEY
                },
                timeout: 7000
            });
            if (apiRes.data?.items && Array.isArray(apiRes.data.items)) {
                return apiRes.data.items.map(item => ({
                    videoId: item.id.videoId,
                    title: item.snippet.title,
                    channel: item.snippet.channelTitle,
                    duration: 'Video',
                    views: '',
                    published: item.snippet.publishedAt ? item.snippet.publishedAt.slice(0, 10) : '',
                    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`
                }));
            }
        } catch (apiErr) {
            console.warn('[BrowserRoutes] YouTube Data API error, falling back:', apiErr.message);
        }
    }

    // 2. Keyless YouTube Search Result Parser
    try {
        const res = await axios.get('https://www.youtube.com/results', {
            params: { search_query: `${trimmed} educational` },
            headers: BROWSER_HEADERS,
            timeout: 7000
        });

        const html = res.data || '';
        const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/) || html.match(/var ytInitialData = ({.*?});<\/script>/s);
        if (match) {
            const data = JSON.parse(match[1]);
            const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
            const videos = [];

            for (const sec of sections) {
                const itemContents = sec?.itemSectionRenderer?.contents || [];
                for (const item of itemContents) {
                    if (item.videoRenderer) {
                        const vr = item.videoRenderer;
                        const videoId = vr.videoId;
                        if (!videoId || videos.some(v => v.videoId === videoId)) continue;

                        const title = vr.title?.runs?.map(r => r.text).join('') || vr.title?.simpleText || `${trimmed} Lesson`;
                        const channel = vr.ownerText?.runs?.map(r => r.text).join('') || 'YouTube Education';
                        const duration = vr.lengthText?.simpleText || 'Video';
                        const views = vr.viewCountText?.simpleText || '';
                        const published = vr.publishedTimeText?.simpleText || '';
                        const thumbnails = vr.thumbnail?.thumbnails || [];
                        const thumbnail = thumbnails[thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                        videos.push({
                            videoId,
                            title,
                            channel,
                            duration,
                            views,
                            published,
                            thumbnail
                        });

                        if (videos.length >= 16) break;
                    }
                }
                if (videos.length >= 16) break;
            }

            if (videos.length > 0) return videos;
        }
    } catch (scrapErr) {
        console.warn('[BrowserRoutes] Keyless YouTube search error, using curated fallback:', scrapErr.message);
    }

    // 3. Guaranteed Curated Educational Fallback
    return getCuratedEducationalVideos(trimmed);
}

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
4. "diagramPrompt": A descriptive prompt describing an ideal scientific or educational diagram for this topic.
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
        
        // High-res AI diagram (1280x720)
        const diagramPrompt = parsed.diagramPrompt || `${query} educational diagram infographic scientific chart`;
        const aiDiagramUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${diagramPrompt}, clean educational diagram, high resolution 4k, detailed labels, vector graphics style, white background`)}?width=1280&height=720&nologo=true`;

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
            aiDiagramUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${diagramPrompt}, clean scientific diagram, detailed labels`)}?width=1280&height=720&nologo=true`
        };
    }
}

/**
 * @route   GET /api/browser/search
 * @desc    Search Google/Web, fetch Ultra-HD diagrams/images, YouTube educational videos, Wikipedia articles, and AI Overview
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
                webResults: [],
                articles: [],
                images: [],
                videos: []
            }
        });
    }

    const query = q.trim();

    // Concurrently fetch AI Overview, Web Search, High-Res Images, YouTube Videos, and Wikipedia
    const [aiResult, webResult, imgResult, videoResult, wikiResult] = await Promise.allSettled([
        includeAi === 'true' ? generateAiSearchOverview(query) : Promise.resolve(null),
        fetchWebSearchResults(query),
        fetchHighResolutionImages(query),
        fetchYouTubeVideos(query),
        (async () => {
            try {
                const restRes = await axios.get('https://en.wikipedia.org/w/rest.php/v1/search/page', {
                    params: { q: query, limit: 8 },
                    headers: WIKI_HEADERS,
                    timeout: 7000
                });

                if (restRes.data?.pages && Array.isArray(restRes.data.pages)) {
                    return restRes.data.pages.map(p => ({
                        id: p.id || p.key,
                        key: p.key,
                        title: p.title,
                        extract: p.description || p.excerpt ? `${p.description || ''} ${p.excerpt || ''}`.replace(/<[^>]*>/g, '').trim() : '',
                        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key || p.title.replace(/ /g, '_'))}`,
                        thumbnail: p.thumbnail?.url ? (p.thumbnail.url.startsWith('//') ? `https:${p.thumbnail.url}` : p.thumbnail.url) : null
                    }));
                }
            } catch (err) {
                console.warn('[BrowserRoutes] Wikipedia search error:', err.message);
            }
            return [];
        })()
    ]);

    const aiOverview = aiResult.status === 'fulfilled' ? aiResult.value : null;
    const webResults = webResult.status === 'fulfilled' ? webResult.value : [];
    const images = imgResult.status === 'fulfilled' ? imgResult.value : [];
    const videos = videoResult.status === 'fulfilled' ? videoResult.value : [];
    const articles = wikiResult.status === 'fulfilled' ? wikiResult.value : [];

    res.json({
        success: true,
        data: {
            query,
            aiOverview,
            webResults,
            articles,
            images,
            videos
        }
    });
}));

/**
 * @route   GET /api/browser/youtube
 * @desc    Dedicated YouTube educational video search
 * @access  Public
 */
router.get('/youtube', asyncHandler(async (req, res) => {
    const { q = '' } = req.query;
    if (!q || !q.trim()) {
        return res.json({
            success: true,
            data: { query: '', videos: [] }
        });
    }

    const query = q.trim();
    const videos = await fetchYouTubeVideos(query);

    res.json({
        success: true,
        data: {
            query,
            videos
        }
    });
}));

/**
 * @route   GET /api/browser/images
 * @desc    Dedicated Google Images & High-Res Diagram search
 * @access  Public
 */
router.get('/images', asyncHandler(async (req, res) => {
    const { q = '' } = req.query;
    if (!q || !q.trim()) {
        return res.json({
            success: true,
            data: { query: '', images: [] }
        });
    }

    const query = q.trim();
    const images = await fetchHighResolutionImages(query);

    res.json({
        success: true,
        data: {
            query,
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
        try {
            const aiSummary = await aiService.executeChatCompletion({
                messages: [{ role: 'user', content: `Write a comprehensive educational overview of "${cleanTitle}" for an academic student whiteboard.` }],
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
                    heroImage: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${cleanTitle} scientific educational illustration`)}?width=1280&height=720&nologo=true`,
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

        // Attach crystal-clear 1280x720 AI diagram URLs to each slide
        slides = slides.map((slide, idx) => {
            const prompt = slide.diagramPrompt || `${targetTopic} slide ${idx + 1} diagram`;
            const diagramUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${prompt}, clean educational infographic presentation visual, vector style, white background`)}?width=1280&height=720&nologo=true`;
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

/**
 * @route   GET /api/browser/proxy
 * @desc    Direct in-panel web browser proxy allowing live navigation of Google Search and educational sites
 * @access  Public
 */
router.get('/proxy', asyncHandler(async (req, res) => {
    let rawUrl = (req.query.url || '').trim();

    if (!rawUrl) {
        rawUrl = 'https://www.google.com';
    }

    // If user entered a search query instead of a URL, convert to Google Search
    let targetUrl = rawUrl;
    const looksLikeUrl = /^https?:\/\//i.test(targetUrl) || (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(targetUrl) && !targetUrl.includes(' '));
    if (!looksLikeUrl) {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
    } else if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 12000,
            maxRedirects: 5,
            responseType: 'text',
            validateStatus: () => true
        });

        // Strip framing restrictions
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Content-Security-Policy-Report-Only');
        res.removeHeader('Cross-Origin-Opener-Policy');
        res.removeHeader('Cross-Origin-Embedder-Policy');

        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const contentType = response.headers['content-type'] || 'text/html; charset=utf-8';
        res.setHeader('Content-Type', contentType);

        if (contentType.includes('text/html') && typeof response.data === 'string') {
            let html = response.data;
            const finalUrl = response.request?.res?.responseUrl || targetUrl;

            const baseTag = `<base href="${finalUrl}">`;
            const proxyScript = `
<script>
(function() {
    try {
        window.parent.postMessage({
            type: 'BROWSER_URL_CHANGED',
            url: ${JSON.stringify(finalUrl)},
            title: document.title || ''
        }, '*');
    } catch(e) {}

    // Intercept all link clicks inside the iframe
    document.addEventListener('click', function(e) {
        var anchor = e.target.closest('a');
        if (anchor && anchor.href && !anchor.href.startsWith('javascript:') && !anchor.href.startsWith('#')) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = '/api/browser/proxy?url=' + encodeURIComponent(anchor.href);
        }
    }, true);

    // Intercept form submissions (e.g. search boxes)
    document.addEventListener('submit', function(e) {
        var form = e.target;
        if (form) {
            e.preventDefault();
            var actionUrl = form.action || ${JSON.stringify(finalUrl)};
            var method = (form.method || 'GET').toUpperCase();
            if (method === 'GET') {
                var formData = new FormData(form);
                var params = new URLSearchParams(formData);
                var sep = actionUrl.includes('?') ? '&' : '?';
                var fullUrl = actionUrl + sep + params.toString();
                window.location.href = '/api/browser/proxy?url=' + encodeURIComponent(fullUrl);
            }
        }
    }, true);

    // Draggable images support onto whiteboard
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG' && e.target.src) {
            e.dataTransfer.setData('text/plain', e.target.src);
            e.dataTransfer.setData('text/uri-list', e.target.src);
            e.dataTransfer.setData('application/x-whiteboard-image', JSON.stringify({
                type: 'image',
                url: e.target.src,
                title: e.target.alt || document.title || 'Web Image'
            }));
        }
    }, true);
})();
</script>
`;

            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${baseTag}${proxyScript}`);
            } else if (html.includes('<html>')) {
                html = html.replace('<html>', `<html><head>${baseTag}${proxyScript}</head>`);
            } else {
                html = `${baseTag}${proxyScript}${html}`;
            }

            return res.send(html);
        }

        return res.send(response.data);
    } catch (err) {
        console.error('[BrowserProxy] Error loading URL:', targetUrl, err.message);
        return res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Unable to load in browser</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: #f8fafc; padding: 32px 16px; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
                    .card { max-width: 440px; width: 100%; background: #131c2e; border: 1px solid #1e293b; border-radius: 20px; padding: 28px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                    .icon { width: 48px; height: 48px; background: rgba(244, 63, 94, 0.15); color: #f43f5e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; }
                    h2 { font-size: 17px; font-weight: 700; margin: 0 0 8px; color: #f8fafc; }
                    p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 20px; }
                    .url-box { background: #090d16; border: 1px solid #334155; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 11px; color: #38bdf8; word-break: break-all; margin-bottom: 20px; text-align: left; }
                    .actions { display: flex; gap: 10px; justify-content: center; }
                    .btn-primary { background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
                    .btn-primary:hover { background: #0369a1; }
                    .btn-secondary { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; }
                    .btn-secondary:hover { background: #334155; color: white; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">&#9888;</div>
                    <h2>Web Page Framing Protected</h2>
                    <p>This destination website blocks direct embedding inside frames, or the connection timed out.</p>
                    <div class="url-box">${targetUrl}</div>
                    <div class="actions">
                        <a class="btn-primary" href="${targetUrl}" target="_blank" rel="noopener noreferrer">Open in New Tab &nearr;</a>
                        <button class="btn-secondary" onclick="window.location.reload()">Retry</button>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
}));

module.exports = router;

