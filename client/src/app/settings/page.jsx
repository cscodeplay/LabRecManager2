'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Settings as SettingsIcon, User, Bell, Shield, Palette, Save,
    GraduationCap, Plus, Trash2, RotateCcw, Calendar, Filter, Clock,
    Video, Mic, MicOff, VideoOff, CheckCircle, XCircle, AlertTriangle,
    Volume2, Play, Square, Cloud, HardDrive, Key, Copy, Check, ExternalLink,
    RefreshCw, Eye, EyeOff, Server, Database, Sparkles, Zap, Cpu, CheckCircle2
} from 'lucide-react';
import { useAuthStore, useThemeStore, useLanguageStore, useVoiceStore } from '@/lib/store';
import useSpeechSynthesis from '@/hooks/useSpeechSynthesis';
import { authAPI, gradeScalesAPI, devicesAPI, academicYearsAPI, driveAdminAPI, googleDriveAPI, aiAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog, { useConfirm } from '@/components/ConfirmDialog';
import UserAvatar from '@/components/UserAvatar';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import { formatDate, formatDateTime, formatTime, formatDateRange } from '@/lib/dateUtils';

export default function SettingsPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
    const [saving, setSaving] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' });
    const [notifications, setNotifications] = useState({ emailNotif: true, submissionAlerts: true, gradeAlerts: true, vivaReminders: true });
    const { theme, setTheme } = useThemeStore();
    const { language, setLanguage } = useLanguageStore();
    const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });

    // Grade scales state
    const [gradeScales, setGradeScales] = useState([]);
    const [loadingGrades, setLoadingGrades] = useState(false);
    const [editingGrade, setEditingGrade] = useState(null);
    const [newGrade, setNewGrade] = useState({ gradeLetter: '', gradePoint: '', minPercentage: '', maxPercentage: '', description: '' });
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Grade scale filters
    const [gradeFilter, setGradeFilter] = useState('all'); // all, active, inactive
    const [dateFilter, setDateFilter] = useState(''); // empty = all dates
    const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest, grade

    // Device testing state
    const [cameraPermission, setCameraPermission] = useState('unknown'); // unknown, granted, denied, testing
    const [micPermission, setMicPermission] = useState('unknown');
    const [speakerPermission, setSpeakerPermission] = useState('unknown');
    const [testStream, setTestStream] = useState(null);
    const [availableCameras, setAvailableCameras] = useState([]);
    const [availableMics, setAvailableMics] = useState([]);
    const [availableSpeakers, setAvailableSpeakers] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');
    const [selectedMic, setSelectedMic] = useState('');
    const [selectedSpeaker, setSelectedSpeaker] = useState('');
    const [micLevel, setMicLevel] = useState(0);
    const [speakerVolume, setSpeakerVolume] = useState(80);
    const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
    const [lastCameraCheck, setLastCameraCheck] = useState(null);
    const [lastMicCheck, setLastMicCheck] = useState(null);
    const [lastSpeakerCheck, setLastSpeakerCheck] = useState(null);
    const [audioContextRef, setAudioContextRef] = useState(null);
    const [analyserRef, setAnalyserRef] = useState(null);
    const [animationFrameRef, setAnimationFrameRef] = useState(null);

    // Video element ref to prevent flickering
    const videoRef = useRef(null);

    // Academic Sessions state
    const [sessionsList, setSessionsList] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [savingSession, setSavingSession] = useState(false);
    const [showCreateSession, setShowCreateSession] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [newSession, setNewSession] = useState({
        startDate: `${new Date().getFullYear()}-04-01`
    });

    // Cloud Storage & Drives state
    const [driveConfigs, setDriveConfigs] = useState({
        google: { clientId: '', clientSecret: '', rootFolderId: '', isConfigured: false },
        onedrive: { clientId: '', clientSecret: '', tenantId: 'common', isConfigured: false },
        dropbox: { appKey: '', appSecret: '', isConfigured: false },
        s3: { bucket: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '', endpoint: '', isConfigured: false },
        icloud: { appleId: '', appSpecificPassword: '', serverUrl: '', isConfigured: false }
    });
    const [connectedDriveAccounts, setConnectedDriveAccounts] = useState([]);
    const [loadingDriveSettings, setLoadingDriveSettings] = useState(false);
    const [savingDriveProvider, setSavingDriveProvider] = useState(null);
    const [copiedUrlKey, setCopiedUrlKey] = useState(null);
    const [showSecrets, setShowSecrets] = useState({});
    const [systemCallbackUrls, setSystemCallbackUrls] = useState({
        google: 'http://localhost:5001/api/drive/auth/callback',
        onedrive: 'http://localhost:5001/api/drive/auth/callback/onedrive',
        dropbox: 'http://localhost:5001/api/drive/auth/callback/dropbox'
    });

    // AI Teacher Voice state & persistence
    const {
        voiceProfile,
        voiceName,
        rate: storeRate,
        pitch: storePitch,
        volume: storeVolume,
        autoReadAiResponses,
        updateVoiceSettings
    } = useVoiceStore();

    const [selectedVoiceProfile, setSelectedVoiceProfile] = useState(voiceProfile || 'samantha');
    const [selectedVoiceName, setSelectedVoiceName] = useState(voiceName || '');
    const [voiceRate, setVoiceRate] = useState(storeRate || 1.0);
    const [voicePitch, setVoicePitch] = useState(storePitch || 1.0);
    const [voiceVolume, setVoiceVolume] = useState(storeVolume !== undefined ? storeVolume : 1.0);
    const [autoReadVoice, setAutoReadVoice] = useState(autoReadAiResponses !== undefined ? autoReadAiResponses : true);

    const [testPhrase, setTestPhrase] = useState(
        'Hello! I am your AI Whiteboard Teacher. In thermodynamics, energy can neither be created nor destroyed, only transformed from one form to another.'
    );
    const [playingSampleUrl, setPlayingSampleUrl] = useState(null);
    const sampleAudioRef = useRef(null);

    // Live speech synthesis hook for voice studio
    const {
        voices: systemVoices,
        isSpeaking: isTtsSpeaking,
        speak: speakTts,
        stop: stopTts
    } = useSpeechSynthesis();

    useEffect(() => {
        if (voiceProfile) setSelectedVoiceProfile(voiceProfile);
        if (voiceName) setSelectedVoiceName(voiceName);
        if (storeRate !== undefined) setVoiceRate(storeRate);
        if (storePitch !== undefined) setVoicePitch(storePitch);
        if (storeVolume !== undefined) setVoiceVolume(storeVolume);
        if (autoReadAiResponses !== undefined) setAutoReadVoice(autoReadAiResponses);
    }, [voiceProfile, voiceName, storeRate, storePitch, storeVolume, autoReadAiResponses]);

    const handleSaveVoiceSettings = () => {
        updateVoiceSettings({
            voiceProfile: selectedVoiceProfile,
            voiceName: selectedVoiceName,
            rate: voiceRate,
            pitch: voicePitch,
            volume: voiceVolume,
            autoReadAiResponses: autoReadVoice
        });
        toast.success('AI Teacher Voice settings saved successfully!');
    };

    const handlePlayStudioSample = (url) => {
        if (playingSampleUrl === url) {
            if (sampleAudioRef.current) {
                sampleAudioRef.current.pause();
                sampleAudioRef.current.currentTime = 0;
            }
            setPlayingSampleUrl(null);
            return;
        }

        if (sampleAudioRef.current) {
            sampleAudioRef.current.pause();
        }

        const audio = new Audio(url);
        sampleAudioRef.current = audio;
        setPlayingSampleUrl(url);

        audio.onended = () => {
            setPlayingSampleUrl(null);
        };
        audio.onerror = () => {
            toast.error('Unable to play audio sample');
            setPlayingSampleUrl(null);
        };

        audio.play().catch(() => {
            setPlayingSampleUrl(null);
        });
    };

    const handleTestLiveSpeech = () => {
        if (isTtsSpeaking) {
            stopTts();
            return;
        }

        let matchedVoice = null;
        if (selectedVoiceName && systemVoices) {
            matchedVoice = systemVoices.find(v => v.name.toLowerCase() === selectedVoiceName.toLowerCase());
        }

        speakTts(testPhrase, {
            voice: matchedVoice,
            rate: voiceRate,
            pitch: voicePitch,
            volume: voiceVolume
        });
    };

    // AI Models & Paid Providers state
    const [aiConfigs, setAiConfigs] = useState({
        preferredProvider: 'auto',
        providers: {}
    });
    const [aiKeysInput, setAiKeysInput] = useState({
        openaiApiKey: '',
        anthropicApiKey: '',
        deepseekApiKey: '',
        openrouterApiKey: '',
        geminiApiKey: '',
        groqApiKey: '',
        sambanovaApiKey: '',
        preferredProvider: 'auto'
    });
    const [loadingAiSettings, setLoadingAiSettings] = useState(false);
    const [savingAiSettings, setSavingAiSettings] = useState(false);
    const [testingProvider, setTestingProvider] = useState(null);
    const [testResults, setTestResults] = useState({});
    const [showAiSecrets, setShowAiSecrets] = useState({});

    const loadAiSettings = async () => {
        try {
            setLoadingAiSettings(true);
            const res = await aiAPI.getConfig();
            if (res.data?.success && res.data?.data) {
                const data = res.data.data;
                setAiConfigs(data);
                const provs = data.providers || {};
                setAiKeysInput({
                    openaiApiKey: provs.openai?.maskedKey || '',
                    anthropicApiKey: provs.anthropic?.maskedKey || '',
                    deepseekApiKey: provs.deepseek?.maskedKey || '',
                    openrouterApiKey: provs.openrouter?.maskedKey || '',
                    geminiApiKey: provs.gemini?.maskedKey || '',
                    groqApiKey: provs.groq?.maskedKey || '',
                    sambanovaApiKey: provs.sambanova?.maskedKey || '',
                    preferredProvider: data.preferredProvider || 'auto'
                });
            }
        } catch (err) {
            console.warn('Failed to load AI settings:', err.message);
        } finally {
            setLoadingAiSettings(false);
        }
    };

    const handleSaveAiSettings = async () => {
        try {
            setSavingAiSettings(true);
            const res = await aiAPI.saveConfig(aiKeysInput);
            if (res.data?.success) {
                toast.success('AI configurations saved and active!', { icon: '🤖' });
                await loadAiSettings();
            }
        } catch (err) {
            console.error('Failed to save AI config:', err);
            toast.error(err.response?.data?.message || 'Failed to save AI configuration');
        } finally {
            setSavingAiSettings(false);
        }
    };

    const handleTestProvider = async (providerKey) => {
        const keyFieldMap = {
            openai: 'openaiApiKey',
            anthropic: 'anthropicApiKey',
            deepseek: 'deepseekApiKey',
            openrouter: 'openrouterApiKey',
            gemini: 'geminiApiKey',
            groq: 'groqApiKey',
            sambanova: 'sambanovaApiKey'
        };

        const fieldName = keyFieldMap[providerKey];
        const rawInputVal = (aiKeysInput[fieldName] || '').trim();
        const isServerConfigured = Boolean(aiConfigs?.providers?.[providerKey]?.configured);
        const isMaskedVal = rawInputVal.includes('••••') || rawInputVal.includes('***');

        // Validation: If no key is entered in the input field AND server does not already have a configured key
        if ((!rawInputVal || (!isMaskedVal && rawInputVal.length < 5)) && !isServerConfigured) {
            const providerTitle = providerKey.toUpperCase();
            toast.error(`Please enter an API key for ${providerTitle} before testing.`, { icon: '⚠️' });
            setTestResults(prev => ({
                ...prev,
                [providerKey]: {
                    status: 'error',
                    message: `API key for ${providerTitle} is not entered. Please type or paste your key first.`
                }
            }));
            return;
        }

        try {
            setTestingProvider(providerKey);
            // Send the raw input key if it is not a masked string, so testing works immediately before saving!
            const apiKeyToSend = (!isMaskedVal && rawInputVal) ? rawInputVal : undefined;
            const res = await aiAPI.testProvider({
                provider: providerKey,
                apiKey: apiKeyToSend
            });

            if (res.data?.success) {
                setTestResults(prev => ({
                    ...prev,
                    [providerKey]: {
                        status: 'success',
                        message: res.data.message || `Connected to ${res.data.model}!`,
                        latency: res.data.latencyMs,
                        model: res.data.model
                    }
                }));
                toast.success(`${providerKey.toUpperCase()} verified with ${res.data.model}! (${res.data.latencyMs}ms)`, { icon: '✅' });
            }
        } catch (err) {
            const isQuota = Boolean(err.response?.data?.quotaExhausted);
            const msg = err.response?.data?.message || err.message;
            setTestResults(prev => ({
                ...prev,
                [providerKey]: {
                    status: isQuota ? 'quota_exhausted' : 'error',
                    message: msg
                }
            }));
            if (isQuota) {
                toast.error(`⚠️ ${providerKey.toUpperCase()} Quota Exhausted: ${msg}`, { duration: 6000 });
            } else {
                toast.error(`❌ ${providerKey.toUpperCase()} Test Failed: ${msg}`, { duration: 6000 });
            }
        } finally {
            setTestingProvider(null);
        }
    };

    useEffect(() => {
        return () => {
            if (sampleAudioRef.current) {
                sampleAudioRef.current.pause();
            }
        };
    }, []);

    const isAdmin = user?.role === 'admin' || user?.role === 'principal';

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (user) {
            setProfile({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', phone: user.phone || '' });
        }
        setLoading(false);
    }, [isAuthenticated, user, _hasHydrated]);

    useEffect(() => {
        if (activeTab === 'grading' && isAdmin) {
            loadGradeScales();
        }
        if (activeTab === 'sessions' && isAdmin) {
            loadSessionsList();
        }
        if (activeTab === 'cloud_drives' && isAdmin) {
            loadCloudDriveSettings();
        }
        if (activeTab === 'ai' && isAdmin) {
            loadAiSettings();
        }
    }, [activeTab, isAdmin]);

    // Load device test status from database
    useEffect(() => {
        if (activeTab === 'devices' && isAuthenticated) {
            loadDeviceTestStatus();
        }
    }, [activeTab, isAuthenticated]);

    const loadDeviceTestStatus = async () => {
        try {
            const res = await devicesAPI.getTestStatus();
            const deviceTest = res.data.data.deviceTest;
            if (deviceTest) {
                if (deviceTest.cameraStatus) {
                    setCameraPermission(deviceTest.cameraStatus);
                    setLastCameraCheck(deviceTest.cameraTestedAt ? new Date(deviceTest.cameraTestedAt) : null);
                }
                if (deviceTest.micStatus) {
                    setMicPermission(deviceTest.micStatus);
                    setLastMicCheck(deviceTest.micTestedAt ? new Date(deviceTest.micTestedAt) : null);
                }
                if (deviceTest.speakerStatus) {
                    setSpeakerPermission(deviceTest.speakerStatus);
                    setLastSpeakerCheck(deviceTest.speakerTestedAt ? new Date(deviceTest.speakerTestedAt) : null);
                    if (deviceTest.speakerVolume) setSpeakerVolume(deviceTest.speakerVolume);
                }
            }
        } catch (error) {
            console.error('Failed to load device test status:', error);
        }
    };

    // Cleanup camera/mic stream when leaving devices tab or component
    useEffect(() => {
        return () => {
            if (testStream) {
                testStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [testStream]);

    // Stop stream when switching away from devices tab
    useEffect(() => {
        if (activeTab !== 'devices' && testStream) {
            testStream.getTracks().forEach(track => track.stop());
            setTestStream(null);
            setCameraPermission('unknown');
            setMicPermission('unknown');
            setMicLevel(0);
        }
    }, [activeTab]);

    // Set video srcObject only when stream changes (prevents flickering)
    useEffect(() => {
        if (videoRef.current && testStream) {
            videoRef.current.srcObject = testStream;
            videoRef.current.play().catch(e => console.log('Video play error:', e));
        }
    }, [testStream]);

    const loadGradeScales = async () => {
        setLoadingGrades(true);
        try {
            const res = await gradeScalesAPI.getAllIncludingInactive();
            setGradeScales(res.data.data.gradeScales || []);
        } catch (error) {
            console.error('Error loading grade scales:', error);
        } finally {
            setLoadingGrades(false);
        }
    };

    // Get unique creation dates for filter dropdown
    const uniqueDates = useMemo(() => {
        const dates = [...new Set(gradeScales.map(g => formatDate(g.createdAt)))];
        return dates.sort((a, b) => new Date(b) - new Date(a));
    }, [gradeScales]);

    // Filter and sort grade scales
    const filteredGradeScales = useMemo(() => {
        let filtered = [...gradeScales];

        // Apply status filter
        if (gradeFilter === 'active') {
            filtered = filtered.filter(g => g.isActive);
        } else if (gradeFilter === 'inactive') {
            filtered = filtered.filter(g => !g.isActive);
        }

        // Apply date filter
        if (dateFilter) {
            filtered = filtered.filter(g => formatDate(g.createdAt) === dateFilter);
        }

        // Apply sorting
        if (sortOrder === 'newest') {
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortOrder === 'oldest') {
            filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sortOrder === 'grade') {
            filtered.sort((a, b) => parseFloat(b.gradePoint) - parseFloat(a.gradePoint));
        }

        return filtered;
    }, [gradeScales, gradeFilter, dateFilter, sortOrder]);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await authAPI.updateProfile({
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone
            });

            // Update local user state
            const updatedUser = res.data.data.user;
            useAuthStore.getState().setAuth(
                { ...user, ...updatedUser },
                useAuthStore.getState().accessToken,
                useAuthStore.getState().refreshToken
            );

            toast.success('Profile updated successfully!');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to update profile');
        }
        finally { setSaving(false); }
    };

    const handleChangePassword = async () => {
        if (passwords.newPass !== passwords.confirm) { toast.error('Passwords do not match'); return; }
        if (passwords.newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setSaving(true);
        try {
            await authAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
            toast.success('Password changed successfully!');
            setPasswords({ current: '', newPass: '', confirm: '' });
        } catch (e) { toast.error(e.response?.data?.message || 'Failed to change password'); }
        finally { setSaving(false); }
    };

    const handleSaveGradeScale = async () => {
        if (!newGrade.gradeLetter || !newGrade.gradePoint || !newGrade.minPercentage || !newGrade.maxPercentage) {
            toast.error('Please fill all required fields');
            return;
        }
        setSaving(true);
        try {
            await gradeScalesAPI.create({
                gradeLetter: newGrade.gradeLetter,
                gradePoint: parseFloat(newGrade.gradePoint),
                minPercentage: parseInt(newGrade.minPercentage),
                maxPercentage: parseInt(newGrade.maxPercentage),
                description: newGrade.description
            });
            toast.success('Grade scale saved');
            setNewGrade({ gradeLetter: '', gradePoint: '', minPercentage: '', maxPercentage: '', description: '' });
            loadGradeScales();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save grade scale');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGradeScale = async (id) => {
        try {
            await gradeScalesAPI.delete(id);
            toast.success('Grade scale removed');
            loadGradeScales();
        } catch (error) {
            toast.error('Failed to delete grade scale');
        }
    };

    const handleResetGradeScales = async () => {
        try {
            await gradeScalesAPI.reset();
            toast.success('Grade scales reset to default');
            loadGradeScales();
            setShowResetConfirm(false);
        } catch (error) {
            toast.error('Failed to reset grade scales');
        }
    };

    // --- Academic Sessions Handlers ---
    const loadSessionsList = async () => {
        setLoadingSessions(true);
        try {
            const res = await academicYearsAPI.getAll();
            setSessionsList(res.data.data.academicYears || []);
        } catch (error) {
            console.error('Error loading sessions:', error);
            toast.error('Failed to load academic sessions');
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleCreateSession = async () => {
        setSavingSession(true);
        try {
            await academicYearsAPI.create({
                startDate: newSession.startDate
            });
            toast.success('Academic session created!');
            setShowCreateSession(false);
            setNewSession({ startDate: `${new Date().getFullYear()}-04-01` });
            loadSessionsList();
            // Trigger global session selector refresh
            if (typeof window !== 'undefined' && window.__refreshSessions) {
                window.__refreshSessions();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create session');
        } finally {
            setSavingSession(false);
        }
    };

    const handleUpdateSession = async (id) => {
        if (!editingSession) return;
        setSavingSession(true);
        try {
            await academicYearsAPI.update(id, {
                startDate: editingSession.startDate
            });
            toast.success('Session updated!');
            setEditingSession(null);
            loadSessionsList();
            if (typeof window !== 'undefined' && window.__refreshSessions) {
                window.__refreshSessions();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update session');
        } finally {
            setSavingSession(false);
        }
    };

    const handleDeleteSession = async (id) => {
        const ok = await confirm({
            title: 'Delete Academic Session?',
            message: 'Are you sure you want to permanently delete this academic session? Associated class & assignment filters may be impacted.',
            confirmText: 'Delete Session',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;

        try {
            await academicYearsAPI.delete(id);
            toast.success('Session deleted');
            loadSessionsList();
            if (typeof window !== 'undefined' && window.__refreshSessions) {
                window.__refreshSessions();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete session');
        }
    };

    const handleSetCurrentSession = async (id) => {
        try {
            await academicYearsAPI.setCurrent(id);
            toast.success('Session set as current');
            loadSessionsList();
            if (typeof window !== 'undefined' && window.__refreshSessions) {
                window.__refreshSessions();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to set current session');
        }
    };

    // Compute preview for new session
    const sessionPreview = useMemo(() => {
        if (!newSession.startDate) return null;
        const start = new Date(newSession.startDate);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        return {
            yearLabel: `${startYear}-${String(endYear).slice(-2)}`,
            startDate: formatDate(start),
            endDate: formatDate(end)
        };
    }, [newSession.startDate]);

    // --- Cloud Storage & Drives Handlers ---
    const loadCloudDriveSettings = async () => {
        setLoadingDriveSettings(true);
        try {
            const [configsRes, accountsRes] = await Promise.all([
                driveAdminAPI.getConfigs().catch(e => ({ data: null })),
                driveAdminAPI.getAccounts().catch(e => ({ data: null }))
            ]);
            if (configsRes?.data?.data) {
                const { configs, callbackUrls, systemCallbackUrl } = configsRes.data.data;
                if (configs) {
                    setDriveConfigs(prev => ({
                        google: {
                            ...prev.google,
                            ...(configs.google || configs.google_drive || {}),
                            rootFolderId: configs.google?.rootFolderId || configs.google?.folderId || configs.google_drive?.rootFolderId || configs.google_drive?.folderId || prev.google.rootFolderId || ''
                        },
                        onedrive: { ...prev.onedrive, ...(configs.onedrive || configs.microsoft_onedrive || {}) },
                        dropbox: { ...prev.dropbox, ...(configs.dropbox || {}) },
                        s3: { ...prev.s3, ...(configs.s3 || configs.aws_s3 || {}) },
                        icloud: {
                            ...prev.icloud,
                            ...(configs.icloud || configs.apple_icloud || {}),
                            appSpecificPassword: configs.icloud?.appSpecificPassword || configs.icloud?.appPassword || configs.apple_icloud?.appSpecificPassword || configs.apple_icloud?.appPassword || prev.icloud.appSpecificPassword || '',
                            serverUrl: configs.icloud?.serverUrl || configs.icloud?.webdavUrl || configs.apple_icloud?.serverUrl || configs.apple_icloud?.webdavUrl || prev.icloud.serverUrl || ''
                        },
                    }));
                }
                if (callbackUrls) {
                    setSystemCallbackUrls(callbackUrls);
                } else if (systemCallbackUrl) {
                    setSystemCallbackUrls({
                        google: systemCallbackUrl,
                        onedrive: systemCallbackUrl.replace('/api/drive/auth/callback', '/api/drive/auth/callback/onedrive'),
                        dropbox: systemCallbackUrl.replace('/api/drive/auth/callback', '/api/drive/auth/callback/dropbox')
                    });
                }
            }
            if (accountsRes?.data?.data?.accounts) {
                setConnectedDriveAccounts(accountsRes.data.data.accounts);
            }
        } catch (error) {
            console.error('Failed to load cloud drive settings:', error);
            toast.error('Failed to load cloud drive configurations');
        } finally {
            setLoadingDriveSettings(false);
        }
    };

    const handleSaveDriveConfig = async (provider) => {
        setSavingDriveProvider(provider);
        try {
            const res = await driveAdminAPI.saveConfig({
                provider,
                data: driveConfigs[provider]
            });
            toast.success(res.data?.message || `${provider.toUpperCase()} credentials saved successfully!`);
            await loadCloudDriveSettings();
        } catch (error) {
            console.error(`Failed to save ${provider} config:`, error);
            toast.error(error.response?.data?.message || `Failed to save ${provider} credentials`);
        } finally {
            setSavingDriveProvider(null);
        }
    };

    const handleDisconnectDriveAccount = async (accountId, providerName) => {
        const ok = await confirm({
            title: `Disconnect ${providerName || 'Drive'} Account?`,
            message: `Are you sure you want to disconnect this account (${accountId})? Cloud sync and file imports will require re-authorization.`,
            confirmText: 'Disconnect Account',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;

        try {
            await driveAdminAPI.disconnectAccount(accountId);
            toast.success(`Account ${accountId} disconnected`);
            setConnectedDriveAccounts(prev => (prev || []).filter(a => 
                a.id !== accountId && 
                a.email !== accountId && 
                a.accountId !== accountId &&
                (!accountId.includes('@') || a.email?.toLowerCase() !== accountId.toLowerCase())
            ));
            await loadCloudDriveSettings();
        } catch (error) {
            console.error('Failed to disconnect drive account:', error);
            toast.error(error.response?.data?.message || 'Failed to disconnect account');
        }
    };

    const copyToClipboard = (text, key) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedUrlKey(key);
        toast.success('Redirect URI copied to clipboard!');
        setTimeout(() => setCopiedUrlKey(null), 2500);
    };

    const handleSwitchDriveAccount = async (accountIdOrEmail) => {
        const toastId = toast.loading(`Switching active drive to ${accountIdOrEmail}...`);
        try {
            const res = await driveAdminAPI.switchAccount(accountIdOrEmail);
            if (res.data?.requiresAuth) {
                toast.dismiss(toastId);
                if (res.data.authUrl) {
                    toast(`Redirecting to Google to authorize ${accountIdOrEmail}...`, { icon: '🔐' });
                    window.location.href = res.data.authUrl;
                } else {
                    handleConnectCloudOAuth('google', accountIdOrEmail);
                }
                return;
            }
            toast.success(res.data?.message || `Active drive switched to ${accountIdOrEmail}!`, { id: toastId });
            await loadCloudDriveSettings();
        } catch (error) {
            console.error('Failed to switch drive account:', error);
            const errData = error.response?.data;
            if (errData?.requiresAuth) {
                toast.dismiss(toastId);
                if (errData.authUrl) {
                    toast(`Redirecting to authorize ${accountIdOrEmail}...`, { icon: '🔐' });
                    window.location.href = errData.authUrl;
                } else {
                    handleConnectCloudOAuth('google', accountIdOrEmail);
                }
                return;
            }
            if (errData?.provider && errData.provider !== 'google') {
                toast.error(errData.message || 'Cannot switch non-Google provider via Google OAuth', { id: toastId, duration: 6000 });
                return;
            }
            const isGoogleTarget = String(accountIdOrEmail).toLowerCase().includes('gmail.com') || String(accountIdOrEmail).toLowerCase().includes('google');
            if ((errData?.message?.includes('not authorized') || errData?.message?.includes('OAuth')) && isGoogleTarget) {
                toast.dismiss(toastId);
                toast(`Redirecting to Google to authorize ${accountIdOrEmail}...`, { icon: '🔐' });
                try {
                    const authRes = await googleDriveAPI.getAuthUrl({ prompt: 'select_account consent', login_hint: accountIdOrEmail });
                    if (authRes.data?.data?.authUrl) {
                        window.location.href = authRes.data.data.authUrl;
                        return;
                    }
                } catch (e) {}
            }
            toast.error(errData?.message || 'Failed to switch drive account', { id: toastId });
        }
    };

    const handleConnectNewGoogleAccount = async () => {
        try {
            const returnTo = typeof window !== 'undefined' ? window.location.origin : undefined;
            const res = await googleDriveAPI.getAuthUrl({ prompt: 'select_account consent', returnTo });
            if (res.data?.data?.authUrl) {
                window.location.href = res.data.data.authUrl;
            } else {
                toast.error('Please configure Google OAuth Client ID and Secret below first!');
            }
        } catch (err) {
            toast.error('Google OAuth credentials not configured. Please save Client ID & Secret below.');
        }
    };

    const tabs = [
        { id: 'profile', icon: User, label: 'Profile' },
        { id: 'devices', icon: Video, label: 'Devices' },
        { id: 'voice', icon: Volume2, label: 'AI Teacher Voice' },
        { id: 'notifications', icon: Bell, label: 'Notifications' },
        { id: 'appearance', icon: Palette, label: 'Appearance' },
        { id: 'security', icon: Shield, label: 'Security' },
        ...(isAdmin ? [
            { id: 'cloud_drives', icon: Cloud, label: 'Cloud Storage & Drives' },
            { id: 'sessions', icon: Calendar, label: 'Sessions' },
            { id: 'grading', icon: GraduationCap, label: 'Grading' },
            { id: 'database', icon: SettingsIcon, label: 'SQL Console' },
            { id: 'ai', icon: Sparkles, label: 'AI Models & API Keys' }
        ] : [])
    ];

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader title="Settings" showNotifications={false} />
            <main className="max-w-5xl mx-auto px-4 py-6">
                <div className="grid md:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <div className="md:col-span-1">
                        <div className="card p-2 space-y-1">
                            {tabs.map((tab) => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <tab.icon className="w-5 h-5" />{tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="md:col-span-3">
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                {/* Profile Avatar Card */}
                                <div className="card p-6 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                                        <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                                            <div className="p-1 rounded-full bg-white dark:bg-slate-800 shadow-lg ring-4 ring-indigo-500/20 group-hover:ring-indigo-500 transition">
                                                <UserAvatar user={user} size="2xl" />
                                            </div>
                                            <div className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-full">
                                                <User className="w-5 h-5 mb-1" />
                                                <span className="text-[10px] font-bold">Edit</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 text-center sm:text-left">
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                                    {user?.firstName} {user?.lastName}
                                                </h2>
                                                <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                                                    {user?.role?.replace('_', ' ')}
                                                </span>
                                                {(user?.studentId || user?.admissionNumber) && (
                                                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                                                        Student ID: {user.studentId || user.admissionNumber}
                                                    </span>
                                                )}
                                                {user?.employeeId && (
                                                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        Emp ID: {user.employeeId}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                Choose from live-animating characters, faculty scholars, or upload a custom photo to personalize your profile.
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAvatarModal(true)}
                                                    className="btn btn-sm btn-primary flex items-center gap-1.5 shadow-sm text-xs"
                                                >
                                                    <User className="w-3.5 h-3.5" />
                                                    Change Avatar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Profile Information Card */}
                                <div className="card p-6">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Profile Information</h2>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div><label className="label">First Name</label><input type="text" className="input" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} /></div>
                                        <div><label className="label">Last Name</label><input type="text" className="input" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} /></div>
                                        <div><label className="label">Email</label><input type="email" className="input" value={profile.email} disabled /></div>
                                        <div><label className="label">Phone</label><input type="tel" className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
                                        {(user?.studentId || user?.admissionNumber || user?.employeeId) && (
                                            <div className="md:col-span-2 p-3.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        {user?.role === 'student' ? 'Student ID / Admission Number' : 'Institutional Employee ID'}
                                                    </label>
                                                    <p className="text-sm font-mono font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                                                        {user?.studentId || user?.admissionNumber || user?.employeeId}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-slate-500 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm font-medium">
                                                    Institutional Identifier
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4"><button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}</button></div>
                                </div>

                                <AvatarPickerModal
                                    isOpen={showAvatarModal}
                                    onClose={() => setShowAvatarModal(false)}
                                    onAvatarUpdated={() => {}}
                                />
                            </div>
                        )}

                        {activeTab === 'devices' && (
                            <div className="space-y-6">
                                {/* Instructions Banner */}
                                <div className="card p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                                    <div className="flex items-start gap-3">
                                        <Video className="w-6 h-6 mt-0.5" />
                                        <div>
                                            <h3 className="font-semibold">Camera, Microphone & Speaker Setup</h3>
                                            <p className="text-sm mt-1 text-white/80">
                                                Test your devices here before joining a viva session.
                                                This ensures everything is working properly.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Permission Status Cards */}
                                <div className="card p-6">
                                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Device Status</h2>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        {/* Camera Status */}
                                        <div className={`p-4 rounded-xl border-2 ${cameraPermission === 'granted' ? 'border-emerald-500 bg-emerald-50' : cameraPermission === 'denied' ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                                            <div className="flex items-center gap-3">
                                                {cameraPermission === 'granted' ? <CheckCircle className="w-8 h-8 text-emerald-500" /> :
                                                    cameraPermission === 'denied' ? <XCircle className="w-8 h-8 text-red-500" /> :
                                                        <Video className="w-8 h-8 text-slate-400" />}
                                                <div className="flex-1">
                                                    <p className="font-medium">Camera</p>
                                                    <p className={`text-sm ${cameraPermission === 'granted' ? 'text-emerald-600' : cameraPermission === 'denied' ? 'text-red-600' : 'text-slate-500'}`}>
                                                        {cameraPermission === 'granted' ? '✓ Working' : cameraPermission === 'denied' ? '✗ Blocked' : 'Not tested'}
                                                    </p>
                                                    {lastCameraCheck && (
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            Last: {formatTime(lastCameraCheck)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mic Status */}
                                        <div className={`p-4 rounded-xl border-2 ${micPermission === 'granted' ? 'border-emerald-500 bg-emerald-50' : micPermission === 'denied' ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                                            <div className="flex items-center gap-3">
                                                {micPermission === 'granted' ? <CheckCircle className="w-8 h-8 text-emerald-500" /> :
                                                    micPermission === 'denied' ? <XCircle className="w-8 h-8 text-red-500" /> :
                                                        <Mic className="w-8 h-8 text-slate-400" />}
                                                <div className="flex-1">
                                                    <p className="font-medium">Microphone</p>
                                                    <p className={`text-sm ${micPermission === 'granted' ? 'text-emerald-600' : micPermission === 'denied' ? 'text-red-600' : 'text-slate-500'}`}>
                                                        {micPermission === 'granted' ? '✓ Working' : micPermission === 'denied' ? '✗ Blocked' : 'Not tested'}
                                                    </p>
                                                    {lastMicCheck && (
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            Last: {formatTime(lastMicCheck)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Speaker Status */}
                                        <div className={`p-4 rounded-xl border-2 ${speakerPermission === 'granted' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                                            <div className="flex items-center gap-3">
                                                {speakerPermission === 'granted' ? <CheckCircle className="w-8 h-8 text-emerald-500" /> :
                                                    <Volume2 className="w-8 h-8 text-slate-400" />}
                                                <div className="flex-1">
                                                    <p className="font-medium">Speakers</p>
                                                    <p className={`text-sm ${speakerPermission === 'granted' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                        {speakerPermission === 'granted' ? '✓ Tested' : 'Not tested'}
                                                    </p>
                                                    {lastSpeakerCheck && (
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            Last: {formatTime(lastSpeakerCheck)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setCameraPermission('testing');
                                                    setMicPermission('testing');

                                                    // Stop existing stream
                                                    if (testStream) {
                                                        testStream.getTracks().forEach(t => t.stop());
                                                    }
                                                    if (animationFrameRef) {
                                                        cancelAnimationFrame(animationFrameRef);
                                                    }
                                                    if (audioContextRef) {
                                                        audioContextRef.close();
                                                    }

                                                    // Request permissions with specific constraints
                                                    const stream = await navigator.mediaDevices.getUserMedia({
                                                        video: { width: { ideal: 640 }, height: { ideal: 480 } },
                                                        audio: { echoCancellation: true, noiseSuppression: true }
                                                    });

                                                    // Get available devices
                                                    const devices = await navigator.mediaDevices.enumerateDevices();
                                                    setAvailableCameras(devices.filter(d => d.kind === 'videoinput'));
                                                    setAvailableMics(devices.filter(d => d.kind === 'audioinput'));
                                                    setAvailableSpeakers(devices.filter(d => d.kind === 'audiooutput'));

                                                    setTestStream(stream);
                                                    setCameraPermission('granted');
                                                    setMicPermission('granted');
                                                    setLastCameraCheck(new Date());
                                                    setLastMicCheck(new Date());
                                                    toast.success('Camera and microphone access granted!');

                                                    // Save test results to database
                                                    const selectedCam = devices.find(d => d.kind === 'videoinput');
                                                    const selectedMicDevice = devices.find(d => d.kind === 'audioinput');
                                                    try {
                                                        await devicesAPI.testAll({
                                                            cameraStatus: 'granted',
                                                            cameraDeviceId: selectedCam?.deviceId,
                                                            cameraDeviceName: selectedCam?.label,
                                                            micStatus: 'granted',
                                                            micDeviceId: selectedMicDevice?.deviceId,
                                                            micDeviceName: selectedMicDevice?.label
                                                        });
                                                    } catch (e) {
                                                        console.error('Failed to save device test:', e);
                                                    }

                                                    // Setup audio analysis for mic level
                                                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                                                    const analyser = audioCtx.createAnalyser();
                                                    const source = audioCtx.createMediaStreamSource(stream);
                                                    source.connect(analyser);
                                                    analyser.fftSize = 512;
                                                    analyser.smoothingTimeConstant = 0.8;

                                                    setAudioContextRef(audioCtx);
                                                    setAnalyserRef(analyser);

                                                    const dataArray = new Uint8Array(analyser.frequencyBinCount);

                                                    const updateLevel = () => {
                                                        if (!stream.active) return;
                                                        analyser.getByteFrequencyData(dataArray);
                                                        // Get average of lower frequencies (voice range)
                                                        const voiceRange = dataArray.slice(0, 64);
                                                        const sum = voiceRange.reduce((a, b) => a + b, 0);
                                                        const avg = sum / voiceRange.length;
                                                        // Scale to 0-100
                                                        const level = Math.min(100, Math.round(avg * 0.8));
                                                        setMicLevel(level);
                                                        const frameId = requestAnimationFrame(updateLevel);
                                                        setAnimationFrameRef(frameId);
                                                    };
                                                    updateLevel();

                                                } catch (error) {
                                                    console.error('Permission error:', error);
                                                    setCameraPermission('denied');
                                                    setMicPermission('denied');
                                                    setLastCameraCheck(new Date());
                                                    setLastMicCheck(new Date());

                                                    // Check if the issue is due to insecure context (HTTP on mobile)
                                                    const isSecure = window.isSecureContext;
                                                    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

                                                    if (!isSecure && !isLocalhost) {
                                                        toast.error(
                                                            '🔒 HTTPS Required: Mobile browsers require a secure connection (HTTPS) to access camera/microphone. See troubleshooting below.',
                                                            { duration: 8000 }
                                                        );
                                                    } else if (error.name === 'NotAllowedError') {
                                                        toast.error('Permission denied. Please allow camera/mic in browser settings.');
                                                    } else if (error.name === 'NotFoundError') {
                                                        toast.error('No camera or microphone found.');
                                                    } else if (error.name === 'NotReadableError') {
                                                        toast.error('Camera/mic is in use by another app. Please close other apps and try again.');
                                                    } else {
                                                        toast.error('Failed to access devices: ' + error.message);
                                                    }
                                                }
                                            }}
                                            disabled={cameraPermission === 'testing'}
                                            className="btn btn-primary"
                                        >
                                            {cameraPermission === 'testing' ? (
                                                <>
                                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                    Testing...
                                                </>
                                            ) : (
                                                <>
                                                    <Video className="w-4 h-4" />
                                                    Test Camera & Microphone
                                                </>
                                            )}
                                        </button>

                                        {testStream && (
                                            <button
                                                onClick={() => {
                                                    testStream.getTracks().forEach(track => track.stop());
                                                    setTestStream(null);
                                                    if (animationFrameRef) cancelAnimationFrame(animationFrameRef);
                                                    if (audioContextRef) audioContextRef.close();
                                                    setMicLevel(0);
                                                }}
                                                className="btn btn-secondary"
                                            >
                                                <Square className="w-4 h-4" />
                                                Stop Test
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Camera Preview */}
                                {testStream && (
                                    <div className="card p-6">
                                        <h2 className="text-lg font-semibold text-slate-900 mb-4">📹 Camera Preview</h2>
                                        <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ maxWidth: '640px' }}>
                                            <video
                                                autoPlay
                                                muted
                                                playsInline
                                                ref={videoRef}
                                                className="w-full"
                                                style={{ transform: 'scaleX(-1)', minHeight: '300px' }}
                                            />
                                            <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/50 rounded-full text-white text-sm flex items-center gap-2">
                                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                                Live Preview
                                            </div>
                                        </div>

                                        {availableCameras.length > 1 && (
                                            <div className="mt-4 max-w-md">
                                                <label className="label">Select Camera</label>
                                                <select className="input" value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)}>
                                                    {availableCameras.map((cam, i) => (
                                                        <option key={cam.deviceId} value={cam.deviceId}>
                                                            {cam.label || `Camera ${i + 1}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Microphone Level */}
                                {testStream && (
                                    <div className="card p-6">
                                        <h2 className="text-lg font-semibold text-slate-900 mb-4">🎤 Microphone Level</h2>
                                        <div className="bg-slate-100 rounded-xl p-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <Mic className={`w-8 h-8 ${micLevel > 20 ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                <div className="flex-1">
                                                    <div className="h-8 bg-slate-200 rounded-full overflow-hidden relative">
                                                        <div
                                                            className={`h-full transition-all duration-75 ${micLevel > 70 ? 'bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500' :
                                                                micLevel > 30 ? 'bg-gradient-to-r from-emerald-500 to-yellow-500' :
                                                                    'bg-emerald-500'
                                                                }`}
                                                            style={{ width: `${micLevel}%` }}
                                                        />
                                                        {/* Level markers */}
                                                        <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none">
                                                            {[0, 25, 50, 75, 100].map(mark => (
                                                                <div key={mark} className="w-px h-4 bg-slate-400/50" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-lg font-bold font-mono w-16 text-right">
                                                    {micLevel}%
                                                </span>
                                            </div>
                                            <p className={`text-center text-lg ${micLevel > 10 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                {micLevel > 50 ? '🎉 Great! Your microphone is working perfectly!' :
                                                    micLevel > 10 ? '✅ Microphone detected. Speak louder for better quality.' :
                                                        '🔇 Speak into your microphone to test...'}
                                            </p>
                                        </div>

                                        {availableMics.length > 1 && (
                                            <div className="mt-4 max-w-md">
                                                <label className="label">Select Microphone</label>
                                                <select className="input" value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)}>
                                                    {availableMics.map((mic, i) => (
                                                        <option key={mic.deviceId} value={mic.deviceId}>
                                                            {mic.label || `Microphone ${i + 1}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Speaker Test */}
                                <div className="card p-6">
                                    <h2 className="text-lg font-semibold text-slate-900 mb-4">🔊 Speaker Test</h2>
                                    <div className="bg-slate-100 rounded-xl p-6">
                                        <div className="flex flex-col md:flex-row items-center gap-6">
                                            <div className="flex-1 w-full">
                                                <label className="label mb-2">Speaker Volume</label>
                                                <div className="flex items-center gap-4">
                                                    <Volume2 className="w-6 h-6 text-slate-500" />
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={speakerVolume}
                                                        onChange={(e) => setSpeakerVolume(parseInt(e.target.value))}
                                                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                                    />
                                                    <span className="text-sm font-mono w-12 text-right">{speakerVolume}%</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setIsPlayingTestSound(true);
                                                    // Create audio context and play a test tone
                                                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                                                    const gainNode = audioContext.createGain();
                                                    gainNode.gain.value = speakerVolume / 100;
                                                    gainNode.connect(audioContext.destination);

                                                    // Play a pleasant beep sequence
                                                    const frequencies = [440, 554, 659, 880]; // A4, C#5, E5, A5
                                                    frequencies.forEach((freq, i) => {
                                                        const oscillator = audioContext.createOscillator();
                                                        oscillator.type = 'sine';
                                                        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.2);
                                                        oscillator.connect(gainNode);
                                                        oscillator.start(audioContext.currentTime + i * 0.2);
                                                        oscillator.stop(audioContext.currentTime + i * 0.2 + 0.15);
                                                    });

                                                    setTimeout(async () => {
                                                        setSpeakerPermission('granted');
                                                        setLastSpeakerCheck(new Date());
                                                        setIsPlayingTestSound(false);
                                                        toast.success('Speaker test complete! Did you hear the sound?');

                                                        // Save speaker test to database
                                                        try {
                                                            await devicesAPI.testSpeaker({
                                                                status: 'granted',
                                                                volume: speakerVolume
                                                            });
                                                        } catch (e) {
                                                            console.error('Failed to save speaker test:', e);
                                                        }
                                                    }, 1000);
                                                }}
                                                disabled={isPlayingTestSound}
                                                className="btn btn-primary whitespace-nowrap"
                                            >
                                                {isPlayingTestSound ? (
                                                    <>
                                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                        Playing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4" />
                                                        Play Test Sound
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {availableSpeakers.length > 1 && (
                                            <div className="mt-4 max-w-md">
                                                <label className="label">Select Speaker</label>
                                                <select className="input" value={selectedSpeaker} onChange={(e) => setSelectedSpeaker(e.target.value)}>
                                                    {availableSpeakers.map((spk, i) => (
                                                        <option key={spk.deviceId} value={spk.deviceId}>
                                                            {spk.label || `Speaker ${i + 1}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Troubleshooting Guide */}
                                <div className="card p-6">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        Troubleshooting
                                    </h2>
                                    <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                                        {/* HTTPS Warning - Show if not secure context */}
                                        {typeof window !== 'undefined' && !window.isSecureContext && (
                                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-300 dark:border-red-800">
                                                <p className="font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
                                                    🔒 HTTPS Required for Mobile
                                                </p>
                                                <p className="mt-2 text-red-700 dark:text-red-300">
                                                    Mobile browsers require a <strong>secure connection (HTTPS)</strong> to access camera and microphone.
                                                </p>
                                                <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded border text-slate-700 dark:text-slate-300">
                                                    <p className="font-medium">To fix this on Chrome Mobile:</p>
                                                    <ol className="mt-2 space-y-1 list-decimal list-inside text-xs">
                                                        <li>Open Chrome and go to <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">chrome://flags</code></li>
                                                        <li>Search for "<strong>Insecure origins treated as secure</strong>"</li>
                                                        <li>Add: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'http://your-ip:3000'}</code></li>
                                                        <li>Enable the flag and <strong>Relaunch Chrome</strong></li>
                                                    </ol>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <p className="font-medium text-slate-800 dark:text-slate-200">Camera/Mic not working?</p>
                                            <ul className="mt-2 space-y-1 list-disc list-inside">
                                                <li>Make sure no other app is using your camera</li>
                                                <li>Check if browser has camera/mic permissions enabled</li>
                                                <li>On mobile: Go to browser settings → Site settings → Allow camera/mic</li>
                                                <li>Try refreshing the page after granting permissions</li>
                                            </ul>
                                        </div>
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <p className="font-medium text-amber-800 dark:text-amber-400">📱 Mobile Users:</p>
                                            <p className="mt-1">
                                                On iOS Safari: Settings → Safari → Camera/Microphone → Allow<br />
                                                On Android Chrome: Tap the lock icon in address bar → Permissions
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">Notification Preferences</h2>
                                {Object.entries({ emailNotif: 'Email Notifications', submissionAlerts: 'Submission Alerts', gradeAlerts: 'Grade Updates', vivaReminders: 'Viva Reminders' }).map(([key, label]) => (
                                    <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                                        <span>{label}</span>
                                        <label className="relative inline-flex cursor-pointer"><input type="checkbox" className="sr-only peer" checked={notifications[key]} onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })} /><div className="w-11 h-6 bg-slate-200 peer-checked:bg-primary-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div></label>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Appearance</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="label">Theme</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { value: 'light', label: '☀️ Light', desc: 'Light background' },
                                                { value: 'dark', label: '🌙 Dark', desc: 'Dark background' },
                                                { value: 'system', label: '💻 System', desc: 'Match device' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setTheme(opt.value)}
                                                    className={`p-4 rounded-xl border-2 text-center transition-all ${theme === opt.value
                                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                        }`}
                                                >
                                                    <span className="text-2xl block mb-1">{opt.label.split(' ')[0]}</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100 block">{opt.label.split(' ')[1]}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Language</label>
                                        <select
                                            className="input"
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                        >
                                            <option value="en">English</option>
                                            <option value="hi">Hindi (हिंदी)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h2>
                                <div className="space-y-4 max-w-md">
                                    <div><label className="label">Current Password</label><input type="password" className="input" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} /></div>
                                    <div><label className="label">New Password</label><input type="password" className="input" value={passwords.newPass} onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })} /></div>
                                    <div><label className="label">Confirm Password</label><input type="password" className="input" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} /></div>
                                    <button onClick={handleChangePassword} disabled={saving} className="btn btn-primary"><Shield className="w-4 h-4" />{saving ? 'Updating...' : 'Update Password'}</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'grading' && isAdmin && (
                            <div className="space-y-6">
                                <div className="card p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold text-slate-900">Grade Scale Configuration</h2>
                                        <button
                                            onClick={() => setShowResetConfirm(true)}
                                            className="btn btn-secondary text-sm"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Reset to Default
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Configure the grading scale used for evaluating student submissions.
                                    </p>

                                    {/* Filters Section */}
                                    <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 mb-6 border border-primary-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Filter className="w-5 h-5 text-primary-600" />
                                            <h3 className="font-medium text-slate-900">Filter Grade Schemes</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-500 block mb-1">Status</label>
                                                <select
                                                    className="input text-sm"
                                                    value={gradeFilter}
                                                    onChange={(e) => setGradeFilter(e.target.value)}
                                                >
                                                    <option value="all">All Grades</option>
                                                    <option value="active">Active Only</option>
                                                    <option value="inactive">Inactive/Previous</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 block mb-1">Created Date</label>
                                                <select
                                                    className="input text-sm"
                                                    value={dateFilter}
                                                    onChange={(e) => setDateFilter(e.target.value)}
                                                >
                                                    <option value="">All Dates</option>
                                                    {uniqueDates.map(date => (
                                                        <option key={date} value={date}>{date}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 block mb-1">Sort By</label>
                                                <select
                                                    className="input text-sm"
                                                    value={sortOrder}
                                                    onChange={(e) => setSortOrder(e.target.value)}
                                                >
                                                    <option value="newest">Newest First</option>
                                                    <option value="oldest">Oldest First</option>
                                                    <option value="grade">Grade Points (High to Low)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Showing {filteredGradeScales.length} of {gradeScales.length} grade schemes
                                        </p>
                                    </div>

                                    {/* Add new grade */}
                                    <div className="bg-slate-50 rounded-xl p-4 mb-6">
                                        <h3 className="font-medium text-slate-900 mb-3">Add New Grade</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Grade (A1)"
                                                className="input text-sm"
                                                value={newGrade.gradeLetter}
                                                onChange={(e) => setNewGrade({ ...newGrade, gradeLetter: e.target.value })}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Points (10)"
                                                className="input text-sm"
                                                step="0.1"
                                                min="0"
                                                max="10"
                                                value={newGrade.gradePoint}
                                                onChange={(e) => setNewGrade({ ...newGrade, gradePoint: e.target.value })}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Min %"
                                                className="input text-sm"
                                                min="0"
                                                max="100"
                                                value={newGrade.minPercentage}
                                                onChange={(e) => setNewGrade({ ...newGrade, minPercentage: e.target.value })}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Max %"
                                                className="input text-sm"
                                                min="0"
                                                max="100"
                                                value={newGrade.maxPercentage}
                                                onChange={(e) => setNewGrade({ ...newGrade, maxPercentage: e.target.value })}
                                            />
                                            <button onClick={handleSaveGradeScale} disabled={saving} className="btn btn-primary text-sm">
                                                <Plus className="w-4 h-4" />
                                                Add
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Description (Optional)"
                                            className="input text-sm mt-2"
                                            value={newGrade.description}
                                            onChange={(e) => setNewGrade({ ...newGrade, description: e.target.value })}
                                        />
                                    </div>

                                    {/* Grade scales table */}
                                    {loadingGrades ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                                        </div>
                                    ) : filteredGradeScales.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No grade scales found with current filters</p>
                                            <p className="text-sm">Try adjusting the filters or click "Reset to Default" to add CBSE grade scales</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                        <th className="text-left py-3 px-4 font-medium text-slate-600">Grade</th>
                                                        <th className="text-left py-3 px-4 font-medium text-slate-600">Points</th>
                                                        <th className="text-left py-3 px-4 font-medium text-slate-600">Range</th>
                                                        <th className="text-left py-3 px-4 font-medium text-slate-600">Description</th>
                                                        <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                                                        <th className="text-left py-3 px-4 font-medium text-slate-600">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-4 h-4" />
                                                                Created
                                                            </span>
                                                        </th>
                                                        <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredGradeScales.map((scale) => (
                                                        <tr key={scale.id} className={`border-b border-slate-100 hover:bg-slate-50 transition ${!scale.isActive ? 'bg-slate-50/50' : ''}`}>
                                                            <td className="py-3 px-4">
                                                                <span className={`font-bold text-lg ${scale.isActive ? 'text-primary-600' : 'text-slate-400'}`}>
                                                                    {scale.gradeLetter}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-700">{scale.gradePoint}</td>
                                                            <td className="py-3 px-4 text-slate-700">{scale.minPercentage}% - {scale.maxPercentage}%</td>
                                                            <td className="py-3 px-4 text-slate-500">{scale.description || '-'}</td>
                                                            <td className="py-3 px-4">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${scale.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                                                    {scale.isActive ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="text-xs text-slate-600 font-medium">
                                                                    {formatDateTime(scale.createdAt)}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <button
                                                                    onClick={() => handleDeleteGradeScale(scale.id)}
                                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                                    title="Delete/Deactivate"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'sessions' && isAdmin && (
                            <div className="space-y-6">
                                {/* Header with Create Button */}
                                <div className="card p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900">Academic Sessions</h2>
                                            <p className="text-sm text-slate-500 mt-1">Manage academic year sessions. Sessions run from start date for exactly one year.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowCreateSession(!showCreateSession)}
                                            className="btn btn-primary"
                                        >
                                            <Plus className="w-4 h-4" />
                                            New Session
                                        </button>
                                    </div>
                                </div>

                                {/* Create Session Form */}
                                {showCreateSession && (
                                    <div className="card p-6 border-2 border-primary-200 bg-primary-50/30">
                                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-primary-600" />
                                            Create New Academic Session
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Start Date</label>
                                                <input
                                                    type="date"
                                                    className="input"
                                                    value={newSession.startDate}
                                                    onChange={(e) => setNewSession({ ...newSession, startDate: e.target.value })}
                                                />
                                                <p className="text-xs text-slate-500 mt-1">End date is auto-calculated (start + 1 year − 1 day)</p>
                                            </div>
                                            <div>
                                                {sessionPreview && (
                                                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Preview</p>
                                                        <p className="text-lg font-bold text-primary-700">{sessionPreview.yearLabel}</p>
                                                        <p className="text-sm text-slate-600">{sessionPreview.startDate} → {sessionPreview.endDate}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button
                                                onClick={handleCreateSession}
                                                disabled={savingSession || !newSession.startDate}
                                                className="btn btn-primary"
                                            >
                                                <Save className="w-4 h-4" />
                                                {savingSession ? 'Creating...' : 'Create Session'}
                                            </button>
                                            <button
                                                onClick={() => setShowCreateSession(false)}
                                                className="btn btn-secondary"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Sessions List */}
                                <div className="card p-6">
                                    <h3 className="font-semibold text-slate-900 mb-4">All Sessions</h3>
                                    {loadingSessions ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                                        </div>
                                    ) : sessionsList.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No academic sessions found</p>
                                            <p className="text-sm">Click "New Session" to create one</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {sessionsList.map((session) => (
                                                <div
                                                    key={session.id}
                                                    className={`rounded-xl border-2 p-4 transition-all ${
                                                        session.isCurrent
                                                            ? 'border-emerald-300 bg-emerald-50/50'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    {editingSession?.id === session.id ? (
                                                        /* Edit Mode */
                                                        <div className="space-y-3">
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="label text-sm">Start Date</label>
                                                                    <input
                                                                        type="date"
                                                                        className="input"
                                                                        value={editingSession.startDate}
                                                                        onChange={(e) => setEditingSession({ ...editingSession, startDate: e.target.value })}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleUpdateSession(session.id)}
                                                                    disabled={savingSession}
                                                                    className="btn btn-primary text-sm"
                                                                >
                                                                    <Save className="w-3 h-3" />
                                                                    {savingSession ? 'Saving...' : 'Save'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingSession(null)}
                                                                    className="btn btn-secondary text-sm"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* View Mode */
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                                    session.isCurrent
                                                                        ? 'bg-emerald-100 text-emerald-700'
                                                                        : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    <Calendar className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-semibold text-slate-900">{session.yearLabel}</p>
                                                                        {session.isCurrent && (
                                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                                                                                Current
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-slate-500">
                                                                        {formatDateRange(session.startDate, session.endDate)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {!session.isCurrent && (
                                                                    <button
                                                                        onClick={() => handleSetCurrentSession(session.id)}
                                                                        className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
                                                                        title="Set as Current"
                                                                    >
                                                                        Set Current
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setEditingSession({
                                                                        id: session.id,
                                                                        startDate: new Date(session.startDate).toISOString().split('T')[0]
                                                                    })}
                                                                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                                                                    title="Edit"
                                                                >
                                                                    <SettingsIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSession(session.id)}
                                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Info Box */}
                                <div className="card p-4 bg-blue-50 border border-blue-200">
                                    <div className="flex items-start gap-3 text-sm text-blue-800">
                                        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                                        <div>
                                            <p className="font-medium">How sessions work</p>
                                            <ul className="mt-2 space-y-1 text-blue-700">
                                                <li>• Sessions auto-create on server startup (April 1 → March 31)</li>
                                                <li>• The "Current" session is automatically rotated at midnight</li>
                                                <li>• All data (classes, assignments, grades) is scoped to the selected session</li>
                                                <li>• Sessions with linked data (classes, assignments) cannot be deleted</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'database' && isAdmin && (
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">SQL Console</h2>
                                <p className="text-slate-600 mb-6">
                                    Execute raw SQL queries directly on the database. Use with caution!
                                </p>
                                <a
                                    href="/admin/sql-console"
                                    className="btn btn-primary inline-flex items-center gap-2"
                                >
                                    <SettingsIcon className="w-4 h-4" />
                                    Open SQL Console
                                </a>
                            </div>
                        )}

                        {activeTab === 'cloud_drives' && isAdmin && (
                            <div className="space-y-6">
                                {/* Header Info Card */}
                                <div className="card p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                                                <Cloud className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-900">Cloud Storage & Drives Configuration</h2>
                                                <p className="text-xs text-slate-600 mt-0.5">
                                                    Manage multi-account OAuth credentials, enterprise storage, and cloud synchronization across Google Drive, OneDrive, iCloud, Dropbox, and AWS S3.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={loadCloudDriveSettings}
                                            disabled={loadingDriveSettings}
                                            className="btn btn-secondary text-xs flex items-center gap-1.5 self-end sm:self-center"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${loadingDriveSettings ? 'animate-spin' : ''}`} />
                                            <span>Refresh</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Active Connected Accounts Card */}
                                <div className="card p-6 border border-slate-200">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                                <HardDrive className="w-5 h-5 text-emerald-600" />
                                                Connected Accounts & Active Drive Sessions
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Active drives connected for file sync, direct imports, and dual-account multi-cloud access.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleConnectNewGoogleAccount}
                                            className="btn btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>+ Connect Another Account</span>
                                        </button>
                                    </div>

                                    {connectedDriveAccounts && connectedDriveAccounts.length > 0 ? (
                                        <div className="grid gap-3">
                                            {connectedDriveAccounts.map((acc) => (
                                                <div
                                                    key={acc.id}
                                                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg font-bold shadow-xs">
                                                            {acc.provider === 'google' ? '🇬' : acc.provider === 'onedrive' ? '🟦' : acc.provider === 'icloud' ? '🍎' : '📁'}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-900 text-sm">{acc.email || acc.displayName || acc.id}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    acc.status === 'needs_reconnect' || acc.hasTokens === false || acc.status === 'disconnected'
                                                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                                        : acc.isActive || acc.isDefault
                                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                            : 'bg-slate-200 text-slate-700'
                                                                }`}>
                                                                    {acc.status === 'needs_reconnect' || acc.hasTokens === false || acc.status === 'disconnected'
                                                                        ? 'Requires Auth'
                                                                        : (acc.isActive || acc.isDefault ? 'Active Drive' : 'Connected')}
                                                                </span>
                                                                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                                                    {acc.provider}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                                                                <span>Account / Plan: <strong className="text-slate-700">{acc.plan || acc.quota || 'Google Drive'}</strong></span>
                                                                <span>Status: <strong className={acc.status === 'needs_reconnect' || acc.hasTokens === false ? 'text-amber-600' : 'text-emerald-700'}>● {acc.status === 'needs_reconnect' || acc.hasTokens === false ? 'Requires Auth' : (acc.status || 'Active')}</strong></span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                                        {acc.provider === 'google' && !acc.isActive && !acc.isDefault && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSwitchDriveAccount(acc.email || acc.id)}
                                                                className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                                title="Set this account as the active Google Drive"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span>{(acc.status === 'needs_reconnect' || acc.hasTokens === false) ? 'Connect / Authorize' : 'Switch to Active'}</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDisconnectDriveAccount(acc.id, acc.provider)}
                                                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                                            title="Disconnect this account"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            <span>Disconnect</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                            <HardDrive className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                            <p className="text-sm font-semibold text-slate-700">No external accounts connected yet</p>
                                            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-3">
                                                Configure the OAuth credentials below, then click &quot;Connect Another Account&quot; to authorize your Google, Microsoft, or Apple drives.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Google Drive OAuth 2.0 Card */}
                                <div className="card p-6 border border-emerald-200/80 shadow-xs">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                                                G
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-bold text-slate-900">Google Drive OAuth 2.0</h3>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        5 TB Google One / Workspace
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">Configure Client ID and Secret for seamless personal and multi-account Google Drive sync.</p>
                                            </div>
                                        </div>
                                        <a
                                            href="https://console.cloud.google.com/apis/credentials"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline"
                                        >
                                            <span>Google Cloud Console</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>

                                    {/* Quick Guide */}
                                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 text-xs text-slate-700 mb-4 space-y-1">
                                        <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                                            <Key className="w-4 h-4 text-emerald-600" /> Setup Instructions for Google Cloud Console:
                                        </p>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            1. In Google Cloud Console &rarr; <strong>APIs & Services &rarr; Credentials</strong>, create an <strong>OAuth client ID</strong> (Web application).<br />
                                            2. Add the <strong>Authorized redirect URI</strong> shown below.<br />
                                            3. Paste the generated Client ID and Client Secret, then click <strong>Save Google Credentials</strong>.
                                        </p>
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSaveDriveConfig('google');
                                        }}
                                        className="space-y-4 text-xs"
                                    >
                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">OAuth Client ID</label>
                                            <input
                                                type="text"
                                                value={driveConfigs.google?.clientId || ''}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    google: { ...prev.google, clientId: e.target.value }
                                                }))}
                                                placeholder="e.g. 1234567890-abcdef.apps.googleusercontent.com"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-slate-700 font-bold">OAuth Client Secret</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSecrets(prev => ({ ...prev, google: !prev.google }))}
                                                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                                >
                                                    {showSecrets.google ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    <span>{showSecrets.google ? 'Hide' : 'Show'}</span>
                                                </button>
                                            </div>
                                            <input
                                                type={showSecrets.google ? 'text' : 'password'}
                                                value={driveConfigs.google?.clientSecret || ''}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    google: { ...prev.google, clientSecret: e.target.value }
                                                }))}
                                                placeholder="GOCSPX-..."
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">System Authorized Redirect URI (Copy to Google Console)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={systemCallbackUrls.google || 'http://localhost:5001/api/drive/auth/callback'}
                                                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono text-slate-700 select-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(systemCallbackUrls.google || 'http://localhost:5001/api/drive/auth/callback', 'google')}
                                                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition flex-shrink-0"
                                                >
                                                    {copiedUrlKey === 'google' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                    <span>{copiedUrlKey === 'google' ? 'Copied!' : 'Copy'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Default Root Folder ID (Optional)</label>
                                            <input
                                                type="text"
                                                value={driveConfigs.google?.rootFolderId || ''}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    google: { ...prev.google, rootFolderId: e.target.value }
                                                }))}
                                                placeholder="Leave empty for root folder, or paste specific Drive folder ID"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                            />
                                        </div>

                                        <div className="pt-2 flex items-center justify-end gap-3">
                                            <button
                                                type="submit"
                                                disabled={savingDriveProvider === 'google'}
                                                className="btn btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Save className="w-4 h-4" />
                                                <span>{savingDriveProvider === 'google' ? 'Saving...' : 'Save Google Credentials'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Microsoft OneDrive / SharePoint Card */}
                                <div className="card p-6 border border-blue-200/80 shadow-xs">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                                                M
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-bold text-slate-900">Microsoft OneDrive & SharePoint</h3>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                        Microsoft 365
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">Connect personal OneDrive, work school accounts, and institutional SharePoint document libraries.</p>
                                            </div>
                                        </div>
                                        <a
                                            href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline"
                                        >
                                            <span>Azure App Registrations</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSaveDriveConfig('onedrive');
                                        }}
                                        className="space-y-4 text-xs"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-700 font-bold mb-1">Application (Client) ID</label>
                                                <input
                                                    type="text"
                                                    value={driveConfigs.onedrive?.clientId || ''}
                                                    onChange={(e) => setDriveConfigs(prev => ({
                                                        ...prev,
                                                        onedrive: { ...prev.onedrive, clientId: e.target.value }
                                                    }))}
                                                    placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-slate-700 font-bold mb-1">Directory (Tenant) ID</label>
                                                <input
                                                    type="text"
                                                    value={driveConfigs.onedrive?.tenantId || 'common'}
                                                    onChange={(e) => setDriveConfigs(prev => ({
                                                        ...prev,
                                                        onedrive: { ...prev.onedrive, tenantId: e.target.value }
                                                    }))}
                                                    placeholder="common (or organizational tenant GUID)"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-slate-700 font-bold">Client Secret Value</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSecrets(prev => ({ ...prev, onedrive: !prev.onedrive }))}
                                                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                                >
                                                    {showSecrets.onedrive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    <span>{showSecrets.onedrive ? 'Hide' : 'Show'}</span>
                                                </button>
                                            </div>
                                            <input
                                                type={showSecrets.onedrive ? 'text' : 'password'}
                                                value={driveConfigs.onedrive?.clientSecret || ''}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    onedrive: { ...prev.onedrive, clientSecret: e.target.value }
                                                }))}
                                                placeholder="Azure client secret"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Azure Authorized Redirect URI</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={systemCallbackUrls.onedrive || 'http://localhost:5001/api/drive/auth/callback/onedrive'}
                                                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono text-slate-700 select-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(systemCallbackUrls.onedrive || 'http://localhost:5001/api/drive/auth/callback/onedrive', 'onedrive')}
                                                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition flex-shrink-0"
                                                >
                                                    {copiedUrlKey === 'onedrive' ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                    <span>{copiedUrlKey === 'onedrive' ? 'Copied!' : 'Copy'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-2 flex items-center justify-end">
                                            <button
                                                type="submit"
                                                disabled={savingDriveProvider === 'onedrive'}
                                                className="btn btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Save className="w-4 h-4" />
                                                <span>{savingDriveProvider === 'onedrive' ? 'Saving...' : 'Save OneDrive Credentials'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Apple iCloud Drive Card */}
                                <div className="card p-6 border border-slate-300/80 shadow-xs">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                                                
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-bold text-slate-900">Apple iCloud Drive</h3>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                                        iPhone & Mac Files
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">Sync with Apple iCloud Drive, iPhone Files App, and iPad lab notes via App-Specific Password.</p>
                                            </div>
                                        </div>
                                        <a
                                            href="https://appleid.apple.com/account/manage"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 hover:underline"
                                        >
                                            <span>Apple ID Portal</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSaveDriveConfig('icloud');
                                        }}
                                        className="space-y-4 text-xs"
                                    >
                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Apple ID (Email)</label>
                                            <input
                                                type="email"
                                                value={driveConfigs.icloud?.appleId || ''}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    icloud: { ...prev.icloud, appleId: e.target.value }
                                                }))}
                                                placeholder="e.g. user@icloud.com"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-500 focus:outline-hidden"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-slate-700 font-bold">App-Specific Password</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSecrets(prev => ({ ...prev, icloud: !prev.icloud }))}
                                                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                                >
                                                    {showSecrets.icloud ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    <span>{showSecrets.icloud ? 'Hide' : 'Show'}</span>
                                                </button>
                                            </div>
                                            <input
                                                type={showSecrets.icloud ? 'text' : 'password'}
                                                value={driveConfigs.icloud?.appSpecificPassword || ''}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    icloud: { ...prev.icloud, appSpecificPassword: e.target.value }
                                                }))}
                                                placeholder="xxxx-xxxx-xxxx-xxxx (Generate at appleid.apple.com)"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-500 focus:outline-hidden"
                                                required
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                Go to <a href="https://appleid.apple.com" target="_blank" rel="noreferrer" className="underline font-semibold">appleid.apple.com</a> &rarr; Sign-In and Security &rarr; App-Specific Passwords to generate one.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Drive / WebDAV Server URL</label>
                                            <input
                                                type="text"
                                                value={driveConfigs.icloud?.serverUrl || 'https://caldav.icloud.com'}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    icloud: { ...prev.icloud, serverUrl: e.target.value }
                                                }))}
                                                placeholder="https://caldav.icloud.com"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-500 focus:outline-hidden"
                                            />
                                        </div>

                                        <div className="pt-2 flex items-center justify-end">
                                            <button
                                                type="submit"
                                                disabled={savingDriveProvider === 'icloud'}
                                                className="btn btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Save className="w-4 h-4" />
                                                <span>{savingDriveProvider === 'icloud' ? 'Saving...' : 'Save iCloud Configuration'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Dropbox Card */}
                                <div className="card p-6 border border-indigo-200/80 shadow-xs">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                                                D
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-bold text-slate-900">Dropbox Integration</h3>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                        Dropbox Cloud
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">Sync lab documentation and student archives directly to Dropbox folders.</p>
                                            </div>
                                        </div>
                                        <a
                                            href="https://www.dropbox.com/developers/apps"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-indigo-700 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                                        >
                                            <span>Dropbox App Console</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSaveDriveConfig('dropbox');
                                        }}
                                        className="space-y-4 text-xs"
                                    >
                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Dropbox App Key</label>
                                            <input
                                                type="text"
                                                value={driveConfigs.dropbox?.appKey || ''}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    dropbox: { ...prev.dropbox, appKey: e.target.value }
                                                }))}
                                                placeholder="Dropbox App Key"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-slate-700 font-bold">Dropbox App Secret</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSecrets(prev => ({ ...prev, dropbox: !prev.dropbox }))}
                                                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                                >
                                                    {showSecrets.dropbox ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    <span>{showSecrets.dropbox ? 'Hide' : 'Show'}</span>
                                                </button>
                                            </div>
                                            <input
                                                type={showSecrets.dropbox ? 'text' : 'password'}
                                                value={driveConfigs.dropbox?.appSecret || ''}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    dropbox: { ...prev.dropbox, appSecret: e.target.value }
                                                }))}
                                                placeholder="Dropbox App Secret"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Dropbox Authorized Redirect URI</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={systemCallbackUrls.dropbox || 'http://localhost:5001/api/drive/auth/callback/dropbox'}
                                                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono text-slate-700 select-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(systemCallbackUrls.dropbox || 'http://localhost:5001/api/drive/auth/callback/dropbox', 'dropbox')}
                                                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition flex-shrink-0"
                                                >
                                                    {copiedUrlKey === 'dropbox' ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                    <span>{copiedUrlKey === 'dropbox' ? 'Copied!' : 'Copy'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-2 flex items-center justify-end">
                                            <button
                                                type="submit"
                                                disabled={savingDriveProvider === 'dropbox'}
                                                className="btn btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Save className="w-4 h-4" />
                                                <span>{savingDriveProvider === 'dropbox' ? 'Saving...' : 'Save Dropbox Credentials'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Amazon S3 / Object Storage Card */}
                                <div className="card p-6 border border-amber-200/80 shadow-xs">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                                                S3
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-bold text-slate-900">AWS S3 / Compatible Object Storage</h3>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                        Enterprise S3 / MinIO / R2
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">Connect Amazon S3 bucket, Cloudflare R2, MinIO, or Wasabi for institutional object storage.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSaveDriveConfig('s3');
                                        }}
                                        className="space-y-4 text-xs"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-700 font-bold mb-1">S3 Bucket Name</label>
                                                <input
                                                    type="text"
                                                    value={driveConfigs.s3?.bucket || ''}
                                                    onChange={(e) => setDriveConfigs(prev => ({
                                                        ...prev,
                                                        s3: { ...prev.s3, bucket: e.target.value }
                                                    }))}
                                                    placeholder="e.g. labrec-records-storage"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-slate-700 font-bold mb-1">AWS Region</label>
                                                <input
                                                    type="text"
                                                    value={driveConfigs.s3?.region || 'us-east-1'}
                                                    onChange={(e) => setDriveConfigs(prev => ({
                                                        ...prev,
                                                        s3: { ...prev.s3, region: e.target.value }
                                                    }))}
                                                    placeholder="e.g. us-east-1, ap-south-1"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-700 font-bold mb-1">Access Key ID</label>
                                                <input
                                                    type="text"
                                                    value={driveConfigs.s3?.accessKeyId || ''}
                                                    onChange={(e) => setDriveConfigs(prev => ({
                                                        ...prev,
                                                        s3: { ...prev.s3, accessKeyId: e.target.value }
                                                    }))}
                                                    placeholder="AKIA..."
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-slate-700 font-bold">Secret Access Key</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowSecrets(prev => ({ ...prev, s3: !prev.s3 }))}
                                                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                                    >
                                                        {showSecrets.s3 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        <span>{showSecrets.s3 ? 'Hide' : 'Show'}</span>
                                                    </button>
                                                </div>
                                                <input
                                                    type={showSecrets.s3 ? 'text' : 'password'}
                                                    value={driveConfigs.s3?.secretAccessKey || ''}
                                                    onChange={(e) => setDriveConfigs(prev => ({
                                                        ...prev,
                                                        s3: { ...prev.s3, secretAccessKey: e.target.value }
                                                    }))}
                                                    placeholder="AWS Secret Access Key"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Custom S3 Endpoint URL (Optional for R2/MinIO)</label>
                                            <input
                                                type="text"
                                                value={driveConfigs.s3?.endpoint || ''}
                                                onChange={(e) => setDriveConfigs(prev => ({
                                                    ...prev,
                                                    s3: { ...prev.s3, endpoint: e.target.value }
                                                }))}
                                                placeholder="e.g. https://<account_id>.r2.cloudflarestorage.com or https://minio.yourdomain.com"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                            />
                                        </div>

                                        <div className="pt-2 flex items-center justify-end">
                                            <button
                                                type="submit"
                                                disabled={savingDriveProvider === 's3'}
                                                className="btn btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Save className="w-4 h-4" />
                                                <span>{savingDriveProvider === 's3' ? 'Saving...' : 'Save S3 Configuration'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeTab === 'voice' && (
                            <div className="card p-6 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                            AI Teacher Voice & Speech Synthesis
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Select and customize the voice persona for the interactive Whiteboard Teacher and Copilot.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSaveVoiceSettings}
                                            className="btn btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Save className="w-4 h-4" /> Save Voice Settings
                                        </button>
                                    </div>
                                </div>

                                {/* Voice Persona Profiles */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-3">
                                        1. Select Teacher Voice Persona
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Samantha */}
                                        <div
                                            onClick={() => {
                                                setSelectedVoiceProfile('samantha');
                                                const v = systemVoices.find(v => v.name.toLowerCase().includes('samantha') || (v.lang.startsWith('en-US') && v.name.includes('Natural')) || v.name.includes('Karen') || v.name.includes('Google US English'));
                                                if (v) setSelectedVoiceName(v.name);
                                            }}
                                            className={`p-4 rounded-xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                                                selectedVoiceProfile === 'samantha'
                                                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                                            }`}
                                        >
                                            {selectedVoiceProfile === 'samantha' && (
                                                <div className="absolute top-3 right-3 text-indigo-600 dark:text-indigo-400">
                                                    <CheckCircle className="w-5 h-5 fill-indigo-600 text-white dark:fill-indigo-400 dark:text-slate-900" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-2xl">👩‍🏫</span>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Samantha</h4>
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                                            US Educator
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                                    Articulate, warm, engaging American teaching tone. Best for structured walkthroughs and clear step-by-step whiteboard guidance.
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePlayStudioSample('/documents/audio/thermo_samantha.wav');
                                                    }}
                                                    className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition ${
                                                        playingSampleUrl === '/documents/audio/thermo_samantha.wav'
                                                            ? 'bg-rose-600 text-white'
                                                            : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                                                    }`}
                                                >
                                                    {playingSampleUrl === '/documents/audio/thermo_samantha.wav' ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                                                    {playingSampleUrl === '/documents/audio/thermo_samantha.wav' ? 'Playing Sample' : 'Studio Sample'}
                                                </button>
                                                <span className="text-[11px] text-slate-400 font-mono">.WAV • 4-5 Lines</span>
                                            </div>
                                        </div>

                                        {/* Daniel */}
                                        <div
                                            onClick={() => {
                                                setSelectedVoiceProfile('daniel');
                                                const v = systemVoices.find(v => v.name.toLowerCase().includes('daniel') || v.name.includes('George') || v.name.includes('Oliver') || v.name.includes('Google UK English Male') || v.lang.startsWith('en-GB'));
                                                if (v) setSelectedVoiceName(v.name);
                                            }}
                                            className={`p-4 rounded-xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                                                selectedVoiceProfile === 'daniel'
                                                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                                            }`}
                                        >
                                            {selectedVoiceProfile === 'daniel' && (
                                                <div className="absolute top-3 right-3 text-indigo-600 dark:text-indigo-400">
                                                    <CheckCircle className="w-5 h-5 fill-indigo-600 text-white dark:fill-indigo-400 dark:text-slate-900" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-2xl">👨‍🏫</span>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Daniel</h4>
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                                            UK Academic
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                                    Deep, resonant British academic depth. Authoritative lecture pacing suitable for higher-level theory and university engineering concepts.
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePlayStudioSample('/documents/audio/thermo_daniel.wav');
                                                    }}
                                                    className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition ${
                                                        playingSampleUrl === '/documents/audio/thermo_daniel.wav'
                                                            ? 'bg-rose-600 text-white'
                                                            : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                                                    }`}
                                                >
                                                    {playingSampleUrl === '/documents/audio/thermo_daniel.wav' ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                                                    {playingSampleUrl === '/documents/audio/thermo_daniel.wav' ? 'Playing Sample' : 'Studio Sample'}
                                                </button>
                                                <span className="text-[11px] text-slate-400 font-mono">.WAV • 4-5 Lines</span>
                                            </div>
                                        </div>

                                        {/* Rishi */}
                                        <div
                                            onClick={() => {
                                                setSelectedVoiceProfile('rishi');
                                                const v = systemVoices.find(v => v.name.toLowerCase().includes('rishi') || v.name.includes('Neerja') || v.name.includes('India') || v.lang.startsWith('en-IN') || v.lang.startsWith('hi'));
                                                if (v) setSelectedVoiceName(v.name);
                                            }}
                                            className={`p-4 rounded-xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                                                selectedVoiceProfile === 'rishi'
                                                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                                            }`}
                                        >
                                            {selectedVoiceProfile === 'rishi' && (
                                                <div className="absolute top-3 right-3 text-indigo-600 dark:text-indigo-400">
                                                    <CheckCircle className="w-5 h-5 fill-indigo-600 text-white dark:fill-indigo-400 dark:text-slate-900" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-2xl">👨‍🏫</span>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Rishi</h4>
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                                            Indian English
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                                    Expressive, natural Indian English educator delivery. High clarity for classroom demonstrations, interactive problem-solving, and Q&A.
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePlayStudioSample('/documents/audio/thermo_rishi.wav');
                                                    }}
                                                    className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition ${
                                                        playingSampleUrl === '/documents/audio/thermo_rishi.wav'
                                                            ? 'bg-rose-600 text-white'
                                                            : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                                                    }`}
                                                >
                                                    {playingSampleUrl === '/documents/audio/thermo_rishi.wav' ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                                                    {playingSampleUrl === '/documents/audio/thermo_rishi.wav' ? 'Playing Sample' : 'Studio Sample'}
                                                </button>
                                                <span className="text-[11px] text-slate-400 font-mono">.WAV • 4-5 Lines</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* System Synthesis Voice Selector */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
                                            2. Underlying Browser Synthesis Voice
                                        </label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                            Choose the exact synthesized voice engine from your operating system or browser for real-time speech responses.
                                        </p>
                                        <select
                                            value={selectedVoiceName}
                                            onChange={(e) => {
                                                setSelectedVoiceName(e.target.value);
                                                setSelectedVoiceProfile('custom');
                                            }}
                                            className="select w-full text-xs font-mono"
                                        >
                                            {systemVoices && systemVoices.length > 0 ? (
                                                <>
                                                    <optgroup label="English Voices (Recommended for Teaching)">
                                                        {systemVoices.filter(v => v.lang.startsWith('en')).map(v => (
                                                            <option key={v.name} value={v.name}>
                                                                {v.name} ({v.lang}) {v.default ? '— Default' : ''}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="Other Regional & Global Voices">
                                                        {systemVoices.filter(v => !v.lang.startsWith('en')).map(v => (
                                                            <option key={v.name} value={v.name}>
                                                                {v.name} ({v.lang})
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                </>
                                            ) : (
                                                <option value="">Default System Voice (Auto-detecting...)</option>
                                            )}
                                        </select>
                                    </div>

                                    {/* Modulation Sliders: Speed, Pitch, Volume */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                        {/* Speech Rate */}
                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">Speech Speed</span>
                                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{voiceRate.toFixed(2)}x</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.6"
                                                max="1.6"
                                                step="0.05"
                                                value={voiceRate}
                                                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                                                className="w-full accent-indigo-600"
                                            />
                                            <div className="flex items-center justify-between gap-1 mt-2">
                                                <button type="button" onClick={() => setVoiceRate(0.85)} className={`px-2 py-0.5 rounded text-[10px] ${voiceRate === 0.85 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>0.85x Calibrated</button>
                                                <button type="button" onClick={() => setVoiceRate(1.0)} className={`px-2 py-0.5 rounded text-[10px] ${voiceRate === 1.0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>1.0x Normal</button>
                                                <button type="button" onClick={() => setVoiceRate(1.15)} className={`px-2 py-0.5 rounded text-[10px] ${voiceRate === 1.15 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>1.15x Brisk</button>
                                            </div>
                                        </div>

                                        {/* Speech Pitch */}
                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">Voice Pitch</span>
                                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{voicePitch.toFixed(2)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.7"
                                                max="1.3"
                                                step="0.05"
                                                value={voicePitch}
                                                onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                                                className="w-full accent-indigo-600"
                                            />
                                            <div className="flex items-center justify-between gap-1 mt-2">
                                                <button type="button" onClick={() => setVoicePitch(0.9)} className={`px-2 py-0.5 rounded text-[10px] ${voicePitch === 0.9 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>0.9 Deeper</button>
                                                <button type="button" onClick={() => setVoicePitch(1.0)} className={`px-2 py-0.5 rounded text-[10px] ${voicePitch === 1.0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>1.0 Natural</button>
                                                <button type="button" onClick={() => setVoicePitch(1.1)} className={`px-2 py-0.5 rounded text-[10px] ${voicePitch === 1.1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>1.1 Bright</button>
                                            </div>
                                        </div>

                                        {/* Speech Volume */}
                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">Volume</span>
                                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{Math.round(voiceVolume * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={voiceVolume}
                                                onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                                                className="w-full accent-indigo-600"
                                            />
                                            <div className="flex items-center justify-between gap-1 mt-2">
                                                <button type="button" onClick={() => setVoiceVolume(0.5)} className={`px-2 py-0.5 rounded text-[10px] ${voiceVolume === 0.5 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>50%</button>
                                                <button type="button" onClick={() => setVoiceVolume(0.8)} className={`px-2 py-0.5 rounded text-[10px] ${voiceVolume === 0.8 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>80%</button>
                                                <button type="button" onClick={() => setVoiceVolume(1.0)} className={`px-2 py-0.5 rounded text-[10px] ${voiceVolume === 1.0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>100%</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Auto-read toggle */}
                                    <div className="pt-2 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                                Auto-Speak Whiteboard Answers & Teacher Demonstrations
                                            </span>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                When enabled, the AI teacher will verbally explain equations, describe shapes, and confirm actions aloud.
                                            </span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={autoReadVoice}
                                                onChange={(e) => setAutoReadVoice(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* Live Interactive Voice Testing Console */}
                                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            3. Live Speech Testing Console
                                        </span>
                                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                            Test live synthesis with your current settings
                                        </span>
                                    </div>

                                    <textarea
                                        value={testPhrase}
                                        onChange={(e) => setTestPhrase(e.target.value)}
                                        rows={2}
                                        className="w-full text-xs p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Type any test sentence..."
                                    />

                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleTestLiveSpeech}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition ${
                                                    isTtsSpeaking
                                                        ? 'bg-rose-600 text-white animate-pulse'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                }`}
                                            >
                                                {isTtsSpeaking ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                                                {isTtsSpeaking ? 'Stop Speaking' : 'Speak Test Phrase'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTestPhrase('The first law of thermodynamics states that the total energy of an isolated system is constant.');
                                                }}
                                                className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700"
                                            >
                                                Load Thermodynamics Test
                                            </button>
                                        </div>

                                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                                            Ready • Active Profile: <strong className="capitalize">{selectedVoiceProfile}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Final Save Bar */}
                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedVoiceProfile('samantha');
                                            setSelectedVoiceName('');
                                            setVoiceRate(1.0);
                                            setVoicePitch(1.0);
                                            setVoiceVolume(1.0);
                                            setAutoReadVoice(true);
                                            toast('Reset to default voice settings', { icon: '🔄' });
                                        }}
                                        className="btn btn-secondary text-xs"
                                    >
                                        Reset to Defaults
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveVoiceSettings}
                                        className="btn btn-primary text-xs flex items-center gap-1.5 shadow-md"
                                    >
                                        <Save className="w-4 h-4" /> Save Voice Settings
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ai' && isAdmin && (
                            <div className="space-y-6">
                                {/* AI Teacher Voice Studio Banner */}
                                <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                            <Volume2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                                                AI Teacher Voice Studio
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-medium">Synchronized</span>
                                            </h4>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                                Active Speech Persona: <strong className="capitalize text-indigo-600 dark:text-indigo-400">{selectedVoiceProfile}</strong> ({selectedVoiceName || 'Auto-matched'})
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('voice')}
                                        className="btn btn-primary text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                                    >
                                        <Volume2 className="w-4 h-4" /> Configure Teacher Voice
                                    </button>
                                </div>

                                {/* Main Header & Controls */}
                                <div className="card p-6 space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                <Sparkles className="w-5 h-5 text-indigo-600" /> AI Models & Engine Configurations
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                Configure enterprise paid providers (OpenAI, Anthropic Claude, DeepSeek, OpenRouter) and fast cloud models.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={loadAiSettings}
                                                disabled={loadingAiSettings}
                                                className="btn btn-secondary text-xs flex items-center gap-1.5"
                                                title="Refresh active provider statuses"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 ${loadingAiSettings ? 'animate-spin' : ''}`} /> Refresh
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveAiSettings}
                                                disabled={savingAiSettings}
                                                className="btn btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Save className="w-4 h-4" />
                                                {savingAiSettings ? 'Saving...' : 'Save AI Configuration'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Strict No-Mock / Quota Halting Safeguard Banner */}
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                        <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                            <strong className="text-emerald-800 dark:text-emerald-300 font-semibold block mb-0.5">
                                                Strict Live AI Enforcement & Quota Exhaustion Halting
                                            </strong>
                                            All canned fallback text and local fake answers (such as hardcoded Newton's laws or Pythagoras formulas) are completely disabled. Every user inquiry is evaluated dynamically via authentic AI models. If model quotas are exhausted or credentials fail, execution halts immediately with a clear alert rather than mutating whiteboard drawings or executing phantom commands.
                                        </div>
                                    </div>

                                    {/* Preferred Primary Provider Selector */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                    <Cpu className="w-4 h-4 text-indigo-600" /> Preferred AI Engine Routing
                                                </label>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Choose which provider takes precedence for Chatbot, Voice Whiteboard, and Smart Teaching assists.
                                                </p>
                                            </div>
                                            <select
                                                value={aiKeysInput.preferredProvider}
                                                onChange={(e) => setAiKeysInput(prev => ({ ...prev, preferredProvider: e.target.value }))}
                                                className="input text-xs sm:text-sm py-1.5 px-3 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium max-w-xs"
                                            >
                                                <option value="auto">Auto-Cascade (Paid First: OpenAI → Claude → DeepSeek → OpenRouter → Groq → Gemini → SambaNova)</option>
                                                <option value="openai">OpenAI (Direct Paid: GPT-4o / GPT-4o-mini)</option>
                                                <option value="anthropic">Anthropic (Direct Paid: Claude 3.7 Sonnet / Claude 3.5 Sonnet)</option>
                                                <option value="deepseek">DeepSeek (Direct Paid: DeepSeek-Chat / DeepSeek-Reasoner)</option>
                                                <option value="openrouter">OpenRouter (Unified Paid Multi-Model Gateway)</option>
                                                <option value="gemini">Google Gemini (Gemini 3.8 Flash / 3.5 Flash-Lite)</option>
                                                <option value="groq">Groq (LPU Llama 3.3 70B Versatile)</option>
                                                <option value="sambanova">SambaNova (Llama 3.2 Vision)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Section 1: Paid & Commercial AI Providers */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-amber-500" />
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                                Paid & Enterprise AI Models (Zero Rate-Limit Interruption)
                                            </h3>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            {/* OpenAI */}
                                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">OpenAI</h4>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                                                                Paid / Tier 1-5
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            Models: <code>gpt-4o</code>, <code>gpt-4o-mini</code> • <span className="text-indigo-600 dark:text-indigo-400 font-medium">Mapped Test Model: <code>gpt-4o-mini</code></span>
                                                        </p>
                                                    </div>
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                                        aiConfigs?.providers?.openai?.configured 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200' 
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {aiConfigs?.providers?.openai?.configured ? '✓ Active' : 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type={showAiSecrets.openai ? 'text' : 'password'}
                                                        placeholder="sk-proj-..."
                                                        value={aiKeysInput.openaiApiKey}
                                                        onChange={(e) => setAiKeysInput(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                                                        className="input text-xs font-mono pr-9 w-full"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAiSecrets(prev => ({ ...prev, openai: !prev.openai }))}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        {showAiSecrets.openai ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <a
                                                        href="https://platform.openai.com/api-keys"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        Get OpenAI Key <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTestProvider('openai')}
                                                        disabled={testingProvider === 'openai'}
                                                        className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                                                    >
                                                        {testingProvider === 'openai' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                        Test Key
                                                    </button>
                                                </div>

                                                {testResults.openai && (
                                                    <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                                        testResults.openai.status === 'success'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                                            : testResults.openai.status === 'quota_exhausted'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200'
                                                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
                                                    }`}>
                                                        {testResults.openai.status === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                                        <span className="leading-tight">{testResults.openai.message} {testResults.openai.latency ? `(${testResults.openai.latency}ms)` : ''}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Anthropic */}
                                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Anthropic Claude</h4>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                                                                Paid / Build Tier
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            Models: <code>claude-3-7-sonnet</code> • <span className="text-indigo-600 dark:text-indigo-400 font-medium">Mapped Test Model: <code>claude-3-5-haiku</code></span>
                                                        </p>
                                                    </div>
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                                        aiConfigs?.providers?.anthropic?.configured 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200' 
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {aiConfigs?.providers?.anthropic?.configured ? '✓ Active' : 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type={showAiSecrets.anthropic ? 'text' : 'password'}
                                                        placeholder="sk-ant-api03-..."
                                                        value={aiKeysInput.anthropicApiKey}
                                                        onChange={(e) => setAiKeysInput(prev => ({ ...prev, anthropicApiKey: e.target.value }))}
                                                        className="input text-xs font-mono pr-9 w-full"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAiSecrets(prev => ({ ...prev, anthropic: !prev.anthropic }))}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        {showAiSecrets.anthropic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <a
                                                        href="https://console.anthropic.com/settings/keys"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        Get Claude Key <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTestProvider('anthropic')}
                                                        disabled={testingProvider === 'anthropic'}
                                                        className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                                                    >
                                                        {testingProvider === 'anthropic' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                        Test Key
                                                    </button>
                                                </div>

                                                {testResults.anthropic && (
                                                    <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                                        testResults.anthropic.status === 'success'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                                            : testResults.anthropic.status === 'quota_exhausted'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200'
                                                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
                                                    }`}>
                                                        {testResults.anthropic.status === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                                        <span className="leading-tight">{testResults.anthropic.message} {testResults.anthropic.latency ? `(${testResults.anthropic.latency}ms)` : ''}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* DeepSeek */}
                                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">DeepSeek</h4>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                                                                Paid / Pre-funded
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            Models: <code>deepseek-chat</code>, <code>deepseek-reasoner</code> • <span className="text-indigo-600 dark:text-indigo-400 font-medium">Mapped Test Model: <code>deepseek-chat</code></span>
                                                        </p>
                                                    </div>
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                                        aiConfigs?.providers?.deepseek?.configured 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200' 
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {aiConfigs?.providers?.deepseek?.configured ? '✓ Active' : 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type={showAiSecrets.deepseek ? 'text' : 'password'}
                                                        placeholder="sk-..."
                                                        value={aiKeysInput.deepseekApiKey}
                                                        onChange={(e) => setAiKeysInput(prev => ({ ...prev, deepseekApiKey: e.target.value }))}
                                                        className="input text-xs font-mono pr-9 w-full"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAiSecrets(prev => ({ ...prev, deepseek: !prev.deepseek }))}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        {showAiSecrets.deepseek ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <a
                                                        href="https://platform.deepseek.com/api_keys"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        Get DeepSeek Key <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTestProvider('deepseek')}
                                                        disabled={testingProvider === 'deepseek'}
                                                        className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                                                    >
                                                        {testingProvider === 'deepseek' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                        Test Key
                                                    </button>
                                                </div>

                                                {testResults.deepseek && (
                                                    <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                                        testResults.deepseek.status === 'success'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                                            : testResults.deepseek.status === 'quota_exhausted'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200'
                                                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
                                                    }`}>
                                                        {testResults.deepseek.status === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                                        <span className="leading-tight">{testResults.deepseek.message} {testResults.deepseek.latency ? `(${testResults.deepseek.latency}ms)` : ''}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* OpenRouter */}
                                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">OpenRouter</h4>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                                                                Unified Paid Gateway
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            Auto-routes to 200+ models • <span className="text-indigo-600 dark:text-indigo-400 font-medium">Mapped Test Model: <code>openai/gpt-4o-mini</code></span>
                                                        </p>
                                                    </div>
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                                        aiConfigs?.providers?.openrouter?.configured 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200' 
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {aiConfigs?.providers?.openrouter?.configured ? '✓ Active' : 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type={showAiSecrets.openrouter ? 'text' : 'password'}
                                                        placeholder="sk-or-v1-..."
                                                        value={aiKeysInput.openrouterApiKey}
                                                        onChange={(e) => setAiKeysInput(prev => ({ ...prev, openrouterApiKey: e.target.value }))}
                                                        className="input text-xs font-mono pr-9 w-full"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAiSecrets(prev => ({ ...prev, openrouter: !prev.openrouter }))}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        {showAiSecrets.openrouter ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <a
                                                        href="https://openrouter.ai/keys"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        Get OpenRouter Key <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTestProvider('openrouter')}
                                                        disabled={testingProvider === 'openrouter'}
                                                        className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                                                    >
                                                        {testingProvider === 'openrouter' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                        Test Key
                                                    </button>
                                                </div>

                                                {testResults.openrouter && (
                                                    <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                                        testResults.openrouter.status === 'success'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                                            : testResults.openrouter.status === 'quota_exhausted'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200'
                                                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
                                                    }`}>
                                                        {testResults.openrouter.status === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                                        <span className="leading-tight">{testResults.openrouter.message} {testResults.openrouter.latency ? `(${testResults.openrouter.latency}ms)` : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Fast & Cloud Tier Providers */}
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Cpu className="w-4 h-4 text-indigo-500" />
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                                Fast & Multimodal Cloud Providers
                                            </h3>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-3">
                                            {/* Google Gemini */}
                                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Google Gemini</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Mapped Test: <code>gemini-3.8-flash</code></span>
                                                        </p>
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                        aiConfigs?.providers?.gemini?.configured 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200' 
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {aiConfigs?.providers?.gemini?.configured ? 'Active' : 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type={showAiSecrets.gemini ? 'text' : 'password'}
                                                        placeholder="AIzaSy..."
                                                        value={aiKeysInput.geminiApiKey}
                                                        onChange={(e) => setAiKeysInput(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                                                        className="input text-xs font-mono pr-9 w-full"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAiSecrets(prev => ({ ...prev, gemini: !prev.gemini }))}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        {showAiSecrets.gemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <a
                                                        href="https://aistudio.google.com/app/apikey"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        Get Key <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTestProvider('gemini')}
                                                        disabled={testingProvider === 'gemini'}
                                                        className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                                                    >
                                                        {testingProvider === 'gemini' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                        Test Key
                                                    </button>
                                                </div>

                                                {testResults.gemini && (
                                                    <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                                        testResults.gemini.status === 'success'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                                            : testResults.gemini.status === 'quota_exhausted'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200'
                                                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
                                                    }`}>
                                                        {testResults.gemini.status === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                                        <span className="leading-tight">{testResults.gemini.message} {testResults.gemini.latency ? `(${testResults.gemini.latency}ms)` : ''}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Groq */}
                                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Groq LPU</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Mapped Test: <code>llama-3.1-8b-instant</code></span>
                                                        </p>
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                        aiConfigs?.providers?.groq?.configured 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200' 
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {aiConfigs?.providers?.groq?.configured ? 'Active' : 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type={showAiSecrets.groq ? 'text' : 'password'}
                                                        placeholder="gsk_..."
                                                        value={aiKeysInput.groqApiKey}
                                                        onChange={(e) => setAiKeysInput(prev => ({ ...prev, groqApiKey: e.target.value }))}
                                                        className="input text-xs font-mono pr-9 w-full"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAiSecrets(prev => ({ ...prev, groq: !prev.groq }))}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        {showAiSecrets.groq ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <a
                                                        href="https://console.groq.com/keys"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        Get Key <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTestProvider('groq')}
                                                        disabled={testingProvider === 'groq'}
                                                        className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                                                    >
                                                        {testingProvider === 'groq' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                        Test Key
                                                    </button>
                                                </div>

                                                {testResults.groq && (
                                                    <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                                        testResults.groq.status === 'success'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                                            : testResults.groq.status === 'quota_exhausted'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200'
                                                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
                                                    }`}>
                                                        {testResults.groq.status === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                                        <span className="leading-tight">{testResults.groq.message} {testResults.groq.latency ? `(${testResults.groq.latency}ms)` : ''}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* SambaNova */}
                                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">SambaNova</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Mapped Test: <code>Meta-Llama-3.1-8B-Instruct</code></span>
                                                        </p>
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                        aiConfigs?.providers?.sambanova?.configured 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200' 
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {aiConfigs?.providers?.sambanova?.configured ? 'Active' : 'Not Set'}
                                                    </span>
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type={showAiSecrets.sambanova ? 'text' : 'password'}
                                                        placeholder="SambaNova key..."
                                                        value={aiKeysInput.sambanovaApiKey}
                                                        onChange={(e) => setAiKeysInput(prev => ({ ...prev, sambanovaApiKey: e.target.value }))}
                                                        className="input text-xs font-mono pr-9 w-full"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAiSecrets(prev => ({ ...prev, sambanova: !prev.sambanova }))}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        {showAiSecrets.sambanova ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <a
                                                        href="https://cloud.sambanova.ai/"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        Get Key <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTestProvider('sambanova')}
                                                        disabled={testingProvider === 'sambanova'}
                                                        className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                                                    >
                                                        {testingProvider === 'sambanova' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                        Test Key
                                                    </button>
                                                </div>

                                                {testResults.sambanova && (
                                                    <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                                                        testResults.sambanova.status === 'success'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                                                            : testResults.sambanova.status === 'quota_exhausted'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200'
                                                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
                                                    }`}>
                                                        {testResults.sambanova.status === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                                        <span className="leading-tight">{testResults.sambanova.message} {testResults.sambanova.latency ? `(${testResults.sambanova.latency}ms)` : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar / Render.com Deploy Guide */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            Hosting on Render.com or Production Cloud
                                        </h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                            Keys saved here persist locally in the backend data storage (<code className="font-mono">server/storage/ai_config.json</code>) and become active immediately without server reboot. You can also configure them directly in your cloud dashboard (e.g. Render Environment Variables: <code className="font-mono">OPENAI_API_KEY</code>, <code className="font-mono">ANTHROPIC_API_KEY</code>, <code className="font-mono">DEEPSEEK_API_KEY</code>, <code className="font-mono">OPENROUTER_API_KEY</code>, <code className="font-mono">GEMINI_API_KEY</code>, <code className="font-mono">GROQ_API_KEY</code>).
                                        </p>
                                    </div>

                                    {/* Bottom Save Button */}
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="button"
                                            onClick={handleSaveAiSettings}
                                            disabled={savingAiSettings}
                                            className="btn btn-primary text-sm flex items-center gap-2 px-6 py-2.5 shadow-md"
                                        >
                                            <Save className="w-4 h-4" />
                                            {savingAiSettings ? 'Saving Configuration...' : 'Save AI Configuration'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Reset Confirm Dialog */}
            <ConfirmDialog
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={handleResetGradeScales}
                title="Reset Grade Scales"
                message="This will reset all grade scales to the default CBSE pattern. Any custom grades will be deactivated. Continue?"
                type="warning"
                confirmText="Reset to Default"
            />
        </div>
    );
}
