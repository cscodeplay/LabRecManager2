'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Barcode, Download, Copy, Printer, Search, Package, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { labsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function BarcodeGeneratorPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [manualSerials, setManualSerials] = useState('');
    const barcodeRefs = useRef({});

    useEffect(() => {
        if (_hasHydrated && !isAuthenticated) {
            router.push('/login');
        }
    }, [_hasHydrated, isAuthenticated, router]);

    useEffect(() => {
        if (user?.schoolId) {
            loadItems();
        }
    }, [user?.schoolId]);

    const loadItems = async () => {
        try {
            // Load all inventory items
            const res = await labsAPI.listAllItems();
            setItems(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    const generateBarcode = (serial, elementId) => {
        if (typeof window !== 'undefined' && barcodeRefs.current[elementId]) {
            import('jsbarcode').then(JsBarcode => {
                JsBarcode.default(barcodeRefs.current[elementId], serial, {
                    format: 'CODE128',
                    width: 2,
                    height: 60,
                    displayValue: true,
                    fontSize: 14,
                    margin: 10
                });
            });
        }
    };

    const toggleSelectItem = (item) => {
        setSelectedItems(prev => {
            const exists = prev.find(i => i.id === item.id);
            if (exists) {
                return prev.filter(i => i.id !== item.id);
            } else {
                return [...prev, item];
            }
        });
    };

    const addManualSerials = () => {
        const serials = manualSerials.split('\n').map(s => s.trim()).filter(s => s);
        const newItems = serials.map((serial, idx) => ({
            id: `manual-${Date.now()}-${idx}`,
            serialNo: serial,
            itemNumber: serial,
            isManual: true
        }));
        setSelectedItems(prev => [...prev, ...newItems]);
        setManualSerials('');
        toast.success(`Added ${newItems.length} serial numbers`);
    };

    const downloadBarcode = async (serial, elementId) => {
        const canvas = barcodeRefs.current[elementId];
        if (canvas) {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `barcode-${serial}.png`;
            a.click();
            toast.success('Barcode downloaded');
        }
    };

    const copyBarcode = async (serial, elementId) => {
        const canvas = barcodeRefs.current[elementId];
        if (canvas) {
            try {
                canvas.toBlob(async (blob) => {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast.success('Barcode copied to clipboard');
                });
            } catch (err) {
                toast.error('Failed to copy barcode');
            }
        }
    };

    const printBarcodes = () => {
        const printWindow = window.open('', '_blank');
        const barcodeHtml = selectedItems.map((item, idx) => {
            const canvas = barcodeRefs.current[`barcode-${item.id}`];
            const dataUrl = canvas ? canvas.toDataURL('image/png') : '';
            return `
                <div style="display: inline-block; margin: 10px; padding: 10px; border: 1px dashed #ccc; text-align: center;">
                    <img src="${dataUrl}" alt="${item.serialNo || item.itemNumber}" />
                    <div style="font-size: 10px; color: #666;">${item.itemNumber || ''}</div>
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
            <head><title>Barcode Labels</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                @page { margin: 0.5in; }
                @media print { .no-print { display: none; } }
            </style>
            </head>
            <body>
                <h2 class="no-print">Barcode Labels - ${selectedItems.length} items</h2>
                <div style="display: flex; flex-wrap: wrap;">
                    ${barcodeHtml}
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredItems = items.filter(item =>
        item.serialNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        // Generate barcodes for selected items
        selectedItems.forEach((item, idx) => {
            const serial = item.serialNo || item.itemNumber;
            if (serial) {
                setTimeout(() => generateBarcode(serial, `barcode-${item.id}`), 100);
            }
        });
    }, [selectedItems]);

    if (!_hasHydrated || !isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/labs" className="text-slate-500 hover:text-slate-700">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <Barcode className="w-6 h-6 text-indigo-600" />
                            <h1 className="text-xl font-semibold">Barcode Generator</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Item Selection */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4">Select Items</h2>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search by serial, item number, brand..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input pl-10"
                            />
                        </div>

                        {/* Manual Entry */}
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                            <label className="label">Or Enter Serial Numbers (one per line)</label>
                            <textarea
                                value={manualSerials}
                                onChange={(e) => setManualSerials(e.target.value)}
                                className="input text-sm font-mono"
                                rows={3}
                                placeholder="SERIAL001&#10;SERIAL002&#10;SERIAL003"
                            />
                            <button
                                onClick={addManualSerials}
                                disabled={!manualSerials.trim()}
                                className="btn btn-secondary mt-2 w-full"
                            >
                                Add Serial Numbers
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="border rounded-lg max-h-72 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-slate-500">Loading items...</div>
                            ) : filteredItems.length === 0 ? (
                                <div className="p-4 text-center text-slate-500">No items found</div>
                            ) : (
                                filteredItems.slice(0, 50).map(item => (
                                    <label
                                        key={item.id}
                                        className="flex items-center gap-3 p-3 hover:bg-slate-50 border-b last:border-b-0 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.some(i => i.id === item.id)}
                                            onChange={() => toggleSelectItem(item)}
                                            className="rounded"
                                        />
                                        <Package className="w-4 h-4 text-slate-400" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {item.itemNumber} - {item.brand} {item.modelNo}
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">
                                                Serial: {item.serialNo || 'N/A'}
                                            </div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Showing {Math.min(filteredItems.length, 50)} of {filteredItems.length} items
                        </p>
                    </div>

                    {/* Right: Generated Barcodes */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Generated Barcodes ({selectedItems.length})</h2>
                            {selectedItems.length > 0 && (
                                <div className="flex gap-2">
                                    <button onClick={printBarcodes} className="btn btn-secondary text-sm">
                                        <Printer className="w-4 h-4" /> Print All
                                    </button>
                                    <button onClick={() => setSelectedItems([])} className="btn btn-secondary text-sm text-red-600">
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedItems.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Barcode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Select items or enter serial numbers to generate barcodes</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                {selectedItems.map((item, idx) => (
                                    <div key={item.id} className="border rounded-lg p-4 bg-slate-50">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="font-medium">{item.itemNumber}</div>
                                                <div className="text-xs text-slate-500">
                                                    {item.brand} {item.modelNo} {item.isManual && '(Manual)'}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => downloadBarcode(item.serialNo || item.itemNumber, `barcode-${item.id}`)}
                                                    className="p-1 hover:bg-slate-200 rounded"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => copyBarcode(item.serialNo || item.itemNumber, `barcode-${item.id}`)}
                                                    className="p-1 hover:bg-slate-200 rounded"
                                                    title="Copy"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-white p-2 rounded flex justify-center">
                                            <canvas
                                                ref={el => barcodeRefs.current[`barcode-${item.id}`] = el}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
