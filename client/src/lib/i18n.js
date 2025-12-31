'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import all translation files
import enCommon from '../../public/locales/en/common.json';
import hiCommon from '../../public/locales/hi/common.json';
import bnCommon from '../../public/locales/bn/common.json';
import teCommon from '../../public/locales/te/common.json';
import mrCommon from '../../public/locales/mr/common.json';
import taCommon from '../../public/locales/ta/common.json';
import guCommon from '../../public/locales/gu/common.json';
import knCommon from '../../public/locales/kn/common.json';
import mlCommon from '../../public/locales/ml/common.json';
import orCommon from '../../public/locales/or/common.json';
import paCommon from '../../public/locales/pa/common.json';
import asCommon from '../../public/locales/as/common.json';
import saCommon from '../../public/locales/sa/common.json';
import urCommon from '../../public/locales/ur/common.json';
import neCommon from '../../public/locales/ne/common.json';
import frCommon from '../../public/locales/fr/common.json';
import esCommon from '../../public/locales/es/common.json';

// List of all supported languages with metadata
export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', group: 'international' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', group: 'indian' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', group: 'indian' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', group: 'indian' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr', group: 'indian' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', group: 'indian' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr', group: 'indian' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr', group: 'indian' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr', group: 'indian' },
    { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dir: 'ltr', group: 'indian' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr', group: 'indian' },
    { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', dir: 'ltr', group: 'indian' },
    { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', dir: 'ltr', group: 'indian' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', group: 'indian' },
    { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr', group: 'indian' },
    { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', group: 'international' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', group: 'international' },
];

const resources = {
    en: { common: enCommon },
    hi: { common: hiCommon },
    bn: { common: bnCommon },
    te: { common: teCommon },
    mr: { common: mrCommon },
    ta: { common: taCommon },
    gu: { common: guCommon },
    kn: { common: knCommon },
    ml: { common: mlCommon },
    or: { common: orCommon },
    pa: { common: paCommon },
    as: { common: asCommon },
    sa: { common: saCommon },
    ur: { common: urCommon },
    ne: { common: neCommon },
    fr: { common: frCommon },
    es: { common: esCommon },
};

// Get initial language from localStorage or default to English
const getInitialLanguage = () => {
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem('language-storage');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.state?.language) {
                    return parsed.state.language;
                }
            }
        } catch (e) {
            console.warn('Failed to parse stored language:', e);
        }
    }
    return 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getInitialLanguage(),
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: ['common'],
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
