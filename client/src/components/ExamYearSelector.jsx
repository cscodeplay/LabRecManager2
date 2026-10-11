'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Plus, Sparkles, Check, HelpCircle, Layers } from 'lucide-react';
import { quizAPI } from '@/lib/api';

const POPULAR_EXAMS = [
    { id: 'GATE', label: 'GATE', desc: 'Computer Science & Engineering' },
    { id: 'ISRO', label: 'ISRO', desc: 'Scientist/Engineer ICRB' },
    { id: 'BARC', label: 'BARC', desc: 'OCES/DGFS Scientific Officer' },
    { id: 'UGC-NET', label: 'UGC-NET', desc: 'Paper 2 CS & Applications' },
    { id: 'NIELIT', label: 'NIELIT', desc: 'Scientist B & Technical Asst.' },
    { id: 'JEE', label: 'JEE Main', desc: 'Engineering Entrance PCM' },
    { id: 'JEE Advanced', label: 'JEE Adv.', desc: 'IIT Engineering Entrance' },
    { id: 'NEET', label: 'NEET', desc: 'Medical Entrance' },
    { id: 'UPSC', label: 'UPSC', desc: 'Civil Services & CDS' },
    { id: 'PSEB', label: 'PSEB', desc: 'Punjab School Education Board' },
    { id: 'CBSE', label: 'CBSE', desc: 'Central Board of Secondary Education' }
];

const PRESET_YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', 'Any'];

export default function ExamYearSelector({
    selectedExams = [],
    onChangeExams,
    selectedYears = [],
    onChangeYears,
    topic = '',
    questionFormat = 'all',
    onChangeQuestionFormat
}) {
    const [examInput, setExamInput] = useState('');
    const [relatedExams, setRelatedExams] = useState([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);

    // Fetch related exams whenever selectedExams or topic changes
    useEffect(() => {
        let active = true;
        const fetchRelated = async () => {
            if (selectedExams.length === 0 && !topic) {
                setRelatedExams([]);
                return;
            }
            try {
                setIsLoadingRelated(true);
                const res = await quizAPI.getRelatedExams({
                    examTypes: selectedExams.join(','),
                    topic: topic.trim()
                });
                if (active && res.data?.success) {
                    // Filter out already selected exams
                    const filtered = (res.data.data.relatedExams || []).filter(
                        rel => !selectedExams.some(e => e.toUpperCase() === rel.id.toUpperCase())
                    );
                    setRelatedExams(filtered);
                }
            } catch (err) {
                console.warn('Failed to load related exams', err);
            } finally {
                if (active) setIsLoadingRelated(false);
            }
        };

        const timer = setTimeout(fetchRelated, 300);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [selectedExams.join(','), topic]);

    const handleAddExam = (examName) => {
        const trimmed = examName.trim();
        if (!trimmed) return;
        if (!selectedExams.some(e => e.toUpperCase() === trimmed.toUpperCase())) {
            onChangeExams([...selectedExams, trimmed]);
        }
        setExamInput('');
    };

    const handleRemoveExam = (examName) => {
        onChangeExams(selectedExams.filter(e => e.toUpperCase() !== examName.toUpperCase()));
    };

    const handleToggleYear = (year) => {
        if (year === 'Any') {
            onChangeYears(['Any']);
            return;
        }

        const cleanYears = selectedYears.filter(y => y !== 'Any');
        if (cleanYears.includes(year)) {
            const next = cleanYears.filter(y => y !== year);
            onChangeYears(next.length === 0 ? ['Any'] : next);
        } else {
            onChangeYears([...cleanYears, year]);
        }
    };

    const handleQuickYears = (type) => {
        if (type === 'last3') {
            onChangeYears(['2025', '2024', '2023']);
        } else if (type === 'last5') {
            onChangeYears(['2025', '2024', '2023', '2022', '2021']);
        } else if (type === 'all') {
            onChangeYears(['Any']);
        }
    };

    return (
        <div className="space-y-3.5">
            {/* 1. EXAMS MULTI-SELECT SECTION */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary-500" />
                        Target Exams (Select one or multiple)
                    </label>
                    <span className="text-[10px] text-slate-400">
                        {selectedExams.length} selected
                    </span>
                </div>

                {/* Selected Exam Chips */}
                {selectedExams.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                        {selectedExams.map((exam) => (
                            <span
                                key={exam}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-600 text-white shadow-xs"
                            >
                                <span>🏛️</span>
                                <span>{exam}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveExam(exam)}
                                    className="p-0.5 hover:bg-primary-700 rounded-md transition"
                                    title={`Remove ${exam}`}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Popular Exam Presets */}
                <div className="flex flex-wrap gap-1.5">
                    {POPULAR_EXAMS.map((item) => {
                        const isSelected = selectedExams.some(e => e.toUpperCase() === item.id.toUpperCase());
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => isSelected ? handleRemoveExam(item.id) : handleAddExam(item.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border flex items-center gap-1 ${
                                    isSelected
                                        ? 'bg-primary-100 dark:bg-primary-950/60 border-primary-400 text-primary-700 dark:text-primary-300 font-bold'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                                title={item.desc}
                            >
                                <span>{item.label}</span>
                                {isSelected ? <Check className="w-3 h-3 text-primary-600" /> : <Plus className="w-2.5 h-2.5 opacity-60" />}
                            </button>
                        );
                    })}
                </div>

                {/* Custom Exam Search / Add Input */}
                <div className="relative">
                    <input
                        type="text"
                        value={examInput}
                        onChange={(e) => setExamInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddExam(examInput);
                            }
                        }}
                        placeholder="Search or type any exam name (e.g. NIELIT, WBJEE, TIFR) and press Enter..."
                        className="w-full pl-8 pr-16 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-800 dark:text-slate-200"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    {examInput.trim() && (
                        <button
                            type="button"
                            onClick={() => handleAddExam(examInput)}
                            className="absolute right-1.5 top-1 px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-[10px] font-bold transition"
                        >
                            + Add
                        </button>
                    )}
                </div>

                {/* 2. DISCOVER RELATED EXAMS BAR */}
                {relatedExams.length > 0 && (
                    <div className="p-2.5 bg-gradient-to-r from-amber-50/80 to-indigo-50/80 dark:from-amber-950/20 dark:to-indigo-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                Discovered Related Exams (Overlapping Syllabus):
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">Click to include</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {relatedExams.slice(0, 6).map((rel) => (
                                <button
                                    key={rel.id}
                                    type="button"
                                    onClick={() => handleAddExam(rel.id)}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-amber-300/80 dark:border-amber-800/60 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 transition flex items-center gap-1 shadow-xs"
                                    title={rel.overlap}
                                >
                                    <span>+</span>
                                    <span>{rel.id}</span>
                                    {rel.inDatabase && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Available in Question Bank" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 3. EXAMINATION YEARS MULTI-SELECT SECTION */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Examination Years
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                            type="button"
                            onClick={() => handleQuickYears('last3')}
                            className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                        >
                            Last 3 Years
                        </button>
                        <span>•</span>
                        <button
                            type="button"
                            onClick={() => handleQuickYears('last5')}
                            className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                        >
                            Last 5 Years
                        </button>
                        <span>•</span>
                        <button
                            type="button"
                            onClick={() => handleQuickYears('all')}
                            className="text-slate-500 hover:underline"
                        >
                            All PYQs
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {PRESET_YEARS.map((yr) => {
                        const isSelected = selectedYears.includes(yr);
                        return (
                            <button
                                key={yr}
                                type="button"
                                onClick={() => handleToggleYear(yr)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                                    isSelected
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-bold shadow-xs'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                {yr === 'Any' ? 'Any / All PYQ' : yr}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 4. QUESTION FORMAT (MCQ vs FILL-IN-THE-BLANK / NAT) */}
            {onChangeQuestionFormat && (
                <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Question Format
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-center">
                        <button
                            type="button"
                            onClick={() => onChangeQuestionFormat('all')}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition ${
                                questionFormat === 'all'
                                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Mixed (MCQ + NAT)
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeQuestionFormat('mcq')}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition ${
                                questionFormat === 'mcq'
                                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            MCQ Only (4 Choices)
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeQuestionFormat('fill_in_the_blank')}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition ${
                                questionFormat === 'fill_in_the_blank'
                                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Fill-in-Blank / NAT Only
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
