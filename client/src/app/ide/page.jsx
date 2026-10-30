'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IDEPageRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/practice-ide');
    }, [router]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400">
            <p className="text-sm font-medium">Opening Code Practice Studio...</p>
        </div>
    );
}
