const express = require('express');
const router = express.Router();
const axios = require('axios');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { synthesizeDiagram } = require('../utils/diagramSynthesizer');

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
 * Executes SQL in an in-memory SQLite database locally with structured JSON parsing
 */
function runSqlLocally(code) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        // Run with -header -column
        const child = execFile('sqlite3', [':memory:', '-header', '-column'], { timeout: 8000, maxBuffer: 1024 * 1024 * 4 }, (err, stdout, stderr) => {
            const duration = Date.now() - start;

            if (err && err.code === 'ENOENT') {
                return reject(new Error('sqlite3 executable not found on host system'));
            }

            // Check if there is an error in execution
            if (err) {
                return resolve({
                    stdout: stdout || '',
                    stderr: stderr || err.message,
                    exitCode: 1,
                    durationMs: duration,
                    isLocal: true,
                    tables: []
                });
            }

            // If SELECT statements are in the query, attempt to parse structured JSON output
            execFile('sqlite3', [':memory:', '-json'], { timeout: 5000, maxBuffer: 1024 * 1024 * 4 }, (jErr, jStdout) => {
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
                    tables: jsonData && Array.isArray(jsonData) && jsonData.length > 0 ? jsonData : null
                });
            }).stdin.end(code);
        });

        child.stdin.write(code);
        child.stdin.end();
    });
}

/**
 * @route   POST /api/compiler/execute
 * @desc    Compile and execute code (Fast Local Execution + Wandbox Fallback)
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

    // 2. Try local execution for SQL
    if (langNormalized === 'sql' || langNormalized === 'sqlite') {
        try {
            const localResult = await runSqlLocally(code);
            return res.json({
                success: true,
                data: {
                    stdout: localResult.stdout,
                    stderr: localResult.stderr,
                    durationMs: localResult.durationMs,
                    exitCode: localResult.exitCode,
                    tables: localResult.tables,
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
 * @route   POST /api/compiler/generate-diagram
 * @desc    Generate conventional Flowcharts (Python) or ER Diagrams (SQL) using ANSI/Chen standard shapes
 * @access  Private
 */
router.post('/generate-diagram', authenticate, [
    body('language').notEmpty().withMessage('Language is required'),
    body('code').notEmpty().withMessage('Code is required'),
    body('notation').optional().isIn(['conventional', 'relational'])
], asyncHandler(async (req, res) => {
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
