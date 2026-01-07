'use client';

import { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
import * as xlsx from 'xlsx';

export default function FileViewer({ url, fileType, name }) {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sheetData, setSheetData] = useState(null);
    const [sheets, setSheets] = useState([]);
    const [activeSheet, setActiveSheet] = useState(0);

    useEffect(() => {
        if (!url || !containerRef.current) return;
        setLoading(true);
        setError(null);
        setSheetData(null);
        setSheets([]);

        let active = true;

        const loadFile = async () => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to fetch file');
                const blob = await response.blob();

                if (!active) return;

                if (fileType === 'docx') {
                    // DOCX Preview
                    containerRef.current.innerHTML = '';
                    await docx.renderAsync(blob, containerRef.current, containerRef.current, {
                        className: 'docx-viewer',
                        inWrapper: true
                    });
                    setLoading(false);
                }
                else if (['xlsx', 'xls', 'csv'].includes(fileType)) {
                    // Excel/CSV using SheetJS only - convert to HTML table
                    const data = await blob.arrayBuffer();
                    let allSheets = [];

                    if (fileType === 'csv') {
                        // For CSV
                        const text = await new Response(blob).text();
                        const rows = text.split('\n').map(row =>
                            row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
                        );
                        allSheets = [{ name: 'Sheet1', data: rows }];
                    } else {
                        // For Excel, use SheetJS
                        const workbook = xlsx.read(data, { type: 'array' });
                        allSheets = workbook.SheetNames.map(sheetName => {
                            const worksheet = workbook.Sheets[sheetName];
                            const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
                            return { name: sheetName, data: jsonData };
                        });
                    }

                    if (!active) return;

                    setSheets(allSheets);
                    setSheetData(allSheets[0]?.data || []);
                    setActiveSheet(0);
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                if (active) {
                    setError('Failed to load document preview. ' + err.message);
                    setLoading(false);
                }
            }
        };

        loadFile();

        return () => {
            active = false;
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [url, fileType]);

    const handleSheetChange = (index) => {
        setActiveSheet(index);
        setSheetData(sheets[index]?.data || []);
    };

    // Render spreadsheet as HTML table
    const renderSpreadsheet = () => {
        if (!sheetData || sheetData.length === 0) {
            return <p className="text-slate-500 text-center py-8">No data in this sheet</p>;
        }

        return (
            <div className="overflow-auto max-h-[500px]">
                <table className="w-full border-collapse text-sm">
                    <tbody>
                        {sheetData.map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-100 font-semibold sticky top-0' : 'hover:bg-slate-50'}>
                                {/* Row number */}
                                <td className="px-2 py-1 border border-slate-200 bg-slate-50 text-slate-500 text-xs text-center w-10">
                                    {rowIndex + 1}
                                </td>
                                {(Array.isArray(row) ? row : [row]).map((cell, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        className="px-2 py-1 border border-slate-200 max-w-xs truncate"
                                        title={String(cell ?? '')}
                                    >
                                        {cell ?? ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="relative w-full h-full min-h-[500px] bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
                        <p className="text-slate-500">Loading preview...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <p className="text-red-500">{error}</p>
                </div>
            )}

            {/* Sheet tabs for Excel files with multiple sheets */}
            {sheets.length > 1 && !loading && (
                <div className="flex gap-1 p-2 bg-slate-100 border-b overflow-x-auto">
                    {sheets.map((sheet, index) => (
                        <button
                            key={index}
                            onClick={() => handleSheetChange(index)}
                            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${activeSheet === index
                                    ? 'bg-white shadow text-primary-600 font-medium'
                                    : 'text-slate-600 hover:bg-white/50'
                                }`}
                        >
                            {sheet.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-auto bg-slate-50 p-4" ref={containerRef}>
                {/* Render spreadsheet data as table for Excel/CSV */}
                {['xlsx', 'xls', 'csv'].includes(fileType) && !loading && !error && renderSpreadsheet()}
            </div>
        </div>
    );
}
