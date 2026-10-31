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
const practiceDatabaseService = require('../services/practiceDatabase.service');
const studentCodeReviewService = require('../services/studentCodeReview.service');

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
 * Executes Python 3 code locally in an isolated student workspace with standard IO, file IO, and persistent SQLite database connectivity
 */
function runPythonLocally(code, stdin = '', userId = 'guest') {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const studentDir = getStudentWorkspaceDir(userId);
        const dbPath = getStudentDbPath(userId);

        // Ensure practice.sqlite exists and provide common database aliases in the student directory
        if (!fs.existsSync(dbPath)) {
            try {
                // Initialize clean SQLite database file
                execFile('sqlite3', [dbPath, 'VACUUM;'], () => {});
            } catch (e) {}
        }

        // Link convenience aliases: practice.db and school.db pointing to practice.sqlite
        const aliases = ['practice.db', 'school.db'];
        for (const alias of aliases) {
            const aliasPath = path.join(studentDir, alias);
            if (!fs.existsSync(aliasPath) && fs.existsSync(dbPath)) {
                try {
                    fs.linkSync(dbPath, aliasPath);
                } catch (e) {
                    try { fs.copyFileSync(dbPath, aliasPath); } catch (e2) {}
                }
            }
        }

        const tmpFile = path.join(studentDir, `ulrms_py_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.py`);

        try {
            fs.writeFileSync(tmpFile, code, 'utf8');
        } catch (e) {
            return reject(e);
        }

        const dbConfig = practiceDatabaseService.config;
        const cleanDbName = practiceDatabaseService.getSanitizedDbName(userId);

        const child = execFile('python3', [tmpFile], {
            cwd: studentDir,
            timeout: 10000,
            maxBuffer: 1024 * 1024 * 4,
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8',
                PRACTICE_DB_ENGINE: dbConfig.activeEngine,
                MYSQL_HOST: dbConfig.mysql.host,
                MYSQL_PORT: String(dbConfig.mysql.port),
                MYSQL_USER: dbConfig.mysql.user,
                MYSQL_PASSWORD: dbConfig.mysql.password || '',
                MYSQL_DATABASE: cleanDbName,
                PRACTICE_DB_PATH: dbPath,
                SQLITE_DB: dbPath
            }
        }, (err, stdout, stderr) => {
            const duration = Date.now() - start;
            try { fs.unlinkSync(tmpFile); } catch (e) {}

            if (err && err.code === 'ENOENT') {
                return reject(new Error('python3 executable not found on host system'));
            }

            // Check if any sqlite tables exist or were modified by the Python script
            execFile('sqlite3', [dbPath, '-json', 'SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "sqlite_%";'], (tErr, tStdout) => {
                let existingTables = [];
                try {
                    if (tStdout && tStdout.trim().startsWith('[')) {
                        const parsed = JSON.parse(tStdout);
                        existingTables = parsed.map(p => p.name);
                    }
                } catch (e) {}

                resolve({
                    stdout: stdout || '',
                    stderr: stderr || (err ? err.message : ''),
                    exitCode: err ? (err.code || 1) : 0,
                    durationMs: duration,
                    isLocal: true,
                    existingTables
                });
            });
        });

        // Ensure newline for stdin so input() in Python consumes without hanging
        const formattedStdin = (stdin && !stdin.endsWith('\n')) ? (stdin + '\n') : stdin;
        if (formattedStdin) {
            try {
                child.stdin.write(formattedStdin);
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
            const localResult = await runPythonLocally(code, stdin, userId);
            return res.json({
                success: true,
                data: {
                    stdout: localResult.stdout,
                    stderr: localResult.stderr,
                    durationMs: localResult.durationMs,
                    exitCode: localResult.exitCode,
                    runner: 'local-python3',
                    existingTables: localResult.existingTables || []
                }
            });
        } catch (localErr) {
            console.warn('Local Python execution failed, falling back to Wandbox:', localErr.message);
        }
    }

    // 2. Try persistent execution for SQL (using admin-preselected engine: MySQL or SQLite3)
    if (langNormalized === 'sql' || langNormalized === 'sqlite' || langNormalized === 'mysql') {
        try {
            const studentDbPath = getStudentDbPath(userId);
            const localResult = await practiceDatabaseService.executeSql(code, userId, studentDbPath);
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
                    runner: localResult.runner || 'local-sql',
                    engine: localResult.engine || practiceDatabaseService.config.activeEngine,
                    databaseName: localResult.databaseName || null
                }
            });
        } catch (localErr) {
            console.warn('Practice SQL execution failed:', localErr.message);
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

    // Query tables created in student's persistent database under active engine (MySQL or SQLite)
    const existingTables = await practiceDatabaseService.getExistingTables(targetUserId, studentDbPath);

    // Fetch student review data
    const reviewData = studentCodeReviewService.getStudentReviewData(targetUserId);

    return res.json({
        success: true,
        data: {
            ...workspaceData,
            existingTables,
            reviewData,
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
 * @desc    Reset student's persistent database to a blank state (MySQL or SQLite)
 * @access  Private
 */
router.post('/reset-db', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user?.id || 'guest';
    const studentDbPath = getStudentDbPath(userId);

    const resetResult = await practiceDatabaseService.resetStudentDatabase(userId, studentDbPath);

    return res.json({
        success: true,
        message: resetResult.message || 'Persistent practice database reset successfully',
        data: resetResult
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

/**
 * =========================================================================
 * PRACTICE DATABASE ENGINE CONFIGURATION ENDPOINTS (Option B Preselection)
 * =========================================================================
 */

/**
 * @route   GET /api/compiler/engine/config
 * @desc    Get current practice SQL engine configuration and live status
 * @access  Private (All authenticated users)
 */
router.get('/engine/config', authenticate, asyncHandler(async (req, res) => {
    const config = await practiceDatabaseService.getEngineConfig();
    return res.json({
        success: true,
        data: config
    });
}));

/**
 * @route   POST /api/compiler/engine/config
 * @desc    Update practice SQL engine preselection globally across the app
 * @access  Private (Admins, Principals, and Instructors only)
 */
router.post('/engine/config', authenticate, asyncHandler(async (req, res) => {
    const userRole = req.user?.role;
    const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor' || userRole === 'principal';

    if (!isInstructorOrAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only administrators and instructors can configure the practice database engine.'
        });
    }

    const { activeEngine, fallbackToSqlite, mysql: mysqlUpdates } = req.body;

    try {
        const updatedConfig = await practiceDatabaseService.updateEngineConfig({
            activeEngine,
            fallbackToSqlite,
            mysql: mysqlUpdates
        }, req.user);

        return res.json({
            success: true,
            message: `Practice SQL engine updated to ${updatedConfig.activeEngine.toUpperCase()}`,
            data: updatedConfig
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'Failed to update database engine configuration'
        });
    }
}));

/**
 * =========================================================================
 * STUDENT WORK INSPECTION, CODE REVIEWS & BULK AI FEEDBACK ENDPOINTS
 * =========================================================================
 */

/**
 * @route   GET /api/compiler/students-inspection
 * @desc    Get enriched list of students with last active datetime, workspace stats & review badges
 * @access  Private (Instructors, Admins, Principals only)
 */
router.get('/students-inspection', authenticate, asyncHandler(async (req, res) => {
    const userRole = req.user?.role;
    const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor' || userRole === 'principal';

    if (!isInstructorOrAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only instructors and administrators can inspect student work.'
        });
    }

    const schoolId = req.user?.schoolId;
    const inspectionList = await studentCodeReviewService.getStudentsInspectionList({ schoolId });

    return res.json({
        success: true,
        data: inspectionList
    });
}));

/**
 * @route   GET /api/compiler/student-workspace/:studentId
 * @desc    Retrieve full workspace and review history for a specific student
 * @access  Private (Instructors, Admins, Principals only)
 */
router.get('/student-workspace/:studentId', authenticate, asyncHandler(async (req, res) => {
    const userRole = req.user?.role;
    const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor' || userRole === 'principal';

    if (!isInstructorOrAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only instructors and administrators can inspect student workspaces.'
        });
    }

    const { studentId } = req.params;

    const studentRecord = await prisma.user.findUnique({
        where: { id: studentId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            admissionNumber: true,
            studentId: true,
            classEnrollments: {
                select: {
                    rollNumber: true,
                    class: { select: { id: true, name: true, section: true } }
                },
                take: 1
            }
        }
    });

    if (!studentRecord) {
        return res.status(404).json({
            success: false,
            message: 'Student record not found.'
        });
    }

    const dir = getStudentWorkspaceDir(studentId);
    const workspaceFile = path.join(dir, 'workspace.json');
    const studentDbPath = getStudentDbPath(studentId);

    let workspaceData = {
        pythonCode: null,
        sqlCode: null,
        pythonFlowchart: null,
        sqlErDiagram: null,
        flowchartCanvasData: null,
        tabs: null,
        activeTabId: null,
        updatedAt: null
    };

    if (fs.existsSync(workspaceFile)) {
        try {
            const raw = fs.readFileSync(workspaceFile, 'utf8');
            workspaceData = { ...workspaceData, ...JSON.parse(raw) };
        } catch (_) {}
    }

    const existingTables = await practiceDatabaseService.getExistingTables(studentId, studentDbPath);
    const reviewData = studentCodeReviewService.getStudentReviewData(studentId);

    const enrollment = studentRecord.classEnrollments[0];
    const className = enrollment?.class?.name 
        ? `${enrollment.class.name}${enrollment.class.section ? ` - ${enrollment.class.section}` : ''}`
        : 'General';

    return res.json({
        success: true,
        data: {
            ...workspaceData,
            existingTables,
            reviewData,
            studentInfo: {
                id: studentRecord.id,
                name: `${studentRecord.firstName} ${studentRecord.lastName || ''}`.trim(),
                email: studentRecord.email,
                admissionNumber: studentRecord.admissionNumber || studentRecord.studentId || 'N/A',
                rollNumber: enrollment?.rollNumber || 'N/A',
                className
            }
        }
    });
}));

/**
 * @route   POST /api/compiler/student-workspace/:studentId/review
 * @desc    Save an instructor manual code review or edited AI suggestions
 * @access  Private (Instructors, Admins, Principals only)
 */
router.post('/student-workspace/:studentId/review', authenticate, [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('status').isIn(['reviewed', 'needs_improvement', 'excellent']).withMessage('Invalid review status'),
    body('comments').optional().isString(),
    body('suggestions').optional().isArray()
], asyncHandler(async (req, res) => {
    const userRole = req.user?.role;
    const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor' || userRole === 'principal';

    if (!isInstructorOrAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only instructors and administrators can submit code reviews.'
        });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { studentId } = req.params;
    const { rating, status, comments, suggestions } = req.body;

    const savedReview = studentCodeReviewService.saveStudentReview(studentId, {
        rating,
        status,
        comments,
        suggestions,
        isAiGenerated: false
    }, req.user);

    return res.json({
        success: true,
        message: 'Review saved and delivered to student successfully',
        data: savedReview
    });
}));

/**
 * @route   POST /api/compiler/student-workspace/:studentId/ai-review
 * @desc    Generate AI Code Review with Big-O Complexity, Suggestions & Rating
 * @access  Private (Instructors, Admins, Principals only)
 */
router.post('/student-workspace/:studentId/ai-review', authenticate, asyncHandler(async (req, res) => {
    const userRole = req.user?.role;
    const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor' || userRole === 'principal';

    if (!isInstructorOrAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only instructors and administrators can request AI code reviews.'
        });
    }

    const { studentId } = req.params;
    const { autoSave = false } = req.body;

    const studentRecord = await prisma.user.findUnique({
        where: { id: studentId },
        select: { firstName: true, lastName: true }
    });

    const studentName = studentRecord ? `${studentRecord.firstName} ${studentRecord.lastName || ''}`.trim() : 'Student';

    const dir = getStudentWorkspaceDir(studentId);
    const workspaceFile = path.join(dir, 'workspace.json');
    const studentDbPath = getStudentDbPath(studentId);

    let files = [];
    if (fs.existsSync(workspaceFile)) {
        try {
            const ws = JSON.parse(fs.readFileSync(workspaceFile, 'utf8'));
            if (Array.isArray(ws.tabs) && ws.tabs.length > 0) {
                files = ws.tabs.map(t => ({ name: t.name, language: t.language, code: t.code }));
            } else {
                if (ws.pythonCode) files.push({ name: 'main.py', language: 'python', code: ws.pythonCode });
                if (ws.sqlCode) files.push({ name: 'schema.sql', language: 'sql', code: ws.sqlCode });
            }
        } catch (_) {}
    }

    const existingTables = await practiceDatabaseService.getExistingTables(studentId, studentDbPath);

    const aiReview = await studentCodeReviewService.generateAiReview({
        studentName,
        files,
        existingTables
    });

    let savedReview = null;
    if (autoSave) {
        savedReview = studentCodeReviewService.saveStudentReview(studentId, {
            ...aiReview,
            reviewedBy: req.user ? `AI Review (Approved by ${req.user.firstName || 'Instructor'})` : 'AI Code Mentor'
        }, req.user);
    }

    return res.json({
        success: true,
        data: {
            ...aiReview,
            savedReview
        }
    });
}));

/**
 * @route   POST /api/compiler/students-bulk-ai-review
 * @desc    Trigger Bulk AI Code Review for selected students or entire class
 * @access  Private (Instructors, Admins, Principals only)
 */
router.post('/students-bulk-ai-review', authenticate, [
    body('studentIds').isArray({ min: 1 }).withMessage('Array of studentIds is required')
], asyncHandler(async (req, res) => {
    const userRole = req.user?.role;
    const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor' || userRole === 'principal';

    if (!isInstructorOrAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only instructors and administrators can perform bulk AI code reviews.'
        });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { studentIds } = req.body;
    const bulkResults = await studentCodeReviewService.runBulkAiReview(studentIds, req.user);

    return res.json({
        success: true,
        message: `Bulk AI review complete: ${bulkResults.successCount} succeeded, ${bulkResults.failedCount} failed`,
        data: bulkResults
    });
}));

/**
 * @route   GET /api/compiler/my-review
 * @desc    Get current student's latest code review and suggestions
 * @access  Private (Student)
 */
router.get('/my-review', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user?.id || 'guest';
    const reviewData = studentCodeReviewService.getStudentReviewData(userId);

    return res.json({
        success: true,
        data: reviewData
    });
}));

module.exports = router;
