const { PDFDocument } = require('pdf-lib');
const PDFKit = require('pdfkit');
const mammoth = require('mammoth');
const docx = require('docx');
const XLSX = require('xlsx');
const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Universal Document Converter Service
 * Supports bi-directional transformations across Images, PDFs, Word (.docx), and Excel (.xlsx/.csv).
 */
class DocumentConverterService {
    /**
     * Parse text from PDF buffer using dual-mode pdf-parse
     */
    async extractPdfText(pdfBuffer) {
        try {
            const pdfPkg = require('pdf-parse');
            if (typeof pdfPkg === 'function') {
                const res = await pdfPkg(pdfBuffer);
                return res.text || '';
            } else if (pdfPkg && pdfPkg.PDFParse) {
                const parser = new pdfPkg.PDFParse({ data: pdfBuffer });
                await parser.load();
                const res = await parser.getText();
                return res?.text || (Array.isArray(res?.pages) ? res.pages.map(p => p.text).join('\n') : '');
            }
        } catch (err) {
            console.warn('[DocumentConverter] pdf-parse extraction warning:', err.message);
        }
        return '';
    }

    /**
     * 1. Images -> PDF (supports PNG, JPG, JPEG, and multi-image collation)
     */
    async convertImageToPdf(buffers, options = {}) {
        const imageList = Array.isArray(buffers) ? buffers : [buffers];
        if (imageList.length === 0) throw new Error('No image buffers provided for PDF conversion');

        const pdfDoc = await PDFDocument.create();
        const pageSize = options.pageSize === 'Letter' ? [612, 792] : [595.28, 841.89]; // Default A4
        const margin = options.margin || 36; // 0.5 inch

        for (const imgBuf of imageList) {
            let embeddedImg;
            const isPng = imgBuf[0] === 0x89 && imgBuf[1] === 0x50; // PNG signature
            if (isPng) {
                embeddedImg = await pdfDoc.embedPng(imgBuf);
            } else {
                // Default to JPG/JPEG
                try {
                    embeddedImg = await pdfDoc.embedJpg(imgBuf);
                } catch {
                    // Fallback attempt with PNG
                    embeddedImg = await pdfDoc.embedPng(imgBuf);
                }
            }

            const imgWidth = embeddedImg.width;
            const imgHeight = embeddedImg.height;

            let pageW = pageSize[0];
            let pageH = pageSize[1];

            // Auto-detect landscape orientation if image is wider than tall and landscape allowed
            if (options.orientation === 'landscape' || (options.orientation === 'auto' && imgWidth > imgHeight)) {
                pageW = pageSize[1];
                pageH = pageSize[0];
            }

            const page = pdfDoc.addPage([pageW, pageH]);
            const usableW = pageW - margin * 2;
            const usableH = pageH - margin * 2;

            // Maintain aspect ratio
            const scale = Math.min(usableW / imgWidth, usableH / imgHeight, 1);
            const drawW = imgWidth * scale;
            const drawH = imgHeight * scale;

            // Center on page
            const drawX = margin + (usableW - drawW) / 2;
            const drawY = margin + (usableH - drawH) / 2;

            page.drawImage(embeddedImg, {
                x: drawX,
                y: drawY,
                width: drawW,
                height: drawH
            });
        }

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }

    /**
     * 2. Word (.docx) -> PDF
     */
    async convertWordToPdf(docxBuffer, options = {}) {
        // Extract raw text and HTML structure from docx using mammoth
        const mammothRes = await mammoth.convertToHtml({ buffer: docxBuffer });
        const html = mammothRes.value || '';
        const rawText = (await mammoth.extractRawText({ buffer: docxBuffer })).value || '';

        // Generate styled PDF using PDFKit
        const chunks = [];
        const isLandscape = options.orientation === 'landscape';
        const doc = new PDFKit({
            size: options.pageSize === 'Letter' ? 'LETTER' : 'A4',
            layout: isLandscape ? 'landscape' : 'portrait',
            margins: { top: 45, bottom: 45, left: 45, right: 45 },
            bufferPages: true
        });

        doc.on('data', b => chunks.push(b));
        const finishPromise = new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
        });

        // Document header title
        const docTitle = options.title || 'Converted Document';
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f172a').text(docTitle, { align: 'left' });
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Generated from Word (.docx) • ${new Date().toLocaleDateString()}`);
        doc.moveDown(0.8);
        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(45, doc.y).lineTo(doc.page.width - 45, doc.y).stroke();
        doc.moveDown(1);

        // Parse paragraphs from text
        const paragraphs = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

        for (const p of paragraphs) {
            if (p.length < 80 && (p.endsWith(':') || /^[0-9]+\./.test(p) || /^[A-Z\s]{4,}$/.test(p))) {
                // Section Heading
                doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b').text(p);
                doc.moveDown(0.4);
            } else {
                // Regular Body Paragraph
                doc.font('Helvetica').fontSize(11).fillColor('#334155').text(p, {
                    align: 'justify',
                    lineGap: 3
                });
                doc.moveDown(0.6);
            }

            // Check if page overflow
            if (doc.y > doc.page.height - 70) {
                doc.addPage();
            }
        }

        // Add page numbers
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text(
                `Page ${i + 1} of ${range.count}`,
                45,
                doc.page.height - 35,
                { align: 'center', width: doc.page.width - 90 }
            );
        }

        doc.end();
        return await finishPromise;
    }

    /**
     * 3. Word (.docx) -> Text / Markdown
     */
    async convertWordToText(docxBuffer) {
        const res = await mammoth.extractRawText({ buffer: docxBuffer });
        return Buffer.from(res.value || '', 'utf8');
    }

    /**
     * 4. Excel (.xlsx / .xls / .csv) -> PDF
     */
    async convertExcelToPdf(xlsxBuffer, options = {}) {
        const wb = XLSX.read(xlsxBuffer, { type: 'buffer' });
        const sheetName = options.sheetName || wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        if (!sheet) throw new Error(`Sheet "${sheetName}" not found in workbook`);

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (rows.length === 0) throw new Error('Spreadsheet contains no data');

        const colCount = Math.max(...rows.map(r => (Array.isArray(r) ? r.length : 0)));
        const isLandscape = options.orientation === 'landscape' || colCount > 5;

        const chunks = [];
        const doc = new PDFKit({
            size: options.pageSize === 'Letter' ? 'LETTER' : 'A4',
            layout: isLandscape ? 'landscape' : 'portrait',
            margins: { top: 35, bottom: 35, left: 35, right: 35 },
            bufferPages: true
        });

        doc.on('data', b => chunks.push(b));
        const finishPromise = new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
        });

        // Header Title
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(sheetName || 'Spreadsheet Export');
        doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text(`Sheet: ${sheetName} • Total Rows: ${rows.length} • Total Columns: ${colCount}`);
        doc.moveDown(0.8);

        const availableWidth = doc.page.width - 70;
        const colWidth = Math.max(45, Math.floor(availableWidth / Math.min(colCount, 12)));
        const rowHeight = 20;

        let startY = doc.y;

        rows.forEach((row, rIdx) => {
            if (doc.y + rowHeight > doc.page.height - 45) {
                doc.addPage();
                startY = doc.y;
            }

            const y = doc.y;
            const isHeader = rIdx === 0;

            // Row background shading
            if (isHeader) {
                doc.rect(35, y, availableWidth, rowHeight).fill('#1e293b');
            } else if (rIdx % 2 === 1) {
                doc.rect(35, y, availableWidth, rowHeight).fill('#f8fafc');
            }

            // Cell borders and text
            for (let cIdx = 0; cIdx < colCount; cIdx++) {
                const x = 35 + cIdx * colWidth;
                const cellVal = String(row[cIdx] !== undefined && row[cIdx] !== null ? row[cIdx] : '').trim();

                // Draw cell boundary border
                doc.rect(x, y, colWidth, rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

                // Cell text
                doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(isHeader ? 8.5 : 8)
                    .fillColor(isHeader ? '#ffffff' : '#334155')
                    .text(cellVal, x + 4, y + 5, {
                        width: colWidth - 8,
                        height: rowHeight - 6,
                        ellipsis: true,
                        align: isNaN(Number(cellVal)) || cellVal === '' ? 'left' : 'right'
                    });
            }

            doc.y = y + rowHeight;
        });

        // Add page numbers
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text(
                `Page ${i + 1} of ${range.count}`,
                35,
                doc.page.height - 25,
                { align: 'center', width: doc.page.width - 70 }
            );
        }

        doc.end();
        return await finishPromise;
    }

    /**
     * 5. Excel (.xlsx) -> CSV
     */
    async convertExcelToCsv(xlsxBuffer, options = {}) {
        const wb = XLSX.read(xlsxBuffer, { type: 'buffer' });
        const sheetName = options.sheetName || wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
        const csvString = XLSX.utils.sheet_to_csv(sheet);
        return Buffer.from(csvString, 'utf8');
    }

    /**
     * 6. CSV -> Excel (.xlsx)
     */
    async convertCsvToExcel(csvBuffer, options = {}) {
        const csvText = csvBuffer.toString('utf8');
        const wb = XLSX.read(csvText, { type: 'string' });
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    /**
     * 7. PDF -> Word (.docx)
     */
    async convertPdfToWord(pdfBuffer, options = {}) {
        const rawText = await this.extractPdfText(pdfBuffer);
        const lines = rawText.split('\n').map(l => l.trim());

        const paragraphs = [];
        let currentPText = [];

        for (const line of lines) {
            // Ignore page header/footer pagination indicators like "-- 1 of 5 --"
            if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) || /^\d+$/.test(line)) {
                continue;
            }

            if (line === '') {
                if (currentPText.length > 0) {
                    const fullText = currentPText.join(' ');
                    const isHeading = fullText.length < 90 && (/^[A-Z0-9\s:.-]{4,}$/.test(fullText) || /^[0-9]+\.\s+[A-Z]/.test(fullText));

                    paragraphs.push(
                        new docx.Paragraph({
                            heading: isHeading ? docx.HeadingLevel.HEADING_2 : undefined,
                            spacing: { after: 120, before: isHeading ? 200 : 0 },
                            children: [
                                new docx.TextRun({
                                    text: fullText,
                                    bold: isHeading,
                                    size: isHeading ? 26 : 22, // 13pt / 11pt
                                    color: isHeading ? '1e293b' : '334155'
                                })
                            ]
                        })
                    );
                    currentPText = [];
                }
            } else {
                currentPText.push(line);
            }
        }

        // Flush remaining
        if (currentPText.length > 0) {
            paragraphs.push(
                new docx.Paragraph({
                    spacing: { after: 120 },
                    children: [
                        new docx.TextRun({
                            text: currentPText.join(' '),
                            size: 22,
                            color: '334155'
                        })
                    ]
                })
            );
        }

        const doc = new docx.Document({
            sections: [{
                properties: {
                    page: {
                        margin: { top: 720, bottom: 720, left: 720, right: 720 } // 0.5 inch (720 dxa)
                    }
                },
                children: paragraphs.length > 0 ? paragraphs : [
                    new docx.Paragraph({ children: [new docx.TextRun("No extractable text found in PDF.")] })
                ]
            }]
        });

        return await docx.Packer.toBuffer(doc);
    }

    /**
     * 8. PDF -> Excel (.xlsx)
     */
    async convertPdfToExcel(pdfBuffer, options = {}) {
        const rawText = await this.extractPdfText(pdfBuffer);
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

        // Group lines into tabular rows by detecting tab or multi-space separators
        const rows = [];
        for (const line of lines) {
            // Ignore page header/footer markers
            if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) continue;

            let cols;
            if (line.includes('\t')) {
                cols = line.split('\t').map(c => c.trim());
            } else if (/\s{2,}/.test(line)) {
                cols = line.split(/\s{2,}/).map(c => c.trim());
            } else if (line.includes('|')) {
                cols = line.split('|').map(c => c.trim()).filter(Boolean);
            } else {
                cols = [line];
            }

            // Auto-cast numbers where applicable
            const parsedCols = cols.map(c => {
                const clean = c.replace(/,/g, '');
                if (!isNaN(clean) && clean !== '' && !/^[0-9]{4}-[0-9]{2}/.test(clean)) {
                    return Number(clean);
                }
                return c;
            });

            rows.push(parsedCols);
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [['Converted Content'], ['No tabular rows detected']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Converted Table');

        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    /**
     * 9. PDF -> Text
     */
    async convertPdfToText(pdfBuffer) {
        const text = await this.extractPdfText(pdfBuffer);
        return Buffer.from(text, 'utf8');
    }

    /**
     * Universal Dispatcher
     */
    async convertFile({ fileBuffer, fileName, fromFormat, toFormat, options = {} }) {
        const from = String(fromFormat || '').toLowerCase().replace(/^\./, '');
        const to = String(toFormat || '').toLowerCase().replace(/^\./, '');

        let outputBuffer;
        let outputExt = to;
        let mimeType = 'application/octet-stream';

        if (['png', 'jpg', 'jpeg', 'webp', 'image'].includes(from) && to === 'pdf') {
            outputBuffer = await this.convertImageToPdf(fileBuffer, options);
            outputExt = 'pdf';
            mimeType = 'application/pdf';
        } else if (from === 'docx' && to === 'pdf') {
            outputBuffer = await this.convertWordToPdf(fileBuffer, { ...options, title: fileName.replace(/\.docx$/i, '') });
            outputExt = 'pdf';
            mimeType = 'application/pdf';
        } else if (from === 'docx' && (to === 'txt' || to === 'text' || to === 'md')) {
            outputBuffer = await this.convertWordToText(fileBuffer);
            outputExt = to === 'md' ? 'md' : 'txt';
            mimeType = 'text/plain';
        } else if (['xlsx', 'xls', 'csv'].includes(from) && to === 'pdf') {
            outputBuffer = await this.convertExcelToPdf(fileBuffer, options);
            outputExt = 'pdf';
            mimeType = 'application/pdf';
        } else if (['xlsx', 'xls'].includes(from) && to === 'csv') {
            outputBuffer = await this.convertExcelToCsv(fileBuffer, options);
            outputExt = 'csv';
            mimeType = 'text/csv';
        } else if (from === 'csv' && (to === 'xlsx' || to === 'excel')) {
            outputBuffer = await this.convertCsvToExcel(fileBuffer, options);
            outputExt = 'xlsx';
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (from === 'pdf' && (to === 'docx' || to === 'word')) {
            outputBuffer = await this.convertPdfToWord(fileBuffer, options);
            outputExt = 'docx';
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (from === 'pdf' && (to === 'xlsx' || to === 'excel')) {
            outputBuffer = await this.convertPdfToExcel(fileBuffer, options);
            outputExt = 'xlsx';
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (from === 'pdf' && (to === 'txt' || to === 'text')) {
            outputBuffer = await this.convertPdfToText(fileBuffer);
            outputExt = 'txt';
            mimeType = 'text/plain';
        } else {
            throw new Error(`Unsupported conversion from .${from} to .${to}`);
        }

        const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'converted_document';
        const outputFileName = `${baseName}.${outputExt}`;

        return {
            buffer: outputBuffer,
            outputFileName,
            mimeType,
            outputExt,
            size: outputBuffer.length
        };
    }

    /**
     * Database job helpers
     */
    async createJob({ schoolId, userId, fileName, fileSize, fromFormat, toFormat, options }) {
        const res = await prisma.$queryRawUnsafe(`
            INSERT INTO "document_conversion_jobs" (
                "id", "school_id", "user_id", "input_file_name", "input_file_size",
                "from_format", "to_format", "status", "progress", "options", "created_at"
            ) VALUES (
                gen_random_uuid(), $1::uuid, $2::uuid, $3, $4,
                $5, $6, 'processing', 10, $7::jsonb, NOW()
            ) RETURNING "id", "status", "progress", "created_at"
        `,
            schoolId || null,
            userId || null,
            fileName,
            fileSize || 0,
            fromFormat,
            toFormat,
            JSON.stringify(options || {})
        );
        return res[0];
    }

    async completeJob(jobId, { outputFileName, outputSize, outputBase64, outputUrl }) {
        await prisma.$queryRawUnsafe(`
            UPDATE "document_conversion_jobs" SET
                "status" = 'completed',
                "progress" = 100,
                "output_file_name" = $1,
                "output_file_size" = $2,
                "output_data_base64" = $3,
                "output_url" = $4,
                "completed_at" = NOW()
            WHERE "id" = $5::uuid
        `,
            outputFileName,
            outputSize,
            outputBase64,
            outputUrl || null,
            jobId
        );
    }

    async failJob(jobId, errorMessage) {
        await prisma.$queryRawUnsafe(`
            UPDATE "document_conversion_jobs" SET
                "status" = 'failed',
                "error_message" = $1,
                "completed_at" = NOW()
            WHERE "id" = $2::uuid
        `,
            errorMessage,
            jobId
        );
    }

    async getJob(jobId) {
        const res = await prisma.$queryRawUnsafe(`
            SELECT "id", "school_id", "user_id", "input_file_name", "input_file_size",
                   "from_format", "to_format", "status", "progress", "output_file_name",
                   "output_file_size", "output_url", "output_data_base64", "error_message",
                   "options", "created_at", "completed_at"
            FROM "document_conversion_jobs"
            WHERE "id" = $1::uuid
        `, jobId);
        return res[0] || null;
    }

    async getRecentJobs(userId, schoolId, limit = 10) {
        const res = await prisma.$queryRawUnsafe(`
            SELECT "id", "input_file_name", "input_file_size", "from_format", "to_format",
                   "status", "progress", "output_file_name", "output_file_size", "error_message",
                   "created_at", "completed_at"
            FROM "document_conversion_jobs"
            WHERE ($1::uuid IS NULL OR "user_id" = $1::uuid)
              AND ($2::uuid IS NULL OR "school_id" = $2::uuid)
            ORDER BY "created_at" DESC
            LIMIT $3
        `, userId || null, schoolId || null, limit);
        return res;
    }
}

module.exports = new DocumentConverterService();
