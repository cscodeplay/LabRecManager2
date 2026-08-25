'use client';

import React, { useState } from 'react';

// Preset SVG Avatars Dictionary (with static and animated definitions)
export const AVATAR_PRESETS = [
    // 1. ANIMATED AVATARS
    {
        id: 'avatar:animated_cyber_bot',
        name: 'Cyber Bot',
        category: 'animated',
        badge: 'ANIMATED',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    <linearGradient id="botBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#1e1b4b" />
                    </linearGradient>
                    <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                <rect width="100" height="100" rx="50" fill="url(#botBg)" />
                {/* Antenna */}
                <line x1="50" y1="18" x2="50" y2="28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                <circle cx="50" cy="16" r="4" fill="#38bdf8" className="animate-ping origin-center" />
                <circle cx="50" cy="16" r="3" fill="#67e8f9" />
                {/* Bot Head */}
                <rect x="25" y="28" width="50" height="42" rx="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
                {/* Ear Bolts */}
                <rect x="19" y="42" width="6" height="14" rx="2" fill="#0284c7" />
                <rect x="75" y="42" width="6" height="14" rx="2" fill="#0284c7" />
                {/* Visor / Eye Screen */}
                <rect x="32" y="38" width="36" height="16" rx="6" fill="#030712" stroke="#0284c7" strokeWidth="1.5" />
                {/* Animated Visor Scan */}
                <circle cx="42" cy="46" r="4" fill="#00f0ff" filter="url(#glow)" className="animate-pulse" />
                <circle cx="58" cy="46" r="4" fill="#00f0ff" filter="url(#glow)" className="animate-pulse" />
                {/* Smile Bar */}
                <path d="M 40 60 Q 50 65 60 60" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* Neck & Body */}
                <rect x="42" y="70" width="16" height="8" fill="#334155" />
                <path d="M 20 84 Q 50 74 80 84 L 85 100 L 15 100 Z" fill="#0f766e" opacity="0.8" />
            </svg>
        )
    },
    {
        id: 'avatar:animated_astro_cat',
        name: 'Cosmo Cat',
        category: 'animated',
        badge: 'ANIMATED',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#18181b" />
                        <stop offset="100%" stopColor="#311042" />
                    </linearGradient>
                </defs>
                <rect width="100" height="100" rx="50" fill="url(#spaceGrad)" />
                {/* Orbiting star */}
                <circle cx="22" cy="24" r="2" fill="#fef08a" className="animate-ping" />
                <circle cx="80" cy="30" r="1.5" fill="#fef08a" className="animate-pulse" />
                <circle cx="75" cy="78" r="2" fill="#a7f3d0" className="animate-ping" />
                {/* Helmet */}
                <circle cx="50" cy="50" r="32" fill="rgba(255,255,255,0.15)" stroke="#e2e8f0" strokeWidth="2.5" />
                <ellipse cx="50" cy="50" rx="28" ry="26" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                {/* Cat Ears inside helmet */}
                <polygon points="32,32 38,20 46,30" fill="#f472b6" />
                <polygon points="68,32 62,20 54,30" fill="#f472b6" />
                {/* Cat Face */}
                <ellipse cx="50" cy="52" rx="18" ry="16" fill="#fb7185" />
                {/* Eyes */}
                <ellipse cx="43" cy="50" rx="3" ry="4" fill="#09090b" />
                <circle cx="44" cy="49" r="1.2" fill="#ffffff" />
                <ellipse cx="57" cy="50" rx="3" ry="4" fill="#09090b" />
                <circle cx="58" cy="49" r="1.2" fill="#ffffff" />
                {/* Nose & Whiskers */}
                <polygon points="49,54 51,54 50,56" fill="#ffffff" />
                <path d="M 33 53 L 40 54 M 33 56 L 39 56" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                <path d="M 67 53 L 60 54 M 67 56 L 61 56" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                {/* Helmet Glass Glow */}
                <path d="M 32 38 Q 50 32 68 38" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
        )
    },
    {
        id: 'avatar:animated_galaxy_pulse',
        name: 'Cosmic Pulsar',
        category: 'animated',
        badge: 'ANIMATED',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    <radialGradient id="pulsarGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#0f172a" />
                    </radialGradient>
                </defs>
                <rect width="100" height="100" rx="50" fill="#020617" />
                <circle cx="50" cy="50" r="38" fill="url(#pulsarGrad)" opacity="0.6" className="animate-pulse" />
                <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="#38bdf8" strokeWidth="2" transform="rotate(-25 50 50)" strokeDasharray="6 4" />
                <ellipse cx="50" cy="50" rx="36" ry="12" fill="none" stroke="#f43f5e" strokeWidth="2" transform="rotate(35 50 50)" />
                <circle cx="50" cy="50" r="14" fill="#ffffff" className="animate-ping origin-center" opacity="0.4" />
                <circle cx="50" cy="50" r="10" fill="#f8fafc" />
                <circle cx="50" cy="50" r="7" fill="#fbbf24" />
            </svg>
        )
    },
    {
        id: 'avatar:animated_neural_ai',
        name: 'Neural Mind',
        category: 'animated',
        badge: 'ANIMATED',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    <linearGradient id="neuralBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#030712" />
                        <stop offset="100%" stopColor="#064e3b" />
                    </linearGradient>
                </defs>
                <rect width="100" height="100" rx="50" fill="url(#neuralBg)" />
                {/* Synapse Lines */}
                <line x1="30" y1="35" x2="50" y2="25" stroke="#10b981" strokeWidth="1.5" />
                <line x1="50" y1="25" x2="70" y2="35" stroke="#10b981" strokeWidth="1.5" />
                <line x1="30" y1="35" x2="35" y2="60" stroke="#10b981" strokeWidth="1.5" />
                <line x1="70" y1="35" x2="65" y2="60" stroke="#10b981" strokeWidth="1.5" />
                <line x1="35" y1="60" x2="50" y2="75" stroke="#10b981" strokeWidth="1.5" />
                <line x1="65" y1="60" x2="50" y2="75" stroke="#10b981" strokeWidth="1.5" />
                <line x1="50" y1="25" x2="50" y2="50" stroke="#34d399" strokeWidth="2" />
                <line x1="30" y1="35" x2="50" y2="50" stroke="#34d399" strokeWidth="2" />
                <line x1="70" y1="35" x2="50" y2="50" stroke="#34d399" strokeWidth="2" />
                <line x1="35" y1="60" x2="50" y2="50" stroke="#34d399" strokeWidth="2" />
                <line x1="65" y1="60" x2="50" y2="50" stroke="#34d399" strokeWidth="2" />
                <line x1="50" y1="75" x2="50" y2="50" stroke="#34d399" strokeWidth="2" />
                {/* Synapse Nodes */}
                <circle cx="50" cy="50" r="8" fill="#10b981" className="animate-pulse" />
                <circle cx="50" cy="50" r="4" fill="#ecfdf5" />
                <circle cx="50" cy="25" r="5" fill="#34d399" />
                <circle cx="30" cy="35" r="4.5" fill="#6ee7b7" />
                <circle cx="70" cy="35" r="4.5" fill="#6ee7b7" />
                <circle cx="35" cy="60" r="4.5" fill="#34d399" />
                <circle cx="65" cy="60" r="4.5" fill="#34d399" />
                <circle cx="50" cy="75" r="5" fill="#059669" />
            </svg>
        )
    },
    {
        id: 'avatar:animated_waving_panda',
        name: 'Zen Panda',
        category: 'animated',
        badge: 'ANIMATED',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#ecfdf5" />
                {/* Panda Ears */}
                <circle cx="30" cy="28" r="11" fill="#18181b" />
                <circle cx="70" cy="28" r="11" fill="#18181b" />
                {/* Panda Head */}
                <circle cx="50" cy="55" r="32" fill="#ffffff" stroke="#e4e4e7" strokeWidth="2" />
                {/* Eye Patches */}
                <ellipse cx="38" cy="50" rx="8" ry="11" fill="#18181b" transform="rotate(-15 38 50)" />
                <ellipse cx="62" cy="50" rx="8" ry="11" fill="#18181b" transform="rotate(15 62 50)" />
                {/* Eyes */}
                <circle cx="38" cy="50" r="3" fill="#ffffff" />
                <circle cx="39" cy="49" r="1.5" fill="#000000" />
                <circle cx="62" cy="50" r="3" fill="#ffffff" />
                <circle cx="63" cy="49" r="1.5" fill="#000000" />
                {/* Nose & Mouth */}
                <ellipse cx="50" cy="60" rx="4" ry="3" fill="#18181b" />
                <path d="M 46 64 Q 50 68 54 64" stroke="#18181b" strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* Cheeks */}
                <circle cx="30" cy="58" r="4" fill="#fca5a5" opacity="0.7" className="animate-pulse" />
                <circle cx="70" cy="58" r="4" fill="#fca5a5" opacity="0.7" className="animate-pulse" />
            </svg>
        )
    },
    {
        id: 'avatar:animated_pixel_hero',
        name: 'Retro Pixel Hero',
        category: 'animated',
        badge: 'ANIMATED',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#1e1b4b" />
                {/* Pixel Grid Hair */}
                <rect x="30" y="22" width="40" height="12" fill="#f59e0b" />
                <rect x="24" y="30" width="12" height="18" fill="#f59e0b" />
                <rect x="64" y="30" width="12" height="18" fill="#f59e0b" />
                {/* Face */}
                <rect x="30" y="34" width="40" height="32" fill="#fed7aa" />
                {/* Sunglasses */}
                <rect x="28" y="40" width="44" height="12" fill="#09090b" />
                <rect x="32" y="44" width="8" height="4" fill="#38bdf8" className="animate-pulse" />
                <rect x="54" y="44" width="8" height="4" fill="#38bdf8" className="animate-pulse" />
                {/* Pixel Smile */}
                <rect x="42" y="58" width="16" height="4" fill="#ea580c" />
                {/* Shirt */}
                <rect x="20" y="66" width="60" height="34" fill="#8b5cf6" />
                <rect x="44" y="66" width="12" height="20" fill="#f8fafc" />
            </svg>
        )
    },

    // 2. SCHOLARS & FACULTY
    {
        id: 'avatar:scholar_professor_m',
        name: 'Professor Alan',
        category: 'scholars',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#0f172a" />
                {/* Hair */}
                <circle cx="50" cy="46" r="28" fill="#94a3b8" />
                {/* Face */}
                <circle cx="50" cy="50" r="22" fill="#fed7aa" />
                {/* Glasses */}
                <circle cx="42" cy="48" r="6" fill="none" stroke="#0284c7" strokeWidth="2" />
                <circle cx="58" cy="48" r="6" fill="none" stroke="#0284c7" strokeWidth="2" />
                <line x1="48" y1="48" x2="52" y2="48" stroke="#0284c7" strokeWidth="2" />
                {/* Beard */}
                <path d="M 38 56 Q 50 72 62 56 Z" fill="#94a3b8" />
                {/* Suit & Tie */}
                <path d="M 18 90 Q 50 74 82 90 L 88 100 L 12 100 Z" fill="#1e293b" />
                <polygon points="50,78 46,88 50,96 54,88" fill="#ef4444" />
            </svg>
        )
    },
    {
        id: 'avatar:scholar_professor_f',
        name: 'Dr. Sophia',
        category: 'scholars',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#312e81" />
                {/* Hair */}
                <ellipse cx="50" cy="48" rx="26" ry="28" fill="#78350f" />
                {/* Face */}
                <circle cx="50" cy="52" r="20" fill="#fcd34d" />
                <path d="M 32 38 Q 50 30 68 38 Q 50 48 32 38" fill="#78350f" />
                {/* Glasses */}
                <rect x="36" y="48" width="11" height="8" rx="2" fill="none" stroke="#d97706" strokeWidth="1.8" />
                <rect x="53" y="48" width="11" height="8" rx="2" fill="none" stroke="#d97706" strokeWidth="1.8" />
                <line x1="47" y1="52" x2="53" y2="52" stroke="#d97706" strokeWidth="1.8" />
                {/* Smile */}
                <path d="M 44 63 Q 50 68 56 63" stroke="#b45309" strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* Coat */}
                <path d="M 16 90 Q 50 76 84 90 L 90 100 L 10 100 Z" fill="#f8fafc" />
                <polygon points="50,80 44,92 50,100 56,92" fill="#0284c7" />
            </svg>
        )
    },
    {
        id: 'avatar:scholar_student_grad',
        name: 'Graduate Scholar',
        category: 'scholars',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#1e3a8a" />
                {/* Face */}
                <circle cx="50" cy="54" r="20" fill="#fed7aa" />
                {/* Eyes & Smile */}
                <circle cx="43" cy="52" r="2.5" fill="#0f172a" />
                <circle cx="57" cy="52" r="2.5" fill="#0f172a" />
                <path d="M 44 62 Q 50 67 56 62" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* Graduation Cap */}
                <polygon points="50,18 85,28 50,38 15,28" fill="#111827" stroke="#374151" strokeWidth="1" />
                <rect x="36" y="34" width="28" height="10" fill="#1f2937" />
                {/* Cap Tassel */}
                <line x1="50" y1="28" x2="80" y2="38" stroke="#f59e0b" strokeWidth="2" />
                <circle cx="80" cy="40" r="3" fill="#f59e0b" />
                {/* Gown */}
                <path d="M 16 90 Q 50 76 84 90 L 90 100 L 10 100 Z" fill="#111827" />
                <polygon points="50,80 45,95 55,95" fill="#3b82f6" />
            </svg>
        )
    },
    {
        id: 'avatar:scholar_scientist_lab',
        name: 'Lab Scientist',
        category: 'scholars',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#042f2e" />
                {/* Hair */}
                <circle cx="50" cy="46" r="24" fill="#0284c7" />
                {/* Face */}
                <circle cx="50" cy="50" r="19" fill="#fed7aa" />
                {/* Safety Goggles */}
                <rect x="32" y="44" width="36" height="12" rx="6" fill="#06b6d4" opacity="0.8" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="41" cy="50" r="2" fill="#ffffff" />
                <circle cx="59" cy="50" r="2" fill="#ffffff" />
                {/* Smile */}
                <path d="M 44 60 Q 50 64 56 60" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                {/* Lab Coat */}
                <path d="M 18 90 Q 50 75 82 90 L 88 100 L 12 100 Z" fill="#f8fafc" />
                {/* Pen in pocket */}
                <rect x="62" y="86" width="3" height="10" rx="1" fill="#ef4444" />
            </svg>
        )
    },

    // 3. TECH & ROBOTS
    {
        id: 'avatar:tech_mecha_gold',
        name: 'Golden Mecha',
        category: 'tech',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#451a03" />
                {/* Mecha Head Frame */}
                <polygon points="50,16 80,32 75,70 50,84 25,70 20,32" fill="#d97706" stroke="#fef3c7" strokeWidth="2" />
                {/* Face Plate */}
                <polygon points="50,26 70,38 65,64 50,72 35,64 30,38" fill="#18181b" />
                {/* Gold Optics */}
                <line x1="38" y1="46" x2="62" y2="46" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
                <circle cx="50" cy="46" r="3" fill="#ffffff" />
                {/* Core Vent */}
                <polygon points="50,56 58,62 42,62" fill="#ef4444" />
            </svg>
        )
    },
    {
        id: 'avatar:tech_neon_matrix',
        name: 'Matrix Hacker',
        category: 'tech',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#022c22" />
                {/* Hood */}
                <path d="M 20 86 Q 50 14 80 86 Z" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
                {/* Dark Face */}
                <ellipse cx="50" cy="56" rx="18" ry="20" fill="#020617" />
                {/* Neon Cyan Code Eyes */}
                <text x="36" y="58" fill="#34d399" fontSize="11" fontFamily="monospace" fontWeight="bold">&lt;/&gt;</text>
                {/* Binary Rain bits */}
                <circle cx="26" cy="30" r="1.5" fill="#10b981" />
                <circle cx="74" cy="40" r="1.5" fill="#10b981" />
                <circle cx="50" cy="80" r="1.5" fill="#34d399" />
            </svg>
        )
    },
    {
        id: 'avatar:tech_android_3000',
        name: 'Android 3000',
        category: 'tech',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#0c4a6e" />
                {/* Head Shell */}
                <ellipse cx="50" cy="48" rx="26" ry="28" fill="#f0f9ff" stroke="#38bdf8" strokeWidth="2" />
                {/* Ear Pods */}
                <circle cx="22" cy="48" r="6" fill="#0284c7" />
                <circle cx="78" cy="48" r="6" fill="#0284c7" />
                {/* LED Eyes */}
                <circle cx="40" cy="46" r="5" fill="#0ea5e9" />
                <circle cx="60" cy="46" r="5" fill="#0ea5e9" />
                <circle cx="41" cy="45" r="1.5" fill="#ffffff" />
                <circle cx="61" cy="45" r="1.5" fill="#ffffff" />
                {/* Mouth Line */}
                <line x1="42" y1="62" x2="58" y2="62" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
                {/* Torso */}
                <path d="M 22 92 Q 50 78 78 92 L 84 100 L 16 100 Z" fill="#0284c7" />
            </svg>
        )
    },

    // 4. ANIMALS & FUN
    {
        id: 'avatar:animal_coding_fox',
        name: 'Smart Fox',
        category: 'animals',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#431407" />
                {/* Ears */}
                <polygon points="26,38 18,12 44,26" fill="#ea580c" />
                <polygon points="26,34 22,18 38,26" fill="#ffffff" />
                <polygon points="74,38 82,12 56,26" fill="#ea580c" />
                <polygon points="74,34 78,18 62,26" fill="#ffffff" />
                {/* Fox Head */}
                <polygon points="50,80 84,40 16,40" fill="#f97316" />
                {/* White Cheeks */}
                <polygon points="50,80 84,40 60,56" fill="#fff7ed" />
                <polygon points="50,80 16,40 40,56" fill="#fff7ed" />
                {/* Nose */}
                <circle cx="50" cy="76" r="4" fill="#09090b" />
                {/* Glasses */}
                <circle cx="36" cy="44" r="7" fill="none" stroke="#09090b" strokeWidth="2.5" />
                <circle cx="64" cy="44" r="7" fill="none" stroke="#09090b" strokeWidth="2.5" />
                <line x1="43" y1="44" x2="57" y2="44" stroke="#09090b" strokeWidth="2.5" />
            </svg>
        )
    },
    {
        id: 'avatar:animal_wise_owl',
        name: 'Professor Owl',
        category: 'animals',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#1e1b4b" />
                {/* Feather Ears */}
                <polygon points="28,20 38,36 24,38" fill="#7c3aed" />
                <polygon points="72,20 62,36 76,38" fill="#7c3aed" />
                {/* Owl Body */}
                <ellipse cx="50" cy="56" rx="30" ry="28" fill="#6d28d9" />
                {/* Eye Circles */}
                <circle cx="38" cy="48" r="13" fill="#fbbf24" stroke="#4c1d95" strokeWidth="2" />
                <circle cx="62" cy="48" r="13" fill="#fbbf24" stroke="#4c1d95" strokeWidth="2" />
                <circle cx="38" cy="48" r="6" fill="#09090b" />
                <circle cx="62" cy="48" r="6" fill="#09090b" />
                <circle cx="40" cy="46" r="2" fill="#ffffff" />
                <circle cx="64" cy="46" r="2" fill="#ffffff" />
                {/* Beak */}
                <polygon points="50,56 46,64 54,64" fill="#f97316" />
                {/* Belly Feathers */}
                <path d="M 42 72 Q 50 76 58 72" stroke="#ddd6fe" strokeWidth="2" fill="none" />
                <path d="M 44 78 Q 50 82 56 78" stroke="#ddd6fe" strokeWidth="2" fill="none" />
            </svg>
        )
    },
    {
        id: 'avatar:animal_magic_unicorn',
        name: 'Starlight Unicorn',
        category: 'animals',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" rx="50" fill="#fdf2f8" />
                {/* Magic Horn */}
                <polygon points="50,10 44,35 56,35" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
                {/* Mane */}
                <path d="M 28 35 Q 20 60 35 75 Q 30 50 38 38" fill="#ec4899" />
                <path d="M 72 35 Q 80 60 65 75 Q 70 50 62 38" fill="#a855f7" />
                {/* Unicorn Head */}
                <ellipse cx="50" cy="54" rx="22" ry="24" fill="#ffffff" stroke="#fbcfe8" strokeWidth="2" />
                {/* Eyes */}
                <path d="M 40 50 Q 44 46 48 50" stroke="#be185d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 52 50 Q 56 46 60 50" stroke="#be185d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                {/* Star on Cheek */}
                <circle cx="38" cy="62" r="3" fill="#f472b6" opacity="0.6" />
                <circle cx="62" cy="62" r="3" fill="#f472b6" opacity="0.6" />
            </svg>
        )
    },

    // 5. MODERN MINIMAL & GRADIENTS
    {
        id: 'avatar:minimal_sunset',
        name: 'Sunset Fusion',
        category: 'minimal',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    <linearGradient id="sunsetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="50%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                </defs>
                <rect width="100" height="100" rx="50" fill="url(#sunsetGrad)" />
                <circle cx="50" cy="50" r="28" fill="rgba(255,255,255,0.25)" />
                <circle cx="50" cy="50" r="16" fill="rgba(255,255,255,0.4)" />
                <circle cx="50" cy="50" r="6" fill="#ffffff" />
            </svg>
        )
    },
    {
        id: 'avatar:minimal_aurora',
        name: 'Aurora Borealis',
        category: 'minimal',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    <linearGradient id="auroraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#065f46" />
                        <stop offset="50%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                </defs>
                <rect width="100" height="100" rx="50" fill="url(#auroraGrad)" />
                <polygon points="50,22 74,68 26,68" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" />
                <polygon points="50,78 26,32 74,32" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                <circle cx="50" cy="50" r="8" fill="#ffffff" />
            </svg>
        )
    },
    {
        id: 'avatar:minimal_amethyst',
        name: 'Royal Amethyst',
        category: 'minimal',
        svg: (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    <linearGradient id="amethystGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4c1d95" />
                        <stop offset="50%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                </defs>
                <rect width="100" height="100" rx="50" fill="url(#amethystGrad)" />
                <polygon points="50,20 78,50 50,80 22,50" fill="rgba(255,255,255,0.2)" stroke="#ffffff" strokeWidth="2" />
                <polygon points="50,32 66,50 50,68 34,50" fill="rgba(255,255,255,0.5)" />
            </svg>
        )
    }
];

export default function UserAvatar({
    user,
    size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl', '2xl'
    className = '',
    onClick = null,
    showOnlineStatus = false,
    isOnline = false
}) {
    const [imgError, setImgError] = useState(false);

    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-xl',
        '2xl': 'w-24 h-24 text-3xl',
        '3xl': 'w-32 h-32 text-4xl'
    };

    const dimensionClass = sizeClasses[size] || sizeClasses.md;
    const avatarValue = user?.profileImageUrl || user?.avatarUrl;

    // Check if preset avatar
    const preset = avatarValue?.startsWith('avatar:')
        ? AVATAR_PRESETS.find(p => p.id === avatarValue)
        : null;

    const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U';

    const getRoleGradient = (role) => {
        switch (role) {
            case 'admin': return 'from-rose-500 to-red-600';
            case 'principal': return 'from-purple-600 to-indigo-700';
            case 'instructor': return 'from-blue-500 to-cyan-600';
            case 'lab_assistant': return 'from-emerald-500 to-teal-600';
            case 'student': return 'from-amber-500 to-orange-600';
            default: return 'from-primary-500 to-primary-700';
        }
    };

    return (
        <div
            onClick={onClick}
            className={`relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 select-none ${dimensionClass} ${onClick ? 'cursor-pointer hover:opacity-90 transition' : ''} ${className}`}
        >
            {preset ? (
                <div className="w-full h-full flex items-center justify-center">
                    {preset.svg}
                </div>
            ) : avatarValue && !imgError ? (
                <img
                    src={avatarValue}
                    alt={user?.firstName || 'Avatar'}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover rounded-full"
                />
            ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getRoleGradient(user?.role)} flex items-center justify-center text-white font-semibold shadow-inner`}>
                    {initials}
                </div>
            )}

            {/* Online / Active Pulse indicator if requested */}
            {showOnlineStatus && (
                <span className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-slate-900 ${
                    size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
                } ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            )}
        </div>
    );
}
