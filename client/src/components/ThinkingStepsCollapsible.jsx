'use client';

import React from "react";
import { Sparkles, ChevronRight } from "lucide-react";

export default function ThinkingStepsCollapsible({ thinkContent, defaultOpen = false }) {
    if (!thinkContent || typeof thinkContent !== "string") return null;

    const raw = thinkContent.replace(/<\/?think>/g, "").trim();
    if (!raw) return null;

    // Parse enumerated steps
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const steps = [];
    let currentStep = null;

    // Preamble filters (lines that are headers, conversational chatter, or monologue transitions)
    const isPreamble = (text) => /^(?:i\s*need\s*to:?|here\s*(?:are|is)\s*(?:the\s*)?steps:?|plan:?|approach:?|the\s*user\s*(?:is\s*asking|wants|requested):?|let['’]s\s*see:?|thinking:?)$/i.test(text.trim());

    lines.forEach(line => {
        if (isPreamble(line)) return;

        // Matches "1. ...", "Step 1: ...", "1) ...", "[1] ...", "- ...", "• ..."
        const match = line.match(/^(?:(?:Step\s*)?(\d+)[\.:\)\-\]]|\*|\-|\u2022)\s*(.*)/i);
        if (match) {
            const stepText = (match[2] || '').trim();
            if (!stepText || isPreamble(stepText)) return;
            if (currentStep) steps.push(currentStep);
            currentStep = {
                number: steps.length + 1,
                text: stepText
            };
        } else if (currentStep) {
            // Append continuation line to current step
            currentStep.text += " " + line;
        } else if (line.length > 15 && !isPreamble(line)) {
            // Only create an un-numbered step if it's a substantive sentence
            currentStep = {
                number: steps.length + 1,
                text: line
            };
        }
    });
    if (currentStep && currentStep.text.length > 3) {
        steps.push(currentStep);
    }

    if (steps.length === 0) {
        // Fallback: split by sentences if raw is a single block
        const sentences = raw.split(/(?<=[.!?])\s+/).filter(s => s.length > 10 && !isPreamble(s));
        if (sentences.length > 0) {
            sentences.slice(0, 5).forEach((s, idx) => {
                steps.push({ number: idx + 1, text: s });
            });
        } else {
            steps.push({ number: 1, text: raw.substring(0, 200) });
        }
    }

    return (
        <details
            open={defaultOpen}
            className="mb-3 group border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-slate-900/90 dark:via-slate-900 dark:to-indigo-950/40 shadow-xs overflow-hidden transition-all duration-200 not-prose"
        >
            <summary className="px-3.5 py-2 text-[11.5px] font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-950/60 flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    </div>
                    <span className="tracking-tight">Thinking Process</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/90 text-indigo-700 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-800">
                        {steps.length} {steps.length === 1 ? "Step" : "Steps"}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-indigo-500 dark:text-indigo-400">
                    <span className="group-open:hidden">View reasoning</span>
                    <span className="hidden group-open:inline">Hide</span>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-90" />
                </div>
            </summary>

            <div className="px-3.5 pt-2.5 pb-3 border-t border-indigo-100 dark:border-indigo-900/50 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xs">
                <ol className="relative border-l border-indigo-200 dark:border-indigo-900 ml-2.5 space-y-2.5 my-1">
                    {steps.map((s, idx) => (
                        <li key={idx} className="relative pl-5 text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                            <span className="absolute -left-[11px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[9.5px] font-extrabold text-white shadow-2xs ring-2 ring-white dark:ring-slate-900">
                                {s.number}
                            </span>
                            <div className="font-normal text-[11.5px]">
                                {s.text}
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </details>
    );
}
