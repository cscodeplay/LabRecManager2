'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RecordingsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/documents?tab=recordings');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-slate-500">
            <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Redirecting to Documents Recordings...</span>
            </div>
        </div>
    );
}
