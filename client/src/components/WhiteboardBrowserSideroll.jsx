'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Globe, Search, ArrowLeft, ArrowRight, RotateCw, 
    ExternalLink, Copy, Check, Plus, Image as ImageIcon, 
    BookOpen, Sparkles, X, Maximize2, Minimize2, MoveRight,
    MousePointer, HelpCircle, Layers, Bookmark, Layout, CheckCircle2,
    Compass, Filter, Play, Film, Video, Eye, Download, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { browserAPI } from '@/lib/api';

const SUBJECT_PRESETS = [
    { label: 'Photosynthesis', query: 'Photosynthesis' },
    { label: 'DNA & Genetics', query: 'DNA replication genetics' },
    { label: 'Newton Laws', query: 'Newton laws of motion' },
    { label: 'Periodic Table', query: 'Periodic table of elements' },
    { label: 'Calculus', query: 'Fundamental theorem of calculus' },
    { label: 'Wave Optics', query: 'Wave optics interference refraction' },
    { label: 'Binary Search', query: 'Binary search algorithm' }
];

export default function WhiteboardBrowserSideroll({
    mode = 'closed', // 'closed' | 'partial' | 'full'
    onModeChange,
    onAddTextToBoard,
    onAddImageToBoard,
    onAddAIPanelToBoard,
    onAddMediaToBoard
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('images'); // 'images' | 'youtube' | 'all' | 'web' | 'ai' | 'articles'
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState({
        query: '',
        aiOverview: null,
        webResults: [],
        articles: [],
        images: [],
        videos: []
    });
    
    // Image Preview Lightbox Modal
    const [previewImage, setPreviewImage] = useState(null);

    // Active Inline YouTube Video Preview Player
    const [previewVideo, setPreviewVideo] = useState(null);

    // Detailed Article View inside Browser
    const [currentArticle, setCurrentArticle] = useState(null);
    const [isLoadingArticle, setIsLoadingArticle] = useState(false);
    
    // Selected text floating tooltip
    const [selectedText, setSelectedText] = useState('');
    const articleContainerRef = useRef(null);

    // Initial default search
    useEffect(() => {
        if (mode !== 'closed' && !searchResults.query) {
            handleSearch('Physics laws of motion');
        }
    }, [mode]);

    const handleSearch = async (queryToSearch) => {
        const q = (queryToSearch || searchQuery).trim();
        if (!q) return;

        try {
            setIsLoading(true);
            setCurrentArticle(null);
            setPreviewVideo(null);

            const res = await browserAPI.search({ q, type: activeTab, includeAi: 'true' });
            if (res.data?.success) {
                setSearchResults(res.data.data);
            }
        } catch (err) {
            console.error('Browser search error:', err);
            toast.error('Search failed to load results');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenArticle = async (articleTitle) => {
        try {
            setIsLoadingArticle(true);
            const res = await browserAPI.getArticle({ title: articleTitle });
            if (res.data?.success) {
                setCurrentArticle(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load article', err);
            toast.error('Failed to load article');
        } finally {
            setIsLoadingArticle(false);
        }
    };

    // Text selection detection
    const handleMouseUp = () => {
        if (typeof window !== 'undefined') {
            const selection = window.getSelection();
            const text = selection ? selection.toString().trim() : '';
            if (text.length > 5) {
                setSelectedText(text);
            } else {
                setSelectedText('');
            }
        }
    };

    const handleCopySelectedTextToBoard = () => {
        if (!selectedText) return;
        if (onAddTextToBoard) {
            onAddTextToBoard(selectedText);
            toast.success('Text dropped onto whiteboard!');
            setSelectedText('');
        }
    };

    const handleCopyParagraphToBoard = (paragraphText) => {
        if (onAddTextToBoard) {
            onAddTextToBoard(paragraphText);
            toast.success('Text added to whiteboard!');
        }
    };

    // 1-Click Insert Image on Whiteboard Canvas
    const handleCopyImageToBoard = (imageUrl) => {
        if (!imageUrl) return;
        if (onAddImageToBoard) {
            onAddImageToBoard(imageUrl);
            toast.success('Image placed onto whiteboard canvas!', { icon: '🖼️' });
        }
    };

    // 1-Click Insert YouTube Video as Interactive Floating Media Player
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
            toast.success(`Embedded "${video.title?.slice(0, 30)}..." on canvas!`, { icon: '▶️' });
        } else {
            toast.error('Canvas media embedding not supported on this board');
        }
    };

    // 1-Click Transfer AI Overview with Diagrams as an Editable Panel
    const handleTransferAIPanel = () => {
        if (!onAddAIPanelToBoard) {
            toast.error('Panel transfer not supported on this board');
            return;
        }

        const overview = searchResults.aiOverview;
        const panelData = {
            id: `aipanel_${Date.now()}`,
            title: overview?.title || searchResults.query || 'Research Topic',
            summary: overview?.summary || (searchResults.articles[0]?.extract ? searchResults.articles[0].extract.slice(0, 300) : 'Academic research summary.'),
            keyPoints: overview?.keyPoints || [
                `Overview of ${searchResults.query}`,
                'Core concepts and foundational principles',
                'Visual and practical applications'
            ],
            formulaOrEquation: overview?.formulaOrEquation || null,
            images: searchResults.images || [],
            diagramUrl: overview?.aiDiagramUrl || (searchResults.images[0]?.url || null),
            x: 80,
            y: 80,
            width: 440,
            height: 'auto'
        };

        onAddAIPanelToBoard(panelData);
        toast.success('Transferred to whiteboard as interactive editable panel!', { icon: '✨' });
    };

    // Embed Web Search Result as an Editable Panel Card on Whiteboard
    const handleEmbedWebResultAsPanel = (webItem) => {
        if (!onAddAIPanelToBoard) return;
        const panelData = {
            id: `aipanel_web_${Date.now()}`,
            title: webItem.title,
            summary: webItem.snippet || 'Web reference snippet.',
            keyPoints: [
                `Source Domain: ${webItem.domain || 'Web'}`,
                `Reference URL: ${webItem.url}`
            ],
            formulaOrEquation: null,
            images: searchResults.images?.slice(0, 2) || [],
            diagramUrl: searchResults.images?.[0]?.url || null,
            x: 100,
            y: 100,
            width: 440,
            height: 'auto'
        };
        onAddAIPanelToBoard(panelData);
        toast.success(`Embedded "${webItem.domain}" reference card on board!`, { icon: '📋' });
    };

    // Direct External Open Links (Google Search / Google Images / YouTube)
    const handleOpenExternal = (type = 'images') => {
        const q = encodeURIComponent(searchQuery || searchResults.query || 'Science');
        let url = `https://www.google.com/search?tbm=isch&q=${q}`;
        if (type === 'youtube') {
            url = `https://www.youtube.com/results?search_query=${q}`;
        } else if (type === 'search') {
            url = `https://www.google.com/search?q=${q}`;
        }
        if (typeof window !== 'undefined') {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    if (mode === 'closed') {
        return null;
    }

    const panelWidthStyle = mode === 'full' 
        ? 'w-full max-w-full' 
        : 'w-[540px] max-w-[580px] min-w-[390px]';

    return (
        <aside
            className={`${panelWidthStyle} h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 text-slate-100 flex flex-col z-40 transition-all duration-300 shadow-2xl relative select-none`}
        >
            {/* Top Browser Navigation Bar */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0 bg-slate-950/70">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                        <Globe className="w-4 h-4" />
                    </div>

                    {currentArticle && (
                        <button
                            onClick={() => setCurrentArticle(null)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                            title="Back to search results"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}

                    {/* Search Bar with live Google Actions */}
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSearch(searchQuery);
                        }}
                        className="flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs"
                    >
                        <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Google Images, YouTube & Web..."
                            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="text-slate-500 hover:text-slate-300 p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </form>
                </div>

                {/* Direct External Search Shortcuts */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleOpenExternal('images')}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition flex items-center gap-1 text-[11px] font-semibold"
                        title="Open this query directly on Google Images"
                    >
                        <span className="font-bold text-amber-400">G</span>
                        <ImageIcon className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                        onClick={() => handleOpenExternal('youtube')}
                        className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition flex items-center gap-1 text-[11px] font-semibold"
                        title="Open this query directly on YouTube"
                    >
                        <Film className="w-3.5 h-3.5 text-red-400" />
                    </button>

                    {/* Sideroll Size / Close Controls */}
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
                        title="Close Browser"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Topic Preset Chips */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-800 overflow-x-auto bg-slate-900/50 flex-shrink-0 custom-scrollbar text-[11px]">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">
                    Topics:
                </span>
                {SUBJECT_PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        onClick={() => {
                            setSearchQuery(preset.query);
                            handleSearch(preset.query);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white whitespace-nowrap transition border border-slate-700/60"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Filter Tabs: Google Images, YouTube Search, All Results, Web, AI Overview, Wikipedia */}
            <div className="flex items-center border-b border-slate-800 px-3 py-1.5 gap-1.5 bg-slate-950/40 text-xs flex-shrink-0 overflow-x-auto custom-scrollbar">
                {/* 1. Google Image Search Tab */}
                <button
                    onClick={() => setActiveTab('images')}
                    className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                        activeTab === 'images'
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                            : 'text-cyan-400 hover:text-cyan-200 hover:bg-slate-800/60'
                    }`}
                >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Google Images ({searchResults.images?.length || 0})</span>
                </button>

                {/* 2. YouTube Search Tab */}
                <button
                    onClick={() => setActiveTab('youtube')}
                    className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                        activeTab === 'youtube'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                            : 'text-rose-400 hover:text-rose-200 hover:bg-slate-800/60'
                    }`}
                >
                    <Film className="w-3.5 h-3.5" />
                    <span>YouTube Search ({searchResults.videos?.length || 0})</span>
                </button>

                {/* 3. All Results Tab */}
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-2.5 py-1 rounded-xl font-medium transition whitespace-nowrap ${
                        activeTab === 'all'
                            ? 'bg-slate-700 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    All Results
                </button>

                {/* 4. Google & Web Tab */}
                <button
                    onClick={() => setActiveTab('web')}
                    className={`px-2.5 py-1 rounded-xl font-medium transition whitespace-nowrap flex items-center gap-1 ${
                        activeTab === 'web'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-blue-400 hover:text-blue-300'
                    }`}
                >
                    <Globe className="w-3 h-3" />
                    <span>Web ({searchResults.webResults?.length || 0})</span>
                </button>

                {/* 5. AI Overview */}
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`px-2.5 py-1 rounded-xl font-medium transition whitespace-nowrap flex items-center gap-1 ${
                        activeTab === 'ai'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-indigo-400 hover:text-indigo-300'
                    }`}
                >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Overview</span>
                </button>

                {/* 6. Wikipedia */}
                <button
                    onClick={() => setActiveTab('articles')}
                    className={`px-2.5 py-1 rounded-xl font-medium transition whitespace-nowrap ${
                        activeTab === 'articles'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Wikipedia ({searchResults.articles?.length || 0})
                </button>
            </div>

            {/* Selected Text Floating Action Bar */}
            {selectedText && (
                <div className="bg-indigo-600 text-white px-3 py-2 flex items-center justify-between text-xs font-bold shadow-lg animate-in slide-in-from-top duration-200 z-50 flex-shrink-0">
                    <span className="truncate max-w-[240px]">
                        "{selectedText.slice(0, 35)}..."
                    </span>
                    <button
                        onClick={handleCopySelectedTextToBoard}
                        className="bg-white text-indigo-700 hover:bg-indigo-50 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add to Whiteboard
                    </button>
                </div>
            )}

            {/* MAIN BROWSER CONTENT */}
            <div 
                ref={articleContainerRef}
                onMouseUp={handleMouseUp}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar select-text"
            >
                {isLoading || isLoadingArticle ? (
                    <div className="py-20 text-center space-y-3">
                        <RotateCw className="w-7 h-7 animate-spin text-cyan-400 mx-auto" />
                        <p className="text-xs text-slate-400 font-medium">Fetching Google image results, educational YouTube videos & web data...</p>
                    </div>
                ) : currentArticle ? (
                    /* ARTICLE DETAIL VIEW */
                    <div className="space-y-4">
                        <div className="border-b border-slate-800 pb-3">
                            <h2 className="text-base font-bold text-white mb-1">
                                {currentArticle.title}
                            </h2>
                            <a
                                href={currentArticle.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 inline-flex"
                            >
                                Source: Wikipedia <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        {currentArticle.heroImage && (
                            <div className="relative group rounded-2xl overflow-hidden border border-slate-700 shadow-lg bg-black/40">
                                <img
                                    src={currentArticle.heroImage}
                                    alt={currentArticle.title}
                                    className="w-full max-h-60 object-contain"
                                    crossOrigin="anonymous"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <button
                                    onClick={() => handleCopyImageToBoard(currentArticle.heroImage)}
                                    className="absolute bottom-2 right-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-1"
                                >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    Drop on Board
                                </button>
                            </div>
                        )}

                        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                            <p className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/20 p-2 rounded-xl">
                                💡 Tip: Highlight any text in the paragraphs below to drop it directly onto the whiteboard!
                            </p>

                            {(currentArticle.paragraphs || []).map((para, idx) => (
                                <div
                                    key={idx}
                                    className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl relative group hover:border-slate-600 transition"
                                >
                                    <p className="text-slate-200 select-text leading-relaxed">
                                        {para}
                                    </p>
                                    <div className="pt-2 flex justify-end">
                                        <button
                                            onClick={() => handleCopyParagraphToBoard(para)}
                                            className="opacity-0 group-hover:opacity-100 transition text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add Paragraph to Board
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* TAB CONTENT */
                    <div className="space-y-5">
                        {/* 🖼️ TAB A: GOOGLE IMAGE SEARCH & HIGH-RES GALLERY 🖼️ */}
                        {(activeTab === 'images' || activeTab === 'all') && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        <span>Google Image Search & HD Diagrams ({searchResults.images?.length || 0})</span>
                                    </h4>
                                    <button
                                        onClick={() => handleOpenExternal('images')}
                                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                                    >
                                        <span>More on Google</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>

                                {searchResults.images?.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 p-4 space-y-2">
                                        <ImageIcon className="w-8 h-8 mx-auto text-slate-600" />
                                        <p>No images found for "{searchQuery || searchResults.query}".</p>
                                        <button
                                            onClick={() => handleOpenExternal('images')}
                                            className="text-cyan-400 underline font-semibold"
                                        >
                                            Search directly on Google Images
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {searchResults.images.map((img, idx) => (
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
                                                className="group relative bg-slate-950 border border-slate-800 hover:border-cyan-400/80 rounded-2xl overflow-hidden shadow-lg transition duration-200 cursor-grab active:cursor-grabbing flex flex-col justify-between"
                                            >
                                                {/* Resolution / HD Badge */}
                                                <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                                                    <span className="bg-black/80 backdrop-blur-md text-cyan-300 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md border border-cyan-500/30 shadow">
                                                        {img.resolution || 'HD'}
                                                    </span>
                                                </div>

                                                {/* Preview Button on Hover */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewImage(img)}
                                                    className="absolute top-2 right-2 z-10 bg-black/80 hover:bg-cyan-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition shadow"
                                                    title="Preview image in full resolution"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Image Thumbnail Container */}
                                                <div 
                                                    onClick={() => setPreviewImage(img)}
                                                    className="w-full h-36 bg-black/60 flex items-center justify-center p-2 cursor-pointer"
                                                >
                                                    <img
                                                        src={img.url || img.thumbnail}
                                                        alt={img.title}
                                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                        loading="lazy"
                                                        crossOrigin="anonymous"
                                                        onError={(e) => {
                                                            // Graceful image fallback placeholder
                                                            e.currentTarget.onerror = null;
                                                            e.currentTarget.src = 'https://placehold.co/400x300/0f172a/38bdf8?text=Image+Unavailable';
                                                        }}
                                                    />
                                                </div>

                                                {/* Footer metadata & Insert button */}
                                                <div className="p-2.5 bg-slate-900 border-t border-slate-800 space-y-1.5">
                                                    <p className="text-[11px] font-semibold text-slate-200 truncate" title={img.title}>
                                                        {img.title}
                                                    </p>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                        <span className="truncate max-w-[100px]">{img.source || 'Web Image'}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyImageToBoard(img.url)}
                                                            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow"
                                                            title="Insert image onto active whiteboard page"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            <span>Insert</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ▶️ TAB B: YOUTUBE SEARCH & VIDEO CARDS ▶️ */}
                        {(activeTab === 'youtube' || activeTab === 'all') && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Film className="w-3.5 h-3.5" />
                                        <span>YouTube Educational Videos ({searchResults.videos?.length || 0})</span>
                                    </h4>
                                    <button
                                        onClick={() => handleOpenExternal('youtube')}
                                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                                    >
                                        <span>More on YouTube</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Active Inline Preview Player */}
                                {previewVideo && (
                                    <div className="bg-slate-950 border border-rose-500/60 rounded-2xl overflow-hidden shadow-2xl p-2 space-y-2 animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-xs font-bold text-rose-300 truncate max-w-[320px]">
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

                                {searchResults.videos?.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 p-4 space-y-2">
                                        <Film className="w-8 h-8 mx-auto text-slate-600" />
                                        <p>No educational videos found for "{searchQuery || searchResults.query}".</p>
                                        <button
                                            onClick={() => handleOpenExternal('youtube')}
                                            className="text-rose-400 underline font-semibold"
                                        >
                                            Search directly on YouTube
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {searchResults.videos.map((vid, idx) => (
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
                                                className="bg-slate-950 border border-slate-800 hover:border-rose-500/70 rounded-2xl p-3 flex flex-col gap-2.5 transition shadow-lg cursor-grab active:cursor-grabbing group"
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
                                                        <span>Preview Video</span>
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
                        )}

                        {/* 🌟 TAB C: GOOGLE SEARCH AI OVERVIEW 🌟 */}
                        {(activeTab === 'all' || activeTab === 'ai') && searchResults.aiOverview && (
                            <div className="relative rounded-2xl bg-gradient-to-br from-indigo-950/90 via-slate-900 to-indigo-950/70 border border-indigo-500/40 p-4 shadow-xl space-y-3">
                                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                                        <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                        </div>
                                        <span>Google AI Overview</span>
                                    </div>

                                    <button
                                        onClick={handleTransferAIPanel}
                                        className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                                        title="Transfer this summary and diagrams to the whiteboard as an editable, resizable panel"
                                    >
                                        <Layout className="w-3.5 h-3.5" />
                                        <span>Transfer to Board as Panel</span>
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-white mb-1">
                                        {searchResults.aiOverview.title}
                                    </h3>
                                    <p className="text-xs text-slate-200 leading-relaxed font-normal">
                                        {searchResults.aiOverview.summary}
                                    </p>
                                </div>

                                {searchResults.aiOverview.keyPoints?.length > 0 && (
                                    <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-xl border border-indigo-500/20 text-xs">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                                            Key Principles:
                                        </span>
                                        <ul className="space-y-1.5">
                                            {searchResults.aiOverview.keyPoints.map((pt, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-slate-300">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                                    <span className="leading-snug">{pt}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {searchResults.aiOverview.formulaOrEquation && (
                                    <div className="bg-amber-950/40 border border-amber-500/30 p-2 rounded-xl text-xs flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                                            Equation
                                        </span>
                                        <span className="font-mono text-amber-200 font-semibold">
                                            {searchResults.aiOverview.formulaOrEquation}
                                        </span>
                                    </div>
                                )}

                                {searchResults.aiOverview.aiDiagramUrl && (
                                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black/60 group">
                                        <div className="absolute top-2 left-2 z-10 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                                            HD Diagram
                                        </div>
                                        <img
                                            src={searchResults.aiOverview.aiDiagramUrl}
                                            alt={searchResults.aiOverview.title}
                                            className="w-full h-40 object-contain bg-black/40"
                                            crossOrigin="anonymous"
                                        />
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2 flex items-center justify-between text-[11px]">
                                            <span className="text-slate-300 truncate max-w-[200px]">
                                                {searchResults.aiOverview.diagramPrompt || 'AI Concept Diagram'}
                                            </span>
                                            <button
                                                onClick={() => handleCopyImageToBoard(searchResults.aiOverview.aiDiagramUrl)}
                                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow"
                                            >
                                                <ImageIcon className="w-3 h-3" />
                                                <span>Drop on Board</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🌐 TAB D: GOOGLE & WEB SEARCH RESULTS 🌐 */}
                        {(activeTab === 'all' || activeTab === 'web') && (searchResults.webResults?.length > 0 || activeTab === 'web') && (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5" />
                                        <span>Google & Web Search Results ({searchResults.webResults?.length || 0})</span>
                                    </h4>
                                    <button
                                        onClick={() => handleOpenExternal('search')}
                                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                                    >
                                        <span>More on Google</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>

                                {searchResults.webResults?.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl p-4 border border-slate-800">
                                        No direct web links found. <button onClick={() => handleOpenExternal('search')} className="text-blue-400 underline font-semibold">Search directly on Google</button>
                                    </div>
                                ) : (
                                    searchResults.webResults.map((web, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-2 hover:border-blue-500/60 transition shadow group"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-full inline-block mb-1">
                                                        {web.domain}
                                                    </span>
                                                    <h5 
                                                        className="font-bold text-xs text-white group-hover:text-blue-400 transition cursor-pointer leading-snug"
                                                        onClick={() => window.open(web.url, '_blank')}
                                                    >
                                                        {web.title}
                                                    </h5>
                                                </div>
                                                <a
                                                    href={web.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition shrink-0"
                                                    title="Open in new tab"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>

                                            {web.snippet && (
                                                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 select-text">
                                                    {web.snippet}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 text-[11px]">
                                                <button
                                                    onClick={() => handleCopyParagraphToBoard(web.snippet || web.title)}
                                                    className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Add Snippet to Board
                                                </button>

                                                <button
                                                    onClick={() => handleEmbedWebResultAsPanel(web)}
                                                    className="bg-slate-700 hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 shadow"
                                                >
                                                    <Layout className="w-3 h-3" />
                                                    Embed as Card
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* 📚 TAB E: WIKIPEDIA ARTICLES & EXTRACTS 📚 */}
                        {(activeTab === 'all' || activeTab === 'articles') && (
                            <div className="space-y-2.5">
                                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Wikipedia Academic Articles ({searchResults.articles?.length || 0})</span>
                                </h4>

                                {searchResults.articles?.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-slate-500">
                                        No Wikipedia articles found for "{searchQuery}".
                                    </div>
                                ) : (
                                    searchResults.articles.map((art) => (
                                        <div
                                            key={art.id}
                                            className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-2 hover:border-emerald-500/60 transition shadow group"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h5 className="font-bold text-xs text-white group-hover:text-emerald-400 transition cursor-pointer"
                                                        onClick={() => handleOpenArticle(art.title)}
                                                    >
                                                        {art.title}
                                                    </h5>
                                                    <span className="text-[10px] text-slate-400">
                                                        Wikipedia Article
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleOpenArticle(art.title)}
                                                    className="p-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                                                    title="Read full article"
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {art.extract && (
                                                <p className="text-xs text-slate-300 line-clamp-3 select-text leading-relaxed">
                                                    {art.extract}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 text-[11px]">
                                                <button
                                                    onClick={() => handleOpenArticle(art.title)}
                                                    className="text-emerald-400 hover:underline font-bold"
                                                >
                                                    Read Full Article →
                                                </button>
                                                <button
                                                    onClick={() => handleCopyParagraphToBoard(art.extract)}
                                                    className="text-[11px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-lg font-medium transition flex items-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Add to Board
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* LIGHTBOX MODAL: FULL RESOLUTION IMAGE PREVIEW */}
            {previewImage && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate">
                                <ImageIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                <span className="text-xs font-bold text-white truncate">
                                    {previewImage.title}
                                </span>
                            </div>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 bg-black/60 flex items-center justify-center p-4 overflow-auto">
                            <img
                                src={previewImage.url}
                                alt={previewImage.title}
                                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                                crossOrigin="anonymous"
                            />
                        </div>

                        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300 font-mono">
                                    {previewImage.resolution || 'HD'}
                                </span>
                                <span>Source: {previewImage.source || 'Web'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.open(previewImage.url, '_blank')}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open Source</span>
                                </button>
                                <button
                                    onClick={() => {
                                        handleCopyImageToBoard(previewImage.url);
                                        setPreviewImage(null);
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Insert on Canvas</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
