'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/lib/store';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

export default function LanguageSelector({ isCollapsed = false }) {
    const { t, i18n } = useTranslation('common');
    const { language, setLanguage } = useLanguageStore();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (langCode) => {
        setLanguage(langCode);
        i18n.changeLanguage(langCode);
        setIsOpen(false);
        setSearchQuery('');

        // Handle RTL for Urdu
        const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
        if (selectedLang?.dir === 'rtl') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    };

    const filteredLanguages = SUPPORTED_LANGUAGES.filter(lang =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const indianLanguages = filteredLanguages.filter(l => l.group === 'indian');
    const internationalLanguages = filteredLanguages.filter(l => l.group === 'international');

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg 
                    text-slate-600 dark:text-slate-400 
                    hover:bg-slate-100 dark:hover:bg-slate-800 
                    transition w-full ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? t('language.selectLanguage') : undefined}
            >
                <Globe className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                    <>
                        <span className="font-medium text-sm flex-1 text-left truncate">
                            {currentLang.nativeName}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {isOpen && (
                <div className={`absolute ${isCollapsed ? 'left-full ml-2' : 'left-0'} bottom-full mb-2 
                    w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl 
                    border border-slate-200 dark:border-slate-700 
                    overflow-hidden z-50`}
                >
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('common.search') + '...'}
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg
                                    bg-slate-100 dark:bg-slate-700
                                    border-none focus:ring-2 focus:ring-primary-500
                                    text-slate-900 dark:text-slate-100
                                    placeholder:text-slate-400"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Language List */}
                    <div className="max-h-64 overflow-y-auto">
                        {/* International Languages */}
                        {internationalLanguages.length > 0 && (
                            <div>
                                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                                    {t('language.internationalLanguages')}
                                </div>
                                {internationalLanguages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageChange(lang.code)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-left
                                            hover:bg-slate-100 dark:hover:bg-slate-700 transition
                                            ${language === lang.code ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                                    >
                                        <span className="flex-1">
                                            <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {lang.nativeName}
                                            </span>
                                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                                                {lang.name}
                                            </span>
                                        </span>
                                        {language === lang.code && (
                                            <Check className="w-4 h-4 text-primary-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Indian Languages */}
                        {indianLanguages.length > 0 && (
                            <div>
                                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                                    {t('language.indianLanguages')}
                                </div>
                                {indianLanguages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageChange(lang.code)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-left
                                            hover:bg-slate-100 dark:hover:bg-slate-700 transition
                                            ${language === lang.code ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                                    >
                                        <span className="flex-1">
                                            <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {lang.nativeName}
                                            </span>
                                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                                                {lang.name}
                                            </span>
                                        </span>
                                        {language === lang.code && (
                                            <Check className="w-4 h-4 text-primary-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredLanguages.length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                                {t('common.noData')}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
