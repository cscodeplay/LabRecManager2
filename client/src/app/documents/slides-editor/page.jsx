'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Play,
    Plus,
    Trash2,
    Copy,
    Download,
    Cloud,
    RefreshCw,
    HardDrive,
    Layers,
    Layout,
    Type,
    Square,
    Circle,
    Star,
    ArrowRight,
    Table,
    Sigma,
    Palette,
    Maximize2,
    Minimize2,
    ChevronLeft,
    ChevronRight,
    X,
    FileText,
    FileSpreadsheet,
    Presentation,
    Printer,
    Sparkles,
    MoveUp,
    MoveDown,
    Film,
    Clock,
    RotateCcw,
    Shapes,
    MessageSquare,
    Monitor,
    Pause,
    ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import OfficeThemeToggle from '@/components/OfficeThemeToggle';
import OfficeAppBlurLoader from '@/components/OfficeAppBlurLoader';
import OfficeOpenImportMenu from '@/components/OfficeOpenImportMenu';
import { useThemeStore } from '@/lib/store';

const BG_PRESETS = [
    { name: 'Midnight Solid', style: { bg: '#0f172a', gradient: null, text: '#f8fafc' } },
    { name: 'Obsidian Pure', style: { bg: '#050505', gradient: null, text: '#f1f5f9' } },
    { name: 'Indigo Nebula', style: { bg: '#1e1b4b', gradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', text: '#f8fafc' } },
    { name: 'Emerald Gradient', style: { bg: '#064e3b', gradient: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', text: '#f0fdf4' } },
    { name: 'Deep Crimson', style: { bg: '#4c0519', gradient: 'linear-gradient(135deg, #4c0519 0%, #0f172a 100%)', text: '#fff1f2' } },
    { name: 'Sunset Bronze', style: { bg: '#7c2d12', gradient: 'linear-gradient(135deg, #7c2d12 0%, #1e1b4b 100%)', text: '#fff7ed' } },
    { name: 'Clean White', style: { bg: '#ffffff', gradient: null, text: '#0f172a' } },
    { name: 'Soft Slate Light', style: { bg: '#f1f5f9', gradient: null, text: '#0f172a' } }
];

const DEFAULT_SLIDES = [
    {
        id: 'slide_1',
        title: 'Advanced Computer Networks & IoT Lab',
        subtitle: 'Department of Computer Science & Engineering | Academic Year 2026-27',
        layout: 'title',
        bgColor: '#0f172a',
        textColor: '#f8fafc',
        bgGradient: null,
        notes: 'Introduce the course framework, IoT lab setup, and hardware toolchains for the semester.',
        elements: [
            { id: 'el_1', type: 'text', content: 'Instructor: Dr. H. S. Oberoi | Lab Section: CS-4A' }
        ]
    },
    {
        id: 'slide_2',
        title: 'Laboratory Objectives & Methodology',
        subtitle: 'Key experimental deliverables for Session 04',
        layout: 'bullets',
        bgColor: '#0f172a',
        textColor: '#f8fafc',
        bgGradient: null,
        notes: 'Emphasize network safety, 802.1Q tag frames, and wire isolation before packet transmission.',
        elements: [
            { id: 'el_2_1', type: 'text', content: '• Configure dual-homed VLAN subnets using IEEE 802.1Q tagging' },
            { id: 'el_2_2', type: 'text', content: '• Analyze TCP handshake and selective acknowledgment (SACK) latency' },
            { id: 'el_2_3', type: 'text', content: '• Capture Wireshark PCAP packets and compute throughput bounds' },
            { id: 'el_2_4', type: 'text', content: '• Tabulate packet drops against buffer queue saturation thresholds' }
        ]
    },
    {
        id: 'slide_3',
        title: 'Mathematical Formulation & Throughput Limit',
        subtitle: 'Shannon-Hartley channel capacity bound',
        layout: 'formula',
        bgColor: '#0b1329',
        textColor: '#f8fafc',
        bgGradient: null,
        notes: 'Explain log2 derivation and SNR logarithmic decibel conversion in wireless links.',
        elements: [
            { id: 'el_3_1', type: 'formula', formula: 'C = B \\log_2 \\left(1 + \\frac{S}{N}\\right)', label: 'Maximum Channel Capacity' },
            { id: 'el_3_2', type: 'text', content: 'Where C is channel capacity in bits/second, B is bandwidth in Hertz, and S/N is signal-to-noise ratio.' }
        ]
    },
    {
        id: 'slide_4',
        title: 'Comparative Benchmark Observations',
        subtitle: 'UDP Streaming vs TCP Reno Congestion Control',
        layout: 'two_col',
        bgColor: '#0f172a',
        textColor: '#f8fafc',
        bgGradient: null,
        notes: 'Ask students to observe TCP retransmit backoff vs UDP uninterrupted bitrate.',
        elements: [
            { id: 'el_4_1', type: 'column', header: 'TCP Reno (Loss-based)', content: '• Initial Window: 10 MSS\n• Backoff Factor: 0.5 upon packet loss\n• Average Jitter: 4.2ms\n• Stable Throughput: 94.2 Mbps' },
            { id: 'el_4_2', type: 'column', header: 'UDP Raw Stream', content: '• Zero handshaking overhead\n• Zero retransmission delays\n• Average Jitter: 0.8ms\n• Maximum Throughput: 98.7 Mbps' }
        ]
    }
];

const THEMES = [
    { name: 'Midnight Slate', bg: '#0f172a', text: '#f8fafc', accent: '#6366f1' },
    { name: 'Royal Indigo', bg: '#1e1b4b', text: '#f8fafc', accent: '#818cf8' },
    { name: 'Emerald Forest', bg: '#064e3b', text: '#f0fdf4', accent: '#34d399' },
    { name: 'Obsidian Black', bg: '#050505', text: '#f1f5f9', accent: '#38bdf8' },
    { name: 'Minimal Light', bg: '#ffffff', text: '#0f172a', accent: '#2563eb' }
];

export default function SlidesEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const docIdParam = searchParams.get('id') || searchParams.get('docId');
    const driveFileIdParam = searchParams.get('driveFileId');

    // Presentation state
    const [docId, setDocId] = useState(docIdParam || null);
    const [mediaDocId, setMediaDocId] = useState(null);
    const [title, setTitle] = useState(searchParams.get('title') || 'Untitled Presentation');
    const [isDriveFile, setIsDriveFile] = useState(Boolean(driveFileIdParam));
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'offline'
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [slides, setSlides] = useState(DEFAULT_SLIDES);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    // Presentation mode (F5)
    const [isPresenting, setIsPresenting] = useState(false);
    const [laserActive, setLaserActive] = useState(false);
    const [laserPos, setLaserPos] = useState({ x: -100, y: -100 });

    // Aspect Ratio & Layout States
    const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9' | '4:3'
    const [showBgModal, setShowBgModal] = useState(false);
    const [showShapeModal, setShowShapeModal] = useState(false);
    const [showNotesDrawer, setShowNotesDrawer] = useState(false);

    // Presenter View Runner State
    const [isPresenterMode, setIsPresenterMode] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timerRunning, setTimerRunning] = useState(true);

    // Presenter timer
    useEffect(() => {
        let interval = null;
        if (isPresenterMode && timerRunning) {
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPresenterMode, timerRunning]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Active dropdown menus
    const [activeMenu, setActiveMenu] = useState(null); // 'file', 'edit', 'view', 'insert', 'slide', 'help'
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Visual Thumbnail Picture Preview Badge on Every Addition
    const [additionBadge, setAdditionBadge] = useState(null);

    const triggerAdditionBadge = (title, subtitle, type = 'slide') => {
        setAdditionBadge({ title, subtitle, type, timestamp: Date.now() });
        setTimeout(() => {
            setAdditionBadge(prev => (prev?.title === title ? null : prev));
        }, 3600);
    };

    // Global Theme State
    const { theme } = useThemeStore();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const updateTheme = () => {
            if (theme === 'dark' || theme === 'contrast') {
                setIsDark(true);
            } else if (theme === 'light') {
                setIsDark(false);
            } else if (theme === 'system') {
                setIsDark(typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        };
        updateTheme();
        if (typeof window !== 'undefined') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = () => { if (theme === 'system') updateTheme(); };
            mq.addEventListener('change', listener);
            return () => mq.removeEventListener('change', listener);
        }
    }, [theme]);

    // Auto-save timer
    const autoSaveTimerRef = useRef(null);

    const currentSlide = slides[currentSlideIndex] || slides[0];

    // Load or initialize presentation
    useEffect(() => {
        const loadPresentation = async () => {
            if (driveFileIdParam) {
                try {
                    setSaveStatus('saving');
                    const toastId = toast.loading('Loading presentation from Google Drive...', { id: 'gdrive-load' });
                    const res = await api.get(`/office/documents/drive/${driveFileIdParam}`);
                    if (res.data?.success && res.data.data) {
                        const d = res.data.data;
                        setTitle(d.title || 'Google Drive Presentation');
                        setIsDriveFile(true);
                        if (d.content?.slides && Array.isArray(d.content.slides) && d.content.slides.length > 0) {
                            setSlides(d.content.slides);
                        }
                        toast.success(`Loaded "${d.title}" from Google Drive!`, { id: 'gdrive-load' });
                    }
                    setSaveStatus('saved');
                } catch (err) {
                    console.error('Failed to load Google Drive file:', err);
                    toast.error('Could not load Google Drive file', { id: 'gdrive-load' });
                    setSaveStatus('saved');
                } finally {
                    setIsInitialLoading(false);
                }
            } else if (docIdParam) {
                try {
                    let d = null;
                    try {
                        const res = await api.get(`/office/documents/${docIdParam}`);
                        if (res.data?.success && res.data.data) {
                            d = res.data.data;
                        }
                    } catch (e) {
                        try {
                            const resDoc = await api.get(`/documents/${docIdParam}`);
                            if (resDoc.data?.success && resDoc.data.data) {
                                const std = resDoc.data.data;
                                d = {
                                    id: std.id,
                                    title: std.name || std.fileName || 'Presentation',
                                    current_content: {
                                        slides: [{
                                            id: 1,
                                            title: std.name || 'Slide Deck',
                                            subtitle: 'Opened from CloudVault Documents Hub',
                                            layout: 'title',
                                            bg: '#ffffff'
                                        }]
                                    }
                                };
                            }
                        } catch (_) {}
                    }
                    if (d) {
                        setTitle(d.title || 'Untitled Presentation');
                        setDocId(d.id);
                        if (d.current_content?.slides && Array.isArray(d.current_content.slides) && d.current_content.slides.length > 0) {
                            setSlides(d.current_content.slides);
                        }
                    }
                } catch (err) {
                    console.error('Failed to load presentation:', err);
                } finally {
                    setIsInitialLoading(false);
                }
            } else {
                setIsInitialLoading(false);
            }
        };

        loadPresentation();
    }, [docIdParam, driveFileIdParam]);

    // Keyboard shortcuts: F5 to present, Left/Right arrow in presentation mode
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F5') {
                e.preventDefault();
                setIsPresenting(true);
            } else if (e.key === 'Escape' && isPresenting) {
                setIsPresenting(false);
            } else if (isPresenting) {
                if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
                } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
                    e.preventDefault();
                    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPresenting, slides.length]);

    // Auto-save logic
    const triggerAutoSave = useCallback(() => {
        setSaveStatus('saving');
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                const payload = {
                    title: title || 'Untitled Presentation',
                    docType: 'presentation',
                    content: {
                        activeSlide: currentSlideIndex,
                        slides: slides
                    }
                };

                if (docId) {
                    await api.put(`/office/documents/${docId}`, payload);
                } else {
                    const res = await api.post('/office/documents', payload);
                    if (res.data?.success && res.data.data?.id) {
                        const newId = res.data.data.id;
                        setDocId(newId);
                        if (typeof window !== 'undefined') {
                            const url = new URL(window.location.href);
                            url.searchParams.set('id', newId);
                            window.history.replaceState(null, '', url.toString());
                        }
                    }
                }

                // In-place auto-sync with media files only if already linked
                if (mediaDocId) {
                    api.post('/office/documents/save-to-media-files', {
                        docType: 'presentation',
                        format: 'pptx',
                        title: title || 'Untitled Presentation',
                        content: payload.content,
                        documentId: mediaDocId,
                        officeDocId: docId
                    }).catch(() => {});
                }

                setSaveStatus('saved');
            } catch (err) {
                console.error('Auto-save error:', err);
                setSaveStatus('offline');
            }
        }, 1500);
    }, [title, docId, mediaDocId, currentSlideIndex, slides]);

    const handleSaveToOfficeMediaFiles = async () => {
        try {
            setSaveStatus('saving');
            toast.loading('Saving to Office Media Files/Presentations...', { id: 'slides-media-save' });
            const res = await api.post('/office/documents/save-to-media-files', {
                docType: 'presentation',
                format: 'pptx',
                title: title || 'Untitled Presentation',
                content: {
                    activeSlide: currentSlideIndex,
                    slides: slides
                },
                documentId: mediaDocId,
                officeDocId: docId
            });
            if (res.data?.success) {
                if (res.data.data?.document?.id) {
                    setMediaDocId(res.data.data.document.id);
                }
                setSaveStatus('saved');
                toast.success('Successfully saved to Office Media Files > Presentations (Slides)!', { id: 'slides-media-save' });
            } else {
                setSaveStatus('offline');
                toast.error('Failed to save to Office Media Files', { id: 'slides-media-save' });
            }
        } catch (err) {
            console.error('Save to media error:', err);
            setSaveStatus('offline');
            toast.error('Could not save to Office Media Files', { id: 'slides-media-save' });
        }
    };

    const handleOpenOfficeDoc = async (fileItem) => {
        try {
            setIsInitialLoading(true);
            toast.loading(`Opening "${fileItem.name}"...`, { id: 'slides-open' });
            if (fileItem.id) {
                const res = await api.get(`/office/documents/${fileItem.id}`);
                const d = res.data?.data;
                if (d && d.current_content) {
                    setDocId(d.id);
                    if (d.metadata?.documentId) setMediaDocId(d.metadata.documentId);
                    setTitle(d.title || fileItem.name);
                    const slidesData = d.current_content.slides;
                    if (Array.isArray(slidesData) && slidesData.length > 0) {
                        setSlides(slidesData);
                        setCurrentSlideIndex(0);
                    }
                    toast.success(`Opened "${fileItem.name}"!`, { id: 'slides-open' });
                    return;
                }
            }
            if (fileItem.url) {
                window.location.href = `/documents/slides-editor?docId=${fileItem.id}`;
            }
        } catch (err) {
            console.error('Failed to open doc:', err);
            toast.error('Could not open presentation', { id: 'slides-open' });
        } finally {
            setIsInitialLoading(false);
        }
    };

    // Slide operations
    const addSlide = (layout = 'bullets') => {
        const newSlide = {
            id: `slide_${Date.now()}`,
            title: 'New Slide Title',
            subtitle: 'Click to edit subtitle or add bulleted points',
            layout: layout,
            bgColor: currentSlide.bgColor || '#0f172a',
            textColor: currentSlide.textColor || '#f8fafc',
            elements: [
                { id: `el_${Date.now()}_1`, type: 'text', content: '• Point 1: Enter your lab observation' },
                { id: `el_${Date.now()}_2`, type: 'text', content: '• Point 2: Specify parameters and conclusions' }
            ]
        };
        const updated = [...slides];
        updated.splice(currentSlideIndex + 1, 0, newSlide);
        setSlides(updated);
        setCurrentSlideIndex(currentSlideIndex + 1);
        triggerAutoSave();
        triggerAdditionBadge('Slide Added', `Slide #${currentSlideIndex + 2} (${layout})`, 'slide');
        toast.success('Added new slide');
    };

    const duplicateSlide = () => {
        const cloned = JSON.parse(JSON.stringify(currentSlide));
        cloned.id = `slide_${Date.now()}`;
        cloned.title = `${cloned.title} (Copy)`;
        const updated = [...slides];
        updated.splice(currentSlideIndex + 1, 0, cloned);
        setSlides(updated);
        setCurrentSlideIndex(currentSlideIndex + 1);
        triggerAutoSave();
        triggerAdditionBadge('Slide Duplicated', `Copy of slide #${currentSlideIndex + 1}`, 'slide');
        toast.success('Duplicated slide');
    };

    const deleteSlide = () => {
        if (slides.length <= 1) {
            toast.error('Presentation must contain at least one slide');
            return;
        }
        const updated = slides.filter((_, idx) => idx !== currentSlideIndex);
        setSlides(updated);
        setCurrentSlideIndex(prev => Math.min(prev, updated.length - 1));
        triggerAutoSave();
        toast.success('Slide removed');
    };

    const moveSlide = (direction) => {
        const targetIndex = currentSlideIndex + direction;
        if (targetIndex < 0 || targetIndex >= slides.length) return;
        const updated = [...slides];
        const [moved] = updated.splice(currentSlideIndex, 1);
        updated.splice(targetIndex, 0, moved);
        setSlides(updated);
        setCurrentSlideIndex(targetIndex);
        triggerAutoSave();
    };

    const updateCurrentSlide = (fields) => {
        setSlides(prev => {
            const copy = [...prev];
            copy[currentSlideIndex] = { ...copy[currentSlideIndex], ...fields };
            return copy;
        });
        triggerAutoSave();
    };

    const updateElementContent = (elIndex, newContent) => {
        setSlides(prev => {
            const copy = [...prev];
            const slide = { ...copy[currentSlideIndex] };
            const els = [...(slide.elements || [])];
            els[elIndex] = { ...els[elIndex], content: newContent };
            slide.elements = els;
            copy[currentSlideIndex] = slide;
            return copy;
        });
        triggerAutoSave();
    };

    // Vector Shape Insertion
    const handleInsertShape = (shapeType) => {
        const shapeColors = {
            rectangle: '#3b82f6',
            rounded_rect: '#10b981',
            circle: '#8b5cf6',
            arrow: '#f59e0b',
            star: '#ec4899',
            callout: '#06b6d4',
            line: '#94a3b8'
        };
        const newShape = {
            id: `el_shape_${Date.now()}`,
            type: 'shape',
            shape: shapeType,
            color: shapeColors[shapeType] || '#3b82f6',
            label: shapeType.replace('_', ' ').toUpperCase(),
            content: `Shape: ${shapeType.replace('_', ' ')}`
        };
        setSlides(prev => {
            const copy = [...prev];
            const s = { ...copy[currentSlideIndex] };
            s.elements = [...(s.elements || []), newShape];
            copy[currentSlideIndex] = s;
            return copy;
        });
        setShowShapeModal(false);
        triggerAutoSave();
        triggerAdditionBadge('Vector Shape Added', `${shapeType.replace('_', ' ')} inserted`, 'shape');
        toast.success(`Inserted ${shapeType.replace('_', ' ')} shape`);
    };

    // Layer Arrangement (Bring to front / Send to back)
    const handleReorderElement = (elIndex, direction) => {
        setSlides(prev => {
            const copy = [...prev];
            const s = { ...copy[currentSlideIndex] };
            const els = [...(s.elements || [])];
            const targetIndex = elIndex + direction;
            if (targetIndex < 0 || targetIndex >= els.length) return prev;
            const [moved] = els.splice(elIndex, 1);
            els.splice(targetIndex, 0, moved);
            s.elements = els;
            copy[currentSlideIndex] = s;
            return copy;
        });
        triggerAutoSave();
        toast.success(direction < 0 ? 'Sent Backward (z-index down)' : 'Brought Forward (z-index up)');
    };

    // Slide Background Preset Application
    const handleApplyBackground = (preset, applyAll = false) => {
        setSlides(prev => {
            return prev.map((s, idx) => {
                if (applyAll || idx === currentSlideIndex) {
                    return {
                        ...s,
                        bgColor: preset.style.bg,
                        bgGradient: preset.style.gradient,
                        textColor: preset.style.text
                    };
                }
                return s;
            });
        });
        setShowBgModal(false);
        triggerAutoSave();
        toast.success(applyAll ? `Applied ${preset.name} to all slides` : `Applied ${preset.name} to current slide`);
    };

    const applyTheme = (theme) => {
        setSlides(prev => prev.map(s => ({
            ...s,
            bgColor: theme.bg,
            textColor: theme.text
        })));
        triggerAutoSave();
        toast.success(`Applied ${theme.name} Theme`);
    };

    // Export presentation
    const handleExport = async (format) => {
        try {
            toast.loading(`Exporting presentation as .${format}...`, { id: 'slide-export' });
            let exportDocId = docId;

            if (!exportDocId) {
                const res = await api.post('/office/documents', {
                    title: title || 'Untitled Presentation',
                    docType: 'presentation',
                    content: { activeSlide: currentSlideIndex, slides }
                });
                exportDocId = res.data?.data?.id;
                setDocId(exportDocId);
            }

            const res = await api.post(
                `/office/documents/${exportDocId}/export`,
                { format },
                { responseType: 'blob' }
            );

            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-zA-Z0-9_.-]/g, '_')}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Exported as .${format}!`, { id: 'slide-export' });
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export presentation', { id: 'slide-export' });
        }
    };

    // Close menus when clicking outside
    useEffect(() => {
        const closeMenu = (e) => {
            setActiveMenu(null);
            if (!e.target.closest?.('.export-menu-container')) {
                setShowExportMenu(false);
            }
        };
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    return (
        <div className={`min-h-screen flex flex-col font-sans select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
            {/* Top Navigation & App Bar */}
            <header className={`border-b sticky top-0 z-40 flex flex-col shadow-md ${
                isDark ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'
            }`}>
                {/* Upper Meta Row */}
                <div className={`px-3 py-2 flex items-center justify-between border-b ${
                    isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => router.push('/documents')}
                            className={`p-1.5 rounded-lg transition flex items-center gap-1 text-xs font-semibold ${
                                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            title="Back to Documents"
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">Documents</span>
                        </button>
                        <OfficeOpenImportMenu
                            currentApp="presentation"
                            accept=".pptx,.ppt"
                            onOpenOfficeDoc={handleOpenOfficeDoc}
                        />
                        <div className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        {/* App Badge & Document Title */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs" title="LabSlides Presentation">
                                <Presentation size={15} />
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 hidden md:inline">
                                LabSlides
                            </span>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    triggerAutoSave();
                                }}
                                onBlur={async () => {
                                    if (docId) {
                                        try {
                                            await api.put(`/office/documents/${docId}`, { title });
                                            setSaveStatus('saved');
                                        } catch (e) {
                                            console.error('Failed to update presentation title on blur:', e);
                                        }
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.target.blur();
                                }}
                                className={`bg-transparent border border-transparent rounded px-2 py-0.5 text-xs sm:text-sm font-bold focus:outline-none transition max-w-[200px] sm:max-w-xs md:max-w-md truncate ${
                                    isDark ? 'hover:bg-slate-800 focus:bg-slate-800 focus:border-slate-700 text-white' : 'hover:bg-slate-100 focus:bg-slate-100 focus:border-slate-300 text-slate-900'
                                }`}
                                title="Click to rename presentation"
                            />
                            {isDriveFile && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-[10px] font-semibold whitespace-nowrap">
                                    <HardDrive size={11} className="text-emerald-500" />
                                    Google Drive
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2">
                        {/* Auto-save Status */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
                            {saveStatus === 'saving' && (
                                <>
                                    <RefreshCw size={13} className="text-amber-400 animate-spin" />
                                    <span className="hidden sm:inline">Saving...</span>
                                </>
                            )}
                            {saveStatus === 'saved' && (
                                <>
                                    <Cloud size={14} className="text-emerald-500" />
                                    <span className="hidden sm:inline text-slate-400">Saved to Cloud</span>
                                </>
                            )}
                        </div>

                        {/* Theme Toggle */}
                        <OfficeThemeToggle />

                        {/* Presentation Mode Button */}
                        <button
                            type="button"
                            onClick={() => setIsPresenting(true)}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                            title="Start Fullscreen Slideshow (F5)"
                        >
                            <Play size={13} fill="currentColor" />
                            <span>Present (F5)</span>
                        </button>

                        {/* Presenter View Runner Button */}
                        <button
                            type="button"
                            onClick={() => setIsPresenterMode(true)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                            title="Open Presenter View (Dual-screen with live timer, next slide preview & speaker notes)"
                        >
                            <Monitor size={13} />
                            <span>Presenter View</span>
                        </button>

                        {/* Unified Collective Export Dropdown */}
                        <div className="relative export-menu-container">
                            <button
                                type="button"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                                title="Export Presentation in Multiple Formats"
                            >
                                <Download size={13} />
                                <span>Export</span>
                                <ChevronDown size={12} className={`transition-transform duration-150 ${showExportMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showExportMenu && (
                                <div className={`absolute right-0 top-full mt-1.5 w-56 rounded-xl shadow-xl border z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 ${
                                    isDark ? 'bg-slate-900 border-slate-700/80 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => { handleSaveToOfficeMediaFiles(); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition"
                                    >
                                        <Save size={14} className="shrink-0 text-rose-500" />
                                        <div className="flex flex-col">
                                            <span>Save to Office Media Files</span>
                                            <span className="text-[10px] text-slate-400 font-normal">CloudVault &gt; Presentations</span>
                                        </div>
                                    </button>
                                    <div className={`h-px my-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                    <button
                                        type="button"
                                        onClick={() => { handleExport('pdf'); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-rose-500/10 flex items-center gap-2 transition"
                                    >
                                        <FileText size={14} className="text-rose-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold">PDF Document</span>
                                            <span className="text-[10px] text-slate-400">Printable Slide Deck (.pdf)</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { handleExport('html'); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-indigo-500/10 flex items-center gap-2 transition"
                                    >
                                        <Sparkles size={14} className="text-indigo-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold">HTML Deck</span>
                                            <span className="text-[10px] text-slate-400">Standalone Web Presentation (.html)</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { handleExport('json'); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-amber-500/10 flex items-center gap-2 transition"
                                    >
                                        <Presentation size={14} className="text-amber-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold">JSON Presentation</span>
                                            <span className="text-[10px] text-slate-400">Raw Deck Structure (.json)</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lower Menu Bar (File, Edit, View, Insert, Slide, Help) */}
                <div className={`px-4 py-1 flex items-center gap-2 text-xs border-b relative ${
                    isDark ? 'bg-slate-925 border-slate-800/60 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                    {/* File Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'file'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            File
                        </button>
                        {activeMenu === 'file' && (
                            <div className={`absolute left-0 top-full mt-1 w-52 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => addSlide('bullets')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Plus size={13} /> New Slide
                                </button>
                                <button onClick={() => duplicateSlide()} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Copy size={13} /> Duplicate Slide
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => handleExport('pdf')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Download size={13} /> Download PDF (.pdf)
                                </button>
                                <button onClick={() => handleExport('html')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Download size={13} /> Download Web Bundle (.html)
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => window.print()} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Printer size={13} /> Print Slides
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Edit Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'edit' ? null : 'edit'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'edit'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Edit
                        </button>
                        {activeMenu === 'edit' && (
                            <div className={`absolute left-0 top-full mt-1 w-48 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={duplicateSlide} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Copy size={13} /> Duplicate Slide
                                </button>
                                <button onClick={deleteSlide} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-500 ${isDark ? 'hover:bg-rose-950/40' : 'hover:bg-rose-100'}`}>
                                    <Trash2 size={13} /> Delete Slide
                                </button>
                            </div>
                        )}
                    </div>

                    {/* View Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'view'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            View
                        </button>
                        {activeMenu === 'view' && (
                            <div className={`absolute left-0 top-full mt-1 w-52 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => setIsPresenting(true)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 font-semibold text-amber-500 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Play size={13} /> Start Slideshow (F5)
                                </button>
                                <button onClick={() => setIsPresenterMode(true)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 font-semibold text-indigo-400 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Monitor size={13} /> Presenter View (Timer & Notes)
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => setShowNotesDrawer(!showNotesDrawer)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <MessageSquare size={13} /> Toggle Speaker Notes Drawer
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Insert Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'insert' ? null : 'insert'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'insert'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Insert
                        </button>
                        {activeMenu === 'insert' && (
                            <div className={`absolute left-0 top-full mt-1 w-56 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => setShowShapeModal(true)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-amber-500 font-semibold ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Shapes size={13} /> Vector Shape...
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => addSlide('title')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Type size={13} /> Title Slide
                                </button>
                                <button onClick={() => addSlide('bullets')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Layout size={13} /> Bulleted Points Slide
                                </button>
                                <button onClick={() => addSlide('two_col')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Layers size={13} /> Two Column Comparison
                                </button>
                                <button onClick={() => addSlide('formula')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Sigma size={13} /> Math Formula Slide
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Slide Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'slide' ? null : 'slide'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'slide'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Slide
                        </button>
                        {activeMenu === 'slide' && (
                            <div className={`absolute left-0 top-full mt-1 w-56 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => setShowBgModal(true)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-amber-500 font-semibold ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Palette size={13} /> Background & Gradients...
                                </button>
                                <button onClick={() => setAspectRatio(aspectRatio === '16:9' ? '4:3' : '16:9')} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Aspect Ratio</span>
                                    <span className="font-bold text-amber-500">{aspectRatio}</span>
                                </button>
                                <button onClick={() => setShowNotesDrawer(!showNotesDrawer)} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Speaker Notes</span>
                                    <span className="text-[10px] text-amber-500 font-bold">{showNotesDrawer ? 'OPEN' : 'CLOSED'}</span>
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => moveSlide(-1)} disabled={currentSlideIndex === 0} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 disabled:opacity-40 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <MoveUp size={13} /> Move Slide Up
                                </button>
                                <button onClick={() => moveSlide(1)} disabled={currentSlideIndex === slides.length - 1} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 disabled:opacity-40 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <MoveDown size={13} /> Move Slide Down
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={deleteSlide} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-500 ${isDark ? 'hover:bg-rose-950/40' : 'hover:bg-rose-100'}`}>
                                    <Trash2 size={13} /> Delete Slide
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={`h-4 w-px mx-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Theme Quick Switcher */}
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] mr-1 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Palette size={12} /> Theme:
                        </span>
                        {THEMES.map((th) => (
                            <button
                                key={th.name}
                                type="button"
                                onClick={() => applyTheme(th)}
                                className="w-4 h-4 rounded-full border border-slate-500 transition hover:scale-110 shadow-xs"
                                style={{ backgroundColor: th.bg }}
                                title={th.name}
                            />
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Application Body: Slide Thumbnails + Canvas */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. Slide Thumbnails Sidebar */}
                <aside className={`w-56 border-r flex flex-col shrink-0 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                    <div className={`p-3 border-b flex items-center justify-between ${
                        isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                        <span className="text-xs font-bold flex items-center gap-1.5">
                            <Layers size={13} className="text-amber-500" />
                            Slides ({slides.length})
                        </span>
                        <button
                            type="button"
                            onClick={() => addSlide('bullets')}
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 transition"
                            title="Add New Slide"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {/* Scrollable Thumbnails List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                        {slides.map((slide, idx) => {
                            const isSelected = currentSlideIndex === idx;
                            return (
                                <div
                                    key={slide.id || idx}
                                    onClick={() => setCurrentSlideIndex(idx)}
                                    className={`group relative rounded-xl border p-2 cursor-pointer transition flex flex-col gap-1.5 ${
                                        isSelected
                                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                                            : (isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`font-mono text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            #{idx + 1}
                                        </span>
                                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {slide.layout}
                                        </span>
                                    </div>

                                    {/* Mini Preview Box */}
                                    <div
                                        className="h-20 rounded-lg p-2 flex flex-col justify-between overflow-hidden shadow-inner border border-slate-400/20"
                                        style={{
                                            backgroundColor: slide.bgColor || '#0f172a',
                                            backgroundImage: slide.bgGradient || 'none'
                                        }}
                                    >
                                        <p className="text-[10px] font-bold line-clamp-1" style={{ color: slide.textColor || '#ffffff' }}>
                                            {slide.title || 'Untitled'}
                                        </p>
                                        <p className="text-[8px] opacity-75 line-clamp-2" style={{ color: slide.textColor || '#ffffff' }}>
                                            {slide.subtitle || (slide.elements?.[0]?.content) || ''}
                                        </p>
                                        <div className="w-full h-1 bg-amber-500/40 rounded-full" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* 3. Presentation Slide Canvas (Widescreen 16:9 or Standard 4:3) */}
                <main className={`flex-1 overflow-auto flex flex-col items-center justify-center p-6 relative ${
                    isDark ? 'bg-slate-950' : 'bg-slate-200/70'
                }`}>
                    {/* Slide Surface Container */}
                    <div
                        className={`w-full rounded-2xl border border-slate-400/30 shadow-2xl p-8 sm:p-12 flex flex-col justify-between transition-all relative overflow-hidden ${
                            aspectRatio === '16:9' ? 'max-w-4xl aspect-video' : 'max-w-3xl aspect-[4/3]'
                        }`}
                        style={{
                            backgroundColor: currentSlide.bgColor || '#0f172a',
                            backgroundImage: currentSlide.bgGradient || 'none',
                            color: currentSlide.textColor || '#f8fafc'
                        }}
                    >
                        {/* Decorative Top Accent Bar */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

                        {/* Slide Content Header */}
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={currentSlide.title || ''}
                                onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                                placeholder="Enter Slide Title..."
                                className="bg-transparent border-b border-transparent hover:border-slate-500/40 focus:border-amber-500 text-2xl sm:text-3xl font-extrabold focus:outline-none transition pb-1"
                                style={{ color: currentSlide.textColor || '#ffffff' }}
                            />
                            <input
                                type="text"
                                value={currentSlide.subtitle || ''}
                                onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                                placeholder="Enter Slide Subtitle or Learning Scope..."
                                className="bg-transparent border-b border-transparent hover:border-slate-500/40 focus:border-amber-500 text-sm sm:text-base opacity-75 focus:outline-none transition pb-0.5"
                                style={{ color: currentSlide.textColor || '#ffffff' }}
                            />
                        </div>

                        {/* Slide Body based on Layout and Custom Elements */}
                        <div className="flex-1 my-6 overflow-y-auto pr-2">
                            {currentSlide.layout === 'two_col' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                                    <div className="bg-black/20 rounded-xl p-4 border border-white/10 flex flex-col">
                                        <span className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wider">Column A</span>
                                        <textarea
                                            value={currentSlide.elements?.[0]?.content || ''}
                                            onChange={(e) => updateElementContent(0, e.target.value)}
                                            rows={6}
                                            className="w-full bg-transparent text-xs sm:text-sm focus:outline-none resize-none leading-relaxed"
                                            style={{ color: currentSlide.textColor || '#f8fafc' }}
                                            placeholder="Enter text or bullet observations..."
                                        />
                                    </div>
                                    <div className="bg-black/20 rounded-xl p-4 border border-white/10 flex flex-col">
                                        <span className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wider">Column B</span>
                                        <textarea
                                            value={currentSlide.elements?.[1]?.content || ''}
                                            onChange={(e) => updateElementContent(1, e.target.value)}
                                            rows={6}
                                            className="w-full bg-transparent text-xs sm:text-sm focus:outline-none resize-none leading-relaxed"
                                            style={{ color: currentSlide.textColor || '#f8fafc' }}
                                            placeholder="Enter text or benchmark parameters..."
                                        />
                                    </div>
                                </div>
                            ) : currentSlide.layout === 'formula' ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 p-6 bg-black/20 rounded-2xl border border-white/10 text-center">
                                    <div className="px-6 py-4 rounded-xl bg-black/40 border border-amber-500/30 text-amber-300 font-mono text-xl sm:text-2xl shadow-lg">
                                        {currentSlide.elements?.[0]?.formula || 'E = mc^2'}
                                    </div>
                                    <textarea
                                        value={currentSlide.elements?.[1]?.content || ''}
                                        onChange={(e) => updateElementContent(1, e.target.value)}
                                        rows={3}
                                        className="w-full max-w-lg bg-transparent text-xs sm:text-sm text-center focus:outline-none resize-none"
                                        style={{ color: currentSlide.textColor || '#f8fafc' }}
                                        placeholder="Add mathematical explanation or variable definitions..."
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(currentSlide.elements || []).map((el, elIdx) => {
                                        if (el.type === 'shape') {
                                            return (
                                                <div
                                                    key={el.id || elIdx}
                                                    className="p-3 rounded-xl border border-white/20 bg-black/20 flex items-center justify-between gap-3 shadow-md"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-12 h-8 rounded flex items-center justify-center text-[10px] font-bold text-white shadow"
                                                            style={{ backgroundColor: el.color }}
                                                        >
                                                            {el.shape === 'circle' ? <Circle size={16} /> : el.shape === 'star' ? <Star size={16} /> : <Square size={16} />}
                                                        </div>
                                                        <span className="text-xs font-semibold">{el.label || el.shape}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReorderElement(elIdx, -1)}
                                                            disabled={elIdx === 0}
                                                            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-[10px]"
                                                            title="Send Backward (Layer down)"
                                                        >
                                                            <MoveUp size={12} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReorderElement(elIdx, 1)}
                                                            disabled={elIdx === (currentSlide.elements?.length || 0) - 1}
                                                            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-[10px]"
                                                            title="Bring Forward (Layer up)"
                                                        >
                                                            <MoveDown size={12} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = currentSlide.elements.filter((_, i) => i !== elIdx);
                                                                updateCurrentSlide({ elements: updated });
                                                                toast.success('Shape removed');
                                                            }}
                                                            className="p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[10px]"
                                                            title="Delete Shape"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <textarea
                                                key={el.id || elIdx}
                                                value={el.content || ''}
                                                onChange={(e) => updateElementContent(elIdx, e.target.value)}
                                                rows={2}
                                                className="w-full bg-transparent hover:bg-black/10 focus:bg-black/20 border border-transparent focus:border-white/20 rounded-lg p-2 text-sm sm:text-base focus:outline-none resize-none leading-relaxed transition"
                                                style={{ color: currentSlide.textColor || '#f8fafc' }}
                                                placeholder="Enter bullet point or lecture note..."
                                            />
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = [...(currentSlide.elements || [])];
                                            updated.push({ id: `el_${Date.now()}`, type: 'text', content: '• New observation parameter' });
                                            updateCurrentSlide({ elements: updated });
                                        }}
                                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold mt-2"
                                    >
                                        <Plus size={13} /> Add Point
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Slide Footer */}
                        <div className="flex items-center justify-between text-[11px] opacity-75 border-t border-white/10 pt-3">
                            <span>LabSlides • Interactive Office Suite</span>
                            <span className="font-mono font-bold">
                                Slide {currentSlideIndex + 1} of {slides.length} ({aspectRatio})
                            </span>
                        </div>
                    </div>

                    {/* Expandable Speaker Notes Drawer */}
                    {showNotesDrawer && (
                        <div className={`w-full max-w-4xl mt-3 p-3 rounded-xl border shadow-lg text-xs animate-in slide-in-from-bottom duration-150 ${
                            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800/60">
                                <span className="font-bold flex items-center gap-1.5 text-[11px] text-amber-500 uppercase tracking-wider">
                                    <MessageSquare size={13} />
                                    Speaker Notes for Slide #{currentSlideIndex + 1}
                                </span>
                                <span className="text-[10px] text-slate-400">Visible only to you during Presenter View</span>
                            </div>
                            <textarea
                                rows={3}
                                value={currentSlide.notes || ''}
                                onChange={(e) => updateCurrentSlide({ notes: e.target.value })}
                                placeholder="Add talking points, lecture questions, or reminders for this slide..."
                                className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:border-amber-500 leading-relaxed ${
                                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                                }`}
                            />
                        </div>
                    )}

                    {/* Bottom Floating Slide Controller */}
                    <div className={`mt-4 flex items-center gap-2 backdrop-blur-md border rounded-full px-4 py-2 shadow-xl ${
                        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-300 text-slate-700 shadow-slate-400/40'
                    }`}>
                        <button
                            type="button"
                            onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentSlideIndex === 0}
                            className={`p-1 rounded transition disabled:opacity-30 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}
                            title="Previous Slide"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-mono text-xs font-bold">
                            {currentSlideIndex + 1} / {slides.length}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                            disabled={currentSlideIndex === slides.length - 1}
                            className={`p-1 rounded transition disabled:opacity-30 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}
                            title="Next Slide"
                        >
                            <ChevronRight size={16} />
                        </button>

                        <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

                        {/* Layout Switcher */}
                        <select
                            value={currentSlide.layout || 'bullets'}
                            onChange={(e) => updateCurrentSlide({ layout: e.target.value })}
                            className={`border rounded px-2 py-0.5 text-xs focus:outline-none ${
                                isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-800'
                            }`}
                        >
                            <option value="title">Title Layout</option>
                            <option value="bullets">Bullets Layout</option>
                            <option value="two_col">Two Column Comparison</option>
                            <option value="formula">Math Formula Layout</option>
                        </select>

                        <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

                        {/* Aspect Ratio Toggle (16:9 vs 4:3) */}
                        <button
                            type="button"
                            onClick={() => {
                                const next = aspectRatio === '16:9' ? '4:3' : '16:9';
                                setAspectRatio(next);
                                toast.success(`Aspect Ratio set to ${next}`);
                            }}
                            className={`px-2 py-1 rounded text-xs font-bold border transition ${
                                isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white' : 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-900'
                            }`}
                            title="Toggle between 16:9 Widescreen and 4:3 Standard"
                        >
                            {aspectRatio}
                        </button>

                        {/* Shapes Library Button */}
                        <button
                            type="button"
                            onClick={() => setShowShapeModal(true)}
                            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
                                isDark ? 'text-amber-400 hover:bg-slate-800' : 'text-amber-600 hover:bg-slate-100'
                            }`}
                            title="Insert Vector Shape"
                        >
                            <Shapes size={14} />
                            <span className="hidden md:inline">Shape</span>
                        </button>

                        {/* Background Presets Button */}
                        <button
                            type="button"
                            onClick={() => setShowBgModal(true)}
                            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
                                isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Slide Background Presets & Custom Gradient"
                        >
                            <Palette size={14} />
                            <span className="hidden md:inline">Background</span>
                        </button>

                        {/* Speaker Notes Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setShowNotesDrawer(!showNotesDrawer)}
                            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
                                showNotesDrawer
                                    ? 'bg-amber-500/20 text-amber-500 font-bold'
                                    : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Toggle Speaker Notes Drawer"
                        >
                            <MessageSquare size={14} />
                            <span className="hidden md:inline">Notes</span>
                            {currentSlide.notes && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
                        </button>

                        {/* Presenter View Runner Button */}
                        <button
                            type="button"
                            onClick={() => setIsPresenterMode(true)}
                            className="px-2.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                            title="Launch Presenter View"
                        >
                            <Monitor size={13} />
                            <span className="hidden md:inline">Presenter</span>
                        </button>
                    </div>
                </main>
            </div>

            {/* 4. Fullscreen Simple Slideshow Mode (F5) */}
            {isPresenting && (
                <div
                    className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-10 cursor-none select-none animate-in fade-in duration-200"
                    onMouseMove={(e) => {
                        setLaserPos({ x: e.clientX, y: e.clientY });
                    }}
                >
                    {/* Laser Pointer */}
                    {laserActive && (
                        <div
                            className="fixed w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_15px_#f43f5e] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-50 animate-pulse"
                            style={{ left: `${laserPos.x}px`, top: `${laserPos.y}px` }}
                        />
                    )}

                    {/* Top Floating Controls */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-slate-500 uppercase tracking-widest text-[11px]">
                            {title}
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setLaserActive(!laserActive)}
                                className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${laserActive ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                            >
                                Laser Pointer (L)
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPresenting(false)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold cursor-pointer"
                            >
                                Exit (Esc)
                            </button>
                        </div>
                    </div>

                    {/* Active Slide Display */}
                    <div className="max-w-5xl mx-auto w-full my-auto flex flex-col justify-center gap-6">
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                            {currentSlide.title}
                        </h1>
                        {currentSlide.subtitle && (
                            <h3 className="text-xl sm:text-2xl text-amber-400 font-medium">
                                {currentSlide.subtitle}
                            </h3>
                        )}

                        <div className="mt-8 space-y-4">
                            {currentSlide.layout === 'formula' ? (
                                <div className="p-8 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-300 text-3xl font-mono text-center">
                                    {currentSlide.elements?.[0]?.formula || 'E = mc^2'}
                                </div>
                            ) : (
                                (currentSlide.elements || []).map((el, i) => (
                                    <p key={i} className="text-xl sm:text-2xl text-slate-200 leading-relaxed">
                                        {el.content}
                                    </p>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Bottom Status & Slide Navigation */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="text-[11px] text-slate-600">
                            Press Left / Right Arrow or Spacebar to Navigate
                        </span>
                        <span className="font-mono font-bold text-amber-400">
                            {currentSlideIndex + 1} / {slides.length}
                        </span>
                    </div>
                </div>
            )}

            {/* 5. Full-Featured Dual-Screen Presenter View Runner */}
            {isPresenterMode && (
                <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6 select-none animate-in fade-in duration-200">
                    {/* Top Control Bar */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-xs tracking-wider text-amber-400 uppercase bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                                Presenter View
                            </span>
                            <span className="text-xs text-slate-400 truncate max-w-sm">{title}</span>
                        </div>

                        {/* Live Stopwatch & Controls */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs">
                                <Clock size={13} className="text-amber-500" />
                                <span>Elapsed: {formatTime(elapsedSeconds)}</span>
                                <button
                                    type="button"
                                    onClick={() => setTimerRunning(!timerRunning)}
                                    className="ml-2 text-slate-400 hover:text-white"
                                    title={timerRunning ? 'Pause timer' : 'Resume timer'}
                                >
                                    {timerRunning ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setElapsedSeconds(0)}
                                    className="text-slate-400 hover:text-white"
                                    title="Reset timer"
                                >
                                    <RotateCcw size={12} />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsPresenterMode(false)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold cursor-pointer"
                            >
                                Exit Presenter View (Esc)
                            </button>
                        </div>
                    </div>

                    {/* Dual Screen Workspace */}
                    <div className="flex-1 grid grid-cols-12 gap-6 my-4 overflow-hidden">
                        {/* Left 7 cols: Current Slide Live Preview */}
                        <div className="col-span-7 flex flex-col justify-center">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Current Slide ({currentSlideIndex + 1} of {slides.length})
                            </span>
                            <div
                                className="w-full aspect-video rounded-2xl border border-slate-700 shadow-2xl p-8 flex flex-col justify-between overflow-hidden"
                                style={{
                                    backgroundColor: currentSlide.bgColor || '#0f172a',
                                    backgroundImage: currentSlide.bgGradient || 'none',
                                    color: currentSlide.textColor || '#ffffff'
                                }}
                            >
                                <div>
                                    <h2 className="text-2xl font-bold">{currentSlide.title}</h2>
                                    {currentSlide.subtitle && (
                                        <p className="text-sm opacity-80 mt-1">{currentSlide.subtitle}</p>
                                    )}
                                </div>
                                <div className="my-auto space-y-2">
                                    {(currentSlide.elements || []).map((el, idx) => (
                                        <p key={idx} className="text-sm opacity-90 leading-relaxed">{el.content}</p>
                                    ))}
                                </div>
                                <div className="text-[10px] opacity-60">Slide {currentSlideIndex + 1}</div>
                            </div>
                        </div>

                        {/* Right 5 cols: Next Slide Preview + Speaker Notes */}
                        <div className="col-span-5 flex flex-col gap-4 overflow-hidden">
                            {/* Next Slide Preview */}
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Next Slide Preview
                                </span>
                                {currentSlideIndex < slides.length - 1 ? (
                                    <div
                                        className="w-full h-32 rounded-xl border border-slate-800 p-3 flex flex-col justify-between overflow-hidden shadow-inner"
                                        style={{
                                            backgroundColor: slides[currentSlideIndex + 1].bgColor || '#0f172a',
                                            backgroundImage: slides[currentSlideIndex + 1].bgGradient || 'none',
                                            color: slides[currentSlideIndex + 1].textColor || '#ffffff'
                                        }}
                                    >
                                        <h4 className="text-xs font-bold truncate">{slides[currentSlideIndex + 1].title}</h4>
                                        <p className="text-[11px] opacity-75 truncate">{slides[currentSlideIndex + 1].subtitle}</p>
                                        <span className="text-[9px] opacity-60 font-mono">Slide {currentSlideIndex + 2}</span>
                                    </div>
                                ) : (
                                    <div className="w-full h-32 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-500 text-xs italic">
                                        End of Presentation
                                    </div>
                                )}
                            </div>

                            {/* Speaker Notes */}
                            <div className="flex-1 flex flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-4 overflow-hidden">
                                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <MessageSquare size={13} /> Speaker Notes
                                </span>
                                <div className="flex-1 overflow-y-auto text-sm leading-relaxed text-slate-200 font-sans">
                                    {currentSlide.notes ? (
                                        <p className="whitespace-pre-wrap">{currentSlide.notes}</p>
                                    ) : (
                                        <p className="text-slate-500 italic text-xs">No speaker notes written for this slide.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Navigation Ribbon */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                        <span className="text-slate-500">Press Left / Right Arrow or click below to advance</span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentSlideIndex === 0}
                                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-medium"
                            >
                                Previous Slide
                            </button>
                            <span className="font-mono font-bold text-amber-400">
                                {currentSlideIndex + 1} / {slides.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                                disabled={currentSlideIndex === slides.length - 1}
                                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white font-bold"
                            >
                                Next Slide
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Vector Shapes Library Modal */}
            {showShapeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className={`border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <Shapes size={16} className="text-amber-500" />
                                <span>Vector Shapes Library</span>
                            </h4>
                            <button onClick={() => setShowShapeModal(false)} className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}>
                                <X size={16} />
                            </button>
                        </div>

                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Select a shape to insert onto the current slide canvas. You can reorder layers forward or backward anytime.
                        </p>

                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { type: 'rectangle', label: 'Rectangle', icon: <Square size={20} /> },
                                { type: 'rounded_rect', label: 'Rounded Rect', icon: <Square size={20} className="rounded-md" /> },
                                { type: 'circle', label: 'Circle', icon: <Circle size={20} /> },
                                { type: 'arrow', label: 'Arrow', icon: <ArrowRight size={20} /> },
                                { type: 'star', label: 'Star', icon: <Star size={20} /> },
                                { type: 'callout', label: 'Speech Callout', icon: <MessageSquare size={20} /> }
                            ].map((sh) => (
                                <button
                                    key={sh.type}
                                    type="button"
                                    onClick={() => handleInsertShape(sh.type)}
                                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition hover:scale-105 ${
                                        isDark ? 'bg-slate-950 border-slate-800 hover:border-amber-500 text-slate-200' : 'bg-slate-50 border-slate-200 hover:border-amber-500 text-slate-800'
                                    }`}
                                >
                                    <div className="text-amber-500">{sh.icon}</div>
                                    <span className="text-[11px] font-semibold">{sh.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className={`flex justify-end pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <button
                                type="button"
                                onClick={() => setShowShapeModal(false)}
                                className={`px-4 py-1.5 rounded-lg border text-xs font-semibold ${
                                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slide Background & Gradients Modal */}
            {showBgModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className={`border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <Palette size={16} className="text-amber-500" />
                                <span>Slide Background & Gradients</span>
                            </h4>
                            <button onClick={() => setShowBgModal(false)} className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}>
                                <X size={16} />
                            </button>
                        </div>

                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Select a rich background gradient or solid tone for your presentation slides.
                        </p>

                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                            {BG_PRESETS.map((preset) => (
                                <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => handleApplyBackground(preset, false)}
                                    className="p-3 rounded-xl border border-slate-700/60 flex items-center gap-3 transition hover:scale-102 text-left"
                                    style={{
                                        backgroundColor: preset.style.bg,
                                        backgroundImage: preset.style.gradient || 'none'
                                    }}
                                >
                                    <div className="w-6 h-6 rounded-full border border-white/40 shadow-xs" style={{ backgroundColor: preset.style.bg }} />
                                    <span className="text-xs font-bold" style={{ color: preset.style.text }}>
                                        {preset.name}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <button
                                type="button"
                                onClick={() => handleApplyBackground(BG_PRESETS[0], true)}
                                className={`text-[11px] text-amber-500 hover:underline`}
                            >
                                Apply Default to All Slides
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBgModal(false)}
                                className={`px-4 py-1.5 rounded-lg border text-xs font-semibold ${
                                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Visual Thumbnail Picture Preview Badge on Every Addition */}
            {additionBadge && (
                <div className={`fixed bottom-12 right-6 z-50 flex items-center gap-3 p-3 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom duration-300 max-w-sm ${
                    isDark ? 'bg-slate-900 border-amber-500/50 text-white shadow-amber-950/40' : 'bg-white border-amber-400 text-slate-900 shadow-slate-300/80'
                }`}>
                    {/* Visual 16:9 Graphic Thumbnail Preview */}
                    <div className="w-14 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-1 flex items-center justify-center shrink-0 shadow-sm text-white overflow-hidden border border-white/20">
                        <div className="flex flex-col gap-0.5 w-full h-full justify-center px-1">
                            <div className="w-6 h-1 bg-white rounded-full" />
                            <div className="w-8 h-0.5 bg-white/70 rounded-full" />
                            <div className="w-4 h-0.5 bg-white/50 rounded-full" />
                        </div>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 leading-none">
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">New Addition</span>
                            <span className="text-[9px] text-slate-400">• Just now</span>
                        </div>
                        <h4 className="font-bold text-xs truncate mt-0.5">{additionBadge.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{additionBadge.subtitle}</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setAdditionBadge(null)}
                        className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-white shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Blur Breathing Loader on Initial Load */}
            {isInitialLoading && (
                <OfficeAppBlurLoader
                    appType="slides"
                    message="Initializing LabSlides..."
                    subMessage="Loading widescreen 16:9 stage, presentation layouts, and KaTeX rendering"
                />
            )}
        </div>
    );
}
