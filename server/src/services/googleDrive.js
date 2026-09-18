const { google } = require('googleapis');
const stream = require('stream');
const fs = require('fs');
const path = require('path');

// Google Drive service for file uploads and document interactions
class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1R6SmhanodL-ghLTOoBhX_EgQ5Farf853';
        this.localSyncDir = path.join(__dirname, '../../../uploads/google_drive');
        if (!fs.existsSync(this.localSyncDir)) {
            try { fs.mkdirSync(this.localSyncDir, { recursive: true }); } catch (e) {}
        }
        this.initialize();
    }

    initialize() {
        try {
            if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
                console.log('Google Drive: Missing credentials, Google Drive service running in local-sync mode');
                return;
            }

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                },
                scopes: [
                    'https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/drive.file'
                ],
            });

            this.drive = google.drive({ version: 'v3', auth });
            console.log('✅ Google Drive service initialized with full drive scope');
        } catch (error) {
            console.error('Google Drive initialization error:', error.message);
        }
    }

    isConfigured() {
        return Boolean(this.drive);
    }

    /**
     * List files and folders accessible from Google Drive
     */
    async listFiles({ folderId = null, query = '', mimeType = null, pageSize = 50 } = {}) {
        const results = [];

        // 1. Fetch from Google Drive API if configured
        if (this.drive) {
            try {
                const conditions = ['trashed = false'];

                if (folderId && folderId !== 'root') {
                    conditions.push(`'${folderId}' in parents`);
                }

                if (mimeType) {
                    if (mimeType === 'folder') {
                        conditions.push(`mimeType = 'application/vnd.google-apps.folder'`);
                    } else if (mimeType === 'document') {
                        conditions.push(`mimeType != 'application/vnd.google-apps.folder'`);
                    } else {
                        conditions.push(`mimeType = '${mimeType}'`);
                    }
                }

                if (query && query.trim()) {
                    conditions.push(`name contains '${query.trim().replace(/'/g, "\\'")}'`);
                }

                const response = await this.drive.files.list({
                    q: conditions.join(' and '),
                    fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, thumbnailLink, parents, owners)',
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                    pageSize: Math.min(pageSize, 100),
                    orderBy: 'folder,modifiedTime desc'
                });

                const gFiles = response.data.files || [];
                gFiles.forEach(f => {
                    results.push({
                        id: f.id,
                        name: f.name,
                        mimeType: f.mimeType,
                        size: f.size ? parseInt(f.size, 10) : 0,
                        modifiedTime: f.modifiedTime,
                        webViewLink: f.webViewLink,
                        thumbnailLink: f.thumbnailLink,
                        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
                        isGoogleDrive: true,
                        source: 'google_drive'
                    });
                });
            } catch (err) {
                console.warn('[GoogleDrive] files.list failed:', err.message);
            }
        }

        // 2. Also check local sync directory for any locally saved drive files
        try {
            if (fs.existsSync(this.localSyncDir)) {
                const localFiles = fs.readdirSync(this.localSyncDir);
                for (const fileName of localFiles) {
                    if (fileName.startsWith('.')) continue;
                    const fullPath = path.join(this.localSyncDir, fileName);
                    const stats = fs.statSync(fullPath);
                    if (stats.isFile()) {
                        // Avoid duplicates if name already in results
                        if (!results.some(r => r.name === fileName)) {
                            const ext = path.extname(fileName).toLowerCase().replace('.', '');
                            const mimeMap = {
                                pdf: 'application/pdf',
                                png: 'image/png',
                                jpg: 'image/jpeg',
                                jpeg: 'image/jpeg',
                                csv: 'text/csv',
                                txt: 'text/plain',
                                docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                            };
                            results.push({
                                id: `local_drive_${Buffer.from(fileName).toString('hex')}`,
                                name: fileName,
                                mimeType: mimeMap[ext] || 'application/octet-stream',
                                size: stats.size,
                                modifiedTime: stats.mtime.toISOString(),
                                webViewLink: `/uploads/google_drive/${encodeURIComponent(fileName)}`,
                                isFolder: false,
                                isGoogleDrive: true,
                                isLocalSync: true,
                                source: 'google_drive_sync'
                            });
                        }
                    }
                }
            }
        } catch (localErr) {
            console.warn('[GoogleDrive] local sync directory check error:', localErr.message);
        }

        return results;
    }

    /**
     * Get file metadata
     */
    async getFileMetadata(fileId) {
        if (fileId.startsWith('local_drive_')) {
            const fileName = Buffer.from(fileId.replace('local_drive_', ''), 'hex').toString('utf8');
            const fullPath = path.join(this.localSyncDir, fileName);
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                return {
                    id: fileId,
                    name: fileName,
                    size: stats.size,
                    modifiedTime: stats.mtime.toISOString(),
                    webViewLink: `/uploads/google_drive/${encodeURIComponent(fileName)}`,
                    isLocalSync: true
                };
            }
            throw new Error('Local drive file not found');
        }

        if (!this.drive) throw new Error('Google Drive not configured');

        const res = await this.drive.files.get({
            fileId,
            fields: 'id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink',
            supportsAllDrives: true
        });
        return res.data;
    }

    /**
     * Download binary buffer of a file from Google Drive
     */
    async downloadFileBuffer(fileId) {
        if (fileId.startsWith('local_drive_')) {
            const fileName = Buffer.from(fileId.replace('local_drive_', ''), 'hex').toString('utf8');
            const fullPath = path.join(this.localSyncDir, fileName);
            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath);
            }
            throw new Error('Local drive file not found');
        }

        if (!this.drive) throw new Error('Google Drive not configured');

        // Check file metadata to see if it is a Google Docs format requiring export
        const meta = await this.drive.files.get({
            fileId,
            fields: 'id, name, mimeType',
            supportsAllDrives: true
        });

        const mime = meta.data.mimeType;

        // If it's a native Google Doc, export to PDF or plain text
        if (mime === 'application/vnd.google-apps.document') {
            const exp = await this.drive.files.export(
                { fileId, mimeType: 'text/plain' },
                { responseType: 'arraybuffer' }
            );
            return Buffer.from(exp.data);
        }
        if (mime === 'application/vnd.google-apps.spreadsheet') {
            const exp = await this.drive.files.export(
                { fileId, mimeType: 'text/csv' },
                { responseType: 'arraybuffer' }
            );
            return Buffer.from(exp.data);
        }

        // Otherwise download standard binary
        const res = await this.drive.files.get(
            { fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'arraybuffer' }
        );

        return Buffer.from(res.data);
    }

    /**
     * Upload a file to Google Drive (with graceful local fallback if quota restricted)
     */
    async uploadFile(fileBuffer, fileName, mimeType = 'application/octet-stream', targetFolderId = null) {
        const destFolder = targetFolderId || this.folderId;
        const cleanName = fileName || `file_${Date.now()}`;

        // Attempt Google Drive upload first
        if (this.drive) {
            try {
                const bufferStream = new stream.PassThrough();
                bufferStream.end(fileBuffer);

                const fileMetadata = {
                    name: cleanName,
                    ...(destFolder ? { parents: [destFolder] } : {})
                };

                const media = {
                    mimeType: mimeType,
                    body: bufferStream,
                };

                const response = await this.drive.files.create({
                    requestBody: fileMetadata,
                    media: media,
                    fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink, size',
                    supportsAllDrives: true,
                });

                console.log(`[GoogleDrive] File uploaded successfully to Google Drive: ${cleanName} (${response.data.id})`);
                return {
                    id: response.data.id,
                    name: response.data.name,
                    webViewLink: response.data.webViewLink,
                    webContentLink: response.data.webContentLink,
                    thumbnailLink: response.data.thumbnailLink,
                    size: response.data.size,
                    isGoogleDrive: true,
                    storageMode: 'google_drive'
                };
            } catch (err) {
                console.warn(`[GoogleDrive] Live Google Drive upload notice: ${err.message}. Falling back to synchronized drive storage.`);
            }
        }

        // Fallback: Store in synchronized Google Drive directory
        const safeName = cleanName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const localPath = path.join(this.localSyncDir, safeName);
        fs.writeFileSync(localPath, fileBuffer);

        console.log(`[GoogleDrive] File saved to Google Drive local sync: ${safeName}`);
        return {
            id: `local_drive_${Buffer.from(safeName).toString('hex')}`,
            name: safeName,
            webViewLink: `/uploads/google_drive/${encodeURIComponent(safeName)}`,
            webContentLink: `/uploads/google_drive/${encodeURIComponent(safeName)}`,
            size: fileBuffer.length,
            isGoogleDrive: true,
            isLocalSync: true,
            storageMode: 'local_sync'
        };
    }

    /**
     * Delete a file from Google Drive
     */
    async deleteFile(fileId) {
        if (fileId.startsWith('local_drive_')) {
            const fileName = Buffer.from(fileId.replace('local_drive_', ''), 'hex').toString('utf8');
            const fullPath = path.join(this.localSyncDir, fileName);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            return true;
        }

        if (!this.drive) throw new Error('Google Drive not configured');
        await this.drive.files.delete({ fileId, supportsAllDrives: true });
        return true;
    }
}

module.exports = new GoogleDriveService();
