'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/contrib/mhchem';

/**
 * Robust LaTeX, Physics, Chemistry, and Markdown renderer.
 * Accurately parses:
 * - Block math: `$$...$$` or `\[...\]`
 * - Inline math: `$ ... $` or `\( ... \)`
 * - Chemistry formulas: `$\text{H}_2\text{O}$`, `$\text{CaCO}_3 \rightarrow \text{CaO} + \text{CO}_2$`
 * - Physics equations: `$\vec{F} = m\vec{a}$`, `$E = mc^2$`, `$\lambda = \frac{h}{p}$`
 * - Combinatorics & Calculus: `$nCr = \frac{n!}{r!(n-r)!}$`, `$\int_{a}^{b} f(x)dx$`
 * - Markdown: Headings, Tables, Bold, Italic, Code Blocks, Inline Code, Lists, Callouts, Blockquotes
 */
export default function MathRenderer({
    content = '',
    className = '',
    inline = false,
    textClassName = '',
    size = 'base' // 'sm' | 'base' | 'lg' | 'xl'
}) {
    const renderedElements = useMemo(() => {
        if (!content || typeof content !== 'string') return null;

        return parseContent(content, textClassName, size, inline);
    }, [content, textClassName, size, inline]);

    if (!content) return null;

    if (inline) {
        return <span className={`math-renderer-inline ${textClassName} ${className}`}>{renderedElements}</span>;
    }

    return (
        <div className={`math-renderer ${textClassName} ${className}`}>
            {renderedElements}
        </div>
    );
}

/**
 * Safely renders a LaTeX math string using KaTeX.
 */
function renderKatexToString(mathStr, displayMode = false) {
    try {
        return katex.renderToString(mathStr.trim(), {
            displayMode,
            throwOnError: false,
            strict: false,
            trust: true
        });
    } catch (err) {
        console.warn('[KaTeX Error]:', err.message);
        return `<span class="katex-error font-mono text-xs text-amber-400 bg-amber-950/40 px-1 py-0.5 rounded">${escapeHtml(mathStr)}</span>`;
    }
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Parses markdown blocks and LaTeX formulas into React elements.
 */
function parseContent(text, textClassName = '', size = 'base', inline = false) {
    if (inline) {
        return renderInlineFormattedText(text, size, textClassName);
    }

    // 1. First tokenize code blocks (```...```) and block math ($$...$$ or \[...\])
    const blockRegex = /(?:```([a-zA-Z0-9_-]*)[^\S\r\n]*\r?\n([\s\S]*?)```)|(?:\$\$([\s\S]*?)\$\$)|(?:\\\[([\s\S]*?)\\\])/g;
    const blocks = [];
    let lastIdx = 0;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
        if (match.index > lastIdx) {
            blocks.push({
                type: 'text',
                content: text.slice(lastIdx, match.index)
            });
        }

        if (match[2] !== undefined) {
            // Code block
            blocks.push({
                type: 'code_block',
                language: match[1] || 'text',
                content: match[2]
            });
        } else if (match[3] !== undefined || match[4] !== undefined) {
            // Block Math ($$...$$ or \[...\])
            const math = match[3] !== undefined ? match[3] : match[4];
            blocks.push({
                type: 'math_block',
                content: math
            });
        }

        lastIdx = blockRegex.lastIndex;
    }

    if (lastIdx < text.length) {
        blocks.push({
            type: 'text',
            content: text.slice(lastIdx)
        });
    }

    // Render each block
    return blocks.map((block, bIdx) => {
        if (block.type === 'code_block') {
            return (
                <div key={`cb-${bIdx}`} className="my-3.5 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-md">
                    {block.language && (
                        <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                            <span>{block.language}</span>
                            <span className="text-[10px] text-slate-500 font-sans normal-case">Code snippet</span>
                        </div>
                    )}
                    <pre className="p-4 text-xs sm:text-[13px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                        <code>{block.content}</code>
                    </pre>
                </div>
            );
        }

        if (block.type === 'math_block') {
            const mathHtml = renderKatexToString(block.content, true);
            const isLightText = textClassName && (
                textClassName.includes('slate-1') || 
                textClassName.includes('slate-2') || 
                textClassName.includes('white') || 
                textClassName.includes('cyan') || 
                textClassName.includes('purple') || 
                textClassName.includes('amber')
            );
            return (
                <div
                    key={`mb-${bIdx}`}
                    className={`my-3 px-4 py-3 rounded-xl overflow-x-auto text-center shadow-xs transition-colors ${
                        isLightText 
                            ? 'bg-slate-900/90 border border-slate-800 text-slate-100' 
                            : 'bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                    dangerouslySetInnerHTML={{ __html: mathHtml }}
                />
            );
        }

        // Standard text with paragraphs, tables, headings, bullet lists, and inline math
        return renderTextParagraphs(block.content, `txt-${bIdx}`, textClassName, size);
    });
}

/**
 * Handles line-by-line markdown (headings, tables, lists, callouts, paragraphs) with inline math.
 */
function renderTextParagraphs(textChunk, keyPrefix, textClassName = '', size = 'base') {
    const lines = textChunk.split('\n');
    const elements = [];
    let currentParagraph = [];

    // Font size scaling classes
    const sizeConfig = {
        sm: {
            p: 'text-sm leading-relaxed',
            h1: 'text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-4 mb-2',
            h2: 'text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-3.5 mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-800',
            h3: 'text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-3 mb-1',
            li: 'text-xs leading-relaxed my-0.5',
            table: 'text-xs',
            tableHead: 'text-[10px]'
        },
        base: {
            p: 'text-base sm:text-[16.5px] leading-relaxed',
            h1: 'text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-5 mb-2.5',
            h2: 'text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-800',
            h3: 'text-base font-bold text-indigo-700 dark:text-indigo-300 mt-3.5 mb-1.5',
            li: 'text-sm sm:text-[15px] leading-relaxed my-1',
            table: 'text-xs sm:text-sm',
            tableHead: 'text-xs'
        },
        lg: {
            p: 'text-lg sm:text-[18px] leading-relaxed',
            h1: 'text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-6 mb-3',
            h2: 'text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-5 mb-2 pb-2 border-b border-slate-200 dark:border-slate-800',
            h3: 'text-lg font-bold text-indigo-700 dark:text-indigo-300 mt-4 mb-2',
            li: 'text-base sm:text-[17px] leading-relaxed my-1.5',
            table: 'text-sm',
            tableHead: 'text-xs font-black'
        },
        xl: {
            p: 'text-xl leading-relaxed',
            h1: 'text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-7 mb-4',
            h2: 'text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800',
            h3: 'text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-5 mb-2.5',
            li: 'text-lg leading-relaxed my-2',
            table: 'text-base',
            tableHead: 'text-sm font-black'
        }
    };

    const s = sizeConfig[size] || sizeConfig.base;

    const flushParagraph = (pKey) => {
        if (currentParagraph.length > 0) {
            const joinedText = currentParagraph.join('\n');
            let cleanText = joinedText.trim();
            // Clean any stray markdown hash prefixes that slipped into paragraph lines
            cleanText = cleanText.replace(/^(#{1,6})\s*/, '');
            if (cleanText) {
                elements.push(
                    <div key={pKey} className={`my-1.5 ${s.p} ${textClassName || 'text-slate-800 dark:text-slate-200'}`}>
                        {renderInlineFormattedText(cleanText, size, textClassName)}
                    </div>
                );
            }
            currentParagraph = [];
        }
    };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
            flushParagraph(`${keyPrefix}-p-${i}`);
            i++;
            continue;
        }

        // Horizontal dividers (---, ***, ___)
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            flushParagraph(`${keyPrefix}-p-before-hr-${i}`);
            elements.push(
                <hr key={`${keyPrefix}-hr-${i}`} className="my-5 border-t border-slate-200 dark:border-slate-800" />
            );
            i++;
            continue;
        }

        // 1. Detect Markdown Table (| Col 1 | Col 2 |)
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            // Check if next line is a delimiter row (| --- | --- |)
            const nextLine = (lines[i + 1] || '').trim();
            if (nextLine.startsWith('|') && nextLine.includes('---')) {
                flushParagraph(`${keyPrefix}-p-before-table-${i}`);

                const headerLine = trimmed;
                const headerCells = headerLine.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
                
                i += 2; // skip header and delimiter

                const rows = [];
                while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                    const rowCells = lines[i].trim().split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
                    if (rowCells.length > 0) {
                        rows.push(rowCells);
                    }
                    i++;
                }

                elements.push(
                    <div key={`${keyPrefix}-tbl-${i}`} className="my-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                        <table className={`w-full text-left ${s.table}`}>
                            <thead className={`bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider ${s.tableHead}`}>
                                <tr>
                                    {headerCells.map((h, hIdx) => (
                                        <th key={hIdx} className="p-3.5 border-b border-slate-200 dark:border-slate-700">
                                            {renderInlineFormattedText(h, size, textClassName)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 bg-white dark:bg-slate-900/60">
                                {rows.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className={`p-3.5 ${textClassName || 'text-slate-800 dark:text-slate-200'}`}>
                                                {renderInlineFormattedText(cell, size, textClassName)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
                continue;
            }
        }

        // 2. Headings (supports # through ###### with or without space)
        const headingMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const headingContent = headingMatch[2].trim();
            flushParagraph(`${keyPrefix}-p-before-h${level}-${i}`);

            if (level === 1) {
                elements.push(
                    <h1 key={`${keyPrefix}-h1-${i}`} className={`${s.h1} ${textClassName ? (textClassName.includes('slate-') || textClassName.includes('white') ? 'text-white' : textClassName) : ''}`}>
                        {renderInlineFormattedText(headingContent, size, textClassName)}
                    </h1>
                );
            } else if (level === 2) {
                elements.push(
                    <h2 key={`${keyPrefix}-h2-${i}`} className={`${s.h2} flex items-center gap-2 ${textClassName ? (textClassName.includes('slate-') || textClassName.includes('white') ? 'text-white' : textClassName) : ''}`}>
                        {renderInlineFormattedText(headingContent, size, textClassName)}
                    </h2>
                );
            } else if (level === 3) {
                elements.push(
                    <h3 key={`${keyPrefix}-h3-${i}`} className={`${s.h3} flex items-center gap-2 ${textClassName ? (textClassName.includes('slate-') || textClassName.includes('white') ? 'text-indigo-300' : textClassName) : ''}`}>
                        {renderInlineFormattedText(headingContent, size, textClassName)}
                    </h3>
                );
            } else {
                elements.push(
                    <h4 key={`${keyPrefix}-h${level}-${i}`} className={`text-sm sm:text-base font-bold mt-3.5 mb-1.5 flex items-center gap-2 ${textClassName || 'text-slate-800 dark:text-slate-200'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        {renderInlineFormattedText(headingContent, size, textClassName)}
                    </h4>
                );
            }
            i++;
            continue;
        }

        // 3. Callout Alerts (> [!NOTE], > [!TIP], > [!WARNING], > [!CAUTION])
        if (trimmed.startsWith('> [!')) {
            flushParagraph(`${keyPrefix}-p-before-callout-${i}`);
            const alertTypeMatch = trimmed.match(/^>\s*\[!([A-Z]+)\]\s*(.*)$/i);
            const alertType = (alertTypeMatch ? alertTypeMatch[1] : 'NOTE').toUpperCase();
            let alertContent = (alertTypeMatch && alertTypeMatch[2]) ? alertTypeMatch[2] : '';

            // Consume any subsequent blockquote lines
            i++;
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                alertContent += ' ' + lines[i].trim().replace(/^>\s*/, '');
                i++;
            }

            const alertStyles = {
                NOTE: {
                    border: 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200',
                    icon: 'ℹ️',
                    label: 'Note'
                },
                TIP: {
                    border: 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200',
                    icon: '💡',
                    label: 'Pro Tip'
                },
                WARNING: {
                    border: 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200',
                    icon: '⚠️',
                    label: 'Warning'
                },
                CAUTION: {
                    border: 'border-rose-500/50 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200',
                    icon: '🚨',
                    label: 'Caution'
                },
                IMPORTANT: {
                    border: 'border-purple-500/50 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200',
                    icon: '📌',
                    label: 'Important'
                }
            };

            const style = alertStyles[alertType] || alertStyles.NOTE;

            elements.push(
                <div key={`${keyPrefix}-alert-${i}`} className={`my-3.5 p-4 rounded-2xl border ${style.border} shadow-sm space-y-1.5`}>
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                        <span>{style.icon}</span>
                        <span>{style.label}</span>
                    </div>
                    <div className={`text-xs sm:text-sm leading-relaxed font-normal`}>
                        {renderInlineFormattedText(alertContent, size, textClassName)}
                    </div>
                </div>
            );
            continue;
        }

        // Standard blockquotes
        if (trimmed.startsWith('> ')) {
            flushParagraph(`${keyPrefix}-p-before-quote-${i}`);
            elements.push(
                <blockquote key={`${keyPrefix}-quote-${i}`} className="my-2.5 border-l-4 border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/40 px-4 py-2.5 rounded-r-xl text-xs sm:text-sm italic text-indigo-900 dark:text-indigo-200">
                    {renderInlineFormattedText(trimmed.slice(2), size, textClassName)}
                </blockquote>
            );
            i++;
            continue;
        }

        // Bullet lists (- or * )
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            flushParagraph(`${keyPrefix}-p-before-li-${i}`);
            elements.push(
                <li key={`${keyPrefix}-li-${i}`} className={`ml-4 list-disc ${s.li} ${textClassName || 'text-slate-800 dark:text-slate-200'}`}>
                    {renderInlineFormattedText(trimmed.slice(2), size, textClassName)}
                </li>
            );
            i++;
            continue;
        }

        // Numbered lists (1. 2. etc.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
            flushParagraph(`${keyPrefix}-p-before-num-${i}`);
            elements.push(
                <div key={`${keyPrefix}-num-${i}`} className={`ml-3 flex items-start gap-2.5 ${s.li} ${textClassName || 'text-slate-800 dark:text-slate-200'}`}>
                    <span className="font-extrabold text-indigo-500 dark:text-indigo-400 shrink-0">{numMatch[1]}.</span>
                    <span className="flex-1">{renderInlineFormattedText(numMatch[2], size, textClassName)}</span>
                </div>
            );
            i++;
            continue;
        }

        // Regular line content
        currentParagraph.push(line);
        i++;
    }

    flushParagraph(`${keyPrefix}-p-final`);
    return elements;
}

/**
 * Handles inline formatting:
 * 1. Inline math `$ ... $` and `\( ... \)`
 * 2. Inline code `` `...` ``
 * 3. Bold `**...**`
 * 4. Italic `*...*`
 */
function renderInlineFormattedText(rawText, size = 'base', textClassName = '') {
    if (!rawText) return null;

    // Tokenize inline code (`...`), inline math ($...$ or \(...\)), and standalone LaTeX commands (\rightleftharpoons, \Delta, etc.)
    const tokenRegex = /(?:`([^`\n]+)`)|(?:\$([^\$\n]+?)\$)|(?:\\\(([\s\S]*?)\\\))|(?:(\\(?:rightleftharpoons|leftarrow|rightarrow|Leftarrow|Rightarrow|Leftrightarrow|Delta|nabla|infty|alpha|beta|gamma|theta|lambda|mu|pi|sigma|omega|times|pm|approx|neq|le|ge|frac\{[^{}]*\}\{[^{}]*\}|ce\{[^{}]*\})))/g;
    const tokens = [];
    let lastIdx = 0;
    let match;

    while ((match = tokenRegex.exec(rawText)) !== null) {
        if (match.index > lastIdx) {
            tokens.push({
                type: 'text',
                content: rawText.slice(lastIdx, match.index)
            });
        }

        if (match[1] !== undefined) {
            // Inline code
            tokens.push({
                type: 'inline_code',
                content: match[1]
            });
        } else if (match[2] !== undefined || match[3] !== undefined || match[4] !== undefined) {
            // Inline Math
            const mathExpr = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : match[4]);
            tokens.push({
                type: 'inline_math',
                content: mathExpr
            });
        }

        lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < rawText.length) {
        tokens.push({
            type: 'text',
            content: rawText.slice(lastIdx)
        });
    }

    return tokens.map((token, tIdx) => {
        if (token.type === 'inline_code') {
            return (
                <code
                    key={`ic-${tIdx}`}
                    className="px-1.5 py-0.5 mx-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-cyan-300 font-mono text-[12px] sm:text-[13px] rounded border border-slate-300/80 dark:border-slate-700 font-semibold select-all"
                >
                    {token.content}
                </code>
            );
        }

        if (token.type === 'inline_math') {
            const mathHtml = renderKatexToString(token.content, false);
            return (
                <span
                    key={`im-${tIdx}`}
                    className={`inline-math px-0.5 select-all align-baseline font-normal ${textClassName || 'text-slate-900 dark:text-slate-100'}`}
                    dangerouslySetInnerHTML={{ __html: mathHtml }}
                />
            );
        }

        // Render basic bold, italic, links, and chemistry subscripts within pure text segment
        return renderSimpleTypography(token.content, `st-${tIdx}`, textClassName);
    });
}

/**
 * Handles basic markdown bold (**text**), italic (*text*), links ([label](url)), 
 * chemical subscripts (e.g. N_2, H_2, K_c, CO_2), and intra-paragraph line breaks.
 */
function renderSimpleTypography(text, keyPrefix, textClassName = '') {
    if (!text) return null;

    const isLightText = textClassName && (
        textClassName.includes('white') || 
        textClassName.includes('slate-1') || 
        textClassName.includes('slate-2') || 
        textClassName.includes('cyan') || 
        textClassName.includes('purple') || 
        textClassName.includes('amber')
    );

    // Handle newlines as <br />
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
        // Handle Links [label](url)
        const linkParts = line.split(/(\[[^\]]+\]\([^)]+\))/g);
        const lineContent = linkParts.map((lPart, lpIdx) => {
            const linkMatch = lPart.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return (
                    <a
                        key={`${keyPrefix}-link-${lIdx}-${lpIdx}`}
                        href={linkMatch[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 underline font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 transition"
                    >
                        {linkMatch[1]}
                    </a>
                );
            }

            // Bold (**...**)
            const boldParts = lPart.split(/(\*\*.*?\*\*)/g);
            return boldParts.map((bPart, bpIdx) => {
                if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length >= 4) {
                    const boldClass = isLightText 
                        ? 'font-extrabold text-white' 
                        : (textClassName ? `font-extrabold ${textClassName}` : 'font-extrabold text-slate-900 dark:text-white');
                    return (
                        <strong key={`${keyPrefix}-b-${lIdx}-${lpIdx}-${bpIdx}`} className={boldClass}>
                            {bPart.slice(2, -2)}
                        </strong>
                    );
                }

                // Italic (*...*)
                const italicParts = bPart.split(/(\*.*?\*)/g);
                return italicParts.map((iPart, ipIdx) => {
                    if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 3) {
                        return (
                            <em key={`${keyPrefix}-i-${lIdx}-${lpIdx}-${bpIdx}-${ipIdx}`} className={`italic ${textClassName || 'text-slate-800 dark:text-slate-200'}`}>
                                {iPart.slice(1, -1)}
                            </em>
                        );
                    }

                    // Chemical / Mathematical Subscripts without explicit dollar signs (e.g. N_2, H_2, K_c, K_p, CO_2)
                    const chemParts = iPart.split(/(\b[A-Z][a-z]?_[0-9a-zA-Z+-]+\b)/g);
                    return chemParts.map((cPart, cpIdx) => {
                        const chemMatch = cPart.match(/^([A-Z][a-z]?)_([0-9a-zA-Z+-]+)$/);
                        if (chemMatch) {
                            return (
                                <span key={`${keyPrefix}-chem-${lIdx}-${lpIdx}-${bpIdx}-${ipIdx}-${cpIdx}`} className="font-serif">
                                    {chemMatch[1]}<sub>{chemMatch[2]}</sub>
                                </span>
                            );
                        }
                        return cPart;
                    });
                });
            });
        });

        return (
            <React.Fragment key={`${keyPrefix}-line-${lIdx}`}>
                {lIdx > 0 && <br />}
                {lineContent}
            </React.Fragment>
        );
    });
}
