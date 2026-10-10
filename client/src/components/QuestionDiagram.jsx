'use client';

import React, { useState } from 'react';
import { Maximize2, X, Eye } from 'lucide-react';

/**
 * QuestionDiagram Component
 * Renders pin-sharp, mathematically crisp vector diagrams (inline SVG)
 * or high-resolution diagram URLs with full-screen zoom capability.
 */
export default function QuestionDiagram({
    diagramSvg = null,
    diagramUrl = null,
    title = 'Question Diagram',
    className = '',
    compact = false
}) {
    const [isZoomed, setIsZoomed] = useState(false);

    const hasSvg = Boolean(diagramSvg && typeof diagramSvg === 'string' && diagramSvg.trim().startsWith('<svg'));
    const hasUrl = Boolean(diagramUrl && typeof diagramUrl === 'string' && diagramUrl.trim().length > 0);

    if (!hasSvg && !hasUrl) return null;

    // Sanitize SVG string
    const cleanSvg = hasSvg
        ? diagramSvg
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .trim()
        : null;

    return (
        <div className={`question-diagram-wrapper my-3 ${className}`}>
            <div className="relative group inline-block w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-3 shadow-xs transition hover:border-primary-500/50">
                {/* Badge & Zoom Button */}
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                        {hasSvg ? 'Crisp Vector Diagram' : 'Diagram'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsZoomed(true)}
                        className="flex items-center gap-1 text-primary-600 hover:text-primary-500 dark:text-primary-400 font-semibold transition"
                        title="Click to zoom diagram"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Zoom</span>
                    </button>
                </div>

                {/* Diagram Body */}
                <div
                    onClick={() => setIsZoomed(true)}
                    className="cursor-zoom-in flex items-center justify-center min-h-[120px] max-h-64 overflow-hidden rounded-xl bg-white dark:bg-slate-950 p-2.5 transition"
                >
                    {hasSvg ? (
                        <div
                            className="w-full flex justify-center items-center [&_svg]:max-h-56 [&_svg]:w-auto [&_svg]:max-w-full [&_svg]:text-slate-900 dark:[&_svg]:text-white [&_text]:font-sans"
                            dangerouslySetInnerHTML={{ __html: cleanSvg }}
                        />
                    ) : (
                        <img
                            src={diagramUrl}
                            alt={title}
                            className="max-h-56 w-auto max-w-full object-contain rounded-lg shadow-xs"
                            loading="lazy"
                        />
                    )}
                </div>
            </div>

            {/* Full-Screen Zoom Modal */}
            {isZoomed && (
                <div
                    className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fadeIn"
                    onClick={() => setIsZoomed(false)}
                >
                    <div
                        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Eye className="w-5 h-5 text-primary-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                    {title || 'Question Diagram'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsZoomed(false)}
                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl min-h-[300px]">
                            {hasSvg ? (
                                <div
                                    className="w-full flex justify-center items-center [&_svg]:max-h-[65vh] [&_svg]:w-auto [&_svg]:max-w-full"
                                    dangerouslySetInnerHTML={{ __html: cleanSvg }}
                                />
                            ) : (
                                <img
                                    src={diagramUrl}
                                    alt={title}
                                    className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                                />
                            )}
                        </div>

                        <div className="text-center text-xs text-slate-400">
                            Vector-rendered graphics remain 100% crisp at any zoom level. Click outside or Esc to close.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Standard Crisp Vector Diagram Presets for Academic Exams (GATE, JEE, Physics, Architecture)
 */
export const DIAGRAM_PRESETS = [
    {
        id: 'cpu_pipeline',
        label: '5-Stage CPU Pipeline',
        category: 'Computer Science Architecture',
        svg: `<svg viewBox="0 0 520 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradStage" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0.25" />
    </linearGradient>
  </defs>
  <rect x="10" y="30" width="85" height="60" rx="8" fill="url(#gradStage)" stroke="#6366f1" stroke-width="2"/>
  <text x="52" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#6366f1">IF</text>
  <path d="M 95 60 L 115 60" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
  
  <rect x="115" y="30" width="85" height="60" rx="8" fill="url(#gradStage)" stroke="#6366f1" stroke-width="2"/>
  <text x="157" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#6366f1">ID/RF</text>
  <path d="M 200 60 L 220 60" stroke="#94a3b8" stroke-width="2"/>
  
  <rect x="220" y="30" width="85" height="60" rx="8" fill="url(#gradStage)" stroke="#6366f1" stroke-width="2"/>
  <text x="262" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#6366f1">EX/ALU</text>
  <path d="M 305 60 L 325 60" stroke="#94a3b8" stroke-width="2"/>
  
  <rect x="325" y="30" width="85" height="60" rx="8" fill="url(#gradStage)" stroke="#6366f1" stroke-width="2"/>
  <text x="367" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#6366f1">MEM</text>
  <path d="M 410 60 L 430 60" stroke="#94a3b8" stroke-width="2"/>
  
  <rect x="430" y="30" width="80" height="60" rx="8" fill="url(#gradStage)" stroke="#6366f1" stroke-width="2"/>
  <text x="470" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#6366f1">WB</text>
</svg>`
    },
    {
        id: 'cache_hierarchy',
        label: '2-Level Cache Hierarchy',
        category: 'Computer Science Architecture',
        svg: `<svg viewBox="0 0 450 140" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="45" width="70" height="50" rx="6" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2"/>
  <text x="55" y="75" text-anchor="middle" font-size="13" font-weight="bold" fill="#312e81">CPU</text>
  
  <line x1="90" y1="70" x2="130" y2="70" stroke="#64748b" stroke-width="2"/>
  
  <rect x="130" y="35" width="85" height="70" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="172" y="68" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e3a8a">L1 Cache</text>
  <text x="172" y="85" text-anchor="middle" font-size="10" fill="#475569">32 KB</text>
  
  <line x1="215" y1="70" x2="255" y2="70" stroke="#64748b" stroke-width="2"/>
  
  <rect x="255" y="25" width="95" height="90" rx="6" fill="#ccfbf1" stroke="#0d9488" stroke-width="2"/>
  <text x="302" y="68" text-anchor="middle" font-size="12" font-weight="bold" fill="#134e4a">L2 Cache</text>
  <text x="302" y="85" text-anchor="middle" font-size="10" fill="#475569">512 KB</text>
  
  <line x1="350" y1="70" x2="385" y2="70" stroke="#64748b" stroke-width="2"/>
  
  <rect x="385" y="15" width="55" height="110" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="412" y="75" text-anchor="middle" font-size="11" font-weight="bold" fill="#78350f">RAM</text>
</svg>`
    },
    {
        id: 'inclined_plane',
        label: 'Rough Inclined Plane (Rolling Motion)',
        category: 'Physics Mechanics (JEE)',
        svg: `<svg viewBox="0 0 380 180" xmlns="http://www.w3.org/2000/svg">
  <polygon points="40,150 340,150 340,30" fill="#f1f5f9" stroke="#334155" stroke-width="2.5"/>
  <path d="M 80,150 A 40 40 0 0 0 74,136" fill="none" stroke="#2563eb" stroke-width="2"/>
  <text x="95" y="145" font-size="14" font-weight="bold" fill="#2563eb">θ</text>
  <text x="355" y="95" font-size="14" font-weight="bold" fill="#334155">h</text>
  <circle cx="240" cy="62" r="24" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>
  <circle cx="240" cy="62" r="3" fill="#ea580c"/>
  <line x1="240" y1="62" x2="240" y2="105" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="248" y="100" font-size="12" font-weight="bold" fill="#dc2626">Mg</text>
  <line x1="240" y1="62" x2="220" y2="35" stroke="#16a34a" stroke-width="2"/>
  <text x="208" y="32" font-size="12" font-weight="bold" fill="#16a34a">N</text>
</svg>`
    },
    {
        id: 'logic_circuit',
        label: 'Logic Circuit (AND + XOR)',
        category: 'Digital Logic (GATE)',
        svg: `<svg viewBox="0 0 380 140" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="40" x2="80" y2="40" stroke="#334155" stroke-width="2.5"/>
  <text x="10" y="44" font-size="14" font-weight="bold" fill="#334155">A</text>
  <line x1="20" y1="75" x2="80" y2="75" stroke="#334155" stroke-width="2.5"/>
  <text x="10" y="79" font-size="14" font-weight="bold" fill="#334155">B</text>
  
  <path d="M 80,30 L 110,30 A 30 30 0 0 1 110,85 L 80,85 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/>
  <text x="96" y="62" font-size="11" font-weight="bold" fill="#0369a1">AND</text>
  
  <line x1="140" y1="57" x2="200" y2="57" stroke="#334155" stroke-width="2.5"/>
  
  <line x1="20" y1="110" x2="200" y2="110" stroke="#334155" stroke-width="2.5"/>
  <text x="10" y="114" font-size="14" font-weight="bold" fill="#334155">C</text>
  
  <path d="M 200,45 Q 212,83 200,125 Q 240,125 260,85 Q 240,45 200,45" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
  <text x="218" y="90" font-size="11" font-weight="bold" fill="#b45309">OR</text>
  
  <line x1="260" y1="85" x2="330" y2="85" stroke="#334155" stroke-width="2.5"/>
  <text x="340" y="90" font-size="14" font-weight="bold" fill="#16a34a">Y</text>
</svg>`
    }
];
