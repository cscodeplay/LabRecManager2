'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Mic,
    Volume2,
    VolumeX,
    Sparkles,
    CheckCircle2,
    X,
    Maximize2,
    Minimize2,
    Loader2,
    Pencil,
    Send,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    Copy,
    Check,
    AlertTriangle,
    RefreshCw,
    Image as ImageIcon,
    Upload,
    History,
    Square,
    Trash2,
    Sliders,
    Plus,
    Camera,
    Folder,
    FileText,
    Globe,
    Music,
    Wand2,
    GitBranch,
    ExternalLink,
    Download,
    PanelLeftClose,
    PanelLeftOpen,
    MessageSquarePlus,
    Menu
} from 'lucide-react';
import katex from 'katex';
import toast from 'react-hot-toast';
import MermaidRenderer from './MermaidRenderer';
import { aiAPI, browserAPI } from '@/lib/api';

function transformOutsideMath(input, transformFn) {
    if (!input) return '';
    const parts = input.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g);
    for (let i = 0; i < parts.length; i += 2) {
        if (parts[i]) {
            parts[i] = transformFn(parts[i]);
        }
    }
    return parts.join('');
}

function normalizeScientificLatex(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    let s = rawText
        .replace(/\x0c(rac|orall|lat|box|ootnotesize)/g, '\\f$1')
        .replace(/\x09(imes|ext|extbf|extit|extrm|heta|an|anh|au|riangle|o\b|herefore|ilde|op\b|frac)/g, '\\t$1')
        .replace(/\x08(eta|oxed|ar\b|f\b|inom|egin|ig|ullet|ot\b|ackslash|ecause)/g, '\\b$1')
        .replace(/\x0d(ightarrow|ight|ho\b|angle|isingdotseq|times)/g, '\\r$1')
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);

    s = s.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
        const singleLine = inner
            .trim()
            .replace(/\r?\n\s*/g, ' ');
        return `$$${singleLine}$$`;
    });

    const lines = s.split('\n');
    const normalizedLines = lines.map(line => {
        if (line.includes('$')) return line;
        const m = line.match(/^(\s*(?:(?:\d+[\.\)]|Step\s+\d+[:\.]?|Stage\s+\d+[:\.]?|[-*•])\s+)?)([^:=]+=[^:=]+)$/i);
        if (m) {
            const prefix = m[1] || '';
            const candidate = m[2].trim();
            const words = candidate.match(/\b[a-zA-Z]{4,}\b/g) || [];
            if (words.length === 0 && /[xyzrhtk]/i.test(candidate) && /[0-9^+\-*\/]/.test(candidate)) {
                return `${prefix}$${candidate}$`;
            }
        }
        return line;
    });
    s = normalizedLines.join('\n');

    s = transformOutsideMath(s, str => str.replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4'));

    s = transformOutsideMath(s, str => str
        .replace(/\b([a-zA-Z])\s+squared\b/gi, (_, g1) => `$${g1}^2$`)
        .replace(/\b([a-zA-Z])\s+cubed\b/gi, (_, g1) => `$${g1}^3$`)
        .replace(/\bsquare\s+root\s+of\s+([a-zA-Z0-9_()+-]+)\b/gi, (_, g1) => `$\\sqrt{${g1}}$`)
    );

    s = transformOutsideMath(s, str => {
        return str
            .replace(/(\\frac\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}(?:\s*(?:\\[a-zA-Z]+|[a-zA-Z0-9^]+))?)/g, (_, g1) => `$${g1}$`)
            .replace(/(\\sqrt(?:\s*\[[^{}]*\])?\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g, (_, g1) => `$${g1}$`)
            .replace(/(\\boxed\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\})/g, (_, g1) => `$${g1}$`)
            .replace(/(\\vec\s*\{[^{}]*\})/g, (_, g1) => `$${g1}$`)
            .replace(/(\\hat\s*\{[^{}]*\}|\\[ij]hat\b)/g, (_, g1) => `$${g1}$`)
            .replace(/(\\(?:mathbf|mathbfit)\s*\{[^{}]*\})/g, (_, g1) => `$${g1}$`);
    });

    s = transformOutsideMath(s, str => {
        return str.replace(/(\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|approx|neq|le|ge|leq|geq|pm|mp|times|div|cdot|in|notin|subset|subseteq|cup|cap|infty|partial|nabla|forall|exists|to|rightarrow|leftarrow|Rightarrow|Leftarrow|iff|implies)\b)/g, (_, g1) => `$${g1}$`);
    });

    s = transformOutsideMath(s, str => {
        let res = str.replace(/(\([a-zA-Z0-9_\s*+\-.]+\)\^[0-9a-zA-Z+-]+)/g, (_, g1) => `$${g1}$`);
        res = res.replace(/\b([a-zA-Z0-9_]\^[0-9a-zA-Z+-]+)\b/g, (_, g1) => `$${g1}$`);
        return res;
    });

    return s;
}

function renderFormattedText(rawText) {
    if (!rawText) return '';
    const normalized = normalizeScientificLatex(rawText);
    const mathTokens = [];

    let tokenized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
        const cleanMath = (math || '').trim();
        if (!cleanMath) return '';
        try {
            const rendered = `<div class="my-1.5 py-2 px-3 bg-slate-950 rounded-lg border border-slate-700 overflow-x-auto text-center shadow-inner" style="background-color:#020617">${katex.renderToString(cleanMath, { displayMode: true, throwOnError: false, strict: false, trust: true })}</div>`;
            const idx = mathTokens.length;
            mathTokens.push(rendered);
            return `@@MATH_TOKEN_${idx}@@`;
        } catch (e) {
            return match;
        }
    });

    tokenized = tokenized.replace(/\$([^$\n]+?)\$/g, (match, math) => {
        const cleanMath = (math || '').trim();
        if (!cleanMath) return match;
        try {
            const rendered = `<span class="inline-block px-0.5 text-amber-100">${katex.renderToString(cleanMath, { displayMode: false, throwOnError: false, strict: false, trust: true })}</span>`;
            const idx = mathTokens.length;
            mathTokens.push(rendered);
            return `@@MATH_TOKEN_${idx}@@`;
        } catch (e) {
            return match;
        }
    });

    const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let html = escapeHtml(tokenized);

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px]">$1</code>');

    html = html.replace(/@@MATH_TOKEN_(\d+)@@/g, (_, idxStr) => {
        return mathTokens[Number(idxStr)] || '';
    });

    return html;
}

function extractStepMathMetadata(text = '') {
    const equations = [];
    const points = [];
    if (!text) return { equations, points };

    const blockMatches = [...text.matchAll(/\$\$([\s\S]*?)\$\$/g)];
    for (const m of blockMatches) {
        if (m[1]?.trim()) equations.push(m[1].trim());
    }
    const strippedBlocks = text.replace(/\$\$[\s\S]*?\$\$/g, ' ');
    const inlineMatches = [...strippedBlocks.matchAll(/\$([^$\n]+?)\$/g)];
    for (const m of inlineMatches) {
        if (m[1]?.trim()) equations.push(m[1].trim());
    }

    const cleanForPoints = text.replace(/\\left|\\right/g, '');
    const ptMatches = [...cleanForPoints.matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)];
    for (const pm of ptMatches) {
        const x = parseFloat(pm[1]);
        const y = parseFloat(pm[2]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            points.push({ x, y });
        }
    }

    return { equations, points };
}

export function cleanLatexForSvg(svg) {
    if (!svg || typeof svg !== 'string') return svg;
    return svg.replace(/<text([^>]*)>([\s\S]*?)<\/text>/gi, (match, attrs, content) => {
        let s = content;
        s = s.replace(/\$\$?/g, '');
        s = s.replace(/\\[ ,;!]/g, ' ');
        s = s.replace(/\\frac\{1\}\{2\}/g, '½')
            .replace(/\\frac\{1\}\{3\}/g, '⅓')
            .replace(/\\frac\{1\}\{4\}/g, '¼')
            .replace(/\\frac\{3\}\{4\}/g, '¾')
            .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
        s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
            .replace(/\\sqrt/g, '√');
        s = s.replace(/\^\{\\circ\}|\^\\circ/g, '°')
            .replace(/\^2|\^\{2\}/g, '²')
            .replace(/\^3|\^\{3\}/g, '³')
            .replace(/\^4|\^\{4\}/g, '⁴')
            .replace(/\^n|\^\{n\}/g, 'ⁿ')
            .replace(/\^\{-1\}/g, '⁻¹');
        s = s.replace(/_0|_\{0\}/g, '₀')
            .replace(/_1|_\{1\}/g, '₁')
            .replace(/_2|_\{2\}/g, '₂')
            .replace(/_3|_\{3\}/g, '₃')
            .replace(/_4|_\{4\}/g, '₄')
            .replace(/_x|_\{x\}/g, 'ₓ')
            .replace(/_y|_\{y\}/g, 'ᵧ')
            .replace(/_k|_\{k\}/g, 'ₖ')
            .replace(/_\{max\}/g, 'ₘₐₓ')
            .replace(/_\{min\}/g, 'ₘᵢₙ')
            .replace(/_\{total\}/g, 'ₜₒₜₐₗ')
            .replace(/_\{net\}/g, 'ₙₑₜ');
        s = s.replace(/\\theta/g, 'θ')
            .replace(/\\alpha/g, 'α')
            .replace(/\\beta/g, 'β')
            .replace(/\\gamma/g, 'γ')
            .replace(/\\delta/g, 'δ')
            .replace(/\\lambda/g, 'λ')
            .replace(/\\mu/g, 'μ')
            .replace(/\\pi/g, 'π')
            .replace(/\\rho/g, 'ρ')
            .replace(/\\sigma/g, 'σ')
            .replace(/\\omega/g, 'ω')
            .replace(/\\Delta/g, 'Δ')
            .replace(/\\Omega/g, 'Ω');
        return `<text${attrs}>${s}</text>`;
    });
}

export function parseContentBlocks(rawText) {
    if (!rawText) return [];
    const normalizedText = normalizeScientificLatex(rawText);
    const lines = normalizedText.split('\n');
    const blocks = [];
    let charOffset = 0;
    let inAnswerSection = false;
    let stepSequenceNum = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const lineLen = line.length + 1;

        if (!trimmed || trimmed === '---') {
            charOffset += lineLen;
            continue;
        }

        if (trimmed.startsWith('```')) {
            const fenceMatch = trimmed.match(/^```([a-zA-Z0-9_-]*)/);
            const lang = (fenceMatch ? fenceMatch[1] : '').toLowerCase();
            const codeLines = [];
            let j = i + 1;
            while (j < lines.length && !lines[j].trim().startsWith('```')) {
                codeLines.push(lines[j]);
                j++;
            }
            const fullCode = codeLines.join('\n');
            const codeBlockLen = trimmed.length + 1 + fullCode.length + (j < lines.length ? lines[j].length + 1 : 0);

            if (lang === 'mermaid') {
                blocks.push({
                    id: `blk_${blocks.length}`,
                    index: blocks.length,
                    type: 'mermaid',
                    prefix: '📊',
                    text: fullCode,
                    spokenText: 'Here is the algorithmic flowchart.',
                    equations: [],
                    points: [],
                    startChar: charOffset,
                    endChar: charOffset + codeBlockLen
                });
            } else {
                stepSequenceNum += 1;
                const langTitle = lang ? lang.toUpperCase() : 'SOURCE CODE';
                blocks.push({
                    id: `blk_${blocks.length}`,
                    index: blocks.length,
                    stepNumber: stepSequenceNum,
                    type: 'code',
                    language: lang || 'text',
                    prefix: '💻',
                    text: fullCode,
                    spokenText: `Here is the ${langTitle} implementation.`,
                    equations: [],
                    points: [],
                    startChar: charOffset,
                    endChar: charOffset + codeBlockLen
                });
            }

            charOffset += codeBlockLen;
            i = j;
            continue;
        }

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const nextLine = (lines[i + 1] || '').trim();
            if (nextLine.startsWith('|') && nextLine.includes('---')) {
                const headerLine = trimmed;
                const headerCells = headerLine.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

                const tableRawLines = [trimmed, nextLine];
                let j = i + 2;
                const rows = [];
                while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
                    const rowLine = lines[j].trim();
                    tableRawLines.push(rowLine);
                    const rowCells = rowLine.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
                    if (rowCells.length > 0) {
                        rows.push(rowCells);
                    }
                    j++;
                }

                const fullTableMarkdown = tableRawLines.join('\n');
                stepSequenceNum += 1;
                blocks.push({
                    id: `blk_${blocks.length}`,
                    index: blocks.length,
                    stepNumber: stepSequenceNum,
                    type: 'table',
                    prefix: '📊',
                    text: fullTableMarkdown,
                    headers: headerCells,
                    rows: rows,
                    spokenText: `Here is the execution trace table with ${rows.length} rows.`,
                    equations: [],
                    points: [],
                    startChar: charOffset,
                    endChar: charOffset + fullTableMarkdown.length
                });

                charOffset += fullTableMarkdown.length;
                i = j - 1;
                continue;
            }
        }

        const headingMatch = trimmed.match(/^(?:#{1,4}\s+)(.+)$/) ||
            (trimmed.match(/^\*\*([^*]{2,55}):?\*\*$/) ? [trimmed, trimmed.replace(/\*\*/g, '')] : null);

        if (headingMatch) {
            const titleText = headingMatch[1].replace(/\*\*/g, '').trim();
            inAnswerSection = /\b(final\s+answer|conclusion|result|answer)\b/i.test(titleText);
            blocks.push({
                id: `blk_${blocks.length}`,
                index: blocks.length,
                type: 'heading',
                prefix: '',
                text: titleText,
                spokenText: '',
                equations: [],
                points: [],
                startChar: charOffset,
                endChar: charOffset + trimmed.length
            });
            charOffset += lineLen;
            continue;
        }

        if (/^\$\$[\s\S]+\$\$$/.test(trimmed)) {
            const isBoxedAnswer = inAnswerSection || trimmed.includes('\\boxed');
            const meta = extractStepMathMetadata(trimmed);
            stepSequenceNum += 1;
            blocks.push({
                id: `blk_${blocks.length}`,
                index: blocks.length,
                stepNumber: stepSequenceNum,
                type: isBoxedAnswer ? 'answer' : 'formula',
                prefix: isBoxedAnswer ? '✅' : '📐',
                text: trimmed,
                spokenText: trimmed,
                equations: meta.equations,
                points: meta.points,
                startChar: charOffset,
                endChar: charOffset + trimmed.length
            });
            charOffset += lineLen;
            continue;
        }

        const bulletMatch = trimmed.match(/^(?:(\d+[\.\)]|Step\s+\d+[:\.]?|Stage\s+\d+[:\.]?|[-*•])\s+)(.+)$/i);
        if (bulletMatch) {
            const rawPrefix = bulletMatch[1].trim();
            const isBulletSymbol = /^[-*•]$/.test(rawPrefix);
            const content = bulletMatch[2].trim();
            const isAnswerLine = inAnswerSection || content.includes('\\boxed');
            const meta = extractStepMathMetadata(content);
            stepSequenceNum += 1;
            const cleanPrefix = isAnswerLine ? '✅' : (isBulletSymbol ? '•' : rawPrefix.replace(/[:\.]$/, ''));
            blocks.push({
                id: `blk_${blocks.length}`,
                index: blocks.length,
                stepNumber: stepSequenceNum,
                type: isAnswerLine ? 'answer' : (isBulletSymbol ? 'bullet' : 'step'),
                prefix: cleanPrefix,
                text: content,
                spokenText: content,
                equations: meta.equations,
                points: meta.points,
                startChar: charOffset,
                endChar: charOffset + trimmed.length
            });
            charOffset += lineLen;
            continue;
        }

        if (!trimmed.includes('$') && trimmed.length > 140) {
            const sentences = trimmed.split(/(?<=[.?!])\s+(?=[A-Z])/);
            if (sentences.length > 1) {
                let sOffset = charOffset;
                sentences.forEach((sent) => {
                    const sTrim = sent.trim();
                    if (sTrim) {
                        const meta = extractStepMathMetadata(sTrim);
                        stepSequenceNum += 1;
                        blocks.push({
                            id: `blk_${blocks.length}`,
                            index: blocks.length,
                            stepNumber: stepSequenceNum,
                            type: 'statement',
                            prefix: '•',
                            text: sTrim,
                            spokenText: sTrim,
                            equations: meta.equations,
                            points: meta.points,
                            startChar: sOffset,
                            endChar: sOffset + sTrim.length
                        });
                    }
                    sOffset += sent.length + 1;
                });
                charOffset += lineLen;
                continue;
            }
        }

        const isAnswerLine = inAnswerSection || trimmed.includes('\\boxed');
        const meta = extractStepMathMetadata(trimmed);
        stepSequenceNum += 1;
        blocks.push({
            id: `blk_${blocks.length}`,
            index: blocks.length,
            stepNumber: stepSequenceNum,
            type: isAnswerLine ? 'answer' : 'statement',
            prefix: isAnswerLine ? '✅' : '•',
            text: trimmed,
            spokenText: trimmed,
            equations: meta.equations,
            points: meta.points,
            startChar: charOffset,
            endChar: charOffset + trimmed.length
        });
        charOffset += lineLen;
    }
    return blocks;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const THREADS_STORAGE_KEY = 'wb_ai_chat_threads_v2';

const NOTE_FREQ_MAP = {
    C3: 130.81, 'C#3': 138.59, Db3: 138.59, D3: 146.83, 'D#3': 155.56, Eb3: 155.56, E3: 164.81, F3: 174.61, 'F#3': 185.00, Gb3: 185.00, G3: 196.00, 'G#3': 207.65, Ab3: 207.65, A3: 220.00, 'A#3': 233.08, Bb3: 233.08, B3: 246.94,
    C4: 261.63, 'C#4': 277.18, Db4: 277.18, D4: 293.66, 'D#4': 311.13, Eb4: 311.13, E4: 329.63, F4: 349.23, 'F#4': 369.99, Gb4: 369.99, G4: 392.00, 'G#4': 415.30, Ab4: 415.30, A4: 440.00, 'A#4': 466.16, Bb4: 466.16, B4: 493.88,
    C5: 523.25, 'C#5': 554.37, Db5: 554.37, D5: 587.33, 'D#5': 622.25, Eb5: 622.25, E5: 659.25, F5: 698.46, 'F#5': 739.99, Gb5: 739.99, G5: 783.99, 'G#5': 830.61, Ab5: 830.61, A5: 880.00, 'A#5': 932.33, Bb5: 932.33, B5: 987.77,
    C6: 1046.50
};

const DIATONIC_ORDER = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

function buildMusicStaffSvg(musicData) {
    const notes = Array.isArray(musicData?.notes) ? musicData.notes.slice(0, 16) : [];
    const title = (musicData?.title || 'Musical Melody Score').replace(/[<>&"]/g, '');
    const metaLabel = `${musicData?.keySignature || 'C Major'}  |  ${musicData?.timeSignature || '4/4'}  |  ♩=${musicData?.tempoBpm || 110}`;
    const width = Math.max(460, 110 + notes.length * 36);
    const height = 185;
    const staffTop = 62;
    const lineGap = 11; // 5 lines: 62, 73, 84, 95, 106 (bottom line E4 = 106)

    const noteSvg = notes.map((n, idx) => {
        const pitchStr = String(n?.pitch || 'C4');
        const m = pitchStr.match(/^([A-Ga-g])[#b]?(\d)?$/);
        const letter = (m?.[1] || 'C').toUpperCase();
        const oct = parseInt(m?.[2] || '4', 10);
        const stepAboveE4 = (oct - 4) * 7 + (DIATONIC_ORDER[letter] ?? 0) - 2; // E4 = 0
        const cy = (staffTop + lineGap * 4) - stepAboveE4 * (lineGap / 2);
        const cx = 86 + idx * 34;
        const isHalf = Number(n?.duration || 1) >= 2;
        const ledger = cy > staffTop + lineGap * 4 + 3
            ? `<line x1="${cx - 9}" y1="${staffTop + lineGap * 5}" x2="${cx + 9}" y2="${staffTop + lineGap * 5}" stroke="#334155" stroke-width="1.3" />`
            : '';
        const stemUp = cy >= staffTop + lineGap * 2;
        const stemX = stemUp ? cx + 5.5 : cx - 5.5;
        const stemY2 = stemUp ? cy - 26 : cy + 26;
        return `
            ${ledger}
            <ellipse cx="${cx}" cy="${cy}" rx="6.2" ry="4.5" transform="rotate(-18 ${cx} ${cy})" fill="${isHalf ? '#ffffff' : '#0f172a'}" stroke="#0f172a" stroke-width="1.8" />
            <line x1="${stemX}" y1="${cy}" x2="${stemX}" y2="${stemY2}" stroke="#0f172a" stroke-width="1.6" />
            <text x="${cx}" y="152" font-family="ui-monospace, monospace" font-size="10" font-weight="600" fill="#475569" text-anchor="middle">${pitchStr}</text>
        `;
    }).join('');

    const staffLines = [0, 1, 2, 3, 4].map(i => {
        const y = staffTop + i * lineGap;
        return `<line x1="22" y1="${y}" x2="${width - 20}" y2="${y}" stroke="#64748b" stroke-width="1.2" />`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:#ffffff;border-radius:12px;">
        <rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="#ffffff" />
        <text x="22" y="24" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#0f172a">${title}</text>
        <text x="22" y="42" font-family="ui-monospace, monospace" font-size="11" fill="#6366f1">${metaLabel}</text>
        ${staffLines}
        <text x="26" y="${staffTop + lineGap * 3.6}" font-family="serif" font-size="40" fill="#334155">𝄞</text>
        <line x1="${width - 22}" y1="${staffTop}" x2="${width - 22}" y2="${staffTop + lineGap * 4}" stroke="#0f172a" stroke-width="2.5" />
        ${noteSvg}
    </svg>`;
}

const MODE_META = {
    stem: { id: 'stem', label: 'STEM Solve', short: 'STEM', colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    image: { id: 'image', label: 'Create Image', short: 'Image', colorClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' },
    web: { id: 'web', label: 'Fetch from Web', short: 'Web Search', colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    music: { id: 'music', label: 'Music Studio', short: 'Music', colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    diagram: { id: 'diagram', label: 'Diagram & Flowchart', short: 'Diagram', colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' }
};

function deriveThreadTitle(text, mode = 'stem') {
    const clean = String(text || '').replace(/\s+/g, ' ').replace(/^#+\s*/, '').trim();
    if (!clean) {
        if (mode === 'image') return 'Generated Image';
        if (mode === 'music') return 'Music Motif';
        if (mode === 'web') return 'Web Research';
        return 'New Whiteboard Chat';
    }
    return clean.length > 36 ? `${clean.slice(0, 35)}…` : clean;
}

function getDateBucketLabel(ts) {
    const now = new Date();
    const d = new Date(ts || Date.now());
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 86400000;
    const t = d.getTime();
    if (t >= startToday) return 'Today';
    if (t >= startYesterday) return 'Yesterday';
    return 'Earlier';
}

function loadInitialThreads() {
    try {
        const raw = localStorage.getItem(THREADS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (_) {}
    return [{
        id: `thr_${Date.now()}`,
        title: 'New Whiteboard Chat',
        updatedAt: Date.now(),
        messages: []
    }];
}

export default function WhiteboardClosedCaptions({
    isVisible = true,
    isOpen = false,
    isListening = false,
    onToggleListening = null,
    transcript = '',
    interimTranscript = '',
    feedback = '',
    isAiThinking = false,
    isAiSpeaking = false,
    isAiPaused = false,
    aiSpeakingText = '',
    speakingCharIndex = 0,
    activeStepIndex = -1,
    isStepMode = false,
    aiSolution = null,
    aiResponseText = '',
    suggestedFollowUps = [],
    onCreateStickyNote = () => {},
    onInsertAsText = () => {},
    onInsertDiagram = null,
    onInsertTable = null,
    onInsertImage = null,
    onInsertMedia = null,
    onInsertToBoard = null,
    onOpenAiSolution = () => {},
    onOpenDrivePicker = null,
    externalDriveAttachment = null,
    onStopSpeaking = () => {},
    onPauseSpeaking = () => {},
    onResumeSpeaking = () => {},
    onSpeak = () => {},
    onSpeakSteps = null,
    onGoToStep = null,
    onNextStep = null,
    onPrevStep = null,
    onActiveStepChange = null,
    speechRate = 1.0,
    onChangeSpeechRate = () => {},
    aiSpeechEnabled = true,
    onToggleAiSpeech = () => {},
    preferredProvider = 'auto',
    onChangePreferredProvider = null,
    chatHistory = [],
    onClearChat = () => {},
    onSelectHistoryItem = null,
    onStopGeneration = () => {},
    responseVerbosity = 'normal',
    onChangeResponseVerbosity = () => {},
    onClose = () => {},
    onNewChat = null,
    onExecuteCommand = () => {},
    onOpenPhysicsSpace = null,
    onOpenGraphPlotter = null,
    audioLevel = 0
}) {
    // ─── Threads & Collapsible Sidebar State (ChatGPT / Gemini style) ───
    const [threads, setThreads] = useState(loadInitialThreads);
    const [activeThreadId, setActiveThreadId] = useState(() => loadInitialThreads()[0]?.id || null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 720) return false;
        return true;
    });

    // ─── Composer, Mode & Plus Menu State ───
    const [composerText, setComposerText] = useState('');
    const [activeMode, setActiveMode] = useState('stem'); // 'stem' | 'image' | 'web' | 'music' | 'diagram'
    const [imageStyle, setImageStyle] = useState('Educational Diagram');
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showProviderMenu, setShowProviderMenu] = useState(false);
    const [showVerbosityMenu, setShowVerbosityMenu] = useState(false);
    const [showSpeedDropup, setShowSpeedDropup] = useState(false);
    const [isLocalGenerating, setIsLocalGenerating] = useState(false);
    const [localThinkingLabel, setLocalThinkingLabel] = useState('');

    // ─── Attachments (Camera / Photos / Files / Drive / Web Images) ───
    const [isScanningImage, setIsScanningImage] = useState(false);
    const [scannedPreviewUrl, setScannedPreviewUrl] = useState(null);
    const [scannedFile, setScannedFile] = useState(null);
    const [scannedDataUrl, setScannedDataUrl] = useState(null);
    const [attachedDocFile, setAttachedDocFile] = useState(null); // { name, content }
    const [isDraggingImage, setIsDraggingImage] = useState(false);

    // Inline Web Images Picker strip triggered from + -> Web Images & Diagrams
    const [showWebImageTray, setShowWebImageTray] = useState(false);
    const [webImageQuery, setWebImageQuery] = useState('');
    const [webImageResults, setWebImageResults] = useState([]);
    const [isSearchingWebImages, setIsSearchingWebImages] = useState(false);

    // ─── Voice & Live Captions Pill State ───
    const [isMinimized, setIsMinimized] = useState(false);
    const [isPaneDismissed, setIsPaneDismissed] = useState(false);
    const [isCcDismissed, setIsCcDismissed] = useState(false);
    const [isCcEditing, setIsCcEditing] = useState(false);
    const [ccEditText, setCcEditText] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [clickedBlockIdx, setClickedBlockIdx] = useState(null);
    const [playingMusicMsgId, setPlayingMusicMsgId] = useState(null);
    const [mcpStatus, setMcpStatus] = useState(null);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const docFileInputRef = useRef(null);
    const composerInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const userIsScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef(null);
    const lastSyncedSolutionKeyRef = useRef('');
    const lastNarratedSolutionRef = useRef('');
    const lastDriveNonceRef = useRef(null);
    const audioCtxRef = useRef(null);
    const musicStopTimerRef = useRef(null);

    // Persist threads cleanly (capping large inline base64 previews gracefully)
    useEffect(() => {
        try {
            const trimmed = threads.slice(0, 25).map(thr => ({
                ...thr,
                messages: (thr.messages || []).slice(-30).map(m => ({
                    ...m,
                    // Avoid hitting 5MB localStorage quota with huge raw binary dataUrls if older than last 6
                    imageDataUrl: undefined
                }))
            }));
            localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(trimmed));
        } catch (_) {}
    }, [threads]);

    // Fetch MCP status pill on mount
    useEffect(() => {
        let mounted = true;
        if (typeof aiAPI?.getMcpStatus === 'function') {
            aiAPI.getMcpStatus()
                .then(res => {
                    if (mounted && res?.data?.success) setMcpStatus(res.data);
                })
                .catch(() => {});
        }
        return () => { mounted = false; };
    }, []);

    // Active Thread helper
    const activeThread = useMemo(() => {
        return threads.find(t => t.id === activeThreadId) || threads[0] || null;
    }, [threads, activeThreadId]);

    const activeMessages = activeThread?.messages || [];
    const latestAssistantMsg = useMemo(() => {
        for (let i = activeMessages.length - 1; i >= 0; i--) {
            if (activeMessages[i].role === 'assistant' && !activeMessages[i].isThinking) {
                return activeMessages[i];
            }
        }
        return null;
    }, [activeMessages]);

    // Active display text for TTS step highlighting
    const activeAiResponse = aiSolution?.solutionMarkdown || aiResponseText || aiSolution?.speechResponse || (isAiSpeaking ? aiSpeakingText : '') || latestAssistantMsg?.solutionMarkdown || latestAssistantMsg?.content || '';
    const displayText = activeAiResponse;
    const blocks = useMemo(() => parseContentBlocks(displayText), [displayText]);

    // Reset pane visibility whenever explicitly opened
    const prevIsOpenRef = useRef(isOpen);
    useEffect(() => {
        if (!prevIsOpenRef.current && isOpen) {
            setIsPaneDismissed(false);
            setIsCcDismissed(false);
            setTimeout(() => composerInputRef.current?.focus(), 60);
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen]);

    // Attach external Drive / Docs URL chosen via parent WhiteboardImagePickerModal
    useEffect(() => {
        if (externalDriveAttachment?.url && externalDriveAttachment.nonce !== lastDriveNonceRef.current) {
            lastDriveNonceRef.current = externalDriveAttachment.nonce;
            setScannedPreviewUrl(externalDriveAttachment.url);
            setScannedDataUrl(externalDriveAttachment.url);
            setScannedFile({ name: externalDriveAttachment.title || 'Google Drive File' });
            setShowPlusMenu(false);
            toast.success('Attached from Drive & Docs', { icon: '📁' });
        }
    }, [externalDriveAttachment]);

    // Sync incoming `aiSolution` results (from voice commands or executeVoiceCommand) into active thread log!
    useEffect(() => {
        if (!aiSolution || aiSolution.isThinking) return;
        const markdown = aiSolution.solutionMarkdown || aiSolution.speechResponse || '';
        if (!markdown && !aiSolution.isError) return;

        const key = `${aiSolution.question || ''}::${markdown.slice(0, 120)}::${Boolean(aiSolution.isError)}`;
        if (key === lastSyncedSolutionKeyRef.current) return;
        lastSyncedSolutionKeyRef.current = key;
        setIsPaneDismissed(false);
        setClickedBlockIdx(null);

        setThreads(prev => {
            const targetId = activeThreadId || prev[0]?.id;
            return prev.map(thr => {
                if (thr.id !== targetId) return thr;
                const msgs = [...(thr.messages || [])];
                const qText = (aiSolution.question || '').trim();
                const lastUser = [...msgs].reverse().find(m => m.role === 'user');
                // If triggered by external voice command where user message wasn't appended locally yet, add it cleanly
                if (qText && (!lastUser || lastUser.content?.trim() !== qText)) {
                    msgs.push({
                        id: `u_sync_${Date.now()}`,
                        role: 'user',
                        mode: 'stem',
                        content: qText,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                }
                const nextTitle = (thr.title === 'New Whiteboard Chat' && qText)
                    ? deriveThreadTitle(qText, 'stem')
                    : thr.title;
                msgs.push({
                    id: `a_sync_${Date.now()}`,
                    role: 'assistant',
                    mode: 'stem',
                    question: qText,
                    speechResponse: aiSolution.speechResponse || '',
                    solutionMarkdown: markdown,
                    content: markdown,
                    diagram: aiSolution.diagram || null,
                    schemdrawCode: aiSolution.schemdrawCode || aiSolution.code || null,
                    canvasAction: aiSolution.canvasAction || null,
                    physicsAction: aiSolution.physicsAction || null,
                    graphEquations: aiSolution.graphEquations || [],
                    suggestedFollowUps: aiSolution.suggestedFollowUps || [],
                    modelUsed: aiSolution.modelUsed || null,
                    providerUsed: aiSolution.providerUsed || null,
                    isError: Boolean(aiSolution.isError),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                return {
                    ...thr,
                    title: nextTitle,
                    updatedAt: Date.now(),
                    messages: msgs
                };
            });
        });
    }, [aiSolution, activeThreadId]);

    // Step narration - only starts when explicitly triggered or requested, never auto-playing unprompted
    useEffect(() => {
        if (!displayText || aiSolution?.isError || blocks.length === 0) return;
        const solutionKey = `chat::${displayText}`;
        if (solutionKey !== lastNarratedSolutionRef.current) {
            lastNarratedSolutionRef.current = solutionKey;
            if (typeof onSpeakSteps === 'function') {
                const firstContentIdx = Math.max(0, blocks.findIndex(b => b.type !== 'heading'));
                onSpeakSteps(blocks, {
                    rate: speechRate,
                    startIndex: firstContentIdx,
                    autoPlay: false // NEVER auto-play speech unprompted! User must explicitly click play
                });
            }
        }
    }, [displayText, blocks, aiSolution?.isError, onSpeakSteps, speechRate]);

    // Voice Closed Captions state tracking
    useEffect(() => {
        if (transcript) {
            setIsCcDismissed(false);
            if (!isCcEditing) setCcEditText(transcript);
        }
    }, [transcript, isCcEditing]);

    useEffect(() => {
        if (isListening || interimTranscript) setIsCcDismissed(false);
    }, [isListening, interimTranscript]);

    const activeBlockIndex = useMemo(() => {
        if (blocks.length === 0) return -1;
        if (isStepMode && activeStepIndex >= 0 && activeStepIndex < blocks.length) return activeStepIndex;
        if (clickedBlockIdx !== null && clickedBlockIdx >= 0 && clickedBlockIdx < blocks.length) return clickedBlockIdx;
        if (!isAiSpeaking) return -1;
        const spokenLen = Math.max(1, (aiSpeakingText || '').length);
        const totalBlockEnd = blocks[blocks.length - 1]?.endChar || displayText?.length || 1;
        const progress = Math.min(0.995, Math.max(0, speakingCharIndex / spokenLen));
        const mappedChar = progress * totalBlockEnd;
        const idx = blocks.findIndex(b => mappedChar >= b.startChar && mappedChar <= b.endChar);
        if (idx !== -1) return idx;
        return Math.min(blocks.length - 1, Math.floor(progress * blocks.length));
    }, [isStepMode, activeStepIndex, isAiSpeaking, speakingCharIndex, blocks, aiSpeakingText, clickedBlockIdx, displayText]);

    useEffect(() => {
        if (typeof onActiveStepChange === 'function') {
            const activeBlock = activeBlockIndex >= 0 && activeBlockIndex < blocks.length ? blocks[activeBlockIndex] : null;
            onActiveStepChange(activeBlock, activeBlockIndex, blocks);
        }
    }, [activeBlockIndex, blocks, onActiveStepChange]);

    // Scroll to bottom on new messages unless user scrolled up
    useEffect(() => {
        if (!userIsScrollingRef.current && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [activeMessages.length, isAiThinking, isLocalGenerating]);

    const handleUserScroll = () => {
        userIsScrollingRef.current = true;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            userIsScrollingRef.current = false;
        }, 3000);
    };

    // ─── Web Audio Synthesizer for Music Mode ───
    const stopMusicPlayback = useCallback(() => {
        if (musicStopTimerRef.current) {
            clearTimeout(musicStopTimerRef.current);
            musicStopTimerRef.current = null;
        }
        try {
            audioCtxRef.current?.close?.();
        } catch (_) {}
        audioCtxRef.current = null;
        setPlayingMusicMsgId(null);
    }, []);

    // ─── Master Hard STOP Control ───
    const handleMasterStop = useCallback(() => {
        try {
            if (typeof onStopGeneration === 'function') onStopGeneration();
            if (typeof onStopSpeaking === 'function') onStopSpeaking();
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                try { window.speechSynthesis.cancel(); } catch (_) {}
            }
            stopMusicPlayback();
            if (isListening && typeof onToggleListening === 'function') {
                onToggleListening();
            }
            setIsLocalGenerating(false);
            setIsAiPaused(false);
            toast('⏹️ AI Stopped', { icon: '⏹️' });
        } catch (err) {
            console.error('Stop error:', err);
        }
    }, [onStopGeneration, onStopSpeaking, stopMusicPlayback, isListening, onToggleListening]);

    useEffect(() => () => stopMusicPlayback(), [stopMusicPlayback]);

    const playMusicNotes = useCallback((msgId, musicData) => {
        if (playingMusicMsgId === msgId) {
            stopMusicPlayback();
            return;
        }
        stopMusicPlayback();
        const notes = Array.isArray(musicData?.notes) ? musicData.notes : [];
        if (notes.length === 0) {
            toast.error('No playable notes found in score');
            return;
        }
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            audioCtxRef.current = ctx;
            const beatSec = 60 / Math.max(40, Math.min(240, Number(musicData?.tempoBpm || 110)));
            let cursor = ctx.currentTime + 0.05;

            notes.forEach((n) => {
                const dur = Math.max(0.2, Number(n?.duration || 1) * beatSec);
                const freq = NOTE_FREQ_MAP[n?.pitch] || 440;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, cursor);
                gain.gain.setValueAtTime(0.001, cursor);
                gain.gain.linearRampToValueAtTime(0.22, cursor + 0.025);
                gain.gain.exponentialRampToValueAtTime(0.001, cursor + dur * 0.92);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(cursor);
                osc.stop(cursor + dur);
                cursor += dur;
            });

            setPlayingMusicMsgId(msgId);
            const totalMs = Math.max(500, Math.round((cursor - ctx.currentTime) * 1000));
            musicStopTimerRef.current = setTimeout(() => {
                setPlayingMusicMsgId(null);
            }, totalMs);
        } catch (err) {
            console.warn('Web Audio playback failed:', err);
            toast.error('Could not start Web Audio synthesizer');
        }
    }, [playingMusicMsgId, stopMusicPlayback]);

    // ─── Thread Management ───
    const handleStartNewChat = useCallback(() => {
        const emptyExisting = threads.find(t => (t.messages || []).length === 0);
        if (emptyExisting) {
            setActiveThreadId(emptyExisting.id);
        } else {
            const newThr = {
                id: `thr_${Date.now()}`,
                title: 'New Whiteboard Chat',
                updatedAt: Date.now(),
                messages: []
            };
            setThreads(prev => [newThr, ...prev]);
            setActiveThreadId(newThr.id);
        }
        setComposerText('');
        setScannedPreviewUrl(null);
        setScannedDataUrl(null);
        setScannedFile(null);
        setAttachedDocFile(null);
        setShowPlusMenu(false);
        setShowWebImageTray(false);
        if (typeof onNewChat === 'function') onNewChat();
        setTimeout(() => composerInputRef.current?.focus(), 50);
    }, [threads, onNewChat]);

    const handleSelectThread = useCallback((thr) => {
        if (!thr) return;
        setActiveThreadId(thr.id);
        // Sync the most recent assistant item back to parent so Add to Board / Plotter stays live
        const lastAssistant = [...(thr.messages || [])].reverse().find(m => m.role === 'assistant');
        if (lastAssistant && typeof onSelectHistoryItem === 'function') {
            lastAssistant && lastAssistant.solutionMarkdown && (lastSyncedSolutionKeyRef.current = `${lastAssistant.question || ''}::${(lastAssistant.solutionMarkdown || '').slice(0, 120)}::${Boolean(lastAssistant.isError)}`);
            onSelectHistoryItem(lastAssistant);
        }
        if (typeof window !== 'undefined' && window.innerWidth < 720) {
            setIsSidebarOpen(false);
        }
    }, [onSelectHistoryItem]);

    const handleDeleteThread = useCallback((thrId, e) => {
        e?.stopPropagation();
        setThreads(prev => {
            const filtered = prev.filter(t => t.id !== thrId);
            if (filtered.length === 0) {
                const blank = { id: `thr_${Date.now()}`, title: 'New Whiteboard Chat', updatedAt: Date.now(), messages: [] };
                setActiveThreadId(blank.id);
                return [blank];
            }
            if (activeThreadId === thrId) {
                setActiveThreadId(filtered[0].id);
            }
            return filtered;
        });
    }, [activeThreadId]);

    // ─── Media & Document Attachments ───
    const handleScanQuestionImage = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Please select a valid image file (PNG, JPG, WebP)');
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setScannedPreviewUrl(previewUrl);
        setScannedFile(file);
        setIsScanningImage(true);
        setShowPlusMenu(false);

        const dataUrlPromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result;
                setScannedDataUrl(result);
                resolve(result);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });

        try {
            const res = await aiAPI.scanQuestionImage(file, preferredProvider);
            const extractedQuestion = res?.data?.data?.questionText?.trim() || res?.data?.data?.question?.trim();
            if (extractedQuestion && !composerText.trim()) {
                setComposerText(extractedQuestion);
                toast.success('Scanned question from image!', { icon: '📸' });
            } else {
                toast.success('Image attached & ready!', { icon: '🖼️' });
            }
        } catch (err) {
            try {
                const b64 = await dataUrlPromise;
                if (b64) {
                    const fallback = await aiAPI.scanQuestionImage({ image: b64, preferredProvider });
                    const extracted = fallback?.data?.data?.questionText?.trim() || fallback?.data?.data?.question?.trim();
                    if (extracted && !composerText.trim()) setComposerText(extracted);
                }
            } catch (_) {}
            toast('Image attached — add a prompt or press Send', { icon: '📎' });
        } finally {
            setIsScanningImage(false);
        }
    };

    const handleDeviceDocAttach = async (file) => {
        if (!file) return;
        setShowPlusMenu(false);
        if (file.type.startsWith('image/')) {
            handleScanQuestionImage(file);
            return;
        }
        if (/\.(txt|md|csv|json|py|js|ts|html)$/i.test(file.name) || file.type.startsWith('text/')) {
            try {
                const text = await file.text();
                setAttachedDocFile({ name: file.name, content: text.slice(0, 6000) });
                toast.success(`Attached "${file.name}"`, { icon: '📄' });
            } catch (_) {
                toast.error('Could not read file text');
            }
        } else {
            setAttachedDocFile({ name: file.name, content: `[Attached file: ${file.name} (${Math.round(file.size / 1024)} KB)]` });
            toast.success(`Attached "${file.name}" metadata`, { icon: '📄' });
        }
    };

    const handleQuickWebImageSearch = async (e) => {
        e?.preventDefault();
        const q = (webImageQuery || composerText).trim();
        if (!q) {
            toast('Enter keywords to search web images', { icon: '🌐' });
            return;
        }
        setIsSearchingWebImages(true);
        try {
            const res = await browserAPI.searchImages({ q });
            const imgs = res?.data?.images || res?.data?.data?.images || [];
            setWebImageResults(imgs.slice(0, 12));
            if (imgs.length === 0) toast('No matching web images found', { icon: '🔍' });
        } catch (_) {
            toast.error('Web image search failed');
        } finally {
            setIsSearchingWebImages(false);
        }
    };

    // Helper to append message pairs inside the active thread
    const appendMessageToThread = useCallback((threadId, msg, autoTitleCandidate = null) => {
        setThreads(prev => prev.map(thr => {
            if (thr.id !== threadId) return thr;
            const nextTitle = (thr.title === 'New Whiteboard Chat' && autoTitleCandidate)
                ? deriveThreadTitle(autoTitleCandidate, msg.mode)
                : thr.title;
            return {
                ...thr,
                title: nextTitle,
                updatedAt: Date.now(),
                messages: [...(thr.messages || []), msg]
            };
        }));
    }, []);

    // ─── Unified Send Handler supporting STEM, Create Image, Fetch from Web, Music Studio & Diagram ───
    const handleSendPrompt = async (e, overrideText = null, overrideMode = null) => {
        e?.preventDefault?.();
        const rawPrompt = (overrideText !== null ? overrideText : composerText).trim();
        const mode = overrideMode || activeMode;
        const hasImg = Boolean(scannedPreviewUrl || scannedDataUrl || scannedFile);
        const hasDoc = Boolean(attachedDocFile);

        if (!rawPrompt && !hasImg && !hasDoc) return;

        let effectiveDataUrl = scannedDataUrl;
        if ((!effectiveDataUrl || effectiveDataUrl.startsWith('blob:')) && scannedFile instanceof File) {
            try {
                effectiveDataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target?.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(scannedFile);
                });
            } catch (_) {}
        }

        const docPrefix = attachedDocFile ? `\n\n[File: ${attachedDocFile.name}]\n${attachedDocFile.content.slice(0, 3500)}` : '';
        const promptForAi = (rawPrompt || (hasImg ? 'Analyze or solve this image' : `Summarize ${attachedDocFile?.name}`)) + docPrefix;
        const displayUserPrompt = rawPrompt || (hasImg ? 'Solve the problem shown in this attached image' : `Analyze "${attachedDocFile?.name}"`);
        const targetThreadId = activeThread?.id || threads[0]?.id;

        const userMsg = {
            id: `u_${Date.now()}`,
            role: 'user',
            mode,
            content: displayUserPrompt,
            attachmentName: scannedFile?.name || attachedDocFile?.name || null,
            previewUrl: scannedPreviewUrl || effectiveDataUrl || null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        appendMessageToThread(targetThreadId, userMsg, displayUserPrompt);

        if (overrideText === null) {
            setComposerText('');
            setScannedPreviewUrl(null);
            setScannedDataUrl(null);
            setScannedFile(null);
            setAttachedDocFile(null);
            setShowPlusMenu(false);
        }

        // Branch 1: 🎨 Create Image (POST /api/ai/generate-image)
        if (mode === 'image') {
            setIsLocalGenerating(true);
            setLocalThinkingLabel(`Generating ${imageStyle.toLowerCase()} artwork...`);
            try {
                const res = await aiAPI.generateImage({
                    prompt: rawPrompt || displayUserPrompt,
                    style: imageStyle,
                    provider: preferredProvider !== 'auto' ? preferredProvider : undefined
                });
                const imgData = res?.data?.data;
                appendMessageToThread(targetThreadId, {
                    id: `a_img_${Date.now()}`,
                    role: 'assistant',
                    mode: 'image',
                    question: displayUserPrompt,
                    content: imgData?.caption || `Generated ${imageStyle} image for "${displayUserPrompt}".`,
                    generatedImage: {
                        imageDataUrl: imgData?.imageDataUrl,
                        svg: imgData?.svg,
                        caption: imgData?.caption,
                        isFallback: Boolean(imgData?.isFallback),
                        style: imageStyle,
                        prompt: displayUserPrompt
                    },
                    modelUsed: imgData?.model || 'Gemini Image Gen',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            } catch (err) {
                appendMessageToThread(targetThreadId, {
                    id: `a_err_${Date.now()}`,
                    role: 'assistant',
                    mode: 'image',
                    question: displayUserPrompt,
                    isError: true,
                    content: `Image generation failed: ${err?.response?.data?.message || err?.message || 'Check your AI API keys in Settings.'}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            } finally {
                setIsLocalGenerating(false);
                setLocalThinkingLabel('');
            }
            return;
        }

        // Branch 2: 🌐 Fetch from Web (/api/browser/search + /images + /youtube)
        if (mode === 'web') {
            setIsLocalGenerating(true);
            setLocalThinkingLabel('Searching the web, images & articles...');
            try {
                const [searchRes, imgRes, ytRes] = await Promise.allSettled([
                    browserAPI.search({ q: rawPrompt || displayUserPrompt, includeAi: 'true' }),
                    browserAPI.searchImages({ q: rawPrompt || displayUserPrompt }),
                    browserAPI.searchYoutube({ q: rawPrompt || displayUserPrompt })
                ]);
                const sData = searchRes.status === 'fulfilled' ? (searchRes.value?.data || {}) : {};
                const iData = imgRes.status === 'fulfilled' ? (imgRes.value?.data || {}) : {};
                const yData = ytRes.status === 'fulfilled' ? (ytRes.value?.data || {}) : {};

                const citations = (sData.results || sData.articles || []).slice(0, 6);
                const images = (iData.images || iData.data?.images || []).slice(0, 8);
                const videos = (yData.videos || yData.results || []).slice(0, 4);
                const aiSummary = sData.aiSummary || sData.summary || sData.answer || (citations[0]?.snippet) || `Web results found for "${displayUserPrompt}".`;

                appendMessageToThread(targetThreadId, {
                    id: `a_web_${Date.now()}`,
                    role: 'assistant',
                    mode: 'web',
                    question: displayUserPrompt,
                    content: aiSummary,
                    solutionMarkdown: aiSummary,
                    webResult: {
                        query: displayUserPrompt,
                        aiSummary,
                        citations,
                        images,
                        videos
                    },
                    modelUsed: 'Web Search + AI',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            } catch (err) {
                appendMessageToThread(targetThreadId, {
                    id: `a_err_${Date.now()}`,
                    role: 'assistant',
                    mode: 'web',
                    question: displayUserPrompt,
                    isError: true,
                    content: `Web search failed: ${err?.message || 'Unable to reach search endpoint.'}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            } finally {
                setIsLocalGenerating(false);
                setLocalThinkingLabel('');
            }
            return;
        }

        // Branch 3: 🎵 Music Studio (cardAssist type: 'whiteboard_music' + Web Audio)
        if (mode === 'music') {
            setIsLocalGenerating(true);
            setLocalThinkingLabel('Composing notation & audio synthesis...');
            try {
                const res = await aiAPI.cardAssist({
                    type: 'whiteboard_music',
                    prompt: rawPrompt || displayUserPrompt,
                    preferredProvider: preferredProvider !== 'auto' ? preferredProvider : undefined
                });
                const rawPayload = res?.data?.data?.result || res?.data?.data;
                let parsed = rawPayload;
                if (typeof rawPayload === 'string') {
                    const cleaned = rawPayload.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
                    try { parsed = JSON.parse(cleaned); } catch (_) {
                        parsed = { title: displayUserPrompt, teachingNotes: rawPayload, tempoBpm: 110, keySignature: 'C Major', timeSignature: '4/4', notes: [{ pitch: 'C4', duration: 1 }, { pitch: 'E4', duration: 1 }, { pitch: 'G4', duration: 1 }, { pitch: 'C5', duration: 2 }] };
                    }
                }
                const musicData = {
                    title: parsed?.title || `Motif: ${displayUserPrompt}`,
                    tempoBpm: Number(parsed?.tempoBpm || 110),
                    keySignature: parsed?.keySignature || 'C Major',
                    timeSignature: parsed?.timeSignature || '4/4',
                    abcNotation: parsed?.abcNotation || '',
                    notes: Array.isArray(parsed?.notes) && parsed.notes.length > 0
                        ? parsed.notes
                        : [{ pitch: 'C4', duration: 1 }, { pitch: 'D4', duration: 1 }, { pitch: 'E4', duration: 1 }, { pitch: 'G4', duration: 1 }, { pitch: 'C5', duration: 2 }],
                    teachingNotes: parsed?.teachingNotes || 'Click Play Synth to hear the motif, or Add Score to Board to place the staff notation.'
                };
                musicData.svg = buildMusicStaffSvg(musicData);

                appendMessageToThread(targetThreadId, {
                    id: `a_mus_${Date.now()}`,
                    role: 'assistant',
                    mode: 'music',
                    question: displayUserPrompt,
                    content: musicData.teachingNotes,
                    musicData,
                    modelUsed: res?.data?.data?.modelUsed || 'Music Studio AI',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            } catch (err) {
                appendMessageToThread(targetThreadId, {
                    id: `a_err_${Date.now()}`,
                    role: 'assistant',
                    mode: 'music',
                    question: displayUserPrompt,
                    isError: true,
                    content: `Music Studio failed: ${err?.response?.data?.message || err?.message}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            } finally {
                setIsLocalGenerating(false);
                setLocalThinkingLabel('');
            }
            return;
        }

        // Branch 4 & 5: 📊 Diagram or 📐 STEM Solve (delegate to parent whiteboard AI engine + preserve MCP/Voice/Board Sync)
        const finalCmd = mode === 'diagram' && !/\b(diagram|flowchart|mermaid|circuit|schematic|draw)\b/i.test(promptForAi)
            ? `Draw a detailed diagram/flowchart for: ${promptForAi}`
            : promptForAi;

        const convoHistoryForApi = (activeThread?.messages || [])
            .filter(m => !m.isError)
            .slice(-16)
            .map(m => ({ role: m.role, content: m.speechResponse || m.content || '' }));

        onExecuteCommand(finalCmd, {
            imageDataUrl: effectiveDataUrl || scannedDataUrl || scannedPreviewUrl,
            imageFile: scannedFile instanceof File ? scannedFile : undefined,
            verbosity: responseVerbosity,
            conversationHistory: convoHistoryForApi
        });
    };

    const handleDropImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingImage(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleScanQuestionImage(file);
        } else if (file) {
            handleDeviceDocAttach(file);
        }
    };

    const handlePasteImage = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    handleScanQuestionImage(file);
                    break;
                }
            }
        }
    };

    const groupedThreads = useMemo(() => {
        const groups = { Today: [], Yesterday: [], Earlier: [] };
        threads.forEach(t => {
            const bucket = getDateBucketLabel(t.updatedAt);
            groups[bucket].push(t);
        });
        return groups;
    }, [threads]);

    const showFloatingCc = !isOpen && !isCcDismissed && isVisible && (isListening || Boolean(interimTranscript || transcript || isAiSpeaking || feedback));
    const showDrawer = Boolean(isOpen && !isPaneDismissed);

    if (!showFloatingCc && !showDrawer) return null;

    const currentModeMeta = MODE_META[activeMode] || MODE_META.stem;
    const isGenerating = isAiThinking || isLocalGenerating;

    return (
        <>
            {/* Hidden Native Inputs (+ Menu Triggers: Photos, Camera, Device Docs) */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScanQuestionImage(file);
                    e.target.value = '';
                }}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScanQuestionImage(file);
                    e.target.value = '';
                }}
            />
            <input
                ref={docFileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDeviceDocAttach(file);
                    e.target.value = '';
                }}
            />

            {/* ─── 1. CHATGPT / GEMINI STYLE OVERLAY AI DRAWER ────────────────────── */}
            {showDrawer && (
                <>
                    {/* Subtle overlay click-away backdrop */}
                    <div
                        className="fixed inset-0 z-[78] bg-slate-950/25 backdrop-blur-[1px]"
                        onClick={() => {
                            setShowPlusMenu(false);
                            setShowProviderMenu(false);
                            setShowVerbosityMenu(false);
                            setShowSpeedDropup(false);
                        }}
                        aria-hidden="true"
                    />

                    <aside
                        role="dialog"
                        aria-label="AI Whiteboard Assistant"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingImage(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingImage(false);
                        }}
                        onDrop={handleDropImage}
                        onPaste={handlePasteImage}
                        style={{ backgroundColor: '#0b1120' }}
                        className={`fixed top-3 bottom-16 right-3 z-[80] flex rounded-2xl border shadow-2xl overflow-hidden text-slate-100 transition-all duration-200 select-none max-h-[calc(100vh-80px)] ${
                            isSidebarOpen ? 'w-[min(620px,92vw)]' : 'w-[min(380px,90vw)]'
                        } ${
                            isDraggingImage ? 'border-indigo-400 ring-2 ring-indigo-500/40' : 'border-slate-700/90'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ── COLLAPSIBLE LEFT THREAD SIDEBAR ── */}
                        {isSidebarOpen && (
                            <div
                                style={{ backgroundColor: '#070b14' }}
                                className="w-56 sm:w-64 shrink-0 border-r border-slate-800/90 flex flex-col h-full z-20"
                            >
                                <div className="p-2.5 border-b border-slate-800/80 flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleStartNewChat}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-semibold transition cursor-pointer"
                                    >
                                        <MessageSquarePlus className="w-3.5 h-3.5" />
                                        <span>New Chat</span>
                                    </button>
                                    {threads.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const fresh = { id: `thr_${Date.now()}`, title: 'New Whiteboard Chat', updatedAt: Date.now(), messages: [] };
                                                setThreads([fresh]);
                                                setActiveThreadId(fresh.id);
                                                onClearChat?.();
                                            }}
                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition"
                                            title="Clear All Chats"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition sm:hidden"
                                        title="Hide Sidebar"
                                    >
                                        <PanelLeftClose className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                                    {['Today', 'Yesterday', 'Earlier'].map(bucket => {
                                        const list = groupedThreads[bucket] || [];
                                        if (list.length === 0) return null;
                                        return (
                                            <div key={bucket}>
                                                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    {bucket}
                                                </div>
                                                <div className="space-y-1">
                                                    {list.map(thr => {
                                                        const isAct = thr.id === activeThread?.id;
                                                        return (
                                                            <div
                                                                key={thr.id}
                                                                onClick={() => handleSelectThread(thr)}
                                                                className={`group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition border ${
                                                                    isAct
                                                                        ? 'bg-slate-800/95 border-indigo-500/50 text-white font-semibold shadow-sm'
                                                                        : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white'
                                                                }`}
                                                            >
                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                    <span className="truncate leading-snug">{thr.title || 'New Whiteboard Chat'}</span>
                                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                                        {(thr.messages || []).length} {(thr.messages || []).length === 1 ? 'turn' : 'turns'}
                                                                    </span>
                                                                </div>
                                                                {threads.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleDeleteThread(thr.id, e)}
                                                                        className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition shrink-0"
                                                                        title="Delete chat"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── MAIN CHATBOT COLUMN ── */}
                        <div className="flex-1 flex flex-col min-w-0 h-full bg-[#0b1120]">
                            {/* Top Bar: Sidebar Toggle, Active Title, MCP Pill, Provider, Depth, TTS & Close */}
                            <header
                                style={{ backgroundColor: '#11192c' }}
                                className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsSidebarOpen(prev => !prev)}
                                        className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition shrink-0"
                                        title={isSidebarOpen ? 'Collapse History Sidebar' : 'Open Chat History Sidebar'}
                                        aria-label="Toggle History Sidebar"
                                    >
                                        {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                                    </button>
                                    {!isSidebarOpen && (
                                        <button
                                            type="button"
                                            onClick={handleStartNewChat}
                                            className="p-1.5 rounded-xl text-indigo-300 hover:text-white hover:bg-slate-800 transition shrink-0"
                                            title="New Chat"
                                            aria-label="New Chat"
                                        >
                                            <MessageSquarePlus className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                        <span className="text-xs font-bold text-slate-100 truncate">
                                            {activeThread?.title || 'AI Co-Pilot'}
                                        </span>
                                        <span
                                            className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 font-mono shrink-0"
                                            title="MCP Servers Active: SymPy, SchemDraw, UML, RDKit"
                                        >
                                            ⚡ MCP{mcpStatus?.servers ? ` (${mcpStatus.servers.length})` : ''}
                                        </span>
                                    </div>
                                </div>

                                {/* Controls: Master STOP, Provider, Depth, Auto-Read, Speed, Minimize, Close */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {/* Prominent Master Hard STOP Button */}
                                    {(isAiThinking || isLocalGenerating || isAiSpeaking || isListening) && (
                                        <button
                                            type="button"
                                            onClick={handleMasterStop}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-md shadow-rose-600/30 animate-pulse transition shrink-0 cursor-pointer"
                                            title="Immediately STOP AI Generation, Speech & Narration"
                                            aria-label="Stop AI"
                                        >
                                            <Square className="w-2.5 h-2.5 fill-current" />
                                            <span>STOP</span>
                                        </button>
                                    )}

                                    {/* AI Provider Selector */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowProviderMenu(p => !p);
                                                setShowVerbosityMenu(false);
                                                setShowSpeedDropup(false);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-indigo-300 capitalize flex items-center gap-1 transition"
                                            title="Switch AI Provider"
                                        >
                                            <span>{preferredProvider}</span>
                                            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                                        </button>
                                        {showProviderMenu && (
                                            <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 min-w-[115px] text-xs">
                                                {[
                                                    { id: 'auto', label: 'Auto Smart' },
                                                    { id: 'gemini', label: 'Gemini' },
                                                    { id: 'groq', label: 'Groq Fast' }
                                                ].map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                            onChangePreferredProvider?.(p.id);
                                                            setShowProviderMenu(false);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                                                            preferredProvider === p.id ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Depth Selector */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowVerbosityMenu(v => !v);
                                                setShowProviderMenu(false);
                                                setShowSpeedDropup(false);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300 capitalize flex items-center gap-1 transition"
                                            title="Explanation Depth"
                                        >
                                            <span>{responseVerbosity === 'brief' ? '⚡' : responseVerbosity === 'detailed' ? '📖' : '⚖️'}</span>
                                            <span className="hidden sm:inline">{responseVerbosity}</span>
                                        </button>
                                        {showVerbosityMenu && (
                                            <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 min-w-[125px] text-xs">
                                                {[
                                                    { id: 'brief', label: '⚡ Brief' },
                                                    { id: 'normal', label: '⚖️ Normal' },
                                                    { id: 'detailed', label: '📖 Detailed' }
                                                ].map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => {
                                                            onChangeResponseVerbosity(m.id);
                                                            setShowVerbosityMenu(false);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                                                            responseVerbosity === m.id ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* TTS Speech Speed */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowSpeedDropup(s => !s);
                                                setShowVerbosityMenu(false);
                                                setShowProviderMenu(false);
                                            }}
                                            className="px-1.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 transition"
                                            title="TTS Speech Speed"
                                        >
                                            {speechRate}x
                                        </button>
                                        {showSpeedDropup && (
                                            <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 min-w-[64px]">
                                                {SPEED_OPTIONS.map(spd => (
                                                    <button
                                                        key={spd}
                                                        type="button"
                                                        onClick={() => {
                                                            onChangeSpeechRate(spd);
                                                            setShowSpeedDropup(false);
                                                            if (isAiSpeaking) onSpeak(aiSpeakingText || displayText, { rate: spd });
                                                        }}
                                                        className={`w-full px-2 py-1 rounded text-[10px] font-mono text-center transition ${
                                                            Math.abs((speechRate || 1) - spd) < 0.05 ? 'bg-yellow-400 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {spd}x
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Voice Auto-Read Mute/Unmute */}
                                    <button
                                        type="button"
                                        onClick={onToggleAiSpeech}
                                        className={`p-1.5 rounded-lg transition ${
                                            aiSpeechEnabled ? 'text-indigo-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
                                        }`}
                                        title={aiSpeechEnabled ? 'Voice Auto-Read ON' : 'Voice Auto-Read Muted'}
                                    >
                                        {aiSpeechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                                    </button>

                                    {/* Dismiss to Live Captions / Close */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPaneDismissed(true);
                                            onClose?.();
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                        title="Close AI Assistant"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </header>

                            {/* Drag Overlay */}
                            {isDraggingImage && (
                                <div className="px-4 py-2 bg-indigo-950/95 border-b border-indigo-500/40 flex items-center justify-center gap-2 text-xs text-indigo-200 font-semibold">
                                    <Upload className="w-4 h-4 text-indigo-400 animate-bounce" />
                                    <span>Drop photo or file to attach to chat</span>
                                </div>
                            )}

                            {/* ── CHRONOLOGICAL CONVERSATION LOG (Full Thread Scroll) ── */}
                            <div
                                onScroll={handleUserScroll}
                                onWheel={handleUserScroll}
                                onTouchStart={handleUserScroll}
                                className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar select-text"
                            >
                                {activeMessages.length === 0 && !isGenerating ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-6 space-y-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-amber-500/20 border border-indigo-400/40 flex items-center justify-center shadow-lg">
                                            <Sparkles className="w-6 h-6 text-yellow-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white">Whiteboard AI Co-Pilot</h3>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Ask STEM problems, generate classroom images, search web citations, or compose music — then click <strong className="text-yellow-400">Add to Board</strong>.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 w-full text-left">
                                            {[
                                                { mode: 'stem', title: '📐 STEM Solver', prompt: 'Solve 2x + 3y = 6 and x - y = 1', desc: 'Step-by-step math & graphs' },
                                                { mode: 'image', title: '🎨 Create Image', prompt: 'Clean labeled diagram of a plant cell organelles', desc: 'Gemini image generation' },
                                                { mode: 'web', title: '🌐 Fetch from Web', prompt: 'Newtons laws of motion key applications', desc: 'Live citations & images' },
                                                { mode: 'music', title: '🎵 Music Studio', prompt: 'Cheerful C major pentatonic classroom warm-up melody', desc: 'Playable Web Audio score' }
                                            ].map((card) => (
                                                <button
                                                    key={card.mode}
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveMode(card.mode);
                                                        handleSendPrompt(null, card.prompt, card.mode);
                                                    }}
                                                    className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 transition text-left cursor-pointer"
                                                >
                                                    <div className="text-xs font-bold text-slate-100">{card.title}</div>
                                                    <div className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">{card.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    activeMessages.map((msg, mIdx) => {
                                        if (msg.role === 'user') {
                                            return (
                                                <div key={msg.id || mIdx} className="flex flex-col items-end gap-1">
                                                    <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5 bg-indigo-600/20 border border-indigo-500/35 text-slate-100 text-xs space-y-1.5 shadow-sm">
                                                        {msg.mode && msg.mode !== 'stem' && (
                                                            <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-md border font-semibold ${MODE_META[msg.mode]?.colorClass || ''}`}>
                                                                {MODE_META[msg.mode]?.label}
                                                            </span>
                                                        )}
                                                        {msg.previewUrl && (
                                                            <img src={msg.previewUrl} alt="User attachment" className="max-h-36 rounded-lg border border-slate-700 object-contain" />
                                                        )}
                                                        {msg.attachmentName && !msg.previewUrl && (
                                                            <div className="text-[10.5px] text-indigo-300 font-mono flex items-center gap-1">
                                                                <FileText className="w-3 h-3" />
                                                                <span>{msg.attachmentName}</span>
                                                            </div>
                                                        )}
                                                        <div
                                                            className="leading-relaxed"
                                                            dangerouslySetInnerHTML={{ __html: renderFormattedText(msg.content) }}
                                                        />
                                                    </div>
                                                    <span className="text-[9.5px] text-slate-500 font-mono pr-1">{msg.timestamp}</span>
                                                </div>
                                            );
                                        }

                                        // ── Assistant Turn Card ──
                                        const isLatestTurn = latestAssistantMsg?.id === msg.id;
                                        const msgBlocks = isLatestTurn ? blocks : parseContentBlocks(msg.solutionMarkdown || msg.content);
                                        const copyTargetText = msg.solutionMarkdown || msg.content || msg.question || '';

                                        return (
                                            <div
                                                key={msg.id || mIdx}
                                                className={`rounded-2xl border p-3.5 space-y-2.5 shadow-md ${
                                                    msg.isError ? 'bg-rose-950/35 border-rose-500/60' : 'bg-slate-900/75 border-slate-800'
                                                }`}
                                            >
                                                {/* Turn Meta Row + Voice Narration Controls */}
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-bold text-yellow-400 flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3" />
                                                            <span>AI Co-Pilot</span>
                                                        </span>
                                                        {msg.modelUsed && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono">
                                                                {String(msg.modelUsed).replace(' (Open Source, MIT)', '')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Inline Voice Controls on Latest STEM Turn */}
                                                    {isLatestTurn && !msg.isError && msgBlocks.length > 0 && (
                                                        <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-700/80 rounded-lg p-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    let prev = (activeBlockIndex > 0 ? activeBlockIndex : 0) - 1;
                                                                    while (prev > 0 && msgBlocks[prev]?.type === 'heading') prev--;
                                                                    onGoToStep?.(Math.max(0, prev), { rate: speechRate, shouldSpeak: isAiSpeaking });
                                                                }}
                                                                className="p-1 rounded text-slate-300 hover:text-yellow-400 transition"
                                                                title="Previous Step"
                                                            >
                                                                <ChevronLeft className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isAiSpeaking && !isAiPaused) onPauseSpeaking();
                                                                    else if (isAiPaused) onResumeSpeaking();
                                                                    else if (typeof onSpeakSteps === 'function') {
                                                                        const startIdx = activeBlockIndex >= 0 ? activeBlockIndex : Math.max(0, msgBlocks.findIndex(b => b.type !== 'heading'));
                                                                        onSpeakSteps(msgBlocks, { rate: speechRate, startIndex: startIdx, autoPlay: true });
                                                                    } else {
                                                                        onSpeak(copyTargetText, { rate: speechRate });
                                                                    }
                                                                }}
                                                                className={`p-1 rounded transition ${
                                                                    isAiSpeaking && !isAiPaused ? 'bg-yellow-400 text-slate-950' : 'text-yellow-400 hover:bg-slate-800'
                                                                }`}
                                                                title={isAiSpeaking && !isAiPaused ? 'Pause Voice' : 'Narrate Steps'}
                                                            >
                                                                {isAiSpeaking && !isAiPaused ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    let next = (activeBlockIndex >= 0 ? activeBlockIndex : -1) + 1;
                                                                    while (next < msgBlocks.length - 1 && msgBlocks[next]?.type === 'heading') next++;
                                                                    onGoToStep?.(Math.min(msgBlocks.length - 1, next), { rate: speechRate, shouldSpeak: isAiSpeaking });
                                                                }}
                                                                className="p-1 rounded text-slate-300 hover:text-yellow-400 transition"
                                                                title="Next Step"
                                                            >
                                                                <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Concise Spoken Summary Banner */}
                                                {msg.speechResponse && msg.speechResponse !== msg.solutionMarkdown && (
                                                    <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/35 text-emerald-100 text-xs leading-relaxed">
                                                        <div dangerouslySetInnerHTML={{ __html: renderFormattedText(msg.speechResponse) }} />
                                                    </div>
                                                )}

                                                {/* Generated Image Card */}
                                                {msg.generatedImage && (msg.generatedImage.imageDataUrl || msg.generatedImage.svg) && (
                                                    <div className="rounded-xl border border-fuchsia-500/35 bg-slate-950 overflow-hidden">
                                                        {msg.generatedImage.imageDataUrl ? (
                                                            <img
                                                                src={msg.generatedImage.imageDataUrl}
                                                                alt={msg.generatedImage.prompt || 'Generated illustration'}
                                                                className="w-full max-h-64 object-contain bg-slate-900"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-full p-2 bg-white flex items-center justify-center max-h-64 overflow-hidden [&_svg]:max-w-full [&_svg]:h-auto"
                                                                dangerouslySetInnerHTML={{ __html: msg.generatedImage.svg }}
                                                            />
                                                        )}
                                                        <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                                                            <span className="text-[10.5px] text-slate-400 truncate max-w-[55%]">
                                                                {msg.generatedImage.style}
                                                            </span>
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const src = msg.generatedImage.imageDataUrl || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(msg.generatedImage.svg)}`;
                                                                        onInsertImage?.(src);
                                                                    }}
                                                                    className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition"
                                                                >
                                                                    ✨ Add to Board
                                                                </button>
                                                                {msg.generatedImage.imageDataUrl && (
                                                                    <a
                                                                        href={msg.generatedImage.imageDataUrl}
                                                                        download="whiteboard_ai_image.png"
                                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                                                        title="Download Image"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Music Studio Card + Web Audio Synth */}
                                                {msg.musicData && (
                                                    <div className="rounded-xl border border-emerald-500/40 bg-slate-950 overflow-hidden space-y-2 p-2.5">
                                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                                            <div>
                                                                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                                                    <Music className="w-3.5 h-3.5" />
                                                                    <span>{msg.musicData.title}</span>
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 font-mono">
                                                                    {msg.musicData.keySignature} · {msg.musicData.timeSignature} · {msg.musicData.tempoBpm} BPM
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => playMusicNotes(msg.id, msg.musicData)}
                                                                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition ${
                                                                        playingMusicMsgId === msg.id ? 'bg-rose-500 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                                                    }`}
                                                                >
                                                                    {playingMusicMsgId === msg.id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                                                                    <span>{playingMusicMsgId === msg.id ? 'Stop Audio' : 'Play Synth'}</span>
                                                                </button>
                                                                {typeof onInsertDiagram === 'function' && msg.musicData.svg && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => onInsertDiagram(msg.musicData.svg, { title: msg.musicData.title, width: 460, height: 185 })}
                                                                        className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition"
                                                                    >
                                                                        ✨ Add Score to Board
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {msg.musicData.svg && (
                                                            <div
                                                                className="w-full overflow-x-auto bg-white rounded-lg p-1.5 [&_svg]:max-w-full [&_svg]:h-auto"
                                                                dangerouslySetInnerHTML={{ __html: msg.musicData.svg }}
                                                            />
                                                        )}
                                                        {msg.musicData.abcNotation && (
                                                            <pre className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-200 overflow-x-auto">
                                                                {msg.musicData.abcNotation}
                                                            </pre>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Web Search Rich Cards: Citations, Web Images & Videos */}
                                                {msg.webResult && (
                                                    <div className="space-y-2.5">
                                                        {Array.isArray(msg.webResult.images) && msg.webResult.images.length > 0 && (
                                                            <div>
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5">
                                                                    Web Images &amp; Diagrams (Click to Add to Board)
                                                                </div>
                                                                <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                                                                    {msg.webResult.images.map((im, imIdx) => {
                                                                        const src = im.image || im.thumbnail || im.url || im.link || im;
                                                                        return (
                                                                            <div key={imIdx} className="relative w-28 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group">
                                                                                <img src={src} alt={im.title || 'Web result'} className="w-full h-full object-cover" />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => onInsertImage?.(src)}
                                                                                    className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 text-yellow-300 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition cursor-pointer"
                                                                                >
                                                                                    <Plus className="w-4 h-4" />
                                                                                    <span>Add to Board</span>
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {Array.isArray(msg.webResult.citations) && msg.webResult.citations.length > 0 && (
                                                            <div className="space-y-1">
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                    Sources
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                    {msg.webResult.citations.map((cit, cIdx) => (
                                                                        <a
                                                                            key={cIdx}
                                                                            href={cit.url || cit.link}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="p-2 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 flex flex-col gap-0.5 transition"
                                                                        >
                                                                            <div className="text-[11px] font-semibold text-cyan-300 truncate flex items-center justify-between gap-1">
                                                                                <span className="truncate">{cit.title || cit.url}</span>
                                                                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                                                            </div>
                                                                            {cit.snippet && (
                                                                                <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">{cit.snippet}</p>
                                                                            )}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {Array.isArray(msg.webResult.videos) && msg.webResult.videos.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                                {msg.webResult.videos.map((vid, vIdx) => (
                                                                    <button
                                                                        key={vIdx}
                                                                        type="button"
                                                                        onClick={() => onInsertMedia?.({ mediaType: 'youtube', url: vid.url || vid.link, title: vid.title })}
                                                                        className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[10.5px] font-medium flex items-center gap-1 truncate max-w-[230px] cursor-pointer transition"
                                                                    >
                                                                        <Play className="w-3 h-3 shrink-0" />
                                                                        <span className="truncate">Embed: {vid.title}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Structured Markdown / KaTeX / Mermaid / Table Blocks */}
                                                {msgBlocks.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        {msgBlocks.map((block, bIdx) => {
                                                            const isActive = isLatestTurn && (bIdx === activeBlockIndex) && (isAiSpeaking || isAiPaused || isStepMode || clickedBlockIdx !== null);
                                                            const handleSelectStep = () => {
                                                                setClickedBlockIdx(bIdx);
                                                                if (isLatestTurn && typeof onGoToStep === 'function') {
                                                                    onGoToStep(bIdx, { rate: speechRate, shouldSpeak: true });
                                                                } else {
                                                                    onSpeak(block.spokenText || block.text, { rate: speechRate });
                                                                }
                                                            };

                                                            if (block.type === 'heading') {
                                                                return (
                                                                    <div key={block.id || bIdx} className="pt-1.5 pb-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 border-b border-slate-800">
                                                                        <span dangerouslySetInnerHTML={{ __html: renderFormattedText(block.text) }} />
                                                                    </div>
                                                                );
                                                            }
                                                            if (block.type === 'mermaid') {
                                                                return (
                                                                    <div key={block.id || bIdx} className="my-1.5">
                                                                        <MermaidRenderer chart={block.text} title="Diagram" onInsertDiagram={onInsertDiagram} />
                                                                    </div>
                                                                );
                                                            }
                                                            if (block.type === 'code') {
                                                                return (
                                                                    <div key={block.id || bIdx} className="my-1.5 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden">
                                                                        <div className="flex items-center justify-between px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10.5px] font-mono text-indigo-300">
                                                                            <span>💻 {(block.language || 'code').toUpperCase()}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => { navigator.clipboard.writeText(block.text); toast.success('Code copied'); }}
                                                                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px]"
                                                                            >Copy</button>
                                                                        </div>
                                                                        <pre className="p-2.5 font-mono text-[11px] text-emerald-300 overflow-x-auto select-text">{block.text}</pre>
                                                                    </div>
                                                                );
                                                            }
                                                            if (block.type === 'table') {
                                                                return (
                                                                    <div key={block.id || bIdx} className="my-2 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden">
                                                                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10.5px]">
                                                                            <span className="font-bold text-amber-300">📊 Table ({block.rows?.length || 0} rows)</span>
                                                                            {typeof onInsertTable === 'function' && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => onInsertTable(block.text, { fontSize: 12 })}
                                                                                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 font-semibold"
                                                                                >Place Table on Board</button>
                                                                            )}
                                                                        </div>
                                                                        <div className="overflow-x-auto p-2 max-h-60">
                                                                            <table className="w-full text-[11px] border-collapse">
                                                                                <thead>
                                                                                    <tr className="bg-slate-800 text-amber-300">
                                                                                        {block.headers.map((h, hI) => (
                                                                                            <th key={hI} className="px-2 py-1 border border-slate-700" dangerouslySetInnerHTML={{ __html: renderFormattedText(h) }} />
                                                                                        ))}
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {block.rows.map((r, rI) => (
                                                                                        <tr key={rI} className="border-b border-slate-800">
                                                                                            {r.map((c, cI) => (
                                                                                                <td key={cI} className="px-2 py-1 border border-slate-800 text-center" dangerouslySetInnerHTML={{ __html: renderFormattedText(c) }} />
                                                                                            ))}
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <div
                                                                    key={block.id || bIdx}
                                                                    onClick={handleSelectStep}
                                                                    className={`p-2 rounded-xl border transition cursor-pointer text-xs leading-relaxed ${
                                                                        isActive
                                                                            ? 'bg-amber-950/60 border-yellow-400 text-yellow-50 ring-1 ring-yellow-400'
                                                                            : block.type === 'answer'
                                                                            ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-100'
                                                                            : 'bg-slate-950/60 hover:border-slate-600 border-slate-800 text-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-start gap-2">
                                                                        {block.prefix && block.type !== 'formula' && (
                                                                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-yellow-300">
                                                                                {block.prefix}
                                                                            </span>
                                                                        )}
                                                                        <div className="flex-1 min-w-0" dangerouslySetInnerHTML={{ __html: renderFormattedText(block.text) }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : msg.content && !msg.generatedImage && !msg.musicData ? (
                                                    <div className="text-xs text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderFormattedText(msg.content) }} />
                                                ) : null}

                                                {/* SVG / SchemDraw Diagram Preview inside Turn */}
                                                {Boolean(msg.diagram?.svg || msg.canvasAction?.svg) && (() => {
                                                    const diagSvg = msg.diagram?.svg || msg.canvasAction?.svg;
                                                    const diagTitle = msg.diagram?.title || msg.canvasAction?.title || 'Schematic Diagram';
                                                    const diagCode = msg.diagram?.code || msg.schemdrawCode || msg.canvasAction?.code || null;
                                                    return (
                                                        <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden">
                                                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800">
                                                                <span className="text-[11px] font-semibold text-slate-200">📊 {diagTitle}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onInsertDiagram ? onInsertDiagram(diagSvg, { title: diagTitle, code: diagCode, width: 380, height: 380 }) : onInsertToBoard?.(msg)}
                                                                    className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer"
                                                                >
                                                                    ➕ Add Diagram to Board
                                                                </button>
                                                            </div>
                                                            <div className="bg-white p-2 flex items-center justify-center max-h-56 overflow-auto [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: diagSvg }} />
                                                            {diagCode && (
                                                                <details className="border-t border-slate-800">
                                                                    <summary className="px-3 py-1.5 text-[10px] font-mono text-emerald-400 cursor-pointer bg-slate-950">🐍 SchemDraw Python Code</summary>
                                                                    <pre className="p-2.5 text-[10px] font-mono text-indigo-200 bg-slate-950 overflow-x-auto max-h-40">{diagCode}</pre>
                                                                </details>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Turn Footer Action Bar: Add to Board, Text, Sticky, Physics Lab, Plot, Copy, Regenerate */}
                                                <div className="pt-2 border-t border-slate-800/90 flex items-center gap-1.5 flex-wrap">
                                                    {onInsertToBoard && msg.mode !== 'image' && msg.mode !== 'music' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onInsertToBoard(msg)}
                                                            className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-[10.5px] flex items-center gap-1 shadow-xs cursor-pointer transition"
                                                            title="Add structured AI solution to whiteboard canvas"
                                                        >
                                                            ✨ Add to Board
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => onInsertAsText(copyTargetText)}
                                                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-medium cursor-pointer transition"
                                                    >
                                                        🔤 Text
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onCreateStickyNote(copyTargetText)}
                                                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-medium cursor-pointer transition"
                                                    >
                                                        📝 Sticky
                                                    </button>
                                                    {onOpenPhysicsSpace && (msg.physicsAction || /force|velocity|gravity|pendulum|projectile/i.test(msg.question || '')) && (
                                                        <button
                                                            type="button"
                                                            onClick={onOpenPhysicsSpace}
                                                            className="px-2 py-1 rounded-lg bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 text-[10px] font-medium cursor-pointer transition"
                                                        >
                                                            ⚛️ Physics Lab
                                                        </button>
                                                    )}
                                                    {onOpenGraphPlotter && ((msg.graphEquations?.length > 0) || (msg.canvasAction?.curves?.length > 0)) && (
                                                        <button
                                                            type="button"
                                                            onClick={onOpenGraphPlotter}
                                                            className="px-2 py-1 rounded-lg bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/40 text-[10px] font-medium cursor-pointer transition"
                                                        >
                                                            📈 Plot
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(copyTargetText);
                                                            setCopiedId(msg.id);
                                                            setTimeout(() => setCopiedId(null), 1500);
                                                        }}
                                                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition ml-auto"
                                                        title="Copy response"
                                                    >
                                                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                    {msg.question && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendPrompt(null, msg.question, msg.mode || 'stem')}
                                                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-yellow-400 transition"
                                                            title="Regenerate response"
                                                        >
                                                            <RefreshCw className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Suggested Follow-Ups */}
                                                {isLatestTurn && Array.isArray(msg.suggestedFollowUps) && msg.suggestedFollowUps.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {msg.suggestedFollowUps.slice(0, 3).map((fu, fIdx) => (
                                                            <button
                                                                key={fIdx}
                                                                type="button"
                                                                onClick={() => handleSendPrompt(null, fu.replace(/^🔄\s*Retry:\s*/i, ''), 'stem')}
                                                                className="px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 text-[10.5px] text-slate-300 hover:text-white transition cursor-pointer text-left"
                                                            >
                                                                {fu}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}

                                {/* Thinking / Generating Loader Bubble */}
                                {isGenerating && (
                                    <div className="p-3 rounded-2xl border border-indigo-500/40 bg-slate-900/90 flex items-center justify-between gap-2 text-xs text-yellow-300">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                                            <span>{localThinkingLabel || 'Thinking & solving step by step...'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsLocalGenerating(false);
                                                onStopGeneration?.();
                                            }}
                                            className="px-2 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 text-[10px] font-semibold"
                                        >
                                            Stop
                                        </button>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* ── INLINE WEB IMAGE SEARCH STRIP (triggered by + -> Web Images & Diagrams) ── */}
                            {showWebImageTray && (
                                <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/95 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <form onSubmit={handleQuickWebImageSearch} className="flex-1 flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                value={webImageQuery}
                                                onChange={(e) => setWebImageQuery(e.target.value)}
                                                placeholder="Search web diagrams, photos & labels..."
                                                className="flex-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                                            />
                                            <button
                                                type="submit"
                                                disabled={isSearchingWebImages}
                                                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                                            >
                                                {isSearchingWebImages ? '...' : 'Find'}
                                            </button>
                                        </form>
                                        <button
                                            type="button"
                                            onClick={() => setShowWebImageTray(false)}
                                            className="p-1 text-slate-400 hover:text-white rounded"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {webImageResults.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                            {webImageResults.map((img, i) => {
                                                const src = img.image || img.thumbnail || img.url || img;
                                                return (
                                                    <div key={i} className="relative w-20 h-14 shrink-0 rounded-lg overflow-hidden border border-slate-700 group">
                                                        <img src={src} alt="Web result" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setScannedPreviewUrl(src);
                                                                    setScannedDataUrl(src);
                                                                    setScannedFile({ name: img.title || 'Web Image' });
                                                                    setShowWebImageTray(false);
                                                                }}
                                                                className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-bold"
                                                            >Chat</button>
                                                            <button
                                                                type="button"
                                                                onClick={() => onInsertImage?.(src)}
                                                                className="px-1.5 py-0.5 rounded bg-yellow-400 text-slate-950 text-[9px] font-bold"
                                                            >Board</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── COMPOSER FOOTER (+ Menu, Mode & File Chips, Mic, Textarea, Send) ── */}
                            <footer
                                style={{ backgroundColor: '#11192c' }}
                                className="p-2.5 border-t border-slate-800 space-y-2 relative shrink-0"
                            >
                                {/* + Plus Popover Menu (Attachments & AI Modes) */}
                                {showPlusMenu && (
                                    <div
                                        style={{ backgroundColor: '#0f172a' }}
                                        className="absolute bottom-full left-2.5 mb-2 w-[min(320px,88vw)] bg-slate-900 border-2 border-slate-700/90 rounded-2xl shadow-2xl p-2.5 z-50 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-120"
                                    >
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5 pb-1">
                                                Attach Media, Files &amp; Web
                                            </div>
                                            <div className="grid grid-cols-2 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 hover:text-white transition text-left"
                                                >
                                                    <Camera className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                                    <span>Camera</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 hover:text-white transition text-left"
                                                >
                                                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span>Photos</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => docFileInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 hover:text-white transition text-left"
                                                >
                                                    <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                    <span>Device Files</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowPlusMenu(false);
                                                        if (typeof onOpenDrivePicker === 'function') {
                                                            onOpenDrivePicker();
                                                        } else {
                                                            toast('Drive & Docs picker not linked here', { icon: '📁' });
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 hover:text-white transition text-left"
                                                >
                                                    <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                    <span>Drive &amp; Docs</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowWebImageTray(true);
                                                        setShowPlusMenu(false);
                                                        if (composerText.trim()) setWebImageQuery(composerText.trim());
                                                    }}
                                                    className="col-span-2 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-cyan-300 hover:text-white transition text-left"
                                                >
                                                    <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                                    <span>Web Images &amp; Diagrams</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-800 pt-2">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5 pb-1">
                                                AI Capability Mode
                                            </div>
                                            <div className="grid grid-cols-2 gap-1">
                                                {[
                                                    { id: 'image', icon: Wand2, color: 'text-fuchsia-400', label: 'Create Image' },
                                                    { id: 'web', icon: Globe, color: 'text-cyan-400', label: 'Fetch from Web' },
                                                    { id: 'music', icon: Music, color: 'text-emerald-400', label: 'Music Studio' },
                                                    { id: 'diagram', icon: GitBranch, color: 'text-indigo-400', label: 'Diagram' },
                                                    { id: 'stem', icon: Sparkles, color: 'text-amber-400', label: 'STEM Solve' }
                                                ].map(m => {
                                                    const MIcon = m.icon;
                                                    const isAct = activeMode === m.id;
                                                    return (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveMode(m.id);
                                                                setShowPlusMenu(false);
                                                                composerInputRef.current?.focus();
                                                            }}
                                                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition text-left ${
                                                                isAct ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-800/70 hover:bg-slate-800 text-slate-200'
                                                            }`}
                                                        >
                                                            <MIcon className={`w-3.5 h-3.5 shrink-0 ${isAct ? 'text-white' : m.color}`} />
                                                            <span>{m.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Active Mode Pill & Attachment Preview Chips */}
                                {(activeMode !== 'stem' || scannedPreviewUrl || attachedDocFile) && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {activeMode !== 'stem' && (
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold ${currentModeMeta.colorClass}`}>
                                                <span>{currentModeMeta.label}</span>
                                                {activeMode === 'image' && (
                                                    <select
                                                        value={imageStyle}
                                                        onChange={(e) => setImageStyle(e.target.value)}
                                                        className="bg-slate-900/90 text-[10px] text-fuchsia-200 rounded px-1 py-0.2 border border-fuchsia-500/30 focus:outline-none"
                                                        title="Image Art Style"
                                                    >
                                                        <option>Educational Diagram</option>
                                                        <option>Photorealistic</option>
                                                        <option>Whiteboard Sketch</option>
                                                        <option>Vector Illustration</option>
                                                    </select>
                                                )}
                                                <button type="button" onClick={() => setActiveMode('stem')} className="hover:text-white" title="Reset to STEM Solve">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}

                                        {scannedPreviewUrl && (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800 border border-indigo-500/50 text-[10.5px] text-indigo-200">
                                                <img src={scannedPreviewUrl} alt="Attached" className="w-4 h-4 rounded object-cover" />
                                                <span className="truncate max-w-[120px]">{scannedFile?.name || 'Image'}</span>
                                                <button type="button" onClick={() => { setScannedPreviewUrl(null); setScannedDataUrl(null); setScannedFile(null); }} className="hover:text-white">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}

                                        {attachedDocFile && (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800 border border-amber-500/50 text-[10.5px] text-amber-200">
                                                <FileText className="w-3 h-3" />
                                                <span className="truncate max-w-[130px]">{attachedDocFile.name}</span>
                                                <button type="button" onClick={() => setAttachedDocFile(null)} className="hover:text-white">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Main Composer Row (+ | Mic | Prompt | Send/Stop) */}
                                <form onSubmit={(e) => handleSendPrompt(e)} className="flex items-end gap-1 sm:gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowPlusMenu(p => !p)}
                                        disabled={isScanningImage}
                                        className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 transition cursor-pointer ${
                                            showPlusMenu
                                                ? 'bg-indigo-600 border-indigo-400 text-white'
                                                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                                        }`}
                                        title="Attach Camera, Photos, Files, Drive, Web Images or Switch AI Mode"
                                    >
                                        {isScanningImage ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Plus className={`w-3.5 h-3.5 transition-transform ${showPlusMenu ? 'rotate-45' : ''}`} />}
                                    </button>

                                    {typeof onToggleListening === 'function' && (
                                        <button
                                            type="button"
                                            onClick={onToggleListening}
                                            className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 transition cursor-pointer ${
                                                isListening
                                                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/40 animate-pulse'
                                                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                                            }`}
                                            style={isListening && audioLevel > 0.05 ? { boxShadow: `0 0 ${Math.round(audioLevel * 18)}px rgba(16,185,129,0.65)` } : undefined}
                                            title={isListening ? 'Stop Voice Input' : 'Voice Dictation'}
                                        >
                                            <Mic className="w-3.5 h-3.5" />
                                        </button>
                                    )}

                                    <textarea
                                        ref={composerInputRef}
                                        rows={1}
                                        value={composerText}
                                        onChange={(e) => setComposerText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendPrompt(e);
                                            }
                                        }}
                                        placeholder={
                                            activeMode === 'image' ? 'Describe diagram or image to generate...'
                                                : activeMode === 'web' ? 'Search web articles, citations & images...'
                                                : activeMode === 'music' ? 'Describe melody, scale, BPM or chord...'
                                                : activeMode === 'diagram' ? 'Describe circuit, flowchart or UML...'
                                                : 'Ask anything, solve math, or drop image...'
                                        }
                                        className="flex-1 min-h-[30px] max-h-24 py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-xs text-white placeholder-slate-400 focus:outline-none resize-none leading-snug custom-scrollbar"
                                    />

                                    {(isGenerating || isAiSpeaking || isListening) ? (
                                        <button
                                            type="button"
                                            onClick={handleMasterStop}
                                            className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shrink-0 transition cursor-pointer shadow-md shadow-rose-600/30 animate-pulse"
                                            title="Stop AI Immediately"
                                        >
                                            <Square className="w-3 h-3 fill-current" />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={!composerText.trim() && !scannedPreviewUrl && !attachedDocFile}
                                            className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-slate-950 flex items-center justify-center shrink-0 transition cursor-pointer shadow-sm"
                                            title="Send prompt"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </form>
                            </footer>
                        </div>
                    </aside>
                </>
            )}

            {/* ─── 2. FLOATING LIVE CLOSED CAPTIONS BAR (when Drawer is Closed/Minimized during Voice/TTS) ── */}
            {showFloatingCc && (
                <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingImage(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingImage(false); }}
                    onDrop={handleDropImage}
                    onPaste={handlePasteImage}
                    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[75] max-w-xl w-[92%] sm:w-[540px] pointer-events-auto select-none transition-all duration-200 flex flex-col"
                >
                    {isMinimized ? (
                        <div
                            onClick={() => setIsMinimized(false)}
                            className="mx-auto flex items-center justify-between gap-2.5 px-3.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 rounded-full shadow-2xl cursor-pointer text-xs text-slate-200 backdrop-blur-md transition group"
                        >
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    {isListening && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isListening ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                                </span>
                                <span className="font-semibold text-[11px] text-indigo-300">Voice AI</span>
                                <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                                    {isAiSpeaking ? '🔊 AI Speaking...' : isListening ? (interimTranscript || transcript || 'Listening...') : 'Open Captions'}
                                </span>
                            </div>
                            <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-white" />
                        </div>
                    ) : (
                        <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col">
                            <div className="px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2">
                                    {isAiSpeaking ? (
                                        <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                                            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                                            AI Speaking ({speechRate}x)
                                        </span>
                                    ) : isListening ? (
                                        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                            <Mic className="w-3.5 h-3.5" />
                                            Microphone Active
                                        </span>
                                    ) : (
                                        <span className="text-indigo-300 font-medium">Live Captions</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onOpenAiSolution?.()}
                                        className="px-2 py-0.5 rounded bg-indigo-600/80 hover:bg-indigo-500 text-white text-[10px] font-semibold transition"
                                        title="Open full AI Chat Drawer"
                                    >
                                        Open Chat
                                    </button>
                                    {isAiSpeaking && (
                                        <button type="button" onClick={onStopSpeaking} className="p-1 rounded text-rose-300 hover:bg-rose-500/20" title="Mute Speech">
                                            <VolumeX className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setIsMinimized(true)} className="p-1 rounded text-slate-400 hover:text-white" title="Minimize">
                                        <Minimize2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" onClick={() => setIsCcDismissed(true)} className="p-1 rounded text-slate-400 hover:text-white" title="Dismiss">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="px-4 py-2.5 text-xs">
                                {isCcEditing ? (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (ccEditText.trim()) {
                                                onExecuteCommand(ccEditText.trim(), { verbosity: responseVerbosity });
                                                setIsCcEditing(false);
                                                onOpenAiSolution?.();
                                            }
                                        }}
                                        className="flex items-center gap-1.5"
                                    >
                                        <input
                                            type="text"
                                            value={ccEditText}
                                            onChange={(e) => setCcEditText(e.target.value)}
                                            className="flex-1 bg-slate-900 border border-indigo-500/70 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                                            autoFocus
                                        />
                                        <button type="submit" className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold">Ask</button>
                                        <button type="button" onClick={() => setIsCcEditing(false)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                                    </form>
                                ) : isAiSpeaking && aiSpeakingText ? (
                                    <div className="text-purple-200 font-medium truncate">
                                        <span className="text-purple-400 font-bold mr-1.5">🔊</span>
                                        {aiSpeakingText}
                                    </div>
                                ) : interimTranscript || transcript ? (
                                    <div onClick={() => { setIsCcEditing(true); setCcEditText(transcript || interimTranscript); }} className="cursor-pointer flex items-center justify-between">
                                        <div>
                                            {transcript && <span className="text-white mr-1.5">{transcript}</span>}
                                            {interimTranscript && <span className="text-cyan-300 italic animate-pulse">{interimTranscript}...</span>}
                                        </div>
                                        <Pencil className="w-3 h-3 text-slate-500 ml-2 shrink-0" />
                                    </div>
                                ) : feedback ? (
                                    <div className="text-emerald-300 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>{feedback}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
