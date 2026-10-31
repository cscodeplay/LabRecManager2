const express = require('express');
const router = express.Router();
const axios = require('axios');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { synthesizeDiagram } = require('../utils/diagramSynthesizer');

const WORKSPACES_ROOT = path.join(__dirname, '../../storage/workspaces/students');

/**
 * Returns safe workspace directory for a user
 */
function getStudentWorkspaceDir(userId) {
    const safeUserId = (userId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dir = path.join(WORKSPACES_ROOT, safeUserId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * Returns path to student's persistent SQLite database
 */
function getStudentDbPath(userId) {
    const dir = getStudentWorkspaceDir(userId);
    return path.join(dir, 'practice.sqlite');
}

/**
 * Maps common language names to Wandbox compiler identifiers and versions
 */
const getWandboxCompiler = (language) => {
    const langMap = {
        'python': 'cpython-3.14.0',
        'python3': 'cpython-3.14.0',
        'c': 'gcc-13.2.0-c',
        'c++': 'gcc-13.2.0',
        'cpp': 'gcc-13.2.0',
        'java': 'openjdk-jdk-22+36',
        'sql': 'sqlite-3.46.1',
        'sqlite': 'sqlite-3.46.1',
        'javascript': 'nodejs-20.17.0',
        'node': 'nodejs-20.17.0',
    };
    return langMap[language.toLowerCase()] || null;
};

/**
 * Executes Python 3 code locally in an isolated sub-process with stdin and timeout
 */
function runPythonLocally(code, stdin = '') {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const tmpFile = path.join(os.tmpdir(), `ulrms_py_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.py`);
        
        try {
            fs.writeFileSync(tmpFile, code, 'utf8');
        } catch (e) {
            return reject(e);
        }

        const child = execFile('python3', [tmpFile], { timeout: 8000, maxBuffer: 1024 * 1024 * 4 }, (err, stdout, stderr) => {
            const duration = Date.now() - start;
            try { fs.unlinkSync(tmpFile); } catch (e) {}

            if (err && err.code === 'ENOENT') {
                return reject(new Error('python3 executable not found on host system'));
            }

            resolve({
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: err ? (err.code || 1) : 0,
                durationMs: duration,
                isLocal: true
            });
        });

        if (stdin) {
            try {
                child.stdin.write(stdin);
                child.stdin.end();
            } catch (e) {}
        } else {
            child.stdin.end();
        }
    });
}

/**
 * Executes SQL on a student's persistent SQLite database file
 * Preserves all CREATE TABLE, INSERT, and schema changes across sessions and logins!
 */
function runSqlLocally(code, dbPath = ':memory:') {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        // 1. Run with -header -column on the student's persistent sqlite file!
        const child = execFile('sqlite3', [dbPath, '-header', '-column'], { timeout: 8000, maxBuffer: 1024 * 1024 * 4 }, (err, stdout, stderr) => {
            const duration = Date.now() - start;

            if (err && err.code === 'ENOENT') {
                return reject(new Error('sqlite3 executable not found on host system'));
            }

            // Query existing database tables
            execFile('sqlite3', [dbPath, '-json', 'SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "sqlite_%";'], (tErr, tStdout) => {
                let existingTables = [];
                try {
                    if (tStdout && tStdout.trim().startsWith('[')) {
                        const parsed = JSON.parse(tStdout);
                        existingTables = parsed.map(p => p.name);
                    }
                } catch (e) {}

                if (err) {
                    return resolve({
                        stdout: stdout || '',
                        stderr: stderr || err.message,
                        exitCode: 1,
                        durationMs: duration,
                        isLocal: true,
                        tables: [],
                        existingTables
                    });
                }

                // If SELECT statements are in the query, extract structured JSON data
                execFile('sqlite3', [dbPath, '-json'], { timeout: 5000, maxBuffer: 1024 * 1024 * 4 }, (jErr, jStdout) => {
                    let jsonData = null;
                    try {
                        if (jStdout && jStdout.trim().startsWith('[')) {
                            jsonData = JSON.parse(jStdout);
                        }
                    } catch (e) {}

                    resolve({
                        stdout: stdout || '',
                        stderr: stderr || '',
                        exitCode: 0,
                        durationMs: duration,
                        isLocal: true,
                        tables: jsonData && Array.isArray(jsonData) && jsonData.length > 0 ? jsonData : null,
                        existingTables
                    });
                }).stdin.end(code);
            });
        });

        child.stdin.write(code);
        child.stdin.end();
    });
}

/**
 * @route   POST /api/compiler/execute
 * @desc    Compile and execute code (Fast Local Execution with Persistent Student DB + Wandbox Fallback)
 * @access  Private
 */
router.post('/execute', authenticate, [
    body('language').notEmpty().withMessage('Language is required'),
    body('code').notEmpty().withMessage('Code is required'),
    body('stdin').optional().isString()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { language, code, stdin = '' } = req.body;
    const langNormalized = (language || '').toLowerCase().trim();
    const userId = req.user?.id || 'guest';

    // 1. Try local execution for Python
    if (langNormalized === 'python' || langNormalized === 'python3') {
        try {
            const localResult = await runPythonLocally(code, stdin);
            return res.json({
                success: true,
                data: {
                    stdout: localResult.stdout,
                    stderr: localResult.stderr,
                    durationMs: localResult.durationMs,
                    exitCode: localResult.exitCode,
                    runner: 'local-python3'
                }
            });
        } catch (localErr) {
            console.warn('Local Python execution failed, falling back to Wandbox:', localErr.message);
        }
    }

    // 2. Try persistent local execution for SQL
    if (langNormalized === 'sql' || langNormalized === 'sqlite') {
        try {
            const studentDbPath = getStudentDbPath(userId);
            const localResult = await runSqlLocally(code, studentDbPath);
            return res.json({
                success: true,
                data: {
                    stdout: localResult.stdout,
                    stderr: localResult.stderr,
                    durationMs: localResult.durationMs,
                    exitCode: localResult.exitCode,
                    tables: localResult.tables,
                    existingTables: localResult.existingTables || [],
                    isPersistent: true,
                    runner: 'local-sqlite3'
                }
            });
        } catch (localErr) {
            console.warn('Local SQLite execution failed, falling back to Wandbox:', localErr.message);
        }
    }

    // 3. Fallback to Wandbox API for other languages or when local fails
    const compiler = getWandboxCompiler(langNormalized);
    if (!compiler) {
        return res.status(400).json({
            success: false,
            message: `Language '${language}' is not supported.`
        });
    }

    try {
        const response = await axios.post('https://wandbox.org/api/compile.json', {
            compiler: compiler,
            code: code,
            stdin: stdin || ''
        }, { timeout: 15000 });

        if (response.data) {
            return res.json({
                success: true,
                data: {
                    stdout: response.data.program_message || '',
                    stderr: response.data.program_error || '',
                    compile_stderr: response.data.compiler_error || null,
                    exitCode: parseInt(response.data.status, 10) || 0,
                    runner: 'wandbox'
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Unexpected response from execution engine',
                raw: response.data
            });
        }
    } catch (error) {
        console.error('Compiler API Error:', error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to execute code.',
            error: error.response?.data?.message || error.message
        });
    }
}));

/**
 * @route   GET /api/compiler/students
 * @desc    Get student list for Instructor/Admin Practice Inspection Dropdown
 * @access  Private (Instructors, Admins, Principals only)
 */
router.get('/students', authenticate, asyncHandler(async (req, res) => {
    const userRole = req.user?.role;
    const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor' || userRole === 'principal';

    if (!isInstructorOrAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only instructors and administrators can list students for inspection.'
        });
    }

    const schoolId = req.user?.schoolId;
    const students = await prisma.user.findMany({
        where: {
            role: 'student',
            isActive: true,
            ...(schoolId ? { schoolId } : {})
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            admissionNumber: true,
            studentId: true,
            classEnrollments: {
                select: {
                    class: {
                        select: { name: true, section: true }
                    }
                },
                take: 1
            }
        },
        orderBy: { firstName: 'asc' },
        take: 100
    });

    const formatted = students.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName || ''}`.trim(),
        email: s.email,
        admissionNumber: s.admissionNumber || s.studentId || 'N/A',
        className: s.classEnrollments[0]?.class?.name || 'Class'
    }));

    return res.json({
        success: true,
        data: formatted
    });
}));

/**
 * @route   GET /api/compiler/workspace
 * @desc    Retrieve saved student code, tabs, custom diagrams, settings, and persistent tables
 *          Allows Instructors/Admins to inspect a student via ?studentId=<id>
 * @access  Private
 */
router.get('/workspace', authenticate, asyncHandler(async (req, res) => {
    const requestingUserId = req.user?.id || 'guest';
    const userRole = req.user?.role;
    const requestedStudentId = req.query.studentId;

    let targetUserId = requestingUserId;
    let targetStudentInfo = null;

    if (requestedStudentId && requestedStudentId !== requestingUserId) {
        const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor' || userRole === 'principal';
        if (!isInstructorOrAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have permission to view other students\' private workspaces.'
            });
        }
        targetUserId = requestedStudentId;

        // Fetch student profile info
        const studentRecord = await prisma.user.findUnique({
            where: { id: requestedStudentId },
            select: { id: true, firstName: true, lastName: true, admissionNumber: true, email: true }
        });

        if (studentRecord) {
            targetStudentInfo = {
                id: studentRecord.id,
                name: `${studentRecord.firstName} ${studentRecord.lastName || ''}`.trim(),
                admissionNumber: studentRecord.admissionNumber || 'N/A',
                email: studentRecord.email
            };
        }
    }

    const dir = getStudentWorkspaceDir(targetUserId);
    const workspaceFile = path.join(dir, 'workspace.json');
    const studentDbPath = getStudentDbPath(targetUserId);

    let workspaceData = {
        pythonCode: null,
        sqlCode: null,
        pythonFlowchart: null,
        sqlErDiagram: null,
        flowchartCanvasData: null,
        tabs: null,
        activeTabId: null,
        isAutosaveEnabled: true,
        editorTheme: 'vs-dark',
        outputTheme: 'classic'
    };

    if (fs.existsSync(workspaceFile)) {
        try {
            const raw = fs.readFileSync(workspaceFile, 'utf8');
            workspaceData = { ...workspaceData, ...JSON.parse(raw) };
        } catch (e) {}
    }

    // Query tables created in student's persistent database
    let existingTables = [];
    if (fs.existsSync(studentDbPath)) {
        try {
            await new Promise((resolve) => {
                execFile('sqlite3', [studentDbPath, '-json', 'SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "sqlite_%";'], (err, stdout) => {
                    if (!err && stdout && stdout.trim().startsWith('[')) {
                        try {
                            const parsed = JSON.parse(stdout);
                            existingTables = parsed.map(p => p.name);
                        } catch (e) {}
                    }
                    resolve();
                });
            });
        } catch (e) {}
    }

    return res.json({
        success: true,
        data: {
            ...workspaceData,
            existingTables,
            studentInfo: targetStudentInfo,
            isInspecting: Boolean(targetStudentInfo)
        }
    });
}));

/**
 * @route   POST /api/compiler/workspace
 * @desc    Persist student practice code, multi-tabs, designed diagrams, and theme preferences to server
 * @access  Private
 */
router.post('/workspace', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user?.id || 'guest';
    const dir = getStudentWorkspaceDir(userId);
    const workspaceFile = path.join(dir, 'workspace.json');

    const {
        pythonCode,
        sqlCode,
        pythonFlowchart,
        sqlErDiagram,
        flowchartCanvasData,
        tabs,
        activeTabId,
        isAutosaveEnabled,
        editorTheme = 'vs-dark',
        outputTheme = 'classic'
    } = req.body;

    let current = {};
    if (fs.existsSync(workspaceFile)) {
        try {
            current = JSON.parse(fs.readFileSync(workspaceFile, 'utf8'));
        } catch (e) {}
    }

    const updated = {
        ...current,
        pythonCode: pythonCode !== undefined ? pythonCode : current.pythonCode,
        sqlCode: sqlCode !== undefined ? sqlCode : current.sqlCode,
        pythonFlowchart: pythonFlowchart !== undefined ? pythonFlowchart : current.pythonFlowchart,
        sqlErDiagram: sqlErDiagram !== undefined ? sqlErDiagram : current.sqlErDiagram,
        flowchartCanvasData: flowchartCanvasData !== undefined ? flowchartCanvasData : current.flowchartCanvasData,
        tabs: tabs !== undefined ? tabs : current.tabs,
        activeTabId: activeTabId !== undefined ? activeTabId : current.activeTabId,
        isAutosaveEnabled: isAutosaveEnabled !== undefined ? isAutosaveEnabled : (current.isAutosaveEnabled !== undefined ? current.isAutosaveEnabled : true),
        editorTheme: editorTheme || current.editorTheme || 'vs-dark',
        outputTheme: outputTheme || current.outputTheme || 'classic',
        updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(workspaceFile, JSON.stringify(updated, null, 2), 'utf8');

    return res.json({
        success: true,
        message: 'Student workspace saved successfully',
        data: updated
    });
}));

/**
 * @route   POST /api/compiler/reset-db
 * @desc    Reset student's persistent database to a blank state
 * @access  Private
 */
router.post('/reset-db', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user?.id || 'guest';
    const studentDbPath = getStudentDbPath(userId);

    if (fs.existsSync(studentDbPath)) {
        try {
            fs.unlinkSync(studentDbPath);
        } catch (e) {
            console.error('Failed to unlink student DB:', e);
        }
    }

    return res.json({
        success: true,
        message: 'Persistent practice database reset successfully'
    });
}));

/**
 * @route   POST /api/compiler/generate-diagram
 * @desc    Auto-generate Flowchart or ER diagram (RESTRICTED to Instructors & Admins)
 * @access  Private (Admin, Instructor, Principal only)
 */
router.post('/generate-diagram', authenticate, [
    body('language').notEmpty().withMessage('Language is required'),
    body('code').notEmpty().withMessage('Code is required'),
    body('notation').optional().isIn(['conventional', 'relational'])
], asyncHandler(async (req, res) => {
    // Access control: Auto-generation is limited to Admins, Instructors, and Principals!
    const userRole = req.user?.role;
    const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor' || userRole === 'principal';

    if (!isInstructorOrAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Diagram auto-generation is currently reserved for Instructors and Administrators. Students can design and customize diagrams directly using the Visual Designer.'
        });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { language, code, notation = 'conventional', diagramType } = req.body;

    try {
        const diagramResult = await synthesizeDiagram({
            language,
            code,
            diagramType,
            notation
        });

        return res.json({
            success: true,
            data: {
                mermaidCode: diagramResult.mermaidCode,
                isAiGenerated: diagramResult.isAiGenerated,
                notation: diagramResult.notation,
                language
            }
        });
    } catch (err) {
        console.error('Diagram Generation Error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate diagram',
            error: err.message
        });
    }
}));

module.exports = router;
