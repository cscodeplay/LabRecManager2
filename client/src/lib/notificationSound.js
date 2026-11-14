'use client';

/**
 * High-fidelity, zero-dependency notification chime using Web Audio API.
 * Synthesizes a gentle dual-frequency institutional chime (D5 -> A5)
 * with graceful envelope decay and real-time volume control (0% to 100%).
 * Guaranteed to work offline, on iOS Safari, and across physical iPads.
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

const STORAGE_KEY_MUTED = 'ulrms_notification_sound_muted';
const STORAGE_KEY_VOLUME = 'ulrms_notification_sound_volume';

/**
 * Get current volume as float between 0.0 and 1.0 (defaults to 0.7 = 70%)
 */
export function getNotificationVolume() {
    if (typeof window === 'undefined') return 0.7;
    try {
        const val = localStorage.getItem(STORAGE_KEY_VOLUME);
        if (val === null) return 0.7;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0.7 : Math.max(0, Math.min(1, parsed));
    } catch {
        return 0.7;
    }
}

/**
 * Set notification volume (0.0 to 1.0) and persist to localStorage
 */
export function setNotificationVolume(volume) {
    if (typeof window === 'undefined') return;
    try {
        const clamped = Math.max(0, Math.min(1, Number(volume) || 0));
        localStorage.setItem(STORAGE_KEY_VOLUME, clamped.toFixed(2));
        
        // If volume set to 0, automatically mute; if set above 0, unmute
        if (clamped === 0 && !isNotificationSoundMuted()) {
            setNotificationSoundMuted(true);
        } else if (clamped > 0 && isNotificationSoundMuted()) {
            setNotificationSoundMuted(false);
        }

        window.dispatchEvent(new CustomEvent('notification-sound-volume-changed', {
            detail: { volume: clamped }
        }));
    } catch {
        // ignore
    }
}

/**
 * Check if notification sound is muted
 */
export function isNotificationSoundMuted() {
    if (typeof window === 'undefined') return false;
    try {
        const val = localStorage.getItem(STORAGE_KEY_MUTED);
        return val === 'true';
    } catch {
        return false;
    }
}

/**
 * Set mute state and dispatch notification-sound-muted-changed event
 */
export function setNotificationSoundMuted(muted) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_MUTED, muted ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('notification-sound-muted-changed', {
            detail: { muted: Boolean(muted) }
        }));
    } catch {
        // ignore
    }
}

/**
 * Toggle mute state
 */
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
 * 
 * Scaled smoothly by the current volume setting (0.0 to 1.0).
 */
export function playNotificationSound({ force = false, testVolume = null } = {}) {
    const isMuted = isNotificationSoundMuted();
    if (!force && isMuted) {
        return;
    }

    const volume = testVolume !== null ? testVolume : getNotificationVolume();
    if (volume <= 0 && !force) {
        return;
    }

    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Master gain node scaled by user-selected volume (0.0 to 1.0)
        // Default max gain of 0.28 gives clean institutional clarity without clipping
        const baseGain = 0.28 * Math.max(0.05, volume);
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(baseGain, now);

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
        console.warn('Audio playback not permitted or unavailable:', err);
    }
}
