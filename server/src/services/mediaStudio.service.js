const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const FFMPEG_PATH = fs.existsSync('/opt/homebrew/bin/ffmpeg')
    ? '/opt/homebrew/bin/ffmpeg'
    : (fs.existsSync('/usr/local/bin/ffmpeg') ? '/usr/local/bin/ffmpeg' : 'ffmpeg');

class MediaStudioService {
    /**
     * Helper to run ffmpeg with args
     */
    runFfmpeg(args) {
        return new Promise((resolve, reject) => {
            execFile(FFMPEG_PATH, args, { maxBuffer: 100 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`FFmpeg error: ${error.message}\n${stderr}`));
                }
                resolve({ stdout, stderr });
            });
        });
    }

    /**
     * 1. Convert Media (Image, Audio, Video)
     */
    async convertMedia(buffer, filename, options = {}) {
        let targetFormat = 'mp4';
        if (typeof options === 'string') {
            targetFormat = options;
        } else if (options && options.targetFormat) {
            targetFormat = options.targetFormat;
        }
        const ext = path.extname(filename || 'media.tmp') || '.tmp';
        const tempId = uuidv4();
        const inputPath = path.join(os.tmpdir(), `input_${tempId}${ext}`);
        const outputPath = path.join(os.tmpdir(), `output_${tempId}.${targetFormat.toLowerCase()}`);

        try {
            await fs.promises.writeFile(inputPath, buffer);
            const args = ['-y', '-i', inputPath];

            const fmt = targetFormat.toLowerCase();
            if (['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'].includes(fmt)) {
                if (fmt === 'mp3') args.push('-c:a', 'libmp3lame', '-q:a', '2');
                else if (fmt === 'aac') args.push('-c:a', 'aac', '-b:a', '192k');
                else if (fmt === 'ogg') args.push('-c:a', 'libvorbis', '-q:a', '4');
            } else if (['mp4', 'webm', 'mov', 'avi'].includes(fmt)) {
                if (fmt === 'mp4') args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac');
                else if (fmt === 'webm') args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-c:a', 'libopus');
            } else if (['webp', 'png', 'jpg', 'jpeg'].includes(fmt)) {
                if (fmt === 'webp') args.push('-c:v', 'libwebp', '-quality', '85');
            }

            args.push(outputPath);
            await this.runFfmpeg(args);

            const outputBuffer = await fs.promises.readFile(outputPath);
            return {
                buffer: outputBuffer,
                format: targetFormat.toLowerCase(),
                originalSize: buffer.length,
                convertedSize: outputBuffer.length
            };
        } finally {
            try { if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath); } catch {}
            try { if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath); } catch {}
        }
    }

    /**
     * 2. Compress Media (Image, Audio, Video)
     */
    async compressMedia(buffer, filename, options = {}) {
        const {
            mediaType = 'video', // 'video', 'audio', 'image'
            quality = 70, // 10 to 100
            crf = 28, // 18 (high) to 35 (compact)
            bitrate = '128k',
            resolution = '720p' // '1080p', '720p', '480p', 'original'
        } = options;

        const ext = path.extname(filename || 'media.tmp') || (mediaType === 'video' ? '.mp4' : mediaType === 'audio' ? '.mp3' : '.jpg');
        const tempId = uuidv4();
        const inputPath = path.join(os.tmpdir(), `comp_in_${tempId}${ext}`);
        const outputPath = path.join(os.tmpdir(), `comp_out_${tempId}${ext}`);

        try {
            await fs.promises.writeFile(inputPath, buffer);
            const args = ['-y', '-i', inputPath];

            if (mediaType === 'video') {
                args.push('-c:v', 'libx264', '-preset', 'fast');
                const targetCrf = String(crf || Math.round(18 + ((100 - quality) / 100) * 16));
                args.push('-crf', targetCrf);

                // Resolution downscale if requested
                if (resolution === '720p') {
                    args.push('-vf', 'scale=-2:720');
                } else if (resolution === '480p') {
                    args.push('-vf', 'scale=-2:480');
                } else if (resolution === '360p') {
                    args.push('-vf', 'scale=-2:360');
                }

                args.push('-c:a', 'aac', '-b:a', '128k');
            } else if (mediaType === 'audio') {
                const targetBitrate = bitrate || (quality > 75 ? '192k' : quality > 40 ? '128k' : '64k');
                args.push('-c:a', 'libmp3lame', '-b:a', targetBitrate);
            } else if (mediaType === 'image') {
                const q = Math.max(10, Math.min(100, parseInt(quality, 10) || 75));
                args.push('-q:v', String(Math.round(((100 - q) / 100) * 31)));
            }

            args.push(outputPath);
            await this.runFfmpeg(args);

            const outputBuffer = await fs.promises.readFile(outputPath);
            const savedBytes = Math.max(0, buffer.length - outputBuffer.length);
            const savedPercent = ((savedBytes / buffer.length) * 100).toFixed(1);

            return {
                buffer: outputBuffer,
                originalSize: buffer.length,
                compressedSize: outputBuffer.length,
                savedBytes,
                savedPercent: `${savedPercent}%`
            };
        } finally {
            try { if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath); } catch {}
            try { if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath); } catch {}
        }
    }

    /**
     * 3. Clip / Trim Media (Audio or Video)
     */
    async clipMedia(buffer, filename, options = {}) {
        const { startTime = 0, endTime } = options;
        const ext = path.extname(filename || 'media.tmp') || '.mp4';
        const tempId = uuidv4();
        const inputPath = path.join(os.tmpdir(), `clip_in_${tempId}${ext}`);
        const outputPath = path.join(os.tmpdir(), `clip_out_${tempId}${ext}`);

        try {
            await fs.promises.writeFile(inputPath, buffer);
            const args = ['-y', '-ss', String(startTime)];

            if (endTime !== undefined && endTime !== null && Number(endTime) > Number(startTime)) {
                args.push('-to', String(endTime));
            }

            args.push('-i', inputPath);

            // Re-encode smoothly to ensure clean keyframe cut
            if (['.mp4', '.mov', '.webm', '.avi'].includes(ext.toLowerCase())) {
                args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22', '-c:a', 'aac');
            } else if (['.mp3', '.wav', '.aac', '.m4a', '.ogg'].includes(ext.toLowerCase())) {
                args.push('-c:a', 'copy');
            }

            args.push(outputPath);
            await this.runFfmpeg(args);

            const outputBuffer = await fs.promises.readFile(outputPath);
            return {
                buffer: outputBuffer,
                startTime,
                endTime,
                clippedSize: outputBuffer.length
            };
        } finally {
            try { if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath); } catch {}
            try { if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath); } catch {}
        }
    }

    /**
     * 4. Extract Audio Track from Video
     */
    async extractAudio(buffer, filename, options = {}) {
        const { targetFormat = 'mp3', bitrate = '192k' } = options;
        const ext = path.extname(filename || 'video.mp4') || '.mp4';
        const tempId = uuidv4();
        const inputPath = path.join(os.tmpdir(), `extract_in_${tempId}${ext}`);
        const outputPath = path.join(os.tmpdir(), `audio_out_${tempId}.${targetFormat}`);

        try {
            await fs.promises.writeFile(inputPath, buffer);
            const args = ['-y', '-i', inputPath, '-vn'];

            if (targetFormat === 'mp3') {
                args.push('-c:a', 'libmp3lame', '-b:a', bitrate);
            } else if (targetFormat === 'wav') {
                args.push('-c:a', 'pcm_s16le');
            } else if (targetFormat === 'aac') {
                args.push('-c:a', 'aac', '-b:a', bitrate);
            }

            args.push(outputPath);
            await this.runFfmpeg(args);

            const outputBuffer = await fs.promises.readFile(outputPath);
            return {
                buffer: outputBuffer,
                format: targetFormat,
                size: outputBuffer.length
            };
        } finally {
            try { if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath); } catch {}
            try { if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath); } catch {}
        }
    }

    /**
     * 5. Convert Video Clip to Animated GIF
     */
    async videoToGif(buffer, filename, options = {}) {
        const { startTime = 0, duration = 4, fps = 12, width = 480 } = options;
        const ext = path.extname(filename || 'video.mp4') || '.mp4';
        const tempId = uuidv4();
        const inputPath = path.join(os.tmpdir(), `gif_in_${tempId}${ext}`);
        const outputPath = path.join(os.tmpdir(), `gif_out_${tempId}.gif`);

        try {
            await fs.promises.writeFile(inputPath, buffer);
            const args = [
                '-y',
                '-ss', String(startTime),
                '-t', String(duration),
                '-i', inputPath,
                '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
                outputPath
            ];

            await this.runFfmpeg(args);

            const outputBuffer = await fs.promises.readFile(outputPath);
            return {
                buffer: outputBuffer,
                size: outputBuffer.length
            };
        } finally {
            try { if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath); } catch {}
            try { if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath); } catch {}
        }
    }
}

module.exports = new MediaStudioService();
