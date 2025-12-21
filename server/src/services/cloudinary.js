const cloudinary = require('cloudinary').v2;

// Cloudinary service for file uploads
class CloudinaryService {
    constructor() {
        this.configured = false;
        this.initialize();
    }

    initialize() {
        try {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;

            if (!cloudName || !apiKey || !apiSecret) {
                console.log('⚠️ Cloudinary: Missing credentials, file upload disabled');
                return;
            }

            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
                secure: true
            });

            this.configured = true;
            console.log('✅ Cloudinary service initialized');
        } catch (error) {
            console.error('Cloudinary initialization error:', error.message);
        }
    }

    isConfigured() {
        return this.configured;
    }

    /**
     * Upload a file to Cloudinary
     * @param {Buffer} fileBuffer - The file buffer
     * @param {string} fileName - Original file name
     * @param {string} mimeType - File mime type
     * @returns {Promise<{publicId: string, url: string, secureUrl: string}>}
     */
    async uploadFile(fileBuffer, fileName, mimeType) {
        if (!this.isConfigured()) {
            throw new Error('Cloudinary not configured');
        }

        return new Promise((resolve, reject) => {
            // Determine resource type based on mime type
            let resourceType = 'auto';
            if (mimeType.startsWith('image/')) {
                resourceType = 'image';
            } else if (mimeType === 'application/pdf') {
                resourceType = 'raw';
            }

            // Create upload stream
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType,
                    folder: 'ulrms',
                    public_id: `${Date.now()}_${fileName.replace(/\.[^.]+$/, '')}`,
                    // For images, apply transformations
                    ...(resourceType === 'image' && {
                        transformation: [
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' }
                        ]
                    })
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({
                            publicId: result.public_id,
                            url: result.url,
                            secureUrl: result.secure_url,
                            format: result.format,
                            resourceType: result.resource_type,
                            size: result.bytes,
                            width: result.width,
                            height: result.height
                        });
                    }
                }
            );

            // Write buffer to stream
            uploadStream.end(fileBuffer);
        });
    }

    /**
     * Delete a file from Cloudinary
     * @param {string} publicId - Cloudinary public ID
     * @param {string} resourceType - Resource type (image, raw, video)
     */
    async deleteFile(publicId, resourceType = 'image') {
        if (!this.isConfigured()) {
            throw new Error('Cloudinary not configured');
        }

        return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }

    /**
     * Get optimized URL for an image
     * @param {string} publicId - Cloudinary public ID
     * @param {object} options - Transformation options
     */
    getOptimizedUrl(publicId, options = {}) {
        return cloudinary.url(publicId, {
            secure: true,
            transformation: [
                { quality: 'auto' },
                { fetch_format: 'auto' },
                ...(options.width ? [{ width: options.width, crop: 'scale' }] : [])
            ]
        });
    }
}

module.exports = new CloudinaryService();
