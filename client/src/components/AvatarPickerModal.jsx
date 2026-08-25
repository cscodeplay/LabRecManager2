'use client';

import React, { useState, useRef } from 'react';
import {
    Sparkles, GraduationCap, Cpu, Cat, Palette, Upload,
    Check, X, RefreshCw, Trash2, Camera
} from 'lucide-react';
import UserAvatar, { AVATAR_PRESETS } from './UserAvatar';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const CATEGORIES = [
    { id: 'all', label: 'All Avatars', icon: Sparkles },
    { id: 'animated', label: '✨ Animated', icon: Sparkles, highlight: true },
    { id: 'scholars', label: '🎓 Scholars', icon: GraduationCap },
    { id: 'tech', label: '🤖 Tech & Bots', icon: Cpu },
    { id: 'animals', label: '🦊 Animals', icon: Cat },
    { id: 'minimal', label: '🎨 Gradients', icon: Palette },
];

export default function AvatarPickerModal({ isOpen, onClose, onAvatarUpdated }) {
    const { user } = useAuthStore();
    const [activeCategory, setActiveCategory] = useState('animated');
    const [selectedAvatar, setSelectedAvatar] = useState(user?.profileImageUrl || 'avatar:animated_cyber_bot');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const filteredPresets = activeCategory === 'all'
        ? AVATAR_PRESETS
        : AVATAR_PRESETS.filter(p => p.category === activeCategory);

    const handleSelect = (presetId) => {
        setSelectedAvatar(presetId);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await authAPI.updateProfile({
                profileImageUrl: selectedAvatar
            });
            const updatedUser = res.data?.data?.user;
            
            // Sync with auth store
            useAuthStore.getState().setAuth(
                { ...user, profileImageUrl: selectedAvatar, ...(updatedUser || {}) },
                useAuthStore.getState().accessToken,
                useAuthStore.getState().refreshToken
            );

            toast.success('Avatar updated successfully!', { icon: '✨' });
            if (onAvatarUpdated) onAvatarUpdated(selectedAvatar);
            onClose();
        } catch (error) {
            console.error('Failed to update avatar:', error);
            toast.error(error.response?.data?.message || 'Failed to update avatar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveAvatar = async () => {
        setIsSaving(true);
        try {
            await authAPI.updateProfile({
                profileImageUrl: null
            });
            useAuthStore.getState().setAuth(
                { ...user, profileImageUrl: null },
                useAuthStore.getState().accessToken,
                useAuthStore.getState().refreshToken
            );
            setSelectedAvatar('');
            toast.success('Avatar reset to default initials');
            if (onAvatarUpdated) onAvatarUpdated(null);
            onClose();
        } catch (error) {
            toast.error('Failed to remove avatar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (PNG, JPG, GIF, SVG)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be under 5MB');
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            setSelectedAvatar(dataUrl);
            setIsUploading(false);
            toast.success('Custom image loaded! Click Save to apply.', { icon: '🖼️' });
        };
        reader.onerror = () => {
            setIsUploading(false);
            toast.error('Failed to read image file');
        };
        reader.readAsDataURL(file);
    };

    const previewUser = {
        ...user,
        profileImageUrl: selectedAvatar
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Choose Profile Avatar
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Pick from live-animating characters, faculty scholars, or upload a custom image
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Selected Preview Banner */}
                <div className="p-4 bg-gradient-to-r from-indigo-50/70 via-purple-50/70 to-pink-50/70 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative p-1 rounded-full bg-white dark:bg-slate-800 shadow-md ring-2 ring-indigo-500/30">
                            <UserAvatar user={previewUser} size="xl" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {user?.firstName} {user?.lastName}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                                    {user?.role?.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {selectedAvatar?.startsWith('avatar:animated') ? (
                                    <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                                        <Sparkles className="w-3 h-3 animate-spin" /> Live Animating Avatar Active
                                    </span>
                                ) : selectedAvatar?.startsWith('data:') ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Custom Image Ready</span>
                                ) : selectedAvatar ? (
                                    <span className="text-slate-600 dark:text-slate-400">Preset Avatar Selected</span>
                                ) : (
                                    <span className="text-slate-400">Default Initials Avatar</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-sm btn-secondary flex items-center gap-1.5 text-xs"
                            disabled={isUploading}
                        >
                            <Camera className="w-3.5 h-3.5" />
                            {isUploading ? 'Loading...' : 'Upload Image'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>

                {/* Category Navigation */}
                <div className="px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
                    {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                                        : cat.highlight
                                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* Avatars Grid */}
                <div className="p-6 overflow-y-auto max-h-[50vh] flex-1">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {filteredPresets.map((preset) => {
                            const isSelected = selectedAvatar === preset.id;
                            const isAnimated = preset.category === 'animated';

                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleSelect(preset.id)}
                                    className={`group relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all text-center ${
                                        isSelected
                                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md scale-105'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    {/* Animated Pill Badge */}
                                    {isAnimated && (
                                        <span className="absolute -top-2 px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm">
                                            LIVE
                                        </span>
                                    )}

                                    {/* Selection Indicator Checkmark */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </div>
                                    )}

                                    {/* Avatar SVG Preview */}
                                    <div className="w-14 h-14 rounded-full overflow-hidden shadow-inner flex items-center justify-center transition-transform group-hover:scale-110">
                                        {preset.svg}
                                    </div>

                                    {/* Preset Name */}
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 truncate w-full">
                                        {preset.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={isSaving}
                        className="btn btn-sm btn-ghost text-slate-500 hover:text-red-600 flex items-center gap-1.5 text-xs"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Reset to Initials
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="btn btn-sm btn-secondary text-xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn btn-sm btn-primary flex items-center gap-1.5 text-xs px-4"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {isSaving ? 'Saving Avatar...' : 'Set as My Avatar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
