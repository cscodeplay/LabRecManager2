const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

const WORKSPACES_ROOT = path.join(__dirname, '../../storage/workspaces/students');

// Ensure root workspaces directory exists
if (!fs.existsSync(WORKSPACES_ROOT)) {
    fs.mkdirSync(WORKSPACES_ROOT, { recursive: true });
}

/**
 * Service to manage isolated student filesystem workspaces
 * for Python file handling (open, pickle, csv) and SQLite database persistence.
 */
class WorkspaceService {
    /**
     * Get or create a private workspace directory for a student.
     * @param {string} studentId
     * @returns {string} Absolute path to student's workspace
     */
    getStudentWorkspaceDir(studentId) {
        if (!studentId || typeof studentId !== 'string') {
            return WORKSPACES_ROOT;
        }
        // Sanitize studentId to prevent path traversal
        const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const dir = path.join(WORKSPACES_ROOT, safeId);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    /**
     * Auto-sync any text/data documents (.txt, .csv, .json, .dat) uploaded by or shared
     * with the student in the Documents portal into their private workspace.
     * @param {string} studentId
     */
    async syncStudentDocumentFiles(studentId) {
        if (!studentId) return;
        const workspaceDir = this.getStudentWorkspaceDir(studentId);

        try {
            // Find student's enrollments and groups to resolve shared documents
            const [enrollments, groupMembers] = await Promise.all([
                prisma.classEnrollment.findMany({
                    where: { studentId, status: 'active' },
                    select: { classId: true }
                }).catch(() => []),
                prisma.groupMember.findMany({
                    where: { studentId },
                    select: { groupId: true }
                }).catch(() => [])
            ]);

            const classIds = enrollments.map(e => e.classId);
            const groupIds = groupMembers.map(g => g.groupId);

            // Fetch accessible text/data documents
            const documents = await prisma.document.findMany({
                where: {
                    OR: [
                        { uploadedById: studentId },
                        {
                            shares: {
                                some: {
                                    OR: [
                                        { targetUserId: studentId },
                                        { targetClassId: { in: classIds } },
                                        { targetGroupId: { in: groupIds } }
                                    ]
                                }
                            }
                        }
                    ],
                    fileType: {
                        in: ['text/plain', 'text/csv', 'application/json', 'application/octet-stream']
                    }
                },
                select: {
                    id: true,
                    title: true,
                    originalName: true,
                    fileUrl: true,
                    fileType: true
                },
                take: 20
            }).catch(() => []);

            for (const doc of documents) {
                const targetFileName = (doc.originalName || doc.title || `doc_${doc.id}.txt`).replace(/[^a-zA-Z0-9._-]/g, '_');
                const targetFilePath = path.join(workspaceDir, targetFileName);

                // If file already exists locally in workspace, do not overwrite unless 0 bytes
                if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).size > 0) {
                    continue;
                }

                // If local file path exists on server disk
                if (doc.fileUrl && fs.existsSync(doc.fileUrl)) {
                    fs.copyFileSync(doc.fileUrl, targetFilePath);
                } else if (doc.fileUrl && doc.fileUrl.startsWith('http')) {
                    // Try to fetch via axios with short timeout
                    try {
                        const axios = require('axios');
                        const res = await axios.get(doc.fileUrl, { responseType: 'arraybuffer', timeout: 3000 });
                        fs.writeFileSync(targetFilePath, Buffer.from(res.data));
                    } catch {
                        // ignore network errors for offline/sandbox mode
                    }
                }
            }
        } catch (err) {
            console.warn('[WorkspaceService] Error syncing student documents:', err.message);
        }
    }

    /**
     * List all files currently residing in the student's private workspace.
     * @param {string} studentId
     * @returns {Array<object>}
     */
    listWorkspaceFiles(studentId) {
        const workspaceDir = this.getStudentWorkspaceDir(studentId);
        if (!fs.existsSync(workspaceDir)) return [];

        try {
            const fileNames = fs.readdirSync(workspaceDir);
            const list = [];

            for (const f of fileNames) {
                // Ignore hidden/system files
                if (f.startsWith('.')) continue;

                const fullPath = path.join(workspaceDir, f);
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.isFile()) {
                        const ext = path.extname(f).toLowerCase();
                        const isDb = ['.db', '.sqlite', '.sqlite3'].includes(ext);
                        const isText = ['.txt', '.csv', '.json', '.log', '.md', '.py', '.sql'].includes(ext);
                        const isData = ['.dat', '.bin', '.pkl', '.pickle'].includes(ext);

                        list.push({
                            name: f,
                            size: stats.size,
                            modifiedAt: stats.mtime,
                            extension: ext,
                            isDb,
                            isText,
                            isData
                        });
                    }
                } catch {
                    // ignore inaccessible files
                }
            }

            return list.sort((a, b) => b.modifiedAt - a.modifiedAt);
        } catch (err) {
            console.error('[WorkspaceService] Error listing files:', err.message);
            return [];
        }
    }

    /**
     * Safely read content of a file in the student's workspace.
     * @param {string} studentId
     * @param {string} fileName
     */
    readWorkspaceFile(studentId, fileName) {
        const workspaceDir = this.getStudentWorkspaceDir(studentId);
        const safeName = path.basename(fileName); // Prevents path traversal
        const fullPath = path.join(workspaceDir, safeName);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`File '${safeName}' does not exist in your workspace`);
        }

        const stats = fs.statSync(fullPath);
        const ext = path.extname(safeName).toLowerCase();
        const isDb = ['.db', '.sqlite', '.sqlite3'].includes(ext);

        if (isDb) {
            return {
                name: safeName,
                size: stats.size,
                isDb: true,
                message: `SQLite database file (${(stats.size / 1024).toFixed(1)} KB)`
            };
        }

        // Limit reading to 500KB for text preview
        const maxBytes = 500 * 1024;
        const fd = fs.openSync(fullPath, 'r');
        const buf = Buffer.alloc(Math.min(stats.size, maxBytes));
        fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);

        return {
            name: safeName,
            size: stats.size,
            isDb: false,
            content: buf.toString('utf8'),
            truncated: stats.size > maxBytes
        };
    }

    /**
     * Clear all files created inside the student's workspace.
     * @param {string} studentId
     */
    resetWorkspace(studentId) {
        const workspaceDir = this.getStudentWorkspaceDir(studentId);
        if (!fs.existsSync(workspaceDir)) return;

        const files = fs.readdirSync(workspaceDir);
        for (const f of files) {
            try {
                const fullPath = path.join(workspaceDir, f);
                if (fs.statSync(fullPath).isFile()) {
                    fs.unlinkSync(fullPath);
                }
            } catch {}
        }
    }

    /**
     * Upload or write a custom file directly to student workspace.
     * @param {string} studentId
     * @param {string} fileName
     * @param {string|Buffer} content
     */
    writeWorkspaceFile(studentId, fileName, content) {
        const workspaceDir = this.getStudentWorkspaceDir(studentId);
        const safeName = path.basename(fileName);
        const fullPath = path.join(workspaceDir, safeName);
        fs.writeFileSync(fullPath, content);
        return {
            name: safeName,
            size: Buffer.byteLength(content)
        };
    }
}

module.exports = new WorkspaceService();
