'use client';

/**
 * High-fidelity, zero-dependency notification chime using Web Audio API.
 * Synthesizes a gentle dual-frequency institutional chime (D5 -> A5)
 * with graceful envelope decay, guaranteed to work offline and on iOS Safari.
 */

let audioCtx = null;

function getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

const STORAGE_KEY = 'ulrms_notification_sound_muted';

export function isNotificationSoundMuted() {
    if (typeof window === 'undefined') return false;
    try {
        const val = localStorage.getItem(STORAGE_KEY);
        return val === 'true';
    } catch {
        return false;
    }
}

export function setNotificationSoundMuted(muted) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('notification-sound-muted-changed', { detail: { muted } }));
    } catch {
        // ignore
    }
}

export function toggleNotificationSoundMuted() {
    const current = isNotificationSoundMuted();
    const next = !current;
    setNotificationSoundMuted(next);
    return next;
}

/**
 * Plays an elegant 2-tone melodic notification chime:
 * Tone 1: 587.33 Hz (D5) for 80ms
 * Tone 2: 880.00 Hz (A5) for 320ms with soft exponential decay
 */
export function playNotificationSound({ force = false } = {}) {
    if (!force && isNotificationSoundMuted()) {
        return;
    }

    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Master gain node
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.22, now);

        // Note 1 (D5 - 587.33Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.14);

        // Note 2 (A5 - 880.00Hz) - chiming an octave fifth above
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.08);
        gain2.gain.setValueAtTime(0.001, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.10);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.50);
    } catch (err) {
        // AudioContext may be blocked if user hasn't interacted with page yet
        console.warn('[NotificationSound] Audio playback prevented:', err);
    }
}
