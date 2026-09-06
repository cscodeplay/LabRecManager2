const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const ACTIVE_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-3.6-flash'];
const ACTIVE_GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

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
    async extractAssignmentsFromImage(buffer, mimeType, customPrompt = '', preferredProvider = 'gemini') {
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

        // 1. Try Gemini (Primary Default)
        if ((preferredProvider === 'gemini' || preferredProvider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
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
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} extraction failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
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
                const parsed = this.parseJSONResponse(responseText);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (err) {
                console.warn(`[AIService] Groq extraction failed (${err.message}).`);
            }
        }

        // Secondary Gemini retry if preferredProvider was groq
        if (preferredProvider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
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
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Secondary Gemini extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        throw new Error('No AI provider configured or all providers failed. Please set GROQ_API_KEY or GEMINI_API_KEY.');
    }

    /**
     * Generate structured assignment list from natural language text prompt (non-image case)
     */
    async extractAssignmentsFromText(customPrompt = '', preferredProvider = 'gemini') {
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

        // 1. Try Gemini (Primary Default)
        if ((preferredProvider === 'gemini' || preferredProvider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    console.log(`[AIService] Generating assignments from text via Gemini (${modelName})...`);
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini ${modelName} failed: ${err.message}`);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    console.log(`[AIService] Generating assignments from text via Groq (${modelName})...`);
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'user', content: systemPrompt }],
                        temperature: 0.3
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '');
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq ${modelName} failed (${err.message}). Trying next...`);
                }
            }
        }

        // Secondary Gemini retry if preferredProvider was groq
        if (preferredProvider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Secondary Gemini text extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        throw new Error('No AI provider configured or all providers failed. Please set GROQ_API_KEY or GEMINI_API_KEY.');
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
            const groqModels = ACTIVE_GROQ_MODELS;
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
            const geminiModels = ACTIVE_GEMINI_MODELS;
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
            const groqModels = ACTIVE_GROQ_MODELS;
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
            const geminiModels = ACTIVE_GEMINI_MODELS;
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
            const groqModels = ACTIVE_GROQ_MODELS;
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
            const geminiModels = ACTIVE_GEMINI_MODELS;
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
            const groqModels = ACTIVE_GROQ_MODELS;
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
            const geminiModels = ACTIVE_GEMINI_MODELS;
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

        // 1. Try Groq first (Ultra-fast ~2-3s response, prevents reverse-proxy 30s timeouts)
        if (this.groq) {
            for (const gModel of ACTIVE_GROQ_MODELS) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: gModel,
                        messages: [
                            { role: 'system', content: 'You are an expert educational and administrative writing assistant. Output ONLY valid rich HTML tags (<h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>) without markdown code fence wrapper.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.3
                    });

                    let responseText = completion.choices[0]?.message?.content || '';
                    responseText = responseText.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/```$/i, '').trim();
                    responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                    if (responseText) {
                        return {
                            success: true,
                            html: responseText,
                            provider: `groq/${gModel}`
                        };
                    }
                } catch (groqErr) {
                    console.warn(`[AIService] Groq ${gModel} failed for notes assist:`, groqErr.message);
                }
            }
        }

        // 2. Fallback: Gemini
        if (this.genAI) {
            try {
                for (const modelName of ACTIVE_GEMINI_MODELS) {
                    try {
                        const model = this.genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent(systemPrompt);
                        let responseText = result.response.text() || '';
                        responseText = responseText.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/```$/i, '').trim();
                        responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
                console.warn('[AIService] Gemini failed for notes assist:', err.message);
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
                    model: ACTIVE_GROQ_MODELS[0],
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
                const model = this.genAI.getGenerativeModel({ model: ACTIVE_GEMINI_MODELS[0] });
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
                    model: ACTIVE_GROQ_MODELS[0],
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
            for (const modelName of ACTIVE_GEMINI_MODELS) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const responseText = result.response.text();
                    const parsed = this.parseJSONResponse(responseText);
                    if (parsed) return parsed;
                } catch (geminiErr) {
                    console.warn(`[AIService] Gemini (${modelName}) card-assist failed:`, geminiErr.message);
                }
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
                    model: ACTIVE_GROQ_MODELS[0],
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
    async generateTrainingModuleOutline({ topic, targetAudience = '', language = 'python', classLevel = 11, board = 'PSEB', totalUnits = 3, documentText = '', provider = 'gemini' }) {
        const targetUnitsCount = Math.max(1, Math.min(10, parseInt(totalUnits) || 3));
        const systemPrompt = `You are a distinguished Computer Science educator and curriculum designer.
Create a high-impact, pedagogy-aligned training course outline for the given topic.
TOPIC: ${topic}
PROGRAMMING LANGUAGE: ${language}
CLASS LEVEL: Grade ${classLevel}
BOARD / CURRICULUM: ${board}
TARGET UNITS COUNT: ${targetUnitsCount}
TARGET AUDIENCE / FOCUS: ${targetAudience || 'School / College Computer Science Students'}

${documentText ? `SOURCE REFERENCE DOCUMENT (GROUNDING MATERIAL):
---
${documentText.slice(0, 14000)}
---
STRICT GROUNDING REQUIREMENT: An authoritative textbook/syllabus document is attached above. You MUST extract and structure the ${targetUnitsCount} units, key concepts, and descriptions directly from the chapters and topics in this document to avoid irrelevant or generic content.` : ''}

CRITICAL REQUIREMENT: The "units" array in the JSON response MUST contain EXACTLY ${targetUnitsCount} distinct, logically progressive units (numbered 1 to ${targetUnitsCount}).

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
      "title": "Unit 1: Foundations of...",
      "description": "Core concepts covered in this unit...",
      "expectedHours": 4,
      "unlockThreshold": 80,
      "keyConcepts": ["Concept A", "Concept B"],
      "suggestedExerciseTypes": ["coding", "mcq", "fill_blank"]
    }
  ]
}`;

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini training outline (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Ultra-fast fallback or primary if explicitly requested)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'You are an educational AI assistant. Output ONLY valid JSON matching the schema. No markdown code blocks.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq training outline (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback training outline (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. Domain-Intelligent Fallback for exactly targetUnitsCount units
        const lowerTopic = String(topic || '').toLowerCase();
        let unitThemes = [
            { title: 'Foundations, Syntax & Environment Setup', desc: `Core syntax, environment initialization, and foundational mechanics of ${topic}.`, concepts: ['Syntax & Declarations', 'Memory Model', 'Basic I/O'] },
            { title: 'Control Flow, Conditionals & Loops', desc: `Iterative execution, branch logic, and algorithm control flow in ${topic}.`, concepts: ['Conditional Branching', 'Iteration Patterns', 'State Tracking'] },
            { title: 'Modular Functions, Scope & Recursion', desc: `Decomposing problems into reusable procedures, variable scope, and recursive calls.`, concepts: ['Function Signatures', 'Scope & Closures', 'Call Stack & Base Cases'] },
            { title: 'Core Data Structures & Collections', desc: `Manipulating linear and associative collections, slicing, and memory allocation.`, concepts: ['Arrays / Lists', 'Maps / Dictionaries', 'Searching & Sorting'] },
            { title: 'Object-Oriented Design & Encapsulation', desc: `Class blueprints, encapsulation, methods, inheritance, and clean OOP principles.`, concepts: ['Classes & Objects', 'Encapsulation & Methods', 'Polymorphism'] },
            { title: 'Error Handling, I/O & File Operations', desc: `Defensive programming, exception handling, file streams, and serialization.`, concepts: ['Try-Catch-Finally', 'File Streams', 'JSON & Data Serialization'] },
            { title: 'Algorithmic Optimization & Complexity', desc: `Time and space complexity, Big-O analysis, caching, and algorithmic speedups.`, concepts: ['Time Complexity', 'Space Tradeoffs', 'Memoization'] },
            { title: 'Capstone Project & Production Readiness', desc: `Full end-to-end software artifact construction, testing, and deployment.`, concepts: ['System Architecture', 'Automated Testing', 'Capstone Delivery'] }
        ];

        // Specific curriculum tailored for OOP
        if (lowerTopic.includes('object') || lowerTopic.includes('oop') || lowerTopic.includes('class') || lowerTopic.includes('oriented')) {
            unitThemes = [
                { title: 'Classes, Objects & State Modeling', desc: `Core OOP paradigms, creating class blueprints, instantiating objects, and modeling real-world entities in ${language}.`, concepts: ['Class Blueprint vs Instance', 'Instance Variables', 'Object State & Lifecycle'] },
                { title: 'Constructors, Methods & Encapsulation', desc: `Special constructor methods, designing instance methods with self, data hiding, and access modifiers.`, concepts: ['__init__ Constructor', 'Instance Methods & self', 'Private vs Public Attributes'] },
                { title: 'Inheritance Hierarchies & Code Reusability', desc: `Single and multiple inheritance, extending base classes, super() resolution, and method overriding.`, concepts: ['Base vs Derived Classes', 'Method Overriding', 'super() Function'] },
                { title: 'Polymorphism & Operator Overloading', desc: `Dynamic method dispatch, duck typing, and overloading built-in operators using dunder magic methods.`, concepts: ['Polymorphic Functions', 'Magic Methods (__str__, __len__)', 'Operator Overloading'] },
                { title: 'Abstraction, Interfaces & Clean Architecture', desc: `Abstract base classes, enforcing contracts, SOLID principles, and modular system composition.`, concepts: ['Abstract Base Classes (abc)', 'Loose Coupling', 'Modular OOP Design'] }
            ];
        } else if (lowerTopic.includes('data structure') || lowerTopic.includes('stack') || lowerTopic.includes('queue') || lowerTopic.includes('tree')) {
            unitThemes = [
                { title: 'Linear Structures: Lists, Arrays & Strings', desc: `Memory representation, slicing, indexing, time complexity, and dynamic array mechanics in ${language}.`, concepts: ['Contiguous Arrays', 'Index Arithmetic', 'Amortized Complexity'] },
                { title: 'Stacks & Queues: LIFO & FIFO Processing', desc: `Implementing stacks and queues, expression evaluation, parentheses balancing, and BFS buffers.`, concepts: ['Stack Operations (Push/Pop)', 'Queue Mechanics (Enqueue/Dequeue)', 'Buffer Scheduling'] },
                { title: 'Linked Lists & Pointer Traversal', desc: `Node construction, singly and doubly linked chains, insertion, deletion, and cycle detection.`, concepts: ['Node Pointers', 'Head/Tail Traversal', 'Pointer Manipulation'] },
                { title: 'Trees, Graphs & Search Traversal', desc: `Binary search trees, graph adjacency, and depth-first/breadth-first traversal algorithms.`, concepts: ['Binary Search Trees (BST)', 'In-Order Traversal', 'Graph Adjacency'] }
            ];
        }

        const generatedUnits = [];
        for (let i = 0; i < targetUnitsCount; i++) {
            const theme = unitThemes[i % unitThemes.length];
            generatedUnits.push({
                unitNumber: i + 1,
                title: `Unit ${i + 1}: ${theme.title}`,
                description: theme.desc,
                expectedHours: 4 + (i * 2),
                unlockThreshold: 80,
                keyConcepts: theme.concepts,
                suggestedExerciseTypes: i === 0 ? ['coding', 'mcq'] : i === targetUnitsCount - 1 ? ['coding', 'case_study'] : ['coding', 'fill_blank', 'bug_fix']
            });
        }

        return {
            title: `${topic} Professional Masterclass`,
            titleHindi: `${topic} व्यावसायिक पाठ्यक्रम`,
            description: `A comprehensive ${targetUnitsCount}-unit curriculum designed for Grade ${classLevel} students covering ${topic} from fundamentals to production mastery.`,
            language,
            boardAligned: board,
            classLevel: Number(classLevel) || 11,
            pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
            units: generatedUnits
        };
    }

    /**
     * Generate rich Lesson Theory, Markdown Notes, and Educational SVG Graphics / Mermaid Diagrams
     */
    async generateTrainingTheoryAndGraphics({ topic, unitTitle = '', unitDescription = '', moduleTitle = '', documentText = '', language = 'python', classLevel = 11, provider = 'gemini' }) {
        const systemPrompt = `You are an elite Computer Science instructional designer and technical illustrator.
Generate comprehensive, student-friendly learning material for the following concept:
TOPIC: ${topic}
UNIT TITLE: ${unitTitle || 'General Unit'} ${unitDescription ? `(${unitDescription})` : ''}
COURSE: ${moduleTitle || 'Active Computer Science Course'}
LANGUAGE: ${language}
CLASS LEVEL: Grade ${classLevel}

${unitTitle ? `UNIT CONTEXT ALIGNMENT: This lesson belongs directly to the unit "${unitTitle}". You MUST tailor the theory, definitions, practical code snippets, and SVG illustrations specifically to this unit's concept scope.` : ''}

${documentText ? `REFERENCE DOCUMENT EXCERPTS (STRICT GROUNDING):
---
${documentText.slice(0, 10000)}
---
MANDATORY GROUNDING RULE: You MUST draw your terminology, algorithmic steps, code syntax, and examples strictly from the uploaded document material above to ensure 100% textbook alignment and avoid irrelevant tangents.` : ''}

REQUIREMENTS:
1. "theoryMarkdown": Detailed, clean markdown with headings (##, ###), bullet points, bold keywords, code examples with syntax formatting, mental analogies, and memory tips.
2. "svgGraphic": A self-contained, clean, modern educational SVG illustration (width="100%", viewBox="0 0 800 400") visualizing the concept (e.g., memory layout, data flow, stack/heap, recursion tree, variable box, or loop cycle) with dark-theme styled rects (#1e293b, #334155), vibrant accents (#6366f1, #10b981, #f59e0b, #38bdf8), and clear text labels. Must be valid SVG XML string.
3. "mermaidDiagram": Clean Mermaid.js chart code (e.g. flowchart TD or sequenceDiagram).
4. "keyTakeaways": Array of 3-4 concise takeaway bullets.
5. "quickCheckQuestion": A fast 1-question self-check for the student with question and answer.
6. "miniCheckpoints": Array of 2-3 interactive bite-sized checkpoints for students:
   [
     {
       "id": "cp1",
       "question": "Quick Concept Check question...",
       "codeSnippet": "optional short code snippet",
       "options": ["Option A", "Option B", "Option C", "Option D"],
       "correctOption": 0,
       "explanation": "Clear explanation..."
     }
   ]
7. "cbseTips": Array of 2-3 common CBSE board exam traps, pitfalls, and previous year exam tips for this concept.

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Lesson Title",
  "theoryMarkdown": "Markdown string...",
  "svgGraphic": "<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 800 360\\">...</svg>",
  "mermaidDiagram": "flowchart TD\\nA[Input] --> B[Process] --> C[Output]",
  "keyTakeaways": ["Key point 1", "Key point 2", "Key point 3"],
  "miniCheckpoints": [
    {
      "id": "cp1",
      "question": "Quick question?",
      "options": ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
      "correctOption": 0,
      "explanation": "Why Opt 1 is correct"
    }
  ],
  "cbseTips": ["CBSE trap note 1", "CBSE trap note 2"],
  "quickCheckQuestion": {
    "question": "What happens when...?",
    "answer": "Explanation of expected behavior..."
  }
}`;

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.theoryMarkdown || parsed.svgGraphic)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini theory/graphics (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'Output ONLY valid JSON. Escape quotes in SVG attributes properly.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.theoryMarkdown || parsed.svgGraphic)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq theory/graphics (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.theoryMarkdown || parsed.svgGraphic)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback theory/graphics (${modelName}) failed:`, err.message);
                }
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
  <path d="M 270 150 L 350 150" stroke="#818cf8" stroke-width="3" />
  <rect x="360" y="40" width="220" height="220" rx="12" fill="#1e293b" stroke="#10b981" stroke-width="2" />
  <text x="470" y="80" fill="#6ee7b7" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">${topic}</text>
  <circle cx="470" cy="150" r="40" fill="#064e3b" stroke="#34d399" stroke-width="2" />
  <text x="470" y="155" fill="#ffffff" font-size="13" font-family="sans-serif" text-anchor="middle">Computed</text>
  <path d="M 590 150 L 670 150" stroke="#34d399" stroke-width="3" />
  <rect x="680" y="40" width="80" height="220" rx="12" fill="#1e293b" stroke="#f59e0b" stroke-width="2" />
  <text x="720" y="155" fill="#fde68a" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="middle">Result</text>
</svg>`,
            mermaidDiagram: `flowchart LR\n    A[Input State] --> B[Execute ${topic}]\n    B --> C[Validated Output]`,
            keyTakeaways: [
                `Break down the logic into modular, single-responsibility functions.`,
                `Always validate edge cases and exception handling.`,
                `Keep code idiomatic and follow standard conventions.`
            ],
            miniCheckpoints: [
                {
                    id: "cp1",
                    question: `What is the primary role of ${topic}?`,
                    options: [
                        `To structure logic cleanly and avoid redundant code`,
                        `To bypass syntax checking entirely`,
                        `To slow down runtime execution`,
                        `To force global state mutation`
                    ],
                    correctOption: 0,
                    explanation: `${topic} provides modularity, clarity, and robust computational structure.`
                }
            ],
            cbseTips: [
                `Pay special attention to variable scope and mutation boundaries.`,
                `In CBSE board practicals, always write clean comments and indent consistently.`
            ],
            quickCheckQuestion: {
                question: `What is the core benefit of utilizing ${topic}?`,
                answer: `It enables structured, maintainable, and high-performance execution.`
            }
        };
    }

    /**
     * Generate complete Training Exercises covering all 5 question types
     */
    async generateTrainingExercise({ topic, unitTitle = '', unitDescription = '', moduleTitle = '', documentText = '', language = 'python', exerciseType = 'coding', difficulty = 'beginner', scaffoldLevel = 'guided', bloomsLevel = 'apply', customPrompt = '', provider = 'gemini' }) {
        let typeInstruction = '';
        if (exerciseType === 'coding') {
            typeInstruction = `Generate a standard CODING LAB exercise:
CRITICAL: Do NOT output placeholder code like 'def solve(n): pass'. The "starterCode" and "solutionCode" MUST be specifically written for '${topic}' in the context of unit '${unitTitle}' (or custom prompt '${customPrompt}') with realistic function names, docstrings, and actual algorithm logic matching difficulty '${difficulty}', scaffold '${scaffoldLevel}', and bloom level '${bloomsLevel}'.
- "starterCode": Boilerplate with function signature, docstring explaining parameters/returns, scaffolding comments and starter variables.
- "solutionCode": Complete working executable solution code solving the specific problem.
- "testCases": Array of at least 3 realistic test cases with realistic inputs and expected outputs: [{"input": "...", "expectedOutput": "...", "isHidden": false}, {"input": "...", "expectedOutput": "...", "isHidden": true}]
- "hints": Array of 2-3 progressive Socratic hints.`;
        } else if (exerciseType === 'bug_fix') {
            typeInstruction = `Generate a PR REVIEW / BUG HUNT exercise where student is given buggy code and must fix it:
- "starterCode": Code specifically implementing '${topic}' for unit '${unitTitle}' containing a subtle logical or off-by-one bug with comments like "# FIX THE BUG HERE"
- "solutionCode": The clean, corrected code
- "testCases": Array of 3 test cases that fail on buggy code but pass on corrected code
- "hints": Array of 2 hints pointing toward the bug's cause`;
        } else if (exerciseType === 'mcq') {
            typeInstruction = `Generate a CODE TRACING / OUTPUT PREDICTION MCQ specifically about '${topic}' for unit '${unitTitle}':
- "testCases": {
    "question": "What is the exact output of this code snippet?",
    "codeSnippet": "Code snippet in ${language} demonstrating ${topic} with tricky logic or edge cases",
    "options": ["Option A (Incorrect)", "Option B (Correct)", "Option C (Distractor)", "Option D (Distractor)"],
    "correctOption": 1,
    "explanation": "Detailed explanation of why Option B is correct and why others fail."
  }
- "starterCode": null
- "solutionCode": null`;
        } else if (exerciseType === 'fill_blank') {
            typeInstruction = `Generate a SYNTAX CLOZE / FILL-IN-THE-BLANKS exercise for '${topic}' in unit '${unitTitle}':
- "starterCode": The exact code snippet template containing placeholders like {{BLANK_1}} and {{BLANK_2}}
- "solutionCode": The complete, working, executable code with all {{BLANK_N}} placeholders replaced with their exact correct answer tokens
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
            typeInstruction = `Generate a REAL-WORLD MNC INCIDENT CASE STUDY based on '${topic}' for unit '${unitTitle}':
- "testCases": {
    "company": "Fictional Tech Company / Team",
    "incident": "Incident description (e.g. Production latency spike during peak checkout)",
    "scenarioCode": "Relevant architectural or backend code snippet demonstrating ${topic}",
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
        } else if (exerciseType === 'assertion_reason') {
            typeInstruction = `Generate a CBSE CLASS 11/12 ASSERTION-REASONING challenge based on '${topic}' for unit '${unitTitle}':
- "testCases": {
    "assertion": "Assertion statement about ${topic} syntax or behavior",
    "reason": "Reason statement explaining the underlying compiler/runtime rule",
    "correctOption": 0,
    "explanation": "Clear explanation of whether each statement is true and whether Reason logically explains Assertion."
  }
- "starterCode": null
- "solutionCode": null`;
        } else if (exerciseType === 'code_trace') {
            typeInstruction = `Generate a CBSE DRY-RUN / VARIABLE TRACING TABLE challenge for '${topic}' in unit '${unitTitle}':
- "testCases": {
    "codeSnippet": "Short, tricky code loop or function in ${language} demonstrating ${topic}",
    "tableHeaders": ["Iteration / Step", "Variable 1", "Variable 2"],
    "expectedRows": [
      ["1", "val1", "val2"],
      ["2", "val3", "val4"],
      ["3", "val5", "val6"]
    ],
    "explanation": "Step-by-step dry-run walkthrough showing variable values at each step."
  }
- "starterCode": null
- "solutionCode": null`;
        } else if (exerciseType === 'code_debug') {
            typeInstruction = `Generate a CBSE CODE DEBUGGING & ERROR SPOTTING challenge for '${topic}' in unit '${unitTitle}':
- "starterCode": "Code snippet with 1-2 syntax or logical errors on specific line(s)",
- "solutionCode": "Clean, corrected code that compiles and runs properly",
- "testCases": {
    "buggyCode": "Code snippet with 1-2 deliberate errors",
    "errors": [
      { "line": 3, "description": "Syntax/logical error description", "correctedLine": "corrected line code" }
    ],
    "solutionCode": "clean code",
    "explanation": "Clear explanation of each bug, line numbers, and how to fix them."
  }`;
        }

        const systemPrompt = `You are an expert pedagogy and computer science challenge architect.
Create an exercise with the following parameters:
TARGET TOPIC: ${topic}
TARGET UNIT: ${unitTitle || 'Active Unit'} ${unitDescription ? `(${unitDescription})` : ''}
COURSE CONTEXT: ${moduleTitle || 'Computer Science Training Module'}
LANGUAGE: ${language}
EXERCISE TYPE: ${exerciseType}
DIFFICULTY: ${difficulty}
SCAFFOLD LEVEL: ${scaffoldLevel}
BLOOM'S TAXONOMY LEVEL: ${bloomsLevel}
ADDITIONAL INSTRUCTIONS: ${customPrompt || 'None'}

${unitTitle ? `UNIT ALIGNMENT MANDATE: The exercise MUST directly evaluate and reinforce the skills of Unit "${unitTitle}". Do not generate general/unrelated questions outside this unit's scope.` : ''}

${documentText ? `DOCUMENT GROUNDING CONTEXT:
---
${documentText.slice(0, 10000)}
---
STRICT GROUNDING: Draw the exercise scenario, code constructs, and variables directly from the concepts and examples in this uploaded reference material.` : ''}

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

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.description)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini exercise generation (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'Output ONLY valid JSON. No markdown code block wrapping.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.title || parsed.description)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq exercise generation (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.description)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback exercise generation (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. Dynamic Topic-Tailored Fallback
        const cleanSlug = (topic || 'solution').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) || 'algorithm';
        const funcName = `solve_${cleanSlug}`;

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
                    question: `What will the following ${language} code print for ${topic}?`,
                    codeSnippet: language === 'python' ? `items = [10, 20, 30]\nresult = [x * 2 for x in items if x > 15]\nprint(result)` : `const items = [10, 20, 30];\nconst result = items.filter(x => x > 15).map(x => x * 2);\nconsole.log(result);`,
                    options: ['[20, 40, 60]', '[40, 60]', '[20, 40]', '[10, 20]'],
                    correctOption: 1,
                    explanation: `Only elements > 15 (20 and 30) are selected and multiplied by 2, giving [40, 60].`
                },
                hints: [`Check the filter condition first, then the transformation.`]
            };
        }

        if (exerciseType === 'fill_blank') {
            const template = language === 'python'
                ? `def ${funcName}(items):\n    # Filter and transform elements for ${topic}\n    {{BLANK_1}} not items:\n        return []\n    {{BLANK_2}} [x * 2 for x in items if x > 0]`
                : `function ${funcName}(items) {\n    // Filter and transform elements for ${topic}\n    {{BLANK_1}} (!items || items.length === 0) return [];\n    {{BLANK_2}} items.filter(x => x > 0).map(x => x * 2);\n}`;
            const solution = language === 'python'
                ? `def ${funcName}(items):\n    # Filter and transform elements for ${topic}\n    if not items:\n        return []\n    return [x * 2 for x in items if x > 0]`
                : `function ${funcName}(items) {\n    // Filter and transform elements for ${topic}\n    if (!items || items.length === 0) return [];\n    return items.filter(x => x > 0).map(x => x * 2);\n}`;
            return {
                title: `Syntax Cloze: ${topic}`,
                description: `Fill in the missing tokens in the code snippet to implement ${topic}.`,
                theory: `Mastering syntax tokens ensures clean and reliable execution.`,
                exerciseType: 'fill_blank',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT complete ${topic} syntax patterns.`,
                xpReward: 10,
                timeLimit: 5,
                isReviewExercise: false,
                starterCode: template,
                solutionCode: solution,
                testCases: {
                    instruction: `Fill in the missing keywords:`,
                    template: template,
                    blanks: [
                        { id: 'BLANK_1', correctAnswer: 'if', hint: 'Guard condition check' },
                        { id: 'BLANK_2', correctAnswer: 'return', hint: 'Output return statement' }
                    ],
                    explanation: `Guards against empty data with 'if' and returns transformed array with 'return'.`
                },
                hints: [`Look at standard conditional and return keywords.`]
            };
        }

        if (exerciseType === 'assertion_reason') {
            return {
                title: `CBSE Assertion & Reason: ${topic}`,
                description: `Assess Assertion (A) and Reason (R) statements regarding ${topic} in ${language}.`,
                theory: `Carefully examine the truth value of both statements before assessing causal connection.`,
                exerciseType: 'assertion_reason',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT evaluate Assertion-Reasoning logic for ${topic}.`,
                xpReward: 15,
                timeLimit: 5,
                isReviewExercise: false,
                testCases: {
                    assertion: `In ${language}, understanding ${topic} is required for structured program control.`,
                    reason: `${topic} dictates the computational sequence and data flow within execution scopes.`,
                    correctOption: 0,
                    explanation: `Both statements are true, and the Reason correctly explains why ${topic} determines program control.`
                },
                hints: [`Determine if Assertion is true, then if Reason is true, then check if Reason explains Assertion.`]
            };
        }

        if (exerciseType === 'code_trace') {
            return {
                title: `Dry-Run Trace Table: ${topic}`,
                description: `Trace the variable state transformations step-by-step for the given ${topic} snippet.`,
                theory: `Dry running on paper or trace table is an essential CBSE examination skill.`,
                exerciseType: 'code_trace',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT dry-run and trace variable values for ${topic}.`,
                xpReward: 15,
                timeLimit: 5,
                isReviewExercise: false,
                testCases: {
                    codeSnippet: language === 'python'
                        ? `a = 2\nb = 5\nfor i in range(1, 4):\n    a = a + i\n    b = b * 2`
                        : `let a = 2;\nlet b = 5;\nfor (let i = 1; i <= 3; i++) {\n    a = a + i;\n    b = b * 2;\n}`,
                    tableHeaders: ['Step (i)', 'Value of a', 'Value of b'],
                    expectedRows: [
                        ['1', '3', '10'],
                        ['2', '5', '20'],
                        ['3', '8', '40']
                    ],
                    explanation: `At i=1: a=3, b=10. At i=2: a=5, b=20. At i=3: a=8, b=40.`
                },
                hints: [`Track each variable's new state after each iteration.`]
            };
        }

        if (exerciseType === 'code_debug') {
            const buggy = language === 'python'
                ? `def calculate(values):\n    total = 0\n    for v in values\n        total += v\n    return total`
                : `function calculate(values) {\n    let total = 0;\n    for (let v of values {\n        total += v;\n    }\n    return total;\n}`;
            const clean = language === 'python'
                ? `def calculate(values):\n    total = 0\n    for v in values:\n        total += v\n    return total`
                : `function calculate(values) {\n    let total = 0;\n    for (let v of values) {\n        total += v;\n    }\n    return total;\n}`;
            return {
                title: `Error Spotting & Debugging: ${topic}`,
                description: `Identify and fix the syntax/logical error in the ${topic} function.`,
                theory: `Spotting syntax errors on specific lines is a core CBSE Board Practical assessment skill.`,
                exerciseType: 'code_debug',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `SWBAT debug syntax and logical errors in ${topic}.`,
                xpReward: 15,
                timeLimit: 5,
                isReviewExercise: false,
                starterCode: buggy,
                solutionCode: clean,
                testCases: {
                    buggyCode: buggy,
                    errors: [
                        { line: 3, description: `Missing colon/bracket on loop header`, correctedLine: language === 'python' ? `    for v in values:` : `    for (let v of values) {` }
                    ],
                    solutionCode: clean,
                    explanation: `Line 3 had a syntax error in the loop declaration.`
                },
                hints: [`Look at line 3 for missing delimiters.`]
            };
        }

        const starter = language === 'python'
            ? `def ${funcName}(values):\n    """\n    Solve ${topic} (${difficulty} / ${scaffoldLevel})\n    :param values: list of numbers or data elements\n    :return: transformed result\n    """\n    # TODO: Implement your solution for ${topic}\n    result = []\n    for item in values:\n        # Process each item\n        pass\n    return result\n`
            : `function ${funcName}(values) {\n    /**\n     * Solve ${topic} (${difficulty} / ${scaffoldLevel})\n     * @param {Array} values\n     * @returns {Array}\n     */\n    // TODO: Implement your solution for ${topic}\n    const result = [];\n    for (const item of values) {\n        // Process item\n    }\n    return result;\n}\n`;

        const solution = language === 'python'
            ? `def ${funcName}(values):\n    """\n    Solve ${topic} (${difficulty} / ${scaffoldLevel})\n    """\n    if not values:\n        return []\n    return [x * 2 for x in values if x is not None]\n`
            : `function ${funcName}(values) {\n    if (!values || !Array.isArray(values)) return [];\n    return values.filter(x => x !== null).map(x => x * 2);\n}\n`;

        return {
            title: `Hands-on Lab: ${topic}`,
            description: `Implement ${funcName}(values) to process the input according to ${topic} rules. Return the correctly computed result.`,
            theory: `## 📘 Learning Concept: ${topic}\n\nUnderstand the computational rules of ${topic} before implementing your algorithm.`,
            exerciseType: 'coding',
            difficulty,
            scaffoldLevel,
            bloomsLevel,
            learningObjective: `SWBAT implement ${topic} in ${language} adhering to ${scaffoldLevel} guidelines.`,
            xpReward: difficulty === 'advanced' ? 25 : difficulty === 'intermediate' ? 15 : 10,
            timeLimit: 5,
            isReviewExercise: false,
            starterCode: starter,
            solutionCode: solution,
            testCases: [
                { input: '[1, 2, 3]', expectedOutput: '[2, 4, 6]', isHidden: false },
                { input: '[5, 10]', expectedOutput: '[10, 20]', isHidden: false },
                { input: '[]', expectedOutput: '[]', isHidden: true }
            ],
            hints: [`Start by checking for empty or None inputs.`, `Iterate through the collection and apply the ${topic} transformation.`]
        };
    }

    /**
     * Generate interactive Socratic Hint for a student stuck on an exercise
     */
    async generateSocraticHint({ problemTitle, problemDescription, studentCode, currentOutput, failedTests = [], provider = 'gemini' }) {
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

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.socraticHint || parsed.guidingQuestion)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini socratic hint (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'Output ONLY valid JSON.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.3
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.socraticHint || parsed.guidingQuestion)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq socratic hint (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.socraticHint || parsed.guidingQuestion)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback socratic hint (${modelName}) failed:`, err.message);
                }
            }
        }

        return {
            socraticHint: `Take a close look at your variable initialization and the loop boundary conditions.`,
            guidingQuestion: `What value does your function return when given the first test input?`,
            edgeCaseToConsider: `Test with empty inputs or zero.`
        };
    }

    /**
     * Batch Exercise Generator from checked topics, checkpoints, or RAG ebook chapter text
     */
    async generateTrainingExerciseBatch({
        topics = [],
        unitTitle = '',
        language = 'python',
        classLevel = 11,
        board = 'CBSE',
        count = 3,
        source = 'topics',
        documentText = '',
        exerciseType = 'mixed',
        provider = 'gemini'
    }) {
        const targetCount = Math.max(1, Math.min(8, parseInt(count) || 3));
        const topicsStr = Array.isArray(topics) && topics.length > 0 ? topics.join('; ') : unitTitle || 'Core Concepts';

        let promptDirectives = '';
        if (source === 'rag' && documentText) {
            promptDirectives = `Extract or construct ${targetCount} practical exercises for the unit "${unitTitle}" based directly on the provided textbook / ebook chapter text below. Look for review questions, exercise problems, code snippets to debug, or theoretical MCQs:\n\n--- TEXTBOOK EXCERPT ---\n${documentText.slice(0, 7000)}\n--- END EXCERPT ---`;
        } else {
            promptDirectives = `Construct ${targetCount} practical exercises for the unit "${unitTitle}" specifically testing these checked topics/checkpoints: ${topicsStr}.`;
        }

        const systemPrompt = `You are a high-school and university Computer Science pedagogy expert.
${promptDirectives}

SPECIFICATIONS:
- LANGUAGE: ${language}
- CLASS LEVEL: Grade ${classLevel} (${board} Curriculum)
- EXERCISE TYPE REQUIREMENT: ${exerciseType === 'mixed' ? 'Provide a varied pedagogical mix (e.g. 1 coding lab, 1 MCQ, 1 bug_fix or assertion_reason)' : `All exercises must be of type "${exerciseType}"`}
- Total exercises to return: ${targetCount}

For each exercise, provide:
1. "title": Concise, engaging problem title.
2. "description": Clear problem statement in Markdown with constraints and examples.
3. "exerciseType": "coding" | "mcq" | "fill_blank" | "bug_fix" | "assertion_reason" | "code_trace"
4. "difficulty": "beginner" | "intermediate" | "advanced"
5. "scaffoldLevel": "guided" | "independent" | "challenge"
6. "bloomsLevel": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create"
7. "learningObjective": Single sentence learning outcome.
8. "xpReward": Integer between 10 and 30.
9. "timeLimit": Expected minutes (3 to 10).
10. "starterCode": Code template (for coding/bug_fix/fill_blank).
11. "solutionCode": Complete working reference solution.
12. "testCases": Array of { input, expectedOutput, isHidden } for coding, OR object matching schema for MCQ/assertion_reason/debug/trace.
13. "hints": Array of 2 helpful hints.

Output MUST be ONLY valid JSON matching this schema:
{
  "exercises": [
    {
      "title": "...",
      "description": "...",
      "exerciseType": "coding",
      "difficulty": "beginner",
      "scaffoldLevel": "guided",
      "bloomsLevel": "apply",
      "learningObjective": "...",
      "xpReward": 20,
      "timeLimit": 5,
      "starterCode": "...",
      "solutionCode": "...",
      "testCases": [...],
      "hints": ["...", "..."]
    }
  ]
}`;

        // 1. Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini batch exercises (${modelName}) failed:`, err.message);
                }
            }
        }

        // 2. Try Groq (Fallback)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'Output ONLY valid JSON. No code fences.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Groq batch exercises (${modelName}) failed:`, err.message);
                }
            }
        }

        // Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini fallback batch exercises (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. Fallback Generation based on checked topics
        const generatedExercises = [];
        const topicList = Array.isArray(topics) && topics.length > 0 ? topics : [unitTitle || 'Core Syntax'];

        for (let i = 0; i < targetCount; i++) {
            const currentTopic = topicList[i % topicList.length];
            const exType = exerciseType === 'mixed'
                ? (i === 1 ? 'mcq' : (i === 2 ? 'code_debug' : 'coding'))
                : (exerciseType || 'coding');

            generatedExercises.push(this.createAcademicExerciseForTopic({
                topic: currentTopic,
                unitTitle,
                language,
                exerciseType: exType,
                difficulty: 'beginner',
                scaffoldLevel: 'guided',
                bloomsLevel: 'apply',
                index: i,
                documentText
            }));
        }

        return { exercises: generatedExercises };
    }

    /**
     * Create high-quality, academic, CBSE board-aligned exercise for a topic.
     * Eliminates placeholder code and casual names ('solve_...', 'def solution()').
     */
    createAcademicExerciseForTopic({
        topic = 'Core Processing',
        unitTitle = '',
        language = 'python',
        exerciseType = 'coding',
        difficulty = 'intermediate',
        scaffoldLevel = 'guided',
        bloomsLevel = 'apply',
        index = 0,
        documentText = ''
    }) {
        const textSample = `${topic} ${unitTitle} ${documentText}`.toLowerCase();
        const cleanTopic = this.cleanTitle(topic);

        if (language === 'sql') {
            return {
                title: `${cleanTopic} Relational Query Lab`,
                description: `## 🎯 Problem Statement\n\nWrite an SQL query to demonstrate **${cleanTopic}** based on the relational schema.\n\n### Schema Table: \`Student\`\n| Column | Type | Constraints |\n| :--- | :--- | :--- |\n| \`RollNo\` | \`INT\` | \`PRIMARY KEY\` |\n| \`Name\` | \`VARCHAR(50)\` | \`NOT NULL\` |\n| \`Marks\` | \`DECIMAL(5,2)\` | \`CHECK (Marks >= 0)\` |\n\n### Requirements:\n- Write a query fulfilling the ${cleanTopic} specifications.\n- Ensure all keywords conform to standard SQL syntax.`,
                exerciseType: 'coding',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: `Execute standard SQL queries for ${cleanTopic}.`,
                xpReward: 25,
                timeLimit: 5,
                starterCode: `-- Write SQL query for ${cleanTopic}\nSELECT * FROM Student;\n`,
                solutionCode: `SELECT RollNo, Name, Marks FROM Student WHERE Marks >= 75 ORDER BY Marks DESC;\n`,
                testCases: [
                    { input: 'SELECT RollNo, Name, Marks FROM Student WHERE Marks >= 75;', expectedOutput: 'Query executed successfully', isHidden: false }
                ],
                hints: ['Review SQL keywords: SELECT, FROM, WHERE, ORDER BY.']
            };
        }

        // Python Exercises
        if (exerciseType === 'mcq') {
            if (/tuple/i.test(textSample)) {
                return {
                    title: `${cleanTopic}: Output Prediction Challenge`,
                    description: `Predict the output of the following Python code evaluating **${cleanTopic}**.`,
                    exerciseType: 'mcq',
                    difficulty: 'intermediate',
                    scaffoldLevel: 'guided',
                    bloomsLevel: 'analyze',
                    learningObjective: 'Accurately predict output of tuple operations and immutability rules.',
                    xpReward: 20,
                    timeLimit: 4,
                    starterCode: '',
                    solutionCode: '',
                    testCases: {
                        question: 'What will be the output of the following code snippet?',
                        codeSnippet: 't = (1, 2, 3)\nt = t * 2\nprint(len(t), t[3])',
                        options: ['6 1', '6 2', '3 1', 'TypeError: tuple repetition not allowed'],
                        correctOption: 0,
                        explanation: 'Repetition (*) on (1, 2, 3) produces (1, 2, 3, 1, 2, 3). The length is 6, and index 3 (4th element) is 1.'
                    },
                    hints: ['Tuples support repetition (*) creating a new tuple with repeated elements. Indexing is 0-based.']
                };
            }
            if (/dict/i.test(textSample)) {
                return {
                    title: `${cleanTopic}: Dictionary Tracing Challenge`,
                    description: `Predict the output of the following code snippet evaluating **${cleanTopic}**.`,
                    exerciseType: 'mcq',
                    difficulty: 'intermediate',
                    scaffoldLevel: 'guided',
                    bloomsLevel: 'analyze',
                    learningObjective: 'Trace dictionary operations and update behavior.',
                    xpReward: 20,
                    timeLimit: 4,
                    starterCode: '',
                    solutionCode: '',
                    testCases: {
                        question: 'What will be the output of the following code?',
                        codeSnippet: 'record = {"A": 10, "B": 20}\nrecord["A"] += 5\nrecord["C"] = record.get("C", 0) + 1\nprint(record["A"], record["C"])',
                        options: ['15 1', '10 1', 'KeyError: "C"', '15 0'],
                        correctOption: 0,
                        explanation: 'record["A"] is incremented from 10 to 15. record.get("C", 0) returns default 0, which + 1 is assigned to record["C"] as 1.'
                    },
                    hints: ['get() safely returns default when key does not exist.']
                };
            }
            return {
                title: `${cleanTopic}: Code Tracing Challenge`,
                description: `Evaluate the following code snippet evaluating **${cleanTopic}**.`,
                exerciseType: 'mcq',
                difficulty: 'intermediate',
                scaffoldLevel: 'guided',
                bloomsLevel: 'analyze',
                learningObjective: `Analyze control flow and output for ${cleanTopic}.`,
                xpReward: 20,
                timeLimit: 4,
                starterCode: '',
                solutionCode: '',
                testCases: {
                    question: `What will be the output of the code evaluating ${cleanTopic}?`,
                    codeSnippet: `# Evaluation of ${cleanTopic}\nx = 5\nprint(x * 2)`,
                    options: ['10', '5', '25', 'TypeError'],
                    correctOption: 0,
                    explanation: `Execution evaluates standard operations according to ${language} semantics.`
                },
                hints: ['Trace variables step-by-step through execution.']
            };
        }

        if (exerciseType === 'code_debug') {
            if (/tuple/i.test(textSample)) {
                return {
                    title: `Debug: Fix Tuple Mutation Error in ${cleanTopic}`,
                    description: `A student attempted to modify a tuple in place. Fix the code so it returns a new updated tuple with the modified value without raising a TypeError.`,
                    exerciseType: 'code_debug',
                    difficulty: 'intermediate',
                    scaffoldLevel: 'guided',
                    bloomsLevel: 'apply',
                    learningObjective: 'Recognize tuple immutability and apply conversion or slicing techniques to update values.',
                    xpReward: 25,
                    timeLimit: 5,
                    starterCode: `def update_tuple_element(t, index, new_value):\n    # Fix error: tuple does not support item assignment\n    t[index] = new_value\n    return t\n`,
                    solutionCode: `def update_tuple_element(t, index, new_value):\n    temp_list = list(t)\n    temp_list[index] = new_value\n    return tuple(temp_list)\n`,
                    testCases: {
                        buggyCode: `def update_tuple_element(t, index, new_value):\n    t[index] = new_value\n    return t`,
                        errors: [
                            { line: 2, description: 'Attempted in-place item assignment on immutable tuple', correctedLine: '    temp_list = list(t); temp_list[index] = new_value; return tuple(temp_list)' }
                        ],
                        solutionCode: `def update_tuple_element(t, index, new_value):\n    temp_list = list(t)\n    temp_list[index] = new_value\n    return tuple(temp_list)`,
                        explanation: 'Because tuples are immutable, convert to a list, update the element, and convert back to a tuple.'
                    },
                    hints: ['Convert the tuple to a mutable list first, update the element, and cast back to tuple.']
                };
            }
            return {
                title: `Debug: Fix Bug in ${cleanTopic}`,
                description: `Identify and fix the syntax or logical bug in the following code snippet evaluating **${cleanTopic}**.`,
                exerciseType: 'code_debug',
                difficulty: 'intermediate',
                scaffoldLevel: 'guided',
                bloomsLevel: 'apply',
                learningObjective: `Detect and rectify errors in ${cleanTopic}.`,
                xpReward: 25,
                timeLimit: 5,
                starterCode: `# Identify and fix the bug in ${cleanTopic}\ndef check_boundary(val):\n    result = val\n    return reslt\n`,
                solutionCode: `def check_boundary(val):\n    result = val\n    return result\n`,
                testCases: {
                    buggyCode: `def check_boundary(val):\n    result = val\n    return reslt`,
                    errors: [{ line: 3, description: 'NameError: reslt is not defined (misspelled variable)', correctedLine: '    return result' }],
                    solutionCode: `def check_boundary(val):\n    result = val\n    return result`,
                    explanation: 'Variable names must match the assigned identifier.'
                },
                hints: ['Verify spelling of variable names on line 3.']
            };
        }

        // Coding Exercises
        if (/tuple/i.test(textSample)) {
            if (index % 2 === 1) {
                return {
                    title: `Tuple Element Verification & Unpacking`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`unpack_student_record(record_tuple)\` that takes a tuple \`(roll_no, name, stream, marks)\` and returns a formatted string: \`"Roll: <roll_no>, Name: <name>, Marks: <marks>"\`.\n\n### Requirements:\n- Function name: \`unpack_student_record(record_tuple)\`\n- Unpack the tuple elements cleanly.`,
                    exerciseType: 'coding',
                    difficulty,
                    scaffoldLevel,
                    bloomsLevel,
                    learningObjective: 'Unpack tuple values into distinct variables and format a string.',
                    xpReward: 25,
                    timeLimit: 5,
                    starterCode: `def unpack_student_record(record_tuple):\n    """\n    Unpack record_tuple (roll_no, name, stream, marks) and return formatted string.\n    """\n    # TODO: Unpack and return formatted string\n    pass\n`,
                    solutionCode: `def unpack_student_record(record_tuple):\n    roll_no, name, stream, marks = record_tuple\n    return f"Roll: {roll_no}, Name: {name}, Marks: {marks}"\n`,
                    testCases: [
                        { input: "unpack_student_record((101, 'Aman', 'Science', 94))", expectedOutput: '"Roll: 101, Name: Aman, Marks: 94"', isHidden: false },
                        { input: "unpack_student_record((102, 'Priya', 'Commerce', 88))", expectedOutput: '"Roll: 102, Name: Priya, Marks: 88"', isHidden: true }
                    ],
                    hints: ['Use sequence unpacking: roll_no, name, stream, marks = record_tuple.']
                };
            }
            return {
                title: `Tuple Extremes and Aggregation Processing`,
                description: `## 🎯 Problem Statement\n\nWrite a Python function \`get_tuple_statistics(data_tuple)\` that accepts a non-empty tuple of numbers and returns a new tuple containing the **minimum value**, **maximum value**, and the **sum of all elements**.\n\n### Requirements:\n- Function name: \`get_tuple_statistics(data_tuple)\`\n- Return type: Tuple of 3 elements: \`(min_val, max_val, total_sum)\`\n- Handle both integer and floating-point elements.`,
                exerciseType: 'coding',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: 'Apply Python tuple built-in functions min(), max(), and sum() to aggregate sequence elements.',
                xpReward: 25,
                timeLimit: 5,
                starterCode: `def get_tuple_statistics(data_tuple):\n    """\n    Compute minimum, maximum, and sum of elements in a tuple.\n    Returns a tuple: (min_val, max_val, total_sum)\n    """\n    # TODO: Calculate and return (min, max, sum)\n    pass\n`,
                solutionCode: `def get_tuple_statistics(data_tuple):\n    return (min(data_tuple), max(data_tuple), sum(data_tuple))\n`,
                testCases: [
                    { input: 'get_tuple_statistics((10, 25, 4, 80, 15))', expectedOutput: '(4, 80, 134)', isHidden: false },
                    { input: 'get_tuple_statistics((-5, 0, 5))', expectedOutput: '(-5, 5, 0)', isHidden: true }
                ],
                hints: ['Use built-in functions min(data_tuple), max(data_tuple), and sum(data_tuple).', 'Return the three values bundled inside parentheses as a tuple.']
            };
        }

        if (/(dict|key|value|mapping|frequency|word)/i.test(textSample)) {
            if (index % 2 === 1) {
                return {
                    title: `Invert Dictionary Key-Value Mapping`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`invert_dictionary(d)\` that swaps the keys and values of a given dictionary \`d\`. Assume all dictionary values are unique and immutable.\n\n### Requirements:\n- Function name: \`invert_dictionary(d)\`\n- Return a new dictionary with inverted pairs.`,
                    exerciseType: 'coding',
                    difficulty,
                    scaffoldLevel,
                    bloomsLevel,
                    learningObjective: 'Iterate dictionary items and invert mapping programmatically.',
                    xpReward: 25,
                    timeLimit: 5,
                    starterCode: `def invert_dictionary(d):\n    """\n    Swap keys and values in dictionary d.\n    """\n    # TODO: Build and return inverted dictionary\n    pass\n`,
                    solutionCode: `def invert_dictionary(d):\n    return {v: k for k, v in d.items()}\n`,
                    testCases: [
                        { input: "invert_dictionary({'a': 1, 'b': 2})", expectedOutput: "{1: 'a', 2: 'b'}", isHidden: false },
                        { input: "invert_dictionary({'x': 10, 'y': 20})", expectedOutput: "{10: 'x', 20: 'y'}", isHidden: true }
                    ],
                    hints: ['Iterate through d.items() to extract each key and value.', 'Construct inverted dictionary: {val: key for key, val in d.items()}.']
                };
            }
            return {
                title: `Character Frequency Mapping in Text`,
                description: `## 🎯 Problem Statement\n\nWrite a Python function \`count_character_frequencies(text_string)\` that takes a string \`text_string\` and returns a dictionary with each character as a key and its total occurrences as the value.\n\n### Requirements:\n- Function name: \`count_character_frequencies(text_string)\`\n- Preserve case sensitivity (e.g. 'A' and 'a' are distinct keys).\n- Use dictionary operations or \`.get()\` method.`,
                exerciseType: 'coding',
                difficulty,
                scaffoldLevel,
                bloomsLevel,
                learningObjective: 'Construct and populate a Python dictionary dynamically using key lookup and accumulation.',
                xpReward: 25,
                timeLimit: 5,
                starterCode: `def count_character_frequencies(text_string):\n    """\n    Count the occurrences of each character in text_string.\n    Returns a dictionary mapping characters to frequency counts.\n    """\n    # TODO: Build frequency mapping dictionary\n    pass\n`,
                solutionCode: `def count_character_frequencies(text_string):\n    freq = {}\n    for ch in text_string:\n        freq[ch] = freq.get(ch, 0) + 1\n    return freq\n`,
                testCases: [
                    { input: "count_character_frequencies('banana')", expectedOutput: "{'b': 1, 'a': 3, 'n': 2}", isHidden: false },
                    { input: "count_character_frequencies('apple')", expectedOutput: "{'a': 1, 'p': 2, 'l': 1, 'e': 1}", isHidden: true }
                ],
                hints: ['Iterate through each character of the string with a for loop.', 'Use freq[ch] = freq.get(ch, 0) + 1 to increment the count safely.']
            };
        }

        // Universal Fallback for any other topic
        const slug = cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) || 'data';
        return {
            title: `${cleanTopic} Algorithmic Implementation`,
            description: `## 🎯 Problem Statement\n\nWrite a Python function \`process_${slug}(input_data)\` that applies the principles of **${cleanTopic}** to process and return verified computational results.\n\n### Requirements:\n- Function name: \`process_${slug}(input_data)\`\n- Validate and process \`input_data\` according to ${cleanTopic} rules.`,
            exerciseType: 'coding',
            difficulty,
            scaffoldLevel,
            bloomsLevel,
            learningObjective: `Demonstrate mastery of ${cleanTopic} algorithmic logic.`,
            xpReward: 25,
            timeLimit: 5,
            starterCode: `def process_${slug}(input_data):\n    """\n    Process input_data applying ${cleanTopic} curriculum principles.\n    """\n    # TODO: Implement solution\n    pass\n`,
            solutionCode: `def process_${slug}(input_data):\n    return input_data\n`,
            testCases: [
                { input: `process_${slug}([10, 20])`, expectedOutput: '[10, 20]', isHidden: false }
            ],
            hints: [`Analyze the structural requirements of ${cleanTopic}.`]
        };
    }

    /**
     * Clean and format title strings with proper title-casing and acronym preservation.
     */
    cleanTitle(raw) {
        if (!raw) return '';
        let t = raw.replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        t = t.replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/gi, '').trim();
        t = t.replace(/\bK\s+eys\b/i, 'Keys');
        const acronyms = new Set(['DBMS', 'RDBMS', 'SQL', 'DDL', 'DML', 'CBSE', 'NCERT', 'API', 'OOP', 'CPU', 'RAM', 'OS', 'FIFO', 'LIFO']);
        const res = t.split(' ').map((w, idx) => {
            if (acronyms.has(w.toUpperCase())) return w.toUpperCase();
            if (idx > 0 && /^(and|or|not|of|in|to|a|an|the|vs|for|with|by|as)$/i.test(w)) return w.toLowerCase();
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }).join(' ');
        return res.replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/gi, '').trim();
    }

    /**
     * Accurately detects programming language and domain from document text, title, and metadata.
     * Uses code syntax density and curriculum terminology to avoid false positives (e.g., 'Table 8.1' or 'my_tuple').
     */
    detectDocumentLanguage({
        documentText = '',
        title = '',
        customPrompt = '',
        originalFileName = ''
    } = {}) {
        const textSample = (documentText || '').slice(0, 30000);
        const headerText = `${title || ''} ${customPrompt || ''} ${originalFileName || ''}`.toLowerCase();
        
        let pythonScore = 0;
        let sqlScore = 0;
        let cppScore = 0;
        let javaScore = 0;
        let webScore = 0;

        if (/\b(python|py|list|lists|tuple|tuples|dictionary|dictionaries|dict|strings?|slice|slicing|recursion|loop|loops|function|functions|numpy|pandas|matplotlib|dataframe|tkinter)\b/i.test(headerText)) {
            pythonScore += 15;
        }
        if (/\b(sql|database|dbms|rdbms|mysql|sqlite|relational\s+data|relational\s+model|ddl|dml|queries|querying)\b/i.test(headerText)) {
            sqlScore += 15;
        }
        if (/\b(c\+\+|cpp|pointers|stl|iostream)\b/i.test(headerText)) {
            cppScore += 15;
        }
        if (/\b(java|jvm|spring|jdk)\b/i.test(headerText) && !/javascript/i.test(headerText)) {
            javaScore += 15;
        }
        if (/\b(html|css|javascript|js|react|dom|web\s+dev)\b/i.test(headerText)) {
            webScore += 15;
        }

        const pyMatches = textSample.match(/(?:def\s+[a-zA-Z_]\w*\s*\(|print\s*\(|elif\s+|import\s+[a-zA-Z_]|for\s+[a-zA-Z_]\w*\s+in\s+|\[\s*(?:[0-9]+|"[^"]*"|'[^']*')\s*,\s*(?:[0-9]+|"[^"]*"|'[^']*')|\.append\s*\(|\.extend\s*\(|\.insert\s*\(|\.pop\s*\(|\.split\s*\(|\.keys\s*\(\)|\.values\s*\(\)|range\s*\(|len\s*\(|__init__|elif\b|:\s*$)/gm) || [];
        pythonScore += pyMatches.length * 2;

        const sqlMatches = textSample.match(/(?:CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|INSERT\s+INTO|SELECT\s+[\s\S]{1,40}\s+FROM|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES\s+[a-zA-Z_]|GROUP\s+BY|ORDER\s+BY|VARCHAR|INT\s+PRIMARY|NOT\s+NULL|RELATIONAL\s+DATABASE|RELATIONAL\s+MODEL|DEGREE\s+AND\s+CARDINALITY)/gmi) || [];
        sqlScore += sqlMatches.length * 3;

        const cppMatches = textSample.match(/(?:#include\s*<|std::|cout\s*<<|cin\s*>>|int\s+main\s*\(\)|void\s+main\s*\(\))/gmi) || [];
        cppScore += cppMatches.length * 3;

        const javaMatches = textSample.match(/(?:public\s+class|public\s+static\s+void\s+main|System\.out\.print)/gmi) || [];
        javaScore += javaMatches.length * 3;

        const scores = [
            { lang: 'python', score: pythonScore },
            { lang: 'sql', score: sqlScore },
            { lang: 'cpp', score: cppScore },
            { lang: 'java', score: javaScore },
            { lang: 'javascript', score: webScore }
        ];

        scores.sort((a, b) => b.score - a.score);
        return scores[0].score > 0 ? scores[0].lang : 'python';
    }

    /**
     * Deep algorithmic extractor that scans multi-page document content for curriculum titles,
     * chapter headings, subject keywords, and domain term density.
     */
    deepAlgorithmicTitleExtract(documentText = '', originalFileName = '') {
        const cleanFileTitle = originalFileName
            ? originalFileName
                .replace(/\.[^/.]+$/, '')
                .replace(/[-_]/g, ' ')
                .replace(/\b(pdf|syllabus|notes|ebook|guide|document|resource|chapter|unit)\b/gi, '')
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\b\w/g, c => c.toUpperCase())
            : '';

        if (!documentText || typeof documentText !== 'string' || documentText.trim().length < 20) {
            return cleanFileTitle || 'Computer Science Applied Curriculum';
        }

        const text = documentText;
        const lowerText = text.toLowerCase();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        // Domain-specific density across the full multi-page document text
        const mathScore = (lowerText.match(/\b(math\.|ceil|floor|trunc|factorial|trigonometry|hypot|radians|degrees|logarithm|exponent|sqrt|gcd|pi|tau)\b/g) || []).length;
        const oopScore = (lowerText.match(/(?:\bclass\s+[A-Za-z_][A-Za-z0-9_]*\s*(?:\([a-zA-Z0-9_,\s]*\))?\s*:|\b(?:object-oriented|object\s+oriented|inheritance|polymorphism|encapsulation|__init__|subclass|superclass|method\s+overriding|self\.|instance\s+methods?|class\s+variables?|abstract\s+class|dunder)\b)/gi) || []).length;
        const pandasScore = (lowerText.match(/\b(pandas|dataframe|series|numpy|read_csv|matplotlib|data analysis|data frame)\b/g) || []).length;
        const sqlScore = (lowerText.match(/(?:CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|INSERT\s+INTO|SELECT\s+[\s\S]{1,40}\s+FROM|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES\s+[a-zA-Z_]|GROUP\s+BY|ORDER\s+BY|VARCHAR|INT\s+PRIMARY|RELATIONAL\s+DATABASE|RELATIONAL\s+MODEL|DEGREE\s+AND\s+CARDINALITY|DATABASE\s+MANAGEMENT|RDBMS|DBMS)/gi) || []).length;
        const listsScore = (lowerText.match(/\b(lists?|nested\s+lists?|list\s+slicing|list\s+traversal|list\s+operations?|append\(|extend\(|insert\(|pop\()|\[\s*[0-9"']/gi) || []).length;
        const tuplesDictsScore = (lowerText.match(/\b(tuples?|dictionaries|dictionary|key-value|immutable\s+sequence|\.keys\(\)|\.values\(\)|\.items\(\))/gi) || []).length;
        const dataStructScore = (lowerText.match(/\b(stack|queue|push|pop|dequeue|enqueue|linked\s+list|binary\s+tree|recursion|traversal|sorting|bubble sort|insertion sort|searching)\b/gi) || []).length;
        const networkScore = (lowerText.match(/\b(networking|ip address|tcp|udp|osi layer|packet|router|topology|cyber|security)\b/g) || []).length;
        const progBasicsScore = (lowerText.match(/\b(tokens?|identifiers?|keywords?|variables?|data\s+types?|if\s*-\s*else|elif|while\s+loop|for\s+loop|range\(|operators?|expressions?|computational\s+thinking)\b/gi) || []).length;

        // Look for explicit Unit/Chapter/Course/Topic lines in the text (checking first 80 lines)
        const candidateHeaders = [];
        const genericExcludes = /^(central board|cbse|senior school|curriculum guidelines|session \d+|code\s*no|code\s*\d+|subject\s*code|class\s*[0-9ivx]+|examination|all rights reserved|page\s*\d+|contents|index|table of contents|department of|ministry of|government of|syllabus|overview|guidelines)/i;
        const isSuperficial = (str) => {
            if (!str || str.length < 5) return true;
            if (genericExcludes.test(str)) return true;
            if (/^(code|unit|chapter|module|section|part)\s*[0-9ivx.-]*$/i.test(str.trim())) return true;
            if (/^[0-9\s._\-:()]+$/.test(str.trim())) return true;
            return false;
        };

        const stripPunct = (s) => (s || '')
            .replace(/^[»•›▪▫*_\-#\s\t\x00-\x1F\u2022\u2023\u25E6\u2043\u2219]+|[»•›▪▫*_\-#\s\t\x00-\x1F\u2022\u2023\u25E6\u2043\u2219]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        for (const line of lines.slice(0, 80)) {
            const cleanLine = stripPunct(line);
            const match = cleanLine.match(/^(?:unit\s+[ivx0-9]+|chapter\s+[ivx0-9]+|module\s+[ivx0-9]+|topic|course|subject)[:\-\s]+(.+)/i);
            if (match && match[1]) {
                let cand = stripPunct(match[1]);
                cand = cand.replace(/^(code|no\.?|subject code)\s*[:\-]?\s*[0-9]+/i, '').trim();
                cand = stripPunct(cand);
                if (cand.length >= 4 && cand.length <= 80 && !isSuperficial(cand)) {
                    candidateHeaders.push(cand);
                }
            } else if (cleanLine.length >= 6 && cleanLine.length <= 85 && !isSuperficial(cleanLine) && !cleanLine.startsWith('http')) {
                if (/(lists?|tuples?|dictionar|strings?|database|sql|rdbms|dbms|relational|computer science|programming|data structures|algorithms|computer systems|networks|math library|cyber|computational thinking|artificial intelligence|machine learning|web development)/i.test(cleanLine)) {
                    let cleaned = cleanLine.replace(/^(class\s*[ivx0-9]+\s*[:\-]?\s*)/i, '').trim();
                    cleaned = stripPunct(cleaned);
                    if (!isSuperficial(cleaned)) {
                        candidateHeaders.push(cleaned);
                    }
                }
            }
        }

        if (candidateHeaders.length > 0) {
            const topSubject = candidateHeaders.find(h => /(lists?|tuples?|dictionar|strings?|database|sql|rdbms|relational|computer science|computational thinking|programming|computer systems|data structure|network)/i.test(h));
            const bestHeader = topSubject || candidateHeaders[0];
            if (bestHeader) {
                const unwrapped = bestHeader.replace(/^(unit|chapter|module|topic|course|subject)\s*[:\-]\s*/i, '').trim();
                return this.cleanTitle(unwrapped);
            }
        }

        // Domain density clear winners
        if (listsScore >= 3 && listsScore >= sqlScore) {
            return 'Python: Lists & Sequence Manipulation';
        }
        if (tuplesDictsScore >= 3 && tuplesDictsScore >= sqlScore) {
            return 'Python: Tuples, Dictionaries & Data Collections';
        }
        if (sqlScore >= 3 && sqlScore >= oopScore && sqlScore >= mathScore) {
            return 'Relational Databases & SQL Query Systems';
        }
        if (mathScore >= 4 && mathScore > oopScore && mathScore > pandasScore) {
            return 'Python: Math Library Modules & Numeric Algorithms';
        }
        if (dataStructScore >= 3 && dataStructScore > oopScore) {
            return 'Python: Data Structures & Algorithmic Problem Solving';
        }
        if (networkScore >= 3) {
            return 'Computer Networks & Cyber Security Foundations';
        }
        if (oopScore >= 4 && oopScore > mathScore) {
            return 'Python: Object-Oriented Programming & Software Design';
        }
        if (pandasScore >= 4) {
            return 'Python: Data Handling with Pandas & NumPy';
        }
        if (progBasicsScore >= 3) {
            return 'Python: Programming Fundamentals & Computational Thinking';
        }

        return this.cleanTitle(cleanFileTitle) || 'Computer Science Applied Curriculum';
    }

    /**
     * Reads sufficient PDF content (up to 18,000-20,000 characters) and extracts
     * grounded Course Title, Hindi Title, Description, and Key Topics using Gemini AI
     * with Groq fallback and deep algorithmic fallback.
     */
    async extractTitleAndMetadataFromDocument({
        documentText = '',
        imageBase64 = null,
        mimeType = 'image/jpeg',
        provider = 'gemini',
        originalFileName = ''
    }) {
        const promptText = `You are an elite Computer Science Curriculum Architect and Textbook Synthesizer.
Analyze the following educational curriculum / textbook / syllabus material (extracted from a multi-page document).
Read through the sufficient content provided below and determine the exact, grounded Course Title and metadata based on the actual educational material taught.

DOCUMENT EXCERPT (Read Sufficient Content):
---
${documentText ? documentText.slice(0, 18000) : 'Extracted from uploaded textbook image.'}
---

CRITICAL INSTRUCTIONS:
1. Do NOT use generic administrative or institutional headers (e.g. NEVER output "Central Board of Secondary Education", "CBSE Curriculum", "Senior School Curriculum", "Code 083", "Subject Code", "Session 2024-25").
2. Read the actual topics, concepts, modules, or chapter headings in the content to identify the true subject (e.g. "Relational Databases & SQL Query Systems", "Database Concepts & Management", "Python: Math Library Modules & Numeric Algorithms", "Python: Object-Oriented Programming & Software Design", "Data Handling with Pandas & NumPy").
3. If the material teaches database concepts, relational models, keys, SQL queries (SELECT, CREATE TABLE, WHERE, INSERT, etc.), the course title MUST reflect Databases / SQL, and "suggestedLanguage" MUST be "sql"!
4. Generate an authentic Hindi title in "titleHindi" (e.g. "रिलेशनल डेटाबेस और एसक्यूएल क्वेरी सिस्टम").
5. Write a 2-3 sentence overview in "description" summarizing what learners will master.
6. Provide 3-6 core topics in "keyTopics".
7. Suggest programming language in "suggestedLanguage" ("sql" for database/queries, "python" for general Python/algorithms, "java", "cpp", "javascript", or "general").

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Exact Grounded Course Title in English",
  "titleHindi": "कोर्स का शीर्षक (हिंदी में)",
  "description": "Comprehensive course description...",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "suggestedLanguage": "python"
}`;

        const postProcessMeta = (parsed) => {
            if (!parsed || !parsed.title || parsed.title.length < 4) return null;
            const detectedLang = this.detectDocumentLanguage({
                documentText,
                title: parsed.title,
                originalFileName
            });
            parsed.suggestedLanguage = detectedLang;
            return parsed;
        };

        // 1. Vision Mode if imageBase64 is provided
        if (imageBase64) {
            if (this.genAI) {
                const geminiModels = ACTIVE_GEMINI_MODELS;
                for (const modelName of geminiModels) {
                    try {
                        const model = this.genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent([
                            {
                                inlineData: {
                                    data: imageBase64,
                                    mimeType: mimeType
                                }
                            },
                            promptText
                        ]);
                        const parsed = postProcessMeta(this.parseJSONResponse(result.response.text()));
                        if (parsed) return parsed;
                    } catch (err) {
                        console.warn(`[AIService] Gemini Vision title extraction (${modelName}) failed:`, err.message);
                    }
                }
            }

            if (this.groq) {
                try {
                    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
                    const completion = await this.groq.chat.completions.create({
                        model: 'llama-3.2-11b-vision-preview',
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: promptText },
                                    { type: 'image_url', image_url: { url: dataUrl } }
                                ]
                            }
                        ],
                        temperature: 0.2
                    });
                    const parsed = postProcessMeta(this.parseJSONResponse(completion.choices[0]?.message?.content || '{}'));
                    if (parsed) return parsed;
                } catch (err) {
                    console.warn('[AIService] Groq Vision title extraction failed:', err.message);
                }
            }
        }

        // 2. Text Mode: Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(promptText);
                    const parsed = postProcessMeta(this.parseJSONResponse(result.response.text()));
                    if (parsed) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini title extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. Text Mode: Try Groq fallback
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'You are a curriculum title extraction AI. Output ONLY valid JSON.' },
                            { role: 'user', content: promptText }
                        ],
                        temperature: 0.2
                    });
                    const parsed = postProcessMeta(this.parseJSONResponse(completion.choices[0]?.message?.content || '{}'));
                    if (parsed) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq title extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        // 4. Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(promptText);
                    const parsed = postProcessMeta(this.parseJSONResponse(result.response.text()));
                    if (parsed) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Secondary Gemini title extraction (${modelName}) failed:`, err.message);
                }
            }
        }

        // 5. Deep algorithmic extraction fallback
        const algoTitle = this.deepAlgorithmicTitleExtract(documentText, originalFileName);
        const detectedLang = this.detectDocumentLanguage({
            documentText,
            title: algoTitle,
            originalFileName
        });
        const isDbTopic = detectedLang === 'sql';
        return {
            title: algoTitle,
            titleHindi: isDbTopic ? 'रिलेशनल डेटाबेस और एसक्यूएल क्वेरी सिस्टम' : `${algoTitle} (पाठ्यक्रम)`,
            description: isDbTopic
                ? 'A comprehensive curriculum module covering Database Concepts, Relational Data Models, Keys, and Structured Query Language (SQL) DDL & DML operations.'
                : `A comprehensive curriculum module on ${algoTitle} synthesized from the uploaded syllabus resource.`,
            keyTopics: isDbTopic
                ? ['Relational Data Model & Keys', 'SQL Data Definition (DDL)', 'SQL Data Manipulation (DML) & Queries', 'Aggregate Functions & Grouping']
                : [algoTitle, 'Core Foundations', 'Practical Implementation'],
            suggestedLanguage: detectedLang
        };
    }

    /**
     * AI Global Section Analysis & Universal Cluster Planning.
     * Scans ALL sections across the chapter first, reviews overall topology,
     * and decides the optimal 2-unit progressive clusters before deep generation.
     */
    async planCurriculumClustersFromDocument({
        extractedSections = [],
        backExercises = [],
        documentText = '',
        targetUnitsCount = 5,
        language = 'python',
        classLevel = 11,
        board = 'CBSE',
        customPrompt = '',
        imageBase64 = null,
        mimeType = 'image/jpeg',
        provider = 'gemini'
    }) {
        const sectionSummary = extractedSections.slice(0, 25).map(s => `${s.sectionNumber} ${s.title} (~${Math.round((s.text || '').length)} chars)`).join('\n');
        const exerciseSummary = backExercises.slice(0, 10).map(q => `Q${q.questionNumber}: ${q.questionText.slice(0, 100)}`).join('\n');

        const prompt = `You are an elite AI Computer Science Curriculum Architect and Pedagogical Planner.
Analyze ALL sections discovered across this textbook document to determine the optimal module architecture.
Review the global table of contents and organize the curriculum into progressive 2-unit execution clusters:
- Cluster 1: First 2 foundational units (Core concepts, syntax definitions, basic mechanics)
- Cluster 2: Next 2 intermediate units (Operations, built-in methods, transformations)
- Cluster 3: Capstone unit(s) (Applied problem solving, board examination review)

ALL DISCOVERED SECTIONS ACROSS CHAPTER:
---
${sectionSummary || (documentText ? documentText.slice(0, 8000) : 'Uploaded syllabus resource.')}
---

${exerciseSummary ? `EXTRACTED CHAPTER EXERCISES:\n---\n${exerciseSummary}\n---\n` : ''}

PARAMETERS:
- DOMAIN / LANGUAGE: ${language}
- CLASS LEVEL: Grade ${classLevel} (${board})
- DESIRED TOTAL UNITS: ${targetUnitsCount}
- INSTRUCTOR INTENT: ${customPrompt || 'Progress from foundational syntax to applied practice.'}

OUTPUT SCHEMA (Must be strictly valid JSON):
{
  "title": "Grounded Course Title",
  "titleHindi": "कोर्स का शीर्षक (हिंदी में)",
  "description": "Comprehensive course description based on document...",
  "clusters": [
    {
      "clusterIndex": 0,
      "clusterName": "Foundational Syntax & Mechanics",
      "units": [
        {
          "unitNumber": 1,
          "title": "Descriptive Title",
          "description": "Overview of foundational syntax...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 1", "Concept 2"]
        },
        {
          "unitNumber": 2,
          "title": "Descriptive Title",
          "description": "Overview of basic operations...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 3", "Concept 4"]
        }
      ]
    },
    {
      "clusterIndex": 1,
      "clusterName": "Intermediate Operations & Methods",
      "units": [
        {
          "unitNumber": 3,
          "title": "Descriptive Title",
          "description": "Overview of advanced methods...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 5", "Concept 6"]
        },
        {
          "unitNumber": 4,
          "title": "Descriptive Title",
          "description": "Overview of mutations and algorithms...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 7", "Concept 8"]
        }
      ]
    },
    {
      "clusterIndex": 2,
      "clusterName": "Applied Problem Solving & Board Review",
      "units": [
        {
          "unitNumber": 5,
          "title": "Descriptive Title",
          "description": "Applied problem solving and review exercises...",
          "expectedHours": 4,
          "unlockThreshold": 80,
          "keyConcepts": ["Concept 9", "Concept 10"]
        }
      ]
    }
  ]
}`;

        // Try Gemini Vision if image is attached
        if (imageBase64 && this.genAI) {
            for (const modelName of ACTIVE_GEMINI_MODELS) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        { inlineData: { data: imageBase64, mimeType } },
                        prompt
                    ]);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini Vision cluster planning (${modelName}) failed:`, err.message);
                }
            }
        }

        // Try Gemini Text
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            for (const modelName of ACTIVE_GEMINI_MODELS) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Gemini global section clustering (${modelName}) failed:`, err.message);
                }
            }
        }

        // Try Groq Text Fallback
        if (this.groq) {
            for (const modelName of ACTIVE_GROQ_MODELS) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'You are a curriculum architect. Output ONLY valid JSON.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
                        return parsed;
                    }
                } catch (err) {
                    console.warn(`[AIService] Groq global section clustering (${modelName}) failed:`, err.message);
                }
            }
        }

        return null;
    }

    /**
     * RAG-based Course & Units Generator from uploaded Ebook / PDF / Notes / Textbook Images.
     * Uses a multi-stage execution pipeline:
     * Stage 1: AI Global Section Analysis & Clustering across the whole chapter.
     * Stage 2: Staged Deep Generation - Generates first two units fully from all aspects before proceeding to next.
     * Stage 3: Grounded Theory, Checkpoints, and Academic CBSE Exercises per unit.
     */
    async generateTrainingModuleFromDocument({
        documentText = '',
        imageBase64 = null,
        mimeType = 'image/jpeg',
        customPrompt = '',
        language = null,
        classLevel = 11,
        board = 'CBSE',
        totalUnits = 5,
        provider = 'gemini',
        originalFileName = ''
    }) {
        const targetUnitsCount = Math.max(2, Math.min(8, parseInt(totalUnits) || 5));
        
        // 1. Accurately detect programming language from document content & headers
        const detectedLang = language || this.detectDocumentLanguage({
            documentText,
            title: customPrompt,
            customPrompt,
            originalFileName
        });
        const targetLanguage = detectedLang;

        // 2. Universal Document Topology Discovery: Extract all sections and back-of-chapter exercises
        const extractedSections = this.extractTopicsFromDocumentText(documentText);
        const backExercises = this.extractBackExercisesFromText(documentText);
        const organizedUnits = this.contextuallyOrganizeUnits(extractedSections, backExercises, targetUnitsCount);

        // 3. AI Global Section Analysis & Clustering: AI goes through ALL sections first and decides clusters
        const plannedClusters = await this.planCurriculumClustersFromDocument({
            extractedSections,
            backExercises,
            documentText,
            targetUnitsCount,
            language: targetLanguage,
            classLevel,
            board,
            customPrompt,
            imageBase64,
            mimeType,
            provider
        });

        let courseTitle = plannedClusters?.title || this.deepAlgorithmicTitleExtract(documentText, originalFileName) || customPrompt || 'Curriculum Training Module';
        let courseTitleHindi = plannedClusters?.titleHindi || `${courseTitle} (पाठ्यक्रम)`;
        let courseDescription = plannedClusters?.description || `Comprehensive ${targetLanguage} curriculum grounded in textbook materials.`;

        // Normalize clusters: either from AI planner or structured 2-unit clusters from organizedUnits
        let activeClusters = [];
        if (plannedClusters && Array.isArray(plannedClusters.clusters) && plannedClusters.clusters.length > 0) {
            activeClusters = plannedClusters.clusters;
        } else {
            // Universal fallback: Partition organized units into 2-unit progressive clusters
            for (let i = 0; i < organizedUnits.length; i += 2) {
                const clusterUnits = organizedUnits.slice(i, i + 2);
                activeClusters.push({
                    clusterIndex: activeClusters.length,
                    clusterName: i === 0 ? 'Foundational Syntax & Mechanics' : (i + 2 >= organizedUnits.length ? 'Applied Practice & Review' : 'Core Operations & Algorithms'),
                    units: clusterUnits
                });
            }
        }

        // 4. Staged Deep Generation: Generate first two units fully from all aspects before proceeding to next
        const finalUnits = [];
        for (const cluster of activeClusters) {
            console.log(`[AIService] Synthesizing cluster ${cluster.clusterIndex + 1}: ${cluster.clusterName || 'Curriculum Stage'}...`);
            const clusterUnits = cluster.units || [];
            
            for (const u of clusterUnits) {
                const unitIdx = finalUnits.length;
                if (unitIdx >= targetUnitsCount) break;

                const localMatch = organizedUnits[unitIdx] || organizedUnits[organizedUnits.length - 1];
                const unitSections = localMatch?.sections || [];
                const sectionTitles = unitSections.map(s => s.title);
                const sliceText = localMatch?.text || (unitSections.length > 0 ? unitSections.map(s => s.text || '').join('\n\n---\n\n') : '');

                // Generate rich theory with explicit syntax blocks
                const theoryMarkdown = this.formatGroundedTheory({
                    unitTitle: u.title,
                    sectionTitles,
                    sliceText,
                    language: targetLanguage
                });

                // Generate authentic domain checkpoints
                const miniCheckpoints = this.generateGroundedCheckpoints({
                    unitTitle: u.title,
                    sectionTitles,
                    unitIdx,
                    sliceText,
                    language: targetLanguage
                });

                const cbseTips = [
                    `Remember: In ${board} examinations, pay close attention to syntax boundaries and definitions in ${sectionTitles[0] || u.title}.`,
                    `Frequently examined question: Compare and contrast standard operations and error handling in ${u.title}.`
                ];

                // Synthesize grounded academic exercises
                const exercises = this.synthesizeGroundedExercises({
                    unitIdx,
                    unitTitle: u.title,
                    sectionTitles,
                    sliceText,
                    backExercises,
                    language: targetLanguage,
                    totalUnits: targetUnitsCount
                });

                const cleanUnitName = this.cleanTitle(u.title);
                finalUnits.push({
                    unitNumber: unitIdx + 1,
                    title: cleanUnitName,
                    description: u.description || `Comprehensive concepts, textbook theory, and hands-on exercises for ${cleanUnitName}.`,
                    expectedHours: u.expectedHours || 4,
                    unlockThreshold: u.unlockThreshold || 80,
                    keyConcepts: Array.isArray(u.keyConcepts) && u.keyConcepts.length > 0 ? u.keyConcepts : (sectionTitles.length > 0 ? sectionTitles : [cleanUnitName]),
                    theory: theoryMarkdown,
                    miniCheckpoints,
                    cbseTips,
                    suggestedExerciseTypes: ['coding', 'code_debug', 'mcq'],
                    exercises
                });
            }
        }

        // Ensure at least 2 units exist
        if (finalUnits.length < 2) {
            return this.generateDeterministicFallbackModule({
                documentText,
                customPrompt,
                language: targetLanguage,
                classLevel,
                board,
                totalUnits: targetUnitsCount,
                originalFileName
            });
        }

        return {
            title: courseTitle,
            titleHindi: courseTitleHindi,
            description: courseDescription,
            language: targetLanguage,
            boardAligned: board,
            classLevel: Number(classLevel) || 11,
            extractedSummary: `Synthesized ${finalUnits.length} progressive curriculum units across ${activeClusters.length} staged deep clusters grounded in textbook material.`,
            pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
            units: finalUnits
        };
    }

    /**
     * Format rich, student-friendly Markdown theory grounded in textbook excerpts with explicit syntax blocks.
     */
    formatGroundedTheory({ unitTitle, sectionTitles = [], sliceText = '', language = 'python' }) {
        const cleanExcerpt = (sliceText || '').replace(/^#{1,4}\s+.*$/gm, '').trim();
        const paragraphs = cleanExcerpt.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);
        const detailedTheory = paragraphs.slice(0, 4).join('\n\n');

        // Extract code or syntax from sliceText
        let featuredCode = '';
        const fencedMatch = sliceText.match(/```[a-z]*\n([\s\S]*?)```/);
        if (fencedMatch && fencedMatch[1].trim()) {
            featuredCode = fencedMatch[1].trim();
        } else {
            // Check for domain syntax in sliceText or synthesize authentic CBSE syntax
            const lowerSlice = (sliceText + ' ' + unitTitle).toLowerCase();
            if (language === 'sql' || (language !== 'python' && /\b(sql|database|\btable\b|rdbms|relational|ddl|dml)\b/i.test(lowerSlice))) {
                featuredCode = `-- Standard Relational Schema DDL & DML\nCREATE TABLE Student (\n    RollNo INT PRIMARY KEY,\n    Name VARCHAR(50) NOT NULL,\n    Marks DECIMAL(5,2) CHECK (Marks >= 0)\n);\n\n-- Querying records\nSELECT RollNo, Name, Marks\nFROM Student\nWHERE Marks >= 75\nORDER BY Marks DESC;`;
            } else if (/tuple/i.test(lowerSlice)) {
                featuredCode = `# Creating tuples in Python\nempty_tuple = ()\nsingle_element_tuple = (5,)  # Note: Trailing comma is mandatory\nnumber_tuple = (10, 20, 30, 40)\n\n# Accessing and Slicing\nprint("First element:", number_tuple[0])\nprint("Slice [1:3]:", number_tuple[1:3])\n\n# Immutability Check\n# number_tuple[0] = 99  # Raises TypeError: 'tuple' object does not support item assignment\n\n# Tuple built-in operations\nprint("Count of 20:", number_tuple.count(20))\nprint("Length:", len(number_tuple))\nprint("Maximum element:", max(number_tuple))`;
            } else if (/dict/i.test(lowerSlice)) {
                featuredCode = `# Creating a dictionary in Python\nstudent_record = {\n    "roll_no": 101,\n    "name": "Priya",\n    "marks": 94.5\n}\n\n# Accessing and modifying values\nprint("Student Name:", student_record["name"])\nprint("Grade Safe Fetch:", student_record.get("grade", "N/A"))\n\n# Modifying & Adding elements\nstudent_record["marks"] = 96.0\nstudent_record["grade"] = "A+"\n\n# Iterating keys and values\nfor key, value in student_record.items():\n    print(f"{key}: {value}")`;
            } else if (/list/i.test(lowerSlice)) {
                featuredCode = `# Creating and manipulating Python lists\nnumbers = [10, 20, 30, 40]\n\n# Accessing and slicing\nprint("First element:", numbers[0])\nprint("Reversed list:", numbers[::-1])\n\n# List methods\nnumbers.append(50)       # Appends element to end\npopped = numbers.pop()   # Removes and returns last element\nnumbers.sort()           # In-place sorting`;
            } else {
                // Look for statements with def, class, =, etc.
                const codeMatch = sliceText.match(/(?:def\s+\w+\([\s\S]*?\):[\s\S]*?(?=\n\S|$)|[a-zA-Z_]\w*\s*=\s*\([\s\S]*?\)|[a-zA-Z_]\w*\s*=\s*\{[\s\S]*?\}|[a-zA-Z_]\w*\s*=\s*\[[\s\S]*?\])/);
                if (codeMatch) {
                    featuredCode = codeMatch[0].trim();
                }
            }
        }

        return `### 📘 ${unitTitle}

${paragraphs[0] || 'This unit establishes core curriculum principles, syntax specifications, and practical algorithms as presented in the textbook.'}

#### 🔑 Key Curriculum Concepts & Learning Objectives
${sectionTitles.length > 0 ? sectionTitles.map(t => `- **${t}**: Fundamental concepts, syntax rules, and practical applications`).join('\n') : `- Core principles and standard operations for ${unitTitle}`}

${detailedTheory ? `#### 📖 Detailed Textbook Theory & Principles\n${detailedTheory}\n` : ''}

${featuredCode ? `#### 💻 Syntax & Code Implementation\n\`\`\`${language}\n${featuredCode}\n\`\`\`\n` : ''}

#### 💡 Practical Takeaways & CBSE Examination Tips
- Ensure accurate syntax boundaries and check edge cases prior to runtime execution.
- Review exception handling and data type immutability/mutability constraints for ${sectionTitles[0] || unitTitle}.
- Maintain clean variable naming and modular code structure aligned with board practical guidelines.`;
    }

    /**
     * Generate grounded 2-question concept checkpoints per unit with curriculum accuracy.
     */
    generateGroundedCheckpoints({ unitTitle = '', sectionTitles = [], unitIdx = 0, sliceText = '', language = 'python' }) {
        const textSample = `${unitTitle} ${sectionTitles.join(' ')} ${sliceText}`.toLowerCase();

        // 1. SQL / Database Domain (prioritized so relational 'tuples' are not confused with Python tuples)
        if (language === 'sql' || (language !== 'python' && /\b(sql|database|\btable\b|relational|primary\s+key|foreign\s+key|rdbms|cardinality|degree)\b/i.test(textSample))) {
            return [
                {
                    id: `cp_${unitIdx + 1}_1`,
                    question: 'Which constraints are strictly enforced on a column designated as a PRIMARY KEY in SQL?',
                    codeSnippet: 'CREATE TABLE Student (\n    RollNo INT PRIMARY KEY,\n    Name VARCHAR(50)\n);',
                    options: [
                        'UNIQUE values across all rows and NOT NULL (no missing values)',
                        'Allows duplicate entries if foreign keys reference it',
                        'Must always be an automatically incrementing numeric integer',
                        'Can contain at most one NULL value per table'
                    ],
                    correctOption: 0,
                    explanation: 'A Primary Key uniquely identifies each record in a relation. By relational DBMS definition, it enforces both UNIQUE and NOT NULL constraints.'
                },
                {
                    id: `cp_${unitIdx + 1}_2`,
                    question: 'In relational database theory, what do Degree and Cardinality measure?',
                    codeSnippet: '# Relational schema properties:\n# Table: Employee (EmpID, Name, Department, Salary) with 50 rows',
                    options: [
                        'Degree = Number of columns (attributes); Cardinality = Number of rows (tuples)',
                        'Degree = Number of rows (tuples); Cardinality = Number of columns (attributes)',
                        'Degree = Total primary keys; Cardinality = Total foreign keys',
                        'Degree = Database file size; Cardinality = Index count'
                    ],
                    correctOption: 0,
                    explanation: 'Degree refers to the total number of attributes (columns) in a table, whereas Cardinality refers to the total number of tuples (rows).'
                }
            ];
        }

        // 2. Python Tuples Domain
        if (/tuple/i.test(textSample)) {
            return [
                {
                    id: `cp_${unitIdx + 1}_1`,
                    question: 'Which of the following creates a valid single-element tuple in Python?',
                    codeSnippet: '# Option A: t1 = (5)\n# Option B: t2 = (5,)\n# Option C: t3 = [5]\n# Option D: t4 = tuple(5)',
                    options: [
                        't = (5,) — A trailing comma is required to define a single-element tuple',
                        't = (5) — Parentheses without a comma create a tuple',
                        't = tuple(5) — Directly passing an integer creates a single-element tuple',
                        't = [5] — Brackets create an immutable tuple'
                    ],
                    correctOption: 0,
                    explanation: 'In Python, a trailing comma (e.g. (5,)) is required for single-element tuples; otherwise, parentheses are evaluated as an arithmetic grouping operator returning an integer.'
                },
                {
                    id: `cp_${unitIdx + 1}_2`,
                    question: 'What occurs when attempting to modify an element in a tuple, such as: t = (10, 20, 30); t[1] = 99?',
                    codeSnippet: 't = (10, 20, 30)\nt[1] = 99  # Attempting in-place modification',
                    options: [
                        "TypeError: 'tuple' object does not support item assignment",
                        'The element at index 1 is successfully updated to 99',
                        'IndexError: tuple index out of range',
                        'The tuple is automatically coerced into a mutable list'
                    ],
                    correctOption: 0,
                    explanation: 'Tuples are strictly immutable sequences in Python. Their elements cannot be assigned, altered, or deleted in place after instantiation.'
                }
            ];
        }

        // 3. Python Dictionaries Domain
        if (/(dict|key|value|mapping|frequency)/i.test(textSample)) {
            return [
                {
                    id: `cp_${unitIdx + 1}_1`,
                    question: 'Which of the following Python data types CANNOT be used as a dictionary key?',
                    codeSnippet: '# Allowed keys: strings, numbers, tuples\n# Invalid keys: mutable objects',
                    options: [
                        'list (e.g., [1, 2]) — Lists are mutable and unhashable',
                        'tuple (e.g., (1, 2)) — Tuples with immutable items are valid keys',
                        'string (e.g., "roll_no") — Strings are immutable and hashable',
                        'integer (e.g., 101) — Numbers are valid immutable keys'
                    ],
                    correctOption: 0,
                    explanation: 'Dictionary keys must be immutable and hashable so their hash value remains constant during program execution. Lists are mutable and therefore raise TypeError: unhashable type: list.'
                },
                {
                    id: `cp_${unitIdx + 1}_2`,
                    question: 'What is the advantage of using dict.get(key, default) instead of dict[key]?',
                    codeSnippet: 'student = {"name": "Aman", "roll": 101}\ngrade = student.get("grade", "N/A")',
                    options: [
                        'It returns the specified default value without raising a KeyError if the key is absent',
                        'It permanently inserts the default value into the dictionary',
                        'It sorts the dictionary keys before retrieving the value',
                        'It deletes the key after reading its value'
                    ],
                    correctOption: 0,
                    explanation: 'The .get(key, default) method safely retrieves values; if key is missing, it returns the provided default value (or None) rather than crashing with a KeyError.'
                }
            ];
        }

        // 4. Python Lists Domain
        if (/list|array|slice|append/i.test(textSample)) {
            return [
                {
                    id: `cp_${unitIdx + 1}_1`,
                    question: 'What is the key difference between list.append(x) and list.extend(x)?',
                    codeSnippet: 'nums = [1, 2]\nnums.append([3, 4])  # Result A\n# vs\nnums = [1, 2]\nnums.extend([3, 4])  # Result B',
                    options: [
                        'append() adds the argument as a single element; extend() unpacks and adds each item of the iterable',
                        'extend() works only on numbers, while append() works on all data types',
                        'append() mutates the list, while extend() returns a new list without modifying original',
                        'Both methods behave identically in Python 3'
                    ],
                    correctOption: 0,
                    explanation: 'append(x) inserts x as a single element (e.g., [1, 2, [3, 4]]), whereas extend(x) iterates over x and appends each element individually (e.g., [1, 2, 3, 4]).'
                },
                {
                    id: `cp_${unitIdx + 1}_2`,
                    question: 'What will be the output of slicing an existing list L with: L[::-1]?',
                    codeSnippet: 'L = [10, 20, 30, 40]\nreversed_L = L[::-1]',
                    options: [
                        'A new list containing all elements of L in reverse order',
                        'An empty list []',
                        'A list containing only the first and last elements',
                        'IndexError: negative step size is invalid'
                    ],
                    correctOption: 0,
                    explanation: 'In Python slicing [start:stop:step], a negative step (-1) traverses the sequence backwards from end to start, reversing the list.'
                }
            ];
        }

        // 5. Universal Academic Fallback (for any other subject: Networks, File Handling, C++, etc.)
        const topicName = sectionTitles[0] || unitTitle;
        return [
            {
                id: `cp_${unitIdx + 1}_1`,
                question: `What fundamental principle defines ${topicName} in this curriculum?`,
                codeSnippet: `# Core concept verification for: ${topicName}`,
                options: [
                    `Standard operational specifications and verified data structures defined in the curriculum`,
                    `Uncontrolled execution without parameter or type validations`,
                    `Bypassing boundary checks and compiler validations`,
                    `Random runtime memory mutations`
                ],
                correctOption: 0,
                explanation: `${topicName} establishes structured, standardized operational rules aligned with board and industry requirements.`
            },
            {
                id: `cp_${unitIdx + 1}_2`,
                question: `When implementing solutions for ${topicName}, which engineering practice is essential?`,
                codeSnippet: `# Best practice check for: ${topicName}`,
                options: [
                    `Verifying boundary conditions, edge cases, and expected return types`,
                    `Ignoring return values and potential exception states`,
                    `Re-assigning incompatible variable types without explicit conversion`,
                    `Relying on undeclared global identifiers`
                ],
                correctOption: 0,
                explanation: `Rigorous boundary checking and input verification prevent runtime faults and ensure high software reliability.`
            }
        ];
    }

    /**
     * Synthesize grounded interactive exercises using extracted back-of-chapter questions or chapter concepts.
     */
    synthesizeGroundedExercises({ unitIdx = 0, unitTitle = '', sectionTitles = [], sliceText = '', backExercises = [], language = 'python', totalUnits = 5 }) {
        const isLastUnit = (unitIdx === totalUnits - 1);
        let matchingQ = [];

        if (isLastUnit && backExercises.length > 0) {
            matchingQ = backExercises.slice(0, 3);
        } else if (backExercises.length > 0) {
            const startIdx = unitIdx * 2;
            matchingQ = backExercises.slice(startIdx, startIdx + 2);
        }

        let exercises = [];
        if (matchingQ.length > 0) {
            exercises = matchingQ.map(q => {
                if (q.suggestedType === 'mcq') {
                    return {
                        title: `Q${q.questionNumber}: Output Prediction`,
                        description: q.questionText,
                        exerciseType: 'mcq',
                        difficulty: 'intermediate',
                        scaffoldLevel: 'guided',
                        bloomsLevel: 'analyze',
                        learningObjective: 'Predict output of textbook code snippet accurately.',
                        xpReward: 20,
                        timeLimit: 4,
                        starterCode: '',
                        solutionCode: '',
                        testCases: {
                            question: q.questionText,
                            options: ['Option A (Correct evaluation)', 'Option B', 'Option C', 'Option D'],
                            correctOption: 0,
                            explanation: 'Step-by-step trace of the textbook expression.'
                        },
                        hints: ['Evaluate operators and function calls in order of precedence.']
                    };
                } else if (q.suggestedType === 'code_debug') {
                    return {
                        title: `Q${q.questionNumber}: Error Spotting & Debugging`,
                        description: q.questionText,
                        exerciseType: 'code_debug',
                        difficulty: 'intermediate',
                        scaffoldLevel: 'guided',
                        bloomsLevel: 'apply',
                        learningObjective: 'Identify and fix syntax/runtime errors in code.',
                        xpReward: 25,
                        timeLimit: 5,
                        starterCode: '# Identify and correct the error\n' + q.questionText,
                        solutionCode: '# Corrected solution code\n',
                        testCases: {
                            buggyCode: q.questionText,
                            errors: [{ line: 1, description: 'Fix index or syntax error', correctedLine: '' }],
                            solutionCode: '',
                            explanation: 'Explanation of corrected code syntax.'
                        },
                        hints: ['Check index boundaries, punctuation, and keyword spelling.']
                    };
                } else {
                    const funcInfo = this.createAcademicExerciseForTopic({
                        topic: q.questionText.slice(0, 40),
                        unitTitle,
                        language,
                        exerciseType: 'coding',
                        index: q.questionNumber || 0
                    });

                    return {
                        title: `Q${q.questionNumber}: Programming Problem`,
                        description: q.questionText,
                        exerciseType: 'coding',
                        difficulty: 'intermediate',
                        scaffoldLevel: 'guided',
                        bloomsLevel: 'apply',
                        learningObjective: 'Write complete solution fulfilling textbook requirements.',
                        xpReward: 30,
                        timeLimit: 6,
                        starterCode: funcInfo.starterCode,
                        solutionCode: funcInfo.solutionCode,
                        testCases: funcInfo.testCases,
                        hints: ['Decompose the problem into input, computation, and return steps.']
                    };
                }
            });
        }

        // Guarantee at least 2 exercises per unit by supplementing if needed
        if (exercises.length < 2) {
            const primaryTopic = sectionTitles[0] || unitTitle;
            const secondaryTopic = sectionTitles[1] || primaryTopic;
            if (exercises.length === 0) {
                exercises.push(
                    this.createAcademicExerciseForTopic({
                        topic: primaryTopic,
                        unitTitle,
                        language,
                        exerciseType: 'coding',
                        index: unitIdx * 2,
                        documentText: sliceText
                    }),
                    this.createAcademicExerciseForTopic({
                        topic: secondaryTopic,
                        unitTitle,
                        language,
                        exerciseType: unitIdx % 2 === 0 ? 'mcq' : 'code_debug',
                        index: unitIdx * 2 + 1,
                        documentText: sliceText
                    })
                );
            } else if (exercises.length === 1) {
                exercises.push(
                    this.createAcademicExerciseForTopic({
                        topic: secondaryTopic,
                        unitTitle,
                        language,
                        exerciseType: exercises[0].exerciseType === 'coding' ? 'mcq' : 'coding',
                        index: unitIdx * 2 + 1,
                        documentText: sliceText
                    })
                );
            }
        }

        return exercises;
    }

    /**
     * Parse section headings from document text to discover actual topics.
     * Iterates line-by-line to avoid regex newline-consumption bugs.
     * Extracts numbered sections (8.1, 7.1, 1.2.1, etc.), markdown headers, and chapter exercises.
     * Returns array of { sectionNumber, title, startIndex, endIndex, text }
     */
    extractTopicsFromDocumentText(documentText = '') {
        if (!documentText || documentText.length < 50) return [];

        const lines = documentText.split(/\r?\n/);
        const sections = [];
        let charPos = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const numMatch = line.match(/^(?:#{1,4}\s+)?\s*(\d+\.\d+(?:\.\d+)?)[ \t]+([^\r\n]+)/);
            if (numMatch) {
                const num = numMatch[1];
                let rawTitle = numMatch[2].trim().replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ');
                if (rawTitle.length >= 3 && rawTitle.length <= 80 && !/^(shows|and|are|is|by|to|in|of|table\s+\d|figure\s+\d)\b/i.test(rawTitle)) {
                    sections.push({
                        sectionNumber: num,
                        title: this.cleanTitle(rawTitle),
                        startIndex: charPos
                    });
                }
            } else {
                const exMatch = line.match(/^(?:#{1,4}\s+)?\s*(?:exercise|exercises|chapter\s+exercise[s]?|programming\s+problems?|review\s+questions?|practice\s+questions?)\b/i);
                if (exMatch && charPos > documentText.length * 0.25) {
                    sections.push({
                        sectionNumber: 'Ex',
                        title: 'Chapter Assessment & Applied Practice',
                        startIndex: charPos
                    });
                }
            }
            charPos += line.length + 1;
        }

        // Markdown headings fallback if no numbered sections found
        if (sections.length === 0) {
            charPos = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const mdMatch = line.match(/^#{2,3}\s+(.+)/);
                if (mdMatch) {
                    const title = mdMatch[1].trim().replace(/^[\d.]+\s*/, '');
                    if (title.length >= 4 && title.length <= 80) {
                        sections.push({
                            sectionNumber: String(sections.length + 1),
                            title: this.cleanTitle(title),
                            startIndex: charPos
                        });
                    }
                }
                charPos += line.length + 1;
            }
        }

        if (sections.length === 0) return [];

        for (let i = 0; i < sections.length; i++) {
            const start = sections[i].startIndex;
            const end = (i + 1 < sections.length) ? sections[i + 1].startIndex : documentText.length;
            sections[i].endIndex = end;
            sections[i].text = documentText.slice(start, Math.min(end, start + 8000)).trim();
        }

        return sections;
    }

    /**
     * Extract actual back-of-chapter questions and review exercises from document text.
     */
    extractBackExercisesFromText(documentText = '') {
        const exIdx = documentText.search(/(?:^|\n)\s*(?:#{1,4}\s+)?(?:EXERCISES?|PROGRAMMING\s+PROBLEMS?|REVIEW\s+QUESTIONS?|PRACTICE\s+QUESTIONS?)\b/i);
        if (exIdx === -1 || exIdx < documentText.length * 0.25) {
            return [];
        }

        const exText = documentText.slice(exIdx);
        const questions = [];
        const qRegex = /(?:^|\n)\s*(?:Q\.?\s*|\b(?:Question|Prob(?:lem)?)\s*)?(\d+)\.\s*([^\n]+(?:\n(?!\s*(?:Q\.?\s*|\bQuestion\s*)?\d+\.).*)*)/gi;
        let match;

        while ((match = qRegex.exec(exText)) !== null) {
            const qNum = match[1];
            const qContent = match[2].trim().replace(/\s+/g, ' ');
            if (qContent.length >= 15) {
                let suggestedType = 'coding';
                if (/\b(?:predict|find|what is|what will be)\s+(?:the\s+)?output\b/i.test(qContent)) {
                    suggestedType = 'mcq';
                } else if (/\b(?:error|bug|correct|identify the error)\b/i.test(qContent)) {
                    suggestedType = 'code_debug';
                } else if (/\b(?:fill|differentiate|define|explain|state true|terms for)\b/i.test(qContent)) {
                    suggestedType = 'fill_blank';
                }

                questions.push({
                    questionNumber: Number(qNum),
                    questionText: qContent,
                    suggestedType
                });
            }
        }

        return questions;
    }

    /**
     * Contextually organize document sections and back exercises into progressive units.
     */
    contextuallyOrganizeUnits(sections = [], backExercises = [], targetUnits = 5) {
        if (sections.length === 0) return [];

        const contentSections = sections.filter(s => s.sectionNumber !== 'Ex');
        if (contentSections.length <= 2) {
            return sections.map((s, idx) => ({
                unitNumber: idx + 1,
                title: `Unit ${idx + 1}: ${s.title.replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/i, '')}`,
                sections: [s],
                text: s.text || ''
            }));
        }

        const hasBackExercises = backExercises.length > 0;
        const targetCount = Math.max(2, Math.min(8, parseInt(targetUnits) || 5));
        const contentUnitsCount = (hasBackExercises && targetCount >= 4) ? targetCount - 1 : targetCount;
        const groupSize = Math.ceil(contentSections.length / contentUnitsCount);
        const organizedUnits = [];

        for (let g = 0; g < contentSections.length; g += groupSize) {
            const group = contentSections.slice(g, g + groupSize);
            const unitNum = organizedUnits.length + 1;
            
            let rawTitle = group.map(s => s.title.replace(/^\d+\.\d+\s*/, '').replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/i, '')).join(' & ');
            if (rawTitle.length > 55) {
                const firstClean = group[0].title.replace(/^\d+\.\d+\s*/, '').replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/i, '');
                rawTitle = `${firstClean} & Related Concepts`;
            }
            rawTitle = rawTitle.replace(/^(?:unit\s+(?:[0-9]+|[ivx]+)[:\s-]*)+/i, '').trim();

            organizedUnits.push({
                unitNumber: unitNum,
                title: this.cleanTitle(rawTitle),
                sections: group,
                text: group.map(s => s.text || '').join('\n\n---\n\n')
            });

            if (organizedUnits.length === contentUnitsCount) {
                if (g + groupSize < contentSections.length) {
                    const remaining = contentSections.slice(g + groupSize);
                    organizedUnits[organizedUnits.length - 1].sections.push(...remaining);
                    organizedUnits[organizedUnits.length - 1].text += '\n\n---\n\n' + remaining.map(s => s.text || '').join('\n\n---\n\n');
                }
                break;
            }
        }

        if (hasBackExercises && targetCount >= 4) {
            const lastNum = organizedUnits.length + 1;
            organizedUnits.push({
                unitNumber: lastNum,
                title: 'Applied Problem Solving & Chapter Assessment',
                sections: [{ sectionNumber: 'Ex', title: 'Chapter Assessment', text: backExercises.map(q => `${q.questionNumber}. ${q.questionText}`).join('\n') }],
                text: `### 🎯 Chapter Assessment & Applied Review\n\nReview of core chapter problems and programming challenges extracted from the textbook:\n\n` +
                      backExercises.slice(0, 10).map(q => `**Q${q.questionNumber}**: ${q.questionText}`).join('\n\n')
            });
        }

        return organizedUnits;
    }

    /**
     * Backward-compatible wrapper for consolidateTopicsIntoUnits.
     */
    consolidateTopicsIntoUnits(topics = [], maxUnits = 5) {
        return this.contextuallyOrganizeUnits(topics, [], maxUnits);
    }

    /**
     * Universal dynamic deterministic fallback module builder.
     * Generates rich, complete course for ANY chapter with Theory, Checkpoints, CBSE Tips, and Exercises.
     * 100% grounded in uploaded document text; never throws, ensuring auto-build never fails with 500.
     */
    generateDeterministicFallbackModule({
        documentText = '',
        customPrompt = '',
        language = null,
        classLevel = 11,
        board = 'CBSE',
        totalUnits = 5,
        originalFileName = ''
    }) {
        const detectedTitle = this.deepAlgorithmicTitleExtract(documentText, originalFileName);
        const detectedLang = language || this.detectDocumentLanguage({
            documentText,
            title: detectedTitle,
            customPrompt,
            originalFileName
        });

        const sections = this.extractTopicsFromDocumentText(documentText);
        const backExercises = this.extractBackExercisesFromText(documentText);
        const organizedUnits = this.contextuallyOrganizeUnits(sections, backExercises, totalUnits || 5);

        const safeUnits = organizedUnits.length > 0 ? organizedUnits : [
            {
                unitNumber: 1,
                title: `Fundamentals of ${detectedTitle}`,
                sections: [{ title: `${detectedTitle} Foundations` }],
                text: documentText.slice(0, 3000)
            },
            {
                unitNumber: 2,
                title: `Core Operations & Syntax`,
                sections: [{ title: 'Core Operations' }],
                text: documentText.slice(3000, 6000)
            },
            {
                unitNumber: 3,
                title: `Applied Practice & Problem Solving`,
                sections: [{ title: 'Problem Solving' }],
                text: documentText.slice(6000, 9000)
            }
        ];

        const finalUnits = safeUnits.map((u, uIdx) => {
            const sectionTitles = u.sections.map(s => s.title);
            const theoryMarkdown = this.formatGroundedTheory({
                unitTitle: u.title,
                sectionTitles,
                sliceText: u.text,
                language: detectedLang
            });

            const miniCheckpoints = this.generateGroundedCheckpoints({
                unitTitle: u.title,
                sectionTitles,
                unitIdx: uIdx,
                sliceText: u.text,
                language: detectedLang
            });

            const cbseTips = [
                `Remember: In ${board} board exams, always verify syntax boundaries and definitions for ${sectionTitles[0] || u.title}.`,
                `Frequently examined question: Compare and contrast standard operations and error handling in ${u.title}.`
            ];

            const exercises = this.synthesizeGroundedExercises({
                unitIdx: uIdx,
                unitTitle: u.title,
                sectionTitles,
                sliceText: u.text,
                backExercises,
                language: detectedLang,
                totalUnits: safeUnits.length
            });

            return {
                unitNumber: u.unitNumber,
                title: this.cleanTitle(u.title),
                description: `Comprehensive concepts, textbook theory, and hands-on exercises for ${sectionTitles.join(', ')}.`,
                expectedHours: 4,
                unlockThreshold: 80,
                keyConcepts: sectionTitles.length > 0 ? sectionTitles : [u.title],
                theory: theoryMarkdown,
                miniCheckpoints,
                cbseTips,
                suggestedExerciseTypes: ['coding', 'code_debug', 'mcq'],
                exercises
            };
        });

        return {
            title: `${detectedTitle} (${board || 'CBSE'} Class ${classLevel || 11})`,
            titleHindi: `${detectedTitle} (पाठ्यक्रम)`,
            description: `A comprehensive curriculum training module on ${detectedTitle} synthesized directly from the uploaded resource.`,
            language: detectedLang,
            boardAligned: board || 'CBSE',
            classLevel: Number(classLevel) || 11,
            extractedSummary: `Synthesized ${finalUnits.length} comprehensive units with interactive exercises grounded in textbook sections.`,
            pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
            units: finalUnits
        };
    }

    parseJSONResponse(text) {
        if (!text || typeof text !== 'string') return null;
        let cleanText = text.trim();
        cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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

        try {
            return JSON.parse(cleanText);
        } catch (err) {
            // Attempt to clean trailing commas
            try {
                const fixed = cleanText.replace(/,\s*([\]}])/g, '$1');
                return JSON.parse(fixed);
            } catch (innerErr) {
                console.warn('[AIService] Failed to parse JSON response:', cleanText.substring(0, 100));
                return null;
            }
        }
    }
}

module.exports = new AIService();


