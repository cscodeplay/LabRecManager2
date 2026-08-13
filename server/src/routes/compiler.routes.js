const express = require('express');
const router = express.Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Maps common language names to Piston language identifiers and versions
 */
const getPistonConfig = (language) => {
    const langMap = {
        'python': { language: 'python', version: '3.10.0' },
        'python3': { language: 'python', version: '3.10.0' },
        'c': { language: 'c', version: '10.2.0' },
        'c++': { language: 'c++', version: '10.2.0' },
        'cpp': { language: 'c++', version: '10.2.0' },
        'java': { language: 'java', version: '15.0.2' },
        'sql': { language: 'sqlite3', version: '3.36.0' },
        'javascript': { language: 'javascript', version: '18.15.0' },
        'node': { language: 'javascript', version: '18.15.0' },
    };
    return langMap[language.toLowerCase()] || null;
};

/**
 * @route   POST /api/compiler/execute
 * @desc    Compile and execute code using Piston API
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

    const { language, code, stdin } = req.body;
    
    const config = getPistonConfig(language);
    if (!config) {
        return res.status(400).json({ 
            success: false, 
            message: `Language '${language}' is not supported.` 
        });
    }

    try {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: config.language,
            version: config.version,
            files: [
                {
                    content: code
                }
            ],
            stdin: stdin || "",
            compile_timeout: 10000,
            run_timeout: 3000,
            compile_memory_limit: -1,
            run_memory_limit: -1
        });

        if (response.data && response.data.run) {
            return res.json({
                success: true,
                data: {
                    stdout: response.data.run.stdout,
                    stderr: response.data.run.stderr,
                    code: response.data.run.code,
                    compile_stderr: response.data.compile ? response.data.compile.stderr : null
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

module.exports = router;
