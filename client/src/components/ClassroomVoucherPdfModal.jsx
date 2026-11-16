'use client';

import { useRef } from 'react';
import { X, Printer, Download, Eye, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export const CLASSROOM_VOUCHER_PRINT_STYLES = `
    @page {
        size: A4 portrait;
        margin: 12mm 14mm 12mm 14mm;
    }
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }
    html, body {
        background: #fff;
        color: #000;
        font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .voucher-print-container {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
    }
    .voucher-page {
        page-break-after: always;
        page-break-inside: avoid;
        padding: 0;
        margin-bottom: 24px;
        background: #fff;
    }
    .voucher-page:last-child {
        page-break-after: avoid;
        margin-bottom: 0;
    }
    .letterhead-wrapper {
        width: 100%;
        margin: 0 auto 10px auto;
        text-align: center;
    }
    .letterhead-img {
        width: 100%;
        max-height: 115px;
        object-fit: contain;
        display: block;
        margin: 0 auto;
    }
    .letterhead-fallback {
        border-bottom: 2px solid #000;
        padding-bottom: 6px;
        margin-bottom: 10px;
        text-align: center;
    }
    .voucher-title {
        font-size: 19px;
        font-weight: 800;
        letter-spacing: 1.5px;
        text-align: center;
        margin: 8px 0 12px 0;
        text-transform: uppercase;
        color: #000;
    }
    .info-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
        border: 1.5px solid #000;
    }
    .info-table td {
        border: 1.5px solid #000;
        padding: 5px 8px;
        font-size: 13px;
        color: #000;
        vertical-align: middle;
    }
    .info-label {
        font-weight: 700;
        background-color: #f8fafc;
        width: 18%;
    }
    .info-val {
        width: 32%;
    }
    .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 14px;
        border: 1.5px solid #000;
    }
    .items-table th {
        border: 1.5px solid #000;
        padding: 6px 8px;
        font-size: 13px;
        font-weight: 800;
        background-color: #f1f5f9;
        color: #000;
    }
    .items-table td {
        border: 1.5px solid #000;
        padding: 5px 8px;
        font-size: 12.5px;
        color: #000;
        vertical-align: middle;
    }
    .signatures-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
        border: 1.5px solid #000;
    }
    .signatures-table th {
        border: 1.5px solid #000;
        padding: 6px 8px;
        font-size: 12px;
        font-weight: 700;
        background-color: #f8fafc;
        text-align: center;
        color: #000;
    }
    .signatures-table td.sig-space {
        border: 1.5px solid #000;
        height: 52px;
        vertical-align: bottom;
        text-align: center;
        padding: 4px;
    }
    .sig-name {
        font-size: 11px;
        color: #334155;
    }
    .conditions-box {
        margin-top: 10px;
        font-size: 11px;
        line-height: 1.45;
        color: #000;
    }
    .conditions-title {
        font-weight: 700;
        margin-bottom: 4px;
        font-size: 11.5px;
    }
    .conditions-list {
        margin-left: 20px;
    }
    .conditions-list li {
        margin-bottom: 2px;
    }
    @media print {
        body {
            margin: 0;
            padding: 0;
            background: #fff !important;
        }
        .no-print {
            display: none !important;
        }
        .voucher-page {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
        }
    }
`;

export default function ClassroomVoucherPdfModal({ vouchers = [], onClose }) {
    const voucherList = Array.isArray(vouchers) ? vouchers : [vouchers];
    const printFrameRef = useRef(null);

    if (!voucherList || voucherList.length === 0) return null;

    const singleVoucher = voucherList.length === 1 ? voucherList[0] : null;

    const renderVoucherHtml = (voucher) => {
        const itemsRows = (voucher.items || []).map((it, idx) => `
            <tr>
                <td style="text-align: center; font-weight: bold; width: 6%;">${idx + 1}</td>
                <td style="font-weight: 600; width: 38%;">${it.nomenclature || ''}</td>
                <td style="font-family: monospace; width: 24%;">${it.serialNo && it.serialNo !== '-' ? it.serialNo : (it.serialNo === '-' ? '-' : '')}</td>
                <td style="text-align: center; font-weight: 600; width: 8%;">${it.quantity !== undefined && it.quantity !== null && it.quantity !== '' ? it.quantity : (it.qty || 1)}</td>
                <td style="width: 24%;">${it.remarks || ''}</td>
            </tr>
        `).join('');

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const letterheadImgUrl = `${origin}/school_letterhead.png`;

        return `
            <div class="voucher-page">
                <!-- School Letterhead Banner -->
                <div class="letterhead-wrapper">
                    <img src="${letterheadImgUrl}" alt="School Letterhead" class="letterhead-img" onerror="this.style.display='none'; document.getElementById('letterhead-fallback-${voucher.id || 'single'}').style.display='block';" />
                    <div id="letterhead-fallback-${voucher.id || 'single'}" class="letterhead-fallback" style="display: none;">
                        <div style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">SENIOR SECONDARY RESIDENTIAL SCHOOL FOR MERITORIOUS STUDENTS.</div>
                        <div style="font-size: 14px; font-weight: 600;">Near Rose Garden, Ludhiana</div>
                        <div style="font-size: 14px; font-weight: 700; font-family: 'Gurmukhi MN', 'Arial Unicode MS', sans-serif;">ਸੀਨੀਅਰ ਸੈਕੰਡਰੀ ਰੈਜ਼ੀਡੈਂਸੀਅਲ ਸਕੂਲ ਫ਼ਾਰ ਮੈਰੀਟੋਰੀਅਸ ਸਟੂਡੈਂਟਸ</div>
                        <div style="font-size: 13px; font-family: 'Gurmukhi MN', 'Arial Unicode MS', sans-serif;">ਨੇੜੇ ਰੋਜ਼ ਗਾਰਡਨ, ਲੁਧਿਆਣਾ।</div>
                        <div style="font-size: 12px; margin-top: 4px; display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px;">
                            <span>✉: meritoriousldh@gmail.com</span>
                            <span>Office ☎: 0161-2307485</span>
                        </div>
                    </div>
                </div>

                <!-- Title -->
                <div class="voucher-title">LOAN VOUCHER</div>

                <!-- Info Table (Date & Time, Room No, Incharge, Class/Session) -->
                <table class="info-table">
                    <tr>
                        <td class="info-label">Date & Time:</td>
                        <td class="info-val" style="font-weight: 600;">${voucher.dateStr || ''}</td>
                        <td class="info-label" style="text-align: center;">Room No.:</td>
                        <td class="info-val" style="font-size: 16px; font-weight: 800; text-align: center;">${voucher.roomNumber || ''}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Issued To:</td>
                        <td class="info-val" style="font-weight: 600;">
                            ${voucher.staffName || 'Class Incharge'} ${voucher.staffDesignation ? `(${voucher.staffDesignation})` : ''}
                        </td>
                        <td class="info-label" style="text-align: center;">Class / Session:</td>
                        <td class="info-val" style="text-align: center; font-weight: 600;">
                            ${voucher.classSection ? `${voucher.classSection} • ` : ''}${voucher.academicSession || '2026-27'}
                        </td>
                    </tr>
                </table>

                <!-- Hardware Items Table -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 6%; text-align: center;">S. No.</th>
                            <th style="width: 38%; text-align: left;">Item Nomenclature</th>
                            <th style="width: 24%; text-align: left;">Serial No.</th>
                            <th style="width: 8%; text-align: center;">Qty</th>
                            <th style="width: 24%; text-align: left;">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <!-- Signatures Table -->
                <table class="signatures-table">
                    <tr>
                        <th style="width: 33.3%;">Issuer's Sign with Designation</th>
                        <th style="width: 33.4%;">Seal & Sign (Head of School)</th>
                        <th style="width: 33.3%;">Receiver's Sign with Designation</th>
                    </tr>
                    <tr>
                        <td class="sig-space">
                            <div class="sig-name">${voucher.issuerSign || 'Lab Incharge'}</div>
                        </td>
                        <td class="sig-space">
                            <div class="sig-name">${voucher.headOfSchoolSign || 'Principal'}</div>
                        </td>
                        <td class="sig-space">
                            <div class="sig-name">${voucher.staffName || voucher.receiverSign || 'Class Incharge'}</div>
                        </td>
                    </tr>
                </table>

                <!-- Conditions -->
                <div class="conditions-box">
                    <div class="conditions-title">Conditions for the Receiver of Issued Hardware:</div>
                    <ul class="conditions-list">
                        <li>The Receiver is fully responsible for the physical safety and proper operation of the issued hardware.</li>
                        <li>Any loss, damage, or technical fault must be reported to the issuing authority immediately.</li>
                        <li>The hardware must be used solely for the official or stated purpose of this loan.</li>
                        <li>The item must be returned on the due date or upon immediate demand by the issuing authority.</li>
                    </ul>
                </div>
            </div>
        `;
    };

    const handlePrint = () => {
        const allHtml = voucherList.map(v => renderVoucherHtml(v)).join('');
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Please allow popups to print');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${singleVoucher ? `Loan Voucher - Room ${singleVoucher.roomNumber}` : `Classroom Loan Vouchers (${voucherList.length} Rooms)`}</title>
                <style>${CLASSROOM_VOUCHER_PRINT_STYLES}</style>
            </head>
            <body>
                <div class="voucher-print-container">
                    ${allHtml}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 350);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadHtml = () => {
        const allHtml = voucherList.map(v => renderVoucherHtml(v)).join('');
        const fullDoc = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>${singleVoucher ? `Loan-Voucher-Room-${singleVoucher.roomNumber}` : `Loan-Vouchers-Bulk`}</title>
                <style>${CLASSROOM_VOUCHER_PRINT_STYLES}</style>
            </head>
            <body>
                <div class="voucher-print-container">
                    ${allHtml}
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([fullDoc], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = singleVoucher ? `Loan-Voucher-Room-${singleVoucher.roomNumber}.html` : `Classroom-Loan-Vouchers-Bulk.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Document downloaded');
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 z-[120] flex flex-col justify-between overflow-hidden animate-in fade-in duration-150 backdrop-blur-sm">
            {/* Top Toolbar */}
            <div className="bg-slate-900 border-b border-slate-800 text-white px-6 py-3.5 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                        <Printer className="w-5 h-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                            {singleVoucher
                                ? `Loan Voucher — Room ${singleVoucher.roomNumber} (${singleVoucher.classSection || 'Smart Classroom'})`
                                : `Bulk Loan Vouchers Preview (${voucherList.length} Classrooms)`}
                        </h2>
                        <p className="text-xs text-slate-400">
                            Official A4 Portrait Document with School Letterhead & 3 Signatures
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadHtml}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors shadow-sm"
                        title="Download A4 Voucher Document"
                        aria-label="Download Document"
                    >
                        <Download className="w-4 h-4 text-slate-300" />
                    </button>

                    <button
                        onClick={handlePrint}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg transition-colors font-semibold"
                        title="Print Official A4 Vouchers"
                        aria-label="Print Document"
                    >
                        <Printer className="w-4 h-4" />
                    </button>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
                        title="Close Overlay"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable A4 Preview Canvas */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-950/60">
                <div className="w-full max-w-[210mm] space-y-8">
                    {voucherList.map((voucher, vIdx) => (
                        <div
                            key={voucher.id || vIdx}
                            className="bg-white text-black shadow-2xl rounded-sm border border-slate-300 p-[12mm_14mm] min-h-[297mm] relative font-sans"
                            style={{
                                boxSizing: 'border-box',
                                fontFamily: 'Arial, sans-serif'
                            }}
                        >
                            {/* School Letterhead Banner - Aligned edge-to-edge with tables */}
                            <div className="w-full mb-3 text-center">
                                <img
                                    src="/school_letterhead.png"
                                    alt="School Letterhead"
                                    className="w-full max-h-[115px] object-contain block mx-auto"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const fb = document.getElementById(`fb-${voucher.id || vIdx}`);
                                        if (fb) fb.style.display = 'block';
                                    }}
                                />
                                <div
                                    id={`fb-${voucher.id || vIdx}`}
                                    className="hidden text-center border-b-2 border-black pb-2 mb-2"
                                >
                                    <div className="text-sm font-extrabold uppercase tracking-wide">
                                        SENIOR SECONDARY RESIDENTIAL SCHOOL FOR MERITORIOUS STUDENTS.
                                    </div>
                                    <div className="text-xs font-semibold">Near Rose Garden, Ludhiana</div>
                                    <div className="text-xs font-bold">ਸੀਨੀਅਰ ਸੈਕੰਡਰੀ ਰੈਜ਼ੀਡੈਂਸੀਅਲ ਸਕੂਲ ਫ਼ਾਰ ਮੈਰੀਟੋਰੀਅਸ ਸਟੂਡੈਂਟਸ</div>
                                    <div className="text-xs">ਨੇੜੇ ਰੋਜ਼ ਗਾਰਡਨ, ਲੁਧਿਆਣਾ।</div>
                                </div>
                            </div>

                            {/* Document Title */}
                            <div className="text-[19px] font-extrabold tracking-widest text-center uppercase my-2.5 text-black">
                                LOAN VOUCHER
                            </div>

                            {/* Metadata Table */}
                            <table className="w-full border-collapse border-[1.5px] border-black text-xs mb-3">
                                <tbody>
                                    <tr className="border-b-[1.5px] border-black">
                                        <td className="p-2 border-r-[1.5px] border-black font-bold bg-slate-50 w-[18%]">
                                            Date & Time:
                                        </td>
                                        <td className="p-2 border-r-[1.5px] border-black font-semibold w-[42%] text-black">
                                            {voucher.dateStr || ''}
                                        </td>
                                        <td className="p-2 border-r-[1.5px] border-black font-bold bg-slate-50 text-center w-[20%]">
                                            Room No.:
                                        </td>
                                        <td className="p-2 text-center text-base font-extrabold w-[20%] text-black">
                                            {voucher.roomNumber || ''}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 border-r-[1.5px] border-black font-bold bg-slate-50">
                                            Issued To:
                                        </td>
                                        <td className="p-2 border-r-[1.5px] border-black font-semibold text-black">
                                            {voucher.staffName || 'Class Incharge'}{' '}
                                            {voucher.staffDesignation ? `(${voucher.staffDesignation})` : ''}
                                        </td>
                                        <td className="p-2 border-r-[1.5px] border-black font-bold bg-slate-50 text-center">
                                            Class / Session:
                                        </td>
                                        <td className="p-2 text-center font-semibold text-black">
                                            {voucher.classSection ? `${voucher.classSection} • ` : ''}
                                            {voucher.academicSession || '2026-27'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Hardware Items Table */}
                            <table className="w-full border-collapse border-[1.5px] border-black text-xs mb-3.5">
                                <thead>
                                    <tr className="bg-slate-100 border-b-[1.5px] border-black text-black">
                                        <th className="p-2 border-r-[1.5px] border-black text-center w-[6%] font-extrabold">S. No.</th>
                                        <th className="p-2 border-r-[1.5px] border-black text-left w-[38%] font-extrabold">Item Nomenclature</th>
                                        <th className="p-2 border-r-[1.5px] border-black text-left w-[24%] font-extrabold">Serial No.</th>
                                        <th className="p-2 border-r-[1.5px] border-black text-center w-[8%] font-extrabold">Qty</th>
                                        <th className="p-2 text-left w-[24%] font-extrabold">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(voucher.items || []).map((it, idx) => (
                                        <tr key={idx} className="border-b-[1.5px] border-black text-black">
                                            <td className="p-1.5 border-r-[1.5px] border-black text-center font-bold">
                                                {idx + 1}
                                            </td>
                                            <td className="p-1.5 border-r-[1.5px] border-black font-semibold">
                                                {it.nomenclature || ''}
                                            </td>
                                            <td className="p-1.5 border-r-[1.5px] border-black font-mono">
                                                {it.serialNo && it.serialNo !== '-' ? it.serialNo : (it.serialNo === '-' ? '-' : '')}
                                            </td>
                                            <td className="p-1.5 border-r-[1.5px] border-black text-center font-semibold">
                                                {it.quantity !== undefined && it.quantity !== null && it.quantity !== '' ? it.quantity : (it.qty || 1)}
                                            </td>
                                            <td className="p-1.5 text-slate-800">
                                                {it.remarks || ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Signatures Table */}
                            <table className="w-full border-collapse border-[1.5px] border-black text-xs mb-3">
                                <thead>
                                    <tr className="bg-slate-50 border-b-[1.5px] border-black text-black">
                                        <th className="p-2 border-r-[1.5px] border-black text-center w-1/3 font-bold">
                                            Issuer's Sign with Designation
                                        </th>
                                        <th className="p-2 border-r-[1.5px] border-black text-center w-1/3 font-bold">
                                            Seal & Sign (Head of School)
                                        </th>
                                        <th className="p-2 text-center w-1/3 font-bold">
                                            Receiver's Sign with Designation
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border-r-[1.5px] border-black h-14 p-1 align-bottom text-center">
                                            <div className="text-[11px] text-slate-700 font-medium">
                                                {voucher.issuerSign || 'Lab Incharge'}
                                            </div>
                                        </td>
                                        <td className="border-r-[1.5px] border-black h-14 p-1 align-bottom text-center">
                                            <div className="text-[11px] text-slate-700 font-medium">
                                                {voucher.headOfSchoolSign || 'Principal'}
                                            </div>
                                        </td>
                                        <td className="h-14 p-1 align-bottom text-center">
                                            <div className="text-[11px] text-slate-700 font-medium">
                                                {voucher.staffName || voucher.receiverSign || 'Class Incharge'}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Conditions Box */}
                            <div className="text-[11px] leading-relaxed text-black mt-2">
                                <div className="font-bold text-[11.5px] mb-1">
                                    Conditions for the Receiver of Issued Hardware:
                                </div>
                                <ul className="list-disc ml-5 space-y-0.5">
                                    <li>The Receiver is fully responsible for the physical safety and proper operation of the issued hardware.</li>
                                    <li>Any loss, damage, or technical fault must be reported to the issuing authority immediately.</li>
                                    <li>The hardware must be used solely for the official or stated purpose of this loan.</li>
                                    <li>The item must be returned on the due date or upon immediate demand by the issuing authority.</li>
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
