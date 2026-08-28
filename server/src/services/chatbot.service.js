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
const cronService = require('./cron.service');

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
            const geminiModelNames = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
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
- When listing equipment or computers across labs, use LEFT JOIN on labs (e.g. \`FROM labs l LEFT JOIN lab_items li ON l.id = li.lab_id AND (li.item_type ILIKE '%pc%' OR li.item_type ILIKE '%computer%')\`) so all labs are shown in the result even if some labs currently have no items registered yet.
- Use COUNT(DISTINCT ...) when counting unique entities.
- Always handle case-insensitivity with ILIKE or LOWER().
7. **CHART & GRAPH GENERATION (ONLY WHEN EXPLICITLY REQUESTED)**:
- BY DEFAULT, DO NOT output a \`\`\`chart block. Present data strictly in clean card / table format via SQL execution.
- ONLY when the user explicitly requests a "chart", "graph", "plot", or "visualize" (e.g. "show in a pie chart", "bar graph of students", "plot submission trends"), include this block:
   \`\`\`chart
   {"type":"bar","title":"Chart Title","data":[]}
   \`\`\`
   - Keep "data" as an empty array []. The system will automatically inject the SQL results into it.
   - Supported chart types: "pie", "doughnut", "bar", "line", "area", "composed".
8. **REPORT GENERATION**: When the user asks to generate, export, or download a report (e.g. "generate PDF report for XII NM-A girls", "export Excel report of student groups"), include this tag:
   <!--REPORT_ACTION:{"entities":["students","groups"],"filters":{"gender":"female","classId":""},"format":"pdf"}:END_REPORT-->
   Supported entities: "students", "classes", "groups", "assignments", "lab_pcs". Supported formats: "pdf", "xlsx", "csv".
9. **CALENDAR & HOLIDAY PROCESSING (MULTILINGUAL - PUNJABI / HINDI / ENGLISH)**:
- The school calendar is stored in the \`school_calendar\` table:
  (id UUID, school_id UUID, academic_year_id UUID, date DATE, title VARCHAR(255), title_hindi VARCHAR(255), type calendar_event_type, is_holiday BOOLEAN, source calendar_source, created_at TIMESTAMP).
  * Valid \`type\` enum values: 'gazetted_holiday', 'restricted_holiday', 'exam_day', 'event', 'custom', 'summer_vacation', 'winter_vacation'.
  * Valid \`source\` enum values: 'punjab_govt', 'admin_custom'.
- When a user uploads a holiday PDF/image or asks to add/update holidays in the school calendar:
  1. Accurately recognize Indian language text, especially Punjabi (Gurmukhi) and Hindi:
     * ਛੁੱਟੀਆਂ / ਸਰਕਾਰੀ ਛੁੱਟੀਆਂ → Holidays / Gazetted Holidays
     * ਪ੍ਰਕਾਸ਼ ਪੁਰਬ / ਗੁਰਪੁਰਬ → Birthday / Gurpurab (e.g. Guru Nanak Dev Ji, Guru Gobind Singh Ji)
     * ਸ਼ਹੀਦੀ ਦਿਵਸ → Martyrdom Day
     * ਵਿਸਾਖੀ / ਵੈਸਾਖੀ → Baisakhi / Vaisakhi
     * ਦੀਵਾਲੀ / ਬੰਦੀ ਛੋੜ ਦਿਵਸ → Diwali / Bandi Chhor Divas
     * ਹੋਲੀ / ਹੋਲਾ ਮਹੱਲਾ → Holi / Hola Mohalla
     * ਗਣਤੰਤਰ ਦਿਵਸ → Republic Day
     * ਸੁਤੰਤਰਤਾ ਦਿਵਸ / ਅਜ਼ਾਦੀ ਦਿਵਸ → Independence Day
     * ਗਾਂਧੀ ਜਯੰਤੀ → Gandhi Jayanti
     * ਦੁਸਹਿਰਾ / ਦਸਹਿਰਾ → Dussehra
     * ਗਰਮੀਆਂ ਦੀਆਂ ਛੁੱਟੀਆਂ → Summer Vacation ('summer_vacation')
     * ਸਰਦੀਆਂ ਦੀਆਂ ਛੁੱਟੀਆਂ → Winter Vacation ('winter_vacation')
     * ਮਾਘੀ, ਲੋਹੜੀ, ਈਦ, ਕ੍ਰਿਸਮਸ, etc.
  2. Parse each holiday into standard format with \`YYYY-MM-DD\`. Store the original Punjabi / Hindi title in \`title_hindi\` and the standard English name in \`title\`.
  3. If user role is admin, generate a PostgreSQL \`INSERT INTO school_calendar ... ON CONFLICT (school_id, date) DO UPDATE SET title = EXCLUDED.title, title_hindi = EXCLUDED.title_hindi, type = EXCLUDED.type, is_holiday = EXCLUDED.is_holiday;\` query wrapped in <!--EXEC_SQL:...:END_SQL--> to automatically save the events to the database.
  4. Always present a formatted Markdown table of all extracted holidays with columns: Date | English Name | Punjabi/Hindi Name | Type | Status.
10. Be extremely concise. No unnecessary explanations. Results speak for themselves.
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
        const groqModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'groq/compound', 'qwen/qwen3.6-27b'];
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

        // Intent detection: Class Creation (e.g., "create class 11 Non-Medical A", "add class 10 B", "create class 11 stream Non-Medical and section A")
        const isClassCreationIntent = (
            (userRole === 'admin' || userRole === 'principal') &&
            (/\b(create|add|make|new|register|setup)\s+(a\s+|an\s+)?class\b/i.test(msgLower) ||
             /\bclass\s+(creation|create|add)\b/i.test(msgLower) ||
             /^(create|add|make)\s+class\b/i.test(msgLower.trim()) ||
             msgLower.includes('ਕਲਾਸ ਬਣਾਓ') || msgLower.includes('ਨਵੀਂ ਕਲਾਸ') ||
             msgLower.includes('कक्षा बनाएं') || msgLower.includes('नई कक्षा')) &&
            !msgLower.includes('assignment') &&
            !msgLower.includes('meeting') &&
            !msgLower.includes('document')
        );

        if (isClassCreationIntent) {
            try {
                console.log('[ChatBot] Class creation intent detected:', message);

                let targetAcademicYearId = academicYearId || null;
                if (!targetAcademicYearId) {
                    try {
                        const activeSession = await prisma.academicYear.findFirst({
                            where: { isCurrent: true }
                        }) || await prisma.academicYear.findFirst({
                            orderBy: { startDate: 'desc' }
                        });
                        targetAcademicYearId = activeSession?.id || null;
                    } catch (e) {
                        console.warn('[ChatBot] Could not fetch current academicYear:', e.message);
                    }
                }

                // 1. Parse Grade Level (1-12)
                let gradeLevel = 11;
                const gradeMatch = message.match(/\b(?:class|grade|standard|std)\s*([1-9]|1[0-2])\b/i) ||
                                   message.match(/\b([1-9]|1[0-2])(?:st|nd|rd|th)?\s*(?:grade|class|standard|std)?\b/i) ||
                                   message.match(/\b([1-9]|1[0-2])\b/);
                if (gradeMatch) {
                    gradeLevel = parseInt(gradeMatch[1], 10);
                }

                // 2. Parse Stream
                let stream = 'General';
                if (/non[\s-]?medical/i.test(message)) {
                    stream = 'Non-Medical';
                } else if (/medical/i.test(message)) {
                    stream = 'Medical';
                } else if (/science/i.test(message)) {
                    stream = 'Science';
                } else if (/commerce/i.test(message)) {
                    stream = 'Commerce';
                } else if (/arts|humanities/i.test(message)) {
                    stream = 'Arts';
                } else if (/vocational/i.test(message)) {
                    stream = 'Vocational';
                } else if (gradeLevel >= 11) {
                    stream = 'Science';
                }

                // 3. Parse Section
                let section = '';
                const sectionExplicitMatch = message.match(/\bsection\s*[:\-]?\s*([A-Za-z0-9]+)\b/i);
                if (sectionExplicitMatch) {
                    section = sectionExplicitMatch[1].toUpperCase();
                } else {
                    const tokens = message.trim().split(/\s+/);
                    const lastToken = tokens[tokens.length - 1].toUpperCase();
                    if (/^[A-F]$/.test(lastToken)) {
                        section = lastToken;
                    } else {
                        const letterMatch = message.match(/\b([A-F])\b/i);
                        if (letterMatch) {
                            section = letterMatch[1].toUpperCase();
                        }
                    }
                }
                if (!section) section = 'A';

                // 4. Construct Class Name
                let className = '';
                if (stream && stream !== 'General') {
                    className = `${gradeLevel} ${stream} ${section}`.trim();
                } else {
                    className = `${gradeLevel}-${section}`.trim();
                }

                // 5. Try AI LLM refinement if available
                const classExtractPrompt = `Extract class creation details from the user prompt:
Prompt: "${message}"

Return JSON ONLY with this exact format:
{
  "name": "string (e.g. 11 Non-Medical A)",
  "gradeLevel": number (1-12),
  "section": "string (e.g. A, B)",
  "stream": "General" | "Non-Medical" | "Medical" | "Science" | "Commerce" | "Arts" | "Vocational",
  "maxStudents": number (default 60),
  "nameHindi": "string or empty"
}`;

                let llmExtracted = null;
                if (this.groqClient) {
                    try {
                        const res = await this.groqClient.chat.completions.create({
                            model: 'llama-3.3-70b-versatile',
                            messages: [{ role: 'user', content: classExtractPrompt }],
                            temperature: 0.1,
                            response_format: { type: 'json_object' }
                        });
                        const raw = res.choices[0]?.message?.content || '';
                        llmExtracted = JSON.parse(raw);
                    } catch (e) {
                        console.warn('[ChatBot] Groq class parsing fallback to rule-based:', e.message);
                    }
                }

                if (llmExtracted && llmExtracted.gradeLevel) {
                    gradeLevel = parseInt(llmExtracted.gradeLevel, 10) || gradeLevel;
                    stream = llmExtracted.stream || stream;
                    section = (llmExtracted.section || section).toUpperCase();
                    className = llmExtracted.name || className;
                }

                const classAction = {
                    isDraft: true,
                    isConfirmed: false,
                    isCancelled: false,
                    name: className,
                    nameHindi: llmExtracted?.nameHindi || '',
                    gradeLevel,
                    section,
                    stream,
                    maxStudents: llmExtracted?.maxStudents || 60,
                    academicYearId: targetAcademicYearId
                };

                return {
                    message: `🎓 **Class Draft Created! (Pending Confirmation)**\n\nI have prepared the draft for **Class ${className}** (Grade: **${gradeLevel}**, Stream: **${stream}**, Section: **${section}**).\n\nPlease review or edit the details in the confirmation card below and click **Confirm & Create Class**:`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    meetingAction: null,
                    calendarAction: null,
                    assignmentAction: null,
                    noteAction: null,
                    classAction,
                    userAction: null,
                    provider: 'auto'
                };
            } catch (err) {
                console.error('[ChatBot] Class creation intent error:', err);
            }
        }

        // Intent detection: User Creation (e.g. "create student Rahul Sharma email rahul@school.com in class 11 Non-Medical A", "add instructor Dr. Vikas email vikas@school.com", "create user admin Rohit")
        const isUserCreationIntent = (
            (userRole === 'admin' || userRole === 'principal' || userRole === 'instructor') &&
            (/\b(create|add|register|setup|new|enroll)\s+(a\s+|an\s+)?(user|student|instructor|teacher|faculty|admin|lab\s*assistant)\b/i.test(msgLower) ||
             /\b(student|instructor|user)\s+(creation|create|add|registration)\b/i.test(msgLower) ||
             /^(create|add|register)\s+(student|user|instructor|teacher)\b/i.test(msgLower.trim()) ||
             msgLower.includes('ਵਿਦਿਆਰਥੀ ਬਣਾਓ') || msgLower.includes('ਨਵਾਂ ਯੂਜ਼ਰ') ||
             msgLower.includes('छात्र जोड़ें') || msgLower.includes('नया यूजर')) &&
            !msgLower.includes('assignment') &&
            !msgLower.includes('meeting') &&
            !msgLower.includes('document')
        );

        if (isUserCreationIntent) {
            try {
                console.log('[ChatBot] User creation intent detected:', message);

                const classes = await prisma.class.findMany({
                    select: { id: true, name: true, gradeLevel: true, section: true }
                }).catch(() => []);

                // Detect role
                let role = 'student';
                if (/\b(instructor|teacher|faculty|prof|professor)\b/i.test(message)) {
                    role = 'instructor';
                } else if (/\b(admin|administrator|principal)\b/i.test(message)) {
                    role = 'admin';
                } else if (/\b(lab\s*assistant|technician)\b/i.test(message)) {
                    role = 'lab_assistant';
                }

                // Match Class if mentioned
                let targetClassId = null;
                let targetClassName = null;
                for (const c of classes) {
                    if (msgLower.includes(c.name.toLowerCase()) || msgLower.includes(`class ${c.name.toLowerCase()}`)) {
                        targetClassId = c.id;
                        targetClassName = c.name;
                        break;
                    }
                }

                // AI LLM extraction for high precision
                const userExtractPrompt = `Extract user creation details from the user prompt:
Prompt: "${message}"

Available Classes: ${classes.map(c => `${c.id}: ${c.name}`).join(', ')}

Return JSON ONLY in this format:
{
  "firstName": "string",
  "lastName": "string",
  "email": "string or empty",
  "role": "student" | "instructor" | "admin" | "lab_assistant",
  "admissionNumber": "string or empty",
  "phone": "string or empty",
  "matchedClassId": "string or null",
  "matchedClassName": "string or null"
}`;

                let extracted = null;
                if (this.groqClient) {
                    try {
                        const res = await this.groqClient.chat.completions.create({
                            model: 'llama-3.3-70b-versatile',
                            messages: [{ role: 'user', content: userExtractPrompt }],
                            temperature: 0.1,
                            response_format: { type: 'json_object' }
                        });
                        const raw = res.choices[0]?.message?.content || '';
                        extracted = JSON.parse(raw);
                    } catch (e) {
                        console.warn('[ChatBot] Groq user parsing fallback to rule-based:', e.message);
                    }
                }

                let firstName = extracted?.firstName || '';
                let lastName = extracted?.lastName || '';
                let email = extracted?.email || '';
                let admissionNumber = extracted?.admissionNumber || '';
                let phone = extracted?.phone || '';
                if (extracted?.role) role = extracted.role;
                if (extracted?.matchedClassId) targetClassId = extracted.matchedClassId;
                if (extracted?.matchedClassName) targetClassName = extracted.matchedClassName;

                // Fallback rule-based name extraction if LLM didn't extract names
                if (!firstName) {
                    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                    if (emailMatch) email = emailMatch[1];

                    const nameMatch = message.match(/(?:create|add|register)\s+(?:student|user|instructor|teacher|admin)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
                    if (nameMatch) {
                        const parts = nameMatch[1].trim().split(/\s+/);
                        firstName = parts[0];
                        lastName = parts.slice(1).join(' ');
                    }
                }

                if (!firstName) firstName = 'New';
                if (!lastName) lastName = role === 'student' ? 'Student' : (role === 'instructor' ? 'Instructor' : 'User');
                if (!email) {
                    const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    email = `${cleanFirst}.${cleanLast}${Math.floor(100 + Math.random() * 900)}@school.edu`;
                }

                const userAction = {
                    isDraft: true,
                    isConfirmed: false,
                    isCancelled: false,
                    firstName,
                    lastName,
                    email,
                    role,
                    phone,
                    admissionNumber,
                    classId: targetClassId,
                    className: targetClassName || (classes.find(c => c.id === targetClassId)?.name || null),
                    password: 'Welcome123!'
                };

                return {
                    message: `👤 **User Draft Created! (Pending Confirmation)**\n\nI have prepared the draft for **${firstName} ${lastName}** (${role.toUpperCase()}${userAction.className ? ` • Class: ${userAction.className}` : ''}):\n- **Email**: \`${email}\`\n- **Role**: \`${role}\`\n\nPlease review or edit the details in the confirmation card below and click **Confirm & Create User**:`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    meetingAction: null,
                    calendarAction: null,
                    assignmentAction: null,
                    noteAction: null,
                    classAction: null,
                    timetableAction: null,
                    periodTimingAction: null,
                    userAction,
                    provider: 'auto'
                };
            } catch (err) {
                console.error('[ChatBot] User creation intent error:', err);
            }
        }

        // Intent detection: Ticket / Issue Creation (e.g. "create ticket 'power rail failure' on date 22-08-2026", "raise ticket broken monitor in Lab 1", "add support ticket for AC not working")
        const isTicketCreationIntent = (
            (/\b(create|raise|open|log|add|report|new|submit|file)\s+(a\s+|an\s+)?(ticket|support\s*ticket|issue|complaint|fault|incident)\b/i.test(msgLower) ||
             /\b(ticket|support\s*ticket|complaint|issue)\s+(creation|create|add|raise|log|report|submit)\b/i.test(msgLower) ||
             /^(create|raise|log|add)\s+ticket\b/i.test(msgLower.trim()) ||
             /^ticket\s*:\s*/i.test(msgLower.trim()) ||
             msgLower.includes('ਟਿਕਟ ਬਣਾਓ') || msgLower.includes('ਟਿਕਟ ਦਰਜ') ||
             msgLower.includes('ਸ਼ਿਕਾਇਤ ਦਰਜ') || msgLower.includes('शिकायत दर्ज') || msgLower.includes('टिकट बनाएं') ||
             (msgLower.includes('ticket') && (msgLower.includes('failure') || msgLower.includes('issue') || msgLower.includes('broken') || msgLower.includes('not working') || msgLower.includes('fault')))) &&
            !msgLower.includes('show ticket') &&
            !msgLower.includes('list ticket') &&
            !msgLower.includes('search ticket') &&
            !msgLower.includes('get ticket') &&
            !msgLower.includes('view ticket') &&
            !msgLower.includes('display ticket') &&
            !msgLower.includes('how many ticket')
        );

        if (isTicketCreationIntent) {
            try {
                console.log('[ChatBot] Ticket creation intent detected:', message);

                const [labs, items] = await Promise.all([
                    prisma.lab.findMany({ select: { id: true, name: true, roomNumber: true } }).catch(() => []),
                    prisma.labItem.findMany({ select: { id: true, name: true, itemType: true, labId: true } }).catch(() => [])
                ]);

                // 1. Extract Title:
                let title = '';
                const quotedMatch = message.match(/['"“](.*?)['"”]/);
                if (quotedMatch && quotedMatch[1].trim()) {
                    title = quotedMatch[1].trim();
                } else {
                    const titleMatch = message.match(/(?:create|raise|open|log|add|report|new|submit|file)\s+(?:a\s+|an\s+)?(?:ticket|support\s*ticket|issue|complaint|fault|incident)?\s*(?:for|about|on|regarding|titled|name|named|:)?\s*([^,.\n]+)/i);
                    if (titleMatch && titleMatch[1]) {
                        title = titleMatch[1]
                            .replace(/\b(on\s+date\s+.*|date\s+.*|in\s+lab\s+.*|priority\s+.*|category\s+.*)\b/i, '')
                            .trim();
                    }
                }

                if (!title || title.length < 2) {
                    title = 'Hardware / Facility Issue';
                }

                // Capitalize Title nicely
                title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                // 2. Extract Date:
                let targetDate = new Date();
                const dmyMatch = message.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
                const ymdMatch = message.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
                if (dmyMatch) {
                    const day = parseInt(dmyMatch[1], 10);
                    const month = parseInt(dmyMatch[2], 10) - 1;
                    const year = parseInt(dmyMatch[3], 10);
                    targetDate = new Date(year, month, day, 10, 0, 0);
                } else if (ymdMatch) {
                    const year = parseInt(ymdMatch[1], 10);
                    const month = parseInt(ymdMatch[2], 10) - 1;
                    const day = parseInt(ymdMatch[3], 10);
                    targetDate = new Date(year, month, day, 10, 0, 0);
                }

                // 3. Detect Category:
                let category = 'other';
                if (/power|rail|wire|cable|cpu|ram|monitor|screen|keyboard|mouse|printer|switch|motherboard|ups|supply|hardware|component|pc|computer|device/i.test(message)) {
                    category = 'hardware_issue';
                } else if (/software|os|windows|linux|install|error|crash|virus|bug|compiler|driver|app/i.test(message)) {
                    category = 'software_issue';
                } else if (/clean|service|maintenance|replace|ac|light|bulb|furniture|chair|table|water|fan/i.test(message)) {
                    category = 'maintenance_request';
                } else if (/noise|slow|student|discipline|complaint|staff/i.test(message)) {
                    category = 'general_complaint';
                }

                // 4. Detect Priority:
                let priority = 'medium';
                if (/critical|emergency|blast|smoke|fire|severe|immediate|danger|failure|down/i.test(message)) {
                    priority = 'critical';
                } else if (/urgent|high|asap|important/i.test(message)) {
                    priority = 'high';
                } else if (/low|minor|whenever|trivial/i.test(message)) {
                    priority = 'low';
                }

                // 5. Match Lab:
                let matchedLab = null;
                for (const l of labs) {
                    if (msgLower.includes(l.name.toLowerCase()) || (l.roomNumber && msgLower.includes(l.roomNumber.toLowerCase()))) {
                        matchedLab = l;
                        break;
                    }
                }

                // 6. Match Item:
                let matchedItem = null;
                for (const it of items) {
                    if (msgLower.includes(it.name.toLowerCase())) {
                        matchedItem = it;
                        if (!matchedLab && it.labId) {
                            matchedLab = labs.find(l => l.id === it.labId) || null;
                        }
                        break;
                    }
                }

                // 7. Generate Description:
                let description = `${title}. Reported on ${targetDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`;
                if (matchedLab) description += ` Location: ${matchedLab.name}.`;

                const ticketAction = {
                    isDraft: true,
                    isConfirmed: false,
                    isCancelled: false,
                    title,
                    description,
                    category,
                    priority,
                    date: targetDate.toISOString(),
                    labId: matchedLab?.id || null,
                    labName: matchedLab?.name || null,
                    itemId: matchedItem?.id || null,
                    itemName: matchedItem?.name || null
                };

                const categoryLabel = {
                    hardware_issue: 'Hardware Issue',
                    software_issue: 'Software Issue',
                    maintenance_request: 'Maintenance Request',
                    general_complaint: 'General Complaint',
                    other: 'Other'
                }[category] || category;

                return {
                    message: `🎫 **Ticket Draft Prepared! (Pending Confirmation)**\n\nI have generated the draft for support ticket **"${title}"**.\n\n- 🏷️ **Category:** \`${categoryLabel}\`\n- ⚡ **Priority:** \`${priority.toUpperCase()}\`\n- 📅 **Reported Date:** ${targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n${matchedLab ? `- 🏢 **Lab:** ${matchedLab.name}\n` : ''}\nPlease review the details in the confirmation card below and click **Confirm & Create Ticket** or **Cancel**:`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    meetingAction: null,
                    calendarAction: null,
                    assignmentAction: null,
                    noteAction: null,
                    classAction: null,
                    userAction: null,
                    ticketAction,
                    timetableAction: null,
                    periodTimingAction: null,
                    provider: 'auto'
                };
            } catch (err) {
                console.error('[ChatBot] Ticket creation intent error:', err);
            }
        }

        // Intent detection: Timetable Slot Scheduling (e.g. "Create 7th lecture for mon and 9th for Tue of computer science by instructor Charanpreet Singh", "set period 2 on monday for class 12 Medical A")
        const isTimetableCreationIntent = (
            (userRole === 'admin' || userRole === 'principal' || userRole === 'instructor') &&
            (/\b(create|add|set|make|schedule|put|slot|draft)\b/i.test(msgLower) &&
             /\b(period|lecture|timetable|slot|class\s+slot)\b/i.test(msgLower) &&
             (/\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|every\s+day|daily|both\s+days)\b/i.test(msgLower))) &&
            !msgLower.includes('assignment') &&
            !msgLower.includes('meeting') &&
            !/\b(period\s*timing|bell\s*timing|bell\s*schedule|timing\s*schedule|period\s*timings|timing\s*with\s*date)\b/i.test(msgLower)
        );

        if (isTimetableCreationIntent) {
            try {
                console.log('[ChatBot] Timetable slot creation intent detected:', message);

                const [subjects, instructors, classes] = await Promise.all([
                    prisma.subject.findMany({ select: { id: true, name: true, nameHindi: true, code: true } }).catch(() => []),
                    prisma.user.findMany({
                        where: { role: { in: ['instructor', 'lab_assistant', 'admin'] } },
                        select: { id: true, firstName: true, lastName: true, email: true }
                    }).catch(() => []),
                    prisma.class.findMany({
                        select: { id: true, name: true, gradeLevel: true, section: true }
                    }).catch(() => [])
                ]);

                // Match Class if mentioned
                let targetClassId = null;
                let targetClassName = null;
                for (const c of classes) {
                    if (msgLower.includes(c.name.toLowerCase()) || msgLower.includes(`class ${c.name.toLowerCase()}`)) {
                        targetClassId = c.id;
                        targetClassName = c.name;
                        break;
                    }
                }
                if (!targetClassId && classes.length > 0) {
                    const gMatch = message.match(/\b(?:class|grade)\s*([1-9]|1[0-2])\b/i);
                    if (gMatch) {
                        const gNum = parseInt(gMatch[1], 10);
                        const matchedCls = classes.find(c => c.gradeLevel === gNum);
                        if (matchedCls) {
                            targetClassId = matchedCls.id;
                            targetClassName = matchedCls.name;
                        }
                    }
                    if (!targetClassId) {
                        targetClassId = classes[0].id;
                        targetClassName = classes[0].name;
                    }
                }

                // Generate slots using the robust rule-based engine
                const generatedSlots = aiService.parseTimetableSlotsRuleBased(message, {
                    subjects,
                    instructors,
                    periodStructure: []
                });

                if (generatedSlots && generatedSlots.length > 0) {
                    const timetableAction = {
                        isDraft: true,
                        isConfirmed: false,
                        isCancelled: false,
                        classId: targetClassId,
                        className: targetClassName || 'Class Timetable',
                        slots: generatedSlots
                    };

                    const daySummary = generatedSlots.map(s => `• **${s.dayOfWeek.toUpperCase()} - Period ${s.periodNumber}** (${s.startTime}-${s.endTime}): **${s.subjectName}** ${s.instructorName ? `by *${s.instructorName}*` : ''}`).join('\n');

                    return {
                        message: `📅 **Timetable Slot Draft Created! (Pending Confirmation)**\n\nI have prepared the draft for **${generatedSlots.length} lecture slot(s)** for **${targetClassName || 'Class'}**:\n\n${daySummary}\n\nPlease review or customize the timetable cards below and click **Confirm & Apply to Timetable**:`,
                        sql: null,
                        executionResult: null,
                        chartData: null,
                        reportAction: null,
                        meetingAction: null,
                        calendarAction: null,
                        assignmentAction: null,
                        noteAction: null,
                        timetableAction,
                        periodTimingAction: null,
                        provider: 'auto'
                    };
                }
            } catch (err) {
                console.error('[ChatBot] Timetable slot creation intent error:', err);
            }
        }

        // Intent detection: Period Timings Extraction from uploaded timing image / timing document / prompt
        const combinedText = (documentContext ? `${documentContext}\n${message}` : message);
        const combinedLower = combinedText.toLowerCase();
        const isPeriodTimingIntent = (
            (userRole === 'admin' || userRole === 'principal' || userRole === 'instructor') &&
            (/\b(period\s*timing|bell\s*timing|bell\s*schedule|timing\s*schedule|period\s*timings|timing\s*with\s*date|school\s*timings|period\s*hours|timing\s*chart)\b/i.test(combinedLower) ||
             (/\b(timing|timings|schedule)\b/i.test(combinedLower) && /\b(period\s*1|period\s*2|p1|p2|08:|09:|10:)/i.test(combinedLower))) &&
            !msgLower.includes('assignment')
        );

        if (isPeriodTimingIntent) {
            try {
                console.log('[ChatBot] Period timing intent detected from prompt/document:', message);

                // Extract date or day
                let extractedDateStr = null;
                let extractedDayOfWeek = 'all';

                const dateMatch = combinedText.match(/\b(\d{4}-\d{2}-\d{2})\b/) ||
                                  combinedText.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/) ||
                                  combinedText.match(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{2,4}?)\b/i);
                if (dateMatch) {
                    extractedDateStr = dateMatch[1];
                }

                const dayMatch = combinedText.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|mon|tue|wed|thu|fri|sat)\b/i);
                if (dayMatch) {
                    const rawDay = dayMatch[1].toLowerCase();
                    if (rawDay.startsWith('mon')) extractedDayOfWeek = 'monday';
                    else if (rawDay.startsWith('tue')) extractedDayOfWeek = 'tuesday';
                    else if (rawDay.startsWith('wed')) extractedDayOfWeek = 'wednesday';
                    else if (rawDay.startsWith('thu')) extractedDayOfWeek = 'thursday';
                    else if (rawDay.startsWith('fri')) extractedDayOfWeek = 'friday';
                    else if (rawDay.startsWith('sat')) extractedDayOfWeek = 'saturday';
                }

                // Parse period timings
                const periods = [];
                const regex1 = /(?:period|lecture|p|slot)\s*#?\s*(\d+)[^\d\n:]*?(\d{1,2}:\d{2})\s*(?:to|-|–|—)\s*(\d{1,2}:\d{2})(?:[^\n]*?(break|lab|assembly|lecture|sports|free))?/gi;
                let m;
                while ((m = regex1.exec(combinedText)) !== null) {
                    const pNum = parseInt(m[1], 10);
                    const startTime = m[2].padStart(5, '0');
                    const endTime = m[3].padStart(5, '0');
                    const rawType = (m[4] || '').toLowerCase();
                    let slotType = 'lecture';
                    if (rawType.includes('break')) slotType = 'break_period';
                    else if (rawType.includes('lab')) slotType = 'lab';
                    else if (rawType.includes('assembly')) slotType = 'assembly';
                    else if (rawType.includes('sports')) slotType = 'sports';

                    if (!periods.some(p => p.periodNumber === pNum)) {
                        periods.push({ periodNumber: pNum, startTime, endTime, slotType });
                    }
                }

                if (periods.length === 0) {
                    const timeRangeRegex = /(\d{1,2}:\d{2})\s*(?:to|-|–|—)\s*(\d{1,2}:\d{2})/g;
                    let count = 1;
                    let tm;
                    while ((tm = timeRangeRegex.exec(combinedText)) !== null) {
                        const startTime = tm[1].padStart(5, '0');
                        const endTime = tm[2].padStart(5, '0');
                        const slotType = count === 4 ? 'break_period' : 'lecture';
                        periods.push({ periodNumber: count, startTime, endTime, slotType });
                        count++;
                    }
                }

                periods.sort((a, b) => a.periodNumber - b.periodNumber);

                if (periods.length > 0) {
                    const periodTimingAction = {
                        isDraft: true,
                        isConfirmed: false,
                        isCancelled: false,
                        dateStr: extractedDateStr,
                        dayOfWeek: extractedDayOfWeek,
                        isAllDays: extractedDayOfWeek === 'all',
                        periods
                    };

                    const periodsSummary = periods.map(p => `• **Period ${p.periodNumber}**: \`${p.startTime} – ${p.endTime}\` ${p.slotType === 'break_period' ? '*(Break)*' : ''}`).join('\n');

                    return {
                        message: `⏰ **Period Timings Extracted! (Pending Confirmation)**\n\nI have parsed **${periods.length} period timings**${extractedDateStr ? ` for **${extractedDateStr}**` : extractedDayOfWeek !== 'all' ? ` for **${extractedDayOfWeek.toUpperCase()}**` : ' *(All Week)*'}:\n\n${periodsSummary}\n\nPlease review or edit the period timings below and click **Confirm & Apply Timings**:`,
                        sql: null,
                        executionResult: null,
                        chartData: null,
                        reportAction: null,
                        meetingAction: null,
                        calendarAction: null,
                        assignmentAction: null,
                        noteAction: null,
                        classAction: null,
                        timetableAction: null,
                        periodTimingAction,
                        userAction: null,
                        provider: 'auto'
                    };
                }
            } catch (err) {
                console.error('[ChatBot] Period timing intent error:', err);
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

                const assignmentsDraftList = extractedAssignments.map((item, idx) => {
                    const practicalMarks = Number(item.practicalMarks) || 60;
                    const outputMarks = Number(item.outputMarks) || 20;
                    const vivaMarks = Number(item.vivaMarks) || 20;
                    const maxMarks = practicalMarks + outputMarks + vivaMarks;
                    const passingMarksPercentage = Number(item.passingMarksPercentage) || 33;
                    const passingMarks = Math.round((maxMarks * passingMarksPercentage) / 100);
                    const latePenaltyPercent = Number(item.latePenaltyPercent) || 10;

                    return {
                        id: `draft-asg-${Date.now()}-${idx}`,
                        title: item.title || `Lab Task #${idx + 1}`,
                        description: item.description || item.title || `Lab Task #${idx + 1}`,
                        aim: item.aim || item.description || item.title || `Lab Task #${idx + 1}`,
                        experimentNumber: item.experimentNumber || `${idx + 1}`,
                        assignmentType: item.assignmentType || 'program',
                        programmingLanguage: item.programmingLanguage || 'python',
                        subjectId: targetSubjectId,
                        subjectName: subjectObj ? subjectObj.name : 'Computer Science',
                        practicalMarks,
                        outputMarks,
                        vivaMarks,
                        maxMarks,
                        passingMarksPercentage,
                        passingMarks,
                        latePenaltyPercent,
                        dueDate: dueDate.toISOString(),
                        matchedClassIds: resolution.matchedClassIds || [],
                        matchedGroupIds: resolution.matchedGroupIds || [],
                        matchedStudentIds: resolution.matchedStudentIds || [],
                        targetClassNames: matchedClassNames,
                        targetGroupNames: matchedGroupNames,
                        targetStudentNames: matchedStudentNames,
                        targetSummaryStr: targetSummaryStr,
                        status: status
                    };
                });

                const assignmentAction = {
                    isDraft: true,
                    isConfirmed: false,
                    isCancelled: false,
                    academicYearId,
                    assignments: assignmentsDraftList
                };

                const firstAsg = assignmentsDraftList[0];
                const totalAsgs = assignmentsDraftList.length;

                const replyText = totalAsgs === 1
                    ? `📝 **Assignment Draft Prepared! (Pending Confirmation)**\n\nI have generated the draft for **"${firstAsg.title}"**.\n\n- 📚 **Subject:** ${firstAsg.subjectName}\n- 🎯 **Target:** ${firstAsg.targetSummaryStr}\n- 🗓️ **Due Date:** ${dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n- 🏷️ **Type:** \`${firstAsg.assignmentType.toUpperCase()}\`\n\nPlease review or customize the details in the confirmation card below and click **Confirm & Create Assignment** or **Cancel**:`
                    : `📝 **${totalAsgs} Assignment Drafts Prepared! (Pending Confirmation)**\n\nI have prepared the draft assignments based on your request. Please review the details below and click **Confirm & Create Assignments** or **Cancel**:`;

                return {
                    message: replyText,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    meetingAction: null,
                    calendarAction: null,
                    assignmentAction,
                    noteAction: null,
                    provider: 'groq'
                };
            } catch (err) {
                console.error('[ChatBot] Direct AI assignment draft creation failed:', err.message);
                return {
                    message: `⚠️ **Unable to Generate Assignment Draft**\n\nReason: ${err.message}\n\nPlease try again or use the **✨ AI Auto-Generate** button on the Assignments page.`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    meetingAction: null,
                    calendarAction: null,
                    assignmentAction: null,
                    noteAction: null,
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
                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const fallbackUser = await prisma.user.findFirst({ where: { role: { in: ['admin', 'instructor'] } } });
                const hostId = currentUser?.id || fallbackUser?.id;
                const schoolId = currentUser?.schoolId || (await prisma.school.findFirst()).id;

                const [classes, groups, students] = await Promise.all([
                    prisma.class.findMany({ select: { id: true, name: true, gradeLevel: true, section: true } }),
                    prisma.studentGroup.findMany({ select: { id: true, name: true, class: { select: { name: true } } } }),
                    prisma.user.findMany({ where: { role: 'student' }, select: { id: true, firstName: true, lastName: true, admissionNumber: true } })
                ]);

                const parsed = await aiService.parseMeetingDetails(message, { classes, groups, students }, options.provider || 'auto');

                const meetingLink = Math.random().toString(36).substring(2, 10);
                const type = parsed.type || 'scheduled';
                const scheduledAt = parsed.isoDateTime ? new Date(parsed.isoDateTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
                const durationMinutes = parsed.durationMinutes || 15;

                const targetClassId = parsed.matchedClassIds?.[0] || null;
                const targetGroupId = parsed.matchedGroupIds?.[0] || null;
                const targetStudentId = parsed.matchedStudentIds?.[0] || null;

                const matchedClass = targetClassId ? classes.find(c => c.id === targetClassId) : null;
                const matchedGroup = targetGroupId ? groups.find(g => g.id === targetGroupId) : null;
                const matchedStudent = targetStudentId ? students.find(s => s.id === targetStudentId) : null;

                let targetDesc = 'All invited participants';
                if (matchedClass) targetDesc = `Class: **${matchedClass.name}**`;
                else if (matchedGroup) targetDesc = `Group: **${matchedGroup.name}**`;
                else if (matchedStudent) targetDesc = `Student: **${matchedStudent.firstName} ${matchedStudent.lastName}** (${matchedStudent.admissionNumber})`;

                const sessionTitle = parsed.title || `AI ${type === 'scheduled' ? 'Scheduled' : 'Instant'} Meeting${matchedClass ? ` (${matchedClass.name})` : ''}`;

                const meeting = await prisma.meeting.create({
                    data: {
                        title: sessionTitle,
                        type,
                        meetingLink,
                        hostId,
                        schoolId,
                        scheduledAt,
                        durationMinutes,
                        status: type === 'scheduled' ? 'scheduled' : 'in_progress',
                        actualStartTime: type === 'instant' ? new Date() : null,
                        autoStart: true,
                        targetClassId,
                        targetGroupId,
                        targetStudentId,
                        questionsAsked: {
                            roomCode: meetingLink,
                            passcode: 'k8m2px9a',
                            sessionTitle,
                            autoAdmit: true,
                            targetName: matchedClass?.name || matchedGroup?.name || (matchedStudent ? `${matchedStudent.firstName} ${matchedStudent.lastName}` : null)
                        }
                    }
                });

                // Auto-create notifications for participants
                if (targetClassId) {
                    const enrollments = await prisma.classEnrollment.findMany({
                        where: { classId: targetClassId, status: 'active' },
                        select: { studentId: true }
                    });
                    for (const e of enrollments) {
                        await prisma.notification.create({
                            data: {
                                userId: e.studentId,
                                title: 'New Meeting Scheduled',
                                message: `Meeting "${sessionTitle}" is scheduled for ${scheduledAt.toLocaleString()}.`,
                                type: 'meeting_invite',
                                action_url: `/meeting/${meetingLink}`
                            }
                        }).catch(() => {});
                    }
                } else if (targetStudentId) {
                    await prisma.notification.create({
                        data: {
                            userId: targetStudentId,
                            title: 'New Meeting Scheduled',
                            message: `Meeting "${sessionTitle}" is scheduled for ${scheduledAt.toLocaleString()}.`,
                            type: 'meeting_invite',
                            action_url: `/meeting/${meetingLink}`
                        }
                    }).catch(() => {});
                }

                // Broadcast socket update to all connected clients & meeting page
                try {
                    const io = cronService.getSocketIO();
                    if (io) {
                        io.emit('meetings:updated');
                        io.emit('meeting:created', { meetingId: meeting.id, roomCode: meetingLink });
                    }
                } catch (socketErr) {
                    console.warn('[ChatBot] Socket broadcast error:', socketErr.message);
                }

                const meetingAction = {
                    id: meeting.id,
                    meetingLink: meeting.meetingLink,
                    title: meeting.title,
                    type: meeting.type,
                    scheduledAt: meeting.scheduledAt ? meeting.scheduledAt.toISOString() : null,
                    durationMinutes: meeting.durationMinutes,
                    targetType: matchedClass ? 'class' : (matchedGroup ? 'group' : (matchedStudent ? 'student' : 'all')),
                    targetId: targetClassId || targetGroupId || targetStudentId || null,
                    targetName: matchedClass?.name || matchedGroup?.name || (matchedStudent ? `${matchedStudent.firstName} ${matchedStudent.lastName}` : 'All Participants'),
                    status: meeting.status,
                    isConfirmed: false
                };

                return {
                    message: `✨ **Meeting Created & Ready for Final Confirmation!**\n\n- **Meeting Title:** ${sessionTitle}\n- **Type:** ${type.toUpperCase()}\n- **Audience:** ${targetDesc}\n- **Duration:** ${durationMinutes} minutes *(auto-ends when time expires)*\n- **Scheduled Time:** ${scheduledAt.toLocaleString()}\n- **Meeting ID:** \`${meetingLink}\`\n\nReview or edit the details directly in the box below and click **Confirm & Finalize**:`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    meetingAction,
                    provider: 'groq'
                };
            } catch (err) {
                console.error('[ChatBot] Meeting creation failed:', err.message);
            }
        }

        // Intent: Note Creation
        const isNoteCreationIntent = (
            /\b(create|add|save|make|write|take|keep)\s+(a\s+|an\s+)?(note|admin\s*note|sticky\s*note|memo|reminder)\b/i.test(msgLower) ||
            /\b(note\s*down|take\s*note|make\s*note|save\s*note|create\s*note|add\s*note)\b/i.test(msgLower) ||
            /^(note|notes|memo|reminder)\s*:/i.test(msgLower.trim()) ||
            msgLower.includes('ਨੋਟ ਬਣਾਓ') || msgLower.includes('ਨੋਟ ਲਿਖੋ') || msgLower.includes('ਨੋਟ ਸੇਵ') ||
            msgLower.includes('नोट बनाएं') || msgLower.includes('नोट लिखें') || msgLower.includes('नोट जोड़ें')
        );

        if (isNoteCreationIntent) {
            try {
                console.log('[ChatBot] Note creation intent detected');
                
                let rawContent = documentContext || message;
                let noteContent = rawContent
                    .replace(/^(please\s+)?(can you\s+)?(create|add|save|make|write|take|keep)\s+(a\s+|an\s+)?(note|admin\s*note|sticky\s*note|memo|reminder)\s*(about|on|for|that|:|to)?/gi, '')
                    .replace(/^(note\s*down|take\s*note|make\s*note|save\s*note|create\s*note|add\s*note)\s*(about|on|for|that|:|to)?/gi, '')
                    .replace(/^(note|notes|memo|reminder)\s*:\s*/gi, '')
                    .trim();

                if (!noteContent) noteContent = 'New AI Note';

                const lines = noteContent.split('\n').map(l => l.trim()).filter(Boolean);
                let title = 'AI Generated Note';
                if (lines.length > 0) {
                    const firstLine = lines[0].replace(/^[#*-]\s*/, '').trim();
                    title = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
                }

                // Smart category detection
                let category = 'general';
                const lower = noteContent.toLowerCase();
                if (lower.includes('exam') || lower.includes('class') || lower.includes('student') || lower.includes('syllabus') || lower.includes('subject') || lower.includes('attendance') || lower.includes('academic') || lower.includes('lecture')) {
                    category = 'academic';
                } else if (lower.includes('lab') || lower.includes('pc') || lower.includes('equipment') || lower.includes('computer') || lower.includes('shift') || lower.includes('hardware')) {
                    category = 'lab';
                } else if (lower.includes('remind') || lower.includes('tomorrow') || lower.includes('deadline') || lower.includes('due') || lower.includes('schedule') || lower.includes('meeting')) {
                    category = 'reminder';
                } else if (lower.includes('urgent') || lower.includes('critical') || lower.includes('important') || lower.includes('alert') || lower.includes('attention')) {
                    category = 'important';
                } else if (lower.includes('admin') || lower.includes('fee') || lower.includes('procurement') || lower.includes('vendor') || lower.includes('principal') || lower.includes('staff')) {
                    category = 'admin';
                }

                const noteAction = {
                    isDraft: true,
                    isConfirmed: false,
                    isCancelled: false,
                    title,
                    content: noteContent,
                    category
                };

                return {
                    message: `📌 **Note Draft Created! (Pending Confirmation)**\n\nI have prepared the draft note **"${title}"**.\n\nPlease review or edit the note content below and click **Confirm & Save Note** or **Cancel**:`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    meetingAction: null,
                    calendarAction: null,
                    assignmentAction: null,
                    noteAction,
                    provider: 'groq'
                };
            } catch (err) {
                console.error('[ChatBot] Note creation failed:', err.message);
                return {
                    message: `⚠️ **Unable to Generate Note Draft**\n\nReason: ${err.message}`,
                    sql: null,
                    executionResult: null,
                    chartData: null,
                    reportAction: null,
                    meetingAction: null,
                    calendarAction: null,
                    assignmentAction: null,
                    noteAction: null,
                    provider: 'groq'
                };
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

        // Intent: Mark All 2nd Saturdays and All Sundays as Holidays
        const isWeekendHolidayIntent = (
            userRole === 'admin' || userRole === 'principal'
        ) && (
            (msgLower.includes('second sat') || msgLower.includes('2nd sat') || msgLower.includes('sunday') || msgLower.includes('sundays') || msgLower.includes('weekend') || msgLower.includes('ਐਤਵਾਰ') || msgLower.includes('ਦੂਜਾ ਸ਼ਨੀਵਾਰ') || msgLower.includes('दूसरा शनिवार') || msgLower.includes('रविवार')) &&
            (msgLower.includes('holiday') || msgLower.includes('holidays') || msgLower.includes('mark') || msgLower.includes('set') || msgLower.includes('seed') || msgLower.includes('add') || msgLower.includes('ਛੁੱਟੀ') || msgLower.includes('ਛੁੱਟੀਆਂ') || msgLower.includes('ਮਾਰਕ'))
        );

        if (isWeekendHolidayIntent) {
            try {
                console.log('[ChatBot] Weekend holiday intent detected:', message);
                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const schoolId = currentUser?.schoolId;

                let targetAcademicYearId = academicYearId;
                let startDate, endDate;

                if (targetAcademicYearId) {
                    const ay = await prisma.academicYear.findUnique({ where: { id: targetAcademicYearId } });
                    if (ay) {
                        startDate = new Date(ay.startDate);
                        endDate = new Date(ay.endDate);
                    }
                }

                if (!targetAcademicYearId || !startDate || !endDate) {
                    const currYear = await prisma.academicYear.findFirst({
                        where: { schoolId, isCurrent: true }
                    });
                    if (currYear) {
                        targetAcademicYearId = currYear.id;
                        startDate = new Date(currYear.startDate);
                        endDate = new Date(currYear.endDate);
                    } else {
                        const baseYear = new Date().getFullYear();
                        startDate = new Date(baseYear, 0, 1);
                        endDate = new Date(baseYear, 11, 31);
                    }
                }

                if (!targetAcademicYearId) {
                    const anyYear = await prisma.academicYear.findFirst({ where: { schoolId } });
                    targetAcademicYearId = anyYear?.id;
                }

                if (schoolId && targetAcademicYearId) {
                    let sundaysCount = 0;
                    let secondSaturdaysCount = 0;
                    let totalCount = 0;

                    const current = new Date(startDate);
                    while (current <= endDate) {
                        const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat
                        const dayOfMonth = current.getDate();

                        const isSunday = dayOfWeek === 0;
                        const isSecondSaturday = dayOfWeek === 6 && (dayOfMonth >= 8 && dayOfMonth <= 14);

                        if (isSunday || isSecondSaturday) {
                            const dateStr = current.toISOString().split('T')[0];
                            const title = isSunday ? 'Sunday' : 'Second Saturday';
                            const titleHindi = isSunday ? 'ਐਤਵਾਰ / रविवार' : 'ਦੂਜਾ ਸ਼ਨੀਵਾਰ / दूसरा शनिवार';

                            try {
                                const dateObj = new Date(dateStr);
                                const existing = await prisma.schoolCalendar.findFirst({
                                    where: { schoolId, date: dateObj, isHoliday: true }
                                });

                                if (existing) {
                                    await prisma.schoolCalendar.update({
                                        where: { id: existing.id },
                                        data: {
                                            title,
                                            titleHindi,
                                            type: 'gazetted_holiday',
                                            isHoliday: true
                                        }
                                    });
                                } else {
                                    await prisma.schoolCalendar.create({
                                        data: {
                                            schoolId,
                                            academicYearId: targetAcademicYearId,
                                            date: dateObj,
                                            title,
                                            titleHindi,
                                            type: 'gazetted_holiday',
                                            isHoliday: true,
                                            source: 'admin_custom',
                                            createdById: userId
                                        }
                                    });
                                }

                                if (isSunday) sundaysCount++;
                                if (isSecondSaturday) secondSaturdaysCount++;
                                totalCount++;
                            } catch (err) {
                                console.warn(`[ChatBot] Failed to mark ${dateStr} as weekend holiday:`, err.message);
                            }
                        }

                        current.setDate(current.getDate() + 1);
                    }

                    // Broadcast update via Socket.io
                    try {
                        const io = cronService.getSocketIO();
                        if (io) io.emit('calendar:updated');
                    } catch (e) {}

                    return {
                        message: `🗓️ **Weekends Marked as Holidays Successfully!**\n\nAll **Sundays** and **Second Saturdays** have been marked as holidays in the school calendar:\n\n- 🔴 **Total Weekend Holidays:** ${totalCount}\n- ☀️ **Sundays:** ${sundaysCount}\n- 📅 **Second Saturdays:** ${secondSaturdaysCount}\n\n✨ [Click here to view School Calendar](/admin/calendar)`,
                        sql: null,
                        executionResult: null,
                        chartData: null,
                        reportAction: null,
                        provider: 'groq'
                    };
                }
            } catch (err) {
                console.error('[ChatBot] Weekend holiday handler failed:', err.message);
            }
        }

        // Intent: Query / Search Holidays in coming month, this month, or between two dates
        const docLower = (documentContext || '').toLowerCase();
        const hasHolidayDoc = documentContext && documentContext.length > 20 && (
            docLower.includes('holiday') || docLower.includes('vacation') || docLower.includes('gazette') ||
            docLower.includes('ਛੁੱਟੀਆਂ') || docLower.includes('ਛੁੱਟੀ') || docLower.includes('ਕੈਲੰਡਰ') ||
            docLower.includes('ਗੁਰਪੁਰਬ') || docLower.includes('ਸ਼ਹੀਦੀ') || docLower.includes('ਵੈਸਾਖੀ') ||
            docLower.includes('ਦੀਵਾਲੀ') || docLower.includes('त्योहार') || docLower.includes('छुट्टी') ||
            docLower.includes('अवकाश') || docLower.includes('calendar') || docLower.includes('academic calendar') ||
            docLower.includes('diwali') || docLower.includes('baisakhi') || docLower.includes('republic day') ||
            docLower.includes('independence day') || docLower.includes('holi') || docLower.includes('dusshra')
        );

        const isHolidayQueryIntent = (
            msgLower.includes('check holiday') || msgLower.includes('check holidays') ||
            msgLower.includes('what are the holidays') || msgLower.includes('what holidays') ||
            msgLower.includes('list holidays') || msgLower.includes('show holidays') ||
            msgLower.includes('holidays in') || msgLower.includes('holiday in') ||
            msgLower.includes('holidays next month') || msgLower.includes('holidays coming month') ||
            msgLower.includes('holidays between') || msgLower.includes('upcoming holidays') ||
            msgLower.includes('how many holidays') || msgLower.includes('any holidays') ||
            msgLower.includes('is there any holiday') || msgLower.includes('ਛੁੱਟੀਆਂ ਚੈੱਕ') ||
            msgLower.includes('ਛੁੱਟੀਆਂ ਦੱਸੋ') || msgLower.includes('ਕਿਹੜੀਆਂ ਛੁੱਟੀਆਂ') ||
            msgLower.includes('ਛੁੱਟੀਆਂ ਦੀ ਸੂਚੀ') || msgLower.includes('ਅਗਲੇ ਮਹੀਨੇ ਦੀਆਂ ਛੁੱਟੀਆਂ') ||
            msgLower.includes('छुट्टियां बताओ') || msgLower.includes('छुट्टी कब है') ||
            msgLower.includes('छुट्टियों की सूची') || msgLower.includes('अगले महीने की छुट्टियां')
        ) && !hasHolidayDoc && !msgLower.includes('create') && !msgLower.includes('add') && !msgLower.includes('import') && !msgLower.includes('mark') && !msgLower.includes('seed');

        if (isHolidayQueryIntent) {
            try {
                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const schoolId = currentUser?.schoolId;

                if (schoolId) {
                    const now = new Date();
                    let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    let endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
                    let periodLabel = 'Upcoming Months';

                    const months = [
                        { name: 'january', idx: 0 }, { name: 'february', idx: 1 }, { name: 'march', idx: 2 },
                        { name: 'april', idx: 3 }, { name: 'may', idx: 4 }, { name: 'june', idx: 5 },
                        { name: 'july', idx: 6 }, { name: 'august', idx: 7 }, { name: 'september', idx: 8 },
                        { name: 'october', idx: 9 }, { name: 'november', idx: 10 }, { name: 'december', idx: 11 }
                    ];

                    if (msgLower.includes('next month') || msgLower.includes('coming month') || msgLower.includes('ਅਗਲੇ ਮਹੀਨੇ') || msgLower.includes('अगले महीने')) {
                        const targetMonth = now.getMonth() + 1;
                        startDate = new Date(now.getFullYear(), targetMonth, 1);
                        endDate = new Date(now.getFullYear(), targetMonth + 1, 0, 23, 59, 59);
                        periodLabel = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                    } else if (msgLower.includes('this month') || msgLower.includes('ਇਸ ਮਹੀਨੇ') || msgLower.includes('इस महीने')) {
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                        periodLabel = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                    } else {
                        const matchedMonth = months.find(m => msgLower.includes(m.name));
                        if (matchedMonth) {
                            let targetYear = now.getFullYear();
                            if (matchedMonth.idx < now.getMonth()) targetYear += 1;
                            startDate = new Date(targetYear, matchedMonth.idx, 1);
                            endDate = new Date(targetYear, matchedMonth.idx + 1, 0, 23, 59, 59);
                            periodLabel = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                        } else {
                            // Check for between dates (e.g. between 2026-08-01 and 2026-10-31 or 1 Aug to 30 Sep)
                            const dateMatch = message.match(/(?:between|from)\s+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\s+[A-Za-z]+|[0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})\s+(?:and|to)\s+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\s+[A-Za-z]+|[0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i);
                            if (dateMatch) {
                                const d1 = new Date(dateMatch[1]);
                                const d2 = new Date(dateMatch[2]);
                                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                                    startDate = d1;
                                    endDate = new Date(d2.setHours(23, 59, 59));
                                    periodLabel = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
                                }
                            }
                        }
                    }

                    const holidays = await prisma.schoolCalendar.findMany({
                        where: {
                            schoolId,
                            date: {
                                gte: startDate,
                                lte: endDate
                            },
                            isHoliday: true
                        },
                        orderBy: { date: 'asc' }
                    });

                    const formatTypeBadge = (type) => {
                        switch (type) {
                            case 'gazetted_holiday': return '🔴 Gazetted Holiday';
                            case 'restricted_holiday': return '🟡 Restricted Holiday';
                            case 'summer_vacation': return '🏖️ Summer Vacation';
                            case 'winter_vacation': return '❄️ Winter Vacation';
                            case 'exam_day': return '🟣 Exam Day';
                            case 'event': return '🔵 School Event';
                            default: return '⚪ Holiday';
                        }
                    };

                    if (holidays.length > 0) {
                        const tableRows = holidays.map(h => {
                            const d = new Date(h.date);
                            const dateStr = d.toISOString().split('T')[0];
                            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                            const regionalName = h.titleHindi ? h.titleHindi : '-';
                            const badge = formatTypeBadge(h.type);
                            return `| \`${dateStr}\` | **${dayName}** | ${h.title} | ${regionalName} | ${badge} |`;
                        }).join('\n');

                        return {
                            message: `🗓️ **Holidays in ${periodLabel}**\n\nFound **${holidays.length} holiday(s)** in the school calendar:\n\n| Date | Day | Holiday (English) | Regional Name (ਪੰਜਾਬੀ / हिंदी) | Type |\n| :--- | :--- | :--- | :--- | :--- |\n${tableRows}\n\n✨ [Open School Calendar](/admin/calendar)`,
                            sql: null,
                            executionResult: null,
                            chartData: null,
                            reportAction: null,
                            meetingAction: null,
                            calendarAction: null,
                            provider: 'groq'
                        };
                    } else {
                        return {
                            message: `🗓️ **No holidays found in ${periodLabel}** (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}).\n\nWould you like me to add an event or seed holidays for this period? ✨ [Open School Calendar](/admin/calendar)`,
                            sql: null,
                            executionResult: null,
                            chartData: null,
                            reportAction: null,
                            meetingAction: null,
                            calendarAction: null,
                            provider: 'groq'
                        };
                    }
                }
            } catch (err) {
                console.error('[ChatBot] Holiday query handler failed:', err.message);
            }
        }

        // Intent: Create Single Event / Exam Day with Datetime via Prompt
        const isSingleEventCreationIntent = (
            userRole === 'admin' || userRole === 'principal'
        ) && (
            msgLower.includes('create event') || msgLower.includes('add event') ||
            msgLower.includes('schedule event') || msgLower.includes('schedule exam') ||
            msgLower.includes('create exam') || msgLower.includes('add exam') ||
            msgLower.includes('create holiday') || msgLower.includes('add holiday') ||
            msgLower.includes('ਈਵੈਂਟ ਸ਼ਾਮਲ') || msgLower.includes('ਈਵੈਂਟ ਬਣਾਓ') ||
            msgLower.includes('ਇਵੈਂਟ ਬਣਾਓ') || msgLower.includes('ਇਮਤਿਹਾਨ ਸ਼ਾਮਲ') ||
            msgLower.includes('इवेंट जोड़ें') || msgLower.includes('परीक्षा जोड़ें')
        ) && !hasHolidayDoc;

        if (isSingleEventCreationIntent) {
            try {
                console.log('[ChatBot] Single event creation intent detected:', message);
                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const schoolId = currentUser?.schoolId;

                let targetAcademicYearId = academicYearId;
                if (!targetAcademicYearId && schoolId) {
                    const currYear = await prisma.academicYear.findFirst({
                        where: { schoolId, isCurrent: true }
                    });
                    targetAcademicYearId = currYear?.id;
                }

                if (schoolId && targetAcademicYearId) {
                    const eventExtractPrompt = `You are a school calendar event scheduler.
Parse the user request to extract a single calendar event or exam with date and time.
Current Reference Date: ${new Date().toISOString().split('T')[0]} (Year: ${new Date().getFullYear()})

Return ONLY a valid JSON object in this exact structure:
{
  "title": "Clean English title of event",
  "titleHindi": "Regional language name (Punjabi/Hindi) if applicable or empty string",
  "date": "YYYY-MM-DD",
  "time": "HH:MM AM/PM or empty string",
  "type": "event",
  "isHoliday": false
}

Allowed types: "event", "exam_day", "gazetted_holiday", "restricted_holiday", "summer_vacation", "winter_vacation", "custom".
Default isHoliday to false for events and exam_day, true for holidays/vacations.

User Request: ${message}
`;
                    let eventData = null;
                    if (this.groqClient) {
                        try {
                            const res = await this.groqClient.chat.completions.create({
                                model: 'llama-3.3-70b-versatile',
                                messages: [{ role: 'user', content: eventExtractPrompt }],
                                temperature: 0.1
                            });
                            const raw = res.choices[0]?.message?.content || '';
                            const match = raw.match(/\{[\s\S]*\}/);
                            if (match) eventData = JSON.parse(match[0]);
                        } catch (e) {
                            console.warn('[ChatBot] Groq event parsing failed:', e.message);
                        }
                    }

                    if (!eventData && this.geminiModels && this.geminiModels.length > 0) {
                        try {
                            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                            const res = await model.generateContent(eventExtractPrompt);
                            const raw = res.response.text();
                            const match = raw.match(/\{[\s\S]*\}/);
                            if (match) eventData = JSON.parse(match[0]);
                        } catch (e) {
                            console.warn('[ChatBot] Gemini event parsing failed:', e.message);
                        }
                    }

                    if (eventData && eventData.date && eventData.title) {
                        const finalTitle = eventData.title + (eventData.time ? ` (${eventData.time})` : '');
                        const dayName = new Date(eventData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

                        const calendarAction = {
                            isSingleEvent: true,
                            academicYearId: targetAcademicYearId,
                            isConfirmed: false,
                            events: [
                                {
                                    id: `draft-event-${Date.now()}`,
                                    title: finalTitle,
                                    rawTitle: eventData.title,
                                    titleHindi: eventData.titleHindi || '',
                                    date: eventData.date,
                                    time: eventData.time || '',
                                    type: eventData.type || 'event',
                                    isHoliday: eventData.isHoliday !== undefined ? eventData.isHoliday : false
                                }
                            ]
                        };

                        return {
                            message: `🗓️ **Event Draft Created! (Pending Confirmation)**\n\nI have prepared the draft event for **${finalTitle}** on **${eventData.date} (${dayName})**.\n\nPlease review or customize the details in the confirmation card below and click **Confirm & Add to Calendar** to save it, or click **Cancel** to discard:`,
                            sql: null,
                            executionResult: null,
                            chartData: null,
                            reportAction: null,
                            meetingAction: null,
                            calendarAction,
                            provider: 'groq'
                        };
                    }
                }
            } catch (err) {
                console.error('[ChatBot] Single event creation failed:', err.message);
            }
        }

        // Intent: School Calendar & Holiday Import / Update (Multilingual: Punjabi Gurmukhi, Hindi, English)
        const isCalendarHolidayIntent = (
            userRole === 'admin' || userRole === 'principal'
        ) && (
            (msgLower.includes('calendar') || msgLower.includes('holiday') || msgLower.includes('holidays') || 
             msgLower.includes('vacation') || msgLower.includes('ਛੁੱਟੀਆਂ') || msgLower.includes('ਛੁੱਟੀ') || 
             msgLower.includes('ਕੈਲੰਡਰ') || msgLower.includes('ਗੁਰਪੁਰਬ') || msgLower.includes('ਵੈਸਾਖੀ') || 
             msgLower.includes('ਦੀਵਾਲੀ') || msgLower.includes('ਸ਼ਹੀਦੀ ਦਿਵਸ') || msgLower.includes('ਦਿਵਸ') ||
             msgLower.includes('त्योहार') || msgLower.includes('छुट्टी') || msgLower.includes('छुट्टियां') || msgLower.includes('कैलेंडर')) ||
            hasHolidayDoc
        );

        if (isCalendarHolidayIntent) {
            try {
                console.log('[ChatBot] Calendar / Holiday intent detected:', message);
                const currentUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
                const schoolId = currentUser?.schoolId;

                let targetAcademicYearId = academicYearId;
                let activeYearLabel = `${new Date().getFullYear()}`;
                if (!targetAcademicYearId && schoolId) {
                    const currYear = await prisma.academicYear.findFirst({
                        where: { schoolId, isCurrent: true }
                    });
                    targetAcademicYearId = currYear?.id;
                    if (currYear?.yearLabel) activeYearLabel = currYear.yearLabel;
                }

                if (schoolId && targetAcademicYearId) {
                    const holidayExtractPrompt = `You are an expert multilingual school calendar parser.
Extract all holidays, vacation periods, and events from the text below. Accurately recognize Indian languages, particularly Punjabi (Gurmukhi) and Hindi.

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "date": "YYYY-MM-DD",
    "title": "English Name of Holiday",
    "titleHindi": "Original Punjabi (Gurmukhi) / Hindi Name (e.g. ਵੈਸਾਖੀ / बैसाखी)",
    "type": "gazetted_holiday",
    "isHoliday": true
  }
]

Allowed types: "gazetted_holiday", "restricted_holiday", "summer_vacation", "winter_vacation", "exam_day", "event", "custom".
If a date range is mentioned (e.g., Summer Vacation 1 June to 30 June), generate an entry for key dates or distinct periods.
Reference Year: ${new Date().getFullYear()}

User Request: ${message}
Document/Context:
${documentContext || message}
`;

                    let parsedHolidays = [];
                    // Try Groq first for structured JSON extraction
                    if (this.groqClient) {
                        try {
                            const res = await this.groqClient.chat.completions.create({
                                model: 'llama-3.3-70b-versatile',
                                messages: [{ role: 'user', content: holidayExtractPrompt }],
                                temperature: 0.1
                            });
                            const raw = res.choices[0]?.message?.content || '';
                            const match = raw.match(/\[[\s\S]*\]/);
                            if (match) parsedHolidays = JSON.parse(match[0]);
                        } catch (e) {
                            console.warn('[ChatBot] Groq holiday parsing failed:', e.message);
                        }
                    }

                    if (parsedHolidays.length === 0 && this.geminiModels && this.geminiModels.length > 0) {
                        try {
                            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                            const res = await model.generateContent(holidayExtractPrompt);
                            const raw = res.response.text();
                            const match = raw.match(/\[[\s\S]*\]/);
                            if (match) parsedHolidays = JSON.parse(match[0]);
                        } catch (e) {
                            console.warn('[ChatBot] Gemini holiday parsing failed:', e.message);
                        }
                    }

                    if (parsedHolidays && parsedHolidays.length > 0) {
                        const calendarAction = {
                            academicYearId: targetAcademicYearId,
                            yearLabel: activeYearLabel,
                            events: parsedHolidays.filter(h => h.date && h.title).map((h, i) => ({
                                id: `draft-${i}`,
                                date: h.date,
                                title: h.title,
                                titleHindi: h.titleHindi || '',
                                type: h.type || 'gazetted_holiday',
                                isHoliday: h.isHoliday !== undefined ? h.isHoliday : true
                            })),
                            isConfirmed: false
                        };

                        return {
                            message: `🗓️ **Recognized ${calendarAction.events.length} Holidays / Events!**\n\nI have extracted and recognized the holiday schedule with Indian regional language support (ਪੰਜਾਬੀ / हिंदी).\n\nPlease review or edit the recognized list in the confirmation box below and click **Confirm & Add to Calendar** to update your school calendar:`,
                            sql: null,
                            executionResult: null,
                            chartData: null,
                            reportAction: null,
                            meetingAction: null,
                            calendarAction,
                            provider: 'groq'
                        };
                    }
                }
            } catch (err) {
                console.error('[ChatBot] Calendar holiday handler failed:', err.message);
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
            // Auto order: Gemini first (1M context + handles full DB schema without 413 error), Groq fallback
            const available = [];
            if (this.geminiModels.length) available.push(tryGemini);
            if (this.groqClient) available.push(tryGroq);
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
            // Clean out redundant raw SQL codeblocks from visible text so only clean natural language and visual cards are shown
            if (executedSQL || queryResult) {
                aiText = aiText.replace(/```sql[\s\S]*?```/gi, '').trim();
            }
        }

        // Check if user explicitly asked for a chart or graph
        const isChartExplicitlyRequested = /\b(chart|graph|plot|visualize|visualization|pie|bar\s*chart|line\s*chart|area\s*chart|donut\s*chart|doughnut|histogram)\b/i.test(msgLower);

        // Extract chart data ONLY IF explicitly requested by the user
        let chartData = null;
        const chartMatch = aiText.match(/```chart\n?([\s\S]*?)```/);
        if (chartMatch) {
            if (isChartExplicitlyRequested) {
                try { chartData = JSON.parse(chartMatch[1].trim()); } catch (e) { console.warn('[ChatBot] Chart parse failed:', e.message); }
            }
            aiText = aiText.replace(/```chart\n?[\s\S]*?```/g, '').trim();
        }

        // If user explicitly asked for a chart/graph and we have query results to visualize
        if (isChartExplicitlyRequested && queryResult?.success && queryResult.rows?.length >= 1) {
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
        } else {
            chartData = null;
        }

        if (!aiText && queryResult?.success) {
            aiText = `Here is the information retrieved from the database (${queryResult.rows?.length || 0} ${queryResult.rows?.length === 1 ? 'record' : 'records'}):`;
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
            const isText = mimeType.includes('text/plain') || mimeType.includes('text/csv') || fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.csv');
            if (isText) return buffer.toString('utf-8');

            const isJson = mimeType.includes('application/json') || fileName.toLowerCase().endsWith('.json');
            if (isJson) {
                try {
                    return JSON.stringify(JSON.parse(buffer.toString('utf-8')), null, 2);
                } catch (e) {
                    return buffer.toString('utf-8');
                }
            }

            const isPdf = mimeType.includes('application/pdf') || fileName.toLowerCase().endsWith('.pdf');
            if (isPdf) {
                try {
                    const pdfParse = require('pdf-parse');
                    const data = await pdfParse(buffer);
                    // Retain all Unicode scripts (Punjabi Gurmukhi \u0A00-\u0A7F, Hindi Devanagari \u0900-\u097F, etc.) while stripping non-printable control chars
                    let readable = data.text
                        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
                        .replace(/\r\n/g, '\n')
                        .replace(/[ \t]{3,}/g, '  ')
                        .trim();

                    if (readable.length > 40) {
                        return readable.substring(0, 30000);
                    }
                    console.log('[ChatBot] PDF text empty or scanned, attempting AI Vision OCR...');
                } catch (pdfErr) {
                    console.warn('[ChatBot] pdf-parse failed, attempting AI Vision fallback:', pdfErr.message);
                }
            }

            // If image or scanned PDF, use Multimodal AI Vision (Gemini / Groq)
            const isImage = mimeType.startsWith('image/') || fileName.match(/\.(png|jpg|jpeg|webp|bmp|gif|tiff)$/i);
            if (isImage || isPdf) {
                const visionResult = await this.extractMultimodalText(buffer, mimeType, fileName);
                if (visionResult && visionResult.length > 20) {
                    return visionResult;
                }
            }

            return `[Binary file: ${fileName}, ${buffer.length} bytes, ${mimeType}]`;
        } catch (err) { 
            console.error('[ChatBot] Document parse error:', err.message);
            return `[Failed to parse ${fileName}: ${err.message}]`; 
        }
    }

    /**
     * Multimodal OCR / Vision for images and holiday calendar documents with full Indian language support
     */
    async extractMultimodalText(buffer, mimeType, fileName) {
        const base64Data = buffer.toString('base64');
        const effectiveMime = (mimeType && mimeType !== 'application/octet-stream') 
            ? mimeType 
            : (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

        const visionPrompt = `You are an expert multilingual document extractor and OCR specialist for an educational management system.
Your task is to analyze this document / holiday list / academic calendar image or file and transcribe all information in full detail.

CRITICAL INSTRUCTIONS:
1. Accurately recognize and transcribe Indian regional languages, especially Punjabi (Gurmukhi script - ਗੁਰਮੁਖੀ) and Hindi (Devanagari script - देवनागरी), alongside English.
2. If this is a holiday calendar / gazette notification / academic schedule:
   - Extract every holiday, festival, exam day, vacation, and event.
   - Extract the Date (Day, Month, Year).
   - Extract the original name in Punjabi/Hindi (e.g., "ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਪ੍ਰਕਾਸ਼ ਪੁਰਬ", "ਵੈਸਾਖੀ", "ਦੀਵਾਲੀ", "ਹੋਲੀ", "ਗਣਤੰਤਰ ਦਿਵਸ", "ਗਰਮੀਆਂ ਦੀਆਂ ਛੁੱਟੀਆਂ").
   - Extract the English translation/transliteration (e.g. "Guru Nanak Dev Birthday", "Baisakhi", "Diwali", "Republic Day", "Summer Vacation").
   - Extract holiday type (Gazetted Holiday, Restricted Holiday, Vacation, Event).
3. If this is a table, preserve the table structure row by row with dates clearly associated with event names.
4. Return the complete transcription and clean structured list.`;

        // 1. Try Gemini Vision models
        if (this.geminiModels && this.geminiModels.length > 0) {
            const geminiKey = process.env.GEMINI_API_KEY;
            if (geminiKey) {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const visionModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
                for (const modelName of visionModels) {
                    try {
                        console.log(`[ChatBot] Running Gemini Vision (${modelName}) on ${fileName}...`);
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent([
                            visionPrompt,
                            {
                                inlineData: {
                                    data: base64Data,
                                    mimeType: effectiveMime
                                }
                            }
                        ]);
                        const text = result?.response?.text() || '';
                        if (text.trim().length > 20) {
                            console.log(`[ChatBot] Gemini Vision successfully extracted ${text.length} chars from ${fileName}`);
                            return text.trim();
                        }
                    } catch (gErr) {
                        console.warn(`[ChatBot] Gemini Vision (${modelName}) failed:`, gErr.message);
                    }
                }
            }
        }

        // 2. Try Groq Vision (llama-3.2-11b-vision-preview)
        if (this.groqClient && effectiveMime.startsWith('image/')) {
            try {
                console.log(`[ChatBot] Running Groq Vision on ${fileName}...`);
                const dataUrl = `data:${effectiveMime};base64,${base64Data}`;
                const completion = await this.groqClient.chat.completions.create({
                    model: 'llama-3.2-11b-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: visionPrompt },
                                { type: 'image_url', image_url: { url: dataUrl } }
                            ]
                        }
                    ],
                    temperature: 0.1
                });
                const text = completion.choices[0]?.message?.content || '';
                if (text.trim().length > 20) {
                    console.log(`[ChatBot] Groq Vision successfully extracted ${text.length} chars from ${fileName}`);
                    return text.trim();
                }
            } catch (grErr) {
                console.warn('[ChatBot] Groq Vision failed:', grErr.message);
            }
        }

        return '';
    }
}

module.exports = new ChatbotService();
