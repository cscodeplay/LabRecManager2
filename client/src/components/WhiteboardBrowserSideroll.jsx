'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Globe, Search, ArrowLeft, ArrowRight, RotateCw, 
    ExternalLink, Copy, Check, Plus, Image as ImageIcon, 
    BookOpen, Sparkles, X, Maximize2, Minimize2, MoveRight,
    MousePointer, HelpCircle, Layers, Bookmark
} from 'lucide-react';
import toast from 'react-hot-toast';
import { browserAPI } from '@/lib/api';

const SUBJECT_PRESETS = [
    { label: 'Photosynthesis', query: 'Photosynthesis' },
    { label: 'DNA & Genetics', query: 'DNA replication genetics' },
    { label: 'Newton Laws', query: 'Newton laws of motion' },
    { label: 'Periodic Table', query: 'Periodic table of elements' },
    { label: 'Calculus', query: 'Fundamental theorem of calculus' },
    { label: 'Binary Search', query: 'Binary search algorithm' },
    { label: 'Neural Networks', query: 'Artificial neural network' }
];

export default function WhiteboardBrowserSideroll({
    mode = 'closed', // 'closed' | 'partial' | 'full'
    onModeChange,
    onAddTextToBoard,
    onAddImageToBoard
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'articles' | 'images'
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState({ query: '', articles: [], images: [] });
    
    // Detailed Article View inside Browser
    const [currentArticle, setCurrentArticle] = useState(null);
    const [isLoadingArticle, setIsLoadingArticle] = useState(false);
    
    // Selected text floating tooltip
    const [selectedText, setSelectedText] = useState('');
    const articleContainerRef = useRef(null);

    // Initial default search
    useEffect(() => {
        if (mode !== 'closed' && !searchResults.query) {
            handleSearch('Cell biology');
        }
    }, [mode]);

    const handleSearch = async (queryToSearch) => {
        const q = (queryToSearch || searchQuery).trim();
        if (!q) return;

        try {
            setIsLoading(true);
            setCurrentArticle(null);
            const res = await browserAPI.search({ q, type: activeTab });
            if (res.data.success) {
                setSearchResults(res.data.data);
            }
        } catch (err) {
            console.error('Browser search failed', err);
            toast.error('Search failed to load results');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenArticle = async (articleTitle) => {
        try {
            setIsLoadingArticle(true);
            const res = await browserAPI.getArticle({ title: articleTitle });
            if (res.data.success) {
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
            toast.success('Paragraph added to whiteboard!');
        }
    };

    const handleCopyImageToBoard = (imageUrl) => {
        if (onAddImageToBoard) {
            onAddImageToBoard(imageUrl);
            toast.success('Image dropped onto whiteboard!');
        }
    };

    if (mode === 'closed') {
        return null;
    }

    const panelWidthStyle = mode === 'full' 
        ? 'w-full max-w-full' 
        : 'w-[480px] max-w-[520px] min-w-[380px]';

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

                    {/* Search / URL bar */}
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
                            placeholder="Search Wikipedia, articles, or diagrams..."
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

                {/* Sideroll Controls: Partial, Full, Close */}
                <div className="flex items-center gap-1">
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
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 overflow-x-auto bg-slate-900/50 flex-shrink-0 custom-scrollbar text-[11px]">
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
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white whitespace-nowrap transition border border-slate-700/60"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Filter Tabs: All, Articles, Images */}
            <div className="flex items-center border-b border-slate-800 px-3 py-1.5 gap-2 bg-slate-950/40 text-xs flex-shrink-0">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                        activeTab === 'all'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    All Research
                </button>
                <button
                    onClick={() => setActiveTab('articles')}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                        activeTab === 'articles'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Articles ({searchResults.articles.length})
                </button>
                <button
                    onClick={() => setActiveTab('images')}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                        activeTab === 'images'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Diagrams & Images ({searchResults.images.length})
                </button>
            </div>

            {/* Selected Text Floating Action Bar */}
            {selectedText && (
                <div className="bg-indigo-600 text-white px-3 py-2 flex items-center justify-between text-xs font-bold shadow-lg animate-in slide-in-from-top duration-200 z-50 flex-shrink-0">
                    <span className="truncate max-w-[260px]">
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
                    <div className="py-16 text-center space-y-3">
                        <RotateCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                        <p className="text-xs text-slate-400">Loading research & visual materials...</p>
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
                            <div className="relative group rounded-2xl overflow-hidden border border-slate-700 shadow-lg">
                                <img
                                    src={currentArticle.heroImage}
                                    alt={currentArticle.title}
                                    className="w-full max-h-56 object-cover"
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
                    /* SEARCH RESULTS GRID & LIST */
                    <div className="space-y-4">
                        {/* 1. Diagrams & Visuals Row */}
                        {(activeTab === 'all' || activeTab === 'images') && searchResults.images.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                                    <span>Educational Diagrams & Images</span>
                                    <span className="text-[10px] text-slate-500">Click or Drag to Canvas</span>
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {searchResults.images.map((img, idx) => (
                                        <div
                                            key={idx}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/plain', img.url);
                                            }}
                                            className="group relative bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow transition hover:border-emerald-500 cursor-grab active:cursor-grabbing"
                                        >
                                            <img
                                                src={img.thumbnail || img.url}
                                                alt={img.title}
                                                className="w-full h-28 object-cover group-hover:scale-105 transition duration-300"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end">
                                                <p className="text-[10px] font-bold text-white truncate mb-1">
                                                    {img.title}
                                                </p>
                                                <button
                                                    onClick={() => handleCopyImageToBoard(img.url)}
                                                    className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition flex items-center justify-center gap-1 shadow"
                                                >
                                                    <ImageIcon className="w-3 h-3" />
                                                    Drop on Board
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Educational Articles & Summaries */}
                        {(activeTab === 'all' || activeTab === 'articles') && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Research Articles & Notes
                                </h4>
                                {searchResults.articles.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-slate-500">
                                        No articles found for "{searchQuery}". Try a different topic!
                                    </div>
                                ) : (
                                    searchResults.articles.map((art) => (
                                        <div
                                            key={art.id}
                                            className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-2 hover:border-slate-600 transition shadow group"
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

                                            <div className="flex items-center justify-between pt-1">
                                                <button
                                                    onClick={() => handleOpenArticle(art.title)}
                                                    className="text-[11px] text-emerald-400 hover:underline font-bold"
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
        </aside>
    );
}
