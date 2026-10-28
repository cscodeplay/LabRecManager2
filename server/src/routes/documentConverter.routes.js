const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const prisma = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const documentConverter = require('../services/documentConverter.service');

// Configure multer for memory storage up to 50MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

const CONVERSIONS_DIR = path.join(__dirname, '../../uploads/conversions');
if (!fs.existsSync(CONVERSIONS_DIR)) {
    fs.mkdirSync(CONVERSIONS_DIR, { recursive: true });
}

/**
 * @route   POST /api/documents/convert
 * @desc    Submit file(s) for conversion across Image, PDF, Word (.docx), and Excel (.xlsx/.csv)
 * @access  Public / Optional Auth
 */
router.post('/', optionalAuth, upload.array('files', 20), asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (files.length === 0 && !req.file) {
        return res.status(400).json({ success: false, message: 'No file provided for conversion' });
    }

    const { fromFormat, toFormat, options: rawOptions } = req.body;
    let options = {};
    if (rawOptions) {
        try {
            options = typeof rawOptions === 'string' ? JSON.parse(rawOptions) : rawOptions;
        } catch {
            options = {};
        }
    }

    const primaryFile = files[0] || req.file;
    const detectedFrom = fromFormat || primaryFile.originalname.split('.').pop().toLowerCase();
    const targetTo = (toFormat || '').toLowerCase();

    if (!targetTo) {
        return res.status(400).json({ success: false, message: 'Target conversion format (toFormat) is required' });
    }

    const userId = req.user?.id || null;
    const schoolId = req.user?.schoolId || null;

    // 1. Create DB job record
    const job = await documentConverter.createJob({
        schoolId,
        userId,
        fileName: primaryFile.originalname,
        fileSize: files.reduce((acc, f) => acc + f.size, 0),
        fromFormat: detectedFrom,
        toFormat: targetTo,
        options
    });

    try {
        // 2. Prepare buffer: if multiple images for PDF collation, pass array of buffers
        let inputPayload = primaryFile.buffer;
        if (files.length > 1 && ['png', 'jpg', 'jpeg', 'webp', 'image'].includes(detectedFrom.toLowerCase())) {
            inputPayload = files.map(f => f.buffer);
        }

        // 3. Perform conversion
        const result = await documentConverter.convertFile({
            fileBuffer: inputPayload,
            fileName: primaryFile.originalname,
            fromFormat: detectedFrom,
            toFormat: targetTo,
            options
        });

        // 4. Save to disk in conversions directory
        const diskFileName = `conv_${job.id}_${result.outputFileName}`;
        const diskPath = path.join(CONVERSIONS_DIR, diskFileName);
        fs.writeFileSync(diskPath, result.buffer);

        const base64Data = result.buffer.toString('base64');
        const downloadUrl = `/api/documents/convert/download/${job.id}`;

        // 5. Complete DB job
        await documentConverter.completeJob(job.id, {
            outputFileName: result.outputFileName,
            outputSize: result.size,
            outputBase64: base64Data,
            outputUrl: downloadUrl
        });

        return res.status(200).json({
            success: true,
            jobId: job.id,
            status: 'completed',
            inputFileName: primaryFile.originalname,
            outputFileName: result.outputFileName,
            outputFileSize: result.size,
            mimeType: result.mimeType,
            downloadUrl,
            // Include preview snippet if text or small image/pdf
            previewBase64: result.size < 5 * 1024 * 1024 ? `data:${result.mimeType};base64,${base64Data}` : null
        });
    } catch (err) {
        console.error('[DocumentConverter] Conversion failed:', err);
        await documentConverter.failJob(job.id, err.message);
        return res.status(500).json({
            success: false,
            jobId: job.id,
            status: 'failed',
            message: err.message || 'File conversion failed'
        });
    }
}));

/**
 * @route   GET /api/documents/convert/status/:jobId
 * @desc    Poll job status and get output details
 */
router.get('/status/:jobId', asyncHandler(async (req, res) => {
    const job = await documentConverter.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({ success: false, message: 'Conversion job not found' });
    }

    res.json({
        success: true,
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        inputFileName: job.input_file_name,
        outputFileName: job.output_file_name,
        outputFileSize: job.output_file_size,
        downloadUrl: job.status === 'completed' ? `/api/documents/convert/download/${job.id}` : null,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        completedAt: job.completed_at
    });
}));

/**
 * @route   GET /api/documents/convert/download/:jobId
 * @desc    Download converted file directly
 */
router.get('/download/:jobId', asyncHandler(async (req, res) => {
    const job = await documentConverter.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({ success: false, message: 'Conversion job not found' });
    }

    if (job.status !== 'completed') {
        return res.status(400).json({ success: false, message: `Job is not ready (status: ${job.status})` });
    }

    const outputFileName = job.output_file_name || 'converted_document';
    const diskPath = path.join(CONVERSIONS_DIR, `conv_${job.id}_${outputFileName}`);

    let fileBuffer;
    if (fs.existsSync(diskPath)) {
        fileBuffer = fs.readFileSync(diskPath);
    } else if (job.output_data_base64) {
        fileBuffer = Buffer.from(job.output_data_base64, 'base64');
    } else {
        return res.status(404).json({ success: false, message: 'Converted file binary not found' });
    }

    const ext = outputFileName.split('.').pop().toLowerCase();
    const mimeTypes = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        txt: 'text/plain',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFileName)}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
}));

/**
 * @route   POST /api/documents/convert/save-to-documents/:jobId
 * @desc    Save converted file directly into the school's / user's Lab Documents repository
 * @access  Private
 */
router.post('/save-to-documents/:jobId', authenticate, asyncHandler(async (req, res) => {
    const job = await documentConverter.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({ success: false, message: 'Conversion job not found' });
    }

    if (job.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Job is not completed yet' });
    }

    const outputFileName = job.output_file_name || 'converted_document';
    const diskConvPath = path.join(CONVERSIONS_DIR, `conv_${job.id}_${outputFileName}`);

    let fileBuffer;
    if (fs.existsSync(diskConvPath)) {
        fileBuffer = fs.readFileSync(diskConvPath);
    } else if (job.output_data_base64) {
        fileBuffer = Buffer.from(job.output_data_base64, 'base64');
    } else {
        return res.status(404).json({ success: false, message: 'Converted file binary not found' });
    }

    // Copy to /uploads for main document serving
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeBaseName = outputFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const finalDiskName = `doc_${Date.now()}_${safeBaseName}`;
    const finalDiskPath = path.join(uploadDir, finalDiskName);
    fs.writeFileSync(finalDiskPath, fileBuffer);

    const ext = outputFileName.split('.').pop().toLowerCase();
    const finalUrl = `/uploads/${finalDiskName}`;

    // Determine category and doc metadata
    const category = req.body.category || 'other';
    const title = req.body.title || outputFileName.replace(/\.[^/.]+$/, '');
    const folderId = req.body.folderId && req.body.folderId !== 'null' ? req.body.folderId : null;

    // Insert into prisma.document
    const newDoc = await prisma.document.create({
        data: {
            title,
            fileName: outputFileName,
            fileSize: fileBuffer.length,
            fileType: ext,
            fileUrl: finalUrl,
            publicId: `local_${finalDiskName}`,
            category,
            isPublic: req.body.isPublic === true || req.body.isPublic === 'true',
            folderId,
            schoolId: req.user.schoolId,
            uploadedById: req.user.id
        }
    });

    // Update user storage
    await prisma.user.update({
        where: { id: req.user.id },
        data: { storageUsedBytes: { increment: fileBuffer.length } }
    }).catch(e => console.warn('[DocumentConverter] User quota increment warning:', e.message));

    res.json({
        success: true,
        message: 'Converted file saved to Lab Documents successfully',
        document: newDoc
    });
}));

/**
 * @route   GET /api/documents/convert/recent
 * @desc    Get recent conversion jobs for user/school
 */
router.get('/recent', optionalAuth, asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const schoolId = req.user?.schoolId || null;
    const limit = parseInt(req.query.limit, 10) || 8;

    const jobs = await documentConverter.getRecentJobs(userId, schoolId, limit);
    res.json({
        success: true,
        data: jobs
    });
}));

module.exports = router;
