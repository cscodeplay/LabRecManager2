/**
 * Client-Side IndexedDB Storage Utility for PDF Studio
 * Enables full session persistence across page refreshes for large multi-page PDF files,
 * pages metadata, and in-progress annotations without localStorage quota limits.
 */

const DB_NAME = 'pdf_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const SESSION_KEY = 'active_pdf_session';

function openPdfStudioDB() {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            return reject(new Error('IndexedDB not supported in this environment'));
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Save active PDF Studio session (source files buffers, page metadata, annotations, watermark)
 */
export async function saveStudioSession({ sourceDocs = [], pages = [], annotations = [], watermark = null, scrollZoom = 1.0 }) {
    if (typeof window === 'undefined' || !sourceDocs || sourceDocs.length === 0) return;

    try {
        const db = await openPdfStudioDB();

        // Convert sourceDocs to serializable objects with ArrayBuffer
        const serializedDocs = await Promise.all(
            sourceDocs.map(async (doc) => {
                let buffer = null;
                if (doc.file instanceof File || doc.file instanceof Blob) {
                    buffer = await doc.file.arrayBuffer();
                } else if (doc.buffer instanceof ArrayBuffer) {
                    buffer = doc.buffer;
                }

                return {
                    id: doc.id,
                    name: doc.name || 'document.pdf',
                    size: doc.size || (buffer ? (buffer.byteLength / (1024 * 1024)).toFixed(2) : '1.0'),
                    pageCount: doc.pageCount || 1,
                    buffer
                };
            })
        );

        const sessionData = {
            id: SESSION_KEY,
            updatedAt: Date.now(),
            docs: serializedDocs,
            pages: pages || [],
            annotations: annotations || [],
            watermark: watermark || null,
            scrollZoom: scrollZoom || 1.0
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(sessionData, SESSION_KEY);

            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.warn('[PDF Studio Storage] Failed to persist session to IndexedDB:', err);
    }
}

/**
 * Load active session from IndexedDB if present
 */
export async function loadStudioSession() {
    if (typeof window === 'undefined') return null;

    try {
        const db = await openPdfStudioDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(SESSION_KEY);

            req.onsuccess = () => {
                const session = req.result;
                if (!session || !session.docs || session.docs.length === 0) {
                    return resolve(null);
                }

                // Convert buffers back to File instances
                const rehydratedDocs = session.docs.map((d) => {
                    let file = null;
                    if (d.buffer) {
                        const blob = new Blob([d.buffer], { type: 'application/pdf' });
                        file = new File([blob], d.name, { type: 'application/pdf' });
                    }
                    return {
                        id: d.id,
                        file,
                        name: d.name,
                        size: d.size,
                        pageCount: d.pageCount,
                        buffer: d.buffer
                    };
                });

                resolve({
                    ...session,
                    sourceDocs: rehydratedDocs
                });
            };

            req.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.warn('[PDF Studio Storage] Failed to retrieve session from IndexedDB:', err);
        return null;
    }
}

/**
 * Clear the persisted session from IndexedDB (e.g. on New Document or Clear)
 */
export async function clearStudioSession() {
    if (typeof window === 'undefined') return;

    try {
        const db = await openPdfStudioDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(SESSION_KEY);

            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.warn('[PDF Studio Storage] Failed to clear session from IndexedDB:', err);
    }
}
