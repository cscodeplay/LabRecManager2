'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sparkles, BookOpen, Layers, Code2, CheckCircle2,
    ArrowRight, ArrowLeft, Plus, Trash2, Edit3, ShieldAlert,
    Clock, Award, Lock, Send, Users, Calendar, Trophy,
    AlertTriangle, X, Check, HelpCircle, Eye, EyeOff, CheckSquare, FileText,
    ChevronDown, ChevronUp
} from 'lucide-react';
import api, { trainingAPI, classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const STEP_TITLES = [
    { step: 1, title: 'Blueprint & Meta', desc: 'Title, Language & Board' },
    { step: 2, title: 'Units & Mastery', desc: 'Curriculum & Gate Thresholds' },
    { step: 3, title: 'Exercise Arena', desc: 'Coding, MCQs, Cloze & Labs' },
    { step: 4, title: 'Pedagogy Rules', desc: 'Bloom\'s & Gamification' },
    { step: 5, title: 'Module Preview', desc: 'Full Curriculum & Theory Review' },
    { step: 6, title: 'Deploy & Assign', desc: 'Classes & Publishing' }
];

// Robust UUID checker to distinguish persisted DB records from in-memory client IDs
const isRealDbUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

export default function TrainingModuleWizard({
    isOpen,
    onClose,
    onSuccess,
    initialData = null,
    availableClasses = []
}) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Inline AI Outliner State for Step 2
    const [wizardInlineAiOutlinePrompt, setWizardInlineAiOutlinePrompt] = useState('');
    const [wizardInlineAiOutlineProvider, setWizardInlineAiOutlineProvider] = useState('gemini');
    const [wizardInlineAiOutlineLoading, setWizardInlineAiOutlineLoading] = useState(false);

    // Step 1 AI & RAG Grounding Studio State
    const [step1AiMode, setStep1AiMode] = useState('topic'); // 'topic' | 'rag'
    const [step1AiPrompt, setStep1AiPrompt] = useState('');
    const [step1AiProvider, setStep1AiProvider] = useState('gemini');
    const [step1AiLoading, setStep1AiLoading] = useState(false);
    const [isAnalyzingTitle, setIsAnalyzingTitle] = useState(false);
    const [step1FileName, setStep1FileName] = useState('');
    const [step1DocumentText, setStep1DocumentText] = useState('');
    const [step1ImageBase64, setStep1ImageBase64] = useState(null);
    const [step1MimeType, setStep1MimeType] = useState('image/jpeg');
    const [ragKeyTopics, setRagKeyTopics] = useState([]);

    // Step 1 Form: Module Meta
    const [moduleForm, setModuleForm] = useState({
        title: initialData?.title || '',
        titleHindi: initialData?.titleHindi || '',
        description: initialData?.description || '',
        language: initialData?.language || 'python',
        boardAligned: initialData?.boardAligned || 'PSEB',
        classLevel: initialData?.classLevel || 11,
        isPublished: initialData?.isPublished || false,
        pedagogyConfig: initialData?.pedagogyConfig || {
            useBlooms: true,
            useObjectives: true,
            useTimeLimit: false
        }
    });

    // Step 2 Form: Units Array
    const [units, setUnits] = useState(initialData?.units || [
        {
            id: 'temp_unit_1',
            unitNumber: 1,
            title: 'Unit 1: Fundamentals & Core Syntax',
            description: 'Foundational syntax, variables, and elementary data types.',
            expectedHours: 4,
            unlockThreshold: 80,
            exercises: []
        }
    ]);

    // Active unit selected in Step 3
    const [selectedUnitIdx, setSelectedUnitIdx] = useState(0);

    // Exercise creation in Step 3
    const [isEditingExercise, setIsEditingExercise] = useState(false);
    const [editingExerciseIdx, setEditingExerciseIdx] = useState(null);
    const [exerciseForm, setExerciseForm] = useState({
        title: '',
        description: '',
        theory: '',
        exerciseType: 'coding', // 'coding' | 'mcq' | 'fill_blank' | 'bug_fix' | 'case_study'
        difficulty: 'beginner',
        scaffoldLevel: 'guided',
        bloomsLevel: 'apply',
        learningObjective: '',
        isReviewExercise: false,
        xpReward: 15,
        timeLimit: 5,
        starterCode: '# Write code here\n',
        solutionCode: '# Solution\n',
        testCases: [
            { input: '5', expectedOutput: '10', isHidden: false },
            { input: '0', expectedOutput: '0', isHidden: true }
        ],
        hints: ['Check your base case.'],
        mcqData: {
            question: 'What is the output of this code snippet?',
            codeSnippet: 'print("Hello World")',
            options: ['Hello World', 'None', 'SyntaxError', 'undefined'],
            correctOption: 0,
            explanation: 'The print function writes the string to standard output.'
        },
        clozeData: {
            instruction: 'Fill in the blanks to complete the code:',
            template: 'for i in {{BLANK_1}}(5):\n    print(i)',
            blanks: [{ id: 'BLANK_1', correctAnswer: 'range', hint: 'Sequence generator function' }],
            explanation: 'range(5) produces numbers from 0 to 4.'
        },
        caseStudyData: {
            company: 'TechCorp Cloud Team',
            incident: 'High latency observed during peak checkout hours.',
            scenarioCode: '# Inefficient lookup\ndef lookup(items, target):\n    return [x for x in items if x == target]',
            questions: [
                {
                    id: 'q1',
                    prompt: 'What data structure would optimize this lookup from O(N) to O(1)?',
                    options: ['Hash Set / Dictionary', 'Linked List', 'Array', 'Stack'],
                    correctOption: 0,
                    explanation: 'A Hash Set provides O(1) average-time complexity lookups.'
                }
            ]
        },
        arData: {
            assertion: 'In Python, strings are immutable sequences.',
            reason: 'Individual character elements of a string cannot be modified via item assignment s[0] = "x".',
            correctOption: 0,
            explanation: 'Both statements are true facts, and Reason explains what immutability means.'
        },
        traceData: {
            codeSnippet: 'a = 2\nb = 5\nfor i in range(1, 4):\n    a = a + i\n    b = b * 2',
            tableHeaders: ['Step (i)', 'Value of a', 'Value of b'],
            expectedRows: [
                ['1', '3', '10'],
                ['2', '5', '20'],
                ['3', '8', '40']
            ],
            explanation: 'Variable values update sequentially during each loop iteration.'
        },
        debugData: {
            buggyCode: 'def calculate(nums):\n    total = 0\n    for n in nums\n        total += n\n    return total',
            errors: [
                { line: 3, description: 'Missing colon at end of for loop statement', correctedLine: '    for n in nums:' }
            ],
            solutionCode: 'def calculate(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total',
            explanation: 'Line 3 was missing a required colon (:).'
        }
    });

    // Wizard Unit Pre-Lab Theory Inline Editing State
    const [wizardTheoryUnitIdx, setWizardTheoryUnitIdx] = useState(null);
    const [wizardTheoryForm, setWizardTheoryForm] = useState({
        title: '',
        summary: '',
        content: '',
        miniCheckpoints: [],
        cbseTips: []
    });

    // Inline AI Generation State for Wizard Exercise Modal
    const [wizardInlineAiPrompt, setWizardInlineAiPrompt] = useState('');
    const [wizardInlineAiProvider, setWizardInlineAiProvider] = useState('gemini');
    const [wizardInlineAiLoading, setWizardInlineAiLoading] = useState(false);

    // Inline AI Generation State for Wizard Theory Modal
    const [wizardInlineAiTheoryPrompt, setWizardInlineAiTheoryPrompt] = useState('');
    const [wizardInlineAiTheoryLoading, setWizardInlineAiTheoryLoading] = useState(false);

    // Step 3 Collapsible Theory & Checked Topics Batch Generation State
    const [checkedTopicsByUnit, setCheckedTopicsByUnit] = useState({});
    const [isTheoryCollapsed, setIsTheoryCollapsed] = useState(false);
    const [batchAiLoading, setBatchAiLoading] = useState(false);
    const [batchExerciseType, setBatchExerciseType] = useState('mixed');

    // Step 5 Form: Class Allocations
    const [targetClasses, setTargetClasses] = useState([]);
    const [deadline, setDeadline] = useState('');
    const [specialNotes, setSpecialNotes] = useState('');

    // Auto-Save & Local Draft State
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [hasSavedDraft, setHasSavedDraft] = useState(false);

    // Check for existing unsaved draft on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const saved = localStorage.getItem('ulrms_training_wizard_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && (parsed.moduleForm?.title || (parsed.units?.length > 1) || parsed.units?.[0]?.exercises?.length > 0)) {
                    setHasSavedDraft(true);
                }
            }
        } catch (e) {
            console.error('Error reading draft:', e);
        }
    }, []);

    // Debounced Auto-Save
    useEffect(() => {
        if (typeof window === 'undefined' || !isOpen) return;
        const timer = setTimeout(() => {
            try {
                if (moduleForm.title || units.length > 1 || (units[0]?.exercises && units[0].exercises.length > 0)) {
                    localStorage.setItem('ulrms_training_wizard_draft', JSON.stringify({
                        moduleForm,
                        units,
                        currentStep,
                        targetClasses,
                        timestamp: Date.now()
                    }));
                    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                }
            } catch (e) {
                console.warn('Auto-save failed:', e);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [moduleForm, units, currentStep, targetClasses, isOpen]);

    const handleRestoreDraft = () => {
        try {
            const saved = localStorage.getItem('ulrms_training_wizard_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.moduleForm) setModuleForm(parsed.moduleForm);
                if (parsed.units) setUnits(parsed.units);
                if (parsed.currentStep) setCurrentStep(parsed.currentStep);
                if (parsed.targetClasses) setTargetClasses(parsed.targetClasses);
                setHasSavedDraft(false);
                toast.success('💾 Restored course draft from cache!');
            }
        } catch (e) {
            toast.error('Failed to restore draft');
        }
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem('ulrms_training_wizard_draft');
        setHasSavedDraft(false);
        toast.success('Draft cache discarded.');
    };

    // Pedagogy Score Calculation
    const pedagogyStats = useMemo(() => {
        let score = 0;
        const totalExercises = units.reduce((acc, u) => acc + (u.exercises?.length || 0), 0);
        const allExercises = units.flatMap(u => u.exercises || []);

        // Units configured
        if (units.length >= 2) score += 20;
        else if (units.length >= 1) score += 10;

        // Mastery gates
        if (units.every(u => u.unlockThreshold >= 70)) score += 20;

        // Exercise scaffolding diversity
        const scaffolds = new Set(allExercises.map(e => e.scaffoldLevel));
        if (scaffolds.size >= 3) score += 20;
        else if (scaffolds.size >= 1) score += 10;

        // Question types diversity
        const types = new Set(allExercises.map(e => e.exerciseType));
        if (types.size >= 3) score += 20;
        else if (types.size >= 1) score += 10;

        // Spaced repetition & hidden tests
        const hasReview = allExercises.some(e => e.isReviewExercise);
        const hasHidden = allExercises.some(e => {
            if (Array.isArray(e.testCases)) return e.testCases.some(t => t.isHidden);
            return false;
        });
        if (hasReview) score += 10;
        if (hasHidden) score += 10;

        return {
            score: Math.min(score, 100),
            totalExercises,
            totalUnits: units.length
        };
    }, [units]);

    // Step Completion Gating & Progressive Unlocking
    const isStep1Complete = Boolean(moduleForm.title?.trim() && moduleForm.language);
    const isStep2Complete = Boolean(isStep1Complete && units.length > 0 && units.every(u => u.title && u.title.trim().length > 0));
    const totalExercises = useMemo(() => units.reduce((acc, u) => acc + (u.exercises?.length || 0), 0), [units]);
    const isStep3Complete = Boolean(isStep2Complete && totalExercises > 0);
    const isStep4Complete = Boolean(isStep3Complete);
    const isStep5Complete = Boolean(isStep4Complete);
    const isStep6Complete = false;

    const canAccessStep = (stepNumber) => {
        if (stepNumber <= 1) return true;
        if (stepNumber === 2) return isStep1Complete;
        if (stepNumber === 3) return isStep1Complete && isStep2Complete;
        if (stepNumber === 4) return isStep1Complete && isStep2Complete && isStep3Complete;
        if (stepNumber === 5) return isStep1Complete && isStep2Complete && isStep3Complete;
        if (stepNumber === 6) return isStep1Complete && isStep2Complete && isStep3Complete;
        return false;
    };

    const handleAttemptNavigateStep = (nextStep) => {
        if (nextStep <= currentStep) {
            setCurrentStep(nextStep);
            return;
        }
        if (!canAccessStep(nextStep)) {
            if (!isStep1Complete) {
                toast.error('Please enter a Course Title or click "✨ Auto-Generate Course Blueprint" to proceed.');
                return;
            }
            if (!isStep2Complete) {
                toast.error('Please add at least one unit with a title or click "✨ Generate Units" with AI.');
                return;
            }
            if (!isStep3Complete) {
                toast.error('Please create at least one exercise in Step 3 before proceeding to Pedagogy & Deploy.');
                return;
            }
        }
        setCurrentStep(nextStep);
    };

    // Helper to extract checklist topics from a unit's keyConcepts, theoryData, checkpoints, and headings
    const extractTopicsFromUnit = useCallback((unit) => {
        if (!unit) return [];
        const topics = [];

        const addTopic = (text) => {
            if (!text || typeof text !== 'string') return;
            const clean = text
                .replace(/^#+\s+/, '')
                .replace(/^[-*]\s+/, '')
                .replace(/^\d+[\.\)]\s+/, '')
                .replace(/[*_`]/g, '')
                .trim();
            if (clean.length >= 3 && clean.length <= 90 && !topics.includes(clean)) {
                topics.push(clean);
            }
        };

        // 1. From Unit Key Concepts (direct array from RAG generation)
        if (Array.isArray(unit.keyConcepts)) {
            unit.keyConcepts.forEach(c => addTopic(c));
        }
        if (Array.isArray(unit.theoryData?.keyConcepts)) {
            unit.theoryData.keyConcepts.forEach(c => addTopic(c));
        }

        // 2. From Mini Checkpoints questions
        if (Array.isArray(unit.theoryData?.miniCheckpoints)) {
            unit.theoryData.miniCheckpoints.forEach((cp, idx) => {
                if (cp.question) {
                    addTopic(`Checkpoint ${idx + 1}: ${cp.question.replace(/\?$/, '')}`);
                }
            });
        }

        // 3. From Theory Content lines / markdown headings / bullet points / bold terms
        const rawTheoryContent = unit.theoryData?.content || unit.theory || '';
        if (typeof rawTheoryContent === 'string' && rawTheoryContent.trim()) {
            const lines = rawTheoryContent.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                // Headings (#, ##, ###, ####)
                if (/^#{1,4}\s+/.test(trimmed)) {
                    addTopic(trimmed);
                }
                // Bullet points (- or *)
                else if (/^[-*]\s+/.test(trimmed)) {
                    addTopic(trimmed);
                }
                // Numbered list items (1. or 1))
                else if (/^\d+[\.\)]\s+/.test(trimmed)) {
                    addTopic(trimmed);
                }
                // Bold inline headings like **Topic Name**:
                else if (/^\*\*[^*]+\*\*:?/.test(trimmed)) {
                    const match = trimmed.match(/^\*\*([^*]+)\*\*/);
                    if (match && match[1]) {
                        addTopic(match[1]);
                    }
                }
            });
        }

        // 4. From CBSE Tips
        if (Array.isArray(unit.theoryData?.cbseTips)) {
            unit.theoryData.cbseTips.forEach(tip => {
                if (tip && typeof tip === 'string') {
                    addTopic(`Exam Tip: ${tip}`);
                }
            });
        }

        // 5. If topics are still sparse, add from ragKeyTopics if relevant
        if (topics.length < 3 && Array.isArray(ragKeyTopics) && ragKeyTopics.length > 0) {
            ragKeyTopics.forEach(rk => addTopic(rk));
        }

        // 6. Fallback topics from unit title & description
        if (topics.length === 0) {
            const titleParts = (unit.title || 'Core Programming').split(/[,:&]/).map(s => s.trim()).filter(Boolean);
            titleParts.forEach(tp => addTopic(tp));
            if (unit.description) {
                const descParts = unit.description.split(/[,.;]/).map(s => s.trim()).filter(s => s.length > 4 && s.length < 60);
                descParts.slice(0, 3).forEach(dp => addTopic(dp));
            }
        }

        return topics.slice(0, 16);
    }, [ragKeyTopics]);

    // Current unit's available topics and selected topics for Step 3
    const activeUnitForTopics = units[selectedUnitIdx];
    const availableUnitTopics = useMemo(() => {
        return extractTopicsFromUnit(activeUnitForTopics);
    }, [activeUnitForTopics, extractTopicsFromUnit]);

    const currentSelectedTopics = useMemo(() => {
        const selected = checkedTopicsByUnit[selectedUnitIdx];
        if (selected !== undefined) return selected;
        return availableUnitTopics;
    }, [checkedTopicsByUnit, selectedUnitIdx, availableUnitTopics]);

    const handleToggleTopic = (topic) => {
        setCheckedTopicsByUnit(prev => {
            const curr = prev[selectedUnitIdx] !== undefined ? prev[selectedUnitIdx] : availableUnitTopics;
            const updated = curr.includes(topic)
                ? curr.filter(t => t !== topic)
                : [...curr, topic];
            return { ...prev, [selectedUnitIdx]: updated };
        });
    };

    const handleToggleSelectAllTopics = () => {
        setCheckedTopicsByUnit(prev => {
            const curr = prev[selectedUnitIdx] !== undefined ? prev[selectedUnitIdx] : availableUnitTopics;
            const isAll = curr.length === availableUnitTopics.length;
            return { ...prev, [selectedUnitIdx]: isAll ? [] : [...availableUnitTopics] };
        });
    };

    // Generate batch exercises from checked topics
    const handleGenerateFromCheckedTopics = async () => {
        if (!activeUnitForTopics) return;
        if (currentSelectedTopics.length === 0) {
            toast.error('Please check at least one topic or checkpoint to generate exercises.');
            return;
        }

        setBatchAiLoading(true);
        const toastId = toast.loading(`Generating exercises for ${currentSelectedTopics.length} checked topics...`);

        try {
            const res = await trainingAPI.aiExerciseBatch({
                topics: currentSelectedTopics,
                unitTitle: activeUnitForTopics.title,
                source: 'topics',
                count: Math.min(Math.max(currentSelectedTopics.length, 2), 4),
                exerciseType: batchExerciseType,
                language: moduleForm.language || 'python',
                classLevel: moduleForm.classLevel || 11,
                board: moduleForm.boardAligned || 'CBSE'
            }, wizardInlineAiProvider);

            if (res.data?.success && Array.isArray(res.data.data?.exercises) && res.data.data.exercises.length > 0) {
                const newExercises = res.data.data.exercises.map((ex, i) => ({
                    id: `ex_${Date.now()}_${i}`,
                    title: ex.title || `Exercise ${i + 1}`,
                    description: ex.description || '',
                    exerciseType: ex.exerciseType || 'coding',
                    difficulty: ex.difficulty || 'beginner',
                    scaffoldLevel: ex.scaffoldLevel || 'guided',
                    bloomsLevel: ex.bloomsLevel || 'apply',
                    learningObjective: ex.learningObjective || '',
                    xpReward: ex.xpReward || 20,
                    timeLimit: ex.timeLimit || 5,
                    starterCode: ex.starterCode || '',
                    solutionCode: ex.solutionCode || '',
                    testCases: ex.testCases || [],
                    hints: ex.hints || []
                }));

                setUnits(prev => {
                    const next = [...prev];
                    const existing = next[selectedUnitIdx]?.exercises || [];
                    next[selectedUnitIdx] = {
                        ...next[selectedUnitIdx],
                        exercises: [...existing, ...newExercises]
                    };
                    return next;
                });

                toast.success(`✨ Added ${newExercises.length} challenges for checked topics!`, { id: toastId });
            } else {
                throw new Error(res.data?.message || 'Failed to synthesize exercises');
            }
        } catch (err) {
            console.error('Batch generation error:', err);
            toast.error(`Exercise generation failed: ${err.message}`, { id: toastId });
        } finally {
            setBatchAiLoading(false);
        }
    };

    // Generate batch exercises from RAG Ebook / Document
    const handleGenerateFromRagDocument = async () => {
        if (!activeUnitForTopics) return;
        if (!step1DocumentText.trim() && !step1FileName) {
            toast.error('No RAG document found. Please attach a syllabus PDF or paste text in Step 1 first.');
            return;
        }

        setBatchAiLoading(true);
        const toastId = toast.loading(`Extracting practice exercises from RAG ebook for "${activeUnitForTopics.title}"...`);

        try {
            const res = await trainingAPI.aiExerciseBatch({
                source: 'rag',
                documentText: step1DocumentText,
                unitTitle: activeUnitForTopics.title,
                count: 3,
                exerciseType: batchExerciseType,
                language: moduleForm.language || 'python',
                classLevel: moduleForm.classLevel || 11,
                board: moduleForm.boardAligned || 'CBSE'
            }, wizardInlineAiProvider);

            if (res.data?.success && Array.isArray(res.data.data?.exercises) && res.data.data.exercises.length > 0) {
                const newExercises = res.data.data.exercises.map((ex, i) => ({
                    id: `ex_rag_${Date.now()}_${i}`,
                    title: ex.title || `RAG Challenge ${i + 1}`,
                    description: ex.description || '',
                    exerciseType: ex.exerciseType || 'coding',
                    difficulty: ex.difficulty || 'beginner',
                    scaffoldLevel: ex.scaffoldLevel || 'guided',
                    bloomsLevel: ex.bloomsLevel || 'apply',
                    learningObjective: ex.learningObjective || '',
                    xpReward: ex.xpReward || 20,
                    timeLimit: ex.timeLimit || 5,
                    starterCode: ex.starterCode || '',
                    solutionCode: ex.solutionCode || '',
                    testCases: ex.testCases || [],
                    hints: ex.hints || []
                }));

                setUnits(prev => {
                    const next = [...prev];
                    const existing = next[selectedUnitIdx]?.exercises || [];
                    next[selectedUnitIdx] = {
                        ...next[selectedUnitIdx],
                        exercises: [...existing, ...newExercises]
                    };
                    return next;
                });

                toast.success(`📄 Extracted & added ${newExercises.length} chapter exercises from RAG ebook!`, { id: toastId });
            } else {
                throw new Error(res.data?.message || 'Failed to extract exercises from document');
            }
        } catch (err) {
            console.error('RAG exercise extraction error:', err);
            toast.error(`RAG extraction failed: ${err.message}`, { id: toastId });
        } finally {
            setBatchAiLoading(false);
        }
    };

    // Helper to synthesize complete course (Title, Units, Theory, Checkpoints, Exercises) from RAG document
    const buildCompleteCourseFromDocument = async ({ docText, imgBase64, mime, suggestedTitle, promptHint, language, keyTopics }) => {
        setStep1AiLoading(true);
        const synthToastId = toast.loading('⚡ Synthesizing complete grounded course: Units, Pre-Lab Theory & Exercises...');

        if (Array.isArray(keyTopics) && keyTopics.length > 0) {
            setRagKeyTopics(keyTopics);
        }

        try {
            const promptToUse = promptHint || suggestedTitle || moduleForm.title || step1AiPrompt || 'Comprehensive Technical Module';
            const langToUse = language || moduleForm.language || (/(database|sql|dbms|rdbms|relational)/i.test(promptToUse + ' ' + (docText || '')) ? 'sql' : 'python');
            const res = await trainingAPI.aiFromDocument({
                documentText: docText || step1DocumentText,
                imageBase64: imgBase64 || step1ImageBase64,
                mimeType: mime || step1MimeType,
                customPrompt: promptToUse,
                language: langToUse,
                classLevel: moduleForm.classLevel || 11,
                board: moduleForm.boardAligned || 'CBSE',
                totalUnits: 3
            }, step1AiProvider);

            const data = res.data?.data?.module || res.data?.data?.outline || res.data?.data;
            if (data) {
                // 1. Populate Module Title & Metadata
                setModuleForm(prev => ({
                    ...prev,
                    title: data.title || suggestedTitle || prev.title || promptToUse,
                    titleHindi: data.titleHindi || prev.titleHindi,
                    description: data.description || prev.description,
                    language: data.language || prev.language,
                    boardAligned: data.boardAligned || prev.boardAligned,
                    classLevel: data.classLevel || prev.classLevel
                }));

                // 2. Populate Full-Blown Units with Pre-Lab Theory, Checkpoints, CBSE Tips & Exercises
                if (Array.isArray(data.units) && data.units.length > 0) {
                    setUnits(data.units.map((u, i) => {
                        const unitKeyConcepts = Array.isArray(u.keyConcepts) && u.keyConcepts.length > 0
                            ? u.keyConcepts
                            : (Array.isArray(keyTopics) && keyTopics.length > 0 ? keyTopics : []);

                        return {
                            id: `rag_unit_${i + 1}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                            unitNumber: u.unitNumber || i + 1,
                            title: u.title || `Unit ${i + 1}`,
                            description: u.description || '',
                            expectedHours: u.expectedHours || 4,
                            unlockThreshold: u.unlockThreshold || 80,
                            keyConcepts: unitKeyConcepts,
                            theory: u.theory || '',
                            theoryData: {
                                summary: u.description || `Key concepts of ${u.title}`,
                                content: u.theory || (unitKeyConcepts.length > 0 ? `## Key Concepts\n\n${unitKeyConcepts.map(c => `- ${c}`).join('\n')}` : ''),
                                keyConcepts: unitKeyConcepts,
                                miniCheckpoints: Array.isArray(u.miniCheckpoints) ? u.miniCheckpoints : [],
                                cbseTips: Array.isArray(u.cbseTips) ? u.cbseTips : []
                            },
                        exercises: Array.isArray(u.exercises) ? u.exercises.map((ex, eIdx) => {
                            const parsedTestCases = Array.isArray(ex.testCases) ? ex.testCases : (ex.testCases && typeof ex.testCases === 'object' ? ex.testCases : []);
                            const effectiveStarterCode = ex.starterCode || (ex.exerciseType === 'code_debug' ? parsedTestCases?.buggyCode : '') || '';
                            return {
                                id: `rag_ex_${eIdx + 1}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                                title: ex.title || `Challenge ${eIdx + 1}`,
                                description: ex.description || '',
                                theory: ex.theory || '',
                                exerciseType: ex.exerciseType || 'coding',
                                difficulty: ex.difficulty || 'beginner',
                                scaffoldLevel: ex.scaffoldLevel || 'guided',
                                bloomsLevel: ex.bloomsLevel || 'apply',
                                learningObjective: ex.learningObjective || '',
                                xpReward: ex.xpReward || 20,
                                timeLimit: ex.timeLimit || 5,
                                isReviewExercise: ex.isReviewExercise || false,
                                starterCode: effectiveStarterCode,
                                solutionCode: ex.solutionCode || '',
                                testCases: parsedTestCases,
                                debugData: ex.exerciseType === 'code_debug' ? (parsedTestCases && typeof parsedTestCases === 'object' ? parsedTestCases : { buggyCode: effectiveStarterCode, errors: [], explanation: '' }) : null,
                                hints: Array.isArray(ex.hints) ? ex.hints : []
                            };
                        }) : []
                    };
                }));
            }

                toast.success('🚀 Complete module successfully built from RAG document! Title, 3 Units, Theory & Exercises are ready and editable.', { id: synthToastId });
            } else {
                throw new Error('AI did not return valid course structure');
            }
        } catch (err) {
            console.error('Course auto-build error:', err);
            toast.error(`Auto-build failed: ${err.message || 'Please check AI settings'}`, { id: synthToastId });
        } finally {
            setStep1AiLoading(false);
        }
    };

    // Step 1 RAG File Upload Handler (Saves directly to Documents > RAG folder & auto-builds module)
    const handleStep1FileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Baseline fallback title from filename
        const cleanFileTitle = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b(pdf|syllabus|notes|ebook|guide|document|resource|chapter|unit)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, c => c.toUpperCase()) || file.name.replace(/\.[^/.]+$/, '');

        setStep1FileName(file.name);
        setStep1AiMode('rag');
        setIsAnalyzingTitle(true);

        const toastId = toast.loading(`📖 Reading sufficient PDF content from "${file.name}" with Gemini AI...`);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await trainingAPI.uploadRagDocument(formData);

            if (uploadRes.data?.success) {
                const {
                    extractedText,
                    imageBase64,
                    mimeType,
                    suggestedTitle,
                    titleHindi,
                    description,
                    suggestedLanguage,
                    keyTopics
                } = uploadRes.data.data;

                if (Array.isArray(keyTopics) && keyTopics.length > 0) {
                    setRagKeyTopics(keyTopics);
                }

                if (extractedText) {
                    setStep1DocumentText(extractedText);
                }
                if (imageBase64) {
                    setStep1ImageBase64(imageBase64);
                    setStep1MimeType(mimeType || file.type);
                }

                const finalTitle = (suggestedTitle && suggestedTitle.trim().length >= 4) ? suggestedTitle.trim() : cleanFileTitle;
                const isSqlDomain = /(database|sql|dbms|rdbms|relational)/i.test(finalTitle + ' ' + (extractedText || ''));
                const finalLang = suggestedLanguage || (isSqlDomain ? 'sql' : 'python');

                setModuleForm(prev => ({
                    ...prev,
                    title: finalTitle,
                    titleHindi: titleHindi || prev.titleHindi || '',
                    description: description || prev.description || '',
                    language: finalLang
                }));
                setStep1AiPrompt(finalTitle);
                setIsAnalyzingTitle(false);

                toast.success(`📖 Analyzed "${file.name}" & synthesized title: "${finalTitle}"!`, { id: toastId });

                // Automatically build the entire module (Units, Theory, Checkpoints, Exercises)
                await buildCompleteCourseFromDocument({
                    docText: extractedText,
                    imgBase64: imageBase64,
                    mime: mimeType || file.type,
                    suggestedTitle: finalTitle,
                    promptHint: finalTitle,
                    language: finalLang,
                    keyTopics: Array.isArray(keyTopics) ? keyTopics : []
                });
            } else {
                throw new Error(uploadRes.data?.message || 'Upload failed');
            }
        } catch (uploadErr) {
            console.warn('Backend RAG upload failed, falling back to client FileReader:', uploadErr);
            setIsAnalyzingTitle(false);
            setModuleForm(prev => ({ ...prev, title: prev.title?.trim() ? prev.title : cleanFileTitle }));
            setStep1AiPrompt(cleanFileTitle);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = reader.result.split(',')[1];
                    setStep1ImageBase64(base64);
                    setStep1MimeType(file.type);
                    toast.success(`📸 Image "${file.name}" loaded for Vision RAG Grounding`, { id: toastId });
                    await buildCompleteCourseFromDocument({
                        imgBase64: base64,
                        mime: file.type,
                        suggestedTitle: cleanFileTitle,
                        promptHint: cleanFileTitle
                    });
                };
                reader.readAsDataURL(file);
            } else {
                const reader = new FileReader();
                reader.onload = async () => {
                    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                        const text = reader.result;
                        setStep1DocumentText(text);
                        toast.success(`📄 "${file.name}" loaded (${text.length} chars) for RAG Grounding`, { id: toastId });
                        await buildCompleteCourseFromDocument({
                            docText: text,
                            suggestedTitle: cleanFileTitle,
                            promptHint: cleanFileTitle
                        });
                    } else {
                        // PDF binary fallback
                        const base64 = typeof reader.result === 'string' ? reader.result.split(',')[1] : null;
                        if (base64) {
                            setStep1ImageBase64(base64);
                            setStep1MimeType(file.type || 'application/pdf');
                        }
                        toast.success(`📄 "${file.name}" loaded for RAG Grounding`, { id: toastId });
                        await buildCompleteCourseFromDocument({
                            imgBase64: base64,
                            mime: file.type || 'application/pdf',
                            suggestedTitle: cleanFileTitle,
                            promptHint: cleanFileTitle
                        });
                    }
                };
                if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                    reader.readAsText(file);
                } else {
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    // Step 1 AI & RAG Course Synthesis Handler
    const handleStep1AiGenerate = async () => {
        const promptToUse = step1AiPrompt.trim() || moduleForm.title.trim() || 'Python Programming Masterclass';

        if (step1AiMode === 'rag' && (step1DocumentText.trim() || step1ImageBase64)) {
            // Mode B: Full Course RAG Grounding with Auto-Build
            await buildCompleteCourseFromDocument({
                docText: step1DocumentText,
                imgBase64: step1ImageBase64,
                mime: step1MimeType,
                suggestedTitle: moduleForm.title || promptToUse,
                promptHint: promptToUse
            });
            return;
        }

        setStep1AiLoading(true);

        try {
            // Mode A: Quick Topic Blueprint & Units Synthesis
                const res = await trainingAPI.aiOutline({
                    topic: promptToUse,
                    documentText: step1DocumentText || '',
                    language: moduleForm.language || 'python',
                    classLevel: moduleForm.classLevel || 11,
                    board: moduleForm.boardAligned || 'CBSE',
                    totalUnits: 3
                }, step1AiProvider);

                const data = res.data?.data?.outline || res.data?.data;
                if (data) {
                    setModuleForm(prev => ({
                        ...prev,
                        title: data.title || promptToUse,
                        titleHindi: data.titleHindi || prev.titleHindi,
                        description: data.description || prev.description,
                        language: data.language || prev.language,
                        boardAligned: data.boardAligned || prev.boardAligned,
                        classLevel: data.classLevel || prev.classLevel
                    }));

                    if (Array.isArray(data.units) && data.units.length > 0) {
                        setUnits(data.units.map((u, i) => ({
                            id: `ai_unit_${i + 1}_${Date.now()}_${Math.random()}`,
                            unitNumber: u.unitNumber || i + 1,
                            title: u.title || `Unit ${i + 1}`,
                            description: u.description || '',
                            expectedHours: u.expectedHours || 4,
                            unlockThreshold: u.unlockThreshold || 80,
                            theoryData: {
                                summary: u.description || `Key concepts of ${u.title}`,
                                content: u.theory || (Array.isArray(u.keyConcepts) ? `## Key Concepts\n\n${u.keyConcepts.map(c => `- ${c}`).join('\n')}` : ''),
                                miniCheckpoints: Array.isArray(u.miniCheckpoints) ? u.miniCheckpoints : [],
                                cbseTips: Array.isArray(u.cbseTips) ? u.cbseTips : []
                            },
                            exercises: []
                        })));
                    }

                    toast.success('✨ Course Blueprint & Curriculum Units synthesized!');
                } else {
                    toast.error('Failed to synthesize course outline');
                }
        } catch (err) {
            console.error('Step 1 AI generation error:', err);
            toast.error(err.response?.data?.message || 'AI course generation failed');
        } finally {
            setStep1AiLoading(false);
        }
    };

    // Handlers for Units
    const handleAddUnit = () => {
        const nextNum = units.length + 1;
        setUnits(prev => [
            ...prev,
            {
                id: `temp_unit_${Date.now()}`,
                unitNumber: nextNum,
                title: `Unit ${nextNum}: New Topic`,
                description: 'Topic description and learning milestones.',
                expectedHours: 4,
                unlockThreshold: 80,
                exercises: []
            }
        ]);
        setSelectedUnitIdx(units.length);
    };

    const handleRemoveUnit = (idx) => {
        if (units.length <= 1) {
            toast.error('Module must have at least 1 unit');
            return;
        }
        setUnits(prev => {
            const updated = prev.filter((_, i) => i !== idx).map((u, i) => ({ ...u, unitNumber: i + 1 }));
            return updated;
        });
        if (selectedUnitIdx >= units.length - 1) {
            setSelectedUnitIdx(Math.max(0, units.length - 2));
        }
    };

    const handleUpdateUnit = (idx, field, value) => {
        setUnits(prev => prev.map((u, i) => i === idx ? { ...u, [field]: value } : u));
    };

    // Unit Pre-Lab Theory Handlers (In-Place)
    const handleOpenWizardTheory = (uIdx) => {
        const u = units[uIdx];
        if (!u) return;
        setWizardTheoryUnitIdx(uIdx);
        setWizardTheoryForm({
            title: u.title || `Unit ${uIdx + 1}`,
            summary: u.theoryData?.summary || u.description || '',
            content: u.theoryData?.content || u.theory || '',
            miniCheckpoints: Array.isArray(u.theoryData?.miniCheckpoints) ? u.theoryData.miniCheckpoints : [],
            cbseTips: Array.isArray(u.theoryData?.cbseTips) ? u.theoryData.cbseTips : []
        });
    };

    const handleSaveWizardTheory = () => {
        if (wizardTheoryUnitIdx === null) return;
        setUnits(prev => prev.map((u, i) => {
            if (i !== wizardTheoryUnitIdx) return u;
            return {
                ...u,
                theoryData: {
                    summary: wizardTheoryForm.summary,
                    content: wizardTheoryForm.content,
                    miniCheckpoints: wizardTheoryForm.miniCheckpoints,
                    cbseTips: wizardTheoryForm.cbseTips
                }
            };
        }));
        setWizardTheoryUnitIdx(null);
        toast.success('📖 Unit Pre-Lab Theory & Checkpoints saved!');
    };

    const handleInlineAiGenerateOutlineInWizard = async () => {
        const promptToUse = wizardInlineAiOutlinePrompt.trim() || moduleForm.title || moduleForm.description || 'CBSE Computer Science';
        setWizardInlineAiOutlineLoading(true);
        try {
            const res = await trainingAPI.aiOutline({
                topic: promptToUse,
                language: moduleForm.language || 'python',
                classLevel: moduleForm.classLevel || 11,
                board: moduleForm.boardAligned || 'CBSE',
                totalUnits: 3
            }, wizardInlineAiOutlineProvider);

            const data = res.data?.data?.outline || res.data?.data;
            if (data && Array.isArray(data.units) && data.units.length > 0) {
                handleApplyAiOutline(data);
                toast.success('✨ Units outline generated and loaded in-place!');
            } else {
                toast.error('AI did not return an outline');
            }
        } catch (err) {
            console.error('Wizard AI Outline error:', err);
            toast.error(err.response?.data?.message || 'Failed to synthesize outline');
        } finally {
            setWizardInlineAiOutlineLoading(false);
        }
    };

    const handleInlineAiGenerateTheoryInWizard = async () => {
        const topicToUse = wizardInlineAiTheoryPrompt.trim() || wizardTheoryForm.title || moduleForm.title || 'Unit Theory';
        setWizardInlineAiTheoryLoading(true);
        try {
            const res = await trainingAPI.aiTheory({
                topic: topicToUse,
                unitTitle: wizardTheoryForm.title,
                documentText: step1DocumentText || '',
                language: moduleForm.language || 'python',
                classLevel: moduleForm.classLevel || 11,
                board: moduleForm.boardAligned || 'CBSE'
            }, 'gemini');

            const data = res.data?.data?.theory || res.data?.data;
            if (data) {
                setWizardTheoryForm(prev => ({
                    ...prev,
                    summary: data.summary || prev.summary || `Core concepts of ${wizardTheoryForm.title}`,
                    content: data.contentMarkdown || data.theoryMarkdown || data.content || prev.content,
                    miniCheckpoints: Array.isArray(data.miniCheckpoints) && data.miniCheckpoints.length > 0 ? data.miniCheckpoints : prev.miniCheckpoints,
                    cbseTips: Array.isArray(data.cbseTips) && data.cbseTips.length > 0 ? data.cbseTips : prev.cbseTips
                }));
                toast.success('✨ Pre-Lab notes & checkpoints generated into form!');
            } else {
                toast.error('AI did not return theory content');
            }
        } catch (err) {
            console.error('Wizard AI Theory error:', err);
            toast.error(err.response?.data?.message || 'Failed to synthesize theory');
        } finally {
            setWizardInlineAiTheoryLoading(false);
        }
    };

    const handleInlineAiGenerateExerciseInWizard = async () => {
        if (!wizardInlineAiPrompt.trim()) return;
        setWizardInlineAiLoading(true);
        try {
            const activeUnit = units[selectedUnitIdx];
            const res = await trainingAPI.aiExercise({
                topic: wizardInlineAiPrompt,
                customPrompt: wizardInlineAiPrompt,
                documentText: step1DocumentText || '',
                exerciseType: exerciseForm.exerciseType,
                difficulty: exerciseForm.difficulty || 'beginner',
                scaffoldLevel: exerciseForm.scaffoldLevel || 'guided',
                bloomsLevel: exerciseForm.bloomsLevel || 'apply',
                language: moduleForm.language || 'python',
                classLevel: moduleForm.classLevel || 11,
                board: moduleForm.boardAligned || 'CBSE',
                unitTitle: activeUnit?.title || ''
            }, wizardInlineAiProvider);

            const ex = res.data?.data?.exercise || res.data?.data;
            if (ex) {
                handleApplyAiExercise(ex);
                toast.success(`✨ Challenge for "${ex.title}" auto-filled into form!`);
            } else {
                toast.error('AI did not return an exercise');
            }
        } catch (err) {
            console.error('Wizard AI Exercise error:', err);
            toast.error(err.response?.data?.message || 'Failed to synthesize exercise');
        } finally {
            setWizardInlineAiLoading(false);
        }
    };

    // Handlers for Exercises
    const handleSaveExercise = () => {
        if (!exerciseForm.title.trim()) {
            toast.error('Problem title is required');
            return;
        }

        const activeUnit = units[selectedUnitIdx];
        if (!activeUnit) return;

        let processedTestCases = exerciseForm.testCases;
        let processedStarterCode = exerciseForm.starterCode;
        let processedSolutionCode = exerciseForm.solutionCode;

        if (exerciseForm.exerciseType === 'mcq') {
            processedTestCases = exerciseForm.mcqData;
        } else if (exerciseForm.exerciseType === 'fill_blank') {
            processedTestCases = exerciseForm.clozeData;
        } else if (exerciseForm.exerciseType === 'case_study') {
            processedTestCases = exerciseForm.caseStudyData;
        } else if (exerciseForm.exerciseType === 'assertion_reason') {
            processedTestCases = exerciseForm.arData;
        } else if (exerciseForm.exerciseType === 'code_trace') {
            processedTestCases = exerciseForm.traceData;
        } else if (exerciseForm.exerciseType === 'code_debug') {
            processedTestCases = exerciseForm.debugData;
            processedStarterCode = exerciseForm.debugData?.buggyCode || exerciseForm.starterCode;
            processedSolutionCode = exerciseForm.debugData?.solutionCode || exerciseForm.solutionCode;
        }

        const newEx = {
            id: editingExerciseIdx !== null ? activeUnit.exercises[editingExerciseIdx].id : `temp_ex_${Date.now()}`,
            title: exerciseForm.title,
            description: exerciseForm.description,
            theory: exerciseForm.theory,
            exerciseType: exerciseForm.exerciseType,
            difficulty: exerciseForm.difficulty,
            scaffoldLevel: exerciseForm.scaffoldLevel,
            bloomsLevel: exerciseForm.bloomsLevel,
            learningObjective: exerciseForm.learningObjective,
            isReviewExercise: exerciseForm.isReviewExercise,
            xpReward: Number(exerciseForm.xpReward) || 15,
            timeLimit: Number(exerciseForm.timeLimit) || 5,
            starterCode: processedStarterCode,
            solutionCode: processedSolutionCode,
            testCases: processedTestCases,
            hints: exerciseForm.hints,
            arData: exerciseForm.arData,
            traceData: exerciseForm.traceData,
            debugData: exerciseForm.debugData
        };

        setUnits(prev => prev.map((u, i) => {
            if (i !== selectedUnitIdx) return u;
            const updatedExercises = [...(u.exercises || [])];
            if (editingExerciseIdx !== null) {
                updatedExercises[editingExerciseIdx] = newEx;
            } else {
                updatedExercises.push(newEx);
            }
            return { ...u, exercises: updatedExercises };
        }));

        setIsEditingExercise(false);
        setEditingExerciseIdx(null);
        toast.success(editingExerciseIdx !== null ? 'Exercise updated!' : 'Exercise added to Unit!');
    };

    const handleRemoveExercise = (exIdx) => {
        setUnits(prev => prev.map((u, i) => {
            if (i !== selectedUnitIdx) return u;
            return { ...u, exercises: u.exercises.filter((_, idx) => idx !== exIdx) };
        }));
    };

    const handleOpenCreateExercise = () => {
        setEditingExerciseIdx(null);
        setExerciseForm({
            title: '',
            description: '',
            theory: '',
            exerciseType: 'coding',
            difficulty: 'beginner',
            scaffoldLevel: 'guided',
            bloomsLevel: 'apply',
            learningObjective: '',
            isReviewExercise: false,
            xpReward: 15,
            timeLimit: 5,
            starterCode: '# Write code here\n',
            solutionCode: '# Solution\n',
            testCases: [
                { input: '5', expectedOutput: '10', isHidden: false },
                { input: '0', expectedOutput: '0', isHidden: true }
            ],
            hints: ['Check your base case.'],
            mcqData: {
                question: 'What is the output of this code snippet?',
                codeSnippet: 'print("Hello World")',
                options: ['Hello World', 'None', 'SyntaxError', 'undefined'],
                correctOption: 0,
                explanation: 'The print function writes the string to standard output.'
            },
            clozeData: {
                instruction: 'Fill in the blanks to complete the code:',
                template: 'for i in {{BLANK_1}}(5):\n    print(i)',
                blanks: [{ id: 'BLANK_1', correctAnswer: 'range', hint: 'Sequence generator function' }],
                explanation: 'range(5) produces numbers from 0 to 4.'
            },
            caseStudyData: {
                company: 'TechCorp Cloud Team',
                incident: 'High latency observed during peak checkout hours.',
                scenarioCode: '# Inefficient lookup\ndef lookup(items, target):\n    return [x for x in items if x == target]',
                questions: [
                    {
                        id: 'q1',
                        prompt: 'What data structure would optimize this lookup from O(N) to O(1)?',
                        options: ['Hash Set / Dictionary', 'Linked List', 'Array', 'Stack'],
                        correctOption: 0,
                        explanation: 'A Hash Set provides O(1) average-time complexity lookups.'
                    }
                ]
            },
            arData: {
                assertion: 'In Python, strings are immutable sequences.',
                reason: 'Individual character elements of a string cannot be modified via item assignment s[0] = "x".',
                correctOption: 0,
                explanation: 'Both statements are true facts, and Reason explains what immutability means.'
            },
            traceData: {
                codeSnippet: 'a = 2\nb = 5\nfor i in range(1, 4):\n    a = a + i\n    b = b * 2',
                tableHeaders: ['Step (i)', 'Value of a', 'Value of b'],
                expectedRows: [
                    ['1', '3', '10'],
                    ['2', '5', '20'],
                    ['3', '8', '40']
                ],
                explanation: 'Variable values update sequentially during each loop iteration.'
            },
            debugData: {
                buggyCode: 'def calculate(nums):\n    total = 0\n    for n in nums\n        total += n\n    return total',
                errors: [
                    { line: 3, description: 'Missing colon at end of for loop statement', correctedLine: '    for n in nums:' }
                ],
                solutionCode: 'def calculate(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total',
                explanation: 'Line 3 was missing a required colon (:).'
            }
        });
        setIsEditingExercise(true);
    };

    const handleOpenEditExercise = (exIdx) => {
        const activeUnit = units[selectedUnitIdx];
        if (!activeUnit || !activeUnit.exercises || !activeUnit.exercises[exIdx]) return;
        const ex = activeUnit.exercises[exIdx];
        setEditingExerciseIdx(exIdx);
        setExerciseForm({
            title: ex.title || '',
            description: ex.description || '',
            theory: ex.theory || '',
            exerciseType: ex.exerciseType || 'coding',
            difficulty: ex.difficulty || 'beginner',
            scaffoldLevel: ex.scaffoldLevel || 'guided',
            bloomsLevel: ex.bloomsLevel || 'apply',
            learningObjective: ex.learningObjective || '',
            isReviewExercise: ex.isReviewExercise || false,
            xpReward: ex.xpReward || 15,
            timeLimit: ex.timeLimit || 5,
            starterCode: ex.starterCode || '',
            solutionCode: ex.solutionCode || '',
            testCases: Array.isArray(ex.testCases) ? ex.testCases : [
                { input: '5', expectedOutput: '10', isHidden: false }
            ],
            hints: ex.hints || ['Check your logic.'],
            mcqData: ex.mcqData || (ex.exerciseType === 'mcq' && typeof ex.testCases === 'object' ? ex.testCases : {
                question: 'What is the output?',
                options: ['Option A', 'Option B'],
                correctOption: 0,
                explanation: ''
            }),
            clozeData: ex.clozeData || (ex.exerciseType === 'fill_blank' && typeof ex.testCases === 'object' ? ex.testCases : {
                instruction: 'Fill in the blanks:',
                template: '{{BLANK_1}}',
                blanks: [{ id: 'BLANK_1', correctAnswer: 'val' }]
            }),
            caseStudyData: ex.caseStudyData || (ex.exerciseType === 'case_study' && typeof ex.testCases === 'object' ? ex.testCases : {
                company: 'TechCorp',
                incident: '',
                questions: []
            }),
            arData: ex.arData || (ex.exerciseType === 'assertion_reason' && typeof ex.testCases === 'object' ? ex.testCases : {
                assertion: '',
                reason: '',
                correctOption: 0
            }),
            traceData: ex.traceData || (ex.exerciseType === 'code_trace' && typeof ex.testCases === 'object' ? ex.testCases : {
                codeSnippet: '',
                tableHeaders: ['Step', 'Value']
            }),
            debugData: ex.debugData || (ex.exerciseType === 'code_debug' && typeof ex.testCases === 'object' ? ex.testCases : {
                buggyCode: '',
                solutionCode: ''
            })
        });
        setIsEditingExercise(true);
    };


    // AI Copilot Integration Callbacks
    const handleApplyAiOutline = (aiOutline) => {
        if (!aiOutline) return;
        setModuleForm(prev => ({
            ...prev,
            title: aiOutline.title || prev.title,
            titleHindi: aiOutline.titleHindi || prev.titleHindi,
            description: aiOutline.description || prev.description,
            language: aiOutline.language || prev.language,
            boardAligned: aiOutline.boardAligned || prev.boardAligned,
            classLevel: aiOutline.classLevel || prev.classLevel,
            pedagogyConfig: aiOutline.pedagogyConfig || prev.pedagogyConfig
        }));

        if (aiOutline.units && Array.isArray(aiOutline.units) && aiOutline.units.length > 0) {
            setUnits(aiOutline.units.map((u, i) => ({
                id: `ai_unit_${i + 1}_${Date.now()}_${Math.random()}`,
                unitNumber: u.unitNumber || i + 1,
                title: u.title,
                description: u.description,
                expectedHours: u.expectedHours || 4,
                unlockThreshold: u.unlockThreshold || 80,
                theoryData: {
                    summary: u.description || `Core concepts for ${u.title}`,
                    content: u.theory || (Array.isArray(u.keyConcepts) ? `## Key Concepts\n\n${u.keyConcepts.map(c => `- ${c}`).join('\n')}` : ''),
                    miniCheckpoints: Array.isArray(u.miniCheckpoints) ? u.miniCheckpoints : [],
                    cbseTips: Array.isArray(u.cbseTips) ? u.cbseTips : []
                },
                exercises: (u.exercises || []).map((ex, eIdx) => ({
                    id: `ai_ex_${eIdx + 1}_${Date.now()}_${Math.random()}`,
                    title: ex.title,
                    description: ex.description,
                    theory: ex.theory || '',
                    exerciseType: ex.exerciseType || 'coding',
                    difficulty: ex.difficulty || 'beginner',
                    scaffoldLevel: ex.scaffoldLevel || 'guided',
                    bloomsLevel: ex.bloomsLevel || 'apply',
                    learningObjective: ex.learningObjective || '',
                    xpReward: ex.xpReward || 15,
                    timeLimit: ex.timeLimit || 5,
                    isReviewExercise: ex.isReviewExercise || false,
                    starterCode: ex.starterCode || (ex.testCases?.template ? ex.testCases.template : ''),
                    solutionCode: ex.solutionCode || '',
                    testCases: Array.isArray(ex.testCases) ? ex.testCases : [],
                    hints: ex.hints || [],
                    mcqData: ex.exerciseType === 'mcq' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    clozeData: ex.exerciseType === 'fill_blank' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    caseStudyData: ex.exerciseType === 'case_study' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    arData: ex.exerciseType === 'assertion_reason' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    traceData: ex.exerciseType === 'code_trace' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    debugData: ex.exerciseType === 'code_debug' && typeof ex.testCases === 'object' ? ex.testCases : null
                }))
            })));
            setSelectedUnitIdx(0);
        }
    };

    const handleApplyAiExercise = (aiEx) => {
        if (!aiEx) return;
        const currentType = aiEx.exerciseType || 'coding';
        setExerciseForm(prev => ({
            ...prev,
            title: aiEx.title || '',
            description: aiEx.description || '',
            theory: aiEx.theory || '',
            exerciseType: currentType,
            difficulty: aiEx.difficulty || 'beginner',
            scaffoldLevel: aiEx.scaffoldLevel || 'guided',
            bloomsLevel: aiEx.bloomsLevel || 'apply',
            learningObjective: aiEx.learningObjective || '',
            xpReward: aiEx.xpReward || 15,
            timeLimit: aiEx.timeLimit || 5,
            isReviewExercise: aiEx.isReviewExercise || false,
            starterCode: aiEx.starterCode || (currentType === 'fill_blank' && aiEx.testCases?.template ? aiEx.testCases.template : ''),
            solutionCode: aiEx.solutionCode || '',
            testCases: Array.isArray(aiEx.testCases) ? aiEx.testCases : prev.testCases,
            hints: aiEx.hints || prev.hints,
            mcqData: currentType === 'mcq' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.mcqData,
            clozeData: currentType === 'fill_blank' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.clozeData,
            caseStudyData: currentType === 'case_study' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.caseStudyData,
            arData: currentType === 'assertion_reason' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.arData,
            traceData: currentType === 'code_trace' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.traceData,
            debugData: currentType === 'code_debug' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.debugData
        }));
        setIsEditingExercise(true);
    };

    // Final Create & Deploy Handler
    const handleFinalDeploy = async (shouldPublishNow = false) => {
        if (!moduleForm.title.trim()) {
            toast.error('Module Title is required');
            setCurrentStep(1);
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Create or Update Module
            const isPublishing = Boolean(shouldPublishNow);
            const createPayload = {
                ...moduleForm,
                isPublished: isPublishing, // Strictly false when saving as draft!
                totalUnits: units.length,
                totalExercises: pedagogyStats.totalExercises
            };

            const isExistingModule = Boolean(initialData?.id && isRealDbUuid(initialData.id));
            let moduleId = isExistingModule ? initialData.id : null;
            if (moduleId) {
                await trainingAPI.updateModule(moduleId, createPayload);
            } else {
                const modRes = await trainingAPI.createModule(createPayload);
                const createdModule = modRes.data?.data?.module || modRes.data?.module;
                moduleId = createdModule?.id;
            }

            if (!moduleId || !isRealDbUuid(moduleId)) {
                throw new Error('Failed to obtain a valid Module ID from server.');
            }

            // 2. Create / Update Units & Exercises in order
            const updatedUnitsWithRealIds = [...units];
            for (let uIdx = 0; uIdx < units.length; uIdx++) {
                const u = units[uIdx];
                let createdUnitId = null;

                // Only attempt to update if this is an existing module being edited AND u.id is a real DB UUID
                if (isExistingModule && isRealDbUuid(u.id)) {
                    try {
                        const updateRes = await trainingAPI.updateUnit(u.id, {
                            unitNumber: uIdx + 1,
                            title: u.title || `Unit ${uIdx + 1}`,
                            description: u.description || '',
                            expectedHours: Number(u.expectedHours) || 4,
                            unlockThreshold: Number(u.unlockThreshold) || 80,
                            sequenceOrder: uIdx
                        });
                        createdUnitId = updateRes.data?.data?.unit?.id || updateRes.data?.unit?.id || u.id;
                    } catch (uErr) {
                        console.warn(`Unit update failed for ${u.id}, will create fresh:`, uErr.message);
                        createdUnitId = null;
                    }
                }

                // If new module or unit does not exist in DB yet, create it fresh
                if (!createdUnitId || !isRealDbUuid(createdUnitId)) {
                    const unitRes = await trainingAPI.createUnit(moduleId, {
                        unitNumber: uIdx + 1,
                        title: u.title || `Unit ${uIdx + 1}`,
                        description: u.description || '',
                        expectedHours: Number(u.expectedHours) || 4,
                        unlockThreshold: Number(u.unlockThreshold) || 80,
                        sequenceOrder: uIdx
                    });
                    createdUnitId = unitRes.data?.data?.unit?.id || unitRes.data?.unit?.id || unitRes.data?.id;
                }

                if (!createdUnitId || !isRealDbUuid(createdUnitId)) {
                    throw new Error(`Failed to create or update Unit #${uIdx + 1} (${u.title || 'Untitled'}).`);
                }

                updatedUnitsWithRealIds[uIdx] = { ...u, id: createdUnitId };

                // Save Pre-Lab Theory & Checkpoints if available
                const theoryToSave = u.theoryData || (u.theory ? {
                    summary: u.description || `Key concepts of ${u.title}`,
                    content: u.theory,
                    keyConcepts: Array.isArray(u.keyConcepts) ? u.keyConcepts : [],
                    miniCheckpoints: Array.isArray(u.miniCheckpoints) ? u.miniCheckpoints : [],
                    cbseTips: Array.isArray(u.cbseTips) ? u.cbseTips : []
                } : null);

                if (theoryToSave && createdUnitId && isRealDbUuid(createdUnitId)) {
                    try {
                        await trainingAPI.updateUnitTheory(createdUnitId, {
                            summary: theoryToSave.summary || u.description || '',
                            content: theoryToSave.content || theoryToSave.readingContent || theoryToSave.text || u.theory || '',
                            keyConcepts: Array.isArray(theoryToSave.keyConcepts) ? theoryToSave.keyConcepts : (Array.isArray(u.keyConcepts) ? u.keyConcepts : []),
                            miniCheckpoints: Array.isArray(theoryToSave.miniCheckpoints) ? theoryToSave.miniCheckpoints : [],
                            cbseTips: Array.isArray(theoryToSave.cbseTips) ? theoryToSave.cbseTips : []
                        });
                    } catch (tErr) {
                        console.warn('Could not save unit theory:', tErr.message);
                    }
                }

                // Create Exercises for this unit
                if (u.exercises && u.exercises.length > 0 && createdUnitId && isRealDbUuid(createdUnitId)) {
                    for (let eIdx = 0; eIdx < u.exercises.length; eIdx++) {
                        const ex = u.exercises[eIdx];
                        const fullDescription = ex.theory
                            ? `## 📖 Learning Content\n\n${ex.theory}\n\n---\n\n## 🎯 Problem Statement\n\n${ex.description}`
                            : ex.description;

                        const starterCodeToSave = ex.starterCode || (ex.exerciseType === 'code_debug' ? ex.testCases?.buggyCode : null) || null;
                        const safeTestCases = typeof ex.testCases === 'string' ? ex.testCases : JSON.stringify(ex.testCases || []);
                        const safeHints = typeof ex.hints === 'string' ? ex.hints : JSON.stringify(ex.hints || []);

                        await trainingAPI.createExercise(createdUnitId, {
                            title: ex.title || `Exercise ${eIdx + 1}`,
                            description: fullDescription || '',
                            exerciseType: ex.exerciseType || 'coding',
                            difficulty: ex.difficulty || 'beginner',
                            scaffoldLevel: ex.scaffoldLevel || 'guided',
                            bloomsLevel: ex.bloomsLevel || 'apply',
                            learningObjective: ex.learningObjective || '',
                            isReviewExercise: ex.isReviewExercise || false,
                            xpReward: Number(ex.xpReward) || 15,
                            timeLimit: Number(ex.timeLimit) || 5,
                            sequenceOrder: eIdx,
                            starterCode: starterCodeToSave,
                            solutionCode: ex.solutionCode || null,
                            testCases: safeTestCases,
                            hints: safeHints
                        });
                    }
                }
            }

            // Sync local state with genuine DB IDs
            setUnits(updatedUnitsWithRealIds);

            // 3. Ensure module is published ONLY if isPublishing is true
            if (isPublishing) {
                try {
                    await trainingAPI.updateModule(moduleId, { isPublished: true });
                } catch (pErr) {
                    console.warn('Publish flag update notice:', pErr.message);
                }

                // 4. Assign to Classes ONLY if isPublishing is true AND targetClasses are selected
                if (targetClasses.length > 0) {
                    try {
                        await trainingAPI.assignModule(moduleId, {
                            classIds: targetClasses,
                            deadline: deadline || undefined,
                            notes: specialNotes || undefined
                        });
                    } catch (assignErr) {
                        console.warn('Class allocation warning:', assignErr.message);
                    }
                }
            }

            toast.success(isPublishing ? '🎉 Training Module Created & Published!' : '💾 Training Module Saved as Draft!');
            localStorage.removeItem('ulrms_training_wizard_draft');
            if (onSuccess) onSuccess({ id: moduleId, ...createPayload, isPublished: isPublishing });
            onClose();
            router.push(`/admin/training/${moduleId}/builder`);
        } catch (err) {
            console.error('Module creation error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to create training module');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
                
                {/* Top Stepper Bar */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                Pedagogy Course Architect • Step {currentStep} of 6
                            </span>
                            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {lastSavedTime ? `Auto-saved ${lastSavedTime}` : 'Auto-save active'}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {STEP_TITLES[currentStep - 1].title}
                        </h2>
                    </div>

                    {/* Step indicator pills */}
                    <div className="flex items-center gap-2">
                        {STEP_TITLES.map(s => {
                            const isCompleted = s.step === 1 ? isStep1Complete : s.step === 2 ? isStep2Complete : s.step === 3 ? isStep3Complete : s.step === 4 ? isStep4Complete : s.step === 5 ? isStep5Complete : isStep6Complete;
                            const isAccessible = canAccessStep(s.step);

                            return (
                                <button
                                    key={s.step}
                                    onClick={() => handleAttemptNavigateStep(s.step)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        currentStep === s.step
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                                            : isCompleted
                                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                                            : isAccessible
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                            : 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 opacity-60 cursor-not-allowed'
                                    }`}
                                    title={!isAccessible ? `Complete Step ${s.step - 1} first` : s.title}
                                >
                                    {isCompleted && currentStep !== s.step ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    ) : !isAccessible ? (
                                        <Lock className="w-3 h-3 text-slate-400" />
                                    ) : (
                                        <span>{s.step}</span>
                                    )}
                                    <span className="hidden md:inline">{s.title.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Draft Recovery Banner */}
                {hasSavedDraft && (
                    <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1.5">
                            💾 An unsaved course blueprint draft was found in local storage.
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRestoreDraft}
                                className="px-2.5 py-1 bg-amber-600 text-white hover:bg-amber-500 font-bold rounded-lg text-[11px] shadow transition"
                            >
                                Restore Draft
                            </button>
                            <button
                                onClick={handleDiscardDraft}
                                className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-medium"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Step Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* ========================================================= */}
                    {/* STEP 1: BLUEPRINT & META                                  */}
                    {/* ========================================================= */}
                    {currentStep === 1 && (
                        <div className="space-y-5 max-w-3xl mx-auto">
                            {/* In-Place AI Curriculum Architect & RAG Grounding Studio */}
                            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-5 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                                            <Sparkles className="w-4 h-4 animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                AI Curriculum Architect & RAG Grounding Studio
                                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                                                    Step 1 ➔ 2 ➔ 3 Auto-Fill
                                                </span>
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                Generate the full course blueprint, curriculum units, and starter challenges in one click.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mode & Provider Pickers */}
                                    <div className="flex items-center gap-2">
                                        <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl flex items-center text-xs font-bold">
                                            <button
                                                type="button"
                                                onClick={() => setStep1AiMode('topic')}
                                                className={`px-3 py-1 rounded-lg transition ${
                                                    step1AiMode === 'topic' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                ⚡ Quick Topic
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStep1AiMode('rag')}
                                                className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                                                    step1AiMode === 'rag' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                <FileText className="w-3.5 h-3.5" /> 📄 Syllabus RAG
                                            </button>
                                        </div>

                                        <select
                                            value={step1AiProvider}
                                            onChange={e => setStep1AiProvider(e.target.value)}
                                            className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-700 dark:text-slate-300"
                                        >
                                            <option value="gemini">✨ Gemini (Default)</option>
                                            <option value="groq">⚡ Groq (Fast)</option>
                                        </select>
                                    </div>
                                </div>

                                {step1AiMode === 'topic' ? (
                                    /* Mode 1: Quick Topic Prompt */
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={step1AiPrompt}
                                            onChange={e => setStep1AiPrompt(e.target.value)}
                                            placeholder="e.g. Python: Object Oriented Programming (Classes, Polymorphism & Inheritance)..."
                                            className="input text-xs flex-1 py-2.5 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-500/20"
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleStep1AiGenerate(); } }}
                                        />
                                        <button
                                            type="button"
                                            disabled={step1AiLoading || (!step1AiPrompt.trim() && !moduleForm.title.trim())}
                                            onClick={handleStep1AiGenerate}
                                            className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl shrink-0 flex items-center gap-2 shadow-md shadow-indigo-600/25 disabled:opacity-50 transition"
                                        >
                                            {step1AiLoading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Synthesizing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4" />
                                                    <span>✨ Synthesize Blueprint & Units</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    /* Mode 2: RAG Document / Notes Upload & Paste */
                                    <div className="space-y-3 bg-white/70 dark:bg-slate-900/70 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                                    Attach Syllabus PDF / Notes / Textbook Image
                                                </label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.txt,.md,image/*"
                                                    onChange={handleStep1FileUpload}
                                                    className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300 w-full"
                                                />
                                                {step1FileName && (
                                                    <div className="mt-1.5 flex items-center justify-between text-xs bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-2.5 py-1.5 text-indigo-700 dark:text-indigo-300 font-medium">
                                                        <span className="truncate flex items-center gap-1.5">
                                                            📎 <span className="font-bold">{step1FileName}</span>
                                                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                                                ✓ Saved to Documents &gt; RAG
                                                            </span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setStep1FileName(''); setStep1DocumentText(''); setStep1ImageBase64(null); setRagKeyTopics([]); }}
                                                            className="text-rose-500 hover:underline text-[11px] font-semibold ml-2 shrink-0"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                                {ragKeyTopics && ragKeyTopics.length > 0 && (
                                                    <div className="mt-2 p-2.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/70 dark:border-indigo-800/60">
                                                        <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 mb-1.5">
                                                            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                                            Reading Topics Extracted from Document:
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {ragKeyTopics.map((top, tIdx) => (
                                                                <span
                                                                    key={tIdx}
                                                                    className="inline-flex items-center gap-1 text-[11px] bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-medium px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-700 shadow-2xs"
                                                                >
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                                    {top}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                                    Course Topic / Custom Guidance Hint
                                                </label>
                                                <input
                                                    type="text"
                                                    value={step1AiPrompt}
                                                    onChange={e => setStep1AiPrompt(e.target.value)}
                                                    placeholder="e.g. CBSE Class 11 Computer Science Unit 2"
                                                    className="input text-xs py-1.5 bg-white dark:bg-slate-900"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                                Or Paste Syllabus Curriculum Text Directly:
                                            </label>
                                            <textarea
                                                value={step1DocumentText}
                                                onChange={e => setStep1DocumentText(e.target.value)}
                                                placeholder="Paste chapter excerpts, topic lists, syllabus learning outcomes here..."
                                                className="input h-20 text-xs font-mono"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[10px] text-slate-400">
                                                RAG extracts and grounds Blueprint, Units, Pre-Lab Theory, and multi-modal Challenges directly from your resource.
                                            </span>
                                            <button
                                                type="button"
                                                disabled={step1AiLoading || (!step1DocumentText.trim() && !step1ImageBase64 && !step1AiPrompt.trim())}
                                                onClick={handleStep1AiGenerate}
                                                className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5 rounded-xl shrink-0 flex items-center gap-2 shadow-md shadow-indigo-600/25 disabled:opacity-50 transition"
                                            >
                                                {step1AiLoading ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        <span>Extracting & Synthesizing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        <span>✨ Synthesize Grounded Course (RAG)</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="label mb-0">Course Title (English) *</label>
                                        {isAnalyzingTitle && (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 animate-pulse">
                                                <Sparkles className="w-3 h-3 animate-spin text-indigo-500" />
                                                Reading PDF content with Gemini...
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        className={`input ${isAnalyzingTitle ? 'border-indigo-400 ring-2 ring-indigo-200/50 dark:ring-indigo-800/50' : ''}`}
                                        placeholder={isAnalyzingTitle ? "📖 Reading sufficient PDF content to extract course title..." : "e.g. Python Object-Oriented Architecture"}
                                        value={moduleForm.title}
                                        onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="label">Course Title (Hindi / Bilingual)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. पायथन ऑब्जेक्ट-ओरिएंटेड प्रोग्रामिंग"
                                        value={moduleForm.titleHindi}
                                        onChange={e => setModuleForm(f => ({ ...f, titleHindi: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Course Description & Outcomes</label>
                                <textarea
                                    className="input h-24"
                                    placeholder="Explain the pedagogical objectives and concepts students will master..."
                                    value={moduleForm.description}
                                    onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Language Sandbox Engine</label>
                                    <select
                                        className="input"
                                        value={moduleForm.language}
                                        onChange={e => setModuleForm(f => ({ ...f, language: e.target.value }))}
                                    >
                                        <option value="python">Python (Local / Wandbox API)</option>
                                        <option value="html">HTML5 / CSS (Live Render)</option>
                                        <option value="javascript">JavaScript (NodeJS)</option>
                                        <option value="sql">SQL Query Arena</option>
                                        <option value="cpp">C++ (GCC Compiler)</option>
                                        <option value="java">Java (OpenJDK)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Curriculum / Board</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="PSEB / CBSE / College"
                                        value={moduleForm.boardAligned}
                                        onChange={e => setModuleForm(f => ({ ...f, boardAligned: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="label">Target Class Level</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={moduleForm.classLevel}
                                        onChange={e => setModuleForm(f => ({ ...f, classLevel: parseInt(e.target.value) || 11 }))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* STEP 2: UNITS & MASTERY GATES                             */}
                    {/* ========================================================= */}
                    {/* ========================================================= */}
                    {/* STEP 2: UNITS & MASTERY GATES (UNIFIED IN-PLACE)          */}
                    {/* ========================================================= */}
                    {currentStep === 2 && (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            {wizardTheoryUnitIdx !== null ? (
                                /* In-Place Pre-Lab Theory Studio (Zero Modal Stacking) */
                                <div className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setWizardTheoryUnitIdx(null)}
                                            className="btn btn-secondary text-xs flex items-center gap-1.5 font-bold"
                                        >
                                            <ArrowLeft className="w-4 h-4" /> Back to Units List
                                        </button>
                                        <div className="text-center">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                                Pre-Lab Theory & Interactive Checkpoints
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                {wizardTheoryForm.title} • CBSE Concept Grounding
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSaveWizardTheory}
                                            className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md"
                                        >
                                            Save Pre-Lab Theory
                                        </button>
                                    </div>

                            {/* Inline AI Theory Synthesizer Bar */}
                            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                        <span>AI Pre-Lab Notes & Checkpoints Synthesizer</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium">Auto-fills Markdown & Checkpoints</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={wizardInlineAiTheoryPrompt}
                                        onChange={e => setWizardInlineAiTheoryPrompt(e.target.value)}
                                        placeholder={`Enter unit concept (e.g. '${wizardTheoryForm.title}')...`}
                                        className="input text-xs flex-1 py-2 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAiGenerateTheoryInWizard(); } }}
                                    />
                                    <button
                                        type="button"
                                        disabled={wizardInlineAiTheoryLoading}
                                        onClick={handleInlineAiGenerateTheoryInWizard}
                                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                                    >
                                        {wizardInlineAiTheoryLoading ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Synthesizing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>✨ Auto-Fill Theory</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="label">Unit Concept Summary</label>
                                <input
                                    type="text"
                                    value={wizardTheoryForm.summary}
                                    onChange={e => setWizardTheoryForm(f => ({ ...f, summary: e.target.value }))}
                                    className="input text-xs"
                                    placeholder="Brief core concept takeaway..."
                                />
                            </div>

                            <div>
                                <label className="label">Full Concept Notes & Theory (Markdown)</label>
                                <textarea
                                    value={wizardTheoryForm.content}
                                    onChange={e => setWizardTheoryForm(f => ({ ...f, content: e.target.value }))}
                                    className="input h-36 font-mono text-xs"
                                    placeholder="## Concept Overview&#10;&#10;Explain syntax, execution model, and edge cases..."
                                />
                            </div>

                            {/* Mini Checkpoints */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                        Interactive Mini-Checkpoints ({wizardTheoryForm.miniCheckpoints?.length || 0})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setWizardTheoryForm(f => ({
                                            ...f,
                                            miniCheckpoints: [
                                                ...(f.miniCheckpoints || []),
                                                {
                                                    id: `cp_${Date.now()}`,
                                                    question: '',
                                                    options: ['', ''],
                                                    correctOption: 0,
                                                    explanation: ''
                                                }
                                            ]
                                        }))}
                                        className="btn btn-secondary text-xs py-1 px-2.5 rounded-lg flex items-center gap-1 font-semibold"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Checkpoint
                                    </button>
                                </div>

                                {(wizardTheoryForm.miniCheckpoints || []).map((cp, cIdx) => (
                                    <div key={cp.id || cIdx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                Checkpoint #{cIdx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setWizardTheoryForm(f => ({
                                                    ...f,
                                                    miniCheckpoints: f.miniCheckpoints.filter((_, i) => i !== cIdx)
                                                }))}
                                                className="text-rose-500 hover:text-rose-600 p-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={cp.question}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setWizardTheoryForm(f => {
                                                    const cps = [...f.miniCheckpoints];
                                                    cps[cIdx] = { ...cps[cIdx], question: val };
                                                    return { ...f, miniCheckpoints: cps };
                                                });
                                            }}
                                            placeholder="Quick comprehension check question..."
                                            className="input text-xs"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            {(cp.options || []).map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-1.5">
                                                    <input
                                                        type="radio"
                                                        name={`wiz_cp_${cIdx}`}
                                                        checked={cp.correctOption === oIdx}
                                                        onChange={() => setWizardTheoryForm(f => {
                                                            const cps = [...f.miniCheckpoints];
                                                            cps[cIdx] = { ...cps[cIdx], correctOption: oIdx };
                                                            return { ...f, miniCheckpoints: cps };
                                                        })}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setWizardTheoryForm(f => {
                                                                const cps = [...f.miniCheckpoints];
                                                                const opts = [...cps[cIdx].options];
                                                                opts[oIdx] = val;
                                                                cps[cIdx] = { ...cps[cIdx], options: opts };
                                                                return { ...f, miniCheckpoints: cps };
                                                            });
                                                        }}
                                                        placeholder={`Option ${oIdx + 1}`}
                                                        className="input text-xs py-1 flex-1"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                                </div>
                            ) : (
                                /* Curriculum Units Hierarchy */
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Curriculum Units Hierarchy</h3>
                                            <p className="text-xs text-slate-500">Each unit acts as a progressive learning milestone with a mastery unlock threshold.</p>
                                        </div>
                                        <button
                                            onClick={handleAddUnit}
                                            className="btn btn-primary text-xs flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Unit
                                        </button>
                                    </div>

                                    {/* Inline In-Place AI Course Outliner Bar */}
                                    <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                                <span>AI Course Outliner & Unit Synthesizer</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500 font-medium">Model:</span>
                                                <select
                                                    value={wizardInlineAiOutlineProvider}
                                                    onChange={e => setWizardInlineAiOutlineProvider(e.target.value)}
                                                    className="text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5"
                                                >
                                                    <option value="gemini">✨ Gemini (Default)</option>
                                                    <option value="groq">⚡ Groq (Fast)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={wizardInlineAiOutlinePrompt}
                                                onChange={e => setWizardInlineAiOutlinePrompt(e.target.value)}
                                                placeholder="Enter course topic or chapter (e.g. 'Class 11 Python: Control Structures & Functions')..."
                                                className="input text-xs flex-1 py-2 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAiGenerateOutlineInWizard(); } }}
                                            />
                                            <button
                                                type="button"
                                                disabled={wizardInlineAiOutlineLoading || !wizardInlineAiOutlinePrompt.trim()}
                                                onClick={handleInlineAiGenerateOutlineInWizard}
                                                className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                                            >
                                                {wizardInlineAiOutlineLoading ? (
                                                    <>
                                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        <span>Synthesizing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        <span>✨ Generate Units</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            Synthesizes 3–5 pedagogical units with titles, milestones, expected hours, and mastery gates in-place.
                                        </p>
                                    </div>

                            <div className="space-y-3">
                                {units.map((unit, idx) => (
                                    <div
                                        key={unit.id || idx}
                                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={unit.title}
                                                    onChange={e => handleUpdateUnit(idx, 'title', e.target.value)}
                                                    className="input font-bold text-sm flex-1 w-full"
                                                    placeholder="Unit Title (e.g. 'Constants, Rounding & Number-Theoretic Functions')..."
                                                />
                                            </div>

                                            <button
                                                onClick={() => handleRemoveUnit(idx)}
                                                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div>
                                            <input
                                                type="text"
                                                value={unit.description || ''}
                                                onChange={e => handleUpdateUnit(idx, 'description', e.target.value)}
                                                className="input text-xs"
                                                placeholder="Unit description & learning milestones..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-1">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                <span className="text-xs text-slate-600 dark:text-slate-400">Est. Hours:</span>
                                                <input
                                                    type="number"
                                                    value={unit.expectedHours || 4}
                                                    onChange={e => handleUpdateUnit(idx, 'expectedHours', parseInt(e.target.value) || 4)}
                                                    className="input w-20 text-xs py-1"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-emerald-500" />
                                                <span className="text-xs text-slate-600 dark:text-slate-400">Unlock Gate %:</span>
                                                <input
                                                    type="number"
                                                    value={unit.unlockThreshold || 80}
                                                    onChange={e => handleUpdateUnit(idx, 'unlockThreshold', parseInt(e.target.value) || 80)}
                                                    className="input w-20 text-xs py-1 font-bold text-emerald-600"
                                                />
                                            </div>
                                        </div>

                                        {/* Reading Topics Pill Row in Step 2 Unit Card */}
                                        {(() => {
                                            const unitTopics = extractTopicsFromUnit(unit);
                                            if (!unitTopics || unitTopics.length === 0) return null;
                                            return (
                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1">
                                                        <BookOpen className="w-3 h-3 text-indigo-500" /> Reading Topics:
                                                    </span>
                                                    {unitTopics.slice(0, 5).map((t, ti) => (
                                                        <span key={ti} className="text-[10px] bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
                                                            {t}
                                                        </span>
                                                    ))}
                                                    {unitTopics.length > 5 && (
                                                        <span className="text-[10px] text-slate-400 font-semibold">
                                                            +{unitTopics.length - 5} more
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenWizardTheory(idx)}
                                                    className={`btn text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-bold transition ${
                                                        unit.theoryData?.content
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                                            : 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                                    }`}
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    {unit.theoryData?.content ? '📖 Theory & Checkpoints Set' : '📖 Pre-Lab Theory & Checks'}
                                                </button>
                                                {unit.theoryData?.miniCheckpoints?.length > 0 && (
                                                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                                                        {unit.theoryData.miniCheckpoints.length} checks
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-slate-400">
                                                {unit.exercises?.length || 0} exercises configured
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* ========================================================= */}
                    {/* STEP 3: EXERCISES ARENA (UNIFIED IN-PLACE)                */}
                    {/* ========================================================= */}
                    {currentStep === 3 && (
                        <div className="space-y-4 max-w-5xl mx-auto">
                            {isEditingExercise ? (
                                /* In-Place Exercise Studio (Zero Modal Stacking) */
                                <div className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => { setIsEditingExercise(false); setEditingExerciseIdx(null); }}
                                            className="btn btn-secondary text-xs flex items-center gap-1.5 font-bold"
                                        >
                                            <ArrowLeft className="w-4 h-4" /> Back to Exercise List
                                        </button>
                                        <div className="text-center">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                                {editingExerciseIdx !== null ? `Edit Challenge: ${exerciseForm.title || 'Untitled'}` : `Add Challenge to ${units[selectedUnitIdx]?.title || 'Unit'}`}
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                Multi-Modal Assessment Studio (All 8 Question Types)
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSaveExercise}
                                            className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md"
                                        >
                                            Save Exercise to Unit
                                        </button>
                                    </div>

                            {/* Inline In-Place AI Generator Bar */}
                            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                        <span>AI In-Place Challenge Synthesizer</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 font-medium">Model:</span>
                                        <select
                                            value={wizardInlineAiProvider}
                                            onChange={e => setWizardInlineAiProvider(e.target.value)}
                                            className="text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5"
                                        >
                                            <option value="gemini">✨ Gemini (Default)</option>
                                            <option value="groq">⚡ Groq (Fast)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={wizardInlineAiPrompt}
                                        onChange={e => setWizardInlineAiPrompt(e.target.value)}
                                        placeholder={`Enter topic or concept (e.g. 'Dry-Run trace loop' or 'Assertion on immutability')...`}
                                        className="input text-xs flex-1 py-2 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAiGenerateExerciseInWizard(); } }}
                                    />
                                    <button
                                        type="button"
                                        disabled={wizardInlineAiLoading || !wizardInlineAiPrompt.trim()}
                                        onClick={handleInlineAiGenerateExerciseInWizard}
                                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                                    >
                                        {wizardInlineAiLoading ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Synthesizing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>✨ Auto-Fill Challenge</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Auto-fills Title, Problem Statement, Solution, and test data directly into this form without modal switching.
                                </p>
                            </div>

                            {/* Exercise Type Picker */}
                            <div>
                                <label className="label">Question / Challenge Type</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        { id: 'coding', label: '⚡ Coding Lab' },
                                        { id: 'mcq', label: '📝 Output MCQ' },
                                        { id: 'fill_blank', label: '🧩 Syntax Cloze' },
                                        { id: 'bug_fix', label: '🐞 Bug Hunt' },
                                        { id: 'case_study', label: '🏢 Case Study' },
                                        { id: 'assertion_reason', label: '⚖️ Assertion-Reason' },
                                        { id: 'code_trace', label: '🔍 Dry-Run Trace' },
                                        { id: 'code_debug', label: '🐞 CBSE Error Debug' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setExerciseForm(f => ({ ...f, exerciseType: t.id }))}
                                            className={`p-2 rounded-xl text-xs font-bold border transition ${
                                                exerciseForm.exerciseType === t.id
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Problem Title *</label>
                                    <input
                                        type="text"
                                        value={exerciseForm.title}
                                        onChange={e => setExerciseForm(f => ({ ...f, title: e.target.value }))}
                                        className="input"
                                        placeholder="e.g. Find Max In Array"
                                    />
                                </div>
                                <div>
                                    <label className="label">XP Reward</label>
                                    <input
                                        type="number"
                                        value={exerciseForm.xpReward}
                                        onChange={e => setExerciseForm(f => ({ ...f, xpReward: parseInt(e.target.value) || 15 }))}
                                        className="input font-bold text-amber-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Learning Theory / Lesson Content</label>
                                <textarea
                                    value={exerciseForm.theory}
                                    onChange={e => setExerciseForm(f => ({ ...f, theory: e.target.value }))}
                                    placeholder="Explain the concept before the student attempts the problem..."
                                    className="input h-20 text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label className="label">Problem Statement / Prompt</label>
                                <textarea
                                    value={exerciseForm.description}
                                    onChange={e => setExerciseForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Problem statement instructions..."
                                    className="input h-20 text-xs"
                                />
                            </div>

                            {/* Specific Editors for each Exercise Type */}
                            {exerciseForm.exerciseType === 'mcq' && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-amber-600 flex items-center gap-1.5">
                                        <CheckSquare className="w-4 h-4" /> MCQ Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Target Code Snippet to Trace:</label>
                                        <textarea
                                            value={exerciseForm.mcqData.codeSnippet}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                mcqData: { ...f.mcqData, codeSnippet: e.target.value }
                                            }))}
                                            className="input h-20 font-mono text-xs mt-1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold">Multiple Choice Options (Select correct option):</label>
                                        {exerciseForm.mcqData.options.map((opt, oi) => (
                                            <div key={oi} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="correct_mcq_opt"
                                                    checked={exerciseForm.mcqData.correctOption === oi}
                                                    onChange={() => setExerciseForm(f => ({
                                                        ...f,
                                                        mcqData: { ...f.mcqData, correctOption: oi }
                                                    }))}
                                                />
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={e => {
                                                        const nextOpts = [...exerciseForm.mcqData.options];
                                                        nextOpts[oi] = e.target.value;
                                                        setExerciseForm(f => ({
                                                            ...f,
                                                            mcqData: { ...f.mcqData, options: nextOpts }
                                                        }));
                                                    }}
                                                    className="input text-xs py-1 flex-1 font-mono"
                                                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {exerciseForm.exerciseType === 'fill_blank' && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-cyan-600 flex items-center gap-1.5">
                                        <FileText className="w-4 h-4" /> Syntax Cloze Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Code Template with {"{{BLANK_1}}"} Tokens:</label>
                                        <textarea
                                            value={exerciseForm.clozeData.template}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                clozeData: { ...f.clozeData, template: e.target.value }
                                            }))}
                                            className="input h-20 font-mono text-xs mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {(exerciseForm.exerciseType === 'coding' || exerciseForm.exerciseType === 'bug_fix') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Starter Code</label>
                                        <textarea
                                            value={exerciseForm.starterCode}
                                            onChange={e => setExerciseForm(f => ({ ...f, starterCode: e.target.value }))}
                                            className="w-full h-28 bg-slate-950 text-emerald-400 font-mono text-xs p-3 rounded-2xl border border-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Solution Code</label>
                                        <textarea
                                            value={exerciseForm.solutionCode}
                                            onChange={e => setExerciseForm(f => ({ ...f, solutionCode: e.target.value }))}
                                            className="w-full h-28 bg-slate-950 text-blue-400 font-mono text-xs p-3 rounded-2xl border border-slate-700"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Assertion-Reason Sub-Form */}
                            {exerciseForm.exerciseType === 'assertion_reason' && (
                                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-indigo-600 flex items-center gap-1.5">
                                        ⚖️ CBSE Assertion-Reason Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Assertion Statement (A):</label>
                                        <textarea
                                            value={exerciseForm.arData?.assertion || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                arData: { ...f.arData, assertion: e.target.value }
                                            }))}
                                            className="input h-16 text-xs mt-1"
                                            placeholder="Statement A to be evaluated..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold">Reason Statement (R):</label>
                                        <textarea
                                            value={exerciseForm.arData?.reason || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                arData: { ...f.arData, reason: e.target.value }
                                            }))}
                                            className="input h-16 text-xs mt-1"
                                            placeholder="Reason R to explain or support A..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1.5">Correct Relationship Option:</label>
                                        {[
                                            'Both A and R are true and R is the correct explanation of A',
                                            'Both A and R are true but R is NOT the correct explanation of A',
                                            'A is true but R is false',
                                            'A is false but R is true'
                                        ].map((opt, oi) => (
                                            <label key={oi} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 py-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="wizardArCorrect"
                                                    checked={exerciseForm.arData?.correctOption === oi}
                                                    onChange={() => setExerciseForm(f => ({
                                                        ...f,
                                                        arData: { ...f.arData, correctOption: oi }
                                                    }))}
                                                />
                                                <span>Option {String.fromCharCode(65 + oi)}: {opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dry-Run Trace Sub-Form */}
                            {exerciseForm.exerciseType === 'code_trace' && (
                                <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 rounded-2xl border border-teal-200 dark:border-teal-800/60 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-teal-600 flex items-center gap-1.5">
                                        🔍 Dry-Run Trace Table Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Code Snippet to Trace:</label>
                                        <textarea
                                            value={exerciseForm.traceData?.codeSnippet || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                traceData: { ...f.traceData, codeSnippet: e.target.value }
                                            }))}
                                            className="input font-mono text-xs h-24 mt-1"
                                            placeholder="for i in range(1, 4): ..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold">Table Headers (comma-separated):</label>
                                        <input
                                            type="text"
                                            value={(exerciseForm.traceData?.tableHeaders || []).join(', ')}
                                            onChange={e => {
                                                const headers = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                setExerciseForm(f => ({
                                                    ...f,
                                                    traceData: { ...f.traceData, tableHeaders: headers }
                                                }));
                                            }}
                                            className="input text-xs mt-1"
                                            placeholder="Step (i), Value of a, Value of b"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* CBSE Code Debug Sub-Form */}
                            {exerciseForm.exerciseType === 'code_debug' && (
                                <div className="p-4 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800/60 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-red-600 flex items-center gap-1.5">
                                        🐞 CBSE Code Debugging Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Buggy Code Given to Student:</label>
                                        <textarea
                                            value={exerciseForm.debugData?.buggyCode || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                debugData: { ...f.debugData, buggyCode: e.target.value },
                                                starterCode: e.target.value
                                            }))}
                                            className="input font-mono text-xs h-24 mt-1"
                                            placeholder="def total(a, b)\n  return a + b"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold">Corrected Solution Code:</label>
                                        <textarea
                                            value={exerciseForm.debugData?.solutionCode || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                debugData: { ...f.debugData, solutionCode: e.target.value },
                                                solutionCode: e.target.value
                                            }))}
                                            className="input font-mono text-xs h-24 mt-1"
                                            placeholder="def total(a, b):\n  return a + b"
                                        />
                                    </div>
                                </div>
                            )}
                                </div>
                            ) : (
                                /* Exercise Cards List View */
                                <div className="space-y-4">
                                    {/* Unit selector pills */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Units:</span>
                                        {units.map((u, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedUnitIdx(i)}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 max-w-sm ${
                                                    selectedUnitIdx === i
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                                title={u.title}
                                            >
                                                <span className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
                                                    {i + 1}
                                                </span>
                                                <span className="truncate text-left">{u.title || `Unit ${i + 1}`}</span>
                                                <span className="text-[10px] bg-black/15 dark:bg-white/15 px-2 py-0.5 rounded-full shrink-0 font-semibold">
                                                    {u.exercises?.length || 0} ex
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Active Unit Header & Actions */}
                                    {units[selectedUnitIdx] && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span className="text-indigo-600 dark:text-indigo-400 shrink-0">Unit {selectedUnitIdx + 1}:</span>
                                                        <span className="break-words">{units[selectedUnitIdx].title}</span>
                                                    </h4>
                                                    <p className="text-xs text-slate-500">
                                                        {units[selectedUnitIdx].exercises?.length || 0} challenges configured • Use the topics below to auto-generate targeted exercises
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={handleOpenCreateExercise}
                                                    className="btn btn-secondary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 font-bold shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> + Manual Exercise
                                                </button>
                                            </div>

                                            {/* Collapsible Unit Knowledge Base & Checkpoint Selector Studio */}
                                            <div className="bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 p-4 space-y-3 shadow-sm">
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">
                                                            <BookOpen className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                Pre-Lab Theory & Practice Checkpoints
                                                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                                                                    {currentSelectedTopics.length} of {availableUnitTopics.length} selected
                                                                </span>
                                                            </h5>
                                                            <p className="text-[11px] text-slate-500">
                                                                Check topics/checkpoints to use as the base for generating relevant exercises
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleToggleSelectAllTopics}
                                                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold px-1"
                                                        >
                                                            {currentSelectedTopics.length === availableUnitTopics.length ? 'Deselect All' : 'Select All'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsTheoryCollapsed(!isTheoryCollapsed)}
                                                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                                                            title={isTheoryCollapsed ? 'Expand Knowledge Base' : 'Collapse Knowledge Base'}
                                                        >
                                                            {isTheoryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {!isTheoryCollapsed && (
                                                    <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                                                        {availableUnitTopics.length === 0 ? (
                                                            <p className="text-xs text-slate-400 italic py-2">
                                                                No specific theory bullet points detected. The generator will use the unit title and description.
                                                            </p>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 bg-white/60 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                                                {availableUnitTopics.map((topic, tIdx) => {
                                                                    const isChecked = currentSelectedTopics.includes(topic);
                                                                    return (
                                                                        <label
                                                                            key={tIdx}
                                                                            className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border transition select-none ${
                                                                                isChecked
                                                                                    ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 font-semibold shadow-xs'
                                                                                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                                                            }`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => handleToggleTopic(topic)}
                                                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                                                            />
                                                                            <span className="truncate max-w-xs">{topic}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* Batch Action Toolbar */}
                                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-semibold text-slate-500">Exercise Type:</span>
                                                                <select
                                                                    value={batchExerciseType}
                                                                    onChange={e => setBatchExerciseType(e.target.value)}
                                                                    className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200"
                                                                >
                                                                    <option value="mixed">⚡ Mixed (Coding + MCQ + Debug)</option>
                                                                    <option value="coding">⚡ Coding Labs Only</option>
                                                                    <option value="mcq">📝 MCQs & Quizzes Only</option>
                                                                    <option value="bug_fix">🐞 Bug Hunts & Debug Only</option>
                                                                    <option value="assertion_reason">⚖️ Assertion-Reason Only</option>
                                                                </select>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {/* Button 1: Generate from Checked Topics */}
                                                                <button
                                                                    type="button"
                                                                    disabled={batchAiLoading || currentSelectedTopics.length === 0}
                                                                    onClick={handleGenerateFromCheckedTopics}
                                                                    className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                                                                >
                                                                    {batchAiLoading ? (
                                                                        <>
                                                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                            <span>Generating...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Sparkles className="w-3.5 h-3.5" />
                                                                            <span>✨ Generate Exercises for Checked ({currentSelectedTopics.length})</span>
                                                                        </>
                                                                    )}
                                                                </button>

                                                                {/* Button 2: Generate from RAG Ebook / Document */}
                                                                <button
                                                                    type="button"
                                                                    disabled={batchAiLoading || (!step1DocumentText.trim() && !step1FileName)}
                                                                    onClick={handleGenerateFromRagDocument}
                                                                    className="btn bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50 transition"
                                                                    title={step1DocumentText ? 'Extract practice exercises from uploaded RAG ebook/syllabus' : 'Attach a RAG document in Step 1 to enable'}
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                    <span>📄 From RAG Ebook</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Quick Custom Topic Synthesizer Bar */}
                                            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                                        <span>Quick Custom Challenge Synthesizer</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-500 font-medium">Model:</span>
                                                        <select
                                                            value={wizardInlineAiProvider}
                                                            onChange={e => setWizardInlineAiProvider(e.target.value)}
                                                            className="text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5"
                                                        >
                                                            <option value="gemini">✨ Gemini (Default)</option>
                                                            <option value="groq">⚡ Groq (Fast)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={wizardInlineAiPrompt}
                                                        onChange={e => setWizardInlineAiPrompt(e.target.value)}
                                                        placeholder="Or enter a specific challenge topic (e.g. 'Dry-Run trace loop' or 'Assertion on immutability')..."
                                                        className="input text-xs flex-1 py-2 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAiGenerateExerciseInWizard(); } }}
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={wizardInlineAiLoading || !wizardInlineAiPrompt.trim()}
                                                        onClick={handleInlineAiGenerateExerciseInWizard}
                                                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                                                    >
                                                        {wizardInlineAiLoading ? (
                                                            <>
                                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                <span>Synthesizing...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="w-3.5 h-3.5" />
                                                                <span>✨ Auto-Fill Single Challenge</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                    {/* Exercise Cards */}
                                    {(!units[selectedUnitIdx].exercises || units[selectedUnitIdx].exercises.length === 0) ? (
                                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                            <Code2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                            <h5 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Exercises in this Unit Yet</h5>
                                            <p className="text-xs text-slate-400 mt-1">Use the buttons above to manually add an exercise or generate one with AI.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {units[selectedUnitIdx].exercises.map((ex, exIdx) => {
                                                const typeBadges = {
                                                    coding: { label: '⚡ Coding Lab', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
                                                    mcq: { label: '📝 Output MCQ', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
                                                    fill_blank: { label: '🧩 Syntax Cloze', bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
                                                    bug_fix: { label: '🐞 Bug Hunt', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
                                                    case_study: { label: '🏢 Case Study', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
                                                    assertion_reason: { label: '⚖️ Assertion-Reason', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
                                                    code_trace: { label: '🔍 Dry-Run Trace', bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
                                                    code_debug: { label: '🐞 CBSE Error Debug', bg: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
                                                };
                                                const badge = typeBadges[ex.exerciseType] || typeBadges.coding;

                                                return (
                                                    <div
                                                        key={exIdx}
                                                        onClick={() => handleOpenEditExercise(exIdx)}
                                                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shadow-sm cursor-pointer transition group"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                                                                {exIdx + 1}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition">
                                                                        {ex.title}
                                                                    </h5>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                                                                        {badge.label}
                                                                    </span>
                                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded capitalize">
                                                                        {ex.scaffoldLevel}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                                                    {ex.description}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-xs font-bold text-amber-500 flex items-center gap-1 mr-1">
                                                                <Award className="w-3.5 h-3.5" /> +{ex.xpReward || 15} XP
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEditExercise(exIdx);
                                                                }}
                                                                className="btn btn-secondary text-xs py-1 px-2.5 rounded-lg flex items-center gap-1 font-semibold"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" /> Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveExercise(exIdx);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                                title="Delete Exercise"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {currentStep === 4 && (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                {/* Pedagogy Score Gauge */}
                                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Calculated Pedagogy Score
                                    </span>
                                    <div className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                                        {pedagogyStats.score}<span className="text-base font-medium text-slate-400">/100</span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {pedagogyStats.score >= 80 ? '🌟 Excellent! Strong pedagogical scaffolding and diversity.' : '💡 Add diverse question types & review exercises to boost score.'}
                                    </p>
                                </div>

                                {/* Active Config Toggles */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={moduleForm.pedagogyConfig.useBlooms}
                                            onChange={e => setModuleForm(f => ({
                                                ...f,
                                                pedagogyConfig: { ...f.pedagogyConfig, useBlooms: e.target.checked }
                                            }))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">Bloom's Taxonomy Cognitive Levels</div>
                                            <div className="text-[11px] text-slate-500">Tag exercises with cognitive complexity.</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={moduleForm.pedagogyConfig.useObjectives}
                                            onChange={e => setModuleForm(f => ({
                                                ...f,
                                                pedagogyConfig: { ...f.pedagogyConfig, useObjectives: e.target.checked }
                                            }))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">Explicit Learning Objectives</div>
                                            <div className="text-[11px] text-slate-500">Declare SWBAT goals per exercise.</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={moduleForm.pedagogyConfig.useTimeLimit}
                                            onChange={e => setModuleForm(f => ({
                                                ...f,
                                                pedagogyConfig: { ...f.pedagogyConfig, useTimeLimit: e.target.checked }
                                            }))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">Time-Boxed Practice</div>
                                            <div className="text-[11px] text-slate-500">Enforce speed-challenge timers.</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* STEP 5: FULL MODULE PREVIEW                              */}
                    {/* ========================================================= */}
                    {currentStep === 5 && (
                        <div className="space-y-6 max-w-4xl mx-auto pb-4">
                            {/* Module Master Banner */}
                            <div className="p-6 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/30 rounded-3xl border border-indigo-200/80 dark:border-indigo-900 shadow-sm space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-xl bg-indigo-600 text-white shadow-xs">
                                                {moduleForm.language}
                                            </span>
                                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {moduleForm.boardAligned || 'CBSE'} • Class {moduleForm.classLevel}
                                            </span>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                Draft / Unpublished
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                            {moduleForm.title || 'Untitled Training Module'}
                                        </h3>
                                        {moduleForm.titleHindi && (
                                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                                                {moduleForm.titleHindi}
                                            </p>
                                        )}
                                        {moduleForm.description && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                                                {moduleForm.description}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(1)}
                                        className="btn btn-secondary text-xs font-bold shrink-0 flex items-center gap-1.5"
                                        title="Edit Title, Language & Alignment"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" /> Edit Meta
                                    </button>
                                </div>

                                {/* Quick Metric Chips */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/60">
                                    <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Units</div>
                                        <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{units.length}</div>
                                    </div>
                                    <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exercises</div>
                                        <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{pedagogyStats.totalExercises}</div>
                                    </div>
                                    <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Est. Hours</div>
                                        <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                            {units.reduce((acc, u) => acc + (Number(u.expectedHours) || 4), 0)}h
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pedagogy Score</div>
                                        <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{pedagogyStats.score}/100</div>
                                    </div>
                                </div>
                            </div>

                            {/* Aggregated Reading Topics Section */}
                            {(() => {
                                const allTopics = Array.from(new Set([
                                    ...(Array.isArray(ragKeyTopics) ? ragKeyTopics : []),
                                    ...units.flatMap(u => extractTopicsFromUnit(u))
                                ])).filter(Boolean);

                                if (allTopics.length === 0) return null;

                                return (
                                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                Extracted Reading Topics & Syllabus Concepts ({allTopics.length}):
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {allTopics.map((top, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 text-[11px] bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-semibold px-2.5 py-1 rounded-xl border border-indigo-200/80 dark:border-indigo-800 shadow-2xs"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                    {top}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Detailed Unit-by-Unit Review Cards */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-indigo-500" />
                                        Curriculum Units & Practice Breakdown ({units.length})
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(2)}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" /> Edit Units & Structure
                                    </button>
                                </div>

                                {units.map((u, uIdx) => {
                                    const uTopics = extractTopicsFromUnit(u);
                                    const uExercises = u.exercises || [];
                                    const theoryData = u.theoryData || (u.theory ? { summary: u.description, content: u.theory } : null);

                                    return (
                                        <div
                                            key={u.id || uIdx}
                                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                                            Unit {u.unitNumber || uIdx + 1}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {u.expectedHours || 4} hrs
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                            <Award className="w-3 h-3" /> {u.unlockThreshold || 80}% Gate
                                                        </span>
                                                    </div>
                                                    <h5 className="text-base font-bold text-slate-900 dark:text-white">
                                                        {u.title}
                                                    </h5>
                                                    {u.description && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            {u.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelectedUnitIdx(uIdx); setCurrentStep(3); }}
                                                        className="btn btn-secondary text-xs py-1.5 px-3 font-semibold flex items-center gap-1"
                                                    >
                                                        <Code2 className="w-3 h-3" /> {uExercises.length} Exercises
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Unit Reading Topics */}
                                            {uTopics.length > 0 && (
                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                                                        <BookOpen className="w-3 h-3 text-indigo-500" /> Key Topics:
                                                    </span>
                                                    {uTopics.map((top, ti) => (
                                                        <span
                                                            key={ti}
                                                            className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                                                        >
                                                            {top}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Pre-Lab Theory Preview Snippet */}
                                            {theoryData && (theoryData.content || theoryData.summary) && (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs space-y-1.5">
                                                    <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                                        <span className="flex items-center gap-1.5">
                                                            <FileText className="w-3.5 h-3.5 text-indigo-500" /> Pre-Lab Theory & Learning Content
                                                        </span>
                                                        {theoryData.miniCheckpoints?.length > 0 && (
                                                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-semibold">
                                                                {theoryData.miniCheckpoints.length} Checkpoint Qs
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                                                        {theoryData.summary || theoryData.content?.slice(0, 180)}...
                                                    </p>
                                                </div>
                                            )}

                                            {/* Exercises inside Unit */}
                                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                                    <span>Challenges & Problem Sets ({uExercises.length})</span>
                                                </div>
                                                {uExercises.length === 0 ? (
                                                    <div className="text-center py-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-medium">
                                                        ⚠️ No exercises added to this unit yet. (Click to generate or add in Step 3)
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {uExercises.map((ex, eIdx) => (
                                                            <div
                                                                key={ex.id || eIdx}
                                                                className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                                                            >
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                                                        {eIdx + 1}. {ex.title}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                                                                        <span className="capitalize font-semibold text-indigo-600 dark:text-indigo-400">{ex.exerciseType || 'coding'}</span>
                                                                        <span>•</span>
                                                                        <span className="capitalize">{ex.difficulty || 'beginner'}</span>
                                                                        <span>•</span>
                                                                        <span>{ex.xpReward || 15} XP</span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                                                                    {ex.bloomsLevel || 'apply'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* CTA Banner at end of Preview */}
                            <div className="p-4 bg-gradient-to-r from-slate-100 to-indigo-50/60 dark:from-slate-800 dark:to-indigo-950/40 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/60 flex items-center justify-between gap-4">
                                <div>
                                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">Ready with this Curriculum?</h5>
                                    <p className="text-xs text-slate-500">Save as an unpublished draft or proceed to assign target classes.</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleFinalDeploy(false)}
                                        disabled={isSubmitting}
                                        className="btn btn-secondary text-xs font-bold"
                                    >
                                        💾 Save as Draft
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(6)}
                                        className="btn btn-primary text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                                    >
                                        Next: Deploy & Assign <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* STEP 6: DEPLOY & ASSIGN                                   */}
                    {/* ========================================================= */}
                    {currentStep === 6 && (
                        <div className="space-y-5 max-w-3xl mx-auto">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900">
                                <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">Course Summary</h4>
                                <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-indigo-800 dark:text-indigo-300">
                                    <div><strong>Title:</strong> {moduleForm.title || 'Untitled'}</div>
                                    <div><strong>Language:</strong> {moduleForm.language}</div>
                                    <div><strong>Units:</strong> {units.length}</div>
                                    <div><strong>Total Exercises:</strong> {pedagogyStats.totalExercises}</div>
                                    <div><strong>Class:</strong> {moduleForm.classLevel}</div>
                                    <div><strong>Board:</strong> {moduleForm.boardAligned}</div>
                                </div>
                            </div>

                            {/* Class Assignment Selector */}
                            <div>
                                <label className="label flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-indigo-500" /> Assign to Classes (Optional)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                                    {availableClasses.map(cls => (
                                        <label
                                            key={cls.id}
                                            className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center gap-2 ${
                                                targetClasses.includes(cls.id)
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={targetClasses.includes(cls.id)}
                                                onChange={e => {
                                                    if (e.target.checked) setTargetClasses(prev => [...prev, cls.id]);
                                                    else setTargetClasses(prev => prev.filter(c => c !== cls.id));
                                                }}
                                                className="rounded text-indigo-600"
                                            />
                                            <span className="truncate">{cls.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-amber-500" /> Deadline (Optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">Special Instructions</label>
                                    <input
                                        type="text"
                                        value={specialNotes}
                                        onChange={e => setSpecialNotes(e.target.value)}
                                        placeholder="e.g. Complete Unit 1 by Friday"
                                        className="input"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation Bar */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between px-6">
                    {wizardTheoryUnitIdx !== null ? (
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={() => setWizardTheoryUnitIdx(null)}
                                className="btn btn-secondary text-xs flex items-center gap-1.5 font-bold"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to Units List
                            </button>
                            <span className="text-xs text-slate-500 font-medium">
                                Editing Pre-Lab Theory for Unit {wizardTheoryUnitIdx + 1}
                            </span>
                            <button
                                type="button"
                                onClick={handleSaveWizardTheory}
                                className="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md"
                            >
                                Save Pre-Lab Theory
                            </button>
                        </div>
                    ) : isEditingExercise ? (
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={() => { setIsEditingExercise(false); setEditingExerciseIdx(null); }}
                                className="btn btn-secondary text-xs flex items-center gap-1.5 font-bold"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to Exercise List
                            </button>
                            <span className="text-xs text-slate-500 font-medium">
                                {editingExerciseIdx !== null ? 'Editing Challenge' : 'Creating New Challenge'}
                            </span>
                            <button
                                type="button"
                                onClick={handleSaveExercise}
                                className="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md"
                            >
                                Save Exercise to Unit
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                {currentStep > 1 && (
                                    <button
                                        onClick={() => setCurrentStep(prev => prev - 1)}
                                        className="btn btn-secondary text-xs flex items-center gap-1.5 font-bold"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button onClick={onClose} className="btn btn-secondary text-xs font-bold">
                                    Cancel
                                </button>

                                {moduleForm.title?.trim() && currentStep < 6 && (
                                    <button
                                        type="button"
                                        onClick={() => handleFinalDeploy(false)}
                                        disabled={isSubmitting}
                                        className="btn btn-secondary text-xs font-bold"
                                        title="Save your progress as a draft without assigning or publishing"
                                    >
                                        💾 Save as Draft
                                    </button>
                                )}

                                {currentStep < 6 ? (
                                    <div className="flex items-center gap-2">
                                        {currentStep === 1 && !isStep1Complete && (
                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Title Required
                                            </span>
                                        )}
                                        {currentStep === 2 && !isStep2Complete && (
                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Add Unit
                                            </span>
                                        )}
                                        {currentStep === 3 && !isStep3Complete && (
                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Add Exercise
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleAttemptNavigateStep(currentStep + 1)}
                                            className="btn btn-primary text-xs flex items-center gap-1.5 font-bold shadow-md shadow-indigo-600/20"
                                        >
                                            {currentStep === 5 ? 'Next: Deploy & Assign' : 'Next Step'} <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleFinalDeploy(false)}
                                            disabled={isSubmitting}
                                            className="btn btn-secondary text-xs font-bold"
                                        >
                                            💾 Save as Draft
                                        </button>
                                        <button
                                            onClick={() => handleFinalDeploy(true)}
                                            disabled={isSubmitting}
                                            className="btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                                        >
                                            {isSubmitting ? 'Deploying Course...' : '🚀 Publish & Enter Builder'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}