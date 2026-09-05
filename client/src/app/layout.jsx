import './globals.css';
import 'katex/dist/katex.min.css';
import { Inter } from 'next/font/google';

import { Toaster } from 'react-hot-toast';
import { Providers } from '@/components/Providers';
import FloatingWhiteboardIcon from '@/components/FloatingWhiteboardIcon';

const inter = Inter({ subsets: ['latin'] });


export const metadata = {
    title: 'ULRMS | यूनिफाइड लैब रिकॉर्ड प्रबंधन प्रणाली',
    description: 'Unified Lab Record Management System for Indian schools with multi-language support',
    keywords: 'lab, school, assignments, grading, viva, India, education',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <Providers>
                    {children}
                    <FloatingWhiteboardIcon />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: 'rgba(15, 23, 42, 0.92)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                color: '#f8fafc',
                                border: '1px solid rgba(51, 65, 85, 0.8)',
                                borderRadius: '16px',
                                padding: '12px 18px',
                                fontSize: '13.5px',
                                fontWeight: '500',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
                            },
                            success: {
                                duration: 3500,
                                style: {
                                    background: 'rgba(15, 23, 42, 0.94)',
                                    border: '1px solid rgba(16, 185, 129, 0.5)',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.25)',
                                },
                                iconTheme: {
                                    primary: '#10b981',
                                    secondary: '#0f172a',
                                },
                            },
                            error: {
                                duration: 4500,
                                style: {
                                    background: 'rgba(15, 23, 42, 0.94)',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 0 20px rgba(239, 68, 68, 0.25)',
                                },
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#0f172a',
                                },
                            },
                            loading: {
                                style: {
                                    background: 'rgba(15, 23, 42, 0.94)',
                                    border: '1px solid rgba(99, 102, 241, 0.5)',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.25)',
                                },
                                iconTheme: {
                                    primary: '#6366f1',
                                    secondary: '#0f172a',
                                },
                            },
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}
