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
 * Fetch Crystal-Clear Full-HD Images from Google Custom Search / Web (Bing HD) + Openverse + Wikimedia
 */
async function fetchHighResolutionImages(query) {
    const images = [];
    if (!query || !query.trim()) return images;
    const cleanQuery = query.trim();

    // 0. Direct Google Images via Serper API if SERPER_API_KEY is provided (no domain limits, genuine Google Images)
    if (process.env.SERPER_API_KEY) {
        try {
            const serperRes = await axios.post('https://google.serper.dev/images', {
                q: cleanQuery,
                num: 20
            }, {
                headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 7000
            });
            if (serperRes.data?.images && Array.isArray(serperRes.data.images)) {
                serperRes.data.images.forEach(item => {
                    if (item.imageUrl) {
                        images.push({
                            title: item.title || `${cleanQuery} Image`,
                            url: item.imageUrl,
                            thumbnail: item.thumbnailUrl || item.imageUrl,
                            source: item.source || 'Google Images',
                            isHd: true,
                            resolution: item.width && item.height ? `${item.width}x${item.height}` : 'HD'
                        });
                    }
                });
            }
        } catch (sErr) {
            console.warn('[BrowserRoutes] Serper Google Images API failed, falling back:', sErr.message);
        }
    }

    // 0.1 Official Google Custom Search JSON API if GOOGLE_SEARCH_API_KEY & GOOGLE_SEARCH_CX are provided
    if (images.length === 0 && process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
        try {
            const googleRes = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: process.env.GOOGLE_SEARCH_API_KEY,
                    cx: process.env.GOOGLE_SEARCH_CX,
                    q: cleanQuery,
                    searchType: 'image',
                    num: 12,
                    safe: 'active'
                },
                timeout: 7000
            });
            if (googleRes.data?.items && Array.isArray(googleRes.data.items)) {
                googleRes.data.items.forEach(item => {
                    if (item.link) {
                        images.push({
                            title: item.title || `${cleanQuery} Image`,
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

    // 1. Web Image Search with Cookie bypass for complete original high-res photos
    const qWords = cleanQuery.toLowerCase().split(/[\s,.-]+/).filter(w => w.length >= 2);

    const webImagesPromise = (async () => {
        try {
            const res = await axios.get('https://www.bing.com/images/search', {
                params: { q: cleanQuery },
                headers: {
                    ...BROWSER_HEADERS,
                    'Cookie': 'SRCHHPGUSR=ADLT=OFF&NRSLT=50'
                },
                timeout: 7000
            });

            const html = res.data || '';
            const regex = /\sm=\"([^\"]*?murl[^\"]*?)\"/g;
            const matches = [...html.matchAll(regex)];

            const primaryMatches = [];
            const secondaryMatches = [];

            for (const m of matches) {
                try {
                    const decoded = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
                    const item = JSON.parse(decoded);
                    const imgUrl = item.murl;
                    if (!imgUrl || !imgUrl.startsWith('http')) continue;

                    const titleLower = (item.t || '').toLowerCase();
                    const urlLower = imgUrl.toLowerCase();
                    const purlLower = (item.purl || '').toLowerCase();

                    // Check if title or url/purl contains any meaningful query word
                    const titleMatches = qWords.length === 0 || qWords.some(w => titleLower.includes(w));
                    const metaMatches = qWords.length === 0 || qWords.some(w => urlLower.includes(w) || purlLower.includes(w));

                    // STRICT: discard if neither title nor URL has any query word (this completely eliminates sponsored ad tiles)
                    if (!titleMatches && !metaMatches) continue;

                    let domain = 'Web Image';
                    try {
                        const parsed = new URL(imgUrl);
                        domain = parsed.hostname.replace(/^www\./, '');
                    } catch(e) {}

                    const imageObj = {
                        title: item.t ? item.t.replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&#0183;/g, '•') : `${cleanQuery} Image`,
                        url: imgUrl,
                        thumbnail: item.turl || imgUrl,
                        source: domain,
                        isHd: true,
                        resolution: item.desc || 'HD'
                    };

                    if (titleMatches) {
                        primaryMatches.push(imageObj);
                    } else {
                        secondaryMatches.push(imageObj);
                    }
                } catch(e) {}
            }

            // Prioritize primary (title matched) first, then secondary
            const combinedMatches = [...primaryMatches, ...secondaryMatches];
            for (const img of combinedMatches) {
                if (images.length >= 36) break;
                if (!images.some(existing => existing.url === img.url)) {
                    images.push(img);
                }
            }

            // Fallback to mediaurl matches if m attributes were not present
            if (images.length === 0) {
                const mediaUrls = [...new Set([...html.matchAll(/mediaurl=([^&\"']+)/gi)].map(m => decodeURIComponent(m[1])))];
                mediaUrls.slice(0, 24).forEach(imgUrl => {
                    if (imgUrl.startsWith('http') && !images.some(e => e.url === imgUrl)) {
                        let domain = 'Web Image';
                        try { domain = new URL(imgUrl).hostname.replace(/^www\./, ''); } catch(e){}
                        images.push({
                            title: `${cleanQuery} Image`,
                            url: imgUrl,
                            thumbnail: imgUrl,
                            source: domain,
                            isHd: true,
                            resolution: 'HD'
                        });
                    }
                });
            }
        } catch (err) {
            console.warn('[BrowserRoutes] Web image search error:', err.message);
        }
    })();

    // 2. Openverse Science & Academic High-Res Image Collection
    const openversePromise = (async () => {
        try {
            const res = await axios.get('https://api.openverse.org/v1/images/', {
                params: { q: cleanQuery, page_size: 8 },
                headers: WIKI_HEADERS,
                timeout: 7000
            });

            if (res.data?.results && Array.isArray(res.data.results)) {
                res.data.results.forEach(img => {
                    if (img.url && !images.some(existing => existing.url === img.url)) {
                        const titleLower = (img.title || '').toLowerCase();
                        const isRelevant = qWords.length === 0 || qWords.some(w => titleLower.includes(w));
                        if (!isRelevant) return;

                        images.push({
                            title: img.title || `${cleanQuery} Visual`,
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

    // 3. Wikimedia Commons Full-Resolution Collection
    const commonsPromise = (async () => {
        try {
            const res = await axios.get('https://commons.wikimedia.org/w/api.php', {
                params: {
                    action: 'query',
                    generator: 'search',
                    gsrsearch: cleanQuery,
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
                        const titleLower = cleanName.toLowerCase();
                        const isRelevant = qWords.length === 0 || qWords.some(w => titleLower.includes(w));
                        if (!isRelevant) return;

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

    // 4. If query explicitly asked for diagram/infographic, include an AI illustration
    const qLower = cleanQuery.toLowerCase();
    if (qLower.includes('diagram') || qLower.includes('infographic') || qLower.includes('schematic') || qLower.includes('flowchart')) {
        const aiDiagramPrompt = `${cleanQuery} educational infographic diagram chart with detailed labeled scientific parts, crisp vector graphics style, ultra high resolution 4k, pure white background`;
        const aiHdUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiDiagramPrompt)}?width=1280&height=720&nologo=true`;

        images.unshift({
            title: `${cleanQuery} (AI 4K Diagram)`,
            url: aiHdUrl,
            thumbnail: aiHdUrl,
            source: 'AI HD Diagram Engine',
            isHd: true,
            resolution: '1280x720'
        });
    }

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

function renderGoogleHomePage(appOrigin = '') {
    const baseProxy = appOrigin ? `${appOrigin}/api/browser/proxy?url=` : '/api/browser/proxy?url=';
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Google</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #202124; color: #e8eaed; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .logo { font-size: 52px; font-weight: 700; letter-spacing: -1px; margin-bottom: 28px; user-select: none; }
        .g-blue { color: #8ab4f8; }
        .g-red { color: #f28b82; }
        .g-yellow { color: #fdd663; }
        .g-green { color: #81c995; }
        .search-box { width: 100%; max-width: 580px; position: relative; margin-bottom: 24px; }
        .search-form { display: flex; align-items: center; background: #303134; border: 1px solid #5f6368; border-radius: 24px; padding: 10px 18px; box-shadow: 0 1px 6px rgba(0,0,0,0.28); }
        .search-form:focus-within { background: #303134; border-color: #8ab4f8; box-shadow: 0 1px 8px rgba(138,180,248,0.3); }
        .search-icon { width: 18px; height: 18px; fill: #9aa0a6; margin-right: 12px; flex-shrink: 0; }
        .search-input { width: 100%; background: transparent; border: none; outline: none; font-size: 15px; color: #fff; }
        .buttons { display: flex; gap: 12px; margin-bottom: 32px; }
        .btn { background: #303134; border: 1px solid transparent; color: #e8eaed; padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
        .btn:hover { background: #3c4043; border-color: #5f6368; color: #fff; }
        .shortcuts-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9aa0a6; margin-bottom: 12px; font-weight: 600; }
        .shortcuts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 560px; }
        .chip { background: #292a2d; border: 1px solid #3c4043; color: #8ab4f8; padding: 6px 14px; border-radius: 16px; font-size: 12px; text-decoration: none; cursor: pointer; transition: all 0.15s; }
        .chip:hover { background: #3c4043; border-color: #8ab4f8; }
        .footer-note { margin-top: 40px; font-size: 11px; color: #9aa0a6; }
    </style>
</head>
<body>
    <div class="logo">
        <span class="g-blue">G</span><span class="g-red">o</span><span class="g-yellow">o</span><span class="g-blue">g</span><span class="g-green">l</span><span class="g-red">e</span>
    </div>
    <div class="search-box">
        <form class="search-form" onsubmit="handleSearch(event)">
            <svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input class="search-input" id="search-input" type="text" placeholder="Search Google or type a URL" autofocus autocomplete="off" />
        </form>
    </div>
    <div class="buttons">
        <button class="btn" onclick="document.querySelector('.search-form').dispatchEvent(new Event('submit', { cancelable: true }))">Google Search</button>
        <button class="btn" onclick="feelingLucky()">I'm Feeling Lucky</button>
    </div>
    <div class="shortcuts-title">Academic & Lab Topics</div>
    <div class="shortcuts">
        <a class="chip" onclick="searchTopic('Photosynthesis in plants')">🌿 Photosynthesis</a>
        <a class="chip" onclick="searchTopic('Newton laws of motion')">🍎 Newton's Laws</a>
        <a class="chip" onclick="searchTopic('Periodic table of elements')">🧪 Periodic Table</a>
        <a class="chip" onclick="searchTopic('Human heart anatomy')">❤️ Heart Anatomy</a>
        <a class="chip" onclick="searchTopic('Wave optics interference')">🌊 Wave Optics</a>
        <a class="chip" onclick="searchTopic('Circle equation standard form')">⭕ Circle Conics</a>
        <a class="chip" onclick="searchTopic('Quadratic formula derivation')">📐 Quadratic Roots</a>
    </div>
    <div class="footer-note">⚡ In-Whiteboard Live Web Search & Reference Engine</div>
    <script>
        var BASE_PROXY = ${JSON.stringify(baseProxy)};
        try {
            window.parent.postMessage({ type: 'BROWSER_URL_CHANGED', url: 'https://www.google.com', title: 'Google' }, '*');
        } catch(e) {}
        function handleSearch(e) {
            e.preventDefault();
            var val = document.getElementById('search-input').value.trim();
            if (!val) return;
            window.location.href = BASE_PROXY + encodeURIComponent('https://www.google.com/search?q=' + encodeURIComponent(val));
        }
        function searchTopic(t) {
            window.location.href = BASE_PROXY + encodeURIComponent('https://www.google.com/search?q=' + encodeURIComponent(t));
        }
        function feelingLucky() {
            var topics = ['Photosynthesis', 'Newton laws of motion', 'Quantum mechanics', 'DNA replication', 'Euler formula'];
            var pick = topics[Math.floor(Math.random() * topics.length)];
            searchTopic(pick);
        }
    </script>
</body>
</html>`;
}

function renderGoogleSearchPage(query, webResults, aiOverview, rawTargetUrl, appOrigin = '', options = {}) {
    const isImages = !!options.isImages;
    const imagesList = options.images || [];
    const baseProxy = appOrigin ? `${appOrigin}/api/browser/proxy?url=` : '/api/browser/proxy?url=';
    const escapedQuery = String(query).replace(/"/g, '&quot;');
    const googleAllUrl = `${baseProxy}${encodeURIComponent('https://www.google.com/search?q=' + encodeURIComponent(query))}`;
    const googleImagesUrl = `${baseProxy}${encodeURIComponent('https://www.google.com/search?q=' + encodeURIComponent(query) + '&tbm=isch')}`;

    const resultsHtml = (webResults || []).map((r) => {
        const proxyUrl = `${baseProxy}${encodeURIComponent(r.url)}`;
        return `
        <div class="result-card" draggable="true" ondragstart="handleDrag(event, '${encodeURIComponent(r.title)}', '${encodeURIComponent(r.url)}')">
            <div class="result-meta">
                <span class="result-domain">${r.domain || 'web'}</span>
                <span class="meta-sep">&bull;</span>
                <span class="result-raw-url">${r.url.slice(0, 50)}...</span>
            </div>
            <h3 class="result-title">
                <a href="${proxyUrl}">${r.title}</a>
            </h3>
            <p class="result-snippet">${r.snippet || 'No description preview available.'}</p>
            <div class="result-actions">
                <button class="action-btn" onclick="addToWhiteboard('${encodeURIComponent(r.title)}', '${encodeURIComponent(r.url)}', '${encodeURIComponent(r.snippet)}')">
                    <span>➕ Add to Board</span>
                </button>
                <a class="action-link" href="${proxyUrl}">In-Panel View &rarr;</a>
                <a class="action-link" href="${r.url}" target="_blank" rel="noopener noreferrer">Live Site &nearr;</a>
            </div>
        </div>
        `;
    }).join('');

    const imagesHtml = imagesList.length > 0 ? `
    <div class="images-container">
        <div class="images-header">
            <span>Google Images: ${escapedQuery} (${imagesList.length} HD Results)</span>
            <span class="images-hint">💡 Drag any image onto whiteboard canvas or click "Add to Board"</span>
        </div>
        <div class="images-grid">
            ${imagesList.map(img => `
                <div class="img-card" draggable="true" ondragstart="handleImageDrag(event, '${encodeURIComponent(img.url)}', '${encodeURIComponent(img.title)}')">
                    <span class="img-badge">${img.resolution || 'HD'}</span>
                    <div class="img-box">
                        <img src="${img.thumbnail || img.url}" alt="${img.title}" loading="lazy" onerror="this.onerror=null;this.src='${img.url}'" />
                    </div>
                    <div class="img-info">
                        <div class="img-title" title="${img.title}">${img.title}</div>
                        <div class="img-sub">
                            <span>${img.source || 'Web'}</span>
                            <button class="img-add-btn" onclick="addImageToBoard('${encodeURIComponent(img.url)}')">➕ Add to Board</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    ` : `<p style="color:#9aa0a6; padding: 30px 0; text-align: center;">No high-resolution images found for "${escapedQuery}". Try a different topic or keyword.</p>`;

    const aiBoxHtml = aiOverview ? `
    <div class="ai-overview">
        <div class="ai-header">
            <span class="ai-sparkle">✨</span>
            <span class="ai-title">AI Overview</span>
            <button class="ai-add-btn" onclick="addAiToWhiteboard('${encodeURIComponent(aiOverview.title || query)}', '${encodeURIComponent(aiOverview.summary || '')}', '${encodeURIComponent((aiOverview.keyPoints || []).join(' • '))}')">➕ Add to Board</button>
        </div>
        <p class="ai-summary">${aiOverview.summary || ''}</p>
        ${(aiOverview.keyPoints && aiOverview.keyPoints.length > 0) ? `
            <ul class="ai-points">
                ${aiOverview.keyPoints.map(p => `<li>${p}</li>`).join('')}
            </ul>
        ` : ''}
        ${aiOverview.formulaOrEquation ? `
            <div class="ai-formula">📐 <code>${aiOverview.formulaOrEquation}</code></div>
        ` : ''}
    </div>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapedQuery} - Google ${isImages ? 'Images' : 'Search'}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #202124; color: #e8eaed; padding: 0; margin: 0; }
        .top-bar { position: sticky; top: 0; background: #202124; padding: 12px 20px 8px 20px; display: flex; align-items: center; gap: 16px; z-index: 100; }
        .logo { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; text-decoration: none; user-select: none; flex-shrink: 0; }
        .g-blue { color: #8ab4f8; } .g-red { color: #f28b82; } .g-yellow { color: #fdd663; } .g-green { color: #81c995; }
        .search-form { flex: 1; max-width: 620px; display: flex; align-items: center; background: #303134; border: 1px solid #5f6368; border-radius: 24px; padding: 6px 16px; }
        .search-form:focus-within { border-color: #8ab4f8; }
        .search-input { width: 100%; background: transparent; border: none; outline: none; font-size: 14px; color: #fff; }
        
        .nav-tabs { display: flex; gap: 20px; padding: 0 20px; border-bottom: 1px solid #3c4043; background: #202124; position: sticky; top: 56px; z-index: 99; }
        .nav-tab { display: inline-flex; align-items: center; gap: 6px; padding: 10px 4px; font-size: 13px; color: #9aa0a6; text-decoration: none; border-bottom: 3px solid transparent; font-weight: 500; transition: all 0.15s; }
        .nav-tab:hover { color: #e8eaed; }
        .nav-tab.active { color: #8ab4f8; border-bottom-color: #8ab4f8; font-weight: 600; }
        .tab-icon { width: 15px; height: 15px; fill: currentColor; }

        .container { max-width: ${isImages ? '1000px' : '760px'}; padding: 16px 20px; margin: 0; }
        .ai-overview { background: #17181a; border: 1px solid #3c4043; border-radius: 16px; padding: 16px 18px; margin-bottom: 24px; }
        .ai-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .ai-sparkle { font-size: 16px; }
        .ai-title { font-weight: 700; font-size: 13px; color: #8ab4f8; text-transform: uppercase; letter-spacing: 0.5px; }
        .ai-add-btn { margin-left: auto; background: #29303d; border: 1px solid #3b82f6; color: #93c5fd; border-radius: 12px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .ai-add-btn:hover { background: #1d4ed8; color: #fff; }
        .ai-summary { font-size: 14px; line-height: 1.55; color: #e8eaed; margin-bottom: 10px; }
        .ai-points { margin-left: 20px; font-size: 13px; line-height: 1.5; color: #bdc1c6; }
        .ai-points li { margin-bottom: 6px; }
        .ai-formula { background: #202124; border: 1px solid #3c4043; padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #93c5fd; margin-top: 10px; }
        
        .result-card { margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid #303134; }
        .result-meta { font-size: 11px; color: #bdc1c6; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
        .result-domain { font-weight: 600; color: #dadce0; }
        .result-title { font-size: 17px; font-weight: 500; margin-bottom: 6px; line-height: 1.35; }
        .result-title a { color: #8ab4f8; text-decoration: none; }
        .result-title a:hover { text-decoration: underline; }
        .result-snippet { font-size: 13px; line-height: 1.5; color: #bdc1c6; margin-bottom: 8px; }
        .result-actions { display: flex; align-items: center; gap: 10px; }
        .action-btn { background: #303134; border: 1px solid #5f6368; color: #e8eaed; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; }
        .action-btn:hover { background: #3c4043; border-color: #8ab4f8; }
        .action-link { font-size: 11px; color: #8ab4f8; text-decoration: none; }
        .action-link:hover { text-decoration: underline; }

        .images-container { width: 100%; }
        .images-header { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #8ab4f8; font-weight: 700; margin-bottom: 12px; }
        .images-hint { font-size: 11px; color: #9aa0a6; font-weight: 400; }
        .images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
        .img-card { background: #17181a; border: 1px solid #3c4043; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; cursor: grab; position: relative; transition: all 0.15s; }
        .img-card:hover { border-color: #8ab4f8; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.4); }
        .img-badge { position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.8); color: #8ab4f8; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(138,180,248,0.3); z-index: 5; }
        .img-box { width: 100%; height: 130px; background: #0b0f19; display: flex; align-items: center; justify-content: center; padding: 6px; }
        .img-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .img-info { padding: 8px 10px; background: #202124; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #303134; }
        .img-title { font-size: 11px; font-weight: 600; color: #e8eaed; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .img-sub { display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #9aa0a6; }
        .img-add-btn { background: #303134; border: 1px solid #5f6368; color: #8ab4f8; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; }
        .img-add-btn:hover { background: #8ab4f8; color: #202124; }
    </style>
</head>
<body>
    <div class="top-bar">
        <a class="logo" href="${baseProxy}https://www.google.com">
            <span class="g-blue">G</span><span class="g-red">o</span><span class="g-yellow">o</span><span class="g-blue">g</span><span class="g-green">l</span><span class="g-red">e</span>
        </a>
        <form class="search-form" onsubmit="handleSearch(event)">
            <input class="search-input" id="search-input" type="text" value="${escapedQuery}" />
        </form>
    </div>
    <div class="nav-tabs">
        <a class="nav-tab ${isImages ? '' : 'active'}" href="${googleAllUrl}">
            <svg class="tab-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            All
        </a>
        <a class="nav-tab ${isImages ? 'active' : ''}" href="${googleImagesUrl}">
            <svg class="tab-icon" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            Images
        </a>
    </div>
    <div class="container">
        ${isImages ? imagesHtml : (aiBoxHtml + (resultsHtml || '<p style="color:#9aa0a6; padding: 20px 0;">No web results found for this query. Try a different search term.</p>'))}
    </div>
    <script>
        var BASE_PROXY = ${JSON.stringify(baseProxy)};
        var IS_IMAGES = ${JSON.stringify(isImages)};
        try {
            window.parent.postMessage({ type: 'BROWSER_URL_CHANGED', url: ${JSON.stringify(rawTargetUrl)}, title: ${JSON.stringify(`${query} - Google ${isImages ? 'Images' : 'Search'}`)} }, '*');
        } catch(e) {}
        function handleSearch(e) {
            e.preventDefault();
            var val = document.getElementById('search-input').value.trim();
            if (!val) return;
            var target = 'https://www.google.com/search?q=' + encodeURIComponent(val) + (IS_IMAGES ? '&tbm=isch' : '');
            window.location.href = BASE_PROXY + encodeURIComponent(target);
        }
        function addToWhiteboard(title, url, snippet) {
            try {
                window.parent.postMessage({
                    type: 'BROWSER_ADD_TEXT',
                    text: decodeURIComponent(title) + '\\n' + decodeURIComponent(url) + '\\n' + decodeURIComponent(snippet)
                }, '*');
            } catch(e) {}
        }
        function addAiToWhiteboard(title, summary, points) {
            try {
                window.parent.postMessage({
                    type: 'BROWSER_ADD_TEXT',
                    text: '📌 ' + decodeURIComponent(title) + '\\n\\n' + decodeURIComponent(summary) + '\\n\\n' + decodeURIComponent(points).split(' • ').map(function(p){ return '• ' + p; }).join('\\n')
                }, '*');
            } catch(e) {}
        }
        function addImageToBoard(imageUrl) {
            try {
                window.parent.postMessage({
                    type: 'BROWSER_ADD_IMAGE',
                    url: decodeURIComponent(imageUrl)
                }, '*');
            } catch(e) {}
        }
        function handleDrag(e, title, url) {
            var decodedUrl = decodeURIComponent(url);
            e.dataTransfer.setData('text/plain', decodedUrl);
            e.dataTransfer.setData('text/uri-list', decodedUrl);
            e.dataTransfer.setData('application/x-whiteboard-text', JSON.stringify({
                text: decodeURIComponent(title) + '\\n' + decodedUrl
            }));
        }
        function handleImageDrag(e, url, title) {
            var decodedUrl = decodeURIComponent(url);
            e.dataTransfer.setData('text/plain', decodedUrl);
            e.dataTransfer.setData('text/uri-list', decodedUrl);
            e.dataTransfer.setData('application/x-whiteboard-image', JSON.stringify({
                type: 'image',
                url: decodedUrl,
                title: decodeURIComponent(title)
            }));
        }
    </script>
</body>
</html>`;
}

function renderSmartSecurePortal(targetUrl, appOrigin = '', reason = '') {
    let domain = 'Destination website';
    try {
        const u = new URL(targetUrl);
        domain = u.hostname.replace(/^www\./, '');
    } catch (e) {}

    const escapedUrl = String(targetUrl).replace(/"/g, '&quot;');
    const escapedDomain = String(domain).replace(/"/g, '&quot;');
    const baseProxy = appOrigin ? `${appOrigin}/api/browser/proxy?url=` : '/api/browser/proxy?url=';
    const googleHomeUrl = `${baseProxy}https://www.google.com`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapedDomain} - Secure Portal</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #0b0f19;
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
        }
        .container {
            max-width: 520px;
            width: 100%;
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 20px;
            padding: 30px 26px;
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6);
            text-align: center;
        }
        .badge-bar {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #34d399;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 18px;
        }
        .domain-title {
            font-size: 22px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        .domain-desc {
            font-size: 13px;
            line-height: 1.55;
            color: #94a3b8;
            margin-bottom: 20px;
        }
        .security-notice {
            background: #0f172a;
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 20px;
            text-align: left;
            font-size: 12px;
            color: #cbd5e1;
            line-height: 1.5;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        .security-notice .icon {
            font-size: 18px;
            flex-shrink: 0;
            line-height: 1;
        }
        .url-box {
            background: #030712;
            border: 1px solid #1f2937;
            border-radius: 8px;
            padding: 8px 12px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            color: #38bdf8;
            word-break: break-all;
            margin-bottom: 20px;
            text-align: left;
        }
        .actions-primary {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 16px;
        }
        .btn-live {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #ffffff;
            text-decoration: none;
            padding: 11px 18px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.15s ease;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
            border: none;
            cursor: pointer;
        }
        .btn-live:hover {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            transform: translateY(-1px);
        }
        .btn-popout {
            background: #1e293b;
            color: #f1f5f9;
            text-decoration: none;
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border: 1px solid #334155;
            cursor: pointer;
            transition: background 0.15s;
        }
        .btn-popout:hover {
            background: #334155;
            color: #ffffff;
        }
        .actions-secondary {
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 6px;
        }
        .btn-sub {
            background: transparent;
            color: #94a3b8;
            text-decoration: none;
            font-size: 12px;
            font-weight: 500;
            padding: 6px 12px;
            border-radius: 8px;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.15s;
        }
        .btn-sub:hover {
            color: #f8fafc;
            border-color: #334155;
            background: #1e293b;
        }
    </style>
</head>
<body>
    <div class="container" draggable="true" ondragstart="handleDrag(event)">
        <div class="badge-bar">
            <span>🔒 Direct Security Verification</span>
        </div>
        <h1 class="domain-title">${escapedDomain}</h1>
        <p class="domain-desc">
            This website enforces strict device-level security (Cloudflare/WAF) that requires authentic browser session verification.
        </p>

        <div class="security-notice">
            <div class="icon">🛡️</div>
            <div>
                <strong>Secure Live Access:</strong> Click <strong>Launch Live Site</strong> to open directly in your browser without framing restrictions, or add this reference to your whiteboard.
            </div>
        </div>

        <div class="url-box">${escapedUrl}</div>

        <div class="actions-primary">
            <a class="btn-live" href="${escapedUrl}" target="_blank" rel="noopener noreferrer">
                <span>🚀 Launch Live Site in Secure Tab</span>
                <span>&nearr;</span>
            </a>
            <button class="btn-popout" onclick="openPopout('${escapedUrl}')">
                <span>🪟 Open Popout Window</span>
            </button>
            <button class="btn-popout" onclick="addToWhiteboard('${encodeURIComponent(escapedDomain)}', '${encodeURIComponent(escapedUrl)}')">
                <span>➕ Add Site Reference to Whiteboard</span>
            </button>
        </div>

        <div class="actions-secondary">
            <a class="btn-sub" href="${googleHomeUrl}">🔍 Return to Google Search</a>
            <button class="btn-sub" onclick="window.history.back()">&larr; Back</button>
            <button class="btn-sub" onclick="window.location.reload()">↻ Retry</button>
        </div>
    </div>

    <script>
        try {
            window.parent.postMessage({
                type: 'BROWSER_URL_CHANGED',
                url: ${JSON.stringify(targetUrl)},
                title: ${JSON.stringify(`${domain} (Secure Live Access)`)}
            }, '*');
        } catch(e) {}

        function openPopout(url) {
            window.open(url, 'LabRecLiveWindow', 'width=1100,height=800,menubar=no,toolbar=no,location=yes');
        }

        function addToWhiteboard(title, url) {
            try {
                window.parent.postMessage({
                    type: 'BROWSER_ADD_TEXT',
                    text: '🔗 ' + decodeURIComponent(title) + '\\n' + decodeURIComponent(url) + '\\nWeb Reference'
                }, '*');
            } catch(e) {}
        }

        function handleDrag(e) {
            var url = ${JSON.stringify(targetUrl)};
            e.dataTransfer.setData('text/plain', url);
            e.dataTransfer.setData('text/uri-list', url);
            e.dataTransfer.setData('application/x-whiteboard-text', JSON.stringify({
                text: ${JSON.stringify(domain)} + '\\n' + url
            }));
        }
    </script>
</body>
</html>`;
}

/**
 * @route   GET /api/browser/proxy-image
 * @desc    CORS-busting image proxy for whiteboard canvas stamping
 * @access  Public
 */
router.get('/proxy-image', asyncHandler(async (req, res) => {
    const rawUrl = (req.query.url || '').trim();
    if (!rawUrl) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        const response = await axios.get(rawUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            responseType: 'arraybuffer',
            timeout: 10000,
            maxRedirects: 5
        });

        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(Buffer.from(response.data));
    } catch (err) {
        console.error('[Browser Proxy-Image] Failed to fetch image:', err.message);
        return res.status(502).send('Failed to fetch image');
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

    const appOrigin = `${req.protocol}://${req.get('host')}`;
    const proxyEndpoint = `${appOrigin}/api/browser/proxy?url=`;

    // If user entered a search query instead of a URL, convert to Google Search
    let targetUrl = rawUrl;
    const looksLikeUrl = /^https?:\/\//i.test(targetUrl) || (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(targetUrl) && !targetUrl.includes(' '));
    if (!looksLikeUrl) {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
    } else if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
    }

    // 1. Intercept Google requests to provide an unblockable, native Google Search & Home experience
    const isGoogle = /^(https?:\/\/)?(www\.)?google\.[a-z.]+(\/search)?/i.test(targetUrl) || targetUrl.includes('google.com');
    if (isGoogle) {
        let searchQ = '';
        try {
            const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
            searchQ = parsed.searchParams.get('q') || '';
        } catch (e) {
            const qMatch = targetUrl.match(/[?&]q=([^&]+)/);
            if (qMatch) searchQ = decodeURIComponent(qMatch[1]);
        }

        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Content-Security-Policy-Report-Only');
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        if (searchQ && searchQ.trim()) {
            const queryClean = searchQ.trim();
            const isImages = targetUrl.includes('tbm=isch') || targetUrl.includes('udm=2');

            if (isImages) {
                const images = await fetchHighResolutionImages(queryClean);
                return res.send(renderGoogleSearchPage(queryClean, [], null, targetUrl, appOrigin, { isImages: true, images }));
            }

            const [webResults, aiOverview] = await Promise.all([
                fetchWebSearchResults(queryClean),
                generateAiSearchOverview(queryClean).catch(() => null)
            ]);
            return res.send(renderGoogleSearchPage(queryClean, webResults, aiOverview, targetUrl, appOrigin, { isImages: false }));
        } else {
            return res.send(renderGoogleHomePage(appOrigin));
        }
    }

    // 2. Proxy non-Google web pages with security headers stripped & anti-frame-busting shim injected
    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000,
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

        // Check for bot-protection or HTTP errors (e.g. Cloudflare / WAF 403 on Newegg, etc.)
        const isBotChallenge = typeof response.data === 'string' && (
            response.data.includes('cf-chl-widget') ||
            response.data.includes('challenge-platform') ||
            response.data.includes('Just a moment...')
        );

        if (response.status >= 400 || isBotChallenge) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(renderSmartSecurePortal(targetUrl, appOrigin, `HTTP status ${response.status}`));
        }

        const contentType = response.headers['content-type'] || 'text/html; charset=utf-8';
        res.setHeader('Content-Type', contentType);

        if (contentType.includes('text/html') && typeof response.data === 'string') {
            let html = response.data;
            const finalUrl = response.request?.res?.responseUrl || targetUrl;

            // Remove meta CSP, XFO, origin-trial tags
            html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?(?:Content-Security-Policy|X-Frame-Options|origin-trial)["']?[^>]*>/gi, '');

            // Neutralize frame-busting scripts
            html = html.replace(/\b(window\.)?(top|parent)\.location\b/g, 'window.location');
            html = html.replace(/\b(window\.)?(top|parent)\s*!==?\s*(window\.)?self\b/g, 'false');
            html = html.replace(/\b(window\.)?(top|parent)\s*===?\s*(window\.)?self\b/g, 'true');

            const baseTag = `<base href="${finalUrl}">`;
            const antiFrameBustScript = `
<script>
try {
    Object.defineProperty(window, 'top', { get: function() { return window.self; }, set: function() {} });
    Object.defineProperty(window, 'parent', { get: function() { return window.self; }, set: function() {} });
} catch(e) {}
</script>
`;
            const proxyScript = `
<script>
(function() {
    var PROXY_ENDPOINT = ${JSON.stringify(proxyEndpoint)};
    var FINAL_URL = ${JSON.stringify(finalUrl)};

    try {
        window.parent.postMessage({
            type: 'BROWSER_URL_CHANGED',
            url: FINAL_URL,
            title: document.title || ''
        }, '*');
    } catch(e) {}

    // Intercept all link clicks inside the iframe
    document.addEventListener('click', function(e) {
        var anchor = e.target.closest('a');
        if (!anchor) return;

        var hrefAttr = anchor.getAttribute('href') || '';
        
        // Internal page anchors (e.g. #cite_note-1, #See_also) smoothly scroll
        if (hrefAttr.startsWith('#')) {
            var targetId = hrefAttr.slice(1);
            var targetEl = document.getElementById(targetId) || document.querySelector('[name="' + CSS.escape(targetId) + '"]');
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }

        if (anchor.href && !anchor.href.startsWith('javascript:') && !anchor.href.startsWith('#')) {
            e.preventDefault();
            e.stopPropagation();

            try {
                window.parent.postMessage({
                    type: 'BROWSER_NAVIGATE',
                    url: anchor.href
                }, '*');
            } catch(err) {}

            // Navigate using ABSOLUTE proxy URL so <base href> never hijacks it to destination domain!
            window.location.href = PROXY_ENDPOINT + encodeURIComponent(anchor.href);
        }
    }, true);

    // Intercept form submissions (e.g. search boxes)
    document.addEventListener('submit', function(e) {
        var form = e.target;
        if (form) {
            e.preventDefault();
            e.stopPropagation();
            var actionUrl = form.action || FINAL_URL;
            var method = (form.method || 'GET').toUpperCase();
            if (method === 'GET') {
                var formData = new FormData(form);
                var params = new URLSearchParams(formData);
                var sep = actionUrl.includes('?') ? '&' : '?';
                var fullUrl = actionUrl + sep + params.toString();

                try {
                    window.parent.postMessage({
                        type: 'BROWSER_NAVIGATE',
                        url: fullUrl
                    }, '*');
                } catch(err) {}

                window.location.href = PROXY_ENDPOINT + encodeURIComponent(fullUrl);
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

            const injection = `${baseTag}${antiFrameBustScript}${proxyScript}`;
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${injection}`);
            } else if (html.includes('<html>')) {
                html = html.replace('<html>', `<html><head>${injection}</head>`);
            } else {
                html = `${injection}${html}`;
            }

            return res.send(html);
        }

        return res.send(response.data);
    } catch (err) {
        console.error('[BrowserProxy] Error loading URL:', targetUrl, err.message);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(renderSmartSecurePortal(targetUrl, appOrigin, err.message));
    }
}));

module.exports = router;

