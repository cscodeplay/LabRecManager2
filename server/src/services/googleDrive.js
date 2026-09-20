const { google } = require('googleapis');
const stream = require('stream');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Google Drive service for file uploads, OAuth2 user authorization, and document interactions
class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.oauth2Client = null;
        this.authType = 'none'; // 'oauth_user', 'service_account', or 'local_sync'
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1fzuxLH580TlkwJyATBbrjv7LBnFnC1Qp';
        this.localSyncDir = path.join(__dirname, '../../uploads/google_drive');
        this.tokenPath = path.join(__dirname, '../../uploads/google_oauth_tokens.json');
        this.configPath = path.join(__dirname, '../../uploads/google_oauth_client_config.json');
        this._cachedTokens = null;
        this._initializingPromise = null;

        if (!fs.existsSync(this.localSyncDir)) {
            try { fs.mkdirSync(this.localSyncDir, { recursive: true }); } catch (e) {}
        }
        this.initialize();
        // Asynchronously attempt to restore OAuth from persistent PostgreSQL database
        this.initFromDb().catch(() => {});
    }

    /**
     * Get OAuth 2.0 client configuration from environment or saved config file
     */
    getOAuthConfig() {
        let savedConfig = {};
        if (fs.existsSync(this.configPath)) {
            try {
                savedConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            } catch (e) {}
        }
        return {
            clientId: process.env.GOOGLE_CLIENT_ID || savedConfig.clientId || null,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || savedConfig.clientSecret || null,
            redirectUri: process.env.GOOGLE_REDIRECT_URI || savedConfig.redirectUri || null
        };
    }

    /**
     * Save OAuth 2.0 Client credentials (allows setup via UI without manually editing .env)
     */
    async saveOAuthConfig({ clientId, clientSecret, redirectUri }) {
        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const existing = this.getOAuthConfig();
        const updated = {
            clientId: (clientId && clientId.trim()) || existing.clientId,
            clientSecret: (clientSecret && clientSecret.trim()) || existing.clientSecret,
            redirectUri: (redirectUri && redirectUri.trim()) || existing.redirectUri
        };
        fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf8');

        // Persist to PostgreSQL database
        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO "system_settings" ("key", "value", "updated_at")
                VALUES ('google_drive_oauth_config', $1::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT ("key") 
                DO UPDATE SET "value" = $1::jsonb, "updated_at" = CURRENT_TIMESTAMP
            `, JSON.stringify(updated));
        } catch (dbErr) {
            console.warn('[GoogleDrive] Failed to persist OAuth config to DB:', dbErr.message);
        }

        this.initialize();
        await this.initFromDb();
        return updated;
    }

    /**
     * Save tokens to disk and PostgreSQL database (preserves refresh token permanently across Render restarts)
     */
    async saveTokens(tokens) {
        const current = this._cachedTokens || this.loadTokens() || {};
        const merged = {
            ...current,
            ...tokens,
            refresh_token: tokens.refresh_token || current.refresh_token
        };
        this._cachedTokens = merged;

        // 1. Save to local file
        try {
            const dir = path.dirname(this.tokenPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.tokenPath, JSON.stringify(merged, null, 2), 'utf8');
            console.log('[GoogleDrive] OAuth tokens saved to local file');
        } catch (e) {
            console.warn('[GoogleDrive] Failed to save tokens file:', e.message);
        }

        // 2. Persist to PostgreSQL database (survives container re-deployments)
        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO "system_settings" ("key", "value", "updated_at")
                VALUES ('google_drive_oauth_tokens', $1::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT ("key") 
                DO UPDATE SET "value" = $1::jsonb, "updated_at" = CURRENT_TIMESTAMP
            `, JSON.stringify(merged));
            console.log('✅ [GoogleDrive] OAuth tokens persisted to PostgreSQL database successfully');
        } catch (dbErr) {
            console.warn('[GoogleDrive] Failed to save tokens to database:', dbErr.message);
        }
    }

    /**
     * Load saved OAuth tokens from PostgreSQL database
     */
    async loadTokensFromDb() {
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "value" FROM "system_settings" WHERE "key" = 'google_drive_oauth_tokens' LIMIT 1
            `);
            if (rows && rows.length > 0 && rows[0].value) {
                const dbTokens = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
                if (dbTokens && (dbTokens.refresh_token || dbTokens.access_token)) {
                    this._cachedTokens = dbTokens;
                    return dbTokens;
                }
            }
        } catch (err) {}
        return null;
    }

    /**
     * Load saved OAuth tokens from in-memory cache, file, or environment
     */
    loadTokens() {
        if (this._cachedTokens && (this._cachedTokens.refresh_token || this._cachedTokens.access_token)) {
            return this._cachedTokens;
        }

        try {
            if (fs.existsSync(this.tokenPath)) {
                const raw = fs.readFileSync(this.tokenPath, 'utf8');
                const parsed = JSON.parse(raw);
                this._cachedTokens = parsed;
                return parsed;
            }
        } catch (e) {
            console.warn('[GoogleDrive] Failed to load tokens file:', e.message);
        }
        if (process.env.GOOGLE_REFRESH_TOKEN) {
            return { refresh_token: process.env.GOOGLE_REFRESH_TOKEN };
        }
        return null;
    }

    /**
     * Disconnect OAuth credentials
     */
    async disconnectOAuth() {
        this._cachedTokens = null;
        try {
            if (fs.existsSync(this.tokenPath)) {
                fs.unlinkSync(this.tokenPath);
            }
        } catch (e) {}

        try {
            await prisma.$executeRawUnsafe(`
                DELETE FROM "system_settings" WHERE "key" = 'google_drive_oauth_tokens'
            `);
        } catch (e) {}

        this.drive = null;
        this.oauth2Client = null;
        this.authType = 'none';
        this.initialize();
        return true;
    }

    /**
     * Build OAuth2 client instance
     */
    getOAuth2Client(redirectUri = null) {
        const config = this.getOAuthConfig();
        if (!config.clientId || !config.clientSecret) {
            return null;
        }
        const effectiveRedirectUri = redirectUri || config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/drive/auth/callback';
        return new google.auth.OAuth2(
            config.clientId,
            config.clientSecret,
            effectiveRedirectUri
        );
    }

    /**
     * Generate Google OAuth consent URL requesting full Google Drive access
     */
    generateAuthUrl(redirectUri = null) {
        const client = this.getOAuth2Client(redirectUri);
        if (!client) {
            throw new Error('Google OAuth Client ID and Secret are not configured. Please configure them in settings.');
        }
        return client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent', // guarantees refresh_token on consent
            include_granted_scopes: true,
            scope: [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ]
        });
    }

    /**
     * Exchange auth code for tokens and activate OAuth drive client
     */
    async handleOAuthCallback(code, redirectUri = null) {
        const client = this.getOAuth2Client(redirectUri);
        if (!client) {
            throw new Error('Google OAuth Client not configured');
        }
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        await this.saveTokens(tokens);
        this.drive = google.drive({ version: 'v3', auth: client });
        this.authType = 'oauth_user';
        this.oauth2Client = client;

        client.on('tokens', async (newTokens) => {
            const current = (await this.loadTokensFromDb()) || this.loadTokens() || {};
            const merged = {
                ...current,
                ...newTokens,
                refresh_token: newTokens.refresh_token || current.refresh_token
            };
            await this.saveTokens(merged);
        });

        console.log('✅ Google Drive OAuth 2.0 user authorization successful (5TB personal quota unlocked)');
        return await this.getStorageQuota();
    }

    /**
     * Initialize Drive client synchronously (Priority: 1. OAuth2 User Token, 2. Service Account, 3. Local Sync)
     */
    initialize() {
        try {
            // 1. Check for saved OAuth 2.0 User Tokens
            const savedTokens = this.loadTokens();
            const config = this.getOAuthConfig();
            if (config.clientId && config.clientSecret && savedTokens && (savedTokens.refresh_token || savedTokens.access_token)) {
                const oauth2Client = new google.auth.OAuth2(
                    config.clientId,
                    config.clientSecret,
                    config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/drive/auth/callback'
                );
                oauth2Client.setCredentials(savedTokens);
                oauth2Client.on('tokens', async (newTokens) => {
                    const current = (await this.loadTokensFromDb()) || this.loadTokens() || {};
                    const merged = {
                        ...current,
                        ...newTokens,
                        refresh_token: newTokens.refresh_token || current.refresh_token
                    };
                    await this.saveTokens(merged);
                });
                this.drive = google.drive({ version: 'v3', auth: oauth2Client });
                this.authType = 'oauth_user';
                this.oauth2Client = oauth2Client;
                console.log('✅ Google Drive initialized with OAuth 2.0 User Token (5TB personal quota active)');
                return;
            }

            // 2. Check for Service Account credentials (Fallback - 0MB personal quota)
            if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
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
                this.authType = 'service_account';
                console.log('ℹ️ Google Drive initialized with Service Account (Note: 0MB quota on personal @gmail folders)');
                return;
            }

            this.authType = 'local_sync';
            console.log('Google Drive: Running in local-sync mode');
        } catch (error) {
            console.error('Google Drive initialization error:', error.message);
            this.authType = 'local_sync';
        }
    }

    /**
     * Restore OAuth tokens from persistent PostgreSQL database
     */
    async initFromDb() {
        try {
            const dbTokens = (await this.loadTokensFromDb()) || this.loadTokens();
            const config = this.getOAuthConfig();
            if (config.clientId && config.clientSecret && dbTokens && (dbTokens.refresh_token || dbTokens.access_token)) {
                const oauth2Client = new google.auth.OAuth2(
                    config.clientId,
                    config.clientSecret,
                    config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/drive/auth/callback'
                );
                oauth2Client.setCredentials(dbTokens);
                oauth2Client.on('tokens', async (newTokens) => {
                    const current = (await this.loadTokensFromDb()) || this.loadTokens() || {};
                    const merged = {
                        ...current,
                        ...newTokens,
                        refresh_token: newTokens.refresh_token || current.refresh_token
                    };
                    await this.saveTokens(merged);
                });
                this.drive = google.drive({ version: 'v3', auth: oauth2Client });
                this.authType = 'oauth_user';
                this.oauth2Client = oauth2Client;
                console.log('✅ Google Drive restored with OAuth 2.0 User Token from PostgreSQL (5TB quota active)');
                return true;
            }
        } catch (e) {
            console.warn('[GoogleDrive] initFromDb notice:', e.message);
        }
        return false;
    }

    /**
     * Guarantee OAuth client is restored before any Drive operation
     */
    async ensureInitialized() {
        if (this.authType === 'oauth_user' && this.drive) {
            return;
        }
        if (this._initializingPromise) {
            return this._initializingPromise;
        }
        this._initializingPromise = (async () => {
            try {
                await this.initFromDb();
            } finally {
                this._initializingPromise = null;
            }
        })();
        return this._initializingPromise;
    }

    isConfigured() {
        return Boolean(this.drive);
    }

    /**
     * Retrieve storage quota and user account info from Google Drive API
     */
    async getStorageQuota() {
        await this.ensureInitialized();
        if (!this.drive) {
            return {
                isConfigured: false,
                authType: this.authType,
                user: null,
                quota: null
            };
        }
        try {
            const res = await this.drive.about.get({
                fields: 'user, storageQuota'
            });
            const user = res.data.user || {};
            const q = res.data.storageQuota || {};

            const limitBytes = q.limit ? parseInt(q.limit, 10) : null;
            const usageBytes = q.usage ? parseInt(q.usage, 10) : 0;
            const driveUsageBytes = q.usageInDrive ? parseInt(q.usageInDrive, 10) : 0;
            const trashUsageBytes = q.usageInDriveTrash ? parseInt(q.usageInDriveTrash, 10) : 0;
            const freeBytes = limitBytes ? Math.max(0, limitBytes - usageBytes) : null;
            const percentUsed = limitBytes && limitBytes > 0 ? Math.min(100, Math.round((usageBytes / limitBytes) * 100)) : 0;

            return {
                isConfigured: true,
                authType: this.authType,
                user: {
                    displayName: user.displayName || null,
                    emailAddress: user.emailAddress || (this.authType === 'service_account' ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL : null),
                    photoLink: user.photoLink || null
                },
                quota: {
                    limit: limitBytes,
                    usage: usageBytes,
                    usageInDrive: driveUsageBytes,
                    usageInTrash: trashUsageBytes,
                    free: freeBytes,
                    percentUsed,
                    limitFormatted: limitBytes ? formatBytes(limitBytes) : (this.authType === 'oauth_user' ? '5.0 TB (Google AI Pro)' : '0 Bytes (Service Account)'),
                    usageFormatted: formatBytes(usageBytes),
                    freeFormatted: freeBytes ? formatBytes(freeBytes) : 'Available'
                }
            };
        } catch (err) {
            console.warn('[GoogleDrive] getStorageQuota error:', err.message);
            return {
                isConfigured: true,
                authType: this.authType,
                user: {
                    emailAddress: this.authType === 'service_account' ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL : null
                },
                quota: null,
                error: err.message
            };
        }
    }

    /**
     * List files and folders accessible from Google Drive
     */
    async listFiles({ folderId = null, query = '', mimeType = null, pageSize = 50 } = {}) {
        await this.ensureInitialized();
        const results = [];

        // 1. Fetch from Google Drive API if configured
        if (this.drive) {
            try {
                const conditions = ['trashed = false'];

                // Target folder logic: Default to this.folderId (ULRMS) if not explicitly root/all
                const activeFolder = folderId !== null && folderId !== undefined ? folderId : this.folderId;

                if (activeFolder && activeFolder !== 'root' && activeFolder !== 'all') {
                    conditions.push(`'${activeFolder}' in parents`);
                } else if (activeFolder === 'root') {
                    conditions.push(`'root' in parents`);
                }
                // If activeFolder === 'all', do not constrain parents

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
                    const owner = f.owners && f.owners[0] ? (f.owners[0].displayName || f.owners[0].emailAddress) : null;
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
                        source: 'google_drive',
                        owner
                    });
                });
            } catch (err) {
                console.warn('[GoogleDrive] files.list failed:', err.message);
            }
        }

        // 2. Also check local sync directory for any locally saved drive files (only at root level)
        try {
            if ((!folderId || folderId === 'root' || folderId === 'all') && fs.existsSync(this.localSyncDir)) {
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
                                thumbnailLink: mimeMap[ext]?.startsWith('image/') ? `/uploads/google_drive/${encodeURIComponent(fileName)}` : undefined,
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
        await this.ensureInitialized();
        if (fileId.startsWith('local_drive_')) {
            const fileName = Buffer.from(fileId.replace('local_drive_', ''), 'hex').toString('utf8');
            const fullPath = path.join(this.localSyncDir, fileName);
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                const ext = path.extname(fileName).toLowerCase().replace('.', '');
                const mimeMap = {
                    pdf: 'application/pdf',
                    png: 'image/png',
                    jpg: 'image/jpeg',
                    jpeg: 'image/jpeg',
                    gif: 'image/gif',
                    webp: 'image/webp',
                    svg: 'image/svg+xml',
                    csv: 'text/csv',
                    txt: 'text/plain',
                    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                };
                return {
                    id: fileId,
                    name: fileName,
                    mimeType: mimeMap[ext] || 'application/octet-stream',
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
        await this.ensureInitialized();
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

        // If it's a native Google Doc, export as full OpenXML DOCX (enables DocxViewer preview)
        if (mime === 'application/vnd.google-apps.document') {
            const exp = await this.drive.files.export(
                { fileId, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
                { responseType: 'arraybuffer' }
            );
            return Buffer.from(exp.data);
        }
        // If it's a native Google Sheet, export as full XLSX workbook (preserves all sheets and merged cells)
        if (mime === 'application/vnd.google-apps.spreadsheet') {
            const exp = await this.drive.files.export(
                { fileId, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
                { responseType: 'arraybuffer' }
            );
            return Buffer.from(exp.data);
        }
        // If it's a native Google Slides presentation, export to high-fidelity PDF
        if (mime === 'application/vnd.google-apps.presentation') {
            const exp = await this.drive.files.export(
                { fileId, mimeType: 'application/pdf' },
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
     * Upload a file to Google Drive (with personal 5TB quota when OAuth connected)
     */
    async uploadFile(fileBuffer, fileName, mimeType = 'application/octet-stream', targetFolderId = null) {
        await this.ensureInitialized();
        const destFolder = targetFolderId || this.folderId;
        const cleanName = fileName || `file_${Date.now()}`;
        let uploadError = null;

        // Attempt Google Drive upload first
        if (this.drive) {
            try {
                const bufferStream = new stream.PassThrough();
                bufferStream.end(fileBuffer);

                const fileMetadata = {
                    name: cleanName,
                    ...(destFolder && destFolder !== 'root' ? { parents: [destFolder] } : {})
                };

                const media = {
                    mimeType: mimeType,
                    body: bufferStream,
                };

                const response = await this.drive.files.create({
                    requestBody: fileMetadata,
                    media: media,
                    fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink, size, owners',
                    supportsAllDrives: true,
                });

                const ownerEmail = response.data.owners && response.data.owners[0] ? response.data.owners[0].emailAddress : null;

                console.log(`[GoogleDrive] File uploaded successfully to Google Drive: ${cleanName} (${response.data.id}) [Auth: ${this.authType}, Owner: ${ownerEmail}]`);
                return {
                    id: response.data.id,
                    name: response.data.name,
                    webViewLink: response.data.webViewLink,
                    webContentLink: response.data.webContentLink,
                    thumbnailLink: response.data.thumbnailLink,
                    size: response.data.size,
                    isGoogleDrive: true,
                    storageMode: 'google_drive',
                    authType: this.authType,
                    owner: ownerEmail
                };
            } catch (err) {
                console.warn(`[GoogleDrive] Live Google Drive upload notice: ${err.message}. Falling back to synchronized drive storage.`);
                uploadError = err.message;
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
            storageMode: 'local_sync',
            authType: this.authType,
            warning: uploadError || 'Service Accounts have 0-byte quota on personal @gmail accounts. Connect your 5TB personal account via OAuth 2.0 to upload directly to Google Drive.'
        };
    }

    /**
     * Delete a file from Google Drive
     */
    async deleteFile(fileId) {
        await this.ensureInitialized();
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

    /**
     * Create a new folder in Google Drive
     */
    async createFolder(name, parentFolderId = null) {
        await this.ensureInitialized();
        if (!this.drive) throw new Error('Google Drive not configured');
        const targetParent = parentFolderId || this.folderId;
        const metadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(targetParent && targetParent !== 'root' && targetParent !== 'all' ? { parents: [targetParent] } : {})
        };
        const res = await this.drive.files.create({
            requestBody: metadata,
            fields: 'id, name, mimeType, webViewLink',
            supportsAllDrives: true
        });
        console.log(`[GoogleDrive] Folder created: ${name} (${res.data.id})`);
        return res.data;
    }

    /**
     * Recursively calculate total files and bytes inside a Google Drive folder
     */
    async getFolderStats(folderId, parentPath = '') {
        await this.ensureInitialized();
        if (!this.drive) return { totalFiles: 0, totalBytes: 0, files: [] };
        try {
            const items = await this.listFiles({ folderId, pageSize: 100 });
            let totalBytes = 0;
            let fileList = [];

            for (const item of items) {
                if (item.isFolder) {
                    const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;
                    const sub = await this.getFolderStats(item.id, currentPath);
                    totalBytes += sub.totalBytes;
                    fileList = fileList.concat(sub.files);
                } else {
                    const sz = parseInt(item.size, 10) || 0;
                    totalBytes += sz;
                    fileList.push({
                        ...item,
                        relativeFolder: parentPath || null
                    });
                }
            }

            return {
                totalFiles: fileList.length,
                totalBytes,
                files: fileList
            };
        } catch (err) {
            console.warn(`[GoogleDrive] getFolderStats error for ${folderId}:`, err.message);
            return { totalFiles: 0, totalBytes: 0, files: [] };
        }
    }
}

module.exports = new GoogleDriveService();
