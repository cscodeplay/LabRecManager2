const { google } = require('googleapis');
const stream = require('stream');

// Google Drive service for file uploads
class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        this.initialize();
    }

    initialize() {
        try {
            // Check if we have the required environment variables
            if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
                console.log('Google Drive: Missing credentials, file upload disabled');
                return;
            }

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });

            this.drive = google.drive({ version: 'v3', auth });
            console.log('✅ Google Drive service initialized');
        } catch (error) {
            console.error('Google Drive initialization error:', error.message);
        }
    }

    isConfigured() {
        return this.drive !== null && this.folderId;
    }

    /**
     * Upload a file to Google Drive
     * @param {Buffer} fileBuffer - The file buffer
     * @param {string} fileName - Original file name
     * @param {string} mimeType - File mime type
     * @returns {Promise<{id: string, webViewLink: string, thumbnailLink: string}>}
     */
    async uploadFile(fileBuffer, fileName, mimeType) {
        if (!this.isConfigured()) {
            throw new Error('Google Drive not configured');
        }

        // Create a readable stream from buffer
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);

        const fileMetadata = {
            name: `${Date.now()}_${fileName}`,
            parents: [this.folderId],
        };

        const media = {
            mimeType: mimeType,
            body: bufferStream,
        };

        const response = await this.drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink, thumbnailLink',
        });

        // Make file publicly viewable
        await this.drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Get updated file info with public link
        const file = await this.drive.files.get({
            fileId: response.data.id,
            fields: 'id, webViewLink, webContentLink, thumbnailLink',
        });

        return {
            id: file.data.id,
            webViewLink: file.data.webViewLink,
            webContentLink: file.data.webContentLink,
            thumbnailLink: file.data.thumbnailLink,
            // Direct link for images
            directLink: `https://drive.google.com/uc?id=${file.data.id}`,
        };
    }

    /**
     * Delete a file from Google Drive
     * @param {string} fileId - Google Drive file ID
     */
    async deleteFile(fileId) {
        if (!this.isConfigured()) {
            throw new Error('Google Drive not configured');
        }

        await this.drive.files.delete({ fileId });
    }
}

module.exports = new GoogleDriveService();
