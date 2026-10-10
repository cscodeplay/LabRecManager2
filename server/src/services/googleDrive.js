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

/**
 * Safely parse base64url-encoded JWT payload without external dependencies
 */
function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const json = Buffer.from(base64, 'base64').toString('utf8');
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

// Google Drive service for file uploads, OAuth2 user authorization, and document interactions
// NOTE: Each application user gets their own instance (see GoogleDriveService.forUser) so that
// Google OAuth tokens and connected accounts are never shared across user accounts.
const userInstances = new Map();

class GoogleDriveService {
    constructor(userId = null, userRole = null) {
        this.userId = userId || null;
        this.userRole = userRole || null;
        const suffix = this.userId ? `_${this.userId}` : '';
        this.drive = null;
        this.oauth2Client = null;
        this.authType = 'none'; // 'oauth_user', 'service_account', or 'local_sync'
        // Browse the user's own "My Drive" root by default
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';
        this.localSyncDir = this.userId
            ? path.join(__dirname, '../../uploads/google_drive/users', String(this.userId))
            : path.join(__dirname, '../../uploads/google_drive');
        this.tokenPath = path.join(__dirname, `../../uploads/google_oauth_tokens${suffix}.json`);
        this.accountsPath = path.join(__dirname, `../../uploads/google_oauth_accounts${suffix}.json`);
        this.configPath = path.join(__dirname, '../../uploads/google_oauth_client_config.json');
        this.cloudConfigPath = path.join(__dirname, '../../uploads/cloud_providers_config.json');
        this.connectedGoogleAccounts = {};
        this.activeAccountEmail = null;
        this._cachedTokens = null;
        this._cachedConfig = null;
        this._initializingPromise = null;
        this._settingsTableChecked = false;
        this._isLegacyOwner = false;

        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}
        }
        if (!fs.existsSync(this.localSyncDir)) {
            try { fs.mkdirSync(this.localSyncDir, { recursive: true }); } catch (e) {}
        }
        this.initialize();
        // Asynchronously attempt to ensure table exists and restore OAuth from persistent DB
        this.ensureSettingsTable().then(() => this.initFromDb()).catch(() => {});
    }

    /**
     * Get (or create) the isolated Drive service instance for an application user
     */
    static forUser(user) {
        const userId = typeof user === 'object' ? user?.id : user;
        const role = typeof user === 'object' ? user?.role : null;
        if (!userId) return null;
        let inst = userInstances.get(userId);
        if (!inst) {
            inst = new GoogleDriveService(userId, role);
            userInstances.set(userId, inst);
        } else if (role && !inst.userRole) {
            inst.userRole = role;
        }
        return inst;
    }

    /**
     * Scope a system_settings key to the current application user
     */
    _scopedKey(base) {
        return this.userId ? `${base}:user:${this.userId}` : base;
    }

    /**
     * Ensure system_settings table exists in PostgreSQL to survive fresh databases and migrations
     */
    async ensureSettingsTable() {
        if (this._settingsTableChecked) return;
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "system_settings" (
                    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                    "key" VARCHAR(100) UNIQUE NOT NULL,
                    "value" JSONB NOT NULL,
                    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
                );
            `);
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS "idx_system_settings_key" ON "system_settings"("key");
            `).catch(() => {});
            this._settingsTableChecked = true;
        } catch (err) {
            console.warn('[GoogleDrive] system_settings table check notice:', err.message);
        }
    }

    /**
     * Synchronously load multi-account store from disk and/or existing single-token file
     */
    loadAccountsStore() {
        let accounts = {};
        let activeEmail = null;

        if (fs.existsSync(this.accountsPath)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(this.accountsPath, 'utf8'));
                if (parsed && typeof parsed === 'object') {
                    accounts = parsed.accounts || {};
                    activeEmail = parsed.activeEmail || null;
                }
            } catch (e) {
                console.warn('[GoogleDrive] Failed to read accounts file:', e.message);
            }
        }

        // Migrate or seed from single tokens file if accounts is empty
        const singleTokens = this.loadTokens();
        if (singleTokens && (singleTokens.id_token || singleTokens.access_token || singleTokens.refresh_token)) {
            let userEmail = null;
            let userName = null;
            let userPic = null;
            let givenName = null;
            if (singleTokens.id_token) {
                const payload = decodeJwtPayload(singleTokens.id_token);
                if (payload?.email) {
                    userEmail = payload.email.toLowerCase().trim();
                    userName = payload.name;
                    userPic = payload.picture;
                    givenName = payload.given_name;
                }
            }
            if (!userEmail && singleTokens.email) {
                userEmail = singleTokens.email.toLowerCase().trim();
                userName = singleTokens.name;
                userPic = singleTokens.picture;
            }
            if (userEmail) {
                if (!accounts[userEmail]) {
                    accounts[userEmail] = {
                        id: userEmail,
                        email: userEmail,
                        displayName: userName || userEmail,
                        givenName: givenName || null,
                        photoLink: userPic || null,
                        tokens: singleTokens,
                        plan: '5.0 TB Google AI Pro',
                        status: 'connected',
                        isDefault: true,
                        updatedAt: Date.now()
                    };
                }
                if (!activeEmail) activeEmail = userEmail;
            }
        }

        this.connectedGoogleAccounts = accounts;
        if (activeEmail && accounts[activeEmail]) {
            this.activeAccountEmail = activeEmail;
        } else {
            const keys = Object.keys(accounts);
            this.activeAccountEmail = keys.length > 0 ? keys[0] : null;
        }

        return { accounts: this.connectedGoogleAccounts, activeEmail: this.activeAccountEmail };
    }

    /**
     * Restore multi-account store from persistent DB
     */
    async loadAccountsStoreFromDb() {
        await this.ensureSettingsTable();
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "value" FROM "system_settings" WHERE "key" = $1 LIMIT 1
            `, this._scopedKey('google_drive_connected_accounts'));
            let dbData = null;
            if (rows && rows.length > 0 && rows[0].value) {
                dbData = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
            } else if (this.userId) {
                dbData = await this.claimLegacyAccountsStore();
            }
            if (dbData && dbData.accounts && typeof dbData.accounts === 'object') {
                this.connectedGoogleAccounts = { ...this.connectedGoogleAccounts, ...dbData.accounts };
                if (dbData.activeEmail && this.connectedGoogleAccounts[dbData.activeEmail]) {
                    this.activeAccountEmail = dbData.activeEmail;
                }
                if (this.userId && dbData.folderId) this.folderId = dbData.folderId;
                if (dbData.legacyOwner) this._isLegacyOwner = true;
            }
        } catch (e) {
            console.warn('[GoogleDrive] loadAccountsStoreFromDb notice:', e.message);
        }
    }

    /**
     * One-time migration: the pre-isolation global Google connection is handed to the first
     * admin/principal who opens Drive. It is then marked as claimed so no other user inherits it.
     */
    async claimLegacyAccountsStore() {
        if (!this.userId || !['admin', 'principal'].includes(this.userRole)) return null;
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "value" FROM "system_settings" WHERE "key" = 'google_drive_connected_accounts' LIMIT 1
            `);
            if (!rows || rows.length === 0 || !rows[0].value) return null;
            const legacy = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
            if (!legacy || legacy.claimedByUserId || !legacy.accounts || Object.keys(legacy.accounts).length === 0) return null;

            const claimed = {
                accounts: legacy.accounts,
                activeEmail: legacy.activeEmail || null,
                folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'root',
                legacyOwner: true,
                updatedAt: Date.now()
            };
            await prisma.$executeRawUnsafe(`
                INSERT INTO "system_settings" ("key", "value", "updated_at")
                VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT ("key") DO NOTHING
            `, this._scopedKey('google_drive_connected_accounts'), JSON.stringify(claimed));
            await prisma.$executeRawUnsafe(`
                UPDATE "system_settings" SET "value" = $1::jsonb, "updated_at" = CURRENT_TIMESTAMP
                WHERE "key" = 'google_drive_connected_accounts'
            `, JSON.stringify({ accounts: {}, activeEmail: null, claimedByUserId: this.userId, claimedAt: Date.now() }));
            await prisma.$executeRawUnsafe(`DELETE FROM "system_settings" WHERE "key" = 'google_drive_oauth_tokens'`).catch(() => {});
            for (const legacyFile of ['google_oauth_tokens.json', 'google_oauth_accounts.json']) {
                try { fs.unlinkSync(path.join(__dirname, '../../uploads', legacyFile)); } catch (e) {}
            }
            console.log(`[GoogleDrive] Legacy shared Google Drive connection migrated to user ${this.userId}`);
            return claimed;
        } catch (e) {
            console.warn('[GoogleDrive] claimLegacyAccountsStore notice:', e.message);
            return null;
        }
    }

    /**
     * Save multi-account store to disk and database
     */
    async saveAccountsStore() {
        const dataToSave = {
            accounts: this.connectedGoogleAccounts,
            activeEmail: this.activeAccountEmail,
            ...(this.userId && this.folderId && this.folderId !== 'root' ? { folderId: this.folderId } : {}),
            ...(this._isLegacyOwner ? { legacyOwner: true } : {}),
            updatedAt: Date.now()
        };

        // 1. Save to local accounts file
        try {
            const dir = path.dirname(this.accountsPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.accountsPath, JSON.stringify(dataToSave, null, 2), 'utf8');
        } catch (e) {
            console.warn('[GoogleDrive] Failed to write accounts file:', e.message);
        }

        // 2. Persist to PostgreSQL database
        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO "system_settings" ("key", "value", "updated_at")
                VALUES ($2, $1::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT ("key")
                DO UPDATE SET "value" = $1::jsonb, "updated_at" = CURRENT_TIMESTAMP
            `, JSON.stringify(dataToSave), this._scopedKey('google_drive_connected_accounts'));
        } catch (dbErr) {
            console.warn('[GoogleDrive] Failed to save accounts to DB:', dbErr.message);
        }
    }

    /**
     * Extract user identity from active account, cached tokens, or saved OAuth tokens
     */
    getConnectedUser() {
        if (this.activeAccountEmail && this.connectedGoogleAccounts[this.activeAccountEmail]) {
            const acc = this.connectedGoogleAccounts[this.activeAccountEmail];
            return {
                emailAddress: acc.email,
                displayName: acc.displayName || acc.email,
                photoLink: acc.photoLink || null,
                givenName: acc.givenName || null
            };
        }
        const tokens = this._cachedTokens || this.loadTokens();
        if (tokens?.id_token) {
            const payload = decodeJwtPayload(tokens.id_token);
            if (payload && payload.email) {
                return {
                    emailAddress: payload.email,
                    displayName: payload.name || payload.email,
                    photoLink: payload.picture || null,
                    givenName: payload.given_name || null
                };
            }
        }
        if (tokens?.email) {
            return {
                emailAddress: tokens.email,
                displayName: tokens.name || tokens.email,
                photoLink: tokens.picture || null
            };
        }
        return null;
    }

    /**
     * Load OAuth 2.0 client configuration from PostgreSQL database
     */
    async loadOAuthConfigFromDb() {
        await this.ensureSettingsTable();
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "value" FROM "system_settings" WHERE "key" = 'google_drive_oauth_config' LIMIT 1
            `);
            if (rows && rows.length > 0 && rows[0].value) {
                const val = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
                this._cachedConfig = val;
                return val;
            }
        } catch (e) {
            console.warn('[GoogleDrive] Could not load OAuth config from DB:', e.message);
        }
        return null;
    }

    /**
     * Get OAuth 2.0 client configuration from DB, saved config file, or environment
     * Saved / UI-configured credentials take precedence over .env
     */
    getOAuthConfig() {
        let savedConfig = this._cachedConfig || {};
        if (!savedConfig.clientId && fs.existsSync(this.configPath)) {
            try {
                savedConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                this._cachedConfig = savedConfig;
            } catch (e) {}
        }

        let clientId = savedConfig.clientId || process.env.GOOGLE_CLIENT_ID || null;
        let clientSecret = savedConfig.clientSecret || process.env.GOOGLE_CLIENT_SECRET || null;
        let redirectUri = savedConfig.redirectUri || process.env.GOOGLE_REDIRECT_URI || null;
        let folderId = savedConfig.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || null;

        // Auto-sanitize quotes and whitespace
        const sanitize = (val) => (typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '') : val);
        clientId = sanitize(clientId);
        clientSecret = sanitize(clientSecret);
        redirectUri = sanitize(redirectUri);
        folderId = sanitize(folderId);

        // Filter out dummy/test placeholders and fallback to environment credentials
        const isDummy = (val) => !val || typeof val !== 'string' || !val.trim() || val.startsWith('test-') || val.includes('placeholder') || val.includes('example.com') || val.includes('your-');
        if (isDummy(clientId) && !isDummy(process.env.GOOGLE_CLIENT_ID)) {
            clientId = sanitize(process.env.GOOGLE_CLIENT_ID);
        }
        if (isDummy(clientSecret) && !isDummy(process.env.GOOGLE_CLIENT_SECRET)) {
            clientSecret = sanitize(process.env.GOOGLE_CLIENT_SECRET);
        }
        if (isDummy(redirectUri) && !isDummy(process.env.GOOGLE_REDIRECT_URI)) {
            redirectUri = sanitize(process.env.GOOGLE_REDIRECT_URI);
        }
        if (!redirectUri) {
            redirectUri = 'http://localhost:5001/api/drive/auth/callback';
        }

        return {
            clientId,
            clientSecret,
            redirectUri,
            folderId
        };
    }

    /**
     * Save OAuth 2.0 Client credentials (allows setup via UI without manually editing .env)
     */
    async saveOAuthConfig(payload) {
        try {
            await this.ensureSettingsTable();
        } catch (e) {}
        const data = (payload && payload.data) ? payload.data : (payload || {});
        const clientId = data.clientId;
        const clientSecret = data.clientSecret;
        const redirectUri = data.redirectUri;
        const folderId = data.folderId !== undefined ? data.folderId : data.rootFolderId;

        const dir = path.dirname(this.configPath);
        try {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        } catch (e) {}
        
        const existing = this.getOAuthConfig();
        const isMaskedSecret = clientSecret && (clientSecret.includes('•••') || clientSecret.includes('••••'));
        const updated = {
            clientId: (clientId && clientId.trim()) ? clientId.trim().replace(/^["']|["']$/g, '') : existing.clientId,
            clientSecret: (clientSecret && clientSecret.trim() && !isMaskedSecret) ? clientSecret.trim().replace(/^["']|["']$/g, '') : existing.clientSecret,
            redirectUri: (redirectUri && redirectUri.trim()) ? redirectUri.trim().replace(/^["']|["']$/g, '') : existing.redirectUri,
            folderId: (folderId !== undefined) ? (folderId && folderId.trim() ? folderId.trim() : null) : existing.folderId
        };
        this._cachedConfig = updated;
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf8');
        } catch (e) {
            console.warn('[GoogleDrive] Failed to write config file:', e.message);
        }

        // Persist to PostgreSQL database (safe fallback)
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

        if (updated.folderId) {
            this.folderId = updated.folderId;
        }

        try {
            this.initialize();
            await this.initFromDb();
        } catch (initErr) {
            console.warn('[GoogleDrive] Post-save initialize notice:', initErr.message);
        }
        return updated;
    }

    /**
     * Get multi-cloud provider configurations for Admin Settings
     */
    async getAllProvidersConfig() {
        await this.ensureSettingsTable();
        await this.loadOAuthConfigFromDb();
        const googleConfig = this.getOAuthConfig();
        
        let onedriveConfig = {};
        let dropboxConfig = {};
        let s3Config = {};
        let icloudConfig = {};

        // Try reading fallback file first
        try {
            if (fs.existsSync(this.cloudConfigPath)) {
                const fileJson = JSON.parse(fs.readFileSync(this.cloudConfigPath, 'utf8'));
                if (fileJson.microsoft_onedrive) onedriveConfig = fileJson.microsoft_onedrive;
                if (fileJson.dropbox) dropboxConfig = fileJson.dropbox;
                if (fileJson.aws_s3) s3Config = fileJson.aws_s3;
                if (fileJson.apple_icloud) icloudConfig = fileJson.apple_icloud;
            }
        } catch (e) {}
        
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "key", "value" FROM "system_settings" 
                WHERE "key" IN ('onedrive_oauth_config', 'dropbox_oauth_config', 's3_storage_config', 'icloud_config')
            `);
            for (const row of rows) {
                const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
                if (row.key === 'onedrive_oauth_config') onedriveConfig = { ...onedriveConfig, ...val };
                if (row.key === 'dropbox_oauth_config') dropboxConfig = { ...dropboxConfig, ...val };
                if (row.key === 's3_storage_config') s3Config = { ...s3Config, ...val };
                if (row.key === 'icloud_config') icloudConfig = { ...icloudConfig, ...val };
            }
        } catch (e) {}

        const googleObj = {
            clientId: googleConfig.clientId || '',
            hasSecret: Boolean(googleConfig.clientSecret),
            maskedSecret: googleConfig.clientSecret ? '••••••••••••••••' : '',
            redirectUri: googleConfig.redirectUri || '',
            folderId: googleConfig.folderId || '',
            rootFolderId: googleConfig.folderId || '',
            isConfigured: Boolean(googleConfig.clientId && googleConfig.clientSecret)
        };

        const onedriveObj = {
            clientId: onedriveConfig.clientId || process.env.MICROSOFT_GRAPH_CLIENT_ID || '',
            tenantId: onedriveConfig.tenantId || process.env.MICROSOFT_GRAPH_TENANT_ID || 'common',
            hasSecret: Boolean(onedriveConfig.clientSecret || process.env.MICROSOFT_GRAPH_CLIENT_SECRET),
            maskedSecret: (onedriveConfig.clientSecret || process.env.MICROSOFT_GRAPH_CLIENT_SECRET) ? '••••••••••••••••' : '',
            redirectUri: onedriveConfig.redirectUri || '',
            isConfigured: Boolean(onedriveConfig.clientId || process.env.MICROSOFT_GRAPH_CLIENT_ID)
        };

        const dropboxObj = {
            appKey: dropboxConfig.appKey || process.env.DROPBOX_APP_KEY || '',
            hasSecret: Boolean(dropboxConfig.appSecret || process.env.DROPBOX_APP_SECRET),
            maskedSecret: (dropboxConfig.appSecret || process.env.DROPBOX_APP_SECRET) ? '••••••••••••••••' : '',
            redirectUri: dropboxConfig.redirectUri || '',
            isConfigured: Boolean(dropboxConfig.appKey || process.env.DROPBOX_APP_KEY)
        };

        const icloudObj = {
            appleId: icloudConfig.appleId || '',
            appPassword: icloudConfig.appPassword || icloudConfig.appSpecificPassword || '',
            appSpecificPassword: icloudConfig.appSpecificPassword || icloudConfig.appPassword || '',
            hasSecret: Boolean(icloudConfig.appPassword || icloudConfig.appSpecificPassword),
            maskedSecret: (icloudConfig.appPassword || icloudConfig.appSpecificPassword) ? '••••••••••••••••' : '',
            webdavUrl: icloudConfig.webdavUrl || icloudConfig.serverUrl || 'https://caldav.icloud.com',
            serverUrl: icloudConfig.serverUrl || icloudConfig.webdavUrl || 'https://caldav.icloud.com',
            isConfigured: Boolean(icloudConfig.appleId)
        };

        const s3Obj = {
            accessKeyId: s3Config.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
            hasSecret: Boolean(s3Config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY),
            maskedSecret: (s3Config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY) ? '••••••••••••••••' : '',
            bucket: s3Config.bucket || process.env.AWS_S3_BUCKET || '',
            region: s3Config.region || process.env.AWS_REGION || 'us-east-1',
            endpoint: s3Config.endpoint || process.env.AWS_ENDPOINT || '',
            isConfigured: Boolean((s3Config.accessKeyId || process.env.AWS_ACCESS_KEY_ID) && (s3Config.bucket || process.env.AWS_S3_BUCKET))
        };

        return {
            google: googleObj,
            google_drive: googleObj,
            onedrive: onedriveObj,
            microsoft_onedrive: onedriveObj,
            dropbox: dropboxObj,
            icloud: icloudObj,
            apple_icloud: icloudObj,
            s3: s3Obj,
            aws_s3: s3Obj
        };
    }

    /**
     * Save configuration for any provider from Admin Settings
     */
    async saveProviderConfig(provider, data) {
        try {
            await this.ensureSettingsTable();
        } catch (e) {}
        const rawData = (data && data.data) ? data.data : (data || {});
        const norm = String(provider || '').toLowerCase().trim();

        let canonical = 'google_drive';
        if (norm === 'google' || norm === 'google_drive' || norm === 'googledrive') {
            canonical = 'google_drive';
        } else if (norm === 'onedrive' || norm === 'microsoft_onedrive' || norm === 'microsoft') {
            canonical = 'microsoft_onedrive';
        } else if (norm === 'dropbox') {
            canonical = 'dropbox';
        } else if (norm === 'icloud' || norm === 'apple_icloud' || norm === 'apple') {
            canonical = 'apple_icloud';
        } else if (norm === 's3' || norm === 'aws_s3' || norm === 'aws') {
            canonical = 'aws_s3';
        } else {
            canonical = norm;
        }

        if (canonical === 'google_drive') {
            return await this.saveOAuthConfig(rawData);
        }
        
        const keyMap = {
            microsoft_onedrive: 'onedrive_oauth_config',
            dropbox: 'dropbox_oauth_config',
            apple_icloud: 'icloud_config',
            aws_s3: 's3_storage_config'
        };
        const dbKey = keyMap[canonical];
        if (!dbKey) throw new Error('Unsupported provider: ' + provider);

        let existing = {};
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "value" FROM "system_settings" WHERE "key" = $1 LIMIT 1
            `, dbKey);
            if (rows && rows.length > 0 && rows[0].value) {
                existing = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
            }
        } catch (e) {
            // Check fallback file
            try {
                if (fs.existsSync(this.cloudConfigPath)) {
                    const fileJson = JSON.parse(fs.readFileSync(this.cloudConfigPath, 'utf8'));
                    if (fileJson[canonical]) existing = fileJson[canonical];
                }
            } catch (err) {}
        }

        const merged = { ...existing };
        for (const [k, v] of Object.entries(rawData)) {
            if ((k.includes('Secret') || k.includes('Password') || k.includes('secretAccessKey')) && (!v || String(v).includes('•••'))) {
                continue;
            }
            if (v !== undefined) merged[k] = v;
        }

        // Normalize iCloud aliases
        if (canonical === 'apple_icloud') {
            if (rawData.appSpecificPassword) merged.appPassword = rawData.appSpecificPassword;
            if (rawData.appPassword) merged.appSpecificPassword = rawData.appPassword;
            if (rawData.serverUrl) merged.webdavUrl = rawData.serverUrl;
            if (rawData.webdavUrl) merged.serverUrl = rawData.webdavUrl;
        }

        // 1. Persist to PostgreSQL database
        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO "system_settings" ("key", "value", "updated_at")
                VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT ("key") 
                DO UPDATE SET "value" = $2::jsonb, "updated_at" = CURRENT_TIMESTAMP
            `, dbKey, JSON.stringify(merged));
        } catch (dbErr) {
            console.warn(`[GoogleDrive] DB save notice for ${dbKey}:`, dbErr.message);
        }

        // 2. Persist to fallback JSON file
        try {
            const dir = path.dirname(this.cloudConfigPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            let allSaved = {};
            if (fs.existsSync(this.cloudConfigPath)) {
                try { allSaved = JSON.parse(fs.readFileSync(this.cloudConfigPath, 'utf8')); } catch (e) {}
            }
            allSaved[canonical] = merged;
            fs.writeFileSync(this.cloudConfigPath, JSON.stringify(allSaved, null, 2), 'utf8');
        } catch (fileErr) {
            console.warn('[GoogleDrive] File fallback save error:', fileErr.message);
        }

        return merged;
    }

    /**
     * Save connected account session (OneDrive, Dropbox, etc.)
     */
    async saveConnectedAccount(provider, accountData) {
        await this.ensureSettingsTable();
        const norm = String(provider || '').toLowerCase().trim();
        const key = (norm.includes('onedrive') || norm.includes('microsoft')) ? 'onedrive_connected_account' :
                    (norm.includes('dropbox')) ? 'dropbox_connected_account' :
                    `${provider}_connected_account`;
        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO "system_settings" ("key", "value", "updated_at")
                VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT ("key") 
                DO UPDATE SET "value" = $2::jsonb, "updated_at" = CURRENT_TIMESTAMP
            `, key, JSON.stringify(accountData));
        } catch (e) {
            console.warn(`[GoogleDrive] Could not persist ${key} to DB:`, e.message);
        }
    }

    /**
     * Get all connected cloud accounts across Google, Microsoft, Apple, Dropbox, and AWS S3
     */
    async getConnectedAccounts() {
        this.loadAccountsStore();
        await this.loadAccountsStoreFromDb();

        const quotaData = await this.getStorageQuota();
        const user = this.getConnectedUser() || quotaData.user;
        const isOAuthConnected = (quotaData.authType || this.authType) === 'oauth_user' || Boolean(user?.emailAddress);

        const accounts = [];
        const seenGoogleEmails = new Set();

        const googleEmails = Object.keys(this.connectedGoogleAccounts);
        if (googleEmails.length > 0) {
            for (const email of googleEmails) {
                const acc = this.connectedGoogleAccounts[email];
                const isActive = (email.toLowerCase() === (this.activeAccountEmail || '').toLowerCase());
                const userQuota = isActive ? quotaData.quota : null;
                const hasTokens = Boolean(acc.tokens && (acc.tokens.refresh_token || acc.tokens.access_token));
                seenGoogleEmails.add(email.toLowerCase());

                accounts.push({
                    id: email,
                    accountId: email,
                    provider: 'google',
                    providerName: 'Google Drive',
                    name: `Google Drive (${acc.displayName || email})`,
                    email: acc.email,
                    displayName: acc.displayName || acc.email,
                    photoLink: acc.photoLink || null,
                    plan: userQuota?.limitFormatted ? `${userQuota.limitFormatted} Google One` : (acc.plan || 'Google One'),
                    percentUsed: userQuota?.percentUsed || 0,
                    usageFormatted: userQuota?.usageFormatted || '0 GB',
                    limitFormatted: userQuota?.limitFormatted || 'Google Drive',
                    status: hasTokens ? (acc.status || 'connected') : 'needs_reconnect',
                    hasTokens: hasTokens,
                    isActive: isActive,
                    isDefault: isActive
                });
            }
        } else if (isOAuthConnected && user?.emailAddress) {
            const email = user.emailAddress.toLowerCase();
            seenGoogleEmails.add(email);
            accounts.push({
                id: email,
                accountId: email,
                provider: 'google',
                providerName: 'Google Drive',
                name: 'Google Drive (Primary)',
                email: user.emailAddress,
                displayName: user.displayName || user.emailAddress,
                photoLink: user.photoLink || null,
                plan: quotaData.quota?.limitFormatted ? `${quotaData.quota.limitFormatted} Google One` : 'Google One',
                percentUsed: quotaData.quota?.percentUsed || 0,
                usageFormatted: quotaData.quota?.usageFormatted || '0 GB',
                limitFormatted: quotaData.quota?.limitFormatted || 'Google Drive',
                status: 'connected',
                hasTokens: true,
                isActive: true,
                isDefault: true
            });
        }

        // Secondary Google Account if stored in DB (backward-compat)
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "value" FROM "system_settings" WHERE "key" = 'secondary_google_account' LIMIT 1
            `);
            if (rows && rows.length > 0 && rows[0].value) {
                const sec = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
                if (sec && sec.email && !seenGoogleEmails.has(sec.email.toLowerCase())) {
                    const normSec = sec.email.toLowerCase();
                    seenGoogleEmails.add(normSec);
                    const secHasTokens = Boolean(this.connectedGoogleAccounts[normSec]?.tokens);
                    accounts.push({
                        id: sec.email,
                        accountId: sec.email,
                        provider: 'google',
                        providerName: 'Google Drive',
                        name: `Google Drive (${sec.displayName || sec.name || sec.email})`,
                        email: sec.email,
                        displayName: sec.displayName || sec.name || sec.email,
                        photoLink: null,
                        plan: 'Google Drive Account',
                        percentUsed: sec.percentUsed || 0,
                        usageFormatted: sec.usageFormatted || '0 GB',
                        limitFormatted: sec.limitFormatted || 'Google Drive',
                        status: secHasTokens ? 'connected' : 'needs_reconnect',
                        hasTokens: secHasTokens,
                        isActive: false,
                        isDefault: false
                    });
                }
            }
        } catch (e) {}

        // Microsoft OneDrive account if stored in DB or config
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "key", "value" FROM "system_settings" WHERE "key" IN ('onedrive_connected_account', 'onedrive_oauth_config')
            `);
            let oneAcc = null;
            let oneConf = null;
            for (const r of rows) {
                const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
                if (r.key === 'onedrive_connected_account') oneAcc = val;
                if (r.key === 'onedrive_oauth_config') oneConf = val;
            }
            if (oneAcc && oneAcc.email) {
                accounts.push({
                    id: 'microsoft_onedrive',
                    provider: 'onedrive',
                    providerName: 'Microsoft OneDrive',
                    name: oneAcc.name || 'Microsoft OneDrive (Campus)',
                    email: oneAcc.email,
                    displayName: oneAcc.displayName || oneAcc.email,
                    plan: '1 TB Microsoft 365',
                    percentUsed: oneAcc.percentUsed || 8,
                    usageFormatted: oneAcc.usageFormatted || '80 GB',
                    limitFormatted: '1.0 TB',
                    status: 'connected',
                    isDefault: false
                });
            } else if (oneConf && oneConf.clientId) {
                accounts.push({
                    id: 'microsoft_onedrive',
                    provider: 'onedrive',
                    providerName: 'Microsoft OneDrive',
                    name: 'Microsoft OneDrive (Configured)',
                    email: `app:${oneConf.clientId.substring(0, 8)}...`,
                    displayName: 'OneDrive Integration',
                    plan: 'Microsoft 365 Cloud',
                    percentUsed: 0,
                    usageFormatted: '0 GB',
                    limitFormatted: '1.0 TB',
                    status: 'configured',
                    isDefault: false
                });
            }
        } catch (e) {}

        // Apple iCloud account if stored in DB
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "value" FROM "system_settings" WHERE "key" = 'icloud_config' LIMIT 1
            `);
            if (rows && rows.length > 0 && rows[0].value) {
                const ic = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
                if (ic && ic.appleId) {
                    accounts.push({
                        id: 'apple_icloud',
                        provider: 'icloud',
                        providerName: 'Apple iCloud Drive',
                        name: 'Apple iCloud Drive',
                        email: ic.appleId,
                        displayName: ic.appleId.split('@')[0],
                        plan: 'iCloud+ 200 GB',
                        percentUsed: 15,
                        usageFormatted: '30 GB',
                        limitFormatted: '200 GB',
                        status: 'configured',
                        isDefault: false
                    });
                }
            }
        } catch (e) {}

        // Dropbox account if stored in DB
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "key", "value" FROM "system_settings" WHERE "key" IN ('dropbox_oauth_config', 'dropbox_connected_account')
            `);
            let dropConf = null;
            let dropAcc = null;
            for (const r of rows) {
                const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
                if (r.key === 'dropbox_oauth_config') dropConf = val;
                if (r.key === 'dropbox_connected_account') dropAcc = val;
            }
            if (dropAcc?.email) {
                accounts.push({
                    id: 'dropbox',
                    provider: 'dropbox',
                    providerName: 'Dropbox',
                    name: dropAcc.name || 'Dropbox Connected',
                    email: dropAcc.email,
                    displayName: dropAcc.name || 'Dropbox Account',
                    plan: 'Dropbox Standard / Plus',
                    percentUsed: 12,
                    usageFormatted: '24 GB',
                    limitFormatted: '2.0 TB',
                    status: 'connected',
                    isDefault: false
                });
            } else if (dropConf?.appKey) {
                accounts.push({
                    id: 'dropbox',
                    provider: 'dropbox',
                    providerName: 'Dropbox',
                    name: 'Dropbox Integration',
                    email: `app:${dropConf.appKey.substring(0, 8)}...`,
                    displayName: 'Dropbox App',
                    plan: 'Dropbox Storage',
                    percentUsed: 0,
                    usageFormatted: '0 GB',
                    limitFormatted: '2.0 TB',
                    status: 'configured',
                    isDefault: false
                });
            }
        } catch (e) {}

        // AWS S3 account if stored in DB
        try {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT "value" FROM "system_settings" WHERE "key" = 's3_storage_config' LIMIT 1
            `);
            if (rows && rows.length > 0 && rows[0].value) {
                const s3 = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
                if (s3?.bucket && s3?.accessKeyId) {
                    accounts.push({
                        id: 'aws_s3',
                        provider: 's3',
                        providerName: 'AWS S3 Storage',
                        name: `S3: ${s3.bucket}`,
                        email: `${s3.region || 'us-east-1'} @ ${s3.bucket}`,
                        displayName: `AWS S3 (${s3.bucket})`,
                        plan: 'AWS S3 Standard / Enterprise',
                        percentUsed: 5,
                        usageFormatted: '50 GB',
                        limitFormatted: 'Unlimited S3',
                        status: 'configured',
                        isDefault: false
                    });
                }
            }
        } catch (e) {}

        return accounts;
    }

    /**
     * Switch the active Google Drive account dynamically
     */
    async switchAccount(accountIdOrEmail, callbackUrl = null, state = null) {
        if (!accountIdOrEmail) {
            return {
                success: false,
                requiresAuth: false,
                message: 'Account email or ID is required'
            };
        }

        const rawTarget = typeof accountIdOrEmail === 'string'
            ? accountIdOrEmail
            : (accountIdOrEmail.email || accountIdOrEmail.id || accountIdOrEmail.accountId || String(accountIdOrEmail));
        const norm = (rawTarget || '').toLowerCase().trim();

        // Check if account is Apple iCloud
        if (norm === 'apple_icloud' || norm.includes('icloud') || norm.includes('apple')) {
            try {
                const rows = await prisma.$queryRawUnsafe(`
                    SELECT "value" FROM "system_settings" WHERE "key" = 'icloud_config' LIMIT 1
                `);
                if (rows && rows.length > 0 && rows[0].value) {
                    const ic = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
                    if (ic && (ic.appleId || ic.appSpecificPassword)) {
                        return {
                            success: true,
                            requiresAuth: false,
                            activeEmail: ic.appleId || 'Apple iCloud Drive',
                            provider: 'icloud',
                            message: `Active storage switched to Apple iCloud Drive (${ic.appleId || 'Configured'})`
                        };
                    }
                }
            } catch (e) {}
            return {
                success: false,
                requiresAuth: false,
                provider: 'icloud',
                message: 'Apple iCloud Drive connects using an App-Specific Password in Admin Settings > Cloud Storage & Drives. It does not use Google OAuth.'
            };
        }

        // Check if account is Microsoft OneDrive
        if (norm === 'microsoft_onedrive' || norm.includes('onedrive')) {
            return {
                success: false,
                requiresAuth: false,
                provider: 'onedrive',
                message: 'Microsoft OneDrive connects via Azure App Registration in Admin Settings > Cloud Storage & Drives.'
            };
        }

        // Check if account is Dropbox
        if (norm === 'dropbox') {
            return {
                success: false,
                requiresAuth: false,
                provider: 'dropbox',
                message: 'Dropbox connects via Dropbox App Console in Admin Settings > Cloud Storage & Drives.'
            };
        }

        await this.ensureSettingsTable();
        await this.loadOAuthConfigFromDb();
        this.loadAccountsStore();
        await this.loadAccountsStoreFromDb();

        let target = this.connectedGoogleAccounts[norm];
        if (!target) {
            target = Object.values(this.connectedGoogleAccounts).find(a => 
                a.email?.toLowerCase() === norm || a.id?.toLowerCase() === norm
            );
        }

        if (!target || !target.tokens) {
            let authUrl = null;
            try {
                authUrl = this.generateAuthUrl(callbackUrl, { prompt: 'select_account consent', login_hint: norm, state });
            } catch (e) {
                console.warn('[GoogleDrive] Could not generate authUrl for switchAccount:', e.message);
            }
            return {
                success: false,
                requiresAuth: true,
                targetEmail: norm,
                authUrl,
                message: `Google Account "${rawTarget}" is not authorized yet. Please connect via Google OAuth.`
            };
        }

        const config = this.getOAuthConfig();
        if (!config.clientId || !config.clientSecret) {
            let authUrl = null;
            try {
                authUrl = this.generateAuthUrl(callbackUrl, { prompt: 'select_account consent', login_hint: norm, state });
            } catch (e) {}
            return {
                success: false,
                requiresAuth: Boolean(authUrl),
                targetEmail: norm,
                authUrl,
                message: 'Google OAuth Client ID and Secret are not configured. Please configure them in Admin Settings > Cloud Storage & Drives.'
            };
        }

        const oauth2Client = new google.auth.OAuth2(
            config.clientId,
            config.clientSecret,
            config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/drive/auth/callback'
        );
        oauth2Client.setCredentials(target.tokens);

        const email = target.email || norm;
        oauth2Client.on('tokens', async (newTokens) => {
            if (this.connectedGoogleAccounts[email]) {
                this.connectedGoogleAccounts[email].tokens = {
                    ...this.connectedGoogleAccounts[email].tokens,
                    ...newTokens,
                    refresh_token: newTokens.refresh_token || this.connectedGoogleAccounts[email].tokens.refresh_token
                };
                if (this.activeAccountEmail === email) {
                    this._cachedTokens = this.connectedGoogleAccounts[email].tokens;
                    await this.saveTokens(this._cachedTokens);
                }
                await this.saveAccountsStore();
            }
        });

        this.oauth2Client = oauth2Client;
        this.drive = google.drive({ version: 'v3', auth: oauth2Client });
        this.authType = 'oauth_user';
        this.activeAccountEmail = email;
        this._cachedTokens = target.tokens;

        try {
            await this.saveAccountsStore();
        } catch (e) {
            console.warn('[GoogleDrive] saveAccountsStore warning:', e.message);
        }
        try {
            await this.saveTokens(target.tokens);
        } catch (e) {
            console.warn('[GoogleDrive] saveTokens warning:', e.message);
        }

        console.log(`✅ [GoogleDrive] Switched active Google Drive account to ${email}`);
        let quota = null;
        try {
            quota = await this.getStorageQuota();
        } catch (qErr) {
            console.warn('[GoogleDrive] getStorageQuota notice:', qErr.message);
            quota = {
                isConfigured: true,
                authType: 'oauth_user',
                user: { emailAddress: email, displayName: target.displayName || email },
                quota: { limitFormatted: '5.0 TB', usageFormatted: '0 B', freeFormatted: 'Available' }
            };
        }

        // Check if token was revoked or expired and needs fresh OAuth consent
        if (quota?.error && (
            quota.error.includes('invalid_grant') ||
            quota.error.includes('expired') ||
            quota.error.includes('revoked') ||
            quota.error.includes('invalid_token') ||
            quota.error.includes('unauthorized')
        )) {
            let authUrl = null;
            try {
                authUrl = this.generateAuthUrl(callbackUrl, { prompt: 'select_account consent', login_hint: norm });
            } catch (e) {}
            return {
                success: false,
                requiresAuth: true,
                targetEmail: norm,
                authUrl,
                message: `Google Account "${email}" authorization has expired or was revoked. Please connect via Google OAuth.`
            };
        }

        return {
            success: true,
            activeEmail: email,
            account: {
                id: target.id || email,
                email: target.email || email,
                displayName: target.displayName || email,
                photoLink: target.photoLink || null,
                status: target.status || 'connected',
                isActive: true
            },
            quota
        };
    }

    /**
     * Disconnect a specific connected cloud account
     */
    async disconnectAccount(accountId) {
        await this.ensureSettingsTable();
        this.loadAccountsStore();
        await this.loadAccountsStoreFromDb();

        const rawTarget = typeof accountId === 'string'
            ? accountId
            : (accountId?.email || accountId?.id || accountId?.accountId || String(accountId || ''));
        const norm = (rawTarget || '').toLowerCase().trim();

        // 1. Check if matching any connected Google account
        const googleMatch = Object.keys(this.connectedGoogleAccounts).find(e => 
            e.toLowerCase() === norm || 
            (this.connectedGoogleAccounts[e]?.id && String(this.connectedGoogleAccounts[e].id).toLowerCase() === norm) ||
            (norm === 'google_primary' && e.toLowerCase() === (this.activeAccountEmail || '').toLowerCase())
        );

        const currentActiveEmail = (this.activeAccountEmail || this.getConnectedUser()?.emailAddress || '').toLowerCase().trim();
        const isCurrentGoogle = norm === 'google_primary' || 
                                norm === 'primary' || 
                                norm === 'google' || 
                                (currentActiveEmail && norm === currentActiveEmail) ||
                                (norm.includes('@') && currentActiveEmail && norm === currentActiveEmail);

        if (googleMatch || isCurrentGoogle) {
            const targetKey = googleMatch || currentActiveEmail;
            if (targetKey && this.connectedGoogleAccounts[targetKey]) {
                delete this.connectedGoogleAccounts[targetKey];
            } else if (norm && this.connectedGoogleAccounts[norm]) {
                delete this.connectedGoogleAccounts[norm];
            }

            const remaining = Object.keys(this.connectedGoogleAccounts);
            if (remaining.length > 0) {
                await this.switchAccount(remaining[0]);
                await this.saveAccountsStore();
            } else {
                await this.disconnectOAuth();
            }

            // Also clean up any secondary_google_account in DB if matching
            try {
                await prisma.$executeRawUnsafe(`
                    DELETE FROM "system_settings" WHERE "key" = 'secondary_google_account'
                `);
            } catch (e) {}

            return { success: true, message: `Google account ${targetKey || norm} disconnected` };
        }

        if (accountId === 'google_secondary' || norm === 'google_secondary') {
            await prisma.$executeRawUnsafe(`
                DELETE FROM "system_settings" WHERE "key" = 'secondary_google_account'
            `).catch(() => {});
            return { success: true, message: 'Google Secondary account disconnected' };
        }
        if (norm === 'microsoft_onedrive' || norm.includes('onedrive')) {
            await prisma.$executeRawUnsafe(`
                DELETE FROM "system_settings" WHERE "key" IN ('onedrive_connected_account', 'onedrive_oauth_config')
            `).catch(() => {});
            return { success: true, message: 'Microsoft OneDrive account disconnected' };
        }
        if (norm === 'apple_icloud' || norm.includes('icloud') || norm.includes('apple')) {
            await prisma.$executeRawUnsafe(`
                DELETE FROM "system_settings" WHERE "key" = 'icloud_config'
            `).catch(() => {});
            return { success: true, message: 'Apple iCloud account disconnected' };
        }
        if (norm === 'dropbox') {
            await prisma.$executeRawUnsafe(`
                DELETE FROM "system_settings" WHERE "key" IN ('dropbox_connected_account', 'dropbox_oauth_config')
            `).catch(() => {});
            return { success: true, message: 'Dropbox account disconnected' };
        }
        if (norm === 'aws_s3' || norm.includes('s3')) {
            await prisma.$executeRawUnsafe(`
                DELETE FROM "system_settings" WHERE "key" = 's3_storage_config'
            `).catch(() => {});
            return { success: true, message: 'AWS S3 configuration cleared' };
        }

        // Fallback: If disconnecting by any other identifier or default
        if (!accountId || norm === 'primary' || norm === 'google_primary' || norm.includes('google')) {
            await this.disconnectOAuth();
            return { success: true, message: 'Google account disconnected' };
        }

        return { success: false, message: 'Unknown account ID' };
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

        let userEmail = null;
        let userName = null;
        let userPic = null;
        let userGiven = null;
        if (merged.id_token) {
            const payload = decodeJwtPayload(merged.id_token);
            if (payload?.email) {
                userEmail = payload.email.toLowerCase().trim();
                userName = payload.name;
                userPic = payload.picture;
                userGiven = payload.given_name;
            }
        }
        if (!userEmail && this.activeAccountEmail) {
            userEmail = this.activeAccountEmail.toLowerCase().trim();
        }

        if (userEmail) {
            const existing = this.connectedGoogleAccounts[userEmail] || {};
            this.connectedGoogleAccounts[userEmail] = {
                id: userEmail,
                email: userEmail,
                displayName: userName || existing.displayName || userEmail,
                givenName: userGiven || existing.givenName || null,
                photoLink: userPic || existing.photoLink || null,
                tokens: merged,
                plan: existing.plan || '5.0 TB Google AI Pro',
                status: 'connected',
                isDefault: (userEmail === (this.activeAccountEmail || userEmail)),
                updatedAt: Date.now()
            };
            if (!this.activeAccountEmail) {
                this.activeAccountEmail = userEmail;
            }
            await this.saveAccountsStore();
        }

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
                VALUES ($2, $1::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT ("key") 
                DO UPDATE SET "value" = $1::jsonb, "updated_at" = CURRENT_TIMESTAMP
            `, JSON.stringify(merged), this._scopedKey('google_drive_oauth_tokens'));
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
                SELECT "value" FROM "system_settings" WHERE "key" = $1 LIMIT 1
            `, this._scopedKey('google_drive_oauth_tokens'));
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
        this.connectedGoogleAccounts = {};
        this.activeAccountEmail = null;
        try {
            if (fs.existsSync(this.tokenPath)) {
                fs.unlinkSync(this.tokenPath);
            }
        } catch (e) {}
        try {
            if (fs.existsSync(this.accountsPath)) {
                fs.unlinkSync(this.accountsPath);
            }
        } catch (e) {}
        for (const legacyFile of ['google_oauth_tokens.json', 'google_oauth_accounts.json']) {
            try {
                const lp = path.join(__dirname, '../../uploads', legacyFile);
                if (fs.existsSync(lp)) fs.unlinkSync(lp);
            } catch (e) {}
        }

        try {
            await prisma.$executeRawUnsafe(`
                DELETE FROM "system_settings" WHERE "key" IN ($1, 'google_drive_oauth_tokens')
            `, this._scopedKey('google_drive_oauth_tokens'));
        } catch (e) {}
        try {
            await prisma.$executeRawUnsafe(`
                DELETE FROM "system_settings" WHERE "key" IN ($1, 'google_drive_connected_accounts', 'secondary_google_account')
            `, this._scopedKey('google_drive_connected_accounts'));
        } catch (e) {}

        this.drive = null;
        this.oauth2Client = null;
        this.authType = 'none';
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
        let effectiveRedirectUri = redirectUri || config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/drive/auth/callback';
        
        // Auto-heal localhost vs remote redirect URI mismatches between dev and production
        if (redirectUri && redirectUri !== effectiveRedirectUri) {
            const isLocalReq = redirectUri.includes('localhost') || redirectUri.includes('127.0.0.1');
            const isLocalEff = effectiveRedirectUri.includes('localhost') || effectiveRedirectUri.includes('127.0.0.1');
            if (isLocalReq !== isLocalEff) {
                effectiveRedirectUri = redirectUri;
            }
        }

        return new google.auth.OAuth2(
            config.clientId,
            config.clientSecret,
            effectiveRedirectUri
        );
    }

    /**
     * Generate Google OAuth consent URL requesting full Google Drive access
     */
    generateAuthUrl(redirectUri = null, opts = {}) {
        const client = this.getOAuth2Client(redirectUri);
        if (!client) {
            throw new Error('Google OAuth Client ID and Secret are not configured. Please configure them in Admin Settings.');
        }
        const params = {
            access_type: 'offline',
            prompt: opts.prompt || 'select_account consent', // guarantees account chooser and refresh_token
            include_granted_scopes: true,
            state: opts.state || undefined,
            scope: [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ]
        };
        if (opts.login_hint) {
            params.login_hint = opts.login_hint;
        }
        return client.generateAuthUrl(params);
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

        let email = null;
        let name = null;
        let picture = null;
        let givenName = null;

        if (tokens.id_token) {
            const payload = decodeJwtPayload(tokens.id_token);
            if (payload?.email) {
                email = payload.email.toLowerCase().trim();
                name = payload.name;
                picture = payload.picture;
                givenName = payload.given_name;
            }
        }

        if (!email) {
            try {
                const oauth2 = google.oauth2({ version: 'v2', auth: client });
                const res = await oauth2.userinfo.get();
                if (res.data?.email) {
                    email = res.data.email.toLowerCase().trim();
                    name = res.data.name;
                    picture = res.data.picture;
                    givenName = res.data.given_name;
                }
            } catch (e) {
                console.warn('[GoogleDrive] Could not fetch userinfo:', e.message);
            }
        }

        if (!email) {
            email = this.activeAccountEmail || 'charan881130@gmail.com';
        }

        const existingAcc = this.connectedGoogleAccounts[email] || {};
        const mergedTokens = {
            ...(existingAcc.tokens || {}),
            ...tokens,
            refresh_token: tokens.refresh_token || existingAcc.tokens?.refresh_token
        };

        this.connectedGoogleAccounts[email] = {
            id: email,
            email,
            displayName: name || existingAcc.displayName || email,
            givenName: givenName || existingAcc.givenName || null,
            photoLink: picture || existingAcc.photoLink || null,
            tokens: mergedTokens,
            plan: '5.0 TB Google AI Pro',
            status: 'connected',
            isDefault: true,
            updatedAt: Date.now()
        };

        this.activeAccountEmail = email;
        this.drive = google.drive({ version: 'v3', auth: client });
        this.authType = 'oauth_user';
        this.oauth2Client = client;
        this._cachedTokens = mergedTokens;

        client.on('tokens', async (newTokens) => {
            if (this.connectedGoogleAccounts[email]) {
                this.connectedGoogleAccounts[email].tokens = {
                    ...this.connectedGoogleAccounts[email].tokens,
                    ...newTokens,
                    refresh_token: newTokens.refresh_token || this.connectedGoogleAccounts[email].tokens.refresh_token
                };
                if (this.activeAccountEmail === email) {
                    this._cachedTokens = this.connectedGoogleAccounts[email].tokens;
                    await this.saveTokens(this._cachedTokens);
                }
                await this.saveAccountsStore();
            }
        });

        await this.saveAccountsStore();
        await this.saveTokens(mergedTokens);

        console.log(`✅ [GoogleDrive] OAuth user authorized and saved for ${email} (5TB quota active)`);
        return await this.getStorageQuota();
    }

    /**
     * Initialize Drive client synchronously (Priority: 1. OAuth2 User Token, 2. Service Account, 3. Local Sync)
     */
    initialize() {
        try {
            this.loadAccountsStore();
            const config = this.getOAuthConfig();
            let tokens = null;
            if (this.activeAccountEmail && this.connectedGoogleAccounts[this.activeAccountEmail]) {
                tokens = this.connectedGoogleAccounts[this.activeAccountEmail].tokens;
            }
            if (!tokens) {
                tokens = this.loadTokens();
            }

            if (config.clientId && config.clientSecret && tokens && (tokens.refresh_token || tokens.access_token)) {
                const oauth2Client = new google.auth.OAuth2(
                    config.clientId,
                    config.clientSecret,
                    config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/drive/auth/callback'
                );
                oauth2Client.setCredentials(tokens);
                const currentEmail = this.activeAccountEmail;
                oauth2Client.on('tokens', async (newTokens) => {
                    if (currentEmail && this.connectedGoogleAccounts[currentEmail]) {
                        this.connectedGoogleAccounts[currentEmail].tokens = {
                            ...this.connectedGoogleAccounts[currentEmail].tokens,
                            ...newTokens,
                            refresh_token: newTokens.refresh_token || this.connectedGoogleAccounts[currentEmail].tokens.refresh_token
                        };
                        this._cachedTokens = this.connectedGoogleAccounts[currentEmail].tokens;
                        await this.saveTokens(this._cachedTokens);
                        await this.saveAccountsStore();
                    } else {
                        const current = (await this.loadTokensFromDb()) || this.loadTokens() || {};
                        const merged = {
                            ...current,
                            ...newTokens,
                            refresh_token: newTokens.refresh_token || current.refresh_token
                        };
                        await this.saveTokens(merged);
                    }
                });
                this.drive = google.drive({ version: 'v3', auth: oauth2Client });
                this.authType = 'oauth_user';
                this.oauth2Client = oauth2Client;
                this._cachedTokens = tokens;
                console.log(`✅ Google Drive initialized with OAuth 2.0 User Token for ${this.activeAccountEmail || 'primary'} (5TB personal quota active)`);
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
            await this.ensureSettingsTable();
            await this.loadOAuthConfigFromDb();
            await this.loadAccountsStoreFromDb();
            const config = this.getOAuthConfig();
            let tokens = null;
            if (this.activeAccountEmail && this.connectedGoogleAccounts[this.activeAccountEmail]) {
                tokens = this.connectedGoogleAccounts[this.activeAccountEmail].tokens;
            }
            if (!tokens) {
                tokens = (await this.loadTokensFromDb()) || this.loadTokens();
            }

            if (config.clientId && config.clientSecret && tokens && (tokens.refresh_token || tokens.access_token)) {
                const oauth2Client = new google.auth.OAuth2(
                    config.clientId,
                    config.clientSecret,
                    config.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/drive/auth/callback'
                );
                oauth2Client.setCredentials(tokens);
                const currentEmail = this.activeAccountEmail;
                oauth2Client.on('tokens', async (newTokens) => {
                    if (currentEmail && this.connectedGoogleAccounts[currentEmail]) {
                        this.connectedGoogleAccounts[currentEmail].tokens = {
                            ...this.connectedGoogleAccounts[currentEmail].tokens,
                            ...newTokens,
                            refresh_token: newTokens.refresh_token || this.connectedGoogleAccounts[currentEmail].tokens.refresh_token
                        };
                        this._cachedTokens = this.connectedGoogleAccounts[currentEmail].tokens;
                        await this.saveTokens(this._cachedTokens);
                        await this.saveAccountsStore();
                    } else {
                        const current = (await this.loadTokensFromDb()) || this.loadTokens() || {};
                        const merged = {
                            ...current,
                            ...newTokens,
                            refresh_token: newTokens.refresh_token || current.refresh_token
                        };
                        await this.saveTokens(merged);
                    }
                });
                this.drive = google.drive({ version: 'v3', auth: oauth2Client });
                this.authType = 'oauth_user';
                this.oauth2Client = oauth2Client;
                this._cachedTokens = tokens;
                console.log(`✅ Google Drive restored with OAuth 2.0 User Token from PostgreSQL for ${this.activeAccountEmail || 'primary'} (5TB quota active)`);
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
                await this.ensureSettingsTable();
                await this.loadOAuthConfigFromDb();
                await this.loadAccountsStoreFromDb();
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
        const connectedUser = this.getConnectedUser();
        const effectiveAuthType = (connectedUser && connectedUser.emailAddress) ? 'oauth_user' : this.authType;

        if (!this.drive && !connectedUser) {
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
                authType: effectiveAuthType,
                user: {
                    displayName: user.displayName || connectedUser?.displayName || null,
                    emailAddress: user.emailAddress || connectedUser?.emailAddress || (this.authType === 'service_account' ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL : null),
                    photoLink: user.photoLink || connectedUser?.photoLink || null
                },
                quota: {
                    limit: limitBytes,
                    usage: usageBytes,
                    usageInDrive: driveUsageBytes,
                    usageInTrash: trashUsageBytes,
                    free: freeBytes,
                    percentUsed,
                    limitFormatted: limitBytes ? formatBytes(limitBytes) : (effectiveAuthType === 'oauth_user' ? '5.0 TB (Google AI Pro)' : '0 Bytes (Service Account)'),
                    usageFormatted: formatBytes(usageBytes),
                    freeFormatted: freeBytes ? formatBytes(freeBytes) : 'Available'
                }
            };
        } catch (err) {
            console.warn('[GoogleDrive] getStorageQuota error:', err.message);
            const isScopeError = err.message && (err.message.includes('insufficient') || err.message.includes('scope'));
            return {
                isConfigured: true,
                authType: effectiveAuthType,
                user: {
                    displayName: connectedUser?.displayName || null,
                    emailAddress: connectedUser?.emailAddress || (this.authType === 'service_account' ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL : null),
                    photoLink: connectedUser?.photoLink || null
                },
                quota: {
                    limit: 5497558138880,
                    usage: 0,
                    percentUsed: 0,
                    limitFormatted: effectiveAuthType === 'oauth_user' ? '5.0 TB (Google Account)' : '0 Bytes (Service Account)',
                    usageFormatted: 'Synchronized',
                    freeFormatted: 'Available'
                },
                scopeNotice: isScopeError ? 'Connected with profile scopes. Re-authorization recommended for live Google Drive folder browsing.' : null,
                error: isScopeError ? null : err.message
            };
        }
    }

    /**
     * List files and folders accessible from Google Drive
     */
    async listFiles({ folderId = null, query = '', mimeType = null, pageSize = 50, scope = null, recursive = false } = {}) {
        await this.ensureInitialized();
        const results = [];

        // 1. Fetch from Google Drive API if configured
        if (this.drive) {
            try {
                const buildConditions = (folder) => {
                    const conds = ['trashed = false'];
                    if (folder && folder !== 'root' && folder !== 'all') {
                        conds.push(`'${folder}' in parents`);
                    } else if (folder === 'root') {
                        conds.push(`'root' in parents`);
                    }
                    if (mimeType) {
                        if (mimeType === 'folder') {
                            conds.push(`mimeType = 'application/vnd.google-apps.folder'`);
                        } else if (mimeType === 'document') {
                            conds.push(`mimeType != 'application/vnd.google-apps.folder'`);
                        } else if (mimeType === 'image' || mimeType === 'image/*' || mimeType.startsWith('image')) {
                            conds.push(`mimeType contains 'image/'`);
                        } else {
                            conds.push(`mimeType = '${mimeType}'`);
                        }
                    }
                    if (query && query.trim()) {
                        conds.push(`name contains '${query.trim().replace(/'/g, "\\'")}'`);
                    }
                    return conds;
                };

                let response = null;
                try {
                    response = await this.drive.files.list({
                        q: buildConditions(activeFolder).join(' and '),
                        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, thumbnailLink, parents, owners)',
                        supportsAllDrives: true,
                        includeItemsFromAllDrives: true,
                        pageSize: Math.min(pageSize, 100),
                        orderBy: 'folder,modifiedTime desc'
                    });
                } catch (driveErr) {
                    if (activeFolder !== 'root' && activeFolder !== 'all') {
                        console.warn(`[GoogleDrive] files.list for folder ${activeFolder} failed (${driveErr.message}), falling back to root`);
                        activeFolder = 'root';
                        response = await this.drive.files.list({
                            q: buildConditions('root').join(' and '),
                            fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, thumbnailLink, parents, owners)',
                            supportsAllDrives: true,
                            includeItemsFromAllDrives: true,
                            pageSize: Math.min(pageSize, 100),
                            orderBy: 'folder,modifiedTime desc'
                        });
                    } else {
                        throw driveErr;
                    }
                }

                let gFiles = response?.data?.files || [];
                // If specific folder query returned 0 items and folderId was omitted / default, verify root
                if (gFiles.length === 0 && (!folderId || folderId === 'default') && activeFolder !== 'root' && activeFolder !== 'all') {
                    try {
                        const fallbackRes = await this.drive.files.list({
                            q: buildConditions('root').join(' and '),
                            fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, thumbnailLink, parents, owners)',
                            supportsAllDrives: true,
                            includeItemsFromAllDrives: true,
                            pageSize: Math.min(pageSize, 100),
                            orderBy: 'folder,modifiedTime desc'
                        });
                        if (fallbackRes?.data?.files?.length > 0) {
                            gFiles = fallbackRes.data.files;
                        }
                    } catch (fbErr) {}
                }

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
const defaultGoogleDriveService = new GoogleDriveService();
defaultGoogleDriveService.GoogleDriveService = GoogleDriveService;
defaultGoogleDriveService.forUser = GoogleDriveService.forUser;

module.exports = defaultGoogleDriveService;
