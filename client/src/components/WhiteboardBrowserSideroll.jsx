'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Globe, Search, ArrowLeft, ArrowRight, RotateCw, Home,
    ExternalLink, Plus, Image as ImageIcon,
    X, Maximize2, Minimize2, Bookmark, Layout,
    Play, Film, Eye, Sparkles, CheckCircle2,
    Copy, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { browserAPI } from '@/lib/api';

const BROWSER_BOOKMARKS = [
    { label: 'Google Search', icon: '🔍', url: 'https://www.google.com' },
    { label: 'Wikipedia', icon: '📖', url: 'https://en.wikipedia.org' },
    { label: 'PhET Simulations', icon: '🔬', url: 'https://phet.colorado.edu/en/simulations/filter?type=html' },
    { label: 'Khan Academy', icon: '🎓', url: 'https://www.khanacademy.org' },
    { label: 'Wolfram Alpha', icon: '🧮', url: 'https://www.wolframalpha.com' },
    { label: 'Britannica', icon: '📚', url: 'https://www.britannica.com' }
];

const IMAGE_TOPIC_PRESETS = [
    { label: 'Photosynthesis', query: 'Photosynthesis diagram' },
    { label: 'Heart Anatomy', query: 'Human heart anatomy diagram' },
    { label: 'Periodic Table', query: 'Periodic table of elements' },
    { label: 'Newton Laws', query: 'Newton laws of motion infographic' },
    { label: 'Wave Optics', query: 'Wave optics interference refraction' },
    { label: 'Electric Circuit', query: 'Electric circuit schematic diagram' },
    { label: 'DNA Structure', query: 'DNA double helix diagram' }
];

const YOUTUBE_TOPIC_PRESETS = [
    { label: 'Khan Academy Physics', query: 'Khan Academy Physics' },
    { label: 'CrashCourse Biology', query: 'CrashCourse Biology' },
    { label: '3Blue1Brown Calculus', query: '3Blue1Brown Calculus' },
    { label: 'Eduniti Physics', query: 'Eduniti Physics Revision' },
    { label: 'Chemistry Lab', query: 'Chemistry lab experiments' },
    { label: 'Computer Science', query: 'CrashCourse Computer Science' }
];

export default function WhiteboardBrowserSideroll({
    mode = 'closed', // 'closed' | 'partial' | 'full'
    onModeChange,
    onAddTextToBoard,
    onAddImageToBoard,
    onCopyImageToBoard,
    onAddAIPanelToBoard,
    onAddMediaToBoard
}) {
    // 3 Primary Tabs: 'browser' | 'images' | 'youtube'
    const [activeTab, setActiveTab] = useState('browser');

    // --- Tab 1: Direct Web Browser State ---
    const [browserCurrentUrl, setBrowserCurrentUrl] = useState('https://www.google.com');
    const [browserUrlInput, setBrowserUrlInput] = useState('https://www.google.com');
    const [browserTitle, setBrowserTitle] = useState('Google');
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const [browserHistory, setBrowserHistory] = useState(['https://www.google.com']);
    const [browserHistoryIdx, setBrowserHistoryIdx] = useState(0);
    const iframeRef = useRef(null);

    // --- Tab 2: Google Images State ---
    const [imageQuery, setImageQuery] = useState('');
    const [imagesList, setImagesList] = useState([]);
    const [isLoadingImages, setIsLoadingImages] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [copiedImgIdx, setCopiedImgIdx] = useState(null);

    // --- Tab 3: YouTube Search State ---
    const [youtubeQuery, setYoutubeQuery] = useState('');
    const [videosList, setVideosList] = useState([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);
    const [previewVideo, setPreviewVideo] = useState(null);

    // Initial search triggers when panel is opened
    useEffect(() => {
        if (mode !== 'closed') {
            if (imagesList.length === 0 && !imageQuery) {
                setImageQuery('Photosynthesis diagram');
                handleSearchImages('Photosynthesis diagram');
            }
            if (videosList.length === 0 && !youtubeQuery) {
                setYoutubeQuery('Newton laws of motion');
                handleSearchYouTube('Newton laws of motion');
            }
        }
    }, [mode]);

    // Listen to postMessage from the proxied browser iframe
    useEffect(() => {
        const handleMessage = (e) => {
            if (e.data?.type === 'BROWSER_URL_CHANGED' && e.data.url) {
                const newUrl = e.data.url;
                setBrowserCurrentUrl(newUrl);
                setBrowserUrlInput(newUrl);
                if (e.data.title) setBrowserTitle(e.data.title);
                setIsLoadingPage(false);

                // Add to history stack if different
                setBrowserHistory(prev => {
                    if (prev[prev.length - 1] !== newUrl) {
                        return [...prev.slice(0, browserHistoryIdx + 1), newUrl];
                    }
                    return prev;
                });
                setBrowserHistoryIdx(prev => prev + 1);
            }
            if (e.data?.type === 'BROWSER_NAVIGATE' && e.data.url) {
                const newUrl = e.data.url;
                setBrowserUrlInput(newUrl);
                setIsLoadingPage(true);
            }
            if (e.data?.type === 'BROWSER_ADD_TEXT' && e.data.text) {
                if (onAddTextToBoard) {
                    onAddTextToBoard(e.data.text);
                    toast.success('Text added to whiteboard!');
                }
            }
            if (e.data?.type === 'BROWSER_ADD_IMAGE' && e.data.url) {
                handleInsertImageToBoard(e.data.url);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [browserHistoryIdx, onAddTextToBoard, onAddImageToBoard]);

    // --- Web Browser Handlers ---
    const handleNavigateBrowser = (target) => {
        let raw = (target || browserUrlInput || '').trim();
        if (!raw) return;

        let finalUrl = raw;
        const looksLikeUrl = /^https?:\/\//i.test(finalUrl) || (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(finalUrl) && !finalUrl.includes(' '));
        if (!looksLikeUrl) {
            finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
        } else if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = `https://${finalUrl}`;
        }

        setBrowserUrlInput(finalUrl);
        setBrowserCurrentUrl(finalUrl);
        setIsLoadingPage(true);

        setBrowserHistory(prev => [...prev.slice(0, browserHistoryIdx + 1), finalUrl]);
        setBrowserHistoryIdx(prev => prev + 1);
    };

    const handleBrowserBack = () => {
        if (browserHistoryIdx > 0) {
            const nextIdx = browserHistoryIdx - 1;
            const target = browserHistory[nextIdx];
            setBrowserHistoryIdx(nextIdx);
            setBrowserCurrentUrl(target);
            setBrowserUrlInput(target);
            setIsLoadingPage(true);
        } else {
            try {
                iframeRef.current?.contentWindow?.history?.back();
            } catch (e) {}
        }
    };

    const handleBrowserForward = () => {
        if (browserHistoryIdx < browserHistory.length - 1) {
            const nextIdx = browserHistoryIdx + 1;
            const target = browserHistory[nextIdx];
            setBrowserHistoryIdx(nextIdx);
            setBrowserCurrentUrl(target);
            setBrowserUrlInput(target);
            setIsLoadingPage(true);
        } else {
            try {
                iframeRef.current?.contentWindow?.history?.forward();
            } catch (e) {}
        }
    };

    const handleBrowserReload = () => {
        if (iframeRef.current) {
            setIsLoadingPage(true);
            const currentSrc = iframeRef.current.src;
            iframeRef.current.src = currentSrc;
        }
    };

    const handleBrowserHome = () => {
        handleNavigateBrowser('https://www.google.com');
    };

    const handleDropCurrentPageToBoard = () => {
        if (onAddAIPanelToBoard) {
            let domain = 'Web Page';
            try { domain = new URL(browserCurrentUrl).hostname.replace(/^www\./, ''); } catch (e) {}
            const panelData = {
                id: `weblink_${Date.now()}`,
                title: browserTitle || domain || 'Web Reference',
                summary: `Source reference from ${domain}: ${browserCurrentUrl}`,
                keyPoints: [
                    `Domain: ${domain}`,
                    `Reference URL: ${browserCurrentUrl}`,
                    'Interactive web research reference'
                ],
                formulaOrEquation: null,
                images: [],
                diagramUrl: null,
                x: 80,
                y: 80,
                width: 440,
                height: 'auto'
            };
            onAddAIPanelToBoard(panelData);
            toast.success('Web page card added to whiteboard!', { icon: '🔗' });
        } else if (onAddTextToBoard) {
            onAddTextToBoard(`${browserTitle || 'Web Link'}\n${browserCurrentUrl}`);
            toast.success('Web link added to whiteboard!');
        }
    };

    // --- Google Images Handlers ---
    const handleSearchImages = async (queryToSearch) => {
        const q = (queryToSearch !== undefined ? queryToSearch : imageQuery).trim();
        if (!q) return;

        try {
            setIsLoadingImages(true);
            setImagesList([]); // Clear previous images immediately
            const res = await browserAPI.searchImages({ q });
            if (res.data?.success && Array.isArray(res.data.data?.images)) {
                setImagesList(res.data.data.images);
            }
        } catch (err) {
            console.error('Image search error:', err);
            toast.error('Failed to load images');
        } finally {
            setIsLoadingImages(false);
        }
    };

    const handleInsertImageToBoard = (imageUrl) => {
        if (!imageUrl) return;
        if (onAddImageToBoard) {
            onAddImageToBoard(imageUrl);
        }
    };

    const handleCopyImage = async (img, idx) => {
        if (!img) return;
        const targetUrl = img.url || img.thumbnail;
        if (!targetUrl) return;

        try {
            await navigator.clipboard.writeText(targetUrl);
        } catch (_) {}

        if (onCopyImageToBoard) {
            onCopyImageToBoard({
                type: 'image',
                src: targetUrl,
                title: img.title || 'Copied Web Image',
                width: 400,
                height: 300
            });
        }
        setCopiedImgIdx(idx);
        setTimeout(() => setCopiedImgIdx(null), 2000);
        toast.success('Image copied to clipboard! Paste on whiteboard or press Ctrl+V', { icon: '📋' });
    };

    // --- YouTube Search Handlers ---
    const handleSearchYouTube = async (queryToSearch) => {
        const q = (queryToSearch !== undefined ? queryToSearch : youtubeQuery).trim();
        if (!q) return;

        try {
            setIsLoadingVideos(true);
            setPreviewVideo(null);
            const res = await browserAPI.searchYoutube({ q });
            if (res.data?.success && Array.isArray(res.data.data?.videos)) {
                setVideosList(res.data.data.videos);
            }
        } catch (err) {
            console.error('YouTube search error:', err);
            toast.error('Failed to load videos');
        } finally {
            setIsLoadingVideos(false);
        }
    };

    const handleInsertYouTubeVideoToBoard = (video) => {
        if (!video) return;
        const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
        if (onAddMediaToBoard) {
            onAddMediaToBoard({
                mediaType: 'youtube',
                url: videoUrl,
                title: video.title || 'YouTube Educational Video',
                thumbnail: video.thumbnail
            });
            toast.success(`Embedded "${(video.title || 'Video').slice(0, 30)}..." on canvas!`, { icon: '▶️' });
        } else {
            toast.error('Canvas media embedding not supported on this board');
        }
    };

    // External Open Links
    const handleOpenExternal = (type) => {
        if (type === 'browser') {
            window.open(browserCurrentUrl, '_blank', 'noopener,noreferrer');
        } else if (type === 'images') {
            const q = encodeURIComponent(imageQuery || 'science diagram');
            window.open(`https://www.google.com/search?tbm=isch&q=${q}`, '_blank', 'noopener,noreferrer');
        } else if (type === 'youtube') {
            const q = encodeURIComponent(youtubeQuery || 'educational lessons');
            window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank', 'noopener,noreferrer');
        }
    };

    if (mode === 'closed') {
        return null;
    }

    const panelWidthStyle = mode === 'full' 
        ? 'w-full max-w-full' 
        : 'w-[580px] max-w-[640px] min-w-[420px]';

    return (
        <aside
            className={`${panelWidthStyle} h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 text-slate-100 flex flex-col z-40 transition-all duration-300 shadow-2xl relative select-none`}
        >
            {/* Top Hub Navigation Bar */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0 bg-slate-950/70">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                        <Globe className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-white tracking-wide">
                        Web & Media Hub
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Quick external launcher for current tab */}
                    <button
                        onClick={() => handleOpenExternal(activeTab)}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition flex items-center gap-1 text-[11px] font-semibold"
                        title={activeTab === 'browser' ? 'Open URL in new tab' : activeTab === 'images' ? 'Search Google Images externally' : 'Search YouTube externally'}
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span className="hidden sm:inline text-[10px]">Open External</span>
                    </button>

                    {/* Sideroll Size Toggle & Close */}
                    <button
                        onClick={() => onModeChange(mode === 'full' ? 'partial' : 'full')}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        title={mode === 'full' ? 'Split View' : 'Full Screen'}
                    >
                        {mode === 'full' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => onModeChange('closed')}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition"
                        title="Close Hub"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 3 Dedicated Easy-Access Tabs: 1. Web Browser, 2. Google Images, 3. YouTube */}
            <div className="flex items-center border-b border-slate-800 px-3 py-2 gap-2 bg-slate-950/50 text-xs flex-shrink-0">
                {/* 1. Direct Web Browser Tab */}
                <button
                    onClick={() => setActiveTab('browser')}
                    className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs ${
                        activeTab === 'browser'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/50'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                    <Globe className="w-4 h-4" />
                    <span>Web Browser</span>
                </button>

                {/* 2. Google Images Tab */}
                <button
                    onClick={() => setActiveTab('images')}
                    className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs ${
                        activeTab === 'images'
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-1 ring-cyan-400/50'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                    <ImageIcon className="w-4 h-4" />
                    <span>Google Images</span>
                </button>

                {/* 3. YouTube Search Tab */}
                <button
                    onClick={() => setActiveTab('youtube')}
                    className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs ${
                        activeTab === 'youtube'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400/50'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                    <Film className="w-4 h-4" />
                    <span>YouTube</span>
                </button>
            </div>

            {/* TAB 1: DIRECT INTERACTIVE WEB BROWSER */}
            {activeTab === 'browser' && (
                <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
                    {/* Browser Address Bar & Navigation Controls */}
                    <div className="p-2 border-b border-slate-800 bg-slate-900 flex items-center gap-1.5 flex-shrink-0">
                        {/* Back / Forward / Reload / Home */}
                        <div className="flex items-center gap-0.5 text-slate-400">
                            <button
                                onClick={handleBrowserBack}
                                className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition"
                                title="Back"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleBrowserForward}
                                className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition"
                                title="Forward"
                            >
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleBrowserReload}
                                className={`p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition ${isLoadingPage ? 'animate-spin text-blue-400' : ''}`}
                                title="Reload Page"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleBrowserHome}
                                className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition"
                                title="Google Home"
                            >
                                <Home className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* URL Omnibox Input */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleNavigateBrowser();
                            }}
                            className="flex-1 flex items-center bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs focus-within:border-blue-500 transition"
                        >
                            <Search className="w-3.5 h-3.5 text-slate-500 mr-2 flex-shrink-0" />
                            <input
                                type="text"
                                value={browserUrlInput}
                                onChange={(e) => setBrowserUrlInput(e.target.value)}
                                placeholder="Enter URL or search Google directly..."
                                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                            />
                            {browserUrlInput && (
                                <button
                                    type="button"
                                    onClick={() => setBrowserUrlInput('')}
                                    className="text-slate-500 hover:text-slate-300 p-0.5 mr-1"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition shrink-0"
                            >
                                Go
                            </button>
                        </form>

                        {/* Drop URL Card to Whiteboard */}
                        <button
                            onClick={handleDropCurrentPageToBoard}
                            className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl transition flex items-center gap-1 text-[11px] font-semibold border border-slate-700/80 shrink-0 shadow-sm"
                            title="Drop current web page reference card onto the whiteboard"
                        >
                            <Plus className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="hidden sm:inline">Add to Board</span>
                        </button>
                    </div>

                    {/* Quick Bookmark Chips */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-800/80 bg-slate-950/60 overflow-x-auto custom-scrollbar flex-shrink-0 text-[11px]">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">
                            Sites:
                        </span>
                        {BROWSER_BOOKMARKS.map((bm) => (
                            <button
                                key={bm.label}
                                onClick={() => handleNavigateBrowser(bm.url)}
                                className="px-2 py-0.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white whitespace-nowrap transition border border-slate-700/60 flex items-center gap-1"
                            >
                                <span>{bm.icon}</span>
                                <span>{bm.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Live Browser Iframe Viewport */}
                    <div className="flex-1 w-full h-full relative bg-slate-950 overflow-hidden flex flex-col">
                        {isLoadingPage && (
                            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-10 gap-2">
                                <RotateCw className="w-5 h-5 animate-spin text-blue-400" />
                                <span className="text-xs text-slate-300 font-medium">Loading live web page...</span>
                            </div>
                        )}
                        <iframe
                            ref={iframeRef}
                            src={`/api/browser/proxy?url=${encodeURIComponent(browserCurrentUrl)}`}
                            title={browserTitle || 'Web Browser'}
                            className="flex-1 w-full h-full border-0 bg-white"
                            onLoad={() => setIsLoadingPage(false)}
                            onError={() => setIsLoadingPage(false)}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                        />
                    </div>
                </div>
            )}

            {/* TAB 2: DEDICATED GOOGLE IMAGES & HIGH-RES DIAGRAM SEARCH */}
            {activeTab === 'images' && (
                <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-y-auto custom-scrollbar select-text">
                    {/* Dedicated Image Search Bar */}
                    <div className="p-3 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-20 backdrop-blur-md space-y-2">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSearchImages();
                            }}
                            className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs focus-within:border-cyan-500 transition shadow-inner"
                        >
                            <ImageIcon className="w-4 h-4 text-cyan-400 mr-2 flex-shrink-0" />
                            <input
                                type="text"
                                value={imageQuery}
                                onChange={(e) => setImageQuery(e.target.value)}
                                placeholder="Search Google Images & High-Res Diagrams..."
                                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                            />
                            {imageQuery && (
                                <button
                                    type="button"
                                    onClick={() => setImageQuery('')}
                                    className="text-slate-500 hover:text-slate-300 p-0.5 mr-1.5"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
                            >
                                <Search className="w-3 h-3" />
                                <span>Search</span>
                            </button>
                        </form>

                        {/* Image Topic Presets */}
                        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[11px] pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">
                                Topics:
                            </span>
                            {IMAGE_TOPIC_PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => {
                                        setImageQuery(preset.query);
                                        handleSearchImages(preset.query);
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 whitespace-nowrap transition border border-slate-700/60"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Image Results Grid */}
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Google Image Results ({imagesList.length})</span>
                            </span>
                            <button
                                onClick={() => handleOpenExternal('images')}
                                className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
                            >
                                <span>Google Images</span>
                                <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>

                        {isLoadingImages ? (
                            <div className="py-24 text-center space-y-3">
                                <RotateCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                                <p className="text-xs text-slate-400 font-medium">Fetching crystal-clear diagrams & HD images...</p>
                            </div>
                        ) : imagesList.length === 0 ? (
                            <div className="py-16 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 p-6 space-y-2">
                                <ImageIcon className="w-10 h-10 mx-auto text-slate-600" />
                                <p>No images found. Try a different academic topic or search Google directly.</p>
                                <button
                                    onClick={() => handleOpenExternal('images')}
                                    className="text-cyan-400 underline font-semibold"
                                >
                                    Open Google Images in new tab &rarr;
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {imagesList.map((img, idx) => (
                                    <div
                                        key={idx}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', img.url);
                                            e.dataTransfer.setData('text/uri-list', img.url);
                                            e.dataTransfer.setData('application/x-whiteboard-image', JSON.stringify({
                                                type: 'image',
                                                url: img.url,
                                                title: img.title
                                            }));
                                        }}
                                        className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-400/80 rounded-2xl overflow-hidden shadow-lg transition duration-200 cursor-grab active:cursor-grabbing flex flex-col justify-between"
                                    >
                                        {/* HD Tag */}
                                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                                            <span className="bg-black/80 backdrop-blur-md text-cyan-300 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md border border-cyan-500/30 shadow">
                                                {img.resolution || 'HD'}
                                            </span>
                                        </div>

                                        {/* Preview Icon Button */}
                                        <button
                                            type="button"
                                            onClick={() => setPreviewImage(img)}
                                            className="absolute top-2 right-2 z-10 bg-black/80 hover:bg-cyan-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition shadow"
                                            title="Preview image in full resolution"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Image Display */}
                                        <div 
                                            onClick={() => setPreviewImage(img)}
                                            className="w-full h-36 bg-black/60 flex items-center justify-center p-2 cursor-pointer"
                                        >
                                            <img
                                                src={img.thumbnail || img.url}
                                                alt={img.title}
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                loading="lazy"
                                                crossOrigin="anonymous"
                                                onError={(e) => {
                                                    if (e.currentTarget.src !== img.url && img.url) {
                                                        e.currentTarget.src = img.url;
                                                    } else {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = 'https://placehold.co/400x300/0f172a/38bdf8?text=Image+Unavailable';
                                                    }
                                                }}
                                            />
                                        </div>

                                        {/* Card Footer with 1-Click Insert */}
                                        <div className="p-2.5 bg-slate-950 border-t border-slate-800 space-y-1.5">
                                            <p className="text-[11px] font-semibold text-slate-200 truncate" title={img.title}>
                                                {img.title}
                                            </p>
                                            <div className="flex items-center justify-between text-[10px] text-slate-400 gap-1.5">
                                                <span className="truncate max-w-[80px]">{img.source || 'Google Images'}</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyImage(img, idx)}
                                                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border border-slate-700 shadow cursor-pointer"
                                                        title="Copy image to clipboard / whiteboard paste"
                                                    >
                                                        {copiedImgIdx === idx ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                                                        <span>{copiedImgIdx === idx ? 'Copied' : 'Copy'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleInsertImageToBoard(img.url || img.thumbnail)}
                                                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow cursor-pointer"
                                                        title="Insert image onto active whiteboard page"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        <span>Insert</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: DEDICATED YOUTUBE EDUCATIONAL VIDEO SEARCH */}
            {activeTab === 'youtube' && (
                <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-y-auto custom-scrollbar select-text">
                    {/* Dedicated YouTube Search Bar */}
                    <div className="p-3 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-20 backdrop-blur-md space-y-2">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSearchYouTube();
                            }}
                            className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs focus-within:border-rose-500 transition shadow-inner"
                        >
                            <Film className="w-4 h-4 text-rose-500 mr-2 flex-shrink-0" />
                            <input
                                type="text"
                                value={youtubeQuery}
                                onChange={(e) => setYoutubeQuery(e.target.value)}
                                placeholder="Search YouTube Educational Videos..."
                                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                            />
                            {youtubeQuery && (
                                <button
                                    type="button"
                                    onClick={() => setYoutubeQuery('')}
                                    className="text-slate-500 hover:text-slate-300 p-0.5 mr-1.5"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
                            >
                                <Search className="w-3 h-3" />
                                <span>Search</span>
                            </button>
                        </form>

                        {/* YouTube Topic Presets */}
                        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[11px] pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">
                                Channels:
                            </span>
                            {YOUTUBE_TOPIC_PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => {
                                        setYoutubeQuery(preset.query);
                                        handleSearchYouTube(preset.query);
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 whitespace-nowrap transition border border-slate-700/60"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* YouTube Video List */}
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Film className="w-3.5 h-3.5" />
                                <span>YouTube Videos ({videosList.length})</span>
                            </span>
                            <button
                                onClick={() => handleOpenExternal('youtube')}
                                className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1 transition"
                            >
                                <span>YouTube Search</span>
                                <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Inline Preview Video Player */}
                        {previewVideo && (
                            <div className="bg-slate-900 border border-rose-500/60 rounded-2xl overflow-hidden shadow-2xl p-2.5 space-y-2 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-xs font-bold text-rose-300 truncate max-w-[340px]">
                                        {previewVideo.title}
                                    </span>
                                    <button
                                        onClick={() => setPreviewVideo(null)}
                                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                                    <iframe
                                        src={`https://www.youtube-nocookie.com/embed/${previewVideo.videoId}?autoplay=1`}
                                        title={previewVideo.title}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        Playing inline preview
                                    </span>
                                    <button
                                        onClick={() => handleInsertYouTubeVideoToBoard(previewVideo)}
                                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Insert Video on Whiteboard</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {isLoadingVideos ? (
                            <div className="py-24 text-center space-y-3">
                                <RotateCw className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
                                <p className="text-xs text-slate-400 font-medium">Fetching educational videos & lessons...</p>
                            </div>
                        ) : videosList.length === 0 ? (
                            <div className="py-16 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 p-6 space-y-2">
                                <Film className="w-10 h-10 mx-auto text-slate-600" />
                                <p>No videos found. Try a different topic or search YouTube directly.</p>
                                <button
                                    onClick={() => handleOpenExternal('youtube')}
                                    className="text-rose-400 underline font-semibold"
                                >
                                    Open YouTube in new tab &rarr;
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {videosList.map((vid, idx) => (
                                    <div
                                        key={idx}
                                        draggable
                                        onDragStart={(e) => {
                                            const videoUrl = `https://www.youtube.com/watch?v=${vid.videoId}`;
                                            e.dataTransfer.setData('text/plain', videoUrl);
                                            e.dataTransfer.setData('text/uri-list', videoUrl);
                                            e.dataTransfer.setData('application/x-whiteboard-media', JSON.stringify({
                                                type: 'youtube',
                                                videoId: vid.videoId,
                                                url: videoUrl,
                                                title: vid.title,
                                                thumbnail: vid.thumbnail
                                            }));
                                        }}
                                        className="bg-slate-900 border border-slate-800 hover:border-rose-500/70 rounded-2xl p-3 flex flex-col gap-2.5 transition shadow-lg cursor-grab active:cursor-grabbing group"
                                    >
                                        <div className="flex gap-3">
                                            {/* Video Thumbnail with duration badge and play hover */}
                                            <div 
                                                onClick={() => setPreviewVideo(vid)}
                                                className="relative w-36 h-20 rounded-xl overflow-hidden bg-black/60 flex-shrink-0 cursor-pointer group-hover:ring-1 group-hover:ring-rose-500 transition"
                                            >
                                                <img
                                                    src={vid.thumbnail}
                                                    alt={vid.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = `https://i.ytimg.com/vi/${vid.videoId}/hqdefault.jpg`;
                                                    }}
                                                />
                                                {vid.duration && (
                                                    <span className="absolute bottom-1 right-1 bg-black/85 text-white font-bold text-[9px] px-1.5 py-0.2 rounded shadow">
                                                        {vid.duration}
                                                    </span>
                                                )}
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                    <div className="w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-lg">
                                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Title & Metadata */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <h5
                                                    onClick={() => setPreviewVideo(vid)}
                                                    className="text-xs font-bold text-white hover:text-rose-400 transition cursor-pointer line-clamp-2 leading-snug"
                                                    title={vid.title}
                                                >
                                                    {vid.title}
                                                </h5>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {vid.channel}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                    {vid.views && <span>{vid.views}</span>}
                                                    {vid.published && <span>• {vid.published}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Action Row */}
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewVideo(vid)}
                                                className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                                            >
                                                <Play className="w-3 h-3 fill-current" />
                                                <span>Preview</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleInsertYouTubeVideoToBoard(vid)}
                                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow"
                                                title="Insert as floating video player on whiteboard"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>Insert on Whiteboard</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Fullscreen Image Preview Lightbox Modal */}
            {previewImage && (
                <div 
                    onClick={() => setPreviewImage(null)}
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        {/* Lightbox Header */}
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="min-w-0 pr-4">
                                <h3 className="text-sm font-bold text-white truncate">
                                    {previewImage.title}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {previewImage.source || 'Web Image'} • {previewImage.resolution || 'HD'}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Image View */}
                        <div className="flex-1 bg-black/60 flex items-center justify-center p-4 overflow-hidden min-h-[300px]">
                            <img
                                src={previewImage.url || previewImage.thumbnail}
                                alt={previewImage.title}
                                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-2xl"
                            />
                        </div>

                        {/* Lightbox Footer Actions */}
                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                            <a
                                href={previewImage.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium"
                            >
                                <span>Open full original</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        handleInsertImageToBoard(previewImage.url);
                                        setPreviewImage(null);
                                    }}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-600/30"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Insert on Whiteboard</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
