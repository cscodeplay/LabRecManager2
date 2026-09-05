'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Robust LaTeX, Physics, Chemistry, and Markdown renderer.
 * Accurately parses:
 * - Block math: `$$...$$` or `\[...\]`
 * - Inline math: `$ ... $` or `\( ... \)`
 * - Chemistry formulas: `$\text{H}_2\text{O}$`, `$\text{CaCO}_3 \rightarrow \text{CaO} + \text{CO}_2$`
 * - Physics equations: `$\vec{F} = m\vec{a}$`, `$E = mc^2$`, `$\lambda = \frac{h}{p}$`
 * - Combinatorics & Calculus: `$nCr = \frac{n!}{r!(n-r)!}$`, `$\int_{a}^{b} f(x)dx$`
 * - Markdown: Headings, Bold, Italic, Code Blocks, Inline Code, Lists, Blockquotes
 */
export default function MathRenderer({
    content = '',
    className = '',
    inline = false,
    textClassName = ''
}) {
    const renderedElements = useMemo(() => {
        if (!content || typeof content !== 'string') return null;

        return parseContent(content, textClassName);
    }, [content, textClassName]);

    if (!content) return null;

    if (inline) {
        return <span className={`math-renderer-inline ${className}`}>{renderedElements}</span>;
    }

    return (
        <div className={`math-renderer ${className}`}>
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
            trust: true,
            macros: {
                "\\ce": "\\text{#1}" // Basic chemistry fallback macro
            }
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
function parseContent(text, textClassName = '') {
    // 1. First tokenize code blocks (```...```) and block math ($$...$$ or \[...\])
    const blockRegex = /(?:```([a-zA-Z0-9_-]*)\n([\s\S]*?)```)|(?:\$\$([\s\S]*?)\$\$)|(?:\\\[([\s\S]*?)\\\])/g;
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
                <div key={`cb-${bIdx}`} className="my-3 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
                    {block.language && (
                        <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                            {block.language}
                        </div>
                    )}
                    <pre className="p-3.5 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                        <code>{block.content}</code>
                    </pre>
                </div>
            );
        }

        if (block.type === 'math_block') {
            const mathHtml = renderKatexToString(block.content, true);
            return (
                <div
                    key={`mb-${bIdx}`}
                    className="my-3.5 px-3 py-2 bg-slate-900/60 dark:bg-slate-900/90 border border-indigo-500/20 rounded-xl overflow-x-auto text-center"
                    dangerouslySetInnerHTML={{ __html: mathHtml }}
                />
            );
        }

        // Standard text with paragraphs, headings, bullet lists, and inline math
        return renderTextParagraphs(block.content, `txt-${bIdx}`, textClassName);
    });
}

/**
 * Handles line-by-line markdown (headings, lists, blockquotes, paragraphs) with inline math.
 */
function renderTextParagraphs(textChunk, keyPrefix, textClassName = '') {
    const lines = textChunk.split('\n');
    const elements = [];
    let currentParagraph = [];

    const flushParagraph = (pKey) => {
        if (currentParagraph.length > 0) {
            const joinedText = currentParagraph.join(' ');
            if (joinedText.trim()) {
                elements.push(
                    <p key={pKey} className={`my-1.5 leading-relaxed ${textClassName}`}>
                        {renderInlineFormattedText(joinedText)}
                    </p>
                );
            }
            currentParagraph = [];
        }
    };

    lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        if (!trimmed) {
            flushParagraph(`${keyPrefix}-p-${lineIdx}`);
            return;
        }

        // Headings
        if (trimmed.startsWith('### ')) {
            flushParagraph(`${keyPrefix}-p-before-h3-${lineIdx}`);
            elements.push(
                <h3 key={`${keyPrefix}-h3-${lineIdx}`} className="text-sm font-bold text-slate-900 dark:text-white mt-4 mb-2 flex items-center gap-1.5">
                    {renderInlineFormattedText(trimmed.slice(4))}
                </h3>
            );
            return;
        }

        if (trimmed.startsWith('## ')) {
            flushParagraph(`${keyPrefix}-p-before-h2-${lineIdx}`);
            elements.push(
                <h2 key={`${keyPrefix}-h2-${lineIdx}`} className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 flex items-center gap-2">
                    {renderInlineFormattedText(trimmed.slice(3))}
                </h2>
            );
            return;
        }

        if (trimmed.startsWith('# ')) {
            flushParagraph(`${keyPrefix}-p-before-h1-${lineIdx}`);
            elements.push(
                <h1 key={`${keyPrefix}-h1-${lineIdx}`} className="text-lg font-extrabold text-slate-900 dark:text-white mt-5 mb-2.5">
                    {renderInlineFormattedText(trimmed.slice(2))}
                </h1>
            );
            return;
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
            flushParagraph(`${keyPrefix}-p-before-quote-${lineIdx}`);
            elements.push(
                <blockquote key={`${keyPrefix}-quote-${lineIdx}`} className="my-2 border-l-4 border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/40 px-3.5 py-2 rounded-r-lg text-xs italic text-indigo-900 dark:text-indigo-200">
                    {renderInlineFormattedText(trimmed.slice(2))}
                </blockquote>
            );
            return;
        }

        // Bullet lists (- or * )
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            flushParagraph(`${keyPrefix}-p-before-li-${lineIdx}`);
            elements.push(
                <li key={`${keyPrefix}-li-${lineIdx}`} className={`ml-4 list-disc text-xs leading-relaxed my-0.5 ${textClassName}`}>
                    {renderInlineFormattedText(trimmed.slice(2))}
                </li>
            );
            return;
        }

        // Numbered lists (1. 2. etc.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
            flushParagraph(`${keyPrefix}-p-before-num-${lineIdx}`);
            elements.push(
                <div key={`${keyPrefix}-num-${lineIdx}`} className={`ml-3 flex items-start gap-2 text-xs leading-relaxed my-0.5 ${textClassName}`}>
                    <span className="font-bold text-indigo-500 shrink-0">{numMatch[1]}.</span>
                    <span>{renderInlineFormattedText(numMatch[2])}</span>
                </div>
            );
            return;
        }

        // Regular line content
        currentParagraph.push(line);
    });

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
function renderInlineFormattedText(rawText) {
    if (!rawText) return null;

    // Tokenize inline code (`...`) and inline math ($...$ or \(...\))
    const tokenRegex = /(?:`([^`\n]+)`)|(?:\$([^\$\n]+?)\$)|(?:\\\(([\s\S]*?)\\\))/g;
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
        } else if (match[2] !== undefined || match[3] !== undefined) {
            // Inline Math
            const mathExpr = match[2] !== undefined ? match[2] : match[3];
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
                    className="px-1.5 py-0.5 mx-0.5 bg-slate-800 text-cyan-300 font-mono text-[11px] rounded border border-slate-700 font-medium select-all"
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
                    className="inline-math px-0.5 select-all"
                    dangerouslySetInnerHTML={{ __html: mathHtml }}
                />
            );
        }

        // Render basic bold & italic within pure text segment
        return renderSimpleTypography(token.content, `st-${tIdx}`);
    });
}

/**
 * Handles basic markdown bold (**text**) and italic (*text*).
 */
function renderSimpleTypography(text, keyPrefix) {
    if (!text) return null;

    // Bold (**...**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
                <strong key={`${keyPrefix}-b-${pIdx}`} className="font-bold text-slate-900 dark:text-slate-100">
                    {part.slice(2, -2)}
                </strong>
            );
        }

        // Italic (*...*)
        const italicParts = part.split(/(\*.*?\*)/g);
        return italicParts.map((subPart, sIdx) => {
            if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length >= 3) {
                return (
                    <em key={`${keyPrefix}-i-${pIdx}-${sIdx}`} className="italic">
                        {subPart.slice(1, -1)}
                    </em>
                );
            }
            return subPart;
        });
    });
}
