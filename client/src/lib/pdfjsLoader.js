'use client';

let cachedPdfJs = null;
let loadPromise = null;

export async function getPdfJs() {
    if (typeof window === 'undefined') return null;
    if (cachedPdfJs) return cachedPdfJs;
    if (window.pdfjsLib) {
        cachedPdfJs = window.pdfjsLib;
        if (cachedPdfJs?.GlobalWorkerOptions && !cachedPdfJs.GlobalWorkerOptions.workerSrc) {
            cachedPdfJs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
        }
        return cachedPdfJs;
    }

    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        // Strategy 1: Load /pdfjs/pdf.min.js via client-side script tag
        try {
            await new Promise((resolve, reject) => {
                if (window.pdfjsLib) return resolve();
                const existing = document.querySelector('script[src*="pdf.min.js"]');
                if (existing) {
                    if (window.pdfjsLib) return resolve();
                    // Poll briefly in case script already finished loading
                    let checks = 0;
                    const interval = setInterval(() => {
                        checks++;
                        if (window.pdfjsLib) {
                            clearInterval(interval);
                            resolve();
                        } else if (checks > 20) {
                            clearInterval(interval);
                            resolve(); // proceed to next check
                        }
                    }, 50);
                    existing.addEventListener('load', () => {
                        clearInterval(interval);
                        resolve();
                    });
                    existing.addEventListener('error', (e) => {
                        clearInterval(interval);
                        reject(e);
                    });
                    return;
                }
                const script = document.createElement('script');
                script.src = '/pdfjs/pdf.min.js';
                script.async = true;
                script.onload = () => resolve();
                script.onerror = (e) => reject(e);
                document.head.appendChild(script);
            });

            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
                cachedPdfJs = window.pdfjsLib;
                return cachedPdfJs;
            }
        } catch (scriptErr) {
            console.warn('[pdfjsLoader] Local /pdfjs/pdf.min.js load failed, trying CDN:', scriptErr);
        }

        // Strategy 2: Bundled / CDN fallback
        try {
            await new Promise((resolve, reject) => {
                if (window.pdfjsLib) return resolve();
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.async = true;
                script.onload = () => resolve();
                script.onerror = reject;
                document.head.appendChild(script);
            });
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                cachedPdfJs = window.pdfjsLib;
                return cachedPdfJs;
            }
        } catch (cdnErr) {
            console.error('[pdfjsLoader] All PDF.js loading strategies failed:', cdnErr);
        }

        return window.pdfjsLib || null;
    })();

    return loadPromise;
}
