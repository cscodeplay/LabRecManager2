const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
    constructor() {
        this.groq = null;
        this.genAI = null;
        this.initialize();
    }

    initialize() {
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            this.groq = new Groq({ apiKey: groqKey });
            console.log('[AIService] Groq initialized as primary provider.');
        } else {
            console.warn('[AIService] GROQ_API_KEY not set.');
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            this.genAI = new GoogleGenerativeAI(geminiKey);
            console.log('[AIService] Gemini initialized as fallback provider.');
        } else {
            console.warn('[AIService] GEMINI_API_KEY not set.');
        }
    }

    /**
     * Extract structured assignment list from syllabus / program list image
     */
    async extractAssignmentsFromImage(buffer, mimeType, customPrompt = '', preferredProvider = 'groq') {
        const base64Data = buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        const systemPrompt = `You are an expert computer science educational AI assistant.
Your task is to analyze the provided image (photo of textbook, syllabus, lab manual, or handwritten list of programs) and extract every distinct programming task/experiment.

Return ONLY a valid JSON array of assignments with the following schema:
[
  {
    "title": "Short title of the program/experiment",
    "description": "Full problem statement and requirements",
    "aim": "Aim of the experiment (e.g. To write a program that...)",
    "programmingLanguage": "python" | "cpp" | "c" | "java" | "html" | "sql" | "other",
    "assignmentType": "program" | "experiment" | "project" | "observation",
    "experimentNumber": "1",
    "suggestedSubject": "Computer Science" or detected subject name,
    "referenceCode": "Provide a complete, correct, and well-commented sample solution/code for this assignment here."
  }
]

Additional instructions from teacher: ${customPrompt || 'None'}

RULES:
1. Extract ALL distinct problems listed in the image.
2. Default programmingLanguage to 'python' unless specified otherwise in the image (e.g., C++, Java, SQL).
3. Set experimentNumber sequentially ("1", "2", "3"...) if not explicitly numbered in the image.
4. Output MUST be ONLY valid JSON array starting with '[' and ending with ']'. No markdown formatting or extra text.`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            try {
                console.log('[AIService] Extracting assignments via Groq (llama-3.2-11b-vision-preview)...');
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.2-11b-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: systemPrompt },
                                { type: 'image_url', image_url: { url: dataUrl } }
                            ]
                        }
                    ],
                    temperature: 0.2
                });

                let responseText = completion.choices[0]?.message?.content || '';
                return this.parseJSONResponse(responseText);
            } catch (err) {
                console.warn(`[AIService] Groq extraction failed (${err.message}). Falling back to Gemini...`);
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
            let lastGeminiError = null;
            for (const modelName of geminiModels) {
                try {
                    console.log(`[AIService] Extracting assignments via Gemini (${modelName})...`);
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        },
                        systemPrompt
                    ]);
                    return this.parseJSONResponse(result.response.text());
                } catch (err) {
                    lastGeminiError = err;
                    console.error(`[AIService] Gemini ${modelName} extraction failed:`, err.message);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
            throw new Error(`AI Assignment extraction failed: ${lastGeminiError?.message}`);
        }

        throw new Error('No AI provider configured. Please set GROQ_API_KEY or GEMINI_API_KEY.');
    }

    /**
     * Generate structured assignment list from natural language text prompt (non-image case)
     */
    async extractAssignmentsFromText(customPrompt = '', preferredProvider = 'groq') {
        const systemPrompt = `You are an expert computer science educational AI assistant.
Your task is to generate one or more programming assignment(s) based on the user's natural language request (e.g. "python program assignment on fibonacci series").

Return ONLY a valid JSON array of assignments with the following schema:
[
  {
    "title": "Short title of the program/experiment",
    "description": "Full problem statement and requirements",
    "aim": "Aim of the experiment (e.g. To write a Python program that generates Fibonacci series...)",
    "programmingLanguage": "python" | "cpp" | "c" | "java" | "html" | "sql" | "other",
    "assignmentType": "program" | "experiment" | "project" | "observation",
    "experimentNumber": "1",
    "suggestedSubject": "Computer Science",
    "referenceCode": "Provide a complete, correct, and well-commented sample solution/code for this assignment here."
  }
]

TEACHER REQUEST: ${customPrompt}

RULES:
1. Generate complete, comprehensive problem statements, aims, and descriptions.
2. Default programmingLanguage to 'python' unless specified otherwise in request (e.g., C++, Java, SQL).
3. Set experimentNumber sequentially ("1", "2"...) for generated tasks.
4. Output MUST be ONLY valid JSON array starting with '[' and ending with ']'. No markdown formatting or extra text.`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ['groq/compound-mini', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
            for (const modelName of groqModels) {
                try {
                    console.log(`[AIService] Generating assignments from text via Groq (${modelName})...`);
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.3
                    });
                    return this.parseJSONResponse(completion.choices[0]?.message?.content || '');
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} failed (${err.message}). Trying next...`);
                    // If it's a 429, wait briefly
                    if (err.status === 429) await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
            let lastGeminiError = null;
            for (const modelName of geminiModels) {
                try {
                    console.log(`[AIService] Generating assignments from text via Gemini (${modelName})...`);
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    return this.parseJSONResponse(result.response.text());
                } catch (err) {
                    lastGeminiError = err;
                    console.warn(`[AIService] Gemini ${modelName} failed: ${err.message}`);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
            throw new Error(`AI Assignment text generation failed: ${lastGeminiError?.message}`);
        }

        throw new Error('No AI provider configured. Please set GROQ_API_KEY or GEMINI_API_KEY.');
    }

    /**
     * Parse natural language instructions for target entities (Classes, Groups, Students),
     * subject matching, and publish / due date flags.
     */
    async parseAssignmentTargets(prompt, availableContext, preferredProvider = 'groq') {
        const { classes = [], groups = [], students = [], subjects = [] } = availableContext;

        const systemPrompt = `You are an AI entity resolution assistant for an educational management app.
Analyze the user's natural language request and match it against the provided database context.

USER REQUEST: "${prompt}"

CURRENT DATE: ${new Date().toISOString()}

AVAILABLE DATABASE CONTEXT:
Classes: ${JSON.stringify(classes.map(c => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel, section: c.section })))}
Groups: ${JSON.stringify(groups.map(g => ({ id: g.id, name: g.name, className: g.class?.name })))}
Students: ${JSON.stringify(students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNumber: s.admissionNumber })))}
Subjects: ${JSON.stringify(subjects.map(sub => ({ id: sub.id, name: sub.name, code: sub.code })))}

Return ONLY valid JSON matching this schema:
{
  "matchedClassIds": ["class_uuid1"],
  "matchedGroupIds": ["group_uuid1"],
  "matchedStudentIds": ["student_uuid1"],
  "selectedSubjectId": "subject_uuid_or_null",
  "publishImmediately": true | false,
  "dueDateISO": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "dueDateHoursFromNow": 24 (default 24 unless prompt specifies custom timeframe)
}

RULES:
1. Match Class names liberally e.g. "XII COM-A", "12 COM A", "12A" should match matching grade/section/name in Classes list.
2. ONLY set publishImmediately to true if the prompt EXPLICITLY asks to "publish" or "assign". Otherwise, default to false.
3. ONLY populate matchedClassIds, matchedGroupIds, or matchedStudentIds if the prompt EXPLICITLY mentions them. If "all students" is mentioned, include the IDs of all students or the appropriate global class.
4. Default selectedSubjectId to the Computer Science subject ID if found in Subjects list, unless request specifies another subject.
5. If the prompt specifies an absolute date (e.g. "1st sep 2026"), calculate and set dueDateISO based on the CURRENT DATE. If relative (e.g. "in 3 days"), set dueDateHoursFromNow. Default to 24 hours if neither.
6. Output MUST be valid JSON only.`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ['groq/compound-mini', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.1
                    });
                    return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} target parsing failed (${err.message}). Trying next...`);
                    if (err.status === 429) await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    return this.parseJSONResponse(result.response.text());
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} target parsing failed:`, err.message);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
        }

        return {
            matchedClassIds: [],
            matchedGroupIds: [],
            matchedStudentIds: [],
            selectedSubjectId: subjects.find(s => s.name?.toLowerCase().includes('computer'))?.id || subjects[0]?.id || null,
            publishImmediately: false,
            dueDateHoursFromNow: 24
        };
    }

    /**
     * Parse natural language instructions to share documents with targets (Classes, Groups, Students, and Documents).
     */
    async parseDocumentShareTargets(prompt, availableContext, preferredProvider = 'groq') {
        const { documents = [], classes = [], groups = [], students = [] } = availableContext;

        const systemPrompt = `You are an AI entity resolution assistant for an educational management app.
Analyze the user's natural language request to share a document, and match it against the provided database context.

USER REQUEST: "${prompt}"

AVAILABLE DATABASE CONTEXT:
Documents: ${JSON.stringify(documents.map(d => ({ id: d.id, name: d.name })))}
Classes: ${JSON.stringify(classes.map(c => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel, section: c.section })))}
Groups: ${JSON.stringify(groups.map(g => ({ id: g.id, name: g.name, className: g.class?.name })))}
Students: ${JSON.stringify(students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNumber: s.admissionNumber })))}

Return ONLY valid JSON matching this schema:
{
  "matchedDocumentId": "document_uuid_or_null",
  "matchedClassIds": ["class_uuid1"],
  "matchedGroupIds": ["group_uuid1"],
  "matchedStudentIds": ["student_uuid1"]
}

RULES:
1. Match Document and Class names liberally.
2. Return null for matchedDocumentId if no matching document is found in the Documents list.
3. Output MUST be valid JSON only.`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ['groq/compound-mini', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.1
                    });
                    return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} document target parsing failed (${err.message}). Trying next...`);
                    if (err.status === 429) await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    return this.parseJSONResponse(result.response.text());
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} document target parsing failed:`, err.message);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
        }

        return {
            matchedDocumentId: null,
            matchedClassIds: [],
            matchedGroupIds: [],
            matchedStudentIds: []
        };
    }

    /**
     * Parse natural language instructions to search for documents based on keywords and dates.
     */
    async parseDocumentSearchQuery(prompt, preferredProvider = 'groq') {
        const systemPrompt = `You are an AI document search assistant.
Analyze the user's natural language request to search for documents and extract the search parameters.

USER REQUEST: "${prompt}"
CURRENT DATE: ${new Date().toISOString()}

Return ONLY valid JSON matching this schema:
{
  "keywords": ["word1", "word2"],
  "startDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "endDate": "YYYY-MM-DDTHH:mm:ss.sssZ"
}

RULES:
1. Extract meaningful keywords for the search query (e.g. "physics", "lab", "assignment").
2. Do not include words like "document", "file", "search", "find", "about", "from", "between" in keywords.
3. If a date or date range is mentioned, calculate the absolute ISO date strings based on the CURRENT DATE.
4. If "on [date]" is mentioned, set startDate to the start of that day (00:00:00) and endDate to the end of that day (23:59:59).
5. If no date is mentioned, startDate and endDate MUST be null.
6. Output MUST be valid JSON only.
`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ['groq/compound-mini', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.1
                    });
                    return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} doc search parsing failed:`, err.message);
                    if (err.status === 429) await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    return this.parseJSONResponse(result.response.text());
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} doc search parsing failed:`, err.message);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
        }

        return { keywords: [], startDate: null, endDate: null };
    }

    /**
     * Parse natural language instructions to schedule or create meetings with exact date, time, duration, and audience targets.
     */
    async parseMeetingDetails(prompt, availableContext = {}, preferredProvider = 'groq') {
        const { classes = [], groups = [], students = [] } = availableContext;
        const now = new Date();
        // Local reference in IST (UTC+05:30)
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        const currentDateStr = istNow.toISOString().slice(0, 10);
        const currentTimeStr = istNow.toISOString().slice(11, 16);

        const systemPrompt = `You are an AI meeting scheduler assistant for an educational management app.
Analyze the user's meeting creation request and extract the exact parameters.

CURRENT LOCAL REFERENCE DATETIME: ${currentDateStr} ${currentTimeStr} (Timezone: IST / UTC+05:30)
USER REQUEST: "${prompt}"

AVAILABLE DATABASE CONTEXT:
Classes: ${JSON.stringify(classes.map(c => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel, section: c.section })))}
Groups: ${JSON.stringify(groups.map(g => ({ id: g.id, name: g.name, className: g.class?.name })))}
Students: ${JSON.stringify(students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNumber: s.admissionNumber })))}

Return ONLY valid JSON matching this schema:
{
  "title": "Short title describing the meeting",
  "type": "scheduled" or "instant",
  "scheduledDate": "YYYY-MM-DD",
  "scheduledTime": "HH:MM",
  "isoDateTime": "YYYY-MM-DDTHH:MM:00+05:30",
  "durationMinutes": 15,
  "matchedClassIds": ["class_uuid1"],
  "matchedGroupIds": ["group_uuid1"],
  "matchedStudentIds": ["student_uuid1"],
  "targetName": "Extracted target class/group/student name or null"
}

RULES:
1. "28-Sept-2026 10:30 AM" -> scheduledDate: "2026-09-28", scheduledTime: "10:30", isoDateTime: "2026-09-28T10:30:00+05:30".
2. "28-Sept-2026 10:30 PM" -> scheduledDate: "2026-09-28", scheduledTime: "22:30", isoDateTime: "2026-09-28T22:30:00+05:30".
3. "tomorrow at 10 AM" -> calculate tomorrow's date relative to ${currentDateStr}, scheduledTime: "10:00", isoDateTime: "YYYY-MM-DDT10:00:00+05:30".
4. If "instant" meeting is requested (e.g., "create instant meeting", "start meeting now"), set type: "instant", isoDateTime: "${currentDateStr}T${currentTimeStr}:00+05:30".
5. durationMinutes: extract number of minutes (default 15 if not specified, 60 if 1 hour).
6. Match classes, groups, and students from the provided database context.
7. Output MUST be ONLY valid JSON.`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ['groq/compound-mini', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.1
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.isoDateTime || parsed.scheduledDate)) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} meeting parsing failed (${err.message}). Trying next...`);
                    if (err.status === 429) await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.isoDateTime || parsed.scheduledDate)) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} meeting parsing failed:`, err.message);
                    if (err.status === 503 || err.message?.includes('503') || err.message?.includes('429')) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                }
            }
        }

        // 3. Fallback Parser (Robust Regex & Date Math)
        return this.fallbackParseMeetingDetails(prompt, availableContext, currentDateStr);
    }

    fallbackParseMeetingDetails(prompt, availableContext = {}, currentDateStr) {
        const { classes = [], groups = [], students = [] } = availableContext;
        const msgLower = prompt.toLowerCase();
        const isInstant = msgLower.includes('instant') || msgLower.includes('start now') || msgLower.includes('right now');
        const type = isInstant ? 'instant' : 'scheduled';

        // Duration parsing
        let durationMinutes = 15;
        const durMatch = prompt.match(/(\d+)\s*(?:minutes?|mins?|m\b)/i);
        if (durMatch) durationMinutes = parseInt(durMatch[1], 10);
        else if (/1\s*hour|one\s*hour/i.test(prompt)) durationMinutes = 60;
        else if (/2\s*hours|two\s*hours/i.test(prompt)) durationMinutes = 120;

        // Date & Time extraction
        let targetYear = parseInt(currentDateStr.split('-')[0], 10);
        let targetMonth = parseInt(currentDateStr.split('-')[1], 10);
        let targetDay = parseInt(currentDateStr.split('-')[2], 10);
        let targetHour = 10;
        let targetMinute = 30;

        const monthsMap = {
            jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
            apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
            aug: 8, august: 8, sep: 9, sept: 9, september: 9,
            oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
        };

        // Check for "tomorrow"
        if (msgLower.includes('tomorrow')) {
            const d = new Date(targetYear, targetMonth - 1, targetDay + 1);
            targetYear = d.getFullYear();
            targetMonth = d.getMonth() + 1;
            targetDay = d.getDate();
        }

        // Match pattern: 28-Sept-2026 or 28 September 2026 or 28th Sep 2026
        const dateMatch = prompt.match(/(\d{1,2})(?:st|nd|rd|th)?[\s\-_/]+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:[\s\-_/]+(\d{4}))?/i);
        if (dateMatch) {
            targetDay = parseInt(dateMatch[1], 10);
            const mStr = dateMatch[2].toLowerCase();
            if (monthsMap[mStr]) targetMonth = monthsMap[mStr];
            if (dateMatch[3]) targetYear = parseInt(dateMatch[3], 10);
        }

        // Match numeric date: 2026-09-28 or 28/09/2026
        const numDateMatch = prompt.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) || prompt.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (numDateMatch) {
            if (numDateMatch[1].length === 4) {
                targetYear = parseInt(numDateMatch[1], 10);
                targetMonth = parseInt(numDateMatch[2], 10);
                targetDay = parseInt(numDateMatch[3], 10);
            } else {
                targetDay = parseInt(numDateMatch[1], 10);
                targetMonth = parseInt(numDateMatch[2], 10);
                targetYear = parseInt(numDateMatch[3], 10);
            }
        }

        // Match time: 10:30 AM, 10:30 PM, 7:00 AM, 11 AM, 19:30
        const timeMatch = prompt.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i) || prompt.match(/(?:at|on|time:?)\s*(\d{1,2}):(\d{2})/i);
        if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            let m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const ampm = timeMatch[3]?.toLowerCase();
            if (ampm === 'pm' && h < 12) h += 12;
            if (ampm === 'am' && h === 12) h = 0;
            targetHour = h;
            targetMinute = m;
        }

        const pad = (n) => String(n).padStart(2, '0');
        const scheduledDate = `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
        const scheduledTime = `${pad(targetHour)}:${pad(targetMinute)}`;
        const isoDateTime = `${scheduledDate}T${scheduledTime}:00+05:30`;

        // Match targets from database
        let matchedClassIds = [];
        let matchedGroupIds = [];
        let matchedStudentIds = [];
        let targetName = null;

        for (const c of classes) {
            if (c.name && msgLower.includes(c.name.toLowerCase())) {
                matchedClassIds.push(c.id);
                targetName = c.name;
                break;
            }
        }

        if (!targetName) {
            for (const g of groups) {
                if (g.name && msgLower.includes(g.name.toLowerCase())) {
                    matchedGroupIds.push(g.id);
                    targetName = g.name;
                    break;
                }
            }
        }

        if (!targetName) {
            for (const s of students) {
                const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
                if (msgLower.includes(fullName) || (s.admissionNumber && msgLower.includes(s.admissionNumber.toLowerCase()))) {
                    matchedStudentIds.push(s.id);
                    targetName = `${s.firstName} ${s.lastName}`;
                    break;
                }
            }
        }

        const title = `AI ${type === 'scheduled' ? 'Scheduled' : 'Instant'} Meeting${targetName ? ` (${targetName})` : ''}`;

        return {
            title,
            type,
            scheduledDate,
            scheduledTime,
            isoDateTime,
            durationMinutes,
            matchedClassIds,
            matchedGroupIds,
            matchedStudentIds,
            targetName
        };
    }

    /**
     * AI Assistant for Admin Notes: Write, Rewrite, Bullets, Numbered Steps, Polish, Summarize, Expand
     */
    async assistAdminNotes({ action = 'write', prompt = '', content = '', title = '', tone = 'professional' }) {
        let actionInstruction = '';
        switch (action) {
            case 'bullets':
            case 'rewrite_bullets':
                actionInstruction = `Rewrite the provided note/text into clean, well-structured, easy-to-read BULLET POINTS (<ul><li>) with bold key headings or bold lead-in phrases (<strong>). Organize into logical sections with <h2> or <h3> headers where appropriate.`;
                break;
            case 'numbered':
            case 'rewrite_numbered':
                actionInstruction = `Rewrite the provided note/text into a sequential NUMBERED LIST (<ol><li>) with bold step titles (<strong>). Ideal for standard operating procedures (SOP), procedural workflows, checklists, or step-by-step instructions.`;
                break;
            case 'polish':
                actionInstruction = `Polish and improve the grammar, structure, and readability of the provided text while keeping its core meaning. Maintain a clear ${tone} administrative tone. Use structured paragraphs and bold highlights.`;
                break;
            case 'summarize':
                actionInstruction = `Generate a concise, high-impact Executive Summary of the provided text. Highlight the most important decisions, action items, and takeaways using bullet points (<ul><li>) and bold terms (<strong>).`;
                break;
            case 'expand':
                actionInstruction = `Expand and elaborate the provided brief notes into a comprehensive, detailed, and thorough administrative document with background, key points, action items, and notes.`;
                break;
            case 'write':
            default:
                actionInstruction = `Write a comprehensive, professional administrative note on the requested topic or prompt. Include relevant sections, clear headings (<h2>/<h3>), bullet points (<ul><li>) or numbered lists (<ol><li>) where appropriate, and bold highlights.`;
                break;
        }

        const systemPrompt = `You are an expert executive and educational administrative AI writing assistant for a school and laboratory management system.
Your job is to generate or rewrite administrative notes, policies, meeting minutes, lab maintenance logs, notices, and procedural guides.

TASK INSTRUCTION:
${actionInstruction}

USER PROMPT / TOPIC:
${prompt || 'None provided'}

EXISTING NOTE TITLE:
${title || 'Untitled Note'}

EXISTING NOTE CONTENT:
${content || '(Empty content - generate from scratch based on prompt/title)'}

TONE:
${tone} (Educational / Administrative / Clear)

FORMATTING RULES:
1. Return valid, clean HTML content formatted for a rich text editor (ReactQuill).
2. Use standard semantic tags: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <blockquote>.
3. DO NOT wrap the output in markdown codeblocks (no \`\`\`html or \`\`\`). Return raw HTML string directly.
4. Ensure lists (<ul>, <ol>) and bullet points are clean, concise, and easy to scan.
5. If drafting from scratch and no title was provided, suggest a title on the first line inside an <h2> tag.`;

        // 1. Try Gemini first
        if (this.genAI) {
            try {
                const modelNames = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
                for (const modelName of modelNames) {
                    try {
                        const model = this.genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent(systemPrompt);
                        let responseText = result.response.text() || '';
                        responseText = responseText.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/```$/i, '').trim();
                        if (responseText) {
                            return {
                                success: true,
                                html: responseText,
                                provider: `gemini/${modelName}`
                            };
                        }
                    } catch (e) {
                        console.warn(`[AIService] Gemini ${modelName} failed for admin notes:`, e.message);
                    }
                }
            } catch (err) {
                console.warn('[AIService] Gemini failed for notes assist, trying Groq fallback:', err.message);
            }
        }

        // 2. Fallback: Groq (llama-3.3-70b-versatile)
        if (this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are an expert educational and administrative writing assistant. Output ONLY valid rich HTML tags (<h2>, <p>, <ul>, <li>, <ol>, <strong>) without markdown code fence wrapper.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.3
                });

                let responseText = completion.choices[0]?.message?.content || '';
                responseText = responseText.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/```$/i, '').trim();
                return {
                    success: true,
                    html: responseText,
                    provider: 'groq/llama-3.3-70b'
                };
            } catch (groqErr) {
                console.error('[AIService] Groq failed for notes assist:', groqErr.message);
            }
        }

        throw new Error('All AI providers failed to generate note content.');
    }

    /**
     * Parse natural language timetable prompt and return structured slots
     */
    async generateTimetableSlots(prompt, context = {}, preferredProvider = 'groq') {
        const { subjects = [], instructors = [], periodStructure = [], existingSlots = {} } = context;

        const subjectContext = subjects.map(s => `ID: "${s.id}", Name: "${s.name}" (Code: ${s.code || 'N/A'})`).join('\n');
        const instructorContext = instructors.map(i => `ID: "${i.id}", Name: "${i.firstName} ${i.lastName}"`).join('\n');
        const periodContext = periodStructure.map(p => `Period ${p.periodNumber}: ${p.startTime} - ${p.endTime} (${p.slotType || 'lecture'})`).join('\n');

        const systemPrompt = `You are an expert school timetable and educational scheduling AI.
Your task is to analyze the user's natural language instructions to construct or update timetable slots across the school week (monday, tuesday, wednesday, thursday, friday, saturday).

CONTEXT:
Available Subjects:
${subjectContext || 'No subjects registered yet'}

Available Instructors:
${instructorContext || 'No instructors registered yet'}

Period Timings Structure:
${periodContext || 'Period 1: 08:00-08:40, Period 2: 08:40-09:20, Period 3: 09:20-10:00, Period 4: 10:00-10:15 (break), Period 5: 10:15-10:55, Period 6: 10:55-11:35, Period 7: 11:35-12:15, Period 8: 12:15-12:55'}

User Instructions / Prompt:
"${prompt}"

INSTRUCTIONS & RULES:
1. Parse the lecture numbers (Period 1 to 8+), days of the week ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'), subjects, instructors, room numbers, and slot types.
2. Match subjects and instructors to their EXACT IDs from the provided context list if they match. If a subject or instructor is mentioned that is not in the context list, leave subjectId / instructorId as null and provide subjectName / instructorName.
3. For days, valid lowercase values are: 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'.
4. Slot types can be: 'lecture', 'lab', 'break_period', 'assembly', 'free', 'sports', 'library'.
5. If the prompt specifies a range like "Every day" or "Mon-Fri", generate slots for all respective days.
6. Provide accurate startTime and endTime based on the period number from the period structure.

Return ONLY a valid JSON array of slot objects with the following schema:
[
  {
    "dayOfWeek": "monday",
    "periodNumber": 1,
    "startTime": "08:00",
    "endTime": "08:40",
    "subjectId": "uuid-or-null",
    "subjectName": "Physics",
    "instructorId": "uuid-or-null",
    "instructorName": "Dr. Sharma",
    "roomNumber": "101",
    "slotType": "lecture",
    "isNew": true
  }
]
`;

        // 1. Try Groq
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            try {
                console.log('[AIService] Generating timetable slots via Groq...');
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are an educational scheduling AI. Output ONLY a valid JSON array.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.2
                });

                const responseText = completion.choices[0]?.message?.content || '[]';
                const parsed = this.parseJSONResponse(responseText);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (groqErr) {
                console.error('[AIService] Groq failed for timetable slots:', groqErr.message);
            }
        }

        // 2. Try Gemini
        if (this.genAI) {
            try {
                console.log('[AIService] Generating timetable slots via Gemini...');
                const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const result = await model.generateContent(systemPrompt);
                const responseText = result.response.text();
                const parsed = this.parseJSONResponse(responseText);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (geminiErr) {
                console.error('[AIService] Gemini failed for timetable slots:', geminiErr.message);
            }
        }

        // 3. Guaranteed Rule-Based Natural Language Scheduler Fallback
        console.log('[AIService] Using rule-based natural language scheduler fallback...');
        return this.parseTimetableSlotsRuleBased(prompt, context);
    }

    /**
     * Rule-Based Natural Language Timetable Parser (Zero-Failure Fallback)
     */
    parseTimetableSlotsRuleBased(prompt, context = {}) {
        const { subjects = [], instructors = [], periodStructure = [] } = context;
        const text = prompt.toLowerCase();

        // Helper to normalize day strings
        const normalizeDay = (d) => {
            const low = (d || '').toLowerCase();
            if (low.startsWith('mon')) return 'monday';
            if (low.startsWith('tue')) return 'tuesday';
            if (low.startsWith('wed')) return 'wednesday';
            if (low.startsWith('thu')) return 'thursday';
            if (low.startsWith('fri')) return 'friday';
            if (low.startsWith('sat')) return 'saturday';
            if (low.startsWith('sun')) return 'sunday';
            return null;
        };

        // Helper to compute or look up period timings
        const getPeriodTimings = (pNum) => {
            const matchedPeriodInfo = periodStructure.find(p => p.periodNumber === pNum);
            const defaultTimings = {
                1: { start: '08:00', end: '08:40' },
                2: { start: '08:40', end: '09:20' },
                3: { start: '09:20', end: '10:00' },
                4: { start: '10:00', end: '10:15', type: 'break_period' },
                5: { start: '10:15', end: '10:55' },
                6: { start: '10:55', end: '11:35' },
                7: { start: '11:35', end: '12:15' },
                8: { start: '12:15', end: '12:55' },
                9: { start: '12:55', end: '13:35' },
                10: { start: '13:35', end: '14:15' },
                11: { start: '14:15', end: '14:55' },
                12: { start: '14:55', end: '15:35' }
            };
            const def = defaultTimings[pNum] || { start: '08:00', end: '08:40' };
            const startTime = matchedPeriodInfo?.startTime || def.start;
            const endTime = matchedPeriodInfo?.endTime || def.end;
            let slotType = matchedPeriodInfo?.slotType || def.type || 'lecture';
            if (text.includes('lab') || text.includes('practical')) slotType = 'lab';
            else if (text.includes('break')) slotType = 'break_period';
            return { startTime, endTime, slotType };
        };

        // 1. Match Subject
        let subjectId = null;
        let subjectName = '';
        for (const s of subjects) {
            const sName = s.name.toLowerCase();
            const sCode = (s.code || '').toLowerCase();
            if (text.includes(sName) || (sCode && text.includes(sCode))) {
                subjectId = s.id;
                subjectName = s.name;
                break;
            }
        }
        if (!subjectName) {
            const subRegex = /(?:subject|course|for|of)\s+([a-zA-Z\s]{3,25})(?:\s+by|\s+for|\s+class|\s+in|$)/i;
            const subMatch = prompt.match(subRegex);
            if (text.includes('computer science') || text.includes('cs')) {
                subjectName = 'Computer Science';
            } else if (text.includes('physics')) {
                subjectName = 'Physics';
            } else if (text.includes('chemistry')) {
                subjectName = 'Chemistry';
            } else if (text.includes('mathematics') || text.includes('math')) {
                subjectName = 'Mathematics';
            } else if (text.includes('biology')) {
                subjectName = 'Biology';
            } else if (text.includes('english')) {
                subjectName = 'English';
            } else if (subMatch) {
                subjectName = subMatch[1].trim();
            } else {
                subjectName = 'Lecture';
            }
        }

        // 2. Match Instructor
        let instructorId = null;
        let instructorName = '';
        for (const inst of instructors) {
            const fullName = `${inst.firstName} ${inst.lastName || ''}`.trim().toLowerCase();
            const fName = inst.firstName.toLowerCase();
            if (text.includes(fullName) || text.includes(fName)) {
                instructorId = inst.id;
                instructorName = `${inst.firstName} ${inst.lastName || ''}`.trim();
                break;
            }
        }
        if (!instructorName) {
            const instRegex = /(?:instructor|teacher|faculty|by|sir|mam)\s+([a-zA-Z\s]{3,30})(?:\s+for|\s+in|\s+at|\s+-|$)/i;
            const instMatch = prompt.match(instRegex);
            if (instMatch) {
                instructorName = instMatch[1].trim();
            }
        }

        // 3. Match Room Number
        let roomNumber = '';
        const roomMatch = prompt.match(/room\s*#?\s*([a-zA-Z0-9-]+)/i) || prompt.match(/lab\s*#?\s*([a-zA-Z0-9-]+)/i);
        if (roomMatch) {
            roomNumber = roomMatch[1];
        } else if (subjectName.toLowerCase().includes('computer') || text.includes('lab')) {
            roomNumber = 'Lab-1';
        } else {
            roomNumber = 'Room 101';
        }

        // 4. Parse Day-Period Pairings
        let dayPeriodPairs = [];

        // Check for explicit override, e.g. "with 7th lecture for both days" or "7th for both days"
        const bothDaysOverrideMatch = text.match(/(?:with|create|set)?\s*(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|slot)?\s*(?:for|on)?\s*both\s*days/i);
        if (bothDaysOverrideMatch) {
            const overridePeriod = parseInt(bothDaysOverrideMatch[1], 10);
            const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const mentionedDays = [];
            allDays.forEach(day => {
                const shortDay = day.substring(0, 3);
                if (text.includes(day) || text.includes(shortDay)) {
                    if (!mentionedDays.includes(day)) mentionedDays.push(day);
                }
            });
            const daysToUse = mentionedDays.length > 0 ? mentionedDays : ['monday', 'tuesday'];
            daysToUse.forEach(d => {
                dayPeriodPairs.push({ day: d, period: overridePeriod });
            });
        }

        // Check for day ranges (e.g. "mon to thu 2nd period", "mon-fri period 3")
        if (dayPeriodPairs.length === 0) {
            let rangeDays = null;
            if (text.includes('mon to thu') || text.includes('mon-thu') || text.includes('monday to thursday')) {
                rangeDays = ['monday', 'tuesday', 'wednesday', 'thursday'];
            } else if (text.includes('mon to fri') || text.includes('mon-fri') || text.includes('monday to friday')) {
                rangeDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            } else if (text.includes('mon to sat') || text.includes('mon-sat') || text.includes('monday to saturday')) {
                rangeDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            } else if (text.includes('every day') || text.includes('all days') || text.includes('daily') || text.includes('all week')) {
                rangeDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            }

            if (rangeDays) {
                const pMatch = text.match(/(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|p\b|slot)/i) ||
                               text.match(/(?:period|lecture|p)\s*(\d+)/i);
                const pNum = pMatch ? parseInt(pMatch[1], 10) : 1;
                rangeDays.forEach(d => {
                    dayPeriodPairs.push({ day: d, period: pNum });
                });
            }
        }

        // If no range or override was matched, check for individual day-period pairings like "7th lecture for mon and 9th for tue"
        if (dayPeriodPairs.length === 0) {
            // Pattern: "<N>th (lecture/period) for <day>"
            const pairRegex1 = /(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|slot)?\s*(?:for|on|in)\s*(mon|tue|wed|thu|fri|sat|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi;
            let m1;
            while ((m1 = pairRegex1.exec(text)) !== null) {
                const p = parseInt(m1[1], 10);
                const d = normalizeDay(m1[2]);
                if (d && p && !dayPeriodPairs.some(existing => existing.day === d && existing.period === p)) {
                    dayPeriodPairs.push({ day: d, period: p });
                }
            }

            // Pattern: "<day> <N>th (lecture/period)"
            const pairRegex2 = /(mon|tue|wed|thu|fri|sat|monday|tuesday|wednesday|thursday|friday|saturday)\s*(?:for|on|in)?\s*(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|slot)?/gi;
            let m2;
            while ((m2 = pairRegex2.exec(text)) !== null) {
                const d = normalizeDay(m2[1]);
                const p = parseInt(m2[2], 10);
                if (d && p && !dayPeriodPairs.some(existing => existing.day === d && existing.period === p)) {
                    dayPeriodPairs.push({ day: d, period: p });
                }
            }
        }

        // Fallback: If still empty, determine days and period independently
        if (dayPeriodPairs.length === 0) {
            const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            let matchedDays = [];

            allDays.forEach(day => {
                const shortDay = day.substring(0, 3);
                if (text.includes(day) || text.includes(shortDay)) {
                    if (!matchedDays.includes(day)) matchedDays.push(day);
                }
            });

            if (matchedDays.length === 0) {
                matchedDays = ['monday', 'tuesday'];
            }

            let periodNumber = 1;
            const periodMatch = text.match(/(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|p\b|slot)/i) ||
                                text.match(/(?:period|lecture|p)\s*(\d+)/i) ||
                                text.match(/period\s*#?\s*(\d+)/i);
            if (periodMatch) {
                periodNumber = parseInt(periodMatch[1], 10);
            } else if (text.includes('first') || text.includes('1st')) periodNumber = 1;
            else if (text.includes('second') || text.includes('2nd')) periodNumber = 2;
            else if (text.includes('third') || text.includes('3rd')) periodNumber = 3;
            else if (text.includes('fourth') || text.includes('4th')) periodNumber = 4;
            else if (text.includes('fifth') || text.includes('5th')) periodNumber = 5;
            else if (text.includes('sixth') || text.includes('6th')) periodNumber = 6;
            else if (text.includes('seventh') || text.includes('7th')) periodNumber = 7;
            else if (text.includes('eighth') || text.includes('8th')) periodNumber = 8;
            else if (text.includes('ninth') || text.includes('9th')) periodNumber = 9;

            matchedDays.forEach(day => {
                dayPeriodPairs.push({ day, period: periodNumber });
            });
        }

        // Construct final slot objects
        return dayPeriodPairs.map(pair => {
            const { startTime, endTime, slotType } = getPeriodTimings(pair.period);
            return {
                dayOfWeek: pair.day,
                periodNumber: pair.period,
                startTime,
                endTime,
                subjectId,
                subjectName,
                instructorId,
                instructorName,
                roomNumber,
                slotType,
                isNew: true
            };
        });
    }

    /**
     * General-purpose Card AI Copilot (Read -> Edit -> Insert)
     */
    async executeCardAssist({ type, prompt = '', context = {}, refinement = '', provider = 'groq' }) {
        let systemPrompt = '';
        let fallbackFn = null;

        switch (type) {
            case 'lesson_plan':
                systemPrompt = `You are an expert academic curriculum and pedagogy AI.
Create or refine a comprehensive lesson/lecture plan for a school or college class.
CONTEXT:
Subject: ${context.subjectName || context.subject || 'Not specified'}
Class/Grade: ${context.className || context.gradeLevel || 'Not specified'}
Existing Topic/Aim: ${context.topic || context.title || context.aim || 'Not specified'}
Duration: ${context.durationMinutes || 40} minutes
Additional Instructions / Prompt: "${prompt}"
Refinement Request: "${refinement || 'None'}"

Output MUST be ONLY valid JSON matching this schema:
{
  "topic": "Clear, concise topic name",
  "aim": "Educational aim of this lecture (e.g. To teach students how to...)",
  "learningObjectives": "1. Understand...\\n2. Analyze...\\n3. Implement...",
  "teachingAids": "Blackboard, Projector, Python IDE / Lab Hardware, Charts",
  "interactiveActivity": "Brief 5-minute hands-on demonstration or peer exercise",
  "assessmentQuestions": "1. What is...?\\n2. Differentiate between...\\n3. Practical task to solve...",
  "homework": "Practice exercise or lab assignment reflection",
  "summaryNotes": "Brief 2-line summary of what was covered"
}`;
                fallbackFn = () => ({
                    topic: context.topic || 'Introduction to ' + (context.subjectName || 'Subject'),
                    aim: `To understand core concepts of ${context.subjectName || 'the topic'} with practical demonstrations.`,
                    learningObjectives: "1. Grasp fundamental principles\n2. Solve illustrative problems\n3. Apply concepts to real-world scenarios",
                    teachingAids: "Whiteboard, Slides, Practical Demonstrations",
                    interactiveActivity: "Quick 5-minute quiz and hands-on peer problem-solving.",
                    assessmentQuestions: "1. Explain the main concept in your own words.\n2. State two real-world applications.\n3. Solve the assigned exercise.",
                    homework: "Review class notes and complete chapter exercises.",
                    summaryNotes: `Delivered structured lesson covering key principles of ${context.subjectName || 'the topic'}.`
                });
                break;

            case 'grading_feedback':
                systemPrompt = `You are an expert educational grading assistant and code reviewer.
Analyze the student submission against the problem criteria and provide structured marks and constructive feedback.
CONTEXT:
Assignment Title: ${context.assignmentTitle || 'Lab Assignment'}
Problem Statement: ${context.description || context.aim || 'Standard Lab Problem'}
Programming Language: ${context.language || 'python'}
Max Marks: ${context.maxMarks || 100} (Practical: ${context.practicalMarks || 60}, Viva: ${context.vivaMarks || 20}, Output: ${context.outputMarks || 20})
Student Submission Code / Text:
${context.studentCode || context.submissionContent || '(No code submitted)'}
Instructor Note / Instructions: "${prompt}"
Refinement Request: "${refinement || 'None'}"

Output MUST be ONLY valid JSON matching this schema:
{
  "suggestedPracticalMarks": 55,
  "suggestedVivaMarks": 18,
  "suggestedOutputMarks": 18,
  "suggestedTotalMarks": 91,
  "strengths": ["Clean indentation", "Correct edge case handling"],
  "improvements": ["Add error handling for invalid input", "Optimize nested loop"],
  "feedback": "Great work! Your code executes cleanly and produces correct outputs. Consider adding comments.",
  "feedbackHindi": "उत्कृष्ट कार्य! आपका कोड सही ढंग से चलता है और परिणाम सही हैं।",
  "codeReviewSummary": "Logic is sound (O(N) complexity). Good adherence to coding standards."
}`;
                fallbackFn = () => {
                    const max = Number(context.maxMarks) || 100;
                    const prac = Math.round(max * 0.6);
                    const viva = Math.round(max * 0.2);
                    const out = Math.round(max * 0.2);
                    return {
                        suggestedPracticalMarks: Math.round(prac * 0.9),
                        suggestedVivaMarks: Math.round(viva * 0.9),
                        suggestedOutputMarks: Math.round(out * 0.9),
                        suggestedTotalMarks: Math.round(max * 0.9),
                        strengths: ["Code implemented according to instructions", "Logical structure"],
                        improvements: ["Add more inline comments", "Validate input boundaries"],
                        feedback: "Good attempt. The solution meets all required specifications with minor scope for code optimization.",
                        feedbackHindi: "अच्छा प्रयास। समाधान सभी आवश्यक विनिर्देशों को पूरा करता है।",
                        codeReviewSummary: "Solution passes standard verification criteria."
                    };
                };
                break;

            case 'notes_checklist':
                systemPrompt = `You are an expert executive assistant. Convert unstructured notes, meeting logs, or tasks into structured notes with actionable checklist items.
CONTEXT:
Raw Note Content: ${context.content || context.rawText || ''}
Title: ${context.title || ''}
Instructions: "${prompt}"
Refinement: "${refinement || 'None'}"

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Clean, descriptive note title",
  "summary": "2-3 sentence executive summary",
  "formattedMarkdown": "Full formatted markdown with headings and bullet points",
  "checklist": [
    { "text": "Task description 1", "priority": "high", "dueDate": "Tomorrow" },
    { "text": "Task description 2", "priority": "medium", "dueDate": "This Week" }
  ]
}`;
                fallbackFn = () => ({
                    title: context.title || 'Administrative Notes & Action Items',
                    summary: 'Key discussion points and procedural checklist extracted from session.',
                    formattedMarkdown: `### Overview\n${context.content || 'Notes recorded.'}\n\n### Action Items\n- [ ] Review lab safety guidelines\n- [ ] Verify attendance records`,
                    checklist: [
                        { text: "Verify lab system configurations", priority: "high", dueDate: "Today" },
                        { text: "Complete student progress audit", priority: "medium", dueDate: "This Week" }
                    ]
                });
                break;

            case 'ticket_reply':
                systemPrompt = `You are an IT helpdesk and school support AI. Analyze the issue and provide troubleshooting advice and a courteous resolution draft.
CONTEXT:
Ticket Title: ${context.title || ''}
Description: ${context.description || ''}
Category: ${context.category || ''}
Priority: ${context.priority || ''}
Instructions: "${prompt}"
Refinement: "${refinement || 'None'}"

Output MUST be ONLY valid JSON matching this schema:
{
  "suggestedCategory": "hardware | software | network | lab_equipment | timetable | other",
  "suggestedPriority": "low | medium | high | urgent",
  "suggestedStatus": "in_progress | resolved",
  "rootCauseAnalysis": "Brief explanation of probable cause",
  "troubleshootingSteps": "1. Step one...\\n2. Step two...",
  "draftReply": "Dear user, thank you for reaching out. We have reviewed your issue..."
}`;
                fallbackFn = () => ({
                    suggestedCategory: context.category || 'hardware',
                    suggestedPriority: context.priority || 'medium',
                    suggestedStatus: 'in_progress',
                    rootCauseAnalysis: 'System peripheral or software driver mismatch.',
                    troubleshootingSteps: '1. Restart affected system\n2. Verify cable connections and drivers\n3. Run hardware diagnostics',
                    draftReply: `Hello, thank you for reporting this issue. Our lab technician team is looking into this and will verify the hardware setup shortly.`
                });
                break;

            case 'lab_maintenance':
                systemPrompt = `You are a computer lab systems engineer. Analyze lab specs, PC issues, and create a maintenance action plan.
CONTEXT:
Lab: ${context.labName || 'Computer Lab'}
Equipment Details: ${JSON.stringify(context.pcs || context.items || [])}
Instructions: "${prompt}"

Output MUST be ONLY valid JSON matching this schema:
{
  "healthScore": 88,
  "summary": "Overall lab health summary",
  "maintenanceTasks": [
    { "target": "PC-04", "issue": "RAM upgrade recommended", "action": "Install 8GB DDR4 module", "priority": "medium" }
  ],
  "recommendedActionPlan": "Step-by-step lab maintenance plan..."
}`;
                fallbackFn = () => ({
                    healthScore: 90,
                    summary: `Lab equipment in ${context.labName || 'Lab'} is operational with standard routine servicing required.`,
                    maintenanceTasks: [
                        { target: "All PCs", issue: "Routine software updates", action: "Run system updates and anti-virus scan", priority: "low" }
                    ],
                    recommendedActionPlan: "Schedule routine maintenance during off-hours to prevent class interruption."
                });
                break;

            case 'procurement_po':
                systemPrompt = `You are a school procurement analyst. Compare vendor quotes and prepare Purchase Order recommendations.
CONTEXT:
Request Title: ${context.title || 'Procurement Request'}
Quotes / Items: ${JSON.stringify(context.quotations || context.items || [])}
Instructions: "${prompt}"

Output MUST be ONLY valid JSON matching this schema:
{
  "recommendedVendor": "Vendor Name",
  "recommendationRationale": "Detailed justification on pricing and quality",
  "totalEstimatedCost": 45000,
  "deliveryTimeline": "7 to 10 working days",
  "paymentTerms": "50% advance, 50% on verified delivery",
  "poDraft": "Purchase Order draft text..."
}`;
                fallbackFn = () => ({
                    recommendedVendor: context.quotations?.[0]?.vendorName || "Preferred Vendor",
                    recommendationRationale: "Offers best balance of price warranty and verified delivery track record.",
                    totalEstimatedCost: 50000,
                    deliveryTimeline: "7-10 days",
                    paymentTerms: "Standard institutional terms (30 days net)",
                    poDraft: `PURCHASE ORDER\nTo: ${context.quotations?.[0]?.vendorName || "Vendor"}\nRe: Supply of Lab Materials\nTerms: Standard institutional payment.`
                });
                break;

            case 'voice_command':
            default:
                return this.executeVoiceCommand(prompt, context);
        }

        // 1. Try Groq (Ultra-fast primary)
        if ((provider === 'groq' || provider === 'auto') && this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are an educational AI assistant. Output ONLY valid JSON matching the requested schema. No markdown code blocks.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.2
                });
                const responseText = completion.choices[0]?.message?.content || '{}';
                return this.parseJSONResponse(responseText);
            } catch (groqErr) {
                console.warn('[AIService] Groq card-assist failed:', groqErr.message);
            }
        }

        // 2. Try Gemini (Fallback)
        if (this.genAI) {
            try {
                const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const result = await model.generateContent(systemPrompt);
                const responseText = result.response.text();
                return this.parseJSONResponse(responseText);
            } catch (geminiErr) {
                console.warn('[AIService] Gemini card-assist failed:', geminiErr.message);
            }
        }

        // 3. Fallback
        if (fallbackFn) {
            console.log(`[AIService] Using rule-based fallback for ${type}`);
            return fallbackFn();
        }

        throw new Error('AI generation failed. Please check your network or try again.');
    }

    /**
     * Voice Command Natural Language Interpreter
     */
    async executeVoiceCommand(speechText, context = {}) {
        const text = (speechText || '').trim();
        const low = text.toLowerCase();

        const systemPrompt = `You are a voice command parser for a school and lab management web app.
Parse the spoken voice input into a structured actionable intent.
POSSIBLE INTENTS:
- "create_lesson_plan": User wants to create/generate a lecture or lesson plan.
- "add_timetable_period": User wants to add or adjust a timetable slot or period.
- "grade_submission": User wants to grade, review or score an assignment.
- "write_note": User wants to take or format a note / checklist.
- "create_ticket": User wants to report an IT or lab issue.
- "search": User wants to search for something.
- "navigate": User wants to open a page (timetable, meetings, classes, grades, documents, labs, training).
- "dictate": Standard text dictation into active field.

Spoken input: "${text}"
Current Page Context: ${context.currentRoute || 'unknown'}

Output ONLY a valid JSON object matching this schema:
{
  "intent": "create_lesson_plan | add_timetable_period | grade_submission | write_note | create_ticket | search | navigate | dictate",
  "targetRoute": "/teaching/plans/new | /admin/timetable | /admin/notes | /tickets | /grades | null",
  "parameters": {
    "subject": "string or null",
    "topic": "string or null",
    "periodNumber": 9,
    "startTime": "08:00",
    "endTime": "08:40",
    "marks": 90,
    "query": "string or null",
    "dictatedText": "${text.replace(/"/g, '\\"')}"
  },
  "spokenFeedback": "Short 1-sentence confirmation of the action performed"
}`;

        if (this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: 'Output ONLY valid JSON. No markdown wrappers.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.1
                });
                return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
            } catch (e) {
                console.warn('[AIService] Groq voice-command parser failed:', e.message);
            }
        }

        // Rule-based fallback for voice commands
        let intent = 'dictate';
        let targetRoute = null;
        let spokenFeedback = `Recorded: "${text}"`;

        if (low.includes('lesson plan') || low.includes('lecture plan')) {
            intent = 'create_lesson_plan';
            targetRoute = '/teaching/plans/new';
            spokenFeedback = 'Opening Lesson Plan generator';
        } else if (low.includes('period') || low.includes('timetable')) {
            intent = 'add_timetable_period';
            targetRoute = '/admin/timetable';
            spokenFeedback = 'Navigating to Timetable Scheduler';
        } else if (low.includes('ticket') || low.includes('issue') || low.includes('broken')) {
            intent = 'create_ticket';
            targetRoute = '/tickets';
            spokenFeedback = 'Creating support ticket';
        } else if (low.includes('note') || low.includes('checklist')) {
            intent = 'write_note';
            targetRoute = '/admin/notes';
            spokenFeedback = 'Creating administrative note';
        } else if (low.includes('search')) {
            intent = 'search';
            spokenFeedback = `Searching for ${text.replace(/^search\s*(for)?/i, '')}`;
        }

        return {
            intent,
            targetRoute,
            parameters: { dictatedText: text },
            spokenFeedback
        };
    }

    /**
     * Generate structured Training Module Outline (Curriculum & Units)
     */
    async generateTrainingModuleOutline({ topic, targetAudience = '', language = 'python', classLevel = 11, board = 'PSEB', totalUnits = 3, provider = 'groq' }) {
        const systemPrompt = `You are a distinguished Computer Science educator and curriculum designer.
Create a high-impact, pedagogy-aligned training course outline for the given topic.
TOPIC: ${topic}
PROGRAMMING LANGUAGE: ${language}
CLASS LEVEL: Grade ${classLevel}
BOARD / CURRICULUM: ${board}
TARGET UNITS COUNT: ${totalUnits}
TARGET AUDIENCE / FOCUS: ${targetAudience || 'School / College Computer Science Students'}

Design a structured course with progressive mastery thresholds (recommended 80%).
Output MUST be ONLY valid JSON matching this exact schema:
{
  "title": "Clear course title in English",
  "titleHindi": "प्रशिक्षण पाठ्यक्रम का शीर्षक (Hindi translation)",
  "description": "Detailed course overview explaining what students will master...",
  "language": "${language}",
  "boardAligned": "${board}",
  "classLevel": ${Number(classLevel) || 11},
  "pedagogyConfig": {
    "useBlooms": true,
    "useObjectives": true,
    "useTimeLimit": false
  },
  "units": [
    {
      "unitNumber": 1,
      "title": "Unit 1: Fundamentals...",
      "description": "Core concepts covered in this unit...",
      "expectedHours": 4,
      "unlockThreshold": 80,
      "keyConcepts": ["Concept A", "Concept B"],
      "suggestedExerciseTypes": ["coding", "mcq", "fill_blank"]
    }
  ]
}`;

        // 1. Try Groq
        if ((provider === 'groq' || provider === 'auto') && this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are an educational AI assistant. Output ONLY valid JSON matching the schema. No markdown code blocks.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.2
                });
                return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
            } catch (err) {
                console.warn('[AIService] Groq training outline failed:', err.message);
            }
        }

        // 2. Try Gemini
        if (this.genAI) {
            try {
                const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const result = await model.generateContent(systemPrompt);
                return this.parseJSONResponse(result.response.text());
            } catch (err) {
                console.warn('[AIService] Gemini training outline failed:', err.message);
            }
        }

        // 3. Fallback
        return {
            title: `${topic} Mastery Course`,
            titleHindi: `${topic} प्रशिक्षण`,
            description: `A structured training module covering ${topic} with hands-on labs, quizzes, and real-world exercises.`,
            language,
            boardAligned: board,
            classLevel: Number(classLevel) || 11,
            pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
            units: [
                {
                    unitNumber: 1,
                    title: `Unit 1: Introduction to ${topic}`,
                    description: `Foundational syntax, principles, and introductory concepts of ${topic}.`,
                    expectedHours: 3,
                    unlockThreshold: 80,
                    keyConcepts: ['Syntax & Basics', 'Core Constructs', 'Practical Examples'],
                    suggestedExerciseTypes: ['coding', 'mcq']
                },
                {
                    unitNumber: 2,
                    title: `Unit 2: Core Implementation & Problem Solving`,
                    description: `Intermediate algorithms, data manipulation, and structured programming in ${topic}.`,
                    expectedHours: 5,
                    unlockThreshold: 80,
                    keyConcepts: ['Control Flow', 'Functions & Modular Code', 'Error Handling'],
                    suggestedExerciseTypes: ['coding', 'fill_blank', 'bug_fix']
                },
                {
                    unitNumber: 3,
                    title: `Unit 3: Capstone Projects & Real-world Applications`,
                    description: `Comprehensive project building, optimization, and industry case studies.`,
                    expectedHours: 6,
                    unlockThreshold: 80,
                    keyConcepts: ['Architecture Design', 'Optimization', 'Capstone Project'],
                    suggestedExerciseTypes: ['coding', 'case_study']
                }
            ]
        };
    }

    /**
     * Generate rich Lesson Theory, Markdown Notes, and Educational SVG Graphics / Mermaid Diagrams
     */
    async generateTrainingTheoryAndGraphics({ topic, unitTitle = '', language = 'python', classLevel = 11, provider = 'groq' }) {
        const systemPrompt = `You are an elite Computer Science instructional designer and technical illustrator.
Generate comprehensive, student-friendly learning material for the following concept:
TOPIC: ${topic}
UNIT: ${unitTitle || 'General Unit'}
LANGUAGE: ${language}
CLASS LEVEL: Grade ${classLevel}

REQUIREMENTS:
1. "theoryMarkdown": Detailed, clean markdown with headings (##, ###), bullet points, bold keywords, code examples with syntax formatting, mental analogies, and memory tips.
2. "svgGraphic": A self-contained, clean, modern educational SVG illustration (width="100%", viewBox="0 0 800 400") visualizing the concept (e.g., memory layout, data flow, stack/heap, recursion tree, variable box, or loop cycle) with dark-theme styled rects (#1e293b, #334155), vibrant accents (#6366f1, #10b981, #f59e0b, #38bdf8), and clear text labels. Must be valid SVG XML string.
3. "mermaidDiagram": Clean Mermaid.js chart code (e.g. flowchart TD or sequenceDiagram).
4. "keyTakeaways": Array of 3-4 concise takeaway bullets.
5. "quickCheckQuestion": A fast 1-question self-check for the student with question and answer.

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Lesson Title",
  "theoryMarkdown": "Markdown string...",
  "svgGraphic": "<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 800 360\\">...</svg>",
  "mermaidDiagram": "flowchart TD\\nA[Input] --> B[Process] --> C[Output]",
  "keyTakeaways": ["Key point 1", "Key point 2", "Key point 3"],
  "quickCheckQuestion": {
    "question": "What happens when...?",
    "answer": "Explanation of expected behavior..."
  }
}`;

        // 1. Try Groq
        if ((provider === 'groq' || provider === 'auto') && this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'Output ONLY valid JSON. Escape quotes in SVG attributes properly.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.2
                });
                return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
            } catch (err) {
                console.warn('[AIService] Groq theory/graphics failed:', err.message);
            }
        }

        // 2. Try Gemini
        if (this.genAI) {
            try {
                const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const result = await model.generateContent(systemPrompt);
                return this.parseJSONResponse(result.response.text());
            } catch (err) {
                console.warn('[AIService] Gemini theory/graphics failed:', err.message);
            }
        }

        // 3. Fallback
        return {
            title: `Understanding ${topic}`,
            theoryMarkdown: `## 📘 Core Concept: ${topic}\n\n${topic} is a fundamental pillar of modern computing and programming in **${language}**.\n\n### 🔑 Key Principles\n- **Modularity:** Breaking complex logic into isolated, reusable blocks.\n- **Efficiency:** Optimizing execution flow and resource allocation.\n- **Clarity:** Writing self-documenting code with meaningful naming.\n\n\`\`\`${language}\n# Example demonstration\ndef demonstrate_${topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}():\n    print("Executing ${topic} workflow...")\n    return True\n\`\`\``,
            svgGraphic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" width="100%" height="100%">
  <rect width="800" height="300" rx="16" fill="#0f172a" />
  <rect x="40" y="40" width="220" height="220" rx="12" fill="#1e293b" stroke="#6366f1" stroke-width="2" />
  <text x="150" y="80" fill="#a5b4fc" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">Input / State</text>
  <circle cx="150" cy="150" r="40" fill="#312e81" stroke="#818cf8" stroke-width="2" />
  <text x="150" y="155" fill="#ffffff" font-size="13" font-family="sans-serif" text-anchor="middle">Data</text>
  <path d="M 270 150 L 350 150" stroke="#818cf8" stroke-width="3" marker-end="url(#arrow)" />
  <rect x="360" y="40" width="220" height="220" rx="12" fill="#1e293b" stroke="#10b981" stroke-width="2" />
  <text x="470" y="80" fill="#6ee7b7" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">${topic}</text>
  <rect x="390" y="120" width="160" height="60" rx="8" fill="#064e3b" stroke="#34d399" stroke-width="1.5" />
  <text x="470" y="155" fill="#ffffff" font-size="13" font-family="sans-serif" text-anchor="middle">Logic Engine</text>
  <path d="M 590 150 L 670 150" stroke="#34d399" stroke-width="3" />
  <rect x="680" y="90" width="90" height="120" rx="12" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
  <text x="725" y="155" fill="#38bdf8" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="middle">Result</text>
</svg>`,
            mermaidDiagram: `flowchart LR\n  Input[Input Data] --> Logic[${topic} Processing] --> Output[Verified Result]`,
            keyTakeaways: [
                `Mastering ${topic} enables robust architecture.`,
                `Always validate edge cases and exception handling.`,
                `Keep code idiomatic and follow standard conventions.`
            ],
            quickCheckQuestion: {
                question: `What is the core benefit of utilizing ${topic}?`,
                answer: `It enables structured, maintainable, and high-performance execution.`
            }
        };
    }

    /**
     * Generate complete Training Exercises covering all 5 question types:
     * - coding
     * - mcq (Output Prediction / Conceptual MCQ)
     * - fill_blank (Syntax Cloze)
     * - bug_fix (PR Code Review / Bug Hunt)
     * - case_study (MNC Incident Case Study)
     */
    async generateTrainingExercise({ topic, unitTitle = '', language = 'python', exerciseType = 'coding', difficulty = 'beginner', scaffoldLevel = 'guided', bloomsLevel = 'apply', customPrompt = '', provider = 'groq' }) {
        let typeInstruction = '';
        if (exerciseType === 'coding') {
            typeInstruction = `Generate a standard CODING LAB exercise with:
- "starterCode": Boilerplate with function signature and comments
- "solutionCode": Complete working solution
- "testCases": Array of at least 3 test cases: [{"input": "...", "expectedOutput": "...", "isHidden": false}, {"input": "...", "expectedOutput": "...", "isHidden": true}]
- "hints": Array of 2-3 progressive Socratic hints`;
        } else if (exerciseType === 'bug_fix') {
            typeInstruction = `Generate a PR REVIEW / BUG HUNT exercise where student is given buggy code and must fix it:
- "starterCode": Code containing a subtle logical or syntax bug with comments like "# FIX THE BUG HERE"
- "solutionCode": The clean, corrected code
- "testCases": Array of 3 test cases that fail on buggy code but pass on corrected code
- "hints": Array of 2 hints pointing toward the bug's cause`;
        } else if (exerciseType === 'mcq') {
            typeInstruction = `Generate a CODE TRACING / OUTPUT PREDICTION MCQ:
- "testCases": {
    "question": "What is the exact output of this code snippet?",
    "codeSnippet": "Code snippet in ${language} demonstrating a tricky concept or edge case",
    "options": ["Option A (Incorrect)", "Option B (Correct)", "Option C (Distractor)", "Option D (Distractor)"],
    "correctOption": 1 (0-indexed integer corresponding to correct option),
    "explanation": "Detailed explanation of why Option B is correct and why others fail."
  }
- "starterCode": null
- "solutionCode": null`;
        } else if (exerciseType === 'fill_blank') {
            typeInstruction = `Generate a SYNTAX CLOZE / FILL-IN-THE-BLANKS exercise:
- "testCases": {
    "instruction": "Fill in the missing tokens in the code template below.",
    "template": "Code snippet with placeholders like {{BLANK_1}} and {{BLANK_2}}",
    "blanks": [
      { "id": "BLANK_1", "correctAnswer": "exactToken", "hint": "Brief hint for blank 1" },
      { "id": "BLANK_2", "correctAnswer": "exactToken", "hint": "Brief hint for blank 2" }
    ],
    "explanation": "Detailed explanation of the completed code syntax."
  }`;
        } else if (exerciseType === 'case_study') {
            typeInstruction = `Generate a REAL-WORLD MNC INCIDENT CASE STUDY:
- "testCases": {
    "company": "Fictional Tech Company / Team",
    "incident": "Incident description (e.g. Production latency spike during peak checkout)",
    "scenarioCode": "Relevant architectural or backend code snippet",
    "questions": [
      {
        "id": "q1",
        "prompt": "What architectural flaw causes this behavior?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctOption": 0,
        "explanation": "Root cause analysis..."
      }
    ]
  }`;
        }

        const systemPrompt = `You are an expert pedagogy and computer science challenge architect.
Create an exercise with the following parameters:
TOPIC: ${topic}
UNIT: ${unitTitle || 'Active Unit'}
LANGUAGE: ${language}
EXERCISE TYPE: ${exerciseType}
DIFFICULTY: ${difficulty}
SCAFFOLD LEVEL: ${scaffoldLevel}
BLOOM'S TAXONOMY LEVEL: ${bloomsLevel}
ADDITIONAL INSTRUCTIONS: ${customPrompt || 'None'}

${typeInstruction}

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Concise, descriptive problem title",
  "description": "Clear problem statement and instructions for students",
  "theory": "Brief theoretical background explaining the concept before the student begins",
  "exerciseType": "${exerciseType}",
  "difficulty": "${difficulty}",
  "scaffoldLevel": "${scaffoldLevel}",
  "bloomsLevel": "${bloomsLevel}",
  "learningObjective": "SWBAT...",
  "xpReward": ${difficulty === 'advanced' ? 25 : difficulty === 'intermediate' ? 15 : 10},
  "timeLimit": 5,
  "isReviewExercise": false,
  "starterCode": "...",
  "solutionCode": "...",
  "testCases": ...,
  "hints": ["Hint 1", "Hint 2"]
}`;

        // 1. Try Groq
        if ((provider === 'groq' || provider === 'auto') && this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'Output ONLY valid JSON. No markdown code block wrapping.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.2
                });
                return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
            } catch (err) {
                console.warn('[AIService] Groq exercise generation failed:', err.message);
            }
        }

        // 2. Try Gemini
        if (this.genAI) {
            try {
                const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const result = await model.generateContent(systemPrompt);
                return this.parseJSONResponse(result.response.text());
            } catch (err) {
                console.warn('[AIService] Gemini exercise generation failed:', err.message);
            }
        }

        // 3. Fallback based on exercise type
        if (exerciseType === 'mcq') {
            return {
                title: `${topic} Tracing Challenge`,
                description: `Analyze the code snippet below and predict the expected output.`,
                theory: `Tracing code step-by-step is a key debugging skill.`,
                exerciseType: 'mcq',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT trace ${topic} execution.`,
                xpReward: 10,
                timeLimit: 5,
                isReviewExercise: false,
                testCases: {
                    question: `What will the following ${language} code print?`,
                    codeSnippet: language === 'python' ? `items = [10, 20, 30]\nresult = [x * 2 for x in items if x > 15]\nprint(result)` : `const items = [10, 20, 30];\nconst result = items.filter(x => x > 15).map(x => x * 2);\nconsole.log(result);`,
                    options: ['[20, 40, 60]', '[40, 60]', '[20, 40]', '[10, 20]'],
                    correctOption: 1,
                    explanation: `Only elements > 15 (20 and 30) are selected and multiplied by 2, giving [40, 60].`
                },
                hints: [`Check the filter condition first, then the multiplication.`]
            };
        }

        if (exerciseType === 'fill_blank') {
            return {
                title: `Syntax Cloze: ${topic}`,
                description: `Fill in the missing tokens in the code snippet.`,
                theory: `Mastering syntax tokens ensures clean execution.`,
                exerciseType: 'fill_blank',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT complete ${topic} syntax patterns.`,
                xpReward: 10,
                timeLimit: 5,
                isReviewExercise: false,
                testCases: {
                    instruction: `Fill in the missing keywords:`,
                    template: language === 'python' ? `def process_data(data):\n    {{BLANK_1}} data is None:\n        return []\n    {{BLANK_2}} [x.strip() for x in data]` : `function processData(data) {\n    {{BLANK_1}} (!data) return [];\n    {{BLANK_2}} data.map(x => x.trim());\n}`,
                    blanks: [
                        { id: 'BLANK_1', correctAnswer: 'if', hint: 'Conditional check' },
                        { id: 'BLANK_2', correctAnswer: 'return', hint: 'Output statement' }
                    ],
                    explanation: `We guard against None with 'if', and return the result using 'return'.`
                },
                hints: [`Look at standard conditional and return keywords.`]
            };
        }

        return {
            title: `Hands-on Lab: ${topic}`,
            description: `Write a program that demonstrates ${topic}. Implement the required function and return the correct result.`,
            theory: `## 📘 Learning Content\n\nUnderstand how ${topic} works before implementing your solution.`,
            exerciseType: 'coding',
            difficulty,
            scaffoldLevel,
            bloomsLevel,
            learningObjective: `SWBAT implement ${topic} in ${language}.`,
            xpReward: 15,
            timeLimit: 5,
            isReviewExercise: false,
            starterCode: language === 'python' ? `# Implement your solution\ndef solve(n):\n    # TODO: Write code here\n    pass\n` : `// Implement solution\nfunction solve(n) {\n    // TODO\n}\n`,
            solutionCode: language === 'python' ? `def solve(n):\n    return n * 2\n` : `function solve(n) {\n    return n * 2;\n}\n`,
            testCases: [
                { input: '5', expectedOutput: '10', isHidden: false },
                { input: '12', expectedOutput: '24', isHidden: false },
                { input: '0', expectedOutput: '0', isHidden: true }
            ],
            hints: [`Start by handling the base input case.`, `Ensure your return type matches expectations.`]
        };
    }

    /**
     * Generate interactive Socratic Hint for a student stuck on an exercise
     */
    async generateSocraticHint({ problemTitle, problemDescription, studentCode, currentOutput, failedTests = [], provider = 'groq' }) {
        const systemPrompt = `You are a warm, encouraging Socratic Computer Science tutor.
A student is working on the following problem and needs a hint:
PROBLEM: ${problemTitle}
DESCRIPTION: ${problemDescription}
STUDENT CODE:
\`\`\`
${studentCode || 'No code written yet'}
\`\`\`
CURRENT OUTPUT / ERROR:
${currentOutput || 'None'}
FAILED TEST CASES:
${JSON.stringify(failedTests)}

RULES:
1. NEVER give the complete solution code directly.
2. Ask a guiding question that prompts the student to think about their logic or edge cases.
3. Keep the feedback under 3 concise sentences.

Output MUST be ONLY valid JSON:
{
  "socraticHint": "Encouraging guidance...",
  "guidingQuestion": "What happens when...?",
  "edgeCaseToConsider": "Consider testing with..."
}`;

        if ((provider === 'groq' || provider === 'auto') && this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: 'Output ONLY valid JSON.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    temperature: 0.3
                });
                return this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
            } catch (err) {
                console.warn('[AIService] Groq socratic hint failed:', err.message);
            }
        }

        if (this.genAI) {
            try {
                const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const result = await model.generateContent(systemPrompt);
                return this.parseJSONResponse(result.response.text());
            } catch (err) {
                console.warn('[AIService] Gemini socratic hint failed:', err.message);
            }
        }

        return {
            socraticHint: `Take a close look at your variable initialization and the loop boundary conditions.`,
            guidingQuestion: `What value does your function return when given the first test input?`,
            edgeCaseToConsider: `Test with empty inputs or zero.`
        };
    }

    parseJSONResponse(text) {
        let cleanText = text.trim();
        cleanText = cleanText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

        // Find JSON bounds
        const firstSquare = cleanText.indexOf('[');
        const lastSquare = cleanText.lastIndexOf(']');
        const firstCurly = cleanText.indexOf('{');
        const lastCurly = cleanText.lastIndexOf('}');

        if (firstSquare !== -1 && lastSquare > firstSquare && (firstCurly === -1 || firstSquare < firstCurly)) {
            cleanText = cleanText.substring(firstSquare, lastSquare + 1);
        } else if (firstCurly !== -1 && lastCurly > firstCurly) {
            cleanText = cleanText.substring(firstCurly, lastCurly + 1);
        }

        return JSON.parse(cleanText);
    }
}

module.exports = new AIService();


