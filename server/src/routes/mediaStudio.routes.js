const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const mediaStudio = require('../services/mediaStudio.service');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 250 * 1024 * 1024 } // Up to 250MB media
});

/**
 * @route   POST /api/office/media/convert
 * @desc    Convert Image, Audio, or Video
 */
router.post('/convert', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Media file is required' });
    }

    const targetFormat = (req.body.targetFormat || 'mp4').toLowerCase();
    const result = await mediaStudio.convertMedia(req.file.buffer, req.file.originalname, {
        targetFormat
    });

    const baseName = req.file.originalname ? path.parse(req.file.originalname).name : 'converted_media';
    const outputFilename = `${baseName}_converted.${targetFormat}`;

    let contentType = 'application/octet-stream';
    if (['mp4', 'mov', 'webm', 'avi'].includes(targetFormat)) contentType = `video/${targetFormat}`;
    else if (['mp3', 'wav', 'aac', 'ogg', 'flac'].includes(targetFormat)) contentType = `audio/${targetFormat}`;
    else if (['png', 'jpeg', 'jpg', 'webp', 'gif'].includes(targetFormat)) contentType = `image/${targetFormat}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.setHeader('X-Original-Size', String(result.originalSize));
    res.setHeader('X-Converted-Size', String(result.convertedSize));
    res.send(result.buffer);
}));

/**
 * @route   POST /api/office/media/compress
 * @desc    Compress Image, Audio, or Video
 */
router.post('/compress', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Media file is required' });
    }

    const {
        mediaType = 'video',
        quality = 70,
        crf = 28,
        bitrate = '128k',
        resolution = '720p'
    } = req.body;

    const result = await mediaStudio.compressMedia(req.file.buffer, req.file.originalname, {
        mediaType,
        quality: parseInt(quality, 10),
        crf: parseInt(crf, 10),
        bitrate,
        resolution
    });

    const ext = path.extname(req.file.originalname || 'media.bin');
    const baseName = path.parse(req.file.originalname || 'media').name;
    const outputFilename = `${baseName}_compressed${ext}`;

    res.setHeader('Content-Type', req.file.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.setHeader('X-Original-Size', String(result.originalSize));
    res.setHeader('X-Compressed-Size', String(result.compressedSize));
    res.setHeader('X-Saved-Percent', result.savedPercent);
    res.send(result.buffer);
}));

/**
 * @route   POST /api/office/media/clip
 * @desc    Trim/Clip Audio or Video
 */
router.post('/clip', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Media file is required' });
    }

    const { startTime = 0, endTime } = req.body;
    const result = await mediaStudio.clipMedia(req.file.buffer, req.file.originalname, {
        startTime: parseFloat(startTime) || 0,
        endTime: endTime !== undefined && endTime !== '' ? parseFloat(endTime) : undefined
    });

    const ext = path.extname(req.file.originalname || 'clip.bin');
    const baseName = path.parse(req.file.originalname || 'clip').name;
    const outputFilename = `${baseName}_clipped${ext}`;

    res.setHeader('Content-Type', req.file.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.setHeader('X-Clipped-Size', String(result.clippedSize));
    res.send(result.buffer);
}));

/**
 * @route   POST /api/office/media/extract-audio
 * @desc    Extract Audio Track from Video to MP3/WAV
 */
router.post('/extract-audio', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Video file is required' });
    }

    const targetFormat = (req.body.targetFormat || 'mp3').toLowerCase();
    const bitrate = req.body.bitrate || '192k';

    const result = await mediaStudio.extractAudio(req.file.buffer, req.file.originalname, {
        targetFormat,
        bitrate
    });

    const baseName = path.parse(req.file.originalname || 'video').name;
    const outputFilename = `${baseName}_audio.${targetFormat}`;

    res.setHeader('Content-Type', `audio/${targetFormat}`);
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.send(result.buffer);
}));

/**
 * @route   POST /api/office/media/video-to-gif
 * @desc    Convert Video Segment to Animated GIF
 */
router.post('/video-to-gif', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Video file is required' });
    }

    const startTime = parseFloat(req.body.startTime) || 0;
    const duration = parseFloat(req.body.duration) || 4;
    const fps = parseInt(req.body.fps, 10) || 12;
    const width = parseInt(req.body.width, 10) || 480;

    const result = await mediaStudio.videoToGif(req.file.buffer, req.file.originalname, {
        startTime,
        duration,
        fps,
        width
    });

    const baseName = path.parse(req.file.originalname || 'animation').name;
    const outputFilename = `${baseName}_animation.gif`;

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.send(result.buffer);
}));

module.exports = router;
