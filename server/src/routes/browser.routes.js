const express = require('express');
const router = express.Router();
const axios = require('axios');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/browser/search
 * @desc    Search Wikipedia, educational summaries, and diagrams/images
 * @access  Public
 */
router.get('/search', asyncHandler(async (req, res) => {
    const { q = '', type = 'all' } = req.query;

    if (!q || !q.trim()) {
        return res.json({
            success: true,
            data: {
                query: '',
                articles: [],
                images: []
            }
        });
    }

    const query = q.trim();
    let articles = [];
    let images = [];

    try {
        // 1. Wikipedia Search (Opensearch / Extract API)
        const wikiRes = await axios.get('https://en.wikipedia.org/w/api.php', {
            params: {
                action: 'query',
                generator: 'search',
                gsrsearch: query,
                gsrlimit: 6,
                prop: 'extracts|pageimages',
                exintro: true,
                explaintext: true,
                exsentences: 4,
                piprop: 'thumbnail|original',
                pithumbsize: 600,
                format: 'json',
                origin: '*'
            },
            timeout: 8000
        });

        if (wikiRes.data?.query?.pages) {
            const pages = Object.values(wikiRes.data.query.pages);
            articles = pages.map(p => ({
                id: p.pageid,
                title: p.title,
                extract: p.extract || '',
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
                thumbnail: p.thumbnail?.source || null,
                originalImage: p.original?.source || null
            }));

            // Extract images from pages
            pages.forEach(p => {
                if (p.original?.source || p.thumbnail?.source) {
                    images.push({
                        title: p.title,
                        url: p.original?.source || p.thumbnail?.source,
                        thumbnail: p.thumbnail?.source || p.original?.source,
                        source: 'Wikipedia'
                    });
                }
            });
        }

        // 2. Wikimedia Commons Image Search for Diagrams & Educational Visuals
        if (type === 'images' || type === 'all' || images.length < 4) {
            try {
                const commonsRes = await axios.get('https://commons.wikimedia.org/w/api.php', {
                    params: {
                        action: 'query',
                        generator: 'search',
                        gsrsearch: `${query} filetype:bitmap|drawing`,
                        gsrnamespace: 6, // File namespace
                        gsrlimit: 10,
                        prop: 'imageinfo',
                        iiprop: 'url|size|mime',
                        iiurlwidth: 500,
                        format: 'json',
                        origin: '*'
                    },
                    timeout: 8000
                });

                if (commonsRes.data?.query?.pages) {
                    const files = Object.values(commonsRes.data.query.pages);
                    files.forEach(f => {
                        const info = f.imageinfo?.[0];
                        if (info && info.thumburl && !info.thumburl.endsWith('.svg.png') && !images.some(img => img.url === info.url)) {
                            images.push({
                                title: f.title.replace(/^File:/, '').replace(/\.[^/.]+$/, ''),
                                url: info.url || info.thumburl,
                                thumbnail: info.thumburl || info.url,
                                source: 'Wikimedia Commons',
                                width: info.width,
                                height: info.height
                            });
                        }
                    });
                }
            } catch (imgErr) {
                console.warn('[BrowserRoutes] Commons image search error:', imgErr.message);
            }
        }

        // 3. Fallback educational images if empty
        if (images.length === 0) {
            images = [
                {
                    title: `${query} Visual Note`,
                    url: `https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80`,
                    thumbnail: `https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&auto=format&fit=crop&q=80`,
                    source: 'Unsplash'
                },
                {
                    title: `Study & Concept Diagram`,
                    url: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80`,
                    thumbnail: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80`,
                    source: 'Unsplash'
                }
            ];
        }

        res.json({
            success: true,
            data: {
                query,
                articles,
                images
            }
        });
    } catch (error) {
        console.error('[BrowserRoutes] Search error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve research articles or diagrams',
            error: error.message
        });
    }
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

    try {
        const articleRes = await axios.get('https://en.wikipedia.org/w/api.php', {
            params: {
                action: 'query',
                prop: 'extracts|pageimages',
                titles: title.trim(),
                explaintext: true,
                piprop: 'original|thumbnail',
                pithumbsize: 600,
                format: 'json',
                origin: '*'
            },
            timeout: 8000
        });

        const pages = articleRes.data?.query?.pages || {};
        const page = Object.values(pages)[0];

        if (!page || page.missing) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }

        // Split text into readable paragraphs for easy copy-to-board
        const paragraphs = (page.extract || '')
            .split(/\n\n+/)
            .map(p => p.trim())
            .filter(p => p.length > 30 && !p.startsWith('=='));

        res.json({
            success: true,
            data: {
                id: page.pageid,
                title: page.title,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
                heroImage: page.original?.source || page.thumbnail?.source || null,
                paragraphs
            }
        });
    } catch (error) {
        console.error('[BrowserRoutes] Article fetch error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch article content'
        });
    }
}));

module.exports = router;
