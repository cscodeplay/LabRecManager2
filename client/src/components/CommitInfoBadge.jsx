'use client';

import React, { useState, useEffect } from 'react';
import { Info, GitCommit, Copy, Check, ExternalLink, Calendar, User, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';
import { dashboardAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function CommitInfoBadge() {
    const { user, _hasHydrated } = useAuthStore();

    const [commitDetails, setCommitDetails] = useState({
        hash: process.env.NEXT_PUBLIC_COMMIT_HASH || '',
        fullHash: process.env.NEXT_PUBLIC_COMMIT_FULL_HASH || '',
        time: process.env.NEXT_PUBLIC_COMMIT_TIME || '',
        message: process.env.NEXT_PUBLIC_COMMIT_MESSAGE || '',
        author: process.env.NEXT_PUBLIC_COMMIT_AUTHOR || '',
        branch: process.env.NEXT_PUBLIC_COMMIT_BRANCH || 'master',
    });
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        // Fetch server-reported git commit if available to ensure live freshness
        dashboardAPI.getHealth()
            .then(res => {
                const liveGit = res.data?.data?.gitCommit;
                if (liveGit && liveGit.shortHash) {
                    setCommitDetails(prev => ({
                        hash: liveGit.shortHash || prev.hash,
                        fullHash: liveGit.hash || prev.fullHash,
                        time: liveGit.date || prev.time,
                        message: liveGit.message || prev.message,
                        author: liveGit.author || prev.author,
                        branch: liveGit.branch || prev.branch,
                    }));
                }
            })
            .catch(() => {
                // Silently keep build-time env values
            });
    }, []);

    // Do not display commit hash for other users except for admin
    if (!user || user.role !== 'admin') {
        return null;
    }

    const shortHash = commitDetails.hash || 'dev';

    const handleCopy = (e) => {
        e.stopPropagation();
        const copyText = commitDetails.fullHash || commitDetails.hash;
        if (typeof navigator !== 'undefined' && copyText) {
            navigator.clipboard.writeText(copyText);
            setCopied(true);
            toast.success('Commit hash copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div 
            className="relative inline-flex items-center"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Upper Top Corner Pill */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/90 dark:hover:bg-slate-700/90 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-mono transition-all shadow-xs cursor-pointer select-none group">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{shortHash}</span>

                {/* 'i' Info Symbol */}
                <button
                    type="button"
                    aria-label="Commit details"
                    className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors -mr-0.5"
                    onClick={handleCopy}
                >
                    <Info className="w-2.5 h-2.5" />
                </button>
            </div>

            {/* Hover Tooltip / Detail Card */}
            {isHovered && (
                <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 p-3.5 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl z-[999] animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                            <GitCommit className="w-3.5 h-3.5" />
                            <span>Commit Details</span>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Copy full hash"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                    <span className="text-emerald-400 font-sans">Copied</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-2.5 h-2.5" />
                                    <span>{shortHash}</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="space-y-2 text-xs">
                        {/* Commit Message */}
                        {commitDetails.message ? (
                            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-[11px] font-medium text-slate-200 leading-snug">
                                {commitDetails.message}
                            </div>
                        ) : null}

                        {/* Author */}
                        {commitDetails.author ? (
                            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                                <User className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="text-slate-400">Author:</span>
                                <span className="font-medium text-slate-200">{commitDetails.author}</span>
                            </div>
                        ) : null}

                        {/* Branch */}
                        {commitDetails.branch ? (
                            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                                <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span className="text-slate-400">Branch:</span>
                                <span className="font-mono text-indigo-300 font-semibold">{commitDetails.branch}</span>
                            </div>
                        ) : null}

                        {/* Date / Time */}
                        {commitDetails.time ? (
                            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                                <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="text-slate-400">Date:</span>
                                <span className="text-slate-300 font-mono text-[10px]">{commitDetails.time}</span>
                            </div>
                        ) : null}

                        {/* Full Hash */}
                        {commitDetails.fullHash ? (
                            <div className="pt-1 border-t border-slate-800/80">
                                <div className="text-[10px] text-slate-400 font-mono break-all leading-tight">
                                    {commitDetails.fullHash}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
