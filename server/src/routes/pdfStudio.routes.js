const express = require('express');
const router = express.Router();
const multer = require('multer');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const pdfStudio = require('../services/pdfStudio.service');
const aiService = require('../services/ai.service');
const documentConverter = require('../services/documentConverter.service');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
});

/**
 * @route   POST /api/office/pdf/merge
 * @desc    Merge multiple PDF files into one
 */
router.post('/merge', optionalAuth, upload.array('files', 20), asyncHandler(async (req, res) => {
    if (!req.files || req.files.length < 2) {
        return res.status(400).json({ success: false, message: 'Please upload at least 2 PDF files to merge' });
    }

    const buffers = req.files.map(f => f.buffer);
    const mergedBuffer = await pdfStudio.mergePdfs(buffers);

    const safeFilename = (req.body.filename || 'merged_document').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);
    res.setHeader('X-Original-Files-Count', String(req.files.length));
    res.send(mergedBuffer);
}));

/**
 * @route   POST /api/office/pdf/reorganize
 * @desc    Rearrange, rotate, delete, interleave multi-file pages, and optionally watermark & annotate
 */
router.post('/reorganize', optionalAuth, upload.any(), asyncHandler(async (req, res) => {
    const rawFiles = req.files || (req.file ? [req.file] : []);
    if (!rawFiles || rawFiles.length === 0) {
        return res.status(400).json({ success: false, message: 'Source PDF file(s) are required' });
    }

    // Separate watermarkImage if uploaded as a multipart file
    const watermarkFile = rawFiles.find(f => f.fieldname === 'watermarkImage');
    const pdfFiles = rawFiles.filter(f => f.fieldname !== 'watermarkImage');

    if (pdfFiles.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one source PDF file is required' });
    }

    const buffers = pdfFiles.map(f => f.buffer);

    let operations = req.body.operations;
    if (typeof operations === 'string') {
        try {
            operations = JSON.parse(operations);
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid operations JSON structure' });
        }
    }

    if (!Array.isArray(operations) || operations.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one page operation is required' });
    }

    let options = {};
    if (req.body.options) {
        try {
            options = typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options;
        } catch {}
    }
    if (req.body.watermarkText) {
        options.watermarkText = req.body.watermarkText;
    }
    if (req.body.watermarkColor) {
        options.watermarkColor = req.body.watermarkColor;
    }
    if (req.body.watermarkOpacity) {
        options.watermarkOpacity = req.body.watermarkOpacity;
    }
    if (req.body.watermarkFontSize) {
        options.watermarkFontSize = req.body.watermarkFontSize;
    }
    if (req.body.watermarkImageDataUrl) {
        options.watermarkImageDataUrl = req.body.watermarkImageDataUrl;
    }
    if (watermarkFile) {
        options.watermarkImageBuffer = watermarkFile.buffer;
    }
    if (req.body.annotations) {
        try {
            options.annotations = typeof req.body.annotations === 'string' ? JSON.parse(req.body.annotations) : req.body.annotations;
        } catch {}
    }
    if (req.body.compressLevel) {
        options.compressLevel = req.body.compressLevel;
    }

    const result = await pdfStudio.reorganizePdf(buffers, operations, options);
    const firstFilename = pdfFiles[0]?.originalname || 'document';
    const isCompressed = options.compressLevel && options.compressLevel !== 'none';
    const suffix = isCompressed ? `_reorganized_${options.compressLevel}.pdf` : '_organized.pdf';
    const safeFilename = firstFilename.replace(/\.pdf$/i, suffix);

    let finalBuffer;
    if (Buffer.isBuffer(result)) {
        finalBuffer = result;
    } else if (result && Buffer.isBuffer(result.buffer)) {
        finalBuffer = result.buffer;
        res.setHeader('X-Original-Size', String(result.originalSize || 0));
        res.setHeader('X-Compressed-Size', String(result.compressedSize || 0));
        res.setHeader('X-Savings-Percent', String(result.savingsPercent || 0));
    } else {
        finalBuffer = Buffer.from('');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(finalBuffer);
}));

/**
 * @route   POST /api/office/pdf/split
 * @desc    Split / extract pages by range
 */
router.post('/split', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Source PDF file is required' });
    }

    const pageRange = req.body.pageRange || '1';
    const splitBuffer = await pdfStudio.splitPdf(req.file.buffer, pageRange);
    const safeFilename = (req.file.originalname || 'document').replace(/\.pdf$/i, '_extracted.pdf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(splitBuffer);
}));

/**
 * @route   POST /api/office/pdf/watermark
 * @desc    Add text watermark & page numbers
 */
router.post('/watermark', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Source PDF file is required' });
    }

    const {
        watermarkText,
        opacity = 0.25,
        fontSize = 38,
        addPageNumbers = false,
        pageNumberPosition = 'bottom-right'
    } = req.body;

    const watermarkedBuffer = await pdfStudio.watermarkPdf(req.file.buffer, {
        watermarkText,
        opacity,
        fontSize,
        addPageNumbers: String(addPageNumbers) === 'true',
        pageNumberPosition
    });

    const safeFilename = (req.file.originalname || 'document').replace(/\.pdf$/i, '_watermarked.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(watermarkedBuffer);
}));

/**
 * @route   POST /api/office/pdf/compress
 * @desc    Compress PDF (Basic or Strong) with live savings %
 */
router.post('/compress', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Source PDF file is required' });
    }

    const level = req.body.level === 'strong' ? 'strong' : (req.body.level === 'medium' ? 'medium' : 'basic');
    const result = await pdfStudio.compressPdf(req.file.buffer, level);
    const safeFilename = (req.file.originalname || 'document').replace(/\.pdf$/i, `_compressed_${level}.pdf`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('X-Original-Size', String(result.originalSize));
    res.setHeader('X-Compressed-Size', String(result.compressedSize));
    res.setHeader('X-Savings-Percent', String(result.savingsPercent));
    res.send(result.buffer);
}));

/**
 * @route   POST /api/office/pdf/split-zip
 * @desc    Extract all pages or selected pages into individual PDFs in a ZIP archive
 */
router.post('/split-zip', optionalAuth, upload.any(), asyncHandler(async (req, res) => {
    const rawFiles = req.files || (req.file ? [req.file] : []);
    const pdfFiles = rawFiles.filter(f => f.mimetype === 'application/pdf' || (f.originalname && f.originalname.toLowerCase().endsWith('.pdf')));
    if (pdfFiles.length === 0) {
        return res.status(400).json({ success: false, message: 'Source PDF file is required' });
    }

    let operations = req.body.operations;
    if (typeof operations === 'string') {
        try {
            operations = JSON.parse(operations);
        } catch {}
    }

    let selectedPages = null;
    if (req.body.selectedPages) {
        try {
            selectedPages = typeof req.body.selectedPages === 'string'
                ? JSON.parse(req.body.selectedPages)
                : req.body.selectedPages;
        } catch {}
    }

    let zipBuffer;
    if (Array.isArray(operations) && operations.length > 0) {
        const buffers = pdfFiles.map(f => f.buffer);
        zipBuffer = await pdfStudio.splitPdfOperationsToZip(buffers, operations);
    } else {
        zipBuffer = await pdfStudio.splitPdfToZip(pdfFiles[0].buffer, selectedPages);
    }

    const firstFilename = pdfFiles[0]?.originalname || 'document';
    const safeZipName = firstFilename.replace(/\.pdf$/i, '_extracted_pages.zip');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeZipName}"`);
    res.send(zipBuffer);
}));

/**
 * @route   POST /api/office/pdf/annotate
 * @desc    Add text callouts, highlights, redactions, stamps, eSign
 */
router.post('/annotate', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Source PDF file is required' });
    }

    let annotations = req.body.annotations || [];
    if (typeof annotations === 'string') {
        try {
            annotations = JSON.parse(annotations);
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid annotations JSON format' });
        }
    }

    const annotatedBuffer = await pdfStudio.annotatePdf(req.file.buffer, annotations);
    const safeFilename = (req.file.originalname || 'document').replace(/\.pdf$/i, '_annotated.pdf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(annotatedBuffer);
}));

/**
 * @route   POST /api/office/pdf/ocr
 * @desc    Extract selectable text & document statistics
 */
router.post('/ocr', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Source PDF file is required' });
    }

    const ocrData = await pdfStudio.ocrExtractPdf(req.file.buffer);
    res.json({ success: true, data: ocrData });
}));

/**
 * @route   POST /api/office/pdf/ocr-vision
 * @desc    Extract text from scanned PDF page images via Multimodal AI Vision
 */
router.post('/ocr-vision', optionalAuth, asyncHandler(async (req, res) => {
    const { images, image, provider = 'gemini' } = req.body;
    const imageList = Array.isArray(images) ? images : (image ? [image] : []);

    if (imageList.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one page image data URL is required' });
    }

    const combinedText = [];
    for (let i = 0; i < imageList.length; i++) {
        const pageImg = imageList[i];
        try {
            const pageText = await aiService.recognizeImageTextAndMath(pageImg, provider);
            if (pageText && pageText.trim()) {
                const header = imageList.length > 1 ? `\n--- Page ${i + 1} ---\n` : '';
                combinedText.push(header + pageText.trim());
            }
        } catch (err) {
            console.warn(`[PDF Vision OCR] Page ${i + 1} OCR error:`, err.message);
        }
    }

    const fullText = combinedText.join('\n\n').trim();
    const lines = fullText ? fullText.split('\n') : [];
    const words = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;

    res.json({
        success: true,
        data: {
            pageCount: imageList.length,
            text: fullText,
            lineCount: lines.length,
            wordCount: words,
            charCount: fullText.length,
            mode: 'ai_vision'
        }
    });
}));

/**
 * @route   POST /api/office/pdf/metadata
 * @desc    Get page count & dimensions
 */
router.post('/metadata', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Source PDF file is required' });
    }

    const meta = await pdfStudio.getPdfMetadata(req.file.buffer);
    res.json({ success: true, data: meta });
}));

/**
 * @route   POST /api/office/pdf/split-preview
 * @desc    Get preview metadata and page list for Split-ZIP preview
 */
router.post('/split-preview', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Source PDF file is required' });
    }
    const meta = await pdfStudio.getSplitPagesMetadata(req.file.buffer);
    res.json({ success: true, data: meta });
}));

/**
 * @route   POST /api/office/pdf/export-as
 * @desc    Reorganize/annotate/watermark PDF and export directly to target format (.pdf, .docx, .xlsx, .txt, .zip)
 */
router.post('/export-as', optionalAuth, upload.any(), asyncHandler(async (req, res) => {
    const rawFiles = req.files || (req.file ? [req.file] : []);
    if (!rawFiles || rawFiles.length === 0) {
        return res.status(400).json({ success: false, message: 'Source PDF file(s) are required' });
    }

    const watermarkFile = rawFiles.find(f => f.fieldname === 'watermarkImage');
    const pdfFiles = rawFiles.filter(f => f.fieldname !== 'watermarkImage');

    if (pdfFiles.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one source PDF file is required' });
    }

    const buffers = pdfFiles.map(f => f.buffer);

    let operations = req.body.operations;
    if (typeof operations === 'string') {
        try {
            operations = JSON.parse(operations);
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid operations JSON structure' });
        }
    }

    if (!Array.isArray(operations) || operations.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one page operation is required' });
    }

    let options = {};
    if (req.body.options) {
        try {
            options = typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options;
        } catch {}
    }
    if (req.body.watermarkText) options.watermarkText = req.body.watermarkText;
    if (req.body.watermarkColor) options.watermarkColor = req.body.watermarkColor;
    if (req.body.watermarkOpacity) options.watermarkOpacity = req.body.watermarkOpacity;
    if (req.body.watermarkFontSize) options.watermarkFontSize = req.body.watermarkFontSize;
    if (req.body.watermarkImageDataUrl) options.watermarkImageDataUrl = req.body.watermarkImageDataUrl;
    if (watermarkFile) options.watermarkImageBuffer = watermarkFile.buffer;
    if (req.body.annotations) {
        try {
            options.annotations = typeof req.body.annotations === 'string' ? JSON.parse(req.body.annotations) : req.body.annotations;
        } catch {}
    }
    if (req.body.compressLevel) options.compressLevel = req.body.compressLevel;

    // 1. Generate organized PDF
    const result = await pdfStudio.reorganizePdf(buffers, operations, options);
    const pdfBuffer = Buffer.isBuffer(result) ? result : result.buffer;

    const targetFormat = (req.body.targetFormat || 'pdf').toLowerCase().replace(/^\./, '');
    const firstFilename = pdfFiles[0]?.originalname || 'document.pdf';
    const baseName = firstFilename.replace(/\.[^/.]+$/, '');

    // 2. Direct conversion
    if (targetFormat === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}_exported.pdf"`);
        return res.send(pdfBuffer);
    }

    if (targetFormat === 'zip' || targetFormat === 'split-zip') {
        const zipBuffer = await pdfStudio.splitPdfToZip(pdfBuffer);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}_pages.zip"`);
        return res.send(zipBuffer);
    }

    if (['docx', 'word', 'xlsx', 'excel', 'txt', 'text'].includes(targetFormat)) {
        const converted = await documentConverter.convertFile({
            fileBuffer: pdfBuffer,
            fileName: firstFilename,
            fromFormat: 'pdf',
            toFormat: targetFormat === 'word' ? 'docx' : targetFormat === 'excel' ? 'xlsx' : targetFormat === 'text' ? 'txt' : targetFormat
        });

        res.setHeader('Content-Type', converted.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${converted.outputFileName}"`);
        return res.send(converted.buffer);
    }

    return res.status(400).json({ success: false, message: `Unsupported export format: ${targetFormat}` });
}));

module.exports = router;
