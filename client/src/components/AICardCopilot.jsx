'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Check,
    Copy,
    RefreshCw,
    Send,
    ChevronDown,
    ChevronUp,
    Zap,
    BookOpen,
    GraduationCap,
    ListChecks,
    HelpCircle,
    Wrench,
    ShoppingCart,
    MessageSquare,
    Globe,
    Layers,
    Loader2
} from 'lucide-react';
import { aiAPI } from '../lib/api';
import VoiceInputButton from './VoiceInputButton';
import toast from 'react-hot-toast';

export default function AICardCopilot({
    type = 'lesson_plan',
    context = {},
    onInsert,
    title,
    description,
    quickActions = [],
    className = ''
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [editableData, setEditableData] = useState(null);
    const [copied, setCopied] = useState(false);
    const [activeRefinement, setActiveRefinement] = useState(null);

    // Default icon & metadata based on type
    const getMetadata = () => {
        switch (type) {
            case 'lesson_plan':
                return {
                    icon: <BookOpen className="w-5 h-5 text-indigo-400" />,
                    title: title || 'AI Lesson & Lecture Plan Copilot',
                    desc: description || 'Auto-generate structured aims, learning objectives, activities, and quiz questions from context.',
                    defaultQuickActions: [
                        '⚡ Generate Full Lesson Plan',
                        '🎯 Create 5 Viva / Quiz Questions',
                        '🔬 Suggest Hands-on Lab Activity',
                        '📝 Draft Homework Assignment'
                    ]
                };
            case 'grading_feedback':
                return {
                    icon: <GraduationCap className="w-5 h-5 text-emerald-400" />,
                    title: title || 'AI Code Review & Auto-Grading Copilot',
                    desc: description || 'Analyze student submitted code, evaluate correctness, calculate rubric marks, and draft feedback.',
                    defaultQuickActions: [
                        '⚡ Auto-Grade & Review Code',
                        '🐛 Find Logic Bugs & Edge Cases',
                        '🇮🇳 Generate Feedback in Hindi',
                        '⭐ Score Rubric & Strengths'
                    ]
                };
            case 'notes_checklist':
                return {
                    icon: <ListChecks className="w-5 h-5 text-amber-400" />,
                    title: title || 'AI Executive Note & Checklist Crafter',
                    desc: description || 'Convert rough notes or meeting transcript into structured executive summaries with actionable checklists.',
                    defaultQuickActions: [
                        '⚡ Extract Interactive Checklist',
                        '📋 Summarize Key Decisions',
                        '✨ Polish Professional Formatting',
                        '📅 Identify Action Items with Due Dates'
                    ]
                };
            case 'ticket_reply':
                return {
                    icon: <HelpCircle className="w-5 h-5 text-cyan-400" />,
                    title: title || 'AI Support & Resolution Copilot',
                    desc: description || 'Diagnose reported issue, suggest troubleshooting steps, and draft a courteous user reply.',
                    defaultQuickActions: [
                        '⚡ Draft Polite Resolution Reply',
                        '🔧 Provide Technical Troubleshooting Steps',
                        '🏷️ Suggest Priority & Category'
                    ]
                };
            case 'lab_maintenance':
                return {
                    icon: <Wrench className="w-5 h-5 text-purple-400" />,
                    title: title || 'AI Lab Hardware & Health Copilot',
                    desc: description || 'Analyze PC inventory status, predict failure risk, and draft maintenance work orders.',
                    defaultQuickActions: [
                        '⚡ Generate Lab Health Audit',
                        '🛠️ Draft Maintenance Plan',
                        '⚠️ Flag High-Risk Hardware'
                    ]
                };
            case 'procurement_po':
                return {
                    icon: <ShoppingCart className="w-5 h-5 text-rose-400" />,
                    title: title || 'AI Procurement & Quotation Analyst',
                    desc: description || 'Compare vendor quotations, analyze cost tradeoffs, and draft Purchase Orders.',
                    defaultQuickActions: [
                        '⚡ Compare Quotations & TCO',
                        '📑 Draft Committee PO Recommendation',
                        '💰 Analyze Budget Feasibility'
                    ]
                };
            default:
                return {
                    icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
                    title: title || 'AI Copilot Assistant',
                    desc: description || 'Context-aware intelligence for your administrative and academic workflow.',
                    defaultQuickActions: ['⚡ Generate Suggestions', '📝 Summarize Content', '✨ Refine Formatting']
                };
        }
    };

    const meta = getMetadata();
    const effectiveQuickActions = quickActions.length > 0 ? quickActions : meta.defaultQuickActions;

    const handleGenerate = async (customPrompt = prompt, refinementText = '') => {
        setLoading(true);
        setActiveRefinement(refinementText);
        try {
            const res = await aiAPI.cardAssist({
                type,
                prompt: customPrompt,
                context,
                refinement: refinementText,
                provider: 'groq'
            });

            const data = res.data?.data || {};
            setResult(data);
            setEditableData({ ...data });
            toast.success('AI analysis generated successfully!');
        } catch (err) {
            console.error('AI Card assist error:', err);
            toast.error(err.response?.data?.message || 'AI request failed');
        } finally {
            setLoading(false);
        }
    };

    const handleInsert = () => {
        if (!editableData) return;
        if (onInsert) {
            onInsert(editableData);
            toast.success('✨ Content inserted into form successfully!');
        } else {
            toast.error('No insert target configured for this page');
        }
    };

    const handleCopy = () => {
        if (!editableData) return;
        const textToCopy = typeof editableData === 'object'
            ? JSON.stringify(editableData, null, 2)
            : String(editableData);
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md mb-6 ${className}`}>
            {/* Header / Top Bar */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/40 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/70 shadow-sm">
                        {meta.icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                                {meta.title}
                            </h3>
                            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Copilot
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{meta.desc}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                        title={isCollapsed ? 'Expand AI Copilot' : 'Collapse AI Copilot'}
                    >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 space-y-4"
                    >
                        {/* PHASE 1: READ (Context Badge Bar) */}
                        <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
                            <span className="text-slate-400 font-semibold flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                Context Read:
                            </span>
                            {context.subjectName && (
                                <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-300 rounded-md border border-indigo-500/25">
                                    Subject: <b>{context.subjectName}</b>
                                </span>
                            )}
                            {context.className && (
                                <span className="px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded-md border border-purple-500/25">
                                    Class: <b>{context.className}</b>
                                </span>
                            )}
                            {context.assignmentTitle && (
                                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-md border border-emerald-500/25">
                                    Assignment: <b>{context.assignmentTitle}</b>
                                </span>
                            )}
                            {context.studentName && (
                                <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 rounded-md border border-cyan-500/25">
                                    Student: <b>{context.studentName}</b>
                                </span>
                            )}
                            {context.labName && (
                                <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 rounded-md border border-amber-500/25">
                                    Lab: <b>{context.labName}</b>
                                </span>
                            )}
                            {context.title && !context.assignmentTitle && (
                                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                                    Title: <b>{context.title}</b>
                                </span>
                            )}
                            {!Object.keys(context).some(k => context[k]) && (
                                <span className="text-slate-500 italic">Page context ready for prompt</span>
                            )}
                        </div>

                        {/* Quick Action Prompt Chips */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {effectiveQuickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleGenerate(action)}
                                    disabled={loading}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/40 transition flex items-center gap-1 disabled:opacity-50"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>

                        {/* Custom Instruction Input with Voice Mic */}
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 transition">
                            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleGenerate(prompt);
                                    }
                                }}
                                placeholder="Type a custom instruction or speak with the microphone..."
                                className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 border-0 focus:outline-none focus:ring-0"
                            />
                            {/* Voice Dictation Button */}
                            <VoiceInputButton
                                onTranscript={(text) => {
                                    setPrompt(prev => (prev ? `${prev} ${text}` : text).trim());
                                }}
                                size="sm"
                            />
                            <button
                                type="button"
                                onClick={() => handleGenerate(prompt)}
                                disabled={loading || (!prompt && !context)}
                                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition shrink-0"
                                title="Run AI Generator"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        {/* PHASE 2: EDIT & REFINE PLAYGROUND (Rendered Result) */}
                        {editableData && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3"
                            >
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                                        Interactive AI Proposal Preview
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {/* Refinement Pills */}
                                        <button
                                            type="button"
                                            onClick={() => handleGenerate(prompt, 'Make it more concise and simpler for high school')}
                                            className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
                                        >
                                            Simpler
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGenerate(prompt, 'Add detailed Hindi translation / bilingual explanations')}
                                            className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
                                        >
                                            🇮🇳 Hindi
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGenerate(prompt, 'Add 3 more advanced conceptual questions and rubrics')}
                                            className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
                                        >
                                            + Questions
                                        </button>
                                    </div>
                                </div>

                                {/* Dynamic Preview based on Card Type */}
                                <div className="text-xs space-y-2 text-slate-300 max-h-60 overflow-y-auto pr-1">
                                    {type === 'lesson_plan' && (
                                        <>
                                            <div>
                                                <span className="font-semibold text-slate-400">Aim:</span>
                                                <input
                                                    type="text"
                                                    value={editableData.aim || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, aim: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-400">Learning Objectives:</span>
                                                <textarea
                                                    rows={2}
                                                    value={editableData.learningObjectives || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, learningObjectives: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-400">Teaching Aids / Resources:</span>
                                                <input
                                                    type="text"
                                                    value={editableData.teachingAids || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, teachingAids: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-400">Interactive Activity:</span>
                                                <input
                                                    type="text"
                                                    value={editableData.interactiveActivity || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, interactiveActivity: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-400">Assessment Questions:</span>
                                                <textarea
                                                    rows={2}
                                                    value={editableData.assessmentQuestions || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, assessmentQuestions: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {type === 'grading_feedback' && (
                                        <>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                                                    <span className="text-[11px] text-slate-400">Practical:</span>
                                                    <input
                                                        type="number"
                                                        value={editableData.suggestedPracticalMarks ?? 0}
                                                        onChange={(e) => setEditableData({ ...editableData, suggestedPracticalMarks: Number(e.target.value) })}
                                                        className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-bold"
                                                    />
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                                                    <span className="text-[11px] text-slate-400">Viva:</span>
                                                    <input
                                                        type="number"
                                                        value={editableData.suggestedVivaMarks ?? 0}
                                                        onChange={(e) => setEditableData({ ...editableData, suggestedVivaMarks: Number(e.target.value) })}
                                                        className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-bold"
                                                    />
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                                                    <span className="text-[11px] text-slate-400">Output:</span>
                                                    <input
                                                        type="number"
                                                        value={editableData.suggestedOutputMarks ?? 0}
                                                        onChange={(e) => setEditableData({ ...editableData, suggestedOutputMarks: Number(e.target.value) })}
                                                        className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-bold"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-400">Feedback:</span>
                                                <textarea
                                                    rows={2}
                                                    value={editableData.feedback || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, feedback: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                            {editableData.feedbackHindi && (
                                                <div>
                                                    <span className="font-semibold text-slate-400">Feedback (Hindi):</span>
                                                    <p className="mt-0.5 text-xs text-slate-300 italic bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                                                        {editableData.feedbackHindi}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {type === 'notes_checklist' && (
                                        <>
                                            <div>
                                                <span className="font-semibold text-slate-400">Summary:</span>
                                                <textarea
                                                    rows={2}
                                                    value={editableData.summary || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, summary: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                            {editableData.checklist && editableData.checklist.length > 0 && (
                                                <div>
                                                    <span className="font-semibold text-slate-400">Checklist Items:</span>
                                                    <div className="mt-1 space-y-1">
                                                        {editableData.checklist.map((item, i) => (
                                                            <div key={i} className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                                                <span className="text-indigo-400">☑</span>
                                                                <input
                                                                    type="text"
                                                                    value={item.text || ''}
                                                                    onChange={(e) => {
                                                                        const updated = [...editableData.checklist];
                                                                        updated[i].text = e.target.value;
                                                                        setEditableData({ ...editableData, checklist: updated });
                                                                    }}
                                                                    className="w-full bg-transparent text-xs text-white border-0 focus:outline-none"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {type === 'ticket_reply' && (
                                        <>
                                            <div>
                                                <span className="font-semibold text-slate-400">Troubleshooting Steps:</span>
                                                <textarea
                                                    rows={2}
                                                    value={editableData.troubleshootingSteps || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, troubleshootingSteps: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-400">Draft Reply:</span>
                                                <textarea
                                                    rows={3}
                                                    value={editableData.draftReply || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, draftReply: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {type === 'lab_maintenance' && (
                                        <>
                                            <div>
                                                <span className="font-semibold text-slate-400">Health Summary:</span>
                                                <textarea
                                                    rows={2}
                                                    value={editableData.summary || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, summary: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-400">Recommended Action Plan:</span>
                                                <textarea
                                                    rows={2}
                                                    value={editableData.recommendedActionPlan || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, recommendedActionPlan: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {type === 'procurement_po' && (
                                        <>
                                            <div>
                                                <span className="font-semibold text-slate-400">Recommended Vendor:</span>
                                                <input
                                                    type="text"
                                                    value={editableData.recommendedVendor || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, recommendedVendor: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-400">Purchase Order Draft:</span>
                                                <textarea
                                                    rows={3}
                                                    value={editableData.poDraft || ''}
                                                    onChange={(e) => setEditableData({ ...editableData, poDraft: e.target.value })}
                                                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* PHASE 3: INSERT & ACTION BAR */}
                                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleInsert}
                                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition"
                                        >
                                            <Zap className="w-3.5 h-3.5 fill-white" />
                                            Insert into Form
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition"
                                            title="Copy content"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleGenerate(prompt)}
                                        disabled={loading}
                                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                        Regenerate
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
