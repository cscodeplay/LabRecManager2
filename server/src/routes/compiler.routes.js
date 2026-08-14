const express = require('express');
const router = express.Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Maps common language names to Piston language identifiers and versions
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
        'javascript': 'nodejs-20.17.0',
        'node': 'nodejs-20.17.0',
    };
    return langMap[language.toLowerCase()] || null;
};

/**
 * @route   POST /api/compiler/execute
 * @desc    Compile and execute code using Wandbox API
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
    
    const compiler = getWandboxCompiler(language);
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
            stdin: stdin || ""
        });

        if (response.data) {
            return res.json({
                success: true,
                data: {
                    stdout: response.data.program_message || '',
                    stderr: response.data.program_error || '',
                    compile_stderr: response.data.compiler_error || null
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
