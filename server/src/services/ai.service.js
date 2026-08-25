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
            const geminiModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
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
            const geminiModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
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
            const geminiModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
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
            const geminiModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
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
            const geminiModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
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
            const geminiModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
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
                const modelNames = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
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
                const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

        // 1. Determine Days
        const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let matchedDays = [];

        if (text.includes('mon to thu') || text.includes('mon-thu') || text.includes('monday to thursday')) {
            matchedDays = ['monday', 'tuesday', 'wednesday', 'thursday'];
        } else if (text.includes('mon to fri') || text.includes('mon-fri') || text.includes('monday to friday')) {
            matchedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        } else if (text.includes('mon to sat') || text.includes('mon-sat') || text.includes('monday to saturday')) {
            matchedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        } else if (text.includes('every day') || text.includes('all days') || text.includes('daily') || text.includes('all week')) {
            matchedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        } else {
            allDays.forEach(day => {
                const shortDay = day.substring(0, 3);
                if (text.includes(day) || text.includes(shortDay)) {
                    if (!matchedDays.includes(day)) matchedDays.push(day);
                }
            });
        }

        if (matchedDays.length === 0) {
            matchedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        }

        // 2. Determine Period Number
        let periodNumber = 1;
        const periodMatch = text.match(/(\d+)(?:st|nd|rd|th)?\s*(?:period|lecture|p\b|slot)/i) ||
                            text.match(/(?:period|lecture|p)\s*(\d+)/i) ||
                            text.match(/period\s*#?\s*(\d+)/i);
        if (periodMatch) {
            periodNumber = parseInt(periodMatch[1], 10);
        } else if (text.includes('first')) periodNumber = 1;
        else if (text.includes('second') || text.includes('2nd')) periodNumber = 2;
        else if (text.includes('third') || text.includes('3rd')) periodNumber = 3;
        else if (text.includes('fourth') || text.includes('4th')) periodNumber = 4;
        else if (text.includes('fifth') || text.includes('5th')) periodNumber = 5;
        else if (text.includes('sixth') || text.includes('6th')) periodNumber = 6;
        else if (text.includes('seventh') || text.includes('7th')) periodNumber = 7;
        else if (text.includes('eighth') || text.includes('8th')) periodNumber = 8;

        // 3. Resolve Period Timings
        const matchedPeriodInfo = periodStructure.find(p => p.periodNumber === periodNumber);
        const defaultTimings = {
            1: { start: '08:00', end: '08:40' },
            2: { start: '08:40', end: '09:20' },
            3: { start: '09:20', end: '10:00' },
            4: { start: '10:00', end: '10:15', type: 'break_period' },
            5: { start: '10:15', end: '10:55' },
            6: { start: '10:55', end: '11:35' },
            7: { start: '11:35', end: '12:15' },
            8: { start: '12:15', end: '12:55' },
        };
        const def = defaultTimings[periodNumber] || { start: '08:00', end: '08:40' };
        const startTime = matchedPeriodInfo?.startTime || def.start;
        const endTime = matchedPeriodInfo?.endTime || def.end;
        let slotType = matchedPeriodInfo?.slotType || def.type || 'lecture';
        if (text.includes('lab') || text.includes('practical')) slotType = 'lab';
        else if (text.includes('break')) slotType = 'break_period';

        // 4. Match Subject
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
            // Attempt extracting subject name from common keywords
            const subRegex = /(?:subject|course|for)\s+([a-zA-Z\s]{3,25})(?:\s+for|\s+class|\s+by|\s+in|$)/i;
            const subMatch = prompt.match(subRegex);
            if (subMatch) {
                subjectName = subMatch[1].trim();
            } else if (text.includes('computer science') || text.includes('cs')) {
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
            } else {
                subjectName = 'Lecture';
            }
        }

        // 5. Match Instructor
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
            const instRegex = /(?:instructor|teacher|faculty|by|sir|mam)\s+([a-zA-Z\s]{3,30})(?:\s+for|\s+in|\s+at|$)/i;
            const instMatch = prompt.match(instRegex);
            if (instMatch) {
                instructorName = instMatch[1].trim();
            }
        }

        // 6. Match Room Number
        let roomNumber = '';
        const roomMatch = prompt.match(/room\s*#?\s*([a-zA-Z0-9-]+)/i) || prompt.match(/lab\s*#?\s*([a-zA-Z0-9-]+)/i);
        if (roomMatch) {
            roomNumber = roomMatch[1];
        } else if (slotType === 'lab' || subjectName.toLowerCase().includes('computer')) {
            roomNumber = 'Lab-1';
        } else {
            roomNumber = 'Room 101';
        }

        // Build array of slots across all matched days
        return matchedDays.map(dayOfWeek => ({
            dayOfWeek,
            periodNumber,
            startTime,
            endTime,
            subjectId,
            subjectName,
            instructorId,
            instructorName,
            roomNumber,
            slotType,
            isNew: true
        }));
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


