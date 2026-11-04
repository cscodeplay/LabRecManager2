const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const practiceDatabaseService = require('../services/practiceDatabase.service');

const WORKSPACES_ROOT = path.join(__dirname, '../../storage/workspaces/students');

/**
 * Returns safe workspace directory for a student user
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
 * Interactive Python wrapper injected at the top of the executed script.
 * Overrides builtins.input() to communicate step-by-step with the socket runner.
 */
const INTERACTIVE_INPUT_WRAPPER = `
import sys, builtins, json, base64

_real_input = builtins.input
def _interactive_input(prompt=""):
    try:
        req = json.dumps({"prompt": str(prompt)})
        b64 = base64.b64encode(req.encode("utf-8")).decode("ascii")
        sys.stdout.flush()
        sys.stdout.write(f"\\n__ULRMS_PROMPT__:{b64}\\n")
        sys.stdout.flush()
        line = sys.stdin.readline()
        if not line:
            raise EOFError("EOF when reading a line")
        return line.rstrip("\\r\\n")
    except Exception as e:
        if isinstance(e, EOFError):
            raise
        return _real_input(prompt)

builtins.input = _interactive_input
`;

/**
 * Parses stdout stream chunks to detect and extract __ULRMS_PROMPT__ control lines
 */
function processStdoutChunk(chunk, buffer, onStdout, onPrompt) {
    let buf = buffer + chunk;
    const marker = '__ULRMS_PROMPT__:';

    while (buf.length > 0) {
        const promptIdx = buf.indexOf(marker);
        if (promptIdx === -1) {
            let possiblePrefix = false;
            for (let i = 1; i < marker.length; i++) {
                if (buf.endsWith(marker.substring(0, i))) {
                    possiblePrefix = true;
                    const safePart = buf.substring(0, buf.length - i);
                    if (safePart) onStdout(safePart);
                    buf = buf.substring(buf.length - i);
                    break;
                }
            }
            if (!possiblePrefix) {
                onStdout(buf);
                buf = '';
            }
            break;
        } else {
            if (promptIdx > 0) {
                onStdout(buf.substring(0, promptIdx));
                buf = buf.substring(promptIdx);
            }
            const nlIdx = buf.indexOf('\n');
            if (nlIdx === -1) {
                // Incomplete marker line, wait for next chunk
                break;
            }
            const markerLine = buf.substring(0, nlIdx);
            buf = buf.substring(nlIdx + 1);
            try {
                const b64 = markerLine.slice(marker.length).trim();
                const req = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
                onPrompt(typeof req.prompt === 'string' ? req.prompt : '');
            } catch (e) {
                onPrompt('');
            }
        }
    }
    return buf;
}

/**
 * Active running execution sessions map:
 * Key: `${socket.id}:${sessionId}` -> { child, timeoutTimer, tmpFile, dbPath, studentDir, startTime }
 */
const activeSessions = new Map();

/**
 * Registers compiler real-time socket events for a connected client
 */
function registerCompilerSocket(io, socket) {
    // 1. Run Program (Interactive Execution)
    socket.on('compiler:run', (payload) => {
        const { code, sessionId, language = 'python', userId = 'guest' } = payload || {};
        if (!code || !sessionId) {
            socket.emit('compiler:stderr', {
                sessionId,
                text: 'Error: Cannot execute empty program or missing session ID.\n'
            });
            socket.emit('compiler:exit', { sessionId, exitCode: 1, durationMs: 0 });
            return;
        }

        const sessionKey = `${socket.id}:${sessionId}`;

        // Terminate any existing execution on this tab/session
        if (activeSessions.has(sessionKey)) {
            const existing = activeSessions.get(sessionKey);
            try {
                if (existing.timeoutTimer) clearTimeout(existing.timeoutTimer);
                if (existing.child && !existing.child.killed) existing.child.kill('SIGKILL');
                if (existing.tmpFile && fs.existsSync(existing.tmpFile)) fs.unlinkSync(existing.tmpFile);
            } catch (e) {}
            activeSessions.delete(sessionKey);
        }

        const studentDir = getStudentWorkspaceDir(userId);
        const dbPath = getStudentDbPath(userId);

        // Ensure practice.sqlite exists and set up convenience aliases
        if (!fs.existsSync(dbPath)) {
            try {
                execFile('sqlite3', [dbPath, 'VACUUM;'], () => {});
            } catch (e) {}
        }
        for (const alias of ['practice.db', 'school.db']) {
            const aliasPath = path.join(studentDir, alias);
            if (!fs.existsSync(aliasPath) && fs.existsSync(dbPath)) {
                try { fs.linkSync(dbPath, aliasPath); } catch (e) {
                    try { fs.copyFileSync(dbPath, aliasPath); } catch (e2) {}
                }
            }
        }

        const tmpFile = path.join(studentDir, `ulrms_py_sock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.py`);
        const fullSource = `${INTERACTIVE_INPUT_WRAPPER}\n# --- User Code ---\n${code}\n`;

        try {
            fs.writeFileSync(tmpFile, fullSource, 'utf8');
        } catch (err) {
            socket.emit('compiler:stderr', {
                sessionId,
                text: `Failed to create temporary execution file: ${err.message}\n`
            });
            socket.emit('compiler:exit', { sessionId, exitCode: 1, durationMs: 0 });
            return;
        }

        const dbConfig = practiceDatabaseService.config;
        const cleanDbName = practiceDatabaseService.getSanitizedDbName(userId);
        const startTime = Date.now();

        // Spawn Python unbuffered (-u)
        const child = spawn('python3', ['-u', tmpFile], {
            cwd: studentDir,
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
        });

        // 35-second total timeout safeguard
        const timeoutTimer = setTimeout(() => {
            if (activeSessions.has(sessionKey)) {
                const s = activeSessions.get(sessionKey);
                try {
                    s.child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!s.child.killed) s.child.kill('SIGKILL');
                    }, 1000);
                } catch (e) {}
                socket.emit('compiler:stderr', {
                    sessionId,
                    text: '\n[Execution Timed Out: Maximum process runtime (35s) exceeded]\n'
                });
                socket.emit('compiler:exit', { sessionId, exitCode: 124, durationMs: Date.now() - startTime });
                activeSessions.delete(sessionKey);
            }
        }, 35000);

        activeSessions.set(sessionKey, {
            child,
            timeoutTimer,
            tmpFile,
            dbPath,
            studentDir,
            startTime
        });

        let stdoutBuffer = '';

        child.stdout.on('data', (chunk) => {
            stdoutBuffer = processStdoutChunk(
                chunk.toString('utf8'),
                stdoutBuffer,
                (stdoutText) => {
                    socket.emit('compiler:stdout', { sessionId, text: stdoutText });
                },
                (promptText) => {
                    socket.emit('compiler:prompt', { sessionId, prompt: promptText });
                }
            );
        });

        child.stderr.on('data', (chunk) => {
            const errText = chunk.toString('utf8');
            socket.emit('compiler:stderr', { sessionId, text: errText });
        });

        child.on('error', (err) => {
            socket.emit('compiler:stderr', {
                sessionId,
                text: `Execution error: ${err.message}\n`
            });
        });

        child.on('close', (code, signal) => {
            if (timeoutTimer) clearTimeout(timeoutTimer);
            const durationMs = Date.now() - startTime;

            // Flush remaining buffer
            if (stdoutBuffer) {
                socket.emit('compiler:stdout', { sessionId, text: stdoutBuffer });
                stdoutBuffer = '';
            }

            try {
                if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
            } catch (e) {}

            // Query existing tables from SQLite
            execFile('sqlite3', [dbPath, '-json', 'SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "sqlite_%";'], (tErr, tStdout) => {
                let existingTables = [];
                try {
                    if (tStdout && tStdout.trim().startsWith('[')) {
                        const parsed = JSON.parse(tStdout);
                        existingTables = parsed.map(p => p.name);
                    }
                } catch (e) {}

                socket.emit('compiler:exit', {
                    sessionId,
                    exitCode: code ?? (signal ? 130 : 0),
                    durationMs,
                    existingTables
                });

                activeSessions.delete(sessionKey);
            });
        });
    });

    // 2. Supply Stdin Input
    socket.on('compiler:stdin', ({ sessionId, value }) => {
        const sessionKey = `${socket.id}:${sessionId}`;
        const session = activeSessions.get(sessionKey);
        if (session && session.child && !session.child.killed) {
            try {
                const textToSend = typeof value === 'string' ? value : '';
                session.child.stdin.write(textToSend + '\n');
            } catch (err) {
                console.error('[compiler.socket] Failed to write stdin:', err.message);
            }
        }
    });

    // 3. Stop / Kill Program
    socket.on('compiler:kill', ({ sessionId }) => {
        const sessionKey = `${socket.id}:${sessionId}`;
        const session = activeSessions.get(sessionKey);
        if (session) {
            if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
            try {
                if (session.child && !session.child.killed) {
                    session.child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!session.child.killed) session.child.kill('SIGKILL');
                    }, 500);
                }
            } catch (e) {}
            socket.emit('compiler:stderr', {
                sessionId,
                text: '\n[Program execution stopped by user]\n'
            });
            socket.emit('compiler:exit', {
                sessionId,
                exitCode: 130,
                durationMs: Date.now() - session.startTime
            });
            activeSessions.delete(sessionKey);
        }
    });

    // 4. Socket Disconnected - Clean Up
    socket.on('disconnect', () => {
        for (const [key, session] of activeSessions.entries()) {
            if (key.startsWith(`${socket.id}:`)) {
                if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
                try {
                    if (session.child && !session.child.killed) {
                        session.child.kill('SIGKILL');
                    }
                    if (session.tmpFile && fs.existsSync(session.tmpFile)) {
                        fs.unlinkSync(session.tmpFile);
                    }
                } catch (e) {}
                activeSessions.delete(key);
            }
        }
    });
}

module.exports = {
    registerCompilerSocket,
    getStudentWorkspaceDir,
    getStudentDbPath
};
