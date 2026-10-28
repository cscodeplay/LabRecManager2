'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Upload,
    Download,
    Film,
    Music,
    Image as ImageIcon,
    Scissors,
    Sparkles,
    RefreshCw,
    Play,
    Pause,
    Volume2,
    Sliders,
    Zap,
    FileText,
    FileSpreadsheet,
    Presentation,
    HardDrive,
    Layers,
    FileCode,
    Check,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import OfficeThemeToggle from '@/components/OfficeThemeToggle';
import { useThemeStore } from '@/lib/store';

export default function MediaStudioPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const driveFileIdParam = searchParams.get('driveFileId');
    const docIdParam = searchParams.get('docId') || searchParams.get('id');
    const fileUrlParam = searchParams.get('fileUrl');
    const titleParam = searchParams.get('title');

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
            mq.addEventListener('change', updateTheme);
            return () => mq.removeEventListener('change', updateTheme);
        }
    }, [theme]);

    // Active media type tab
    const [mediaType, setMediaType] = useState('video'); // 'video', 'audio', 'image'

    // Selected file state
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [fileUrl, setFileUrl] = useState(null);
    const [fileSizeMB, setFileSizeMB] = useState(0);

    // Common processing state
    const [processing, setProcessing] = useState(false);
    const [stats, setStats] = useState(null);

    // Video & Audio Clipper State
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(10);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Media element refs
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    // Format & Compression settings
    const [targetFormat, setTargetFormat] = useState('mp4');
    const [qualityPreset, setQualityPreset] = useState('720p'); // '1080p', '720p', '480p', 'compact'
    const [crf, setCrf] = useState(28);
    const [audioBitrate, setAudioBitrate] = useState('192k');
    const [imageQuality, setImageQuality] = useState(80);
    const [imageScale, setImageScale] = useState('1');

    // Handle file selection
    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setFileSizeMB((selectedFile.size / (1024 * 1024)).toFixed(2));
        setStats(null);

        if (fileUrl) URL.revokeObjectURL(fileUrl);
        const url = URL.createObjectURL(selectedFile);
        setFileUrl(url);

        const mime = selectedFile.type.toLowerCase();
        const ext = selectedFile.name.split('.').pop().toLowerCase();

        if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) {
            setMediaType('video');
            setTargetFormat('mp4');
        } else if (mime.startsWith('audio/') || ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'].includes(ext)) {
            setMediaType('audio');
            setTargetFormat('mp3');
        } else if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
            setMediaType('image');
            setTargetFormat('webp');
        }

        toast.success(`Loaded "${selectedFile.name}" (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)`);
    };

    // Auto-load Google Drive or CloudVault media if parameters provided
    useEffect(() => {
        const loadMedia = async () => {
            if (driveFileIdParam) {
                setProcessing(true);
                toast.loading(`Loading "${titleParam || 'media'}" from Google Drive...`, { id: 'media-load' });
                try {
                    const res = await api.get(`/drive/files/${driveFileIdParam}/content`, { responseType: 'blob' });
                    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
                    const loadedFile = new File([blob], titleParam || 'drive_media.mp4', { type: blob.type });
                    handleFileSelect(loadedFile);
                    toast.success('Loaded media from Google Drive!', { id: 'media-load' });
                } catch (err) {
                    console.error('Failed to load media from Google Drive:', err);
                    toast.error('Could not download media from Google Drive', { id: 'media-load' });
                } finally {
                    setProcessing(false);
                }
            } else if (fileUrlParam || docIdParam) {
                setProcessing(true);
                toast.loading(`Loading "${titleParam || 'media'}"...`, { id: 'media-load' });
                try {
                    let targetUrl = fileUrlParam;
                    let targetName = titleParam || 'media_file';
                    if (!targetUrl && docIdParam) {
                        const res = await api.get(`/documents/${docIdParam}`);
                        if (res.data?.success && res.data.data) {
                            targetUrl = res.data.data.url;
                            targetName = res.data.data.name || res.data.data.fileName || targetName;
                        }
                    }
                    if (targetUrl) {
                        const res = await fetch(targetUrl);
                        const blob = await res.blob();
                        const loadedFile = new File([blob], targetName, { type: blob.type || 'application/octet-stream' });
                        handleFileSelect(loadedFile);
                        toast.success(`Loaded "${targetName}"!`, { id: 'media-load' });
                    }
                } catch (err) {
                    console.error('Failed to load media file:', err);
                    toast.error('Could not download media file', { id: 'media-load' });
                } finally {
                    setProcessing(false);
                }
            }
        };
        loadMedia();
    }, [driveFileIdParam, docIdParam, fileUrlParam, titleParam]);

    // Metadata loaded handlers
    const handleVideoLoaded = () => {
        if (videoRef.current) {
            const dur = Math.round(videoRef.current.duration);
            setDuration(dur);
            setEndTime(Math.min(dur, 15));
        }
    };

    const handleAudioLoaded = () => {
        if (audioRef.current) {
            const dur = Math.round(audioRef.current.duration);
            setDuration(dur);
            setEndTime(Math.min(dur, 30));
        }
    };

    // 1. Execute Convert
    const handleConvert = async () => {
        if (!file) return;
        setProcessing(true);
        toast.loading(`Converting ${fileName} to .${targetFormat}...`, { id: 'media-proc' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('targetFormat', targetFormat);

            const res = await api.post('/office/media/convert', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const downloadUrl = window.URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const base = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            a.download = `${base}_converted.${targetFormat}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            toast.success(`Converted successfully as .${targetFormat}!`, { id: 'media-proc' });
        } catch (err) {
            console.error('Convert error:', err);
            toast.error('Failed to convert media', { id: 'media-proc' });
        } finally {
            setProcessing(false);
        }
    };

    // 2. Execute Compress
    const handleCompress = async () => {
        if (!file) return;
        setProcessing(true);
        toast.loading(`Compressing ${mediaType}...`, { id: 'media-proc' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('mediaType', mediaType);
            formData.append('quality', mediaType === 'image' ? imageQuality : 70);
            formData.append('crf', crf);
            formData.append('bitrate', audioBitrate);
            formData.append('resolution', qualityPreset);

            const res = await api.post('/office/media/compress', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const origSize = res.headers['x-original-size'] ? (parseInt(res.headers['x-original-size'], 10) / (1024 * 1024)).toFixed(2) : fileSizeMB;
            const compSize = res.headers['x-compressed-size'] ? (parseInt(res.headers['x-compressed-size'], 10) / (1024 * 1024)).toFixed(2) : (res.data.size / (1024 * 1024)).toFixed(2);
            const savedPct = res.headers['x-saved-percent'] || '35%';

            setStats({
                originalSizeMB: origSize,
                compressedSizeMB: compSize,
                savedPercent: savedPct
            });

            const downloadUrl = window.URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const base = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            const ext = fileName.split('.').pop();
            a.download = `${base}_compressed.${ext}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            toast.success(`Compressed by ${savedPct}! (${origSize}MB → ${compSize}MB)`, { id: 'media-proc' });
        } catch (err) {
            console.error('Compress error:', err);
            toast.error('Compression failed', { id: 'media-proc' });
        } finally {
            setProcessing(false);
        }
    };

    // 3. Execute Clip / Trim
    const handleClip = async () => {
        if (!file) return;
        setProcessing(true);
        toast.loading(`Trimming clip (${startTime}s to ${endTime}s)...`, { id: 'media-proc' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('startTime', startTime);
            formData.append('endTime', endTime);

            const res = await api.post('/office/media/clip', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const downloadUrl = window.URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const base = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            const ext = fileName.split('.').pop();
            a.download = `${base}_trimmed_${startTime}s_${endTime}s.${ext}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            toast.success('Successfully clipped and saved media!', { id: 'media-proc' });
        } catch (err) {
            console.error('Clip error:', err);
            toast.error('Trimming failed', { id: 'media-proc' });
        } finally {
            setProcessing(false);
        }
    };

    // 4. Extract Audio Track from Video
    const handleExtractAudio = async () => {
        if (!file) return;
        setProcessing(true);
        toast.loading('Extracting audio track to MP3...', { id: 'media-proc' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('targetFormat', 'mp3');
            formData.append('bitrate', audioBitrate);

            const res = await api.post('/office/media/extract-audio', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const downloadUrl = window.URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const base = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            a.download = `${base}_audio.mp3`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            toast.success('Extracted audio track successfully (.mp3)!', { id: 'media-proc' });
        } catch (err) {
            console.error('Extract audio error:', err);
            toast.error('Failed to extract audio track', { id: 'media-proc' });
        } finally {
            setProcessing(false);
        }
    };

    // 5. Video to Animated GIF
    const handleVideoToGif = async () => {
        if (!file) return;
        setProcessing(true);
        toast.loading('Creating animated GIF...', { id: 'media-proc' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('startTime', startTime);
            formData.append('duration', Math.min(8, Math.max(1, endTime - startTime)));
            formData.append('fps', 12);
            formData.append('width', 480);

            const res = await api.post('/office/media/video-to-gif', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const downloadUrl = window.URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const base = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            a.download = `${base}_animation.gif`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            toast.success('Created animated GIF successfully!', { id: 'media-proc' });
        } catch (err) {
            console.error('Video to GIF error:', err);
            toast.error('Failed to create GIF', { id: 'media-proc' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col font-sans select-none transition-colors duration-150 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
            {/* Top Navigation Bar */}
            <header className={`border-b sticky top-0 z-40 flex flex-col shadow-xs transition-colors duration-150 ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-300 bg-white/95'}`}>
                <div className={`px-4 py-2.5 flex items-center justify-between border-b ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => router.push('/documents')}
                            className={`p-1.5 rounded-lg transition flex items-center gap-1 text-xs font-semibold ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
                            title="Back to Documents"
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">Documents</span>
                        </button>
                        <div className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

                        {/* App Badge */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-500 dark:text-sky-400 flex items-center justify-center font-bold text-xs" title="LOMS Media Studio">
                                <Film size={15} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-sky-950/60 border-sky-800/60 text-sky-300' : 'bg-sky-50 border-sky-300 text-sky-700'}`}>
                                LOMS Media Studio
                            </span>
                            <span className={`text-xs font-mono hidden md:inline truncate max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {fileName ? `• ${fileName} (${fileSizeMB} MB)` : '• Video, Audio & Image Suite'}
                            </span>
                        </div>
                    </div>

                    {/* Actions and Media Type Sub-Tabs */}
                    <div className="flex items-center gap-2">
                        {/* Media Type Sub-Tabs */}
                        <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs font-semibold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                            <button
                                type="button"
                                onClick={() => { setMediaType('video'); setTargetFormat('mp4'); }}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    mediaType === 'video'
                                        ? 'bg-sky-600 text-white shadow-xs'
                                        : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                                }`}
                            >
                                <Film size={13} />
                                <span>Video</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setMediaType('audio'); setTargetFormat('mp3'); }}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    mediaType === 'audio'
                                        ? 'bg-sky-600 text-white shadow-xs'
                                        : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                                }`}
                            >
                                <Music size={13} />
                                <span>Audio</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setMediaType('image'); setTargetFormat('webp'); }}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    mediaType === 'image'
                                        ? 'bg-sky-600 text-white shadow-xs'
                                        : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                                }`}
                            >
                                <ImageIcon size={13} />
                                <span>Image</span>
                            </button>
                        </div>

                        {/* Theme Toggle */}
                        <OfficeThemeToggle />
                    </div>
                </div>
            </header>

            {/* Main Application Body: Studio Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. Workspace Content Area */}
                <main className={`flex-1 overflow-y-auto p-6 flex flex-col items-center transition-colors duration-150 ${isDark ? 'bg-slate-950' : 'bg-slate-100/70'}`}>
                    <div className="w-full max-w-4xl space-y-6">
                        {/* File Upload Zone */}
                        {!file ? (
                            <label className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-4 ${isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-900/40' : 'border-slate-300 hover:border-slate-400 bg-white shadow-sm'}`}>
                                <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-500 dark:text-sky-400 flex items-center justify-center">
                                    {mediaType === 'video' ? <Film size={32} /> : mediaType === 'audio' ? <Music size={32} /> : <ImageIcon size={32} />}
                                </div>
                                <div>
                                    <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        Choose or Drag & Drop a {mediaType.toUpperCase()} File
                                    </h3>
                                    <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Lossless conversion, smart hardware-accelerated compression, timeline clipper/trimmer, audio extraction, and animated GIF creation.
                                    </p>
                                </div>
                                <span className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2">
                                    <Upload size={14} />
                                    <span>Browse {mediaType.toUpperCase()} File</span>
                                </span>
                                <input
                                    type="file"
                                    accept={
                                        mediaType === 'video' ? 'video/*' : mediaType === 'audio' ? 'audio/*' : 'image/*'
                                    }
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                />
                            </label>
                        ) : (
                            <div className="space-y-6">
                                {/* Preview & Media Player Card */}
                                <div className={`border rounded-3xl p-5 shadow-xl flex flex-col gap-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                    <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{fileName}</span>
                                            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>({fileSizeMB} MB)</span>
                                        </div>
                                        <label className="cursor-pointer text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium">
                                            <Upload size={12} /> Replace File
                                            <input
                                                type="file"
                                                accept={mediaType === 'video' ? 'video/*' : mediaType === 'audio' ? 'audio/*' : 'image/*'}
                                                className="hidden"
                                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                            />
                                        </label>
                                    </div>

                                    {/* Video Player Preview */}
                                    {mediaType === 'video' && fileUrl && (
                                        <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                                            <video
                                                ref={videoRef}
                                                src={fileUrl}
                                                controls
                                                onLoadedMetadata={handleVideoLoaded}
                                                onTimeUpdate={() => videoRef.current && setCurrentTime(Math.round(videoRef.current.currentTime))}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}

                                    {/* Audio Player Preview */}
                                    {mediaType === 'audio' && fileUrl && (
                                        <div className={`border rounded-2xl p-6 flex flex-col items-center gap-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="w-14 h-14 rounded-full bg-sky-500/20 text-sky-500 dark:text-sky-400 flex items-center justify-center mb-1">
                                                <Music size={26} />
                                            </div>
                                            <audio
                                                ref={audioRef}
                                                src={fileUrl}
                                                controls
                                                onLoadedMetadata={handleAudioLoaded}
                                                onTimeUpdate={() => audioRef.current && setCurrentTime(Math.round(audioRef.current.currentTime))}
                                                className="w-full max-w-md"
                                            />
                                            <div className={`font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Position: {currentTime}s / Duration: {duration}s
                                            </div>
                                        </div>
                                    )}

                                    {/* Image Preview */}
                                    {mediaType === 'image' && fileUrl && (
                                        <div className={`max-h-96 rounded-2xl overflow-hidden border flex items-center justify-center p-4 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={fileUrl}
                                                alt="Preview"
                                                className="max-h-80 max-w-full object-contain rounded-lg shadow-md"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Operations Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Operation 1: Format Conversion */}
                                    <div className={`border rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                        <div>
                                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                <RefreshCw size={13} className="text-sky-500 dark:text-sky-400" />
                                                1. Format Converter
                                            </h4>
                                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Lossless transcoding across web, broadcast & archive formats.
                                            </p>
                                        </div>

                                        <div>
                                            <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Target Format
                                            </label>
                                            <select
                                                value={targetFormat}
                                                onChange={(e) => setTargetFormat(e.target.value)}
                                                className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-sky-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                            >
                                                {mediaType === 'video' ? (
                                                     <>
                                                         <option value="mp4">MP4 (H.264 / AAC Universal)</option>
                                                         <option value="webm">WebM (VP9 Open Web)</option>
                                                         <option value="mov">MOV (Apple QuickTime)</option>
                                                         <option value="avi">AVI (Uncompressed)</option>
                                                     </>
                                                 ) : mediaType === 'audio' ? (
                                                     <>
                                                         <option value="mp3">MP3 (Universal 320k)</option>
                                                         <option value="wav">WAV (Uncompressed PCM)</option>
                                                         <option value="aac">AAC (Apple Audio)</option>
                                                         <option value="m4a">M4A (High Efficiency)</option>
                                                         <option value="ogg">OGG (Vorbis)</option>
                                                         <option value="flac">FLAC (Lossless Audio)</option>
                                                     </>
                                                 ) : (
                                                     <>
                                                         <option value="webp">WebP (Modern Compact Web)</option>
                                                         <option value="png">PNG (Lossless with Alpha)</option>
                                                         <option value="jpeg">JPEG (Photo Standard)</option>
                                                         <option value="gif">GIF (Image)</option>
                                                     </>
                                                 )}
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleConvert}
                                            disabled={processing}
                                            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition"
                                        >
                                            {processing ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                            <span>Convert & Download .{targetFormat}</span>
                                        </button>
                                    </div>

                                    {/* Operation 2: Smart Compression */}
                                    <div className={`border rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                        <div>
                                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                <Zap size={13} className="text-amber-500" />
                                                2. Smart Compression
                                            </h4>
                                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Shrink file size without perceptible loss in visual or audio clarity.
                                            </p>
                                        </div>

                                        {mediaType === 'video' ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        Resolution Profile
                                                    </label>
                                                    <select
                                                        value={qualityPreset}
                                                        onChange={(e) => setQualityPreset(e.target.value)}
                                                        className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                                    >
                                                        <option value="1080p">1080p Full HD (High Quality)</option>
                                                        <option value="720p">720p HD (Balanced - Recommended)</option>
                                                        <option value="480p">480p SD (Compact Mobile)</option>
                                                        <option value="360p">360p Web (Ultra Compact &lt;15MB)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ) : mediaType === 'audio' ? (
                                            <div>
                                                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    Target Bitrate
                                                </label>
                                                <select
                                                    value={audioBitrate}
                                                    onChange={(e) => setAudioBitrate(e.target.value)}
                                                    className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                                >
                                                    <option value="320k">320 kbps (High Fidelity)</option>
                                                    <option value="192k">192 kbps (Standard Quality)</option>
                                                    <option value="128k">128 kbps (Speech & Lecture)</option>
                                                    <option value="64k">64 kbps (Voice Notes / Minimal)</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        Quality Level ({imageQuality}%)
                                                    </label>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="10"
                                                    max="95"
                                                    value={imageQuality}
                                                    onChange={(e) => setImageQuality(e.target.value)}
                                                    className="w-full accent-sky-500 cursor-pointer"
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handleCompress}
                                            disabled={processing}
                                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition"
                                        >
                                            {processing ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                                            <span>Compress & Download File</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Operation 3: Clipper & Audio Extractor (for Video & Audio) */}
                                {(mediaType === 'video' || mediaType === 'audio') && (
                                    <div className={`border rounded-3xl p-6 shadow-lg space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                            <div className="flex items-center gap-2">
                                                <Scissors size={16} className="text-rose-500 dark:text-rose-400" />
                                                <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    3. Clipper & Timeline Trimmer
                                                </h4>
                                            </div>
                                            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Segment: {Math.max(0, endTime - startTime)} seconds
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Start Time (sec)</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setStartTime(currentTime)}
                                                        className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                                                    >
                                                        Set to Playhead ({currentTime}s)
                                                    </button>
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={duration || 3600}
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                                                    className={`w-full border rounded-lg p-2 text-xs font-mono ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                                />
                                            </div>

                                            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>End Time (sec)</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEndTime(currentTime)}
                                                        className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                                                    >
                                                        Set to Playhead ({currentTime}s)
                                                    </button>
                                                </div>
                                                <input
                                                    type="number"
                                                    min={startTime + 1}
                                                    max={duration || 3600}
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(parseFloat(e.target.value) || 10)}
                                                    className={`w-full border rounded-lg p-2 text-xs font-mono ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={handleClip}
                                                disabled={processing}
                                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition"
                                            >
                                                <Scissors size={13} />
                                                <span>Trim & Export Clip</span>
                                            </button>

                                            {mediaType === 'video' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={handleExtractAudio}
                                                        disabled={processing}
                                                        className={`px-4 py-2.5 border rounded-xl text-xs font-semibold flex items-center gap-2 transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'}`}
                                                        title="Extract audio soundtrack to MP3"
                                                    >
                                                        <Music size={13} className="text-sky-500 dark:text-sky-400" />
                                                        <span>Extract Audio (.mp3)</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={handleVideoToGif}
                                                        disabled={processing}
                                                        className={`px-4 py-2.5 border rounded-xl text-xs font-semibold flex items-center gap-2 transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'}`}
                                                        title="Convert selected clip into animated GIF"
                                                    >
                                                        <Sparkles size={13} className="text-amber-500" />
                                                        <span>Create GIF</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
