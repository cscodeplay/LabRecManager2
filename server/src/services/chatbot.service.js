/**
 * Admin AI Chatbot Service
 * - Multi-provider: Gemini → Groq (llama) fallback
 * - Full database schema awareness (auto-introspected)
 * - SQL generation, execution, and explanation
 * - Chart/infographic data generation
 * - Document reading support
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const axios = require('axios');
const prisma = require('../config/database');
const aiService = require('./ai.service');
const notificationService = require('./notificationService');

class ChatbotService {
    constructor() {
        this.geminiModels = [];
        this.groqClient = null;
        this.currentProvider = 'gemini';
        this.currentGeminiIdx = 0;
        this.cachedSchema = null;
        this.cachedCompactSchema = null;
        this.schemaCachedAt = null;
        this.SCHEMA_TTL_MS = 30 * 60 * 1000;
        this.initialize();
    }

    initialize() {
        // Initialize Gemini
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const geminiModelNames = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
            this.geminiModels = geminiModelNames.map(name => ({
                name, instance: genAI.getGenerativeModel({ model: name })
            }));
            console.log(`[ChatBot] Gemini initialized: ${geminiModelNames.join(' → ')}`);
        } else {
            console.warn('[ChatBot] GEMINI_API_KEY not set.');
        }

        // Initialize Groq
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            this.groqClient = new Groq({ apiKey: groqKey });
            console.log('[ChatBot] Groq initialized (llama-3.3-70b / llama-3.1-8b)');
        } else {
            console.warn('[ChatBot] GROQ_API_KEY not set.');
        }

        // Initialize SambaNova
        this.sambaNovaKey = process.env.SAMBANOVA_API_KEY;
        if (this.sambaNovaKey) console.log('[ChatBot] SambaNova initialized');
        else console.warn('[ChatBot] SAMBANOVA_API_KEY not set.');

        // Initialize GitHub
        this.githubToken = process.env.GITHUB_TOKEN;
        if (this.githubToken) console.log('[ChatBot] GitHub Models initialized');
        else console.warn('[ChatBot] GITHUB_TOKEN not set.');

        if (!geminiKey && !groqKey) {
            console.error('[ChatBot] No AI provider configured!');
        }

        // Pre-warm schema cache on startup (non-blocking)
        setTimeout(() => {
            this.getSchema().then(() => console.log('[ChatBot] Schema cache pre-warmed'))
                .catch(e => console.warn('[ChatBot] Schema pre-warm failed:', e.message));
        }, 5000);
    }

    // ═══ SCHEMA INTROSPECTION ═══
    async introspectSchema() {
        try {
            const tables = await prisma.$queryRawUnsafe(`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);
            let schemaText = '';
            for (const { table_name } of tables) {
                const columns = await prisma.$queryRawUnsafe(`
                    SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position
                `, table_name);
                const colDefs = columns.map(c => {
                    let def = `  ${c.column_name} ${c.data_type}`;
                    if (c.character_maximum_length) def += `(${c.character_maximum_length})`;
                    if (c.is_nullable === 'NO') def += ' NOT NULL';
                    return def;
                }).join('\n');
                schemaText += `\nTABLE ${table_name}:\n${colDefs}\n`;
            }
            const fks = await prisma.$queryRawUnsafe(`
                SELECT tc.table_name AS source_table, kcu.column_name AS source_column,
                       ccu.table_name AS target_table, ccu.column_name AS target_column
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
                ORDER BY tc.table_name
            `);
            if (fks.length > 0) {
                schemaText += '\nFOREIGN KEYS:\n';
                fks.forEach(fk => { schemaText += `  ${fk.source_table}.${fk.source_column} → ${fk.target_table}.${fk.target_column}\n`; });
            }
            const enums = await prisma.$queryRawUnsafe(`
                SELECT t.typname AS enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
                FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                GROUP BY t.typname ORDER BY t.typname
            `);
            if (enums.length > 0) {
                schemaText += '\nENUM TYPES:\n';
                enums.forEach(en => { schemaText += `  ${en.enum_name}: [${en.values.join(', ')}]\n`; });
            }
            
            // Fetch distinct values for common categorization columns to help AI avoid hallucinations
            const catCols = [
                { table: 'lab_items', col: 'item_type' },
                { table: 'tickets', col: 'status' },
                { table: 'tickets', col: 'priority' },
                { table: 'tickets', col: 'category' },
                { table: 'procurement_requests', col: 'status' },
                { table: 'users', col: 'role' }
            ];
            schemaText += '\nDISTINCT VALUES IN DB:\n';
            for (const {table, col} of catCols) {
                try {
                    const vals = await prisma.$queryRawUnsafe(`SELECT DISTINCT ${col} FROM ${table} WHERE ${col} IS NOT NULL LIMIT 15`);
                    if (vals.length > 0) {
                        schemaText += `  ${table}.${col}: [${vals.map(v => `'${v[col]}'`).join(', ')}]\n`;
                    }
                } catch(e) { /* Ignore if table/col doesn't exist yet */ }
            }

            return schemaText;
        } catch (error) {
            console.error('[ChatBot] Schema introspection failed:', error.message);
            return this.getFallbackSchema();
        }
    }

    async getSchema() {
        const now = Date.now();
        if (this.cachedSchema && this.schemaCachedAt && (now - this.schemaCachedAt) < this.SCHEMA_TTL_MS) return this.cachedSchema;
        console.log('[ChatBot] Refreshing schema cache...');
        this.cachedSchema = await this.introspectSchema();
        this.schemaCachedAt = now;
        return this.cachedSchema;
    }

    async refreshSchema() { this.cachedSchema = null; this.cachedCompactSchema = null; this.schemaCachedAt = null; return await this.getSchema(); }

    /**
     * Compact schema for Groq — derived from cached full schema (no extra DB calls)
     */
    async getCompactSchema() {
        if (this.cachedCompactSchema) return this.cachedCompactSchema;
        const full = await this.getSchema();
        // Parse "TABLE name:\n  col1 type\n  col2 type" blocks into "name(col1,col2)"
        const lines = [];
        const tableBlocks = full.split(/\nTABLE /).filter(Boolean);
        for (const block of tableBlocks) {
            const match = block.match(/^(\S+):\n([\s\S]*?)(?=\n(?:TABLE |FOREIGN|ENUM)|$)/);
            if (match) {
                const table = match[1];
                const cols = match[2].trim().split('\n').map(l => l.trim().split(/\s+/)[0]).filter(Boolean);
                lines.push(`${table}(${cols.join(',')})`);
            }
        }
        this.cachedCompactSchema = lines.join('\n') || this.getFallbackSchema();
        return this.cachedCompactSchema;
    }

    getFallbackSchema() {
        return `CORE TABLES: users, schools, academic_years, classes, class_enrollments, subjects, assignments, submissions, grades, labs, lab_items, documents, activity_logs, tickets, procurement_requests, notifications, timetables, training_modules`;
    }

    // ═══ SQL EXECUTION (via Prisma — no separate pg dependency needed) ═══
    async executeSQL(sql) {
        try {
            const rawRows = await prisma.$queryRawUnsafe(sql);
            // Convert BigInt values (from COUNT/SUM) to Number for JSON serialization
            const rows = rawRows.map(row => {
                const fixed = {};
                for (const [key, val] of Object.entries(row)) {
                    fixed[key] = typeof val === 'bigint' ? Number(val) : val;
                }
                return fixed;
            });
            const fields = rows.length > 0
                ? Object.keys(rows[0]).map(name => ({ name }))
                : [];
            return { success: true, rows, rowCount: rows.length, fields, command: sql.trim().split(/\s+/)[0].toUpperCase() };
        } catch (error) {
            return { success: false, error: error.message, detail: error.meta?.message, hint: error.meta?.hint };
        }
    }

    // ═══ SYSTEM PROMPT ═══
    buildSystemPrompt(schema, documentContext, userRole) {
        return `You are an intelligent AI assistant for the "Lab Record Management System" — a school management platform.

YOUR CAPABILITIES:
1. **Database Queries**: Generate and execute SQL on PostgreSQL. When a user asks for data, generate SQL.
2. **Charts & Infographics**: When data is visual (trends, distributions, comparisons), generate chart data.
3. **Document Reading**: Read uploaded document content and answer questions.
4. **Schema Knowledge**: Full database schema awareness.

DATABASE SCHEMA:
${schema}

RESPONSE FORMAT RULES:
1. When the user asks for data/stats, generate SQL queries in a \`\`\`sql block.
\${userRole === 'admin' ? '2. You are allowed to generate INSERT, UPDATE, or DELETE queries to import or modify data. You MUST wrap them in <!--EXEC_SQL:...:END_SQL--> just like SELECT queries.' : '2. DO NOT generate INSERT, UPDATE, or DELETE SQL queries under any circumstances.'}
3. Add <!--EXEC_SQL:your_query_here:END_SQL--> at the end of ANY generated SQL (both SELECT and INSERT/UPDATE) for auto-execution.
3b. When inserting a new Class, construct the \`name\` column exactly in the order of "Grade Stream Section" (e.g., "12 Non-Medical C").
4. DO NOT write "Result:" or try to summarize the output. The system will automatically execute the SQL and display the results to the user.
5. If the user asks for a CSV template, output raw comma-separated values inside a \`\`\`csv code block containing the headers and one row of example data. DO NOT output a Markdown table.
6. STRICT THINKING FORMAT: ALL of your internal reasoning, thinking, and planning MUST be wrapped entirely inside <think> and </think> tags. Do not "think out loud" or output raw thought process text outside of these tags. If you say "Wait...", it MUST be inside <think>. The final visible response should be placed AFTER the </think> tag.

SQL BEST PRACTICES:
- ALL id columns are UUIDs. NEVER use integers for IDs (e.g. lab_id = 1 is WRONG). Always JOIN to the related table and filter by name instead.
- NO COLUMN class_id ON assignments: The assignments table does NOT have a class_id column! To filter assignments by class, JOIN assignment_targets on assignment_targets.assignment_id = assignments.id and filter by assignment_targets.target_class_id.
- NO COLUMN class_id ON users: Students are linked to classes via class_enrollments (JOIN class_enrollments ON users.id = class_enrollments.student_id WHERE class_enrollments.class_id = ...).
- CLASS TABLE NAME: The class table in Postgres is named classes (or student_classes).
- NEVER use strict = for text/varchar columns. Always use ILIKE for flexible matching. This applies EVERYWHERE, including inside CASE WHEN conditions. Use wildcards for loose/approximate matching (e.g. ILIKE '%pc%' or CASE WHEN col ILIKE '%printer%').
- CASTING ENUMS: When using ILIKE on an ENUM column (like users.role), you MUST explicitly cast it to TEXT first (e.g., role::text ILIKE '%admin%'), otherwise Postgres will throw a type error.

⚠️ CRITICAL — SYNONYM DICTIONARY (ALWAYS APPLY BEFORE GENERATING SQL):
The database uses specific short values in item_type and other columns. Users will use everyday language. You MUST translate:
  "computer", "computers", "desktop", "desktops", "system", "systems", "CPU", "CPUs" → item_type ILIKE '%pc%'
  "printer", "printers" → item_type ILIKE '%printer%'
  "projector", "projectors", "LCD projector" → item_type ILIKE '%projector%'
  "monitor", "monitors", "screen", "screens", "display" → item_type ILIKE '%monitor%'
  "UPS", "ups", "battery backup" → item_type ILIKE '%ups%'
  "lab 1", "computer lab 1", "comp lab 1", "CL1" → labs.name ILIKE '%Computer Lab 1%'
  "lab 2", "computer lab 2", "comp lab 2", "CL2" → labs.name ILIKE '%Computer Lab 2%'
NEVER search for the user's exact word if it doesn't match a known DB value. ALWAYS map it first using the dictionary above or the DISTINCT VALUES list below.

- For IN clauses on text, ALWAYS use LOWER(column) IN ('val1', 'val2') and ensure the values are lowercase. Do NOT rely on exact casing.
- NEVER guess column values. If unsure, first query SELECT DISTINCT column_name FROM table LIMIT 20.
- When user asks to read a document (e.g. stored in Cloudinary), first query the 'documents' table to get its 'url'.
- ONCE YOU HAVE THE URL, output ONLY the special marker <!--FETCH_DOC:https://...--> to read its contents. The system will fetch it and pass the text back to you.
- When user asks to find/list documents (by date, size, category, etc.), generate a SQL query on the 'documents' table returning the 'name' and 'url' columns, so they appear as clickable links in the UI. For size, filter by 'file_size' (in bytes). For dates, use 'created_at'.
- Use COUNT(DISTINCT ...) when counting unique entities.
- Always handle case-insensitivity with ILIKE or LOWER().
7. **CHART DATA**: When the user explicitly asks for a chart (e.g. pie chart), include this block:
   \`\`\`chart
   {"type":"composed","title":"Chart Title","data":[]}
   \`\`\`
   - Keep "data" as an empty array []. The system will automatically inject the SQL results into it.
   - Supported chart types: "pie", "doughnut", "bar", "line", "area", "composed".
   - For "composed" charts, the first metric will be rendered as a Bar, and the rest as Lines. Use this for complex multi-metric comparisons.
8. **REPORT GENERATION**: When the user asks to generate, export, or download a report (e.g. "generate PDF report for XII NM-A girls", "export Excel report of student groups"), include this tag:
   <!--REPORT_ACTION:{"entities":["students","groups"],"filters":{"gender":"female","classId":""},"format":"pdf"}:END_REPORT-->
   Supported entities: "students", "classes", "groups", "assignments", "lab_pcs". Supported formats: "pdf", "xlsx", "csv".
8. Be extremely concise. No unnecessary explanations. Results speak for themselves.
${documentContext ? `\nUPLOADED DOCUMENT CONTEXT:\n${documentContext}\n` : ''}`;
    }

    // ═══ GEMINI CALL ═══
    async callGemini(contents) {
        let lastError = null;
        const start = this.currentGeminiIdx;
        for (let i = 0; i < this.geminiModels.length; i++) {
            const idx = (start + i) % this.geminiModels.length;
            const { name, instance } = this.geminiModels[idx];
            try {
                console.log(`[ChatBot] Gemini → ${name}`);
                const result = await instance.generateContent({ contents });
                const text = (await result.response).text();
                this.currentGeminiIdx = idx;
                return { text, model: name, provider: 'gemini' };
            } catch (err) {
                lastError = err;
                const is429 = err.message?.includes('429') || err.message?.includes('quota');
                console.warn(`[ChatBot] Gemini ${name} failed: ${err.message.substring(0, 80)}`);
                if (is429 && i < this.geminiModels.length - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                break;
            }
        }
        throw lastError || new Error('All Gemini models failed');
    }

    // ═══ GROQ CALL ═══
    async callGroq(messages) {
        if (!this.groqClient) throw new Error('Groq not configured');
        const groqModels = ['qwen/qwen3.6-27b', 'groq/compound'];
        let lastError = null;

        for (const model of groqModels) {
            try {
                console.log(`[ChatBot] Groq → ${model}`);
                const completion = await this.groqClient.chat.completions.create({
                    model,
                    messages,
                    temperature: 0.2,
                    max_tokens: 4000
                });
                return {
                    text: completion.choices[0]?.message?.content || '',
                    model, provider: 'groq'
                };
            } catch (err) {
                lastError = err;
                const isRateLimit = err.status === 429 || err.status === 413;
                console.warn(`[ChatBot] Groq ${model} failed (${err.status}): ${err.message?.substring(0, 80)}`);
                if (isRateLimit && model === groqModels[0]) {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                break;
            }
        }
        throw lastError || new Error('All Groq models failed');
    }

    // ═══ SAMBANOVA CALL ═══
    async callSambaNova(messages) {
        if (!this.sambaNovaKey) throw new Error('SambaNova not configured');
        console.log('[ChatBot] SambaNova → Meta-Llama-3.1-70B-Instruct');
        try {
            const response = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
                model: 'Meta-Llama-3.1-70B-Instruct',
                messages,
                temperature: 0.1,
                max_tokens: 4000
            }, {
                headers: { 'Authorization': `Bearer ${this.sambaNovaKey}`, 'Content-Type': 'application/json' }
            });
            return {
                text: response.data.choices[0]?.message?.content || '',
                model: 'Meta-Llama-3.1-70B-Instruct', provider: 'sambanova'
            };
        } catch (err) {
            console.error('[ChatBot] SambaNova Error:', err.response?.data || err.message);
            throw new Error(`SambaNova API error: ${err.response?.data?.error?.message || err.message}`);
        }
    }

    // ═══ GITHUB MODELS CALL ═══
    async callGitHub(messages) {
        if (!this.githubToken) throw new Error('GitHub Models not configured');
        console.log('[ChatBot] GitHub Models → gpt-4o');
        try {
            const response = await axios.post('https://models.inference.ai.azure.com/chat/completions', {
                model: 'gpt-4o',
                messages,
                temperature: 0.1,
                max_tokens: 4000
            }, {
                headers: { 'Authorization': `Bearer ${this.githubToken}`, 'Content-Type': 'application/json' }
            });
            return {
                text: response.data.choices[0]?.message?.content || '',
                model: 'gpt-4o', provider: 'github'
            };
        } catch (err) {
            console.error('[ChatBot] GitHub Models Error:', err.response?.data || err.message);
            throw new Error(`GitHub Models API error: ${err.response?.data?.error?.message || err.message}`);
        }
    }

    // ═══ MAIN CHAT ═══
    async chat(message, options = {}) {
        if (!this.geminiModels.length && !this.groqClient) {
            throw new Error('No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY.');
        }

        const { conversationHistory = [], documentContext = '', userId, userRole, academicYearId } = options;

        const msgLower = (message || '').toLowerCase();

        const isDocumentShareIntent = (
            (msgLower.includes('share') || msgLower.includes('send') || msgLower.includes('distribute') || msgLower.includes('give access')) &&
            (msgLower.includes('document') || msgLower.includes('file') || msgLower.includes('pdf') || msgLower.includes('doc') || msgLower.includes('notes'))
        );

        if (isDocumentShareIntent) {
            try {
                console.log('[ChatBot] Document share intent detected in chatbot prompt:', message);

                const [documents, classes, groups, students] = await Promise.all([
                    prisma.document.findMany({ select: { id: true, name: true } }),
                    prisma.class.findMany({ select: { id: true, name: true, gradeLevel: true, section: true } }),
                    prisma.studentGroup.findMany({ select: { id: true, name: true, class: { select: { name: true } } } }),
                    prisma.user.findMany({ where: { role: 'student' }, select: { id: true, firstName: true, lastName: true, admissionNumber: true } })
                ]);

                // AI Target resolution
                const resolution = await aiService.parseDocumentShareTargets(message, { documents, classes, groups, students }, 'groq');

                if (!resolution.matchedDocumentId) {
                     return {
                         message: `⚠️ **Document Not Found**\n\nI couldn't identify which document you want to share from your prompt. Please mention the specific document name (e.g., "Share 'Physics Notes' with Class 10A").`,
                         sql: null,
                         executionResult: null,
                         chartData: null,
                         reportAction: null,
                         provider: 'groq'
                     };
                }

                const doc = documents.find(d => d.id === resolution.matchedDocumentId);
                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const fallbackUser = await prisma.user.findFirst({ where: { role: { in: ['admin', 'instructor'] } } });
                const sharedById = currentUser?.id || fallbackUser?.id;

                let targetSummary = [];
                let shareCount = 0;

                // Share with Classes
                if (resolution.matchedClassIds?.length > 0) {
                    for (const classId of resolution.matchedClassIds) {
                        await prisma.documentShare.create({
                            data: { documentId: doc.id, targetType: 'class', targetClassId: classId, sharedById }
                        });
                        const c = classes.find(c => c.id === classId);
                        if (c) targetSummary.push(`Class ${c.name}`);
                        shareCount++;
                    }
                }

                // Share with Groups
                if (resolution.matchedGroupIds?.length > 0) {
                    for (const groupId of resolution.matchedGroupIds) {
                        await prisma.documentShare.create({
                            data: { documentId: doc.id, targetType: 'group', targetGroupId: groupId, sharedById }
                        });
                        const g = groups.find(g => g.id === groupId);
                        if (g) targetSummary.push(`Group ${g.name}`);
                        shareCount++;
                    }
                }

                // Share with Students
                if (resolution.matchedStudentIds?.length > 0) {
                    for (const studentId of resolution.matchedStudentIds) {
                        await prisma.documentShare.create({
                            data: { documentId: doc.id, targetType: 'user', targetUserId: studentId, sharedById }
                        });
                        const s = students.find(s => s.id === studentId);
                        if (s) targetSummary.push(`${s.firstName} ${s.lastName}`);
                        shareCount++;
                    }
                }
                
                if (shareCount === 0) {
                     return {
                         message: `⚠️ **No Targets Found**\n\nI found the document **${doc.name}**, but I couldn't understand who to share it with. Please specify a class, group, or student name.`,
                         sql: null,
                         executionResult: null,
                         chartData: null,
                         reportAction: null,
                         provider: 'groq'
                     };
                }

                return {
                    message: `✨ **Document Shared Successfully!**\n\nI have shared the document **${doc.name}** with the following targets:\n- ${targetSummary.join('\n- ')}`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    provider: 'groq'
                };
            } catch (err) {
                console.error('[ChatBot] Direct document sharing failed:', err.message);
                return {
                    message: `⚠️ **Unable to Auto-Share Document**\n\nReason: ${err.message}\n\nPlease try again or use the manual Share button in Documents.`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    provider: 'groq'
                };
            }
        }

        // Intent detection: AI Assignment Updating
        const isAssignmentUpdateIntent = (
            (/\b(change|update|edit|modify|extend|postpone|shift)\b/i.test(msgLower)) ||
            (msgLower.includes('assign to') && !msgLower.includes('create') && !msgLower.includes('generate')) ||
            (msgLower.includes('due date') && !msgLower.includes('create') && !msgLower.includes('generate'))
        ) && (msgLower.includes('assignment') || msgLower.includes('due date') || msgLower.includes('task') || msgLower.includes('assign to'));

        // Intent detection: AI Assignment Creation & Targeting directly via Global Chatbot
        const isAssignmentCreationIntent = (
            (msgLower.includes('assignment') || msgLower.includes('program') || msgLower.includes('lab work') || msgLower.includes('task') || msgLower.includes('experiment') || msgLower.includes('homework') || msgLower.includes('practical')) &&
            (/\b(create|assign|give|generate|make|add|new|set)\b/i.test(msgLower)) &&
            !isAssignmentUpdateIntent
        );

        if (isAssignmentUpdateIntent) {
            try {
                console.log('[ChatBot] Assignment update intent detected in chatbot prompt:', message);
                
                const [classes, groups, students, subjects] = await Promise.all([
                    prisma.class.findMany({ select: { id: true, name: true, gradeLevel: true, section: true } }),
                    prisma.studentGroup.findMany({ select: { id: true, name: true, class: { select: { name: true } } } }),
                    prisma.user.findMany({ where: { role: 'student' }, select: { id: true, firstName: true, lastName: true, admissionNumber: true } }),
                    prisma.subject.findMany({ select: { id: true, name: true, code: true } })
                ]);
                
                // Pre-filter students to save context window tokens
                const msgLowerCased = message.toLowerCase();
                const filteredStudents = students.filter(s => {
                    const fn = (s.firstName || '').toLowerCase();
                    const ln = (s.lastName || '').toLowerCase();
                    return (fn && msgLowerCased.includes(fn)) || (ln && msgLowerCased.includes(ln));
                });
                
                const resolution = await aiService.parseAssignmentTargets(message, { classes, groups, students: filteredStudents, subjects }, 'groq');
                
                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const fallbackUser = await prisma.user.findFirst({ where: { role: { in: ['admin', 'instructor'] } } });
                const creatorId = currentUser?.id || fallbackUser?.id;

                const lastAssignment = await prisma.assignment.findFirst({
                    where: { createdById: creatorId },
                    orderBy: { createdAt: 'desc' }
                });

                if (!lastAssignment) {
                    return { message: "⚠️ **No Recent Assignment Found**\n\nI couldn't find any recent assignment created by you to update.", sql: null, executionResult: null, chartData: null, reportAction: null, provider: 'groq' };
                }

                let newDueDate = new Date();
                let dateUpdated = false;
                if (resolution.dueDateISO || resolution.dueDateHoursFromNow) {
                    if (resolution.dueDateISO) {
                        newDueDate = new Date(resolution.dueDateISO);
                    } else {
                        newDueDate.setHours(newDueDate.getHours() + (resolution.dueDateHoursFromNow || 24));
                    }
                    dateUpdated = true;
                    
                    await prisma.assignment.update({
                        where: { id: lastAssignment.id },
                        data: { due_date: newDueDate }
                    });

                    await prisma.assignmentTarget.updateMany({
                        where: { assignmentId: lastAssignment.id },
                        data: { dueDate: newDueDate }
                    });
                } else {
                    newDueDate = lastAssignment.due_date || newDueDate;
                }

                let targetsAdded = 0;
                
                // Add class targets
                for (const classId of (resolution.matchedClassIds || [])) {
                    const exists = await prisma.assignmentTarget.findFirst({ where: { assignmentId: lastAssignment.id, targetClassId: classId }});
                    if (!exists) {
                        await prisma.assignmentTarget.create({
                            data: { assignmentId: lastAssignment.id, targetType: 'class', targetClassId: classId, assignedById: creatorId, dueDate: newDueDate, publishDate: new Date() }
                        });
                        targetsAdded++;
                    }
                }
                
                // Add group targets
                for (const groupId of (resolution.matchedGroupIds || [])) {
                    const exists = await prisma.assignmentTarget.findFirst({ where: { assignmentId: lastAssignment.id, targetGroupId: groupId }});
                    if (!exists) {
                        await prisma.assignmentTarget.create({
                            data: { assignmentId: lastAssignment.id, targetType: 'group', targetGroupId: groupId, assignedById: creatorId, dueDate: newDueDate, publishDate: new Date() }
                        });
                        targetsAdded++;
                    }
                }
                
                // Add student targets
                for (const studentId of (resolution.matchedStudentIds || [])) {
                    const exists = await prisma.assignmentTarget.findFirst({ where: { assignmentId: lastAssignment.id, targetStudentId: studentId }});
                    if (!exists) {
                        await prisma.assignmentTarget.create({
                            data: { assignmentId: lastAssignment.id, targetType: 'student', targetStudentId: studentId, assignedById: creatorId, dueDate: newDueDate, publishDate: new Date() }
                        });
                        targetsAdded++;
                    }
                }

                let msgParts = [];
                if (dateUpdated) {
                    msgParts.push(`The due date has been changed to **${newDueDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}**.`);
                }
                if (targetsAdded > 0) {
                    msgParts.push(`Assigned to **${targetsAdded}** new target(s).`);
                    await prisma.assignment.update({
                        where: { id: lastAssignment.id },
                        data: { status: 'published' }
                    });
                }
                
                if (msgParts.length === 0) {
                    msgParts.push(`No changes were made. Could not detect a new due date or targets.`);
                }

                return {
                    message: `✨ **Assignment Updated Successfully!**\n\nUpdates for **"${lastAssignment.title}"**:\n- ${msgParts.join('\n- ')}`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    provider: 'groq'
                };
            } catch (err) {
                console.error('[ChatBot] Error updating assignment:', err);
                return { message: `❌ **Update Failed:** ${err.message}`, sql: null, executionResult: null, chartData: null, reportAction: null, provider: 'groq' };
            }
        }

        if (isAssignmentCreationIntent) {
            try {
                console.log('[ChatBot] Assignment creation intent detected in chatbot prompt:', message);

                const [classes, groups, students, subjects] = await Promise.all([
                    prisma.class.findMany({ select: { id: true, name: true, gradeLevel: true, section: true } }),
                    prisma.studentGroup.findMany({ select: { id: true, name: true, class: { select: { name: true } } } }),
                    prisma.user.findMany({ where: { role: 'student' }, select: { id: true, firstName: true, lastName: true, admissionNumber: true } }),
                    prisma.subject.findMany({ select: { id: true, name: true, code: true } })
                ]);

                // Pre-filter students to save context window tokens
                const msgLowerCased = message.toLowerCase();
                const filteredStudents = students.filter(s => {
                    const fn = (s.firstName || '').toLowerCase();
                    const ln = (s.lastName || '').toLowerCase();
                    return (fn && msgLowerCased.includes(fn)) || (ln && msgLowerCased.includes(ln));
                });

                // Run AI Task extraction and Target resolution in parallel to prevent HTTP 500 timeout
                const [extractedAssignments, resolution] = await Promise.all([
                    aiService.extractAssignmentsFromText(message, 'groq'),
                    aiService.parseAssignmentTargets(message, { classes, groups, students: filteredStudents, subjects }, 'groq')
                ]);

                let targetSubjectId = resolution.selectedSubjectId;
                if (!targetSubjectId) {
                    const csSub = subjects.find(s => s.name?.toLowerCase().includes('computer'));
                    targetSubjectId = csSub ? csSub.id : subjects[0]?.id;
                }
                const subjectObj = subjects.find(s => s.id === targetSubjectId);

                let dueDate = new Date();
                if (resolution.dueDateISO) {
                    dueDate = new Date(resolution.dueDateISO);
                } else {
                    dueDate.setHours(dueDate.getHours() + (resolution.dueDateHoursFromNow || 24));
                }
                const status = resolution.publishImmediately ? 'published' : 'draft';

                const matchedClassNames = classes.filter(c => resolution.matchedClassIds?.includes(c.id)).map(c => c.name);
                const matchedGroupNames = groups.filter(g => resolution.matchedGroupIds?.includes(g.id)).map(g => g.name);
                const matchedStudentNames = students.filter(s => resolution.matchedStudentIds?.includes(s.id)).map(s => `${s.firstName} ${s.lastName}`);
                const hasTargets = matchedClassNames.length > 0 || matchedGroupNames.length > 0 || matchedStudentNames.length > 0;
                const targetSummaryStr = hasTargets ? [...matchedClassNames, ...matchedGroupNames, ...matchedStudentNames].join(', ') : 'None (Draft only)';

                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const fallbackUser = await prisma.user.findFirst({ where: { role: { in: ['admin', 'instructor'] } } });
                const creatorId = currentUser?.id || fallbackUser?.id;
                const fallbackSchool = await prisma.school.findFirst({ select: { id: true } });
                const schoolId = currentUser?.schoolId || fallbackSchool?.id;

                const createdList = [];
                for (let i = 0; i < extractedAssignments.length; i++) {
                    const item = extractedAssignments[i];
                    const title = item.title || `Lab Task #${i + 1}`;

                    const assignment = await prisma.assignment.create({
                        data: {
                            schoolId,
                            createdById: creatorId,
                            subjectId: targetSubjectId,
                            academicYearId,
                            title,
                            description: item.description || title,
                            aim: item.aim || null,
                            experimentNumber: item.experimentNumber || `${i + 1}`,
                            assignmentType: item.assignmentType || 'program',
                            programmingLanguage: item.programmingLanguage || 'python',
                            referenceCode: item.referenceCode || null,
                            maxMarks: 100,
                            practicalMarks: 60,
                            vivaMarks: 20,
                            outputMarks: 20,
                            status,
                            publish_date: new Date(),
                            due_date: dueDate
                        }
                    });

                    // Target Associations (Classes)
                    for (const classId of (resolution.matchedClassIds || [])) {
                        await prisma.assignmentTarget.create({
                            data: {
                                assignmentId: assignment.id,
                                targetType: 'class',
                                targetClassId: classId,
                                assignedById: creatorId,
                                dueDate: dueDate,
                                publishDate: new Date()
                            }
                        });
                        await notificationService.notifyClass({
                            classId,
                            title: `New Work Assigned: ${assignment.title}`,
                            message: `You have been assigned new lab work. Due: ${dueDate.toLocaleDateString('en-IN')}`,
                            type: 'work_assigned',
                            referenceType: 'assignment',
                            referenceId: assignment.id,
                            actionUrl: '/my-work'
                        }).catch(() => {});
                    }

                    // Target Associations (Groups)
                    for (const groupId of (resolution.matchedGroupIds || [])) {
                        await prisma.assignmentTarget.create({
                            data: {
                                assignmentId: assignment.id,
                                targetType: 'group',
                                targetGroupId: groupId,
                                assignedById: creatorId,
                                dueDate: dueDate,
                                publishDate: new Date()
                            }
                        });
                        await notificationService.notifyGroup({
                            groupId,
                            title: `New Work Assigned: ${assignment.title}`,
                            message: `You have been assigned new lab work. Due: ${dueDate.toLocaleDateString('en-IN')}`,
                            type: 'work_assigned',
                            referenceType: 'assignment',
                            referenceId: assignment.id,
                            actionUrl: '/my-work'
                        }).catch(() => {});
                    }

                    // Target Associations (Students)
                    for (const studentId of (resolution.matchedStudentIds || [])) {
                        await prisma.assignmentTarget.create({
                            data: {
                                assignmentId: assignment.id,
                                targetType: 'student',
                                targetStudentId: studentId,
                                assignedById: creatorId,
                                dueDate: dueDate,
                                publishDate: new Date()
                            }
                        });
                        await notificationService.createNotification({
                            userId: studentId,
                            title: `New Work Assigned: ${assignment.title}`,
                            message: `You have been assigned new lab work. Due: ${dueDate.toLocaleDateString('en-IN')}`,
                            type: 'work_assigned',
                            referenceType: 'assignment',
                            referenceId: assignment.id,
                            actionUrl: '/my-work'
                        }).catch(() => {});
                    }

                    createdList.push(assignment);
                }

                const replyText = `✨ **AI Assignment Generation Complete!**

I have generated the following task(s) based on your request:

${createdList.map((a, idx) => `${idx + 1}. **${a.title}**
   - **Aim**: ${a.aim || a.description}
   - **Subject**: ${subjectObj ? subjectObj.name : 'Computer Science'}
   - **Target Audience**: ${targetSummaryStr}
   - **Due Date**: ${dueDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
   - **Status**: ${status === 'published' ? 'Published 🚀' : 'Draft 📝'}`).join('\n\n')}`;

                return {
                    message: replyText,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    provider: 'groq'
                };
            } catch (err) {
                console.error('[ChatBot] Direct AI assignment creation failed:', err.message);
                return {
                    message: `⚠️ **Unable to Auto-Create Assignment**\n\nReason: ${err.message}\n\nPlease try again or use the **✨ AI Auto-Generate** button on the Assignments page.`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    provider: 'groq'
                };
            }
        }

        // Intent: Meeting Creation
        const isMeetingCreationIntent = (
            (msgLower.includes('create') || msgLower.includes('schedule') || msgLower.includes('start') || msgLower.includes('new')) &&
            (msgLower.includes('meeting') || msgLower.includes('video call') || msgLower.includes('conference') || msgLower.includes('video session'))
        );
        if (isMeetingCreationIntent) {
            try {
                console.log('[ChatBot] Meeting creation intent detected');
                const meetingLink = Math.random().toString(36).substring(2, 10);
                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const fallbackUser = await prisma.user.findFirst({ where: { role: { in: ['admin', 'instructor'] } } });
                const hostId = currentUser?.id || fallbackUser?.id;
                const schoolId = currentUser?.schoolId || (await prisma.school.findFirst()).id;
                
                const type = (msgLower.includes('schedule') || msgLower.includes('later') || msgLower.includes('tomorrow') || msgLower.includes('for ') || msgLower.includes('at ') || msgLower.includes('on ')) ? 'scheduled' : 'instant';
                let scheduledAt = type === 'scheduled' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date();

                if (type === 'scheduled') {
                    const match = message.match(/(?:for|at|on|scheduled for|scheduled)\s+([0-9a-zA-Z\-\s,\/:]+(?:am|pm)?)/i);
                    if (match) {
                        const parsed = new Date(match[1].trim());
                        if (!isNaN(parsed.getTime())) {
                            scheduledAt = parsed;
                        }
                    }
                }

                const meeting = await prisma.meeting.create({
                    data: {
                        title: `AI ${type === 'scheduled' ? 'Scheduled' : 'Instant'} Meeting`,
                        type,
                        meetingLink,
                        hostId,
                        schoolId,
                        scheduledAt,
                        status: type === 'scheduled' ? 'scheduled' : 'in_progress',
                        actualStartTime: type === 'instant' ? new Date() : null
                    }
                });

                return {
                    message: `✨ **Meeting Created Successfully!**\n\nYour ${type} meeting is ready.\n\n🔗 **[Join Meeting](/meeting/${meetingLink})**\n\n*(Share this link: /meeting/${meetingLink})*`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    provider: 'groq'
                };
            } catch (err) {
                console.error('[ChatBot] Meeting creation failed:', err.message);
            }
        }

        // Intent: Note Creation
        const isNoteCreationIntent = (
            (msgLower.includes('create note') || msgLower.includes('save note') || msgLower.includes('new note') || msgLower.includes('save this as note') || msgLower.includes('save as note') || msgLower.includes('create a note'))
        );
        if (isNoteCreationIntent) {
            try {
                console.log('[ChatBot] Note creation intent detected');
                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const authorId = currentUser?.id || (await prisma.user.findFirst({ where: { role: 'admin' } })).id;
                
                let noteContent = documentContext || message.replace(/create note|save note|new note|save this as note|save as note|create a note/gi, '').trim();
                if (!noteContent) noteContent = 'Empty AI Note';
                
                const titleMatch = noteContent.split('\n')[0];
                const title = (titleMatch.length > 50 ? titleMatch.substring(0, 47) + '...' : titleMatch) || 'AI Generated Note';
                
                await prisma.adminNote.create({
                    data: {
                        title,
                        content: noteContent,
                        category: 'general',
                        authorId
                    }
                });

                return {
                    message: `✨ **Note Created!**\n\nI have saved your text/image content as an Admin Note.\n\n📝 **[View Notes](/admin/notes)**`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    provider: 'groq'
                };
            } catch (err) {
                console.error('[ChatBot] Note creation failed:', err.message);
            }
        }

        // Intent: Document Search
        const isDocumentSearchIntent = (
            (msgLower.includes('search document') || msgLower.includes('find document') || msgLower.includes('search file') || msgLower.includes('find file') || msgLower.includes('search for document') || msgLower.includes('find a document')) &&
            !isDocumentShareIntent
        );
        if (isDocumentSearchIntent) {
            try {
                console.log('[ChatBot] Document search intent detected');
                
                const searchParams = await aiService.parseDocumentSearchQuery(message, options.provider);
                let docs = [];
                
                let whereClause = {};
                
                // Add keywords search if present
                if (searchParams.keywords && searchParams.keywords.length > 0) {
                    whereClause.AND = searchParams.keywords.map(kw => ({
                        OR: [
                            { name: { contains: kw, mode: 'insensitive' } },
                            { description: { contains: kw, mode: 'insensitive' } }
                        ]
                    }));
                }
                
                // Add date range search if present
                if (searchParams.startDate || searchParams.endDate) {
                    whereClause.createdAt = {};
                    if (searchParams.startDate) whereClause.createdAt.gte = new Date(searchParams.startDate);
                    if (searchParams.endDate) whereClause.createdAt.lte = new Date(searchParams.endDate);
                }
                
                // Fetch documents
                if (Object.keys(whereClause).length > 0) {
                    docs = await prisma.document.findMany({
                        where: whereClause,
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    });
                } else {
                    docs = await prisma.document.findMany({
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    });
                }

                if (docs.length > 0) {
                    const links = docs.map(d => `- 📄 **[${d.name}](${d.url})** (${(d.fileSize / 1024).toFixed(1)} KB) - *${d.createdAt.toLocaleDateString()}*`);
                    return {
                        message: `✨ **Found ${docs.length} Document(s):**\n\n${links.join('\n')}\n\n*Click a link to view or download the document.*`,
                        sql: null,
                        executionResult: null,
                        chartData: null,
                        reportAction: null,
                        provider: 'groq'
                    };
                } else {
                    return {
                        message: `⚠️ **No Documents Found**\n\nI couldn't find any documents matching "${query}". Try uploading them first via the Documents page.`,
                        sql: null,
                        executionResult: null,
                        chartData: null,
                        reportAction: null,
                        provider: 'groq'
                    };
                }
            } catch (err) {
                console.error('[ChatBot] Document search failed:', err.message);
            }
        }

        const schema = await this.getSchema();
        const systemPrompt = this.buildSystemPrompt(schema, documentContext, userRole);

        // Build Gemini-format contents (full schema)
        const geminiContents = [
            { role: 'user', parts: [{ text: systemPrompt + '\n\nAcknowledge briefly.' }] },
            { role: 'model', parts: [{ text: 'Ready. I can query the database, generate charts, and analyze data.' }] },
        ];
        for (const msg of conversationHistory) {
            geminiContents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
        }
        geminiContents.push({ role: 'user', parts: [{ text: message }] });

        // Build Groq-format messages (compact schema, limited history)
        const compactSchema = await this.getCompactSchema();
        const groqSystemPrompt = this.buildSystemPrompt(compactSchema, documentContext ? documentContext.substring(0, 2000) : '', userRole);
        const groqHistory = conversationHistory.slice(-4); // only last 4 msgs to save tokens
        const groqMessages = [
            { role: 'system', content: groqSystemPrompt },
            ...groqHistory.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
            { role: 'user', content: message }
        ];

        // Try providers based on requested provider
        let aiResult = null;
        const { provider = 'auto' } = options;
        
        let providers = [];
        
        const tryGemini = () => this.callGemini(geminiContents);
        const tryGroq = () => this.callGroq(groqMessages);
        const trySambaNova = () => this.callSambaNova(groqMessages);
        const tryGitHub = () => this.callGitHub(groqMessages);
        if (provider === 'gemini' && this.geminiModels.length) {
            providers = [tryGemini, tryGroq, trySambaNova, tryGitHub];
        } else if (provider === 'groq' && this.groqClient) {
            providers = [tryGroq, tryGemini, trySambaNova, tryGitHub];
        } else if (provider === 'sambanova' && this.sambaNovaKey) {
            providers = [trySambaNova, tryGroq, tryGemini, tryGitHub];
        } else if (provider === 'github' && this.githubToken) {
            providers = [tryGitHub, tryGemini, tryGroq, trySambaNova];
        } else {
            // Auto order based on what is available
            const available = [];
            if (this.groqClient) available.push(tryGroq);
            if (this.geminiModels.length) available.push(tryGemini);
            if (this.sambaNovaKey) available.push(trySambaNova);
            if (this.githubToken) available.push(tryGitHub);
            providers = available;
        }

        if (providers.length === 0) {
            throw new Error('No AI provider configured. Set GEMINI_API_KEY, GROQ_API_KEY, SAMBANOVA_API_KEY, or GITHUB_TOKEN in your .env');
        }

        let lastError = null;
        for (const tryProvider of providers) {
            try {
                aiResult = await tryProvider();
                break;
            } catch (err) {
                lastError = err;
                console.warn(`[ChatBot] Provider failed, trying next: ${err.message?.substring(0, 60)}`);
            }
        }

        if (!aiResult) {
            const is429 = lastError?.message?.includes('429') || lastError?.message?.includes('quota');
            throw new Error(is429
                ? 'All AI models are rate-limited. Please wait a minute and try again.'
                : `AI failed: ${lastError?.message || 'Unknown error'}`);
        }

        let aiText = aiResult.text;

        // Extract report action
        let reportAction = null;
        const reportMatch = aiText.match(/<!--REPORT_ACTION:([\s\S]*?):END_REPORT-->/);
        if (reportMatch) {
            try {
                reportAction = JSON.parse(reportMatch[1].trim());
            } catch (e) {
                console.warn('[ChatBot] Report action JSON parse failed:', e.message);
            }
            aiText = aiText.replace(/<!--REPORT_ACTION:[\s\S]*?:END_REPORT-->/g, '').trim();
        }

        // If user prompt mentions report/pdf/excel/csv but model didn't emit tag, auto-build report action
        const isTemplateOrImport = msgLower.includes('template') || msgLower.includes('import') || msgLower.includes('upload');
        
        if (!reportAction && !isTemplateOrImport && (msgLower.includes('report') || msgLower.includes('pdf') || msgLower.includes('excel') || msgLower.includes('csv'))) {
            const entities = [];
            if (msgLower.includes('student') || msgLower.includes('girl') || msgLower.includes('boy')) entities.push('students');
            if (msgLower.includes('group')) entities.push('groups');
            if (msgLower.includes('class')) entities.push('classes');
            if (msgLower.includes('assignment') || msgLower.includes('score') || msgLower.includes('marks')) entities.push('assignments');
            if (msgLower.includes('pc') || msgLower.includes('lab') || msgLower.includes('computer') || msgLower.includes('inventory') || msgLower.includes('equipment') || msgLower.includes('item')) entities.push('lab_pcs');

            if (entities.length === 0) entities.push('students');

            const filters = {};
            if (msgLower.includes('girl') || msgLower.includes('female')) filters.gender = 'female';
            else if (msgLower.includes('boy') || msgLower.includes('male')) filters.gender = 'male';

            let format = 'pdf';
            if (msgLower.includes('excel') || msgLower.includes('xlsx') || msgLower.includes('sheet')) format = 'xlsx';
            else if (msgLower.includes('csv')) format = 'csv';

            reportAction = { entities, filters, format };
        }

        // Extract document fetch request
        const docMatch = aiText.match(/<!--FETCH_DOC:\s*(https?:\/\/[^\s>]+)\s*-->/);
        if (docMatch) {
            const url = docMatch[1].trim();
            console.log('[ChatBot] Fetching document from URL:', url);
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const mimeType = response.headers.get('content-type') || 'application/pdf';
                const text = await this.extractDocumentText(buffer, mimeType, url.split('/').pop());
                
                // Recurse chat with the new document text
                return await this.chat(`I fetched the document from ${url}. Here is its text:\n\n${text}\n\nPlease summarize it or answer my original question.`, {
                    conversationHistory: [
                        ...conversationHistory,
                        { role: 'user', content: message },
                        { role: 'assistant', content: aiText.replace(/<!--FETCH_DOC:.*-->/, '*[Fetching document from database...]*') }
                    ],
                    documentContext,
                    userId
                });
            } catch (err) {
                console.warn('[ChatBot] Document fetch failed:', err.message);
                aiText += `\n\n*(Failed to read document from URL: ${err.message})*`;
            }
        }

        // Extract auto-exec SQL
        let sqlMatch = aiText.match(/<!--EXEC_SQL:([\s\S]*?):END_SQL-->/);
        let queryResult = null, executedSQL = null;
        
        if (!sqlMatch) {
            // Fallback: Check if the AI just outputted a ```sql block without the wrapper
            const sqlBlocks = [...aiText.matchAll(/```sql\s*([\s\S]*?)\s*```/ig)];
            if (sqlBlocks.length > 0) {
                // Execute the LAST sql block generated by the AI
                executedSQL = sqlBlocks[sqlBlocks.length - 1][1].trim();
                // Clean up the text so the code blocks don't double-render alongside the SQLResult component
                aiText = aiText.replace(/```sql\s*[\s\S]*?\s*```/ig, '').trim();
            }
        } else {
            executedSQL = sqlMatch[1].trim();
        }

        if (executedSQL) {
            const norm = executedSQL.toLowerCase().trim();
            
            const isReadQuery = norm.startsWith('select') || norm.startsWith('with');
            const isWriteQuery = norm.startsWith('insert') || norm.startsWith('update') || norm.startsWith('delete');
            const canExecute = isReadQuery || (isWriteQuery && userRole === 'admin');

            if (canExecute) {
                if (isWriteQuery) {
                    queryResult = {
                        success: true,
                        requiresConfirmation: true,
                        rows: []
                    };
                } else {
                    try {
                        queryResult = await this.executeSQL(executedSQL);
                        
                        if (!queryResult.success && queryResult.error && !options._isRetry) {
                            console.warn('[ChatBot] SQL execution failed. Attempting self-correction retry...', queryResult.error);
                            const retryPrompt = `The SQL query you generated failed with PostgreSQL error:\
${queryResult.error}\n\nFailed Query:\
\`\`\`sql\n${executedSQL}\n\`\`\`\n\nPlease check the DATABASE SCHEMA carefully, fix column/table names (e.g. use assignment_targets for class assignments or class_enrollments for student classes), and output ONLY the corrected SQL in a \`\`\`sql block with <!--EXEC_SQL:...:END_SQL-->.`;
                            return await this.chat(retryPrompt, {
                                ...options,
                                _isRetry: true,
                                conversationHistory: [
                                    ...conversationHistory,
                                    { role: 'user', content: message },
                                    { role: 'assistant', content: aiText }
                                ]
                            });
                        }
                    } catch (e) {
                        queryResult = { success: false, error: e.message };
                    }
                }
            }
            aiText = aiText.replace(/<!--EXEC_SQL:[\s\S]*?:END_SQL-->/g, '').trim();
        }

        // Extract chart data
        let chartData = null;
        const chartMatch = aiText.match(/```chart\n?([\s\S]*?)```/);
        if (chartMatch) {
            try { chartData = JSON.parse(chartMatch[1].trim()); } catch (e) { console.warn('[ChatBot] Chart parse failed:', e.message); }
            aiText = aiText.replace(/```chart\n?[\s\S]*?```/g, '').trim();
        }

        // If we have query results that can be visualized
        if (queryResult?.success && queryResult.rows?.length >= 2) {
            const autoChart = this.autoGenerateChart(queryResult);
            if (autoChart) {
                if (chartData) {
                    // AI requested a chart but might have fake/empty data
                    chartData.data = autoChart.data;
                    chartData.seriesKeys = autoChart.seriesKeys;
                    // Grouped data requires multi-series charts (bar, line, area). Pie won't work.
                    if (autoChart.seriesKeys?.length > 1 && chartData.type === 'pie') {
                        chartData.type = 'bar';
                    }
                    if (!chartData.title || chartData.title === 'Chart Title') chartData.title = autoChart.title;
                    if (!chartData.colors) chartData.colors = autoChart.colors;
                } else {
                    chartData = autoChart;
                }
            }
        }

        return {
            message: aiText, sql: executedSQL, queryResult, chartData, reportAction,
            model: aiResult.model, provider: aiResult.provider,
            timestamp: new Date().toISOString()
        };
    }

    autoGenerateChart(result) {
        if (!result.rows || result.rows.length < 2) return null;
        const fields = result.fields?.map(f => f.name) || Object.keys(result.rows[0]);
        if (fields.length < 2) return null;

        const numCols = fields.filter(f => {
            const val = result.rows[0][f];
            return typeof val === 'number' || (val !== null && val !== '' && !isNaN(Number(val)));
        });
        const strCols = fields.filter(f => !numCols.includes(f));

        if (numCols.length === 0) return null;

        const valueCol = numCols[0];

        // Multi-Numeric Series Chart (1+ strings, 2+ numbers) -> e.g. Lab Name, PC Count, Printer Count
        if (numCols.length >= 2) {
            const labelCol = strCols.length > 0 ? strCols[0] : fields[0];
            const data = result.rows.slice(0, 15).map(row => {
                const obj = { label: String(row[labelCol] || '').substring(0, 30) };
                numCols.forEach(col => { obj[col] = Number(row[col]) || 0; });
                return obj;
            });
            return {
                type: 'bar',
                title: `${numCols.join(' and ')} by ${labelCol}`,
                data,
                seriesKeys: numCols,
                colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4']
            };
        }

        // Grouped Bar Chart support (2 strings, 1 number) -> e.g. Lab Name, Item Type, Count
        if (strCols.length >= 2 && numCols.length === 1) {
            const groupCol = strCols[0];
            const seriesCol = strCols[1];
            
            const pivot = {};
            const seriesKeys = new Set();
            
            result.rows.forEach(row => {
                const group = String(row[groupCol] || 'Unknown');
                const series = String(row[seriesCol] || 'Unknown');
                const val = Number(row[valueCol]) || 0;
                
                if (!pivot[group]) pivot[group] = { label: group };
                pivot[group][series] = val;
                seriesKeys.add(series);
            });
            
            return {
                type: 'bar',
                title: `${valueCol} by ${groupCol} and ${seriesCol}`,
                data: Object.values(pivot).slice(0, 20),
                seriesKeys: Array.from(seriesKeys),
                colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4']
            };
        }

        // Standard Single-Series Chart
        const labelCol = strCols[0] || fields[0];
        if (labelCol === valueCol) return null;

        const data = result.rows.slice(0, 15).map(row => ({
            label: String(row[labelCol] || '').substring(0, 30),
            value: Number(row[valueCol]) || 0
        }));

        const type = data.length <= 6 ? 'doughnut' : 'bar';
        return {
            type, title: `${valueCol} by ${labelCol}`, data,
            seriesKeys: ['value'],
            colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4']
        };
    }

    // ═══ DOCUMENT EXTRACTION ═══
    async extractDocumentText(buffer, mimeType, fileName) {
        try {
            if (mimeType.includes('text/plain') || mimeType.includes('text/csv')) return buffer.toString('utf-8');
            if (mimeType.includes('application/json')) return JSON.stringify(JSON.parse(buffer.toString('utf-8')), null, 2);
            if (mimeType.includes('application/pdf') || fileName.toLowerCase().endsWith('.pdf')) {
                const pdfParse = require('pdf-parse');
                const data = await pdfParse(buffer);
                const readable = data.text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ').trim();
                return readable.length > 50 ? readable.substring(0, 15000) : `[PDF extracted text is empty or too short]`;
            }
            return `[Binary file: ${fileName}, ${buffer.length}B, ${mimeType}]`;
        } catch (err) { 
            console.error('[ChatBot] Document parse error:', err.message);
            return `[Failed to parse ${fileName}: ${err.message}]`; 
        }
    }
}

module.exports = new ChatbotService();
