'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Download,
    FileText,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Table as TableIcon,
    Sigma,
    Image as ImageIcon,
    Undo2,
    Redo2,
    Heading1,
    Heading2,
    Heading3,
    Check,
    Cloud,
    CloudOff,
    RefreshCw,
    Clock,
    FileCode,
    Sparkles,
    Trash2,
    Plus,
    X,
    Maximize2,
    Minimize2,
    Printer,
    History,
    HardDrive,
    FileSpreadsheet,
    Presentation,
    Layers,
    Film,
    BookOpen,
    Columns,
    Split,
    MessageSquare,
    Scissors,
    ListTree,
    SlidersHorizontal,
    CornerDownLeft,
    FilePlus,
    Rows,
    LayoutGrid,
    ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import OfficeThemeToggle from '@/components/OfficeThemeToggle';
import VersionHistoryDrawer from '@/components/VersionHistoryDrawer';
import OfficeAppBlurLoader from '@/components/OfficeAppBlurLoader';
import OfficeOpenImportMenu from '@/components/OfficeOpenImportMenu';
import { useThemeStore } from '@/lib/store';

const ACADEMIC_TEMPLATES = {
    lab_report: {
        name: 'Lab Experiment Report',
        html: `
        <h1 style="color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Laboratory Experiment Report</h1>
        <p><strong>Department:</strong> Department of Electrical & Computer Engineering<br>
        <strong>Experiment Title:</strong> Verification of Kirchhoff's Laws and Network Theorems<br>
        <strong>Student Name:</strong> {{Student_Name}} &nbsp;|&nbsp; <strong>Roll No:</strong> {{Roll_Number}}<br>
        <strong>Date of Experiment:</strong> {{Date}} &nbsp;|&nbsp; <strong>Instructor:</strong> {{Instructor_Name}}</p>
        <hr/>
        <h3>1. Objective & Learning Scope</h3>
        <p>To experimentally analyze circuit mesh currents and node voltages across multi-loop resistive configurations, comparing theoretical matrix calculations with physical multimeter measurements.</p>
        <h3>2. Apparatus & Components</h3>
        <ul>
            <li>DC Regulated Power Supply (0–30V, 2A)</li>
            <li>Digital Multimeters (Keysight 34461A 6½ digit)</li>
            <li>Precision Metal Film Resistors (100Ω, 220Ω, 470Ω ±1% tolerance)</li>
            <li>Breadboard and High-flex Banana Cables</li>
        </ul>
        <h3>3. Theoretical Formulation</h3>
        <p>According to Kirchhoff's Voltage Law (KVL), the algebraic sum of all voltages around any closed loop must equal zero:</p>
        <p style="background: #f1f5f9; padding: 10px; border-left: 4px solid #3b82f6; font-family: monospace;">\\sum_{k=1}^n V_k = 0</p>
        <h3>4. Experimental Observations & Data Table</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;" border="1">
            <thead style="background: #e2e8f0;">
                <tr><th style="padding: 6px;">Loop Branch</th><th style="padding: 6px;">Resistance (Ω)</th><th style="padding: 6px;">Theoretical Current (mA)</th><th style="padding: 6px;">Measured Current (mA)</th><th style="padding: 6px;">Error (%)</th></tr>
            </thead>
            <tbody>
                <tr><td style="padding: 6px;">Branch A (R1)</td><td style="padding: 6px;">100</td><td style="padding: 6px;">50.0</td><td style="padding: 6px;">49.6</td><td style="padding: 6px;">0.8%</td></tr>
                <tr><td style="padding: 6px;">Branch B (R2)</td><td style="padding: 6px;">220</td><td style="padding: 6px;">22.7</td><td style="padding: 6px;">22.5</td><td style="padding: 6px;">0.9%</td></tr>
                <tr><td style="padding: 6px;">Branch C (R3)</td><td style="padding: 6px;">470</td><td style="padding: 6px;">10.6</td><td style="padding: 6px;">10.5</td><td style="padding: 6px;">0.9%</td></tr>
            </tbody>
        </table>
        <h3>5. Inferences & Conclusion</h3>
        <p>The percentage deviation across all loops remained under 1.0%, effectively verifying Kirchhoff's Laws within standard component tolerance limits.</p>
        `
    },
    exam_paper: {
        name: 'CBSE / University Exam Paper',
        html: `
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0;">DEPARTMENT OF TECHNICAL EDUCATION</h2>
            <h4 style="margin: 4px 0;">END-SEMESTER SUMMATIVE EXAMINATION 2026-27</h4>
            <p style="margin: 0; font-size: 13px;"><strong>Course:</strong> Digital Electronics & Microprocessors (EC-302)<br>
            <strong>Time Allowed:</strong> 3 Hours &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Maximum Marks:</strong> 70</p>
        </div>
        <p style="font-size: 12px; font-style: italic;"><strong>General Instructions:</strong><br/>
        1. All questions are compulsory. Section A contains 10 objective questions of 1 mark each.<br/>
        2. Section B contains 5 short-answer questions of 4 marks each. Section C contains 4 descriptive questions of 10 marks each.<br/>
        3. Use of scientific non-programmable calculators is permitted.</p>
        <hr/>
        <h4>SECTION A (10 Marks)</h4>
        <p><strong>Q1.</strong> Determine the 2's complement representation of binary number <code>10110010</code>. [1 Mark]</p>
        <p><strong>Q2.</strong> State De Morgan's First Theorem and draw its equivalent logic gate symbol. [1 Mark]</p>
        <p><strong>Q3.</strong> What is the propagation delay of a standard TTL 7400 NAND gate? [1 Mark]</p>
        <h4>SECTION B (20 Marks)</h4>
        <p><strong>Q4.</strong> Design a 4-to-1 Multiplexer using minimum number of 2-input NAND gates only. Provide truth table and Boolean expression. [4 Marks]</p>
        <p><strong>Q5.</strong> Differentiate between synchronous and asynchronous decade counters in terms of clock propagation skew and maximum operating frequency. [4 Marks]</p>
        `
    },
    recommendation_letter: {
        name: 'Academic Recommendation Letter',
        html: `
        <p style="text-align: right;"><strong>Date:</strong> {{Date}}<br/>
        <strong>Ref No:</strong> ULRMS/REC/2026/{{Reference_Number}}</p>
        <p><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
        <p>It is my genuine pleasure to strongly recommend <strong>{{Student_Name}}</strong> for admission into the graduate studies program in Computer Science and Engineering.</p>
        <p>I have known {{Student_Name}} for the past two academic years in my capacity as Professor and Head of Department. During this time, {{Student_Name}} completed my coursework in Distributed Systems, securing an exceptional grade of 96% and demonstrating outstanding analytical prowess.</p>
        <p>Beyond academic excellence, {{Student_Name}} displayed exemplary leadership and technical acumen during lab projects, authoring benchmark research on real-time packet latency analysis.</p>
        <p>I rate {{Student_Name}} in the top 2% of undergraduate students I have instructed over the last fifteen years. Please feel free to contact me directly if any further details are required.</p>
        <p>Sincerely,</p>
        <p style="margin-top: 30px;"><strong>{{Instructor_Name}}</strong><br/>
        Professor & Head of Department<br/>
        Email: faculty@university.edu</p>
        `
    }
};

export default function WordEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const docIdParam = searchParams.get('id') || searchParams.get('docId');
    const driveFileIdParam = searchParams.get('driveFileId');
    const fileUrlParam = searchParams.get('fileUrl');

    // Document state
    const [docId, setDocId] = useState(docIdParam || null);
    const [mediaDocId, setMediaDocId] = useState(null);
    const [title, setTitle] = useState(searchParams.get('title') || 'Untitled Document');
    const [isDriveFile, setIsDriveFile] = useState(Boolean(driveFileIdParam));
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'offline'
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Editor references
    const editorRef = useRef(null);
    const autoSaveTimerRef = useRef(null);

    // Dialog modals
    const [showTableModal, setShowTableModal] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);

    const [showKatexModal, setShowKatexModal] = useState(false);
    const [katexInput, setKatexInput] = useState('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
    const [katexIsBlock, setKatexIsBlock] = useState(true);

    const [showImageModal, setShowImageModal] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imageCaption, setImageCaption] = useState('');

    const [showRevisionsModal, setShowRevisionsModal] = useState(false);
    const [revisions, setRevisions] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // Document Outline & Multi-Column Layout state
    const [showOutline, setShowOutline] = useState(false);
    const [outlineHeadings, setOutlineHeadings] = useState([]);
    const [columnCount, setColumnCount] = useState(1);

    // Margins & Page Orientation
    const [margins, setMargins] = useState('normal'); // 'normal' (1in), 'narrow' (0.5in), 'wide' (1.5in)
    const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'

    // Line Spacing
    const [lineSpacing, setLineSpacing] = useState('1.15'); // '1.0', '1.15', '1.5', '2.0'

    // Running Header & Footer
    const [showHeaderFooter, setShowHeaderFooter] = useState(true);
    const [headerText, setHeaderText] = useState('University Lab Record • Department of Technical Education');
    const [footerText, setFooterText] = useState('Confidential & Academic Laboratory Record');

    // Symbol Palette & Math Palette Modal
    const [showSymbolModal, setShowSymbolModal] = useState(false);

    // Suggesting / Track Changes Mode
    const [editorMode, setEditorMode] = useState('editing'); // 'editing' | 'suggesting'
    const [suggestions, setSuggestions] = useState([
        { id: 'sug_1', type: 'insert', text: 'Verify circuit ground before powering', author: 'Dr. Sen (Reviewer)', time: '10 mins ago', status: 'pending' }
    ]);
    const [showSuggestionsDrawer, setShowSuggestionsDrawer] = useState(false);
    const [newSuggestionText, setNewSuggestionText] = useState('');

    // Table Tools Floating Context state
    const [showTableTools, setShowTableTools] = useState(false);

    // Template variables state
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [pendingTemplateKey, setPendingTemplateKey] = useState(null);
    const [templateVariables, setTemplateVariables] = useState({});

    // Font and styling state
    const [fontFamily, setFontFamily] = useState('Inter');
    const [fontSize, setFontSize] = useState('11pt');
    const [textColor, setTextColor] = useState('#0f172a');
    const [highlightColor, setHighlightColor] = useState('transparent');
    const [activeMenu, setActiveMenu] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Visual Thumbnail Picture Preview Badge on Every Addition
    const [additionBadge, setAdditionBadge] = useState(null);

    const triggerAdditionBadge = (title, subtitle, type = 'table', customThumbnail = null) => {
        setAdditionBadge({ title, subtitle, type, thumbnail: customThumbnail, timestamp: Date.now() });
        setTimeout(() => {
            setAdditionBadge(prev => (prev?.title === title ? null : prev));
        }, 3600);
    };

    // Global Theme State
    const { theme } = useThemeStore();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const updateTheme = () => {
            if (theme === 'dark' || theme === 'contrast') {
                setIsDark(true);
            } else if (theme === 'light') {
                setIsDark(false);
            } else if (theme === 'system') {
                setIsDark(typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        };
        updateTheme();
        if (typeof window !== 'undefined') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = () => { if (theme === 'system') updateTheme(); };
            mq.addEventListener('change', listener);
            return () => mq.removeEventListener('change', listener);
        }
    }, [theme]);

    // Document Outline generation
    const updateOutline = useCallback(() => {
        if (!editorRef.current) return;
        const headingElems = editorRef.current.querySelectorAll('h1, h2, h3');
        const list = Array.from(headingElems).map((el, idx) => {
            if (!el.id) el.id = `doc-heading-${idx}`;
            return {
                id: el.id,
                text: el.innerText || 'Untitled Heading',
                tag: el.tagName.toLowerCase()
            };
        });
        setOutlineHeadings(list);
    }, []);

    const scrollToHeading = (id) => {
        if (!editorRef.current) return;
        const el = editorRef.current.querySelector(`#${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // Prepare template with placeholder variables
    const prepareTemplate = (tmplKey) => {
        const tmpl = ACADEMIC_TEMPLATES[tmplKey];
        if (!tmpl) return;
        const matches = tmpl.html.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
        if (matches && matches.length > 0) {
            const uniqueKeys = Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ''))));
            const initialValues = {};
            uniqueKeys.forEach(k => {
                if (k.toLowerCase().includes('date')) initialValues[k] = new Date().toISOString().split('T')[0];
                else if (k.toLowerCase().includes('student')) initialValues[k] = 'Aarav Sharma';
                else if (k.toLowerCase().includes('roll')) initialValues[k] = '2026-ECE-042';
                else if (k.toLowerCase().includes('instructor')) initialValues[k] = 'Dr. Vikramaditya Sen';
                else initialValues[k] = '';
            });
            setPendingTemplateKey(tmplKey);
            setTemplateVariables(initialValues);
            setShowTemplateModal(true);
        } else {
            applyTemplateDirect(tmplKey);
        }
    };

    const applyTemplateWithVariables = () => {
        if (!pendingTemplateKey) return;
        const tmpl = ACADEMIC_TEMPLATES[pendingTemplateKey];
        if (!tmpl) return;
        let html = tmpl.html;
        Object.entries(templateVariables).forEach(([key, val]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            html = html.replace(regex, val || `[${key}]`);
        });

        if (editorRef.current) {
            editorRef.current.innerHTML = html;
            updateCounts();
            updateOutline();
            triggerAutoSave();
            toast.success(`Inserted "${tmpl.name}" with personalized variables!`);
        }
        setShowTemplateModal(false);
    };

    const applyTemplateDirect = (tmplKey) => {
        const tmpl = ACADEMIC_TEMPLATES[tmplKey];
        if (!tmpl) return;
        if (editorRef.current) {
            editorRef.current.innerHTML = tmpl.html;
            updateCounts();
            updateOutline();
            triggerAutoSave();
            toast.success(`Loaded "${tmpl.name}" template!`);
        }
    };

    const applyTemplate = (tmplKey) => {
        prepareTemplate(tmplKey);
    };

    // Load or initialize document
    useEffect(() => {
        const loadDocument = async () => {
            if (driveFileIdParam) {
                try {
                    setSaveStatus('saving');
                    const toastId = toast.loading('Loading document from Google Drive...', { id: 'gdrive-load' });
                    const res = await api.get(`/office/documents/drive/${driveFileIdParam}`);
                    if (res.data?.success && res.data.data) {
                        const d = res.data.data;
                        setTitle(d.title || 'Google Drive Document');
                        setIsDriveFile(true);
                        if (editorRef.current && d.content) {
                            editorRef.current.innerHTML = d.content.html || '';
                            updateCounts();
                            updateOutline();
                        }
                        toast.success(`Loaded "${d.title}" from Google Drive!`, { id: 'gdrive-load' });
                    }
                    setSaveStatus('saved');
                } catch (err) {
                    console.error('Failed to load Google Drive file:', err);
                    toast.error('Could not load Google Drive file', { id: 'gdrive-load' });
                    setSaveStatus('saved');
                }
            } else if (docIdParam) {
                try {
                    let d = null;
                    try {
                        const res = await api.get(`/office/documents/${docIdParam}`);
                        if (res.data?.success && res.data.data) {
                            d = res.data.data;
                        }
                    } catch (e) {
                        try {
                            const resDoc = await api.get(`/documents/${docIdParam}`);
                            if (resDoc.data?.success && resDoc.data.data) {
                                const std = resDoc.data.data;
                                d = {
                                    id: std.id,
                                    title: std.name || std.fileName || 'Document',
                                    current_content: { html: `<h1>${std.name || 'Document'}</h1><p>Document opened from CloudVault Documents Hub.</p>` }
                                };
                            }
                        } catch (_) {}
                    }
                    if (d) {
                        setTitle(d.title || 'Untitled Document');
                        setDocId(d.id);
                        if (d.metadata?.documentId) setMediaDocId(d.metadata.documentId);
                        if (editorRef.current && d.current_content) {
                            editorRef.current.innerHTML = d.current_content.html || '';
                            updateCounts();
                            updateOutline();
                        }
                    }
                } catch (err) {
                    console.error('Failed to load document:', err);
                    toast.error('Could not load document');
                } finally {
                    setIsInitialLoading(false);
                }
            } else {
                // Initialize new document
                try {
                    const res = await api.post('/office/documents', {
                        title: 'Physics Lab Report',
                        docType: 'word'
                    });
                    if (res.data?.success && res.data.data) {
                        const d = res.data.data;
                        setDocId(d.id);
                        setTitle(d.title);
                        if (typeof window !== 'undefined') {
                            const url = new URL(window.location.href);
                            url.searchParams.set('id', d.id);
                            window.history.replaceState(null, '', url.toString());
                        }
                        if (editorRef.current) {
                            editorRef.current.innerHTML = d.current_content?.html || '<h1>Untitled Document</h1><p>Start writing...</p>';
                            updateCounts();
                            updateOutline();
                        }
                    }
                } catch (err) {
                    console.error('Failed to initialize document:', err);
                } finally {
                    setIsInitialLoading(false);
                }
            }
        };

        loadDocument();
    }, [docIdParam, driveFileIdParam, updateOutline]);

    // Word and character count calculation
    const updateCounts = () => {
        if (!editorRef.current) return;
        const text = editorRef.current.innerText || '';
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        setWordCount(words);
        setCharCount(text.length);
    };

    // Auto-save debounced
    const triggerAutoSave = useCallback(() => {
        if (!docId) return;
        setSaveStatus('saving');

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                if (!editorRef.current) return;
                const html = editorRef.current.innerHTML;
                const plainText = editorRef.current.innerText;

                await api.put(`/office/documents/${docId}`, {
                    title,
                    content: { html, plainText, wordCount }
                });

                // In-place auto-sync with media files only if already linked
                if (mediaDocId) {
                    api.post('/office/documents/save-to-media-files', {
                        docType: 'word',
                        format: 'docx',
                        title,
                        content: { html, plainText, wordCount },
                        documentId: mediaDocId,
                        officeDocId: docId
                    }).catch(() => {});
                }

                setSaveStatus('saved');
                setLastSavedTime(new Date());
            } catch (err) {
                console.error('Auto-save failed:', err);
                setSaveStatus('offline');
            }
        }, 1200);
    }, [docId, mediaDocId, title, wordCount]);

    const handleSaveToOfficeMediaFiles = async () => {
        try {
            setSaveStatus('saving');
            toast.loading('Saving to Office Media Files/Word Documents...', { id: 'word-media-save' });
            const html = editorRef.current?.innerHTML || '';
            const plainText = editorRef.current?.innerText || '';
            const res = await api.post('/office/documents/save-to-media-files', {
                docType: 'word',
                format: 'docx',
                title,
                content: { html, plainText, wordCount },
                documentId: mediaDocId,
                officeDocId: docId
            });
            if (res.data?.success) {
                if (res.data.data?.document?.id) {
                    setMediaDocId(res.data.data.document.id);
                }
                setSaveStatus('saved');
                setLastSavedTime(new Date());
                toast.success('Successfully saved to Office Media Files > Word Documents!', { id: 'word-media-save' });
            } else {
                setSaveStatus('offline');
                toast.error('Failed to save to Office Media Files', { id: 'word-media-save' });
            }
        } catch (err) {
            console.error('Save to media error:', err);
            setSaveStatus('offline');
            toast.error('Could not save to Office Media Files', { id: 'word-media-save' });
        }
    };

    const handleOpenOfficeDoc = async (fileItem) => {
        try {
            setIsInitialLoading(true);
            toast.loading(`Opening "${fileItem.name}"...`, { id: 'word-open' });
            if (fileItem.id) {
                const res = await api.get(`/office/documents/${fileItem.id}`);
                const d = res.data?.data;
                if (d) {
                    setDocId(d.id);
                    if (d.metadata?.documentId) setMediaDocId(d.metadata.documentId);
                    setTitle(d.title || fileItem.name);
                    if (editorRef.current) {
                        editorRef.current.innerHTML = d.current_content?.html || d.current_content?.plainText || '<p>Empty document</p>';
                        updateCounts();
                        updateOutline();
                    }
                    toast.success(`Opened "${fileItem.name}"!`, { id: 'word-open' });
                    return;
                }
            }
            if (fileItem.url) {
                const res = await api.get(fileItem.url, { responseType: 'blob' });
                const text = await res.data.text();
                if (editorRef.current) {
                    editorRef.current.innerHTML = text.includes('<') ? text : `<p>${text.replace(/\n/g, '<br/>')}</p>`;
                    updateCounts();
                    updateOutline();
                }
                setTitle(fileItem.name.replace(/\.[^/.]+$/, ''));
                toast.success(`Opened "${fileItem.name}"!`, { id: 'word-open' });
            }
        } catch (err) {
            console.error('Failed to open doc:', err);
            toast.error('Could not open document', { id: 'word-open' });
        } finally {
            setIsInitialLoading(false);
        }
    };

    // Handle editor input
    const handleEditorInput = () => {
        updateCounts();
        updateOutline();
        triggerAutoSave();
    };

    // Execute rich text formatting command
    const execCmd = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
        if (editorRef.current) editorRef.current.focus();
        handleEditorInput();
    };

    // Insert Table
    const handleInsertTable = () => {
        if (!editorRef.current) return;
        let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #cbd5e1;">';
        for (let r = 0; r < tableRows; r++) {
            tableHtml += '<tr>';
            for (let c = 0; c < tableCols; c++) {
                if (r === 0) {
                    tableHtml += '<th style="border: 1px solid #cbd5e1; padding: 8px 12px; background-color: #f1f5f9; font-weight: bold; text-align: left;">Header</th>';
                } else {
                    tableHtml += '<td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Cell</td>';
                }
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</table><p><br></p>';

        document.execCommand('insertHTML', false, tableHtml);
        setShowTableModal(false);
        handleEditorInput();
        triggerAdditionBadge('Table Inserted', `${tableRows} × ${tableCols} Grid`, 'table');
    };

    // Insert KaTeX Equation
    const handleInsertKatex = () => {
        try {
            const rendered = katex.renderToString(katexInput, {
                displayMode: katexIsBlock,
                throwOnError: false
            });

            const equationWrapper = katexIsBlock
                ? `<div contenteditable="false" style="text-align: center; margin: 16px 0; padding: 12px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">${rendered}</div><p><br></p>`
                : `<span contenteditable="false" style="padding: 2px 6px; background-color: #f8fafc; border-radius: 4px;">${rendered}</span> `;

            document.execCommand('insertHTML', false, equationWrapper);
            setShowKatexModal(false);
            handleEditorInput();
            triggerAdditionBadge('LaTeX Equation Added', 'Mathematical formula inserted', 'katex');
        } catch (err) {
            toast.error('Invalid LaTeX formula');
        }
    };

    // Insert Image
    const handleInsertImage = () => {
        if (!imageUrl) return;
        const imgHtml = `
            <figure contenteditable="false" style="text-align: center; margin: 16px 0;">
                <img src="${imageUrl}" style="max-width: 90%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-block;" />
                ${imageCaption ? `<figcaption style="font-size: 11px; color: #64748b; margin-top: 6px;">${imageCaption}</figcaption>` : ''}
            </figure><p><br></p>
        `;
        document.execCommand('insertHTML', false, imgHtml);
        setShowImageModal(false);
        setImageUrl('');
        setImageCaption('');
        handleEditorInput();
        triggerAdditionBadge('Image Inserted', imageCaption || 'Illustration embedded', 'image', imageUrl);
    };

    // Insert Page Break (Cmd/Ctrl + Enter)
    const handleInsertPageBreak = () => {
        const breakHtml = `<div class="doc-page-break my-8 py-2 text-center text-[11px] text-slate-400 font-mono tracking-widest border-t-2 border-dashed border-slate-300 dark:border-slate-700 select-none" contenteditable="false">────── PAGE BREAK ──────</div><p><br></p>`;
        document.execCommand('insertHTML', false, breakHtml);
        handleEditorInput();
        triggerAdditionBadge('Page Break Inserted', 'Document split marker', 'table');
        toast.success('Page break inserted (Cmd/Ctrl+Enter)');
    };

    // Keydown handler for editor shortcuts
    const handleEditorKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleInsertPageBreak();
        }
    };

    // Insert Automated Table of Contents
    const handleInsertTOC = () => {
        if (!editorRef.current) return;
        const headings = editorRef.current.querySelectorAll('h1, h2, h3');
        if (!headings || headings.length === 0) {
            toast.error('Add H1, H2, or H3 headings first to generate Table of Contents');
            return;
        }
        let tocHtml = `<div class="doc-toc my-6 p-5 rounded-2xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-slate-900/80 shadow-xs" contenteditable="false">`;
        tocHtml += `<h3 style="margin-top:0; color:#1e40af; font-size:15px; font-weight:bold; border-bottom:1px solid #bfdbfe; padding-bottom:6px; margin-bottom:10px;">Table of Contents</h3>`;
        tocHtml += `<div style="display:flex; flex-direction:column; gap:6px;">`;
        headings.forEach((h, idx) => {
            if (!h.id) h.id = `doc-heading-${idx}`;
            const tag = h.tagName.toLowerCase();
            const indent = tag === 'h1' ? '0px' : tag === 'h2' ? '18px' : '36px';
            const weight = tag === 'h1' ? 'bold' : 'normal';
            const color = tag === 'h1' ? '#1e3a8a' : '#475569';
            tocHtml += `<div style="margin-left:${indent}; font-weight:${weight}; display:flex; justify-content:space-between; align-items:center; font-size:13px;"><span style="color:${color};">${h.innerText || 'Heading'}</span><span style="border-bottom:1px dotted #94a3b8; flex:1; margin:0 8px 3px 8px;"></span><span style="color:#94a3b8; font-family:monospace; font-size:11px;">p.${idx + 1}</span></div>`;
        });
        tocHtml += `</div></div><p><br></p>`;
        document.execCommand('insertHTML', false, tocHtml);
        handleEditorInput();
        triggerAdditionBadge('Table of Contents', `${headings.length} headings indexed`, 'table');
        toast.success(`Inserted Table of Contents with ${headings.length} sections!`);
    };

    // Table Manipulation Tools (Row/Col insert/delete)
    const handleTableAction = (action) => {
        if (!editorRef.current) return;
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) {
            toast.error('Click inside a table cell first');
            return;
        }
        let cell = sel.anchorNode;
        while (cell && cell.nodeName !== 'TD' && cell.nodeName !== 'TH') {
            if (cell === editorRef.current) { cell = null; break; }
            cell = cell.parentNode;
        }
        if (!cell) {
            toast.error('Place your cursor inside a table cell to use table tools');
            return;
        }
        const row = cell.parentNode;
        const table = row.closest('table');
        if (!table) return;

        const colIdx = Array.from(row.children).indexOf(cell);
        const rowIdx = Array.from(table.rows).indexOf(row);

        if (action === 'insertRowAbove' || action === 'insertRowBelow') {
            const targetIdx = action === 'insertRowAbove' ? rowIdx : rowIdx + 1;
            const newRow = table.insertRow(targetIdx);
            const colsCount = row.children.length;
            for (let i = 0; i < colsCount; i++) {
                const newCell = newRow.insertCell(i);
                newCell.innerHTML = 'Cell';
                newCell.style.border = '1px solid #cbd5e1';
                newCell.style.padding = '8px 12px';
            }
            toast.success('Row inserted');
        } else if (action === 'insertColLeft' || action === 'insertColRight') {
            const targetCol = action === 'insertColLeft' ? colIdx : colIdx + 1;
            Array.from(table.rows).forEach((r, rIndex) => {
                const isHeader = rIndex === 0 && r.children[0]?.nodeName === 'TH';
                const newCell = document.createElement(isHeader ? 'th' : 'td');
                newCell.innerHTML = isHeader ? 'Header' : 'Cell';
                newCell.style.border = '1px solid #cbd5e1';
                newCell.style.padding = '8px 12px';
                if (isHeader) {
                    newCell.style.backgroundColor = '#f1f5f9';
                    newCell.style.fontWeight = 'bold';
                }
                if (targetCol >= r.children.length) {
                    r.appendChild(newCell);
                } else {
                    r.insertBefore(newCell, r.children[targetCol]);
                }
            });
            toast.success('Column inserted');
        } else if (action === 'deleteRow') {
            if (table.rows.length <= 1) {
                table.remove();
                toast.success('Table deleted');
            } else {
                row.remove();
                toast.success('Row deleted');
            }
        } else if (action === 'deleteCol') {
            if (row.children.length <= 1) {
                table.remove();
                toast.success('Table deleted');
            } else {
                Array.from(table.rows).forEach(r => {
                    if (r.children[colIdx]) r.children[colIdx].remove();
                });
                toast.success('Column deleted');
            }
        } else if (action === 'deleteTable') {
            table.remove();
            toast.success('Table deleted');
        }
        handleEditorInput();
    };

    // Insert Mathematical or Typographical Symbol
    const handleInsertSymbol = (symbol) => {
        document.execCommand('insertText', false, symbol);
        setShowSymbolModal(false);
        handleEditorInput();
        toast.success(`Inserted symbol "${symbol}"`);
    };

    // Suggesting / Track Changes Handlers
    const handleAddSuggestion = () => {
        if (!newSuggestionText.trim()) return;
        const newSug = {
            id: `sug_${Date.now()}`,
            type: 'insert',
            text: newSuggestionText.trim(),
            author: 'Current User',
            time: 'Just now',
            status: 'pending'
        };
        setSuggestions(prev => [newSug, ...prev]);
        setNewSuggestionText('');
        toast.success('Suggestion added to review list');
    };

    const handleAcceptSuggestion = (id) => {
        const sug = suggestions.find(s => s.id === id);
        if (sug && editorRef.current) {
            document.execCommand('insertText', false, ` ${sug.text} `);
            handleEditorInput();
            setSuggestions(prev => prev.filter(s => s.id !== id));
            toast.success('Suggestion accepted and applied to document');
        }
    };

    const handleRejectSuggestion = (id) => {
        setSuggestions(prev => prev.filter(s => s.id !== id));
        toast.success('Suggestion rejected');
    };

    // Export Document
    const handleExport = async (format) => {
        if (!docId) return;
        try {
            toast.loading(`Generating ${format.toUpperCase()} export...`, { id: 'export-toast' });
            const res = await api.post(`/office/documents/${docId}/export`, { format }, {
                responseType: 'blob'
            });

            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-zA-Z0-9_.-]/g, '_')}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Exported as .${format}!`, { id: 'export-toast' });
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export document', { id: 'export-toast' });
        }
    };

    // Load revisions
    const handleOpenRevisions = async () => {
        if (!docId) return;
        try {
            const res = await api.get(`/office/documents/${docId}/revisions`);
            if (res.data?.success) {
                setRevisions(res.data.data || []);
                setShowRevisionsModal(true);
            }
        } catch (err) {
            toast.error('Could not load version history');
        }
    };

    // Close dropdowns on outer click
    useEffect(() => {
        const closeMenu = () => setActiveMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    return (
        <div className={`min-h-screen flex flex-col font-sans ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
            {/* Top Command & Formatting Ribbon */}
            <header className={`border-b sticky top-0 z-40 flex flex-col shadow-md ${
                isDark ? 'border-slate-800 bg-slate-950/95 text-white' : 'border-slate-200 bg-white/95 text-slate-800'
            }`}>
                {/* Upper Meta Row */}
                <div className={`px-4 py-2 flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.push('/documents')}
                            className={`p-1.5 rounded-lg transition flex items-center gap-1 text-xs font-semibold ${
                                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            title="Back to Documents"
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">Documents</span>
                        </button>
                        <OfficeOpenImportMenu
                            currentApp="word"
                            accept=".docx,.doc,.txt"
                            onOpenOfficeDoc={handleOpenOfficeDoc}
                        />
                        <div className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs" title="LabDocs Word Processor">
                                <FileText size={15} />
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-300 hidden md:inline">
                                LabDocs
                            </span>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    triggerAutoSave();
                                }}
                                onBlur={async () => {
                                    if (docId) {
                                        try {
                                            await api.put(`/office/documents/${docId}`, { title });
                                            setSaveStatus('saved');
                                        } catch (e) {
                                            console.error('Failed to update title on blur:', e);
                                        }
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.target.blur();
                                }}
                                className={`bg-transparent border border-transparent rounded px-2 py-0.5 text-xs sm:text-sm font-bold focus:outline-none transition ${
                                    isDark ? 'hover:bg-slate-900 focus:bg-slate-900 focus:border-slate-700 text-white' : 'hover:bg-slate-100 focus:bg-slate-100 focus:border-slate-300 text-slate-900'
                                }`}
                                title="Click to rename document"
                            />
                            {isDriveFile && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-[10px] font-semibold whitespace-nowrap">
                                    <HardDrive size={11} className="text-emerald-500" />
                                    Google Drive
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Auto-save Status Badge */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
                            {saveStatus === 'saving' && (
                                <>
                                    <RefreshCw size={13} className="text-amber-400 animate-spin" />
                                    <span className="hidden sm:inline">Saving...</span>
                                </>
                            )}
                            {saveStatus === 'saved' && (
                                <>
                                    <Cloud size={14} className="text-emerald-500" />
                                    <span className="hidden sm:inline text-slate-400">Saved to Cloud</span>
                                </>
                            )}
                            {saveStatus === 'offline' && (
                                <>
                                    <CloudOff size={14} className="text-rose-500" />
                                    <span className="hidden sm:inline text-rose-500">Offline</span>
                                </>
                            )}
                        </div>

                        {/* Theme Toggle */}
                        <OfficeThemeToggle />

                        {/* Unified Collective Export Dropdown */}
                        <div className="relative export-menu-container">
                            <button
                                type="button"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                                title="Export Document in Multiple Formats"
                            >
                                <Download size={13} />
                                <span>Export</span>
                                <ChevronDown size={12} className={`transition-transform duration-150 ${showExportMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showExportMenu && (
                                <div className={`absolute right-0 top-full mt-1.5 w-56 rounded-xl shadow-xl border z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 ${
                                    isDark ? 'bg-slate-900 border-slate-700/80 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => { handleSaveToOfficeMediaFiles(); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition"
                                    >
                                        <Save size={14} className="shrink-0 text-rose-500" />
                                        <div className="flex flex-col">
                                            <span>Save to Office Media Files</span>
                                            <span className="text-[10px] text-slate-400 font-normal">CloudVault &gt; Word Documents</span>
                                        </div>
                                    </button>
                                    <div className={`h-px my-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                    <button
                                        type="button"
                                        onClick={() => { handleExport('docx'); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-500/10 flex items-center gap-2 transition"
                                    >
                                        <FileText size={14} className="text-blue-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold">Word Document</span>
                                            <span className="text-[10px] text-slate-400">Word Document (.docx)</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { handleExport('pdf'); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-rose-500/10 flex items-center gap-2 transition"
                                    >
                                        <FileCode size={14} className="text-rose-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold">PDF Document</span>
                                            <span className="text-[10px] text-slate-400">Portable Document (.pdf)</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { handleExport('md'); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-emerald-500/10 flex items-center gap-2 transition"
                                    >
                                        <FileCode size={14} className="text-emerald-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold">Markdown</span>
                                            <span className="text-[10px] text-slate-400">Formatted Text (.md)</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { handleExport('txt'); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-amber-500/10 flex items-center gap-2 transition"
                                    >
                                        <FileText size={14} className="text-amber-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold">Plain Text</span>
                                            <span className="text-[10px] text-slate-400">Unformatted Text (.txt)</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { handleExport('html'); setShowExportMenu(false); }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-indigo-500/10 flex items-center gap-2 transition"
                                    >
                                        <FileCode size={14} className="text-indigo-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold">HTML Web Page</span>
                                            <span className="text-[10px] text-slate-400">Web Document (.html)</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Version History Button */}
                        <button
                            type="button"
                            onClick={() => setShowHistory(true)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                            }`}
                            title="View Document Version History & Milestones"
                        >
                            <History size={13} className="text-blue-500" />
                            <span className="hidden md:inline">History</span>
                        </button>

                        {/* Mode Selector: Editing vs Suggesting */}
                        <button
                            type="button"
                            onClick={() => {
                                const nextMode = editorMode === 'editing' ? 'suggesting' : 'editing';
                                setEditorMode(nextMode);
                                if (nextMode === 'suggesting') setShowSuggestionsDrawer(true);
                                toast.success(`Switched to ${nextMode === 'editing' ? 'Editing' : 'Suggesting'} Mode`);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                                editorMode === 'suggesting'
                                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 font-bold'
                                    : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title="Switch between Editing and Suggesting / Track Changes"
                        >
                            <MessageSquare size={13} className={editorMode === 'suggesting' ? 'text-amber-500' : 'text-slate-400'} />
                            <span className="capitalize">{editorMode}</span>
                            {suggestions.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-bold">
                                    {suggestions.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Lower Menu Bar (File, Edit, Insert, Layout, Templates) */}
                <div className={`px-4 py-1 flex items-center gap-2 text-xs border-b relative ${
                    isDark ? 'bg-slate-900 border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                    {/* File Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'file'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            File
                        </button>
                        {activeMenu === 'file' && (
                            <div className={`absolute left-0 top-full mt-1 w-52 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => { if (editorRef.current) { editorRef.current.innerHTML = '<h1>Untitled Document</h1><p>Start writing here...</p>'; updateCounts(); triggerAutoSave(); } }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Plus size={13} /> New Document
                                </button>
                                <button onClick={() => { handleSaveToOfficeMediaFiles(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-500 font-semibold ${isDark ? 'hover:bg-slate-800' : 'hover:bg-rose-50'}`}>
                                    <Save size={13} /> Save to Office Media Files
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => handleExport('docx')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Download size={13} /> Download .docx
                                </button>
                                <button onClick={() => handleExport('pdf')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Download size={13} /> Download .pdf
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => window.print()} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Printer size={13} /> Print Document
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Edit Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'edit' ? null : 'edit'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'edit'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Edit
                        </button>
                        {activeMenu === 'edit' && (
                            <div className={`absolute left-0 top-full mt-1 w-48 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => execCmd('undo')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Undo2 size={13} /> Undo (Ctrl+Z)
                                </button>
                                <button onClick={() => execCmd('redo')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Redo2 size={13} /> Redo (Ctrl+Y)
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => execCmd('selectAll')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    Select All (Ctrl+A)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Insert Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'insert' ? null : 'insert'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'insert'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Insert
                        </button>
                        {activeMenu === 'insert' && (
                            <div className={`absolute left-0 top-full mt-1 w-56 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => setShowKatexModal(true)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-purple-500 font-semibold ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Sigma size={13} /> Math Equation (KaTeX)
                                </button>
                                <button onClick={() => setShowTableModal(true)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <TableIcon size={13} /> Data Table
                                </button>
                                <button onClick={() => setShowImageModal(true)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <ImageIcon size={13} /> Image
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={handleInsertPageBreak} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Split size={13} className="text-blue-500" /> Page Break (Cmd+Enter)
                                </button>
                                <button onClick={handleInsertTOC} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <ListTree size={13} className="text-emerald-500" /> Table of Contents
                                </button>
                                <button onClick={() => setShowSymbolModal(true)} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Sigma size={13} className="text-amber-500" /> Symbols & Math Palette
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Layout Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'layout' ? null : 'layout'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'layout'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Layout
                        </button>
                        {activeMenu === 'layout' && (
                            <div className={`absolute left-0 top-full mt-1 w-56 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">Page Margins</div>
                                <button onClick={() => setMargins('normal')} className={`w-full text-left px-3 py-1 flex items-center justify-between ${margins === 'normal' ? 'font-bold text-blue-500' : ''} ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Normal (1.0 in)</span>
                                    {margins === 'normal' && <Check size={12} />}
                                </button>
                                <button onClick={() => setMargins('narrow')} className={`w-full text-left px-3 py-1 flex items-center justify-between ${margins === 'narrow' ? 'font-bold text-blue-500' : ''} ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Narrow (0.5 in)</span>
                                    {margins === 'narrow' && <Check size={12} />}
                                </button>
                                <button onClick={() => setMargins('wide')} className={`w-full text-left px-3 py-1 flex items-center justify-between ${margins === 'wide' ? 'font-bold text-blue-500' : ''} ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Wide (1.5 in)</span>
                                    {margins === 'wide' && <Check size={12} />}
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">Orientation</div>
                                <button onClick={() => setOrientation('portrait')} className={`w-full text-left px-3 py-1 flex items-center justify-between ${orientation === 'portrait' ? 'font-bold text-blue-500' : ''} ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Portrait</span>
                                    {orientation === 'portrait' && <Check size={12} />}
                                </button>
                                <button onClick={() => setOrientation('landscape')} className={`w-full text-left px-3 py-1 flex items-center justify-between ${orientation === 'landscape' ? 'font-bold text-blue-500' : ''} ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Landscape</span>
                                    {orientation === 'landscape' && <Check size={12} />}
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => setShowHeaderFooter(!showHeaderFooter)} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Running Header & Footer</span>
                                    <span className="text-[10px] text-blue-500 font-semibold">{showHeaderFooter ? 'ON' : 'OFF'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Academic Templates Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'templates' ? null : 'templates'); }}
                            className={`px-2 py-0.5 rounded transition flex items-center gap-1 font-semibold ${
                                activeMenu === 'templates'
                                    ? (isDark ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600')
                                    : (isDark ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-slate-200')
                            }`}
                        >
                            <Sparkles size={12} className="text-amber-400" />
                            <span>Templates</span>
                        </button>
                        {activeMenu === 'templates' && (
                            <div className={`absolute left-0 top-full mt-1 w-64 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => applyTemplate('lab_report')} className={`w-full text-left px-3 py-2 flex flex-col ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Lab Experiment Report</span>
                                    <span className="text-[10px] text-slate-400">KVL/KCL, apparatus, observation table</span>
                                </button>
                                <button onClick={() => applyTemplate('exam_paper')} className={`w-full text-left px-3 py-2 flex flex-col ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>CBSE / University Exam Paper</span>
                                    <span className="text-[10px] text-slate-400">Sections A, B, C with mark distribution</span>
                                </button>
                                <button onClick={() => applyTemplate('recommendation_letter')} className={`w-full text-left px-3 py-2 flex flex-col ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Recommendation Letter</span>
                                    <span className="text-[10px] text-slate-400">Formal academic reference letter</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lower Action Formatting Ribbon */}
                <div className={`px-4 py-2 flex items-center gap-1 overflow-x-auto hide-scrollbar text-xs ${
                    isDark ? 'bg-slate-900/90 text-slate-300' : 'bg-slate-50/90 text-slate-700'
                }`}>
                    {/* Undo / Redo */}
                    <button
                        type="button"
                        onClick={() => execCmd('undo')}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('redo')}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo2 size={14} />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Font Family Selector */}
                    <select
                        value={fontFamily}
                        onChange={(e) => {
                            setFontFamily(e.target.value);
                            execCmd('fontName', e.target.value);
                        }}
                        className={`border rounded px-2 py-1 text-xs focus:outline-none ${
                            isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                    >
                        <option value="Inter">Inter</option>
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Courier New">Courier New</option>
                        <option value="JetBrains Mono">JetBrains Mono</option>
                    </select>

                    {/* Line Spacing Selector */}
                    <select
                        value={lineSpacing}
                        onChange={(e) => setLineSpacing(e.target.value)}
                        className={`border rounded px-2 py-1 text-xs focus:outline-none ${
                            isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        title="Line Spacing (Single, 1.15, 1.5, Double)"
                    >
                        <option value="1.0">1.0 Single</option>
                        <option value="1.15">1.15 Line</option>
                        <option value="1.5">1.5 Line</option>
                        <option value="2.0">2.0 Double</option>
                    </select>

                    {/* Headings */}
                    <button
                        type="button"
                        onClick={() => execCmd('formatBlock', '<h1>')}
                        className={`p-1.5 rounded font-bold ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Heading 1"
                    >
                        H1
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('formatBlock', '<h2>')}
                        className={`p-1.5 rounded font-semibold ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Heading 2"
                    >
                        H2
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Inline Character Styles */}
                    <button
                        type="button"
                        onClick={() => execCmd('bold')}
                        className={`p-1.5 rounded font-bold ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('italic')}
                        className={`p-1.5 rounded italic ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('underline')}
                        className={`p-1.5 rounded underline ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Underline (Ctrl+U)"
                    >
                        <Underline size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('strikeThrough')}
                        className={`p-1.5 rounded line-through ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Strikethrough"
                    >
                        <Strikethrough size={14} />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Text Alignment */}
                    <button
                        type="button"
                        onClick={() => execCmd('justifyLeft')}
                        className={`p-1.5 rounded ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Align Left"
                    >
                        <AlignLeft size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('justifyCenter')}
                        className={`p-1.5 rounded ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Align Center"
                    >
                        <AlignCenter size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('justifyRight')}
                        className={`p-1.5 rounded ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Align Right"
                    >
                        <AlignRight size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('justifyFull')}
                        className={`p-1.5 rounded ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Justify"
                    >
                        <AlignJustify size={14} />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Lists */}
                    <button
                        type="button"
                        onClick={() => execCmd('insertUnorderedList')}
                        className={`p-1.5 rounded ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Bulleted List"
                    >
                        <List size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCmd('insertOrderedList')}
                        className={`p-1.5 rounded ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Numbered List"
                    >
                        <ListOrdered size={14} />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Page Break */}
                    <button
                        type="button"
                        onClick={handleInsertPageBreak}
                        className={`px-2 py-1 rounded flex items-center gap-1 font-medium ${isDark ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-slate-200'}`}
                        title="Insert Page Break (Cmd+Enter)"
                    >
                        <Split size={14} />
                        <span className="hidden lg:inline">Break</span>
                    </button>

                    {/* Table Tools Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowTableTools(!showTableTools)}
                            className={`px-2 py-1 rounded flex items-center gap-1 font-medium ${
                                showTableTools
                                    ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                                    : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'
                            }`}
                            title="Table Editing & Row/Col Actions"
                        >
                            <TableIcon size={14} className="text-emerald-500" />
                            <span className="hidden md:inline">Table Tools</span>
                        </button>
                        {showTableTools && (
                            <div className={`absolute left-0 top-full mt-1 w-48 rounded-xl shadow-2xl py-1 z-50 text-xs border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => { setShowTableModal(true); setShowTableTools(false); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Plus size={13} className="text-emerald-500" /> New Table Grid
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => { handleTableAction('insertRowAbove'); setShowTableTools(false); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Rows size={13} /> Insert Row Above
                                </button>
                                <button onClick={() => { handleTableAction('insertRowBelow'); setShowTableTools(false); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Rows size={13} /> Insert Row Below
                                </button>
                                <button onClick={() => { handleTableAction('insertColLeft'); setShowTableTools(false); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Columns size={13} /> Insert Column Left
                                </button>
                                <button onClick={() => { handleTableAction('insertColRight'); setShowTableTools(false); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Columns size={13} /> Insert Column Right
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => { handleTableAction('deleteRow'); setShowTableTools(false); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-400 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Trash2 size={13} /> Delete Row
                                </button>
                                <button onClick={() => { handleTableAction('deleteCol'); setShowTableTools(false); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-400 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Trash2 size={13} /> Delete Column
                                </button>
                                <button onClick={() => { handleTableAction('deleteTable'); setShowTableTools(false); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-500 font-bold ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Trash2 size={13} /> Delete Full Table
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Table of Contents */}
                    <button
                        type="button"
                        onClick={handleInsertTOC}
                        className={`px-2 py-1 rounded flex items-center gap-1 ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Insert Automated Table of Contents"
                    >
                        <ListTree size={14} className="text-emerald-500" />
                        <span className="hidden md:inline">TOC</span>
                    </button>

                    {/* KaTeX Math Formula */}
                    <button
                        type="button"
                        onClick={() => setShowKatexModal(true)}
                        className={`px-2 py-1 rounded flex items-center gap-1 ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Insert KaTeX Mathematical Formula"
                    >
                        <Sigma size={14} className="text-purple-500" />
                        <span className="hidden md:inline">Formula</span>
                    </button>

                    {/* Symbol Palette */}
                    <button
                        type="button"
                        onClick={() => setShowSymbolModal(true)}
                        className={`px-2 py-1 rounded flex items-center gap-1 ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Symbol & Math Palette (±, ×, ÷, ∑, ∫, √, π, α, Ω)"
                    >
                        <span className="text-amber-500 font-bold font-serif">Ω</span>
                        <span className="hidden md:inline">Symbols</span>
                    </button>

                    {/* Image */}
                    <button
                        type="button"
                        onClick={() => setShowImageModal(true)}
                        className={`px-2 py-1 rounded flex items-center gap-1 ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Insert Image"
                    >
                        <ImageIcon size={14} className="text-amber-500" />
                        <span className="hidden md:inline">Image</span>
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Document Outline Toggle */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowOutline(!showOutline);
                            updateOutline();
                        }}
                        className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition ${
                            showOutline
                                ? 'bg-blue-600 text-white font-semibold'
                                : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                        }`}
                        title="Toggle Document Outline / Table of Contents"
                    >
                        <BookOpen size={13} className={showOutline ? 'text-white' : 'text-blue-500'} />
                        <span className="hidden sm:inline">Outline</span>
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Column Layout */}
                    <div className={`flex items-center border rounded p-0.5 text-[11px] ${
                        isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-slate-100 border-slate-300'
                    }`}>
                        <button
                            type="button"
                            onClick={() => setColumnCount(1)}
                            className={`px-2 py-0.5 rounded transition ${columnCount === 1 ? 'bg-blue-600 text-white font-bold' : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
                            title="Single Column Layout"
                        >
                            1 Col
                        </button>
                        <button
                            type="button"
                            onClick={() => setColumnCount(2)}
                            className={`px-2 py-0.5 rounded transition ${columnCount === 2 ? 'bg-blue-600 text-white font-bold' : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
                            title="Two Column Layout (Research Paper / Exam Paper)"
                        >
                            2 Col
                        </button>
                        <button
                            type="button"
                            onClick={() => setColumnCount(3)}
                            className={`px-2 py-0.5 rounded transition ${columnCount === 3 ? 'bg-blue-600 text-white font-bold' : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
                            title="Three Column Newsletter Layout"
                        >
                            3 Col
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Document Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* Collapsible Document Outline / Table of Contents */}
                {showOutline && (
                    <aside className={`w-64 border-r flex flex-col shrink-0 z-20 text-xs shadow-lg animate-in slide-in-from-left duration-200 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                        <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <h4 className={`font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                <BookOpen size={13} className="text-blue-500" />
                                Document Outline
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowOutline(false)}
                                className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {outlineHeadings.length === 0 ? (
                                <p className="text-slate-400 text-[11px] italic">No headings found in document. Add H1, H2, or H3 headings to populate table of contents.</p>
                            ) : (
                                outlineHeadings.map((h, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => scrollToHeading(h.id)}
                                        className={`w-full text-left truncate py-1.5 px-2 rounded transition block ${
                                            isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                                        } ${
                                            h.tag === 'h1' ? 'font-bold text-blue-500' : h.tag === 'h2' ? 'pl-4 font-semibold text-slate-600 dark:text-slate-200' : 'pl-6 text-slate-400 text-[11px]'
                                        }`}
                                        title={h.text}
                                    >
                                        {h.text}
                                    </button>
                                ))
                            )}
                        </div>
                    </aside>
                )}

                {/* Document Canvas Workspace */}
                <main className={`flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center ${
                    isDark ? 'bg-slate-950/90' : 'bg-slate-200/70'
                }`}>
                    {/* Realistic A4 Paginated Document Container */}
                    <div className={`w-full bg-white text-slate-900 shadow-2xl rounded-sm flex flex-col focus-within:ring-2 focus-within:ring-blue-500/40 transition duration-200 ${
                        orientation === 'portrait' ? 'max-w-[850px] min-h-[1100px]' : 'max-w-[1150px] min-h-[800px]'
                    } ${
                        margins === 'narrow' ? 'p-6 sm:p-8' : margins === 'wide' ? 'p-16 sm:p-24' : 'p-12 sm:p-16'
                    }`}>
                        {/* Running Document Header */}
                        {showHeaderFooter && (
                            <div className="border-b border-slate-200 pb-2 mb-6 flex items-center justify-between text-[11px] text-slate-400 font-medium select-none">
                                <input
                                    type="text"
                                    value={headerText}
                                    onChange={(e) => setHeaderText(e.target.value)}
                                    className="bg-transparent border-0 text-[11px] text-slate-400 focus:outline-none w-2/3 truncate hover:text-slate-600 focus:text-slate-800 font-sans"
                                    title="Click to customize running document header"
                                />
                                <span className="font-mono text-[10px] text-slate-400">LAB-DOC-2026</span>
                            </div>
                        )}

                        {/* Editable Content Region */}
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleEditorInput}
                            onKeyDown={handleEditorKeyDown}
                            className="flex-1 focus:outline-none text-slate-900 font-sans prose prose-slate max-w-none text-sm sm:text-base min-h-[900px]"
                            style={{
                                fontFamily,
                                minHeight: '900px',
                                lineHeight: lineSpacing,
                                columnCount: columnCount,
                                columnGap: '2.5rem',
                                columnRule: columnCount > 1 ? '1px dashed #cbd5e1' : 'none'
                            }}
                        />

                        {/* Running Document Footer with Page Numbers */}
                        {showHeaderFooter && (
                            <div className="border-t border-slate-200 pt-3 mt-8 flex items-center justify-between text-[11px] text-slate-400 font-medium select-none">
                                <input
                                    type="text"
                                    value={footerText}
                                    onChange={(e) => setFooterText(e.target.value)}
                                    className="bg-transparent border-0 text-[11px] text-slate-400 focus:outline-none w-2/3 truncate hover:text-slate-600 focus:text-slate-800 font-sans"
                                    title="Click to customize running document footer"
                                />
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                                    Page 1 of {Math.max(1, Math.ceil(wordCount / 350))}
                                </span>
                            </div>
                        )}
                    </div>
                </main>

                {/* Suggesting / Track Changes Side Drawer */}
                {showSuggestionsDrawer && (
                    <aside className={`w-80 border-l flex flex-col shrink-0 z-20 text-xs shadow-xl animate-in slide-in-from-right duration-200 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                        <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-2">
                                <MessageSquare size={14} className="text-amber-500" />
                                <h4 className="font-bold text-xs uppercase tracking-wider">Review & Suggestions</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSuggestionsDrawer(false)}
                                className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Add Suggestion Input */}
                        <div className={`p-3 border-b space-y-2 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                            <label className="text-[10px] uppercase font-bold text-slate-400">Add Suggested Edit</label>
                            <textarea
                                rows={2}
                                value={newSuggestionText}
                                onChange={(e) => setNewSuggestionText(e.target.value)}
                                placeholder="Type suggested wording change or revision..."
                                className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:border-amber-500 ${
                                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={handleAddSuggestion}
                                className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow"
                            >
                                Submit Suggestion
                            </button>
                        </div>

                        {/* Suggestions List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {suggestions.length === 0 ? (
                                <p className="text-slate-400 text-center py-6 italic text-[11px]">
                                    No pending suggestions. All edits are up to date.
                                </p>
                            ) : (
                                suggestions.map((sug) => (
                                    <div
                                        key={sug.id}
                                        className={`p-3 rounded-xl border text-xs space-y-2 ${
                                            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-bold text-amber-500">{sug.author}</span>
                                            <span className="text-slate-400">{sug.time}</span>
                                        </div>
                                        <p className="text-slate-200 dark:text-slate-200 leading-snug font-sans">
                                            "{sug.text}"
                                        </p>
                                        <div className="flex items-center justify-end gap-1.5 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleRejectSuggestion(sug.id)}
                                                className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold flex items-center gap-1"
                                                title="Reject suggestion"
                                            >
                                                <X size={12} />
                                                <span>Reject</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAcceptSuggestion(sug.id)}
                                                className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold flex items-center gap-1 shadow"
                                                title="Accept and apply to document"
                                            >
                                                <Check size={12} />
                                                <span>Accept</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* Bottom Status Bar */}
            <footer className={`border-t px-4 py-2 flex items-center justify-between text-xs ${
                isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
                <div className="flex items-center gap-3">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{charCount} characters</span>
                    <span>•</span>
                    <span>~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
                    {columnCount > 1 && (
                        <>
                            <span>•</span>
                            <span className="text-blue-500 font-semibold">{columnCount}-Column Layout</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span>Standard A4 Paginated Canvas</span>
                    {showOutline && <span className="text-blue-500">• Outline Active ({outlineHeadings.length})</span>}
                </div>
            </footer>

            {/* Table Inserter Modal */}
            {showTableModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className={`border rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <TableIcon size={16} className="text-emerald-500" />
                                Insert Table Grid
                            </h4>
                            <button onClick={() => setShowTableModal(false)} className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`text-xs block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Rows</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={tableRows}
                                    onChange={(e) => setTableRows(parseInt(e.target.value, 10) || 1)}
                                    className={`w-full border rounded-lg p-2 text-xs ${
                                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                                />
                            </div>
                            <div>
                                <label className={`text-xs block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Columns</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={tableCols}
                                    onChange={(e) => setTableCols(parseInt(e.target.value, 10) || 1)}
                                    className={`w-full border rounded-lg p-2 text-xs ${
                                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <button
                                type="button"
                                onClick={() => setShowTableModal(false)}
                                className={`px-3 py-1.5 text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleInsertTable}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                            >
                                Insert Table
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* KaTeX Math Formula Inserter Modal */}
            {showKatexModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className={`border rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <Sigma size={16} className="text-purple-500" />
                                Insert Scientific Math Formula (KaTeX)
                            </h4>
                            <button onClick={() => setShowKatexModal(false)} className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}>
                                <X size={16} />
                            </button>
                        </div>

                        <div>
                            <label className={`text-xs block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>LaTeX Expression</label>
                            <textarea
                                rows={3}
                                value={katexInput}
                                onChange={(e) => setKatexInput(e.target.value)}
                                className={`w-full border rounded-xl p-2.5 text-xs font-mono focus:outline-none ${
                                    isDark ? 'bg-slate-950 border-slate-700 text-purple-300' : 'bg-slate-50 border-slate-300 text-purple-700'
                                }`}
                                placeholder="e.g. \int_0^\infty e^{-x} dx = 1"
                            />
                        </div>

                        {/* Live Render Preview */}
                        <div>
                            <label className={`text-xs block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Formula Preview</label>
                            <div
                                className="bg-white text-slate-900 p-4 rounded-xl flex items-center justify-center min-h-[60px] overflow-x-auto border border-slate-200"
                                dangerouslySetInnerHTML={{
                                    __html: (() => {
                                        try {
                                            return katex.renderToString(katexInput, { displayMode: true, throwOnError: false });
                                        } catch {
                                            return '<span style="color:red">Syntax Error</span>';
                                        }
                                    })()
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className={`flex items-center gap-2 text-xs cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={katexIsBlock}
                                    onChange={(e) => setKatexIsBlock(e.target.checked)}
                                    className="rounded border-slate-400 text-purple-600"
                                />
                                <span>Centered Display Block</span>
                            </label>
                        </div>

                        <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <button
                                type="button"
                                onClick={() => setShowKatexModal(false)}
                                className={`px-3 py-1.5 text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleInsertKatex}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold"
                            >
                                Insert Equation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Inserter Modal */}
            {showImageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className={`border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <ImageIcon size={16} className="text-amber-500" />
                                Insert Diagram / Image
                            </h4>
                            <button onClick={() => setShowImageModal(false)} className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div>
                                <label className={`text-xs block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Image URL / Data URI</label>
                                <input
                                    type="text"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://example.com/diagram.png"
                                    className={`w-full border rounded-xl p-2.5 text-xs ${
                                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                                />
                            </div>
                            <div>
                                <label className={`text-xs block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Caption (Optional)</label>
                                <input
                                    type="text"
                                    value={imageCaption}
                                    onChange={(e) => setImageCaption(e.target.value)}
                                    placeholder="Figure 1: Circuit diagram of Ohm's Law"
                                    className={`w-full border rounded-xl p-2.5 text-xs ${
                                        isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <button
                                type="button"
                                onClick={() => setShowImageModal(false)}
                                className={`px-3 py-1.5 text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleInsertImage}
                                disabled={!imageUrl}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
                            >
                                Insert Image
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Variables Customizer Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className={`border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <Sparkles size={16} className="text-amber-500" />
                                Configure Academic Template
                            </h4>
                            <button onClick={() => setShowTemplateModal(false)} className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}>
                                <X size={16} />
                            </button>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Fill in the placeholders below to generate your personalized document formatted according to official standards.
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                            {Object.keys(templateVariables).map((key) => (
                                <div key={key}>
                                    <label className={`text-xs block mb-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {key.replace(/_/g, ' ')}
                                    </label>
                                    <input
                                        type="text"
                                        value={templateVariables[key]}
                                        onChange={(e) => setTemplateVariables(prev => ({ ...prev, [key]: e.target.value }))}
                                        className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 ${
                                            isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                        }`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className={`flex justify-end gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <button
                                type="button"
                                onClick={() => setShowTemplateModal(false)}
                                className={`px-3 py-1.5 text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={applyTemplateWithVariables}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                            >
                                <Check size={14} />
                                Insert Document
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Visual Thumbnail Picture Preview Badge on Every Addition */}
            {additionBadge && (
                <div className={`fixed bottom-12 right-6 z-50 flex items-center gap-3 p-3 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom duration-300 max-w-sm ${
                    isDark ? 'bg-slate-900 border-blue-500/50 text-white shadow-blue-950/40' : 'bg-white border-blue-400 text-slate-900 shadow-slate-300/80'
                }`}>
                    {/* Visual Graphic Thumbnail Preview */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-1 flex items-center justify-center shrink-0 shadow-sm text-white overflow-hidden border border-white/20">
                        {additionBadge.type === 'table' ? (
                            <Table size={22} className="text-white" />
                        ) : additionBadge.type === 'image' && additionBadge.thumbnail ? (
                            <img src={additionBadge.thumbnail} alt="preview" className="w-full h-full object-cover rounded-lg" />
                        ) : additionBadge.type === 'katex' ? (
                            <span className="font-serif italic font-bold text-base">∑x</span>
                        ) : (
                            <FileText size={22} className="text-white" />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 leading-none">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">New Addition</span>
                            <span className="text-[9px] text-slate-400">• Just now</span>
                        </div>
                        <h4 className="font-bold text-xs truncate mt-0.5">{additionBadge.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{additionBadge.subtitle}</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setAdditionBadge(null)}
                        className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-white shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Symbol & Math Operators Palette Modal */}
            {showSymbolModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className={`border rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <Sigma size={16} className="text-amber-500" />
                                <span>Symbol & Math Palette</span>
                            </h4>
                            <button onClick={() => setShowSymbolModal(false)} className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}>
                                <X size={16} />
                            </button>
                        </div>

                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Click any scientific or mathematical symbol below to insert it at your cursor.
                        </p>

                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Operators & Comparison</span>
                                <div className="grid grid-cols-8 gap-1.5">
                                    {['±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '∑', '∏', '∫', '√', '∆', '∂', '‰', '·'].map((sym) => (
                                        <button
                                            key={sym}
                                            type="button"
                                            onClick={() => handleInsertSymbol(sym)}
                                            className={`h-9 rounded-lg border text-base font-serif flex items-center justify-center transition hover:scale-105 ${
                                                isDark ? 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-amber-500'
                                            }`}
                                        >
                                            {sym}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Greek Alphabet & Physics Constants</span>
                                <div className="grid grid-cols-8 gap-1.5">
                                    {['π', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 'σ', 'Ω', 'φ', 'ψ', 'ω', 'ρ', 'ε', 'ħ', '°', 'Å', 'Δ'].map((sym) => (
                                        <button
                                            key={sym}
                                            type="button"
                                            onClick={() => handleInsertSymbol(sym)}
                                            className={`h-9 rounded-lg border text-base font-serif flex items-center justify-center transition hover:scale-105 ${
                                                isDark ? 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-amber-500'
                                            }`}
                                        >
                                            {sym}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Arrows & Sets</span>
                                <div className="grid grid-cols-8 gap-1.5">
                                    {['→', '←', '↔', '↑', '↓', '⇒', '⇔', '∈', '∉', '⊂', '⊆', '∪', '∩', '∀', '∃', '¬'].map((sym) => (
                                        <button
                                            key={sym}
                                            type="button"
                                            onClick={() => handleInsertSymbol(sym)}
                                            className={`h-9 rounded-lg border text-base font-serif flex items-center justify-center transition hover:scale-105 ${
                                                isDark ? 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-amber-500'
                                            }`}
                                        >
                                            {sym}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={`flex justify-end pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <button
                                type="button"
                                onClick={() => setShowSymbolModal(false)}
                                className={`px-4 py-1.5 rounded-lg border text-xs font-semibold ${
                                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Version History Drawer */}
            <VersionHistoryDrawer
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                docId={docId}
                docTitle={title}
                onRestore={(snapshot) => {
                    if (snapshot?.html && editorRef.current) {
                        editorRef.current.innerHTML = snapshot.html;
                        updateCounts();
                        updateOutline();
                        triggerAutoSave();
                        toast.success('Document restored from history snapshot');
                    }
                }}
            />

            {/* Blur Breathing Loader on Initial Load */}
            {isInitialLoading && (
                <OfficeAppBlurLoader
                    appType="word"
                    message="Initializing LabDocs..."
                    subMessage="Loading paginated canvas, KaTeX equations, and revision history"
                />
            )}
        </div>
    );
}
