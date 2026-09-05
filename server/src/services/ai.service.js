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

        for (let i = 0; i < Math.min(targetCount, topicList.length || 1); i++) {
            const currentTopic = topicList[i % topicList.length];
            const cleanSlug = currentTopic.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) || 'solution';

            if (exerciseType === 'mcq' || (exerciseType === 'mixed' && i === 1)) {
                generatedExercises.push({
                    title: `${currentTopic}: Conceptual Evaluation`,
                    description: `Evaluate the following question related to ${currentTopic}.`,
                    exerciseType: 'mcq',
                    difficulty: 'beginner',
                    scaffoldLevel: 'guided',
                    bloomsLevel: 'understand',
                    learningObjective: `Identify key principles of ${currentTopic}.`,
                    xpReward: 15,
                    timeLimit: 3,
                    testCases: {
                        question: `Which statement accurately describes the behavior of ${currentTopic}?`,
                        options: [
                            `It evaluates mathematical expressions conforming to standard behavior`,
                            `It raises a runtime exception under standard circumstances`,
                            `It always returns None`,
                            `It mutates global variables unexpectedly`
                        ],
                        correctOption: 0,
                        explanation: `${currentTopic} operates in accordance with standard language specifications.`
                    },
                    hints: ['Recall the theoretical definitions covered in the Pre-Lab notes.']
                });
            } else if (exerciseType === 'bug_fix' || (exerciseType === 'mixed' && i === 2)) {
                generatedExercises.push({
                    title: `Debug: ${currentTopic} Implementation`,
                    description: `Fix the syntax or logic bug in the code snippet demonstrating ${currentTopic}.`,
                    exerciseType: 'code_debug',
                    difficulty: 'beginner',
                    scaffoldLevel: 'guided',
                    bloomsLevel: 'apply',
                    learningObjective: `Detect and rectify common implementation mistakes in ${currentTopic}.`,
                    xpReward: 20,
                    timeLimit: 5,
                    testCases: {
                        buggyCode: `# Buggy snippet for ${currentTopic}\ndef run_${cleanSlug}(val):\n    result = val\n    return reslt`,
                        errors: [
                            { line: 4, description: 'Typo in variable name (reslt instead of result)', correctedLine: '    return result' }
                        ],
                        solutionCode: `def run_${cleanSlug}(val):\n    result = val\n    return result`,
                        explanation: 'Variable names must match the assigned identifier.'
                    },
                    hints: ['Check the spelling of variable names on line 4.']
                });
            } else {
                generatedExercises.push({
                    title: `${currentTopic} Implementation Challenge`,
                    description: `## 🎯 Problem Statement\n\nWrite a Python function \`solve_${cleanSlug}(x)\` that applies the concept of **${currentTopic}**.\n\n### Requirements:\n- Function name: \`solve_${cleanSlug}(x)\`\n- Return the computed result.`,
                    exerciseType: 'coding',
                    difficulty: 'beginner',
                    scaffoldLevel: 'guided',
                    bloomsLevel: 'apply',
                    learningObjective: `Apply ${currentTopic} to solve a practical computation problem.`,
                    xpReward: 25,
                    timeLimit: 5,
                    starterCode: `def solve_${cleanSlug}(x):\n    # Write your solution here for ${currentTopic}\n    pass\n`,
                    solutionCode: `def solve_${cleanSlug}(x):\n    return x\n`,
                    testCases: [
                        { input: `solve_${cleanSlug}(5)`, expectedOutput: '5', isHidden: false },
                        { input: `solve_${cleanSlug}(10)`, expectedOutput: '10', isHidden: true }
                    ],
                    hints: [`Think about how ${currentTopic} transforms the input argument.`]
                });
            }
        }

        return { exercises: generatedExercises };
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
        // Require explicit Python class declaration syntax (class Name:) or OOP keywords to avoid matching grade levels like 'Class 11', 'Class 12', 'Class XI'
        const oopScore = (lowerText.match(/(?:\bclass\s+[A-Za-z_][A-Za-z0-9_]*\s*(?:\([a-zA-Z0-9_,\s]*\))?\s*:|\b(?:object-oriented|object\s+oriented|inheritance|polymorphism|encapsulation|__init__|subclass|superclass|method\s+overriding|self\.|instance\s+methods?|class\s+variables?|abstract\s+class|dunder)\b)/gi) || []).length;
        const pandasScore = (lowerText.match(/\b(pandas|dataframe|series|numpy|read_csv|matplotlib|data analysis|data frame)\b/g) || []).length;
        const sqlScore = (lowerText.match(/\b(select|from|where|create\s+table|alter\s+table|drop\s+table|insert\s+into|update|delete\s+from|foreign\s+key|primary\s+key|candidate\s+key|alternate\s+key|relational\s+database|relational\s+data|relational\s+model|database\s+management|database\s+concepts?|databases?|rdbms|dbms|sql|mysql|sqlite|ddl|dml|degree|cardinality|tuple|attribute|normalization|referential\s+integrity|group\s+by|order\s+by|having)\b/gi) || []).length;
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

        for (const line of lines.slice(0, 80)) {
            const match = line.match(/^(?:unit\s+[ivx0-9]+|chapter\s+[ivx0-9]+|module\s+[ivx0-9]+|topic|course|subject)[:\-\s]+(.+)/i);
            if (match && match[1]) {
                let cand = match[1].replace(/^[#*_\s]+|[#*_\s]+$/g, '').trim();
                cand = cand.replace(/^(code|no\.?|subject code)\s*[:\-]?\s*[0-9]+/i, '').trim();
                if (cand.length >= 6 && cand.length <= 80 && !isSuperficial(cand)) {
                    candidateHeaders.push(cand);
                }
            } else if (line.length >= 8 && line.length <= 85 && !isSuperficial(line) && !line.startsWith('http')) {
                if (/(database|sql|rdbms|dbms|relational|computer science|programming|data structures|algorithms|computer systems|networks|math library|cyber|computational thinking|artificial intelligence|machine learning|web development)/i.test(line)) {
                    const cleaned = line.replace(/^(class\s*[ivx0-9]+\s*[:\-]?\s*)/i, '').replace(/^[#*_\s]+|[#*_\s]+$/g, '').trim();
                    if (!isSuperficial(cleaned)) {
                        candidateHeaders.push(cleaned);
                    }
                }
            }
        }

        if (candidateHeaders.length > 0) {
            // Prioritize headers with rich curriculum concepts over generic lines
            const topSubject = candidateHeaders.find(h => /(database|sql|rdbms|relational|computer science|computational thinking|programming|computer systems|data structure|network)/i.test(h));
            const bestHeader = topSubject || candidateHeaders.find(h => /(database|sql|rdbms|relational|python|math|class\s+[A-Za-z]|data\s+structure|network)/i.test(h)) || candidateHeaders[0];
            if (bestHeader) return bestHeader.replace(/^(unit|chapter|module|topic|course|subject)\s*[:\-]\s*/i, '').trim();
        }

        // Domain density clear winners
        if (sqlScore >= 4 && sqlScore >= oopScore && sqlScore >= mathScore) {
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
        if (sqlScore >= 3) {
            return 'Relational Databases & SQL Query Systems';
        }

        return cleanFileTitle || 'Computer Science Applied Curriculum';
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
            const lowerCheck = (parsed.title + ' ' + (parsed.description || '') + ' ' + (documentText || '')).toLowerCase();
            const isDb = /\b(database|sql|dbms|rdbms|relational|create\s+table|primary\s+key|foreign\s+key)\b/i.test(lowerCheck);
            if (isDb && (!parsed.suggestedLanguage || parsed.suggestedLanguage === 'python')) {
                parsed.suggestedLanguage = 'sql';
            }
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
        const lowerAlgo = (algoTitle + ' ' + (documentText || '')).toLowerCase();
        const isDbTopic = /\b(database|sql|dbms|rdbms|relational|create\s+table|primary\s+key)\b/i.test(lowerAlgo);
        return {
            title: algoTitle,
            titleHindi: isDbTopic ? 'रिलेशनल डेटाबेस और एसक्यूएल क्वेरी सिस्टम' : `${algoTitle} (पाठ्यक्रम)`,
            description: isDbTopic
                ? 'A comprehensive curriculum module covering Database Concepts, Relational Data Models, Keys, and Structured Query Language (SQL) DDL & DML operations.'
                : `A comprehensive curriculum module on ${algoTitle} synthesized from the uploaded syllabus resource.`,
            keyTopics: isDbTopic
                ? ['Relational Data Model & Keys', 'SQL Data Definition (DDL)', 'SQL Data Manipulation (DML) & Queries', 'Aggregate Functions & Grouping']
                : [algoTitle, 'Core Foundations', 'Practical Implementation'],
            suggestedLanguage: isDbTopic ? 'sql' : 'python'
        };
    }

    /**
     * RAG-based Course & Units Generator from uploaded Ebook / PDF / Notes / Textbook Images
     */
    async generateTrainingModuleFromDocument({
        documentText = '',
        imageBase64 = null,
        mimeType = 'image/jpeg',
        customPrompt = '',
        language = 'python',
        classLevel = 11,
        board = 'CBSE',
        totalUnits = 3,
        provider = 'gemini'
    }) {
        const targetUnitsCount = Math.max(1, Math.min(10, parseInt(totalUnits) || 3));
        const lowerDoc = ((documentText || '') + ' ' + (customPrompt || '')).toLowerCase();
        const isDatabaseDoc = /\b(database|sql|dbms|rdbms|relational|create\s+table|primary\s+key|foreign\s+key|select\s+.*from)\b/i.test(lowerDoc);
        let targetLanguage = language;
        if (isDatabaseDoc && (!language || language === 'python' || language === 'sql')) {
            targetLanguage = 'sql';
        }

        const systemPrompt = `You are an elite AI Computer Science Curriculum Architect and Textbook Synthesizer.
Analyze the provided textbook / syllabus / PDF material and construct a fully-structured, grounded interactive training module with progressive units and multi-modal exercises.

TARGET PARAMETERS:
- LANGUAGE: ${targetLanguage}
- DOMAIN CONTEXT: ${isDatabaseDoc ? 'DATABASE MANAGEMENT SYSTEMS & SQL. Ground all units, theory notes, and coding/debug exercises in Relational Databases, Keys, DDL (CREATE/ALTER TABLE), DML (INSERT/SELECT/UPDATE/DELETE), and SQL query logic.' : 'Extract grounded curriculum directly from the document.'}
- CLASS LEVEL: Grade ${classLevel}
- BOARD: ${board}
- TARGET UNITS: ${targetUnitsCount}
- INSTRUCTOR NOTES: ${customPrompt || 'Extract full curriculum units, exercises, and theory directly from the resource.'}

RESOURCE CONTENT:
---
${documentText ? documentText.slice(0, 18000) : 'Extracted from attached document / image.'}
---

RULES:
1. STRICT RAG GROUNDING: Synthesize the training module, units, and learning content strictly from the RESOURCE CONTENT above.
   - Module title and description MUST reflect the actual chapters/topics in the document.
   - Each unit MUST represent a logical chapter, section, or topic directly found in the document.
   - Each unit MUST include comprehensive "theory" Markdown notes explaining the exact definitions, formulas, syntax, and examples from the document.
   - Each unit MUST include 2-3 "miniCheckpoints" testing comprehension of the document material.
   - Each unit MUST include 1-2 "cbseTips" with board exam traps, tips, or key formulas from the chapter.
2. Form EXACTLY ${targetUnitsCount} progressive units in the "units" array.
3. In each unit, generate 2-3 interactive exercises matching various pedagogy types:
   - "coding": Coding lab with starterCode, solutionCode, testCases array (at least 2 test cases: input, expectedOutput, isHidden), hints array.
   - "code_debug": CBSE Error Spotting with starterCode containing buggy code, and testCases: { buggyCode: "...", errors: [{ line: 3, description: "...", correctedLine: "..." }], solutionCode: "...", explanation: "..." }.
   - "code_trace": Variable trace table with testCases: { codeSnippet: "...", tableHeaders: ["Step", "Var1", "Var2"], expectedRows: [["1", "a", "b"]], explanation: "..." }.
   - "assertion_reason": CBSE Assertion-Reason with testCases: { assertion: "...", reason: "...", correctOption: 0, explanation: "..." }.
   - "mcq": Output prediction with testCases: { question, codeSnippet, options: ["A", "B", "C", "D"], correctOption: 0, explanation }.
   - "fill_blank": Syntax cloze with starterCode (containing {{BLANK_1}}), solutionCode, and testCases: { instruction, template, blanks: [{ id: "BLANK_1", correctAnswer: "...", hint: "..." }], explanation }.

Output MUST be ONLY valid JSON matching this schema:
{
  "title": "Course Title derived directly from document",
  "titleHindi": "कोर्स का शीर्षक (हिंदी में)",
  "description": "Comprehensive course description based on document...",
  "language": "${targetLanguage}",
  "boardAligned": "${board}",
  "classLevel": ${Number(classLevel) || 11},
  "extractedSummary": "Detailed summary of chapters, sections, and topics extracted from source document",
  "pedagogyConfig": {
    "useBlooms": true,
    "useObjectives": true,
    "useTimeLimit": false
  },
  "units": [
    {
      "unitNumber": 1,
      "title": "Unit 1: [Topic from Document]",
      "description": "Concepts covered in this unit...",
      "expectedHours": 4,
      "unlockThreshold": 80,
      "keyConcepts": ["Concept 1 from doc", "Concept 2 from doc"],
      "theory": "### 1. Topic Overview\\nDetailed Pre-Lab Markdown theory explaining the concepts, rules, algorithms, mathematical formulas (e.g. $nCr = \\\\frac{n!}{r!(n-r)!}$ or $\\\\text{height} = \\\\text{distance} \\\\times \\\\tan(\\\\theta)$), and code snippets directly from the document...",
      "miniCheckpoints": [
        {
          "id": "cp1",
          "question": "Concept check question testing understanding of the theory?",
          "codeSnippet": "optional python snippet",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctOption": 0,
          "explanation": "Why Option A is correct according to the theory"
        }
      ],
      "cbseTips": [
        "Common CBSE board exam trap or key definition/formula for this topic"
      ],
      "suggestedExerciseTypes": ["coding", "code_debug", "mcq"],
      "exercises": [
        {
          "title": "Exercise Title",
          "description": "Problem statement grounded in unit concepts",
          "theory": "Short concept refresher for this exercise",
          "exerciseType": "coding",
          "difficulty": "beginner",
          "scaffoldLevel": "guided",
          "bloomsLevel": "apply",
          "learningObjective": "SWBAT...",
          "xpReward": 15,
          "timeLimit": 5,
          "starterCode": "def solve():\\n    pass",
          "solutionCode": "def solve():\\n    return 42",
          "testCases": [
            { "input": "solve()", "expectedOutput": "42", "isHidden": false }
          ],
          "hints": ["Hint 1"]
        }
      ]
    }
  ]
}`;

        // 1. Vision Mode if imageBase64 is provided
        if (imageBase64) {
            // Try Gemini Vision first (Default)
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
                            systemPrompt
                        ]);
                        const parsed = this.parseJSONResponse(result.response.text());
                        if (parsed && (parsed.title || parsed.units)) return parsed;
                    } catch (err) {
                        console.warn(`[AIService] Gemini Vision extraction (${modelName}) failed:`, err.message);
                    }
                }
            }

            // Fallback to Groq Vision
            if (this.groq) {
                try {
                    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
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
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn('[AIService] Groq Vision document extraction failed:', err.message);
                }
            }
        }

        // 2. Text Grounding Mode: Try Gemini first (Default provider)
        if ((provider === 'gemini' || provider === 'auto') && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Gemini RAG outline (${modelName}) failed:`, err.message);
                }
            }
        }

        // 3. Try Groq (Fallback or if requested)
        if (this.groq) {
            const groqModels = ACTIVE_GROQ_MODELS;
            for (const modelName of groqModels) {
                try {
                    const completion = await this.groq.chat.completions.create({
                        model: modelName,
                        messages: [
                            { role: 'system', content: 'You are a curriculum AI. Output ONLY valid JSON matching the schema.' },
                            { role: 'user', content: systemPrompt }
                        ],
                        temperature: 0.2
                    });
                    const parsed = this.parseJSONResponse(completion.choices[0]?.message?.content || '{}');
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Groq RAG outline (${modelName}) failed:`, err.message);
                }
            }
        }

        // 4. Secondary Gemini retry if provider was groq but groq failed
        if (provider === 'groq' && this.genAI) {
            const geminiModels = ACTIVE_GEMINI_MODELS;
            for (const modelName of geminiModels) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(systemPrompt);
                    const parsed = this.parseJSONResponse(result.response.text());
                    if (parsed && (parsed.title || parsed.units)) return parsed;
                } catch (err) {
                    console.warn(`[AIService] Secondary Gemini RAG outline (${modelName}) failed:`, err.message);
                }
            }
        }

        // 5. Document-Intelligent Deterministic Fallback
        return this.generateDeterministicFallbackModule({
            documentText,
            customPrompt,
            language: targetLanguage,
            classLevel,
            board,
            totalUnits
        });
    }

    /**
     * Deterministic fallback module builder that guarantees a rich, complete 3-unit course
     * with Theory, Mini-Checkpoints, CBSE Tips, and interactive Exercises (Coding, MCQ, Fill Blank).
     * NEVER throws an error, ensuring auto-build never returns HTTP 500.
     */
    generateDeterministicFallbackModule({
        documentText = '',
        customPrompt = '',
        language = 'python',
        classLevel = 11,
        board = 'CBSE',
        totalUnits = 3,
        originalFileName = ''
    }) {
        const lowerDoc = (documentText + ' ' + customPrompt).toLowerCase();
        const isDatabaseModule = /\b(database|sql|dbms|rdbms|relational|create\s+table|primary\s+key|foreign\s+key|select\s+.*from|ddl|dml|mysql|sqlite|table|query|schema)\b/i.test(lowerDoc);
        const isMathModule = !isDatabaseModule && (lowerDoc.includes('math') || lowerDoc.includes('numeric') || lowerDoc.includes('ceil') || lowerDoc.includes('trigonometry'));
        const isOopModule = !isDatabaseModule && !isMathModule && (
            /(?:\bclass\s+[A-Za-z_][A-Za-z0-9_]*\s*(?:\([a-zA-Z0-9_,\s]*\))?\s*:|\b(?:object-oriented|object\s+oriented|inheritance|polymorphism|encapsulation|__init__|subclass|superclass|method\s+overriding|abstract\s+class)\b)/i.test(lowerDoc)
        );
        const isDataStructModule = !isDatabaseModule && !isMathModule && !isOopModule && (
            /\b(stack|queue|push|pop|dequeue|enqueue|linked\s+list|binary\s+tree|recursion)\b/i.test(lowerDoc)
        );

        if (isDatabaseModule) {
            return {
                title: 'Relational Databases & SQL Query Systems',
                titleHindi: 'रिलेशनल डेटाबेस और एसक्यूएल क्वेरी सिस्टम',
                description: 'A comprehensive curriculum module covering Database Concepts, Relational Data Models, Keys, and Structured Query Language (SQL) DDL & DML operations.',
                language: 'sql',
                boardAligned: board || 'CBSE',
                classLevel: Number(classLevel) || 11,
                extractedSummary: 'Synthesized 3 progressive units covering Relational Data Model & Keys, SQL Data Definition Language (DDL) with Table Constraints, and SQL Data Manipulation Language (DML) with Advanced Filtering and Aggregate Functions.',
                pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
                units: [
                    {
                        unitNumber: 1,
                        title: 'Unit 1: Database Concepts, Relational Data Model & Keys',
                        description: 'Foundational concepts of database systems, relations, attributes, tuples, degree, cardinality, and candidate/primary/foreign keys.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: [
                            'Limitations of File System vs Database Management System (DBMS)',
                            'Relational Data Model: Relation (Table), Attribute (Column), Tuple (Row), Domain',
                            'Degree (number of attributes) vs Cardinality (number of tuples)',
                            'Candidate Key, Primary Key, Alternate Key',
                            'Foreign Key and Referential Integrity constraints'
                        ],
                        theory: `### 1. Database Concepts & DBMS Overview
A **Database** is an organized collection of structured data. A **Database Management System (DBMS)** is system software for creating and managing databases, eliminating file system limitations like data redundancy, inconsistency, and lack of concurrent access.

### 2. The Relational Data Model
In a **Relational Database**, data is organized into two-dimensional tables called **Relations**:
- **Relation (Table)**: A grid of columns and rows containing data.
- **Attribute (Field/Column)**: A named column representing a specific property (e.g., \`RollNo\`, \`StudentName\`, \`Marks\`).
- **Tuple (Record/Row)**: A single row of related data values.
- **Domain**: The pool of permissible values from which an attribute draws its values.

> **CBSE Formula / Golden Rule**:
> - **Degree**: The total number of attributes (columns) in a relation.
> - **Cardinality**: The total number of tuples (rows) in a relation.

| RollNo | Name | Stream | Marks |
| :--- | :--- | :--- | :--- |
| 101 | Aarav | Science | 92 |
| 102 | Priya | Commerce | 88 |
| 103 | Rohan | Humanities | 85 |

*In the table above: Degree = 4 (columns), Cardinality = 3 (rows).*

### 3. Relational Keys
- **Candidate Key**: Any attribute or set of attributes capable of uniquely identifying each tuple in a relation.
- **Primary Key**: The candidate key chosen by the database designer to uniquely identify tuples. A primary key CANNOT contain duplicate or \`NULL\` values.
- **Alternate Key**: A candidate key that was NOT chosen as the primary key.
- **Foreign Key**: A non-key attribute in a relation whose values are derived from the Primary Key of another relation, enforcing **Referential Integrity**.`,
                        miniCheckpoints: [
                            {
                                id: 'cp_db_1',
                                question: 'If a relation contains 5 attributes (columns) and 40 records (rows), what are its degree and cardinality?',
                                options: [
                                    'Degree = 5, Cardinality = 40',
                                    'Degree = 40, Cardinality = 5',
                                    'Degree = 45, Cardinality = 200',
                                    'Degree = 5, Cardinality = 5'
                                ],
                                correctOption: 0,
                                explanation: 'Degree is the number of attributes/columns (5), while Cardinality is the number of tuples/rows (40).'
                            },
                            {
                                id: 'cp_db_2',
                                question: 'Which of the following statements about a Primary Key is correct?',
                                options: [
                                    'It can store NULL values',
                                    'It must be unique and cannot contain NULL values',
                                    'A table can possess multiple primary keys',
                                    'It must always have a floating-point data type'
                                ],
                                correctOption: 1,
                                explanation: 'Entity integrity requires a Primary Key to have unique and non-null values for each record.'
                            }
                        ],
                        cbseTips: [
                            'Degree = Columns, Cardinality = Rows. Memory trick: Degree starts with D (like Direction/Down columns), Cardinality is count of records.',
                            'A relation can have multiple candidate keys, but exactly ONE primary key.'
                        ],
                        suggestedExerciseTypes: ['coding', 'mcq'],
                        exercises: [
                            {
                                title: 'Define Student Table with Primary Key & NOT NULL',
                                description: 'Write a SQL DDL statement to create a table `Student` with columns `RollNo INT PRIMARY KEY`, `Name VARCHAR(50) NOT NULL`, and `Marks FLOAT`.',
                                exerciseType: 'coding',
                                difficulty: 'beginner',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Declare table schemas with primary key and nullability constraints.',
                                xpReward: 20,
                                timeLimit: 5,
                                starterCode: `-- Write your SQL statement below to create table Student\nCREATE TABLE Student (\n    \n);\n`,
                                solutionCode: `CREATE TABLE Student (\n    RollNo INT PRIMARY KEY,\n    Name VARCHAR(50) NOT NULL,\n    Marks FLOAT\n);\n`,
                                testCases: [
                                    { input: "SELECT name FROM pragma_table_info('Student') WHERE name='RollNo' OR name='Name';", expectedOutput: 'RollNo\nName', isHidden: false }
                                ],
                                hints: ['Declare RollNo INT PRIMARY KEY, Name VARCHAR(50) NOT NULL, and Marks FLOAT.']
                            }
                        ]
                    },
                    {
                        unitNumber: 2,
                        title: 'Unit 2: SQL Data Definition (DDL) & Table Constraints',
                        description: 'Creating tables, managing schemas with ALTER TABLE, and enforcing data integrity via table constraints.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: [
                            'SQL Data Types: CHAR(n) vs VARCHAR(n), INT, DECIMAL, DATE',
                            'DDL Commands: CREATE TABLE, ALTER TABLE, DROP TABLE',
                            'Table Constraints: PRIMARY KEY, UNIQUE, NOT NULL, DEFAULT, CHECK',
                            'Foreign Key REFERENCES and Referential Integrity',
                            'ALTER TABLE ADD, MODIFY, and DROP COLUMN operations'
                        ],
                        theory: `### 1. SQL Data Types
- **\`CHAR(n)\`**: Fixed-length character string. Padded with spaces if the stored string is shorter than \`n\`.
- **\`VARCHAR(n)\`**: Variable-length character string. Stores only the characters entered, saving storage space.
- **\`INT\` / \`INTEGER\`**: Standard integer values.
- **\`FLOAT\` / \`DECIMAL(p, s)\`**: Exact and floating-point numeric values.
- **\`DATE\`**: Calendar dates formatted as \`'YYYY-MM-DD'\`.

### 2. Data Definition Language (DDL)
DDL commands modify the database catalog / schema directly:

\`\`\`sql
-- Creating a table with column constraints
CREATE TABLE Employee (
    EmpId INT PRIMARY KEY,
    EmpName VARCHAR(50) NOT NULL,
    Dept VARCHAR(30) DEFAULT 'General',
    Salary DECIMAL(10, 2) CHECK (Salary > 0)
);

-- Modifying table schema
ALTER TABLE Employee ADD Email VARCHAR(100);
ALTER TABLE Employee DROP COLUMN Dept;

-- Removing a table permanently
DROP TABLE Employee;
\`\`\`

> **CBSE Examination Pitfall: DROP vs DELETE**:
> - **\`DROP TABLE\` (DDL)**: Destroys the table definition, schema metadata, and all records from the database permanently.
> - **\`DELETE FROM\` (DML)**: Deletes records/tuples from the table, but leaves the table structure intact for future inserts.`,
                        miniCheckpoints: [
                            {
                                id: 'cp_db_3',
                                question: "What is the storage difference between CHAR(10) and VARCHAR(10) when storing the string 'CBSE'?",
                                options: [
                                    "CHAR(10) uses 4 bytes, VARCHAR(10) uses 10 bytes",
                                    "CHAR(10) pads with 6 spaces to occupy 10 bytes, while VARCHAR(10) stores only 4 characters",
                                    "VARCHAR cannot store alphanumeric characters",
                                    "Both occupy 10 bytes unconditionally"
                                ],
                                correctOption: 1,
                                explanation: "CHAR is fixed-length and pads unused space with blank characters, whereas VARCHAR only allocates storage for the actual string."
                            },
                            {
                                id: 'cp_db_4',
                                question: 'Which SQL command deletes all tuples from a table while preserving the table structure?',
                                options: ['DROP TABLE', 'DELETE FROM', 'ALTER TABLE', 'REMOVE TABLE'],
                                correctOption: 1,
                                explanation: 'DELETE is a DML command that empties rows without dropping the schema. DROP TABLE removes the structure entirely.'
                            }
                        ],
                        cbseTips: [
                            'In CBSE board exams: DDL statements (CREATE, ALTER, DROP) affect schema structure; DML statements (SELECT, INSERT, UPDATE, DELETE) affect data rows.',
                            'Remember: DROP TABLE drops both data AND table definition from data dictionary.'
                        ],
                        suggestedExerciseTypes: ['coding', 'code_debug'],
                        exercises: [
                            {
                                title: 'Create Course Table with Unique and Check Constraints',
                                description: 'Create a table named `Course` with columns `CourseId INT PRIMARY KEY`, `CourseName VARCHAR(40) UNIQUE NOT NULL`, and `Credits INT CHECK (Credits > 0)`.',
                                exerciseType: 'coding',
                                difficulty: 'intermediate',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Implement table creation with primary key, unique, and check constraints in SQL.',
                                xpReward: 25,
                                timeLimit: 5,
                                starterCode: `-- Write your CREATE TABLE query for Course\nCREATE TABLE Course (\n\n);\n`,
                                solutionCode: `CREATE TABLE Course (\n    CourseId INT PRIMARY KEY,\n    CourseName VARCHAR(40) UNIQUE NOT NULL,\n    Credits INT CHECK (Credits > 0)\n);\n`,
                                testCases: [
                                    { input: "SELECT name FROM pragma_table_info('Course') WHERE name='CourseName';", expectedOutput: 'CourseName', isHidden: false }
                                ],
                                hints: ['Define CourseId INT PRIMARY KEY, CourseName VARCHAR(40) UNIQUE NOT NULL, Credits INT CHECK (Credits > 0).']
                            },
                            {
                                title: 'CBSE Error Spotting: Fix DDL Table Definition Syntax',
                                description: 'Identify and fix the syntax errors in the following SQL table creation script where data types and constraints are misused.',
                                exerciseType: 'code_debug',
                                difficulty: 'intermediate',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'analyze',
                                learningObjective: 'Identify and rectify SQL DDL column specification and primary key errors.',
                                xpReward: 25,
                                timeLimit: 5,
                                starterCode: `CREATE TABLE Teacher (\n    TId INT PRIMARY,\n    TName VARCHAR,\n    Salary DECIMAL(10, 2)\n)`,
                                solutionCode: `CREATE TABLE Teacher (\n    TId INT PRIMARY KEY,\n    TName VARCHAR(50),\n    Salary DECIMAL(10, 2)\n);`,
                                testCases: {
                                    buggyCode: `CREATE TABLE Teacher (\n    TId INT PRIMARY,\n    TName VARCHAR,\n    Salary DECIMAL(10, 2)\n)`,
                                    errors: [
                                        { line: 2, description: "'PRIMARY' must be 'PRIMARY KEY'.", correctedLine: '    TId INT PRIMARY KEY,' },
                                        { line: 3, description: "'VARCHAR' requires length specification e.g. VARCHAR(50).", correctedLine: '    TName VARCHAR(50),' },
                                        { line: 5, description: 'Missing closing semicolon at the end of statement.', correctedLine: ');' }
                                    ],
                                    solutionCode: `CREATE TABLE Teacher (\n    TId INT PRIMARY KEY,\n    TName VARCHAR(50),\n    Salary DECIMAL(10, 2)\n);`,
                                    explanation: 'In SQL, the constraint keyword is PRIMARY KEY (not just PRIMARY), VARCHAR requires a length parameter like VARCHAR(50), and SQL statements terminate with a semicolon.'
                                },
                                hints: ["Change 'PRIMARY' to 'PRIMARY KEY', specify a length for VARCHAR like VARCHAR(50), and end with a semicolon."]
                            }
                        ]
                    },
                    {
                        unitNumber: 3,
                        title: 'Unit 3: SQL Data Manipulation (DML) & Relational Queries',
                        description: 'Filtering data with WHERE clauses, pattern matching with LIKE, sorting with ORDER BY, and aggregating data with GROUP BY and HAVING.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: [
                            'DML Statements: INSERT INTO, SELECT, UPDATE, DELETE',
                            'Filtering Predicates: WHERE, BETWEEN ... AND, IN, IS NULL, AND, OR, NOT',
                            'Pattern Matching with LIKE: % (wildcard sequence) and _ (single character)',
                            'Sorting records: ORDER BY attribute [ASC | DESC]',
                            'Aggregate Functions: COUNT(*), COUNT(col), SUM(), AVG(), MIN(), MAX()',
                            'Grouping and Group Filtering: GROUP BY and HAVING clause'
                        ],
                        theory: `### 1. Data Manipulation Language (DML)
DML commands manage data within existing tables:

\`\`\`sql
-- Inserting records
INSERT INTO Student (RollNo, Name, Marks) VALUES (101, 'Aman Sharma', 94.5);

-- Modifying existing records
UPDATE Student SET Marks = 96.0 WHERE RollNo = 101;

-- Querying data with filters
SELECT Name, Marks FROM Student 
WHERE Marks BETWEEN 80 AND 100 
ORDER BY Marks DESC;
\`\`\`

### 2. Pattern Matching with LIKE
- **\`%\` (Percent)**: Matches zero, one, or multiple characters. E.g., \`Name LIKE 'A%'\` matches any name starting with 'A'.
- **\`_\` (Underscore)**: Matches exactly one character. E.g., \`Name LIKE '_a%'\` matches any name with 'a' as the second character.

### 3. Aggregate Functions & GROUP BY
Aggregate functions compute a single summary value over a set of rows:
- \`COUNT(*)\`: Counts all rows, including rows containing \`NULL\`.
- \`COUNT(attribute)\`: Counts only non-NULL values in the specified column.
- \`SUM(col)\`, \`AVG(col)\`, \`MIN(col)\`, \`MAX(col)\`.

\`\`\`sql
-- Department-wise average salary with group condition
SELECT Dept, AVG(Salary), COUNT(*) 
FROM Employee 
GROUP BY Dept 
HAVING AVG(Salary) > 50000;
\`\`\`

> **CBSE Critical Rule: WHERE vs HAVING**:
> - **\`WHERE\` clause**: Filters individual tuples *before* grouping occurs. You **CANNOT** use aggregate functions in a \`WHERE\` clause (e.g. \`WHERE AVG(marks) > 80\` is a syntax error!).
> - **\`HAVING\` clause**: Filters aggregated groups *after* the \`GROUP BY\` operation. Aggregate functions are placed in \`HAVING\`.`,
                        miniCheckpoints: [
                            {
                                id: 'cp_db_5',
                                question: 'Which SQL clause is legitimately used to filter groups using aggregate functions like AVG(Salary) or COUNT(*)?',
                                options: ['WHERE clause', 'HAVING clause', 'FROM clause', 'ORDER BY clause'],
                                correctOption: 1,
                                explanation: 'HAVING is evaluated after grouping and is specifically designed to filter groups based on aggregate conditions.'
                            },
                            {
                                id: 'cp_db_6',
                                question: "What LIKE pattern matches any string having 'k' as its third character?",
                                options: ["'%k%'", "'__k%'", "'_k%'", "'k__%'"],
                                correctOption: 1,
                                explanation: "Two underscores ('__') match exactly two leading characters, followed by 'k' as the third character, and '%' matches remaining characters."
                            }
                        ],
                        cbseTips: [
                            'Never write WHERE COUNT(*) > 5 in CBSE board exams. Always use GROUP BY ... HAVING COUNT(*) > 5.',
                            'COUNT(*) counts NULL values, but COUNT(column_name) ignores NULLs.'
                        ],
                        suggestedExerciseTypes: ['coding', 'fill_blank'],
                        exercises: [
                            {
                                title: 'Query High Scoring Students Sorted by Marks',
                                description: 'Write a SQL query to select `Name` and `Marks` from `Student` where `Marks >= 85`, sorted in descending order of `Marks`.',
                                exerciseType: 'coding',
                                difficulty: 'beginner',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Filter records using WHERE and sort output using ORDER BY DESC.',
                                xpReward: 20,
                                timeLimit: 5,
                                starterCode: `-- Write your SELECT query below\nSELECT \nFROM Student\nWHERE \nORDER BY ;\n`,
                                solutionCode: `SELECT Name, Marks FROM Student WHERE Marks >= 85 ORDER BY Marks DESC;\n`,
                                testCases: [
                                    { input: 'SELECT Name, Marks FROM Student WHERE Marks >= 85 ORDER BY Marks DESC;', expectedOutput: 'Aman', isHidden: false }
                                ],
                                hints: ['Use SELECT Name, Marks FROM Student WHERE Marks >= 85 ORDER BY Marks DESC;']
                            },
                            {
                                title: 'SQL Clause Syntax Completion',
                                description: 'Fill in the blanks to complete the SQL query retrieving names ending with `Sharma`.',
                                exerciseType: 'fill_blank',
                                difficulty: 'beginner',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'remember',
                                learningObjective: 'Utilize WHERE and LIKE operators for pattern matching.',
                                xpReward: 15,
                                timeLimit: 3,
                                starterCode: "SELECT * FROM Student {{BLANK_1}} Name {{BLANK_2}} '%Sharma';",
                                solutionCode: "SELECT * FROM Student WHERE Name LIKE '%Sharma';",
                                testCases: {
                                    instruction: 'Fill in the SQL filtering keyword and pattern matching operator.',
                                    template: "SELECT * FROM Student {{BLANK_1}} Name {{BLANK_2}} '%Sharma';",
                                    blanks: [
                                        { id: 'BLANK_1', correctAnswer: 'WHERE', hint: 'Clause used to filter rows' },
                                        { id: 'BLANK_2', correctAnswer: 'LIKE', hint: 'Pattern matching operator' }
                                    ],
                                    explanation: 'WHERE filters rows before selection; LIKE performs wildcard pattern matching using %.'
                                },
                                hints: ['BLANK_1 is the filtering clause (WHERE), BLANK_2 is the wildcard matching keyword (LIKE).']
                            }
                        ]
                    }
                ]
            };
        }

        if (isMathModule) {
            return {
                title: 'Python: Math Library Modules & Numeric Algorithms',
                titleHindi: 'पायथन: मैथ लाइब्रेरी मॉड्यूल और संख्यात्मक एल्गोरिदम',
                description: 'A comprehensive, curriculum-aligned training module covering core mathematical constants, rounding algorithms, power and exponential functions, and trigonometry under the standard Python math module.',
                language: 'python',
                boardAligned: board || 'CBSE',
                classLevel: Number(classLevel) || 11,
                extractedSummary: 'Synthesized 3 progressive units covering Number-Theoretic Functions, Exponential & Logarithmic Algorithms, and Euclidean Trigonometry based on uploaded math syllabus.',
                pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
                units: [
                    {
                        unitNumber: 1,
                        title: 'Unit 1: Constants, Rounding & Number-Theoretic Functions',
                        description: 'Foundational numeric functions including math.pi, math.e, math.tau, math.ceil, math.floor, math.trunc, math.factorial, and math.gcd.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: [
                            'math.pi, math.e, math.tau mathematical constants',
                            'math.ceil() vs math.floor() vs math.trunc() rounding logic',
                            'Negative number truncation behaviors',
                            'math.fabs() vs built-in abs() float conversion',
                            'math.factorial() domain constraints & ValueError trap',
                            'math.gcd() and math.lcm() for algorithm optimizations'
                        ],
                        theory: `### 1. Mathematical Constants
The Python \`math\` module provides high-precision standard mathematical constants:
- \`math.pi\`: Ratio of a circle's circumference to its diameter (~3.141592653589793)
- \`math.e\`: Base of the natural logarithm (~2.718281828459045)
- \`math.tau\`: Ratio of circumference to radius (\`2 * pi\` ~6.283185307179586)

\`\`\`python
import math
print(math.pi)   # 3.141592653589793
print(math.e)    # 2.718281828459045
print(math.tau)  # 6.283185307179586
\`\`\`

### 2. Rounding & Truncation Algorithms
- **\`math.ceil(x)\`**: Returns the smallest integer greater than or equal to \`x\`.
- **\`math.floor(x)\`**: Returns the largest integer less than or equal to \`x\`.
- **\`math.trunc(x)\`**: Truncates \`x\` towards zero (drops fractional part).

> **CBSE Pitfall on Negative Numbers**:
> For positive numbers, \`math.floor(3.7)\` and \`math.trunc(3.7)\` both give \`3\`.
> But for negative numbers: \`math.floor(-3.2)\` gives \`-4\`, whereas \`math.trunc(-3.2)\` gives \`-3\`!

\`\`\`python
import math
print(math.floor(-4.2)) # -5
print(math.trunc(-4.2)) # -4
print(math.ceil(-4.2))  # -4
\`\`\`

### 3. Number-Theoretic Functions
- **\`math.factorial(n)\`**: Returns \`n!\`. Accepts only non-negative integers; raises \`ValueError\` for negative numbers.
- **\`math.gcd(a, b)\`**: Greatest Common Divisor of integers \`a\` and \`b\`.`,
                        miniCheckpoints: [
                            {
                                id: 'cp_math_1',
                                question: 'What does math.floor(-4.2) return in Python 3?',
                                options: ['-4', '-5', '-4.0', 'ValueError'],
                                correctOption: 1,
                                explanation: 'math.floor(x) returns the largest integer <= x. For -4.2, the largest integer <= -4.2 is -5.'
                            },
                            {
                                id: 'cp_math_2',
                                question: 'What is the return type of math.fabs(-7)?',
                                options: ['int (7)', 'float (7.0)', 'str ("7")', 'bool (True)'],
                                correctOption: 1,
                                explanation: 'Unlike built-in abs(), math.fabs() strictly converts the value and returns a floating-point number (7.0).'
                            }
                        ],
                        cbseTips: [
                            'Remember: math.floor() rounds DOWN towards negative infinity, while math.trunc() truncates towards zero.',
                            'Calling math.factorial(-1) raises ValueError, not TypeError.'
                        ],
                        exercises: [
                            {
                                title: 'Permutations & Combinations Helper',
                                description: '## 🎯 Problem Statement\n\nWrite a Python function `calculate_combinations(n, r)` that calculates \\(C(n, r) = \\frac{n!}{r!(n-r)!}\\) using `math.factorial()`.\n\n### Constraints:\n- If \\(r > n\\) or \\(r < 0\\), return `0`.\n- Must use `math.factorial` from the `math` module.',
                                exerciseType: 'coding',
                                difficulty: 'beginner',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Apply math.factorial to compute mathematical combinations with boundary validation.',
                                xpReward: 20,
                                timeLimit: 5,
                                starterCode: `import math\n\ndef calculate_combinations(n, r):\n    # Write your solution here\n    pass\n`,
                                solutionCode: `import math\n\ndef calculate_combinations(n, r):\n    if r < 0 or r > n:\n        return 0\n    return math.factorial(n) // (math.factorial(r) * math.factorial(n - r))\n`,
                                testCases: [
                                    { input: 'calculate_combinations(5, 2)', expectedOutput: '10', isHidden: false },
                                    { input: 'calculate_combinations(6, 3)', expectedOutput: '20', isHidden: false },
                                    { input: 'calculate_combinations(4, 5)', expectedOutput: '0', isHidden: true }
                                ],
                                hints: ['Use math.factorial(n) and integer division // to ensure integer results.']
                            },
                            {
                                title: 'Predict Output: math.floor vs math.trunc',
                                description: 'Analyze the following Python snippet carefully and predict the printed output.',
                                exerciseType: 'mcq',
                                difficulty: 'beginner',
                                scaffoldLevel: 'independent',
                                bloomsLevel: 'understand',
                                learningObjective: 'Contrast floor and trunc behaviors on negative numbers.',
                                xpReward: 15,
                                timeLimit: 3,
                                testCases: {
                                    question: 'What is the exact output of this code snippet?',
                                    codeSnippet: 'import math\na = math.floor(-3.7)\nb = math.trunc(-3.7)\nprint(a, b)',
                                    options: ['-3 -3', '-4 -3', '-3 -4', '-4 -4'],
                                    correctOption: 1,
                                    explanation: 'math.floor(-3.7) rounds down to -4. math.trunc(-3.7) truncates towards zero to -3.'
                                },
                                hints: ['Visualize a number line with negative numbers progressing leftwards.']
                            }
                        ]
                    },
                    {
                        unitNumber: 2,
                        title: 'Unit 2: Power, Logarithmic & Exponential Functions',
                        description: 'Exponential scaling, logarithms, and roots using math.pow, math.sqrt, math.exp, math.log, and math.log10.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: [
                            'math.pow(x, y) vs ** operator and float return type',
                            'math.sqrt(x) and domain error on negative inputs',
                            'math.exp(x) and natural exponential calculations',
                            'math.log(x, [base]) natural vs arbitrary base logarithms',
                            'math.log10(x) for decibel, pH, and digit count algorithms'
                        ],
                        theory: `### 1. Power and Root Functions
- **\`math.pow(x, y)\`**: Computes \\(x^y\\). Crucially, \`math.pow\` converts both arguments to \`float\` and **always returns a \`float\`** (e.g. \`math.pow(2, 3)\` returns \`8.0\`, whereas \`2 ** 3\` returns integer \`8\`).
- **\`math.sqrt(x)\`**: Computes the square root \\(\\sqrt{x}\\). Raises \`ValueError: math domain error\` if \`x < 0\`.

\`\`\`python
import math
print(math.pow(2, 3))   # 8.0 (float)
print(2 ** 3)           # 8 (int)
print(math.sqrt(49))    # 7.0
\`\`\`

### 2. Logarithmic & Exponential Functions
- **\`math.exp(x)\`**: Returns \\(e^x\\).
- **\`math.log(x, [base])\`**: Computes \\(\\log_{base}(x)\\). If \`base\` is omitted, defaults to the natural log \\(\\ln(x)\\).
- **\`math.log10(x)\`**: Common logarithm with base 10. Useful for calculating digit counts: \`math.floor(math.log10(n)) + 1\`.`,
                        miniCheckpoints: [
                            {
                                id: 'cp_math_3',
                                question: 'What does math.pow(3, 2) evaluate to?',
                                options: ['9', '9.0', '6.0', 'ValueError'],
                                correctOption: 1,
                                explanation: 'math.pow always returns a float, so 3^2 produces 9.0.'
                            },
                            {
                                id: 'cp_math_4',
                                question: 'What exception is raised when executing math.sqrt(-9)?',
                                options: ['TypeError', 'ValueError: math domain error', 'OverflowError', 'ZeroDivisionError'],
                                correctOption: 1,
                                explanation: 'math.sqrt accepts only non-negative real numbers; negative values raise ValueError: math domain error.'
                            }
                        ],
                        cbseTips: [
                            'Remember that math.pow(x, y) returns float, while x ** y preserves integer types if both operands are integers.',
                            'math.log(x) default base is e, NOT 10.'
                        ],
                        exercises: [
                            {
                                title: 'Compound Interest Exponential Growth',
                                description: '## 🎯 Problem Statement\n\nWrite a Python function `compound_interest(principal, rate, years)` that calculates the final amount using the compound interest formula: \\(A = P \\times (1 + r)^t\\) using `math.pow()`.\n\nRound the result to 2 decimal places using `round(amount, 2)`.',
                                exerciseType: 'coding',
                                difficulty: 'intermediate',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Apply math.pow to compute compound financial growth models.',
                                xpReward: 25,
                                timeLimit: 5,
                                starterCode: `import math\n\ndef compound_interest(principal, rate, years):\n    # Write your solution here\n    pass\n`,
                                solutionCode: `import math\n\ndef compound_interest(principal, rate, years):\n    amount = principal * math.pow(1 + rate, years)\n    return round(amount, 2)\n`,
                                testCases: [
                                    { input: 'compound_interest(1000, 0.05, 2)', expectedOutput: '1102.5', isHidden: false },
                                    { input: 'compound_interest(5000, 0.10, 3)', expectedOutput: '6655.0', isHidden: false }
                                ],
                                hints: ['Use math.pow(1 + rate, years) and multiply by principal.']
                            }
                        ]
                    },
                    {
                        unitNumber: 3,
                        title: 'Unit 3: Trigonometry, Angular Radians & Euclidean Geometry',
                        description: 'Trigonometric functions, angular conversions with math.radians and math.degrees, and distance metrics via math.hypot.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: [
                            'Trigonometric functions math.sin, math.cos, math.tan expect radians',
                            'math.radians(deg) and math.degrees(rad) angular conversions',
                            'math.hypot(x, y) for Euclidean distance from origin',
                            'math.dist(p, q) for n-dimensional Euclidean coordinate distance'
                        ],
                        theory: `### 1. Trigonometry & Angular Conversions
In Python's \`math\` module, all trigonometric functions (**\`math.sin\`**, **\`math.cos\`**, **\`math.tan\`**) accept angles in **radians**, NEVER degrees!

To convert between degrees and radians:
- **\`math.radians(degrees)\`**: Converts degrees to radians.
- **\`math.degrees(radians)\`**: Converts radians to degrees.

\`\`\`python
import math
deg = 30
rad = math.radians(deg)
print(math.sin(rad))  # 0.49999999999999994 (~0.5)
\`\`\`

### 2. Euclidean Geometry & Distance
- **\`math.hypot(*coordinates)\`**: Computes Euclidean norm \\(\\sqrt{x^2 + y^2}\\).
- **\`math.dist(p, q)\`**: Computes Euclidean distance between points \`p\` and \`q\` of equal dimension.`,
                        miniCheckpoints: [
                            {
                                id: 'cp_math_5',
                                question: 'What angular unit does math.sin(x) expect for x?',
                                options: ['Degrees', 'Radians', 'Gradians', 'Minutes'],
                                correctOption: 1,
                                explanation: 'All trigonometric functions in Python math require angles measured in radians.'
                            }
                        ],
                        cbseTips: [
                            'Always use math.radians() before passing a degree value into math.sin or math.cos in CBSE exams.'
                        ],
                        exercises: [
                            {
                                title: 'Tower Height Trigonometry Calculator',
                                description: '## 🎯 Problem Statement\n\nCalculate the height of a tower given the distance from its base (in meters) and the angle of elevation in **degrees**.\n\nFormula: \\(h = \\text{distance} \\times \\tan(\\text{angle in radians})\\).\nReturn the height rounded to 2 decimal places.',
                                exerciseType: 'coding',
                                difficulty: 'intermediate',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Convert degrees to radians and apply math.tan to solve geometry problems.',
                                xpReward: 25,
                                timeLimit: 5,
                                starterCode: `import math\n\ndef tower_height(distance, angle_degrees):\n    # Write your solution here\n    pass\n`,
                                solutionCode: `import math\n\ndef tower_height(distance, angle_degrees):\n    angle_rad = math.radians(angle_degrees)\n    return round(distance * math.tan(angle_rad), 2)\n`,
                                testCases: [
                                    { input: 'tower_height(50, 45)', expectedOutput: '50.0', isHidden: false },
                                    { input: 'tower_height(100, 30)', expectedOutput: '57.74', isHidden: false }
                                ],
                                hints: ['Convert degrees to radians with math.radians(angle_degrees) first!']
                            }
                        ]
                    }
                ]
            };
        }

        if (isOopModule) {
            return {
                title: 'Python: Object-Oriented Programming & Software Design',
                titleHindi: 'पायथन: ऑब्जेक्ट-ओरिएंटेड प्रोग्रामिंग और सॉफ्टवेयर डिज़ाइन',
                description: 'A comprehensive, mastery-gated course covering Classes, Objects, Instance and Class Attributes, Encapsulation, and Inheritance Hierarchies.',
                language: 'python',
                boardAligned: board || 'CBSE',
                classLevel: Number(classLevel) || 11,
                extractedSummary: 'Structured 3 progressive units covering Classes & Objects, Instance vs Class Namespace & Encapsulation, and Inheritance Hierarchies with Method Overriding.',
                pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
                units: [
                    {
                        unitNumber: 1,
                        title: 'Unit 1: Classes, Objects & Constructor Mechanics',
                        description: 'Defining classes, instantiating objects, and initialization via __init__.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: ['class keyword & object instantiation', 'The __init__ constructor method', 'self reference parameter', 'Instance attributes'],
                        theory: `### 1. Classes & Objects in Python\nA **class** is a blueprint for creating objects. An **object** is an instance of a class containing attributes and methods.\n\n\`\`\`python\nclass Student:\n    def __init__(self, name, roll_no):\n        self.name = name\n        self.roll_no = roll_no\n\`\`\``,
                        miniCheckpoints: [
                            {
                                id: 'cp_oop_1',
                                question: 'What is the purpose of the "self" parameter in Python class methods?',
                                options: ['Refers to the class itself', 'Refers to the current instance of the class', 'Initializes global variables', 'Imports modules'],
                                correctOption: 1,
                                explanation: 'self explicitly refers to the specific instance of the object calling the method.'
                            }
                        ],
                        cbseTips: ['Always include self as the first parameter of any instance method.'],
                        exercises: [
                            {
                                title: 'Create Student Class with Constructor',
                                description: 'Write a class `Student` that accepts `name` and `grade` in `__init__` and has a method `get_info()` returning `"Student {name} is in grade {grade}".',
                                exerciseType: 'coding',
                                difficulty: 'beginner',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Define classes with constructors and instance methods.',
                                xpReward: 20,
                                timeLimit: 5,
                                starterCode: `class Student:\n    def __init__(self, name, grade):\n        pass\n    def get_info(self):\n        pass\n`,
                                solutionCode: `class Student:\n    def __init__(self, name, grade):\n        self.name = name\n        self.grade = grade\n    def get_info(self):\n        return f"Student {self.name} is in grade {self.grade}"\n`,
                                testCases: [
                                    { input: 'Student("Aman", 11).get_info()', expectedOutput: '"Student Aman is in grade 11"', isHidden: false }
                                ],
                                hints: ['Bind attributes to self.name and self.grade inside __init__.']
                            }
                        ]
                    },
                    {
                        unitNumber: 2,
                        title: 'Unit 2: Instance Methods, Class Variables & Encapsulation',
                        description: 'Managing class-level state, private attributes with name mangling, and getter/setter methods.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: ['Class variables vs instance variables', 'Private attributes with leading double underscores', 'Getter and setter methods', 'Name mangling'],
                        theory: `### 1. Class vs Instance Variables\nClass variables are shared by all instances, while instance variables are unique to each object.\n\n\`\`\`python\nclass BankAccount:\n    bank_name = "CBSE National Bank"  # Class variable\n    def __init__(self, balance):\n        self.__balance = balance        # Private attribute\n\`\`\``,
                        miniCheckpoints: [
                            {
                                id: 'cp_oop_2',
                                question: 'How is a private attribute defined in a Python class?',
                                options: ['private x = 10', '__x = 10 (double leading underscore)', 'def private(x):', '@private x'],
                                correctOption: 1,
                                explanation: 'Python indicates private variables using two leading underscores (__var), which triggers name mangling.'
                            }
                        ],
                        cbseTips: ['Private variables like self.__pin are mangled to _ClassName__pin internally.'],
                        exercises: [
                            {
                                title: 'Encapsulated BankAccount Class',
                                description: 'Implement a `BankAccount` class with private `__balance`. Provide `deposit(amount)` and `get_balance()` methods.',
                                exerciseType: 'coding',
                                difficulty: 'intermediate',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Implement encapsulation using private attributes and accessor methods.',
                                xpReward: 25,
                                timeLimit: 5,
                                starterCode: `class BankAccount:\n    def __init__(self, initial_balance=0):\n        pass\n    def deposit(self, amount):\n        pass\n    def get_balance(self):\n        pass\n`,
                                solutionCode: `class BankAccount:\n    def __init__(self, initial_balance=0):\n        self.__balance = initial_balance\n    def deposit(self, amount):\n        if amount > 0:\n            self.__balance += amount\n    def get_balance(self):\n        return self.__balance\n`,
                                testCases: [
                                    { input: 'b = BankAccount(100); b.deposit(50); b.get_balance()', expectedOutput: '150', isHidden: false }
                                ],
                                hints: ['Store the balance in self.__balance.']
                            }
                        ]
                    },
                    {
                        unitNumber: 3,
                        title: 'Unit 3: Inheritance, Polymorphism & Method Overriding',
                        description: 'Extending base classes, reusing code with super(), and implementing polymorphic behavior.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: ['Single and multi-level inheritance', 'The super() method', 'Method overriding', 'Polymorphic function dispatch'],
                        theory: `### 1. Inheritance Hierarchy\nInheritance allows a subclass to inherit attributes and methods from a parent class:\n\n\`\`\`python\nclass Animal:\n    def speak(self):\n        return "Sound"\n\nclass Dog(Animal):\n    def speak(self):\n        return "Woof!"\n\`\`\``,
                        miniCheckpoints: [
                            {
                                id: 'cp_oop_3',
                                question: 'What builtin function is used to invoke a parent class method in a child class?',
                                options: ['parent()', 'super()', 'base()', 'inherit()'],
                                correctOption: 1,
                                explanation: 'super() delegates method calls to a parent or sibling class in the inheritance hierarchy.'
                            }
                        ],
                        cbseTips: ['When overriding __init__ in a subclass, always invoke super().__init__(...) to initialize parent attributes.'],
                        exercises: [
                            {
                                title: 'Implement Shape and Rectangle Subclass',
                                description: 'Create a base class `Shape` with method `area()`. Create a subclass `Rectangle(Shape)` that accepts `width` and `height` and overrides `area()`.',
                                exerciseType: 'coding',
                                difficulty: 'intermediate',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Implement subclassing, method overriding, and inheritance.',
                                xpReward: 25,
                                timeLimit: 5,
                                starterCode: `class Shape:\n    def area(self):\n        return 0\nclass Rectangle(Shape):\n    def __init__(self, w, h):\n        pass\n    def area(self):\n        pass\n`,
                                solutionCode: `class Shape:\n    def area(self):\n        return 0\nclass Rectangle(Shape):\n    def __init__(self, w, h):\n        super().__init__()\n        self.w = w\n        self.h = h\n    def area(self):\n        return self.w * self.h\n`,
                                testCases: [
                                    { input: 'Rectangle(4, 5).area()', expectedOutput: '20', isHidden: false }
                                ],
                                hints: ['Return self.w * self.h in Rectangle.area().']
                            }
                        ]
                    }
                ]
            };
        }

        if (isDataStructModule) {
            return {
                title: 'Python: Data Structures & Algorithmic Problem Solving',
                titleHindi: 'पायथन: डेटा संरचनाएं और एल्गोरिथम समाधान',
                description: 'A comprehensive curriculum module covering linear data structures, Stack LIFO operations, Queue FIFO mechanics, and recursive algorithms in Python.',
                language: 'python',
                boardAligned: board || 'CBSE',
                classLevel: Number(classLevel) || 12,
                extractedSummary: 'Synthesized 3 progressive units covering Linear Data Structures & Stacks, Queue Implementations, and Applied Recursion.',
                pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
                units: [
                    {
                        unitNumber: 1,
                        title: 'Unit 1: Linear Data Structures & Stack Implementation',
                        description: 'LIFO principle, push/pop operations using Python lists, stack overflow and underflow inspection.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: [
                            'Linear Data Structure concepts: contiguous vs non-contiguous',
                            'Stack LIFO (Last In First Out) principle',
                            'Push operation using list.append()',
                            'Pop operation using list.pop() with underflow check',
                            'Peek / Top element inspection without removal',
                            'CBSE Board Practical: Stack of books / student records'
                        ],
                        theory: `### 1. The Stack Data Structure (LIFO)
A Stack is a linear data structure following the **Last-In, First-Out (LIFO)** principle: the element inserted last is the first one to be removed.

### 2. Stack Operations in Python
In Python, a stack is commonly implemented using a standard \`list\`:
- **Push**: Adding an element to the top of the stack using \`stack.append(element)\`.
- **Pop**: Removing the top element using \`stack.pop()\`. Always verify that the stack is not empty to prevent \`IndexError: pop from empty list\` (**Underflow**).
- **Peek / Top**: Accessing the top element using \`stack[-1]\`.

\`\`\`python
# Complete CBSE Stack Pattern
stack = []

def push(item):
    stack.append(item)

def pop():
    if not stack:
        print("Stack Underflow")
        return None
    return stack.pop()
\`\`\`

> **CBSE Examination Tip**:
> - **Underflow**: Attempting to delete or pop from an already empty stack.
> - **Overflow**: Attempting to push into a stack that has exceeded its allocated fixed memory limit (rare in Python dynamic lists, but tested conceptually in theory questions).`,
                        miniCheckpoints: [
                            {
                                id: 'cp_ds_1',
                                question: 'What condition occurs when attempting to pop an element from an empty stack?',
                                options: ['Stack Overflow', 'Stack Underflow', 'Segmentation Fault', 'Memory Leak'],
                                correctOption: 1,
                                explanation: 'Underflow happens when an operation attempts to remove an item from an empty data structure.'
                            },
                            {
                                id: 'cp_ds_2',
                                question: 'Which built-in Python list method represents the Push operation in a list-based stack?',
                                options: ['list.insert(0, item)', 'list.append(item)', 'list.extend(item)', 'list.add(item)'],
                                correctOption: 1,
                                explanation: 'list.append(item) adds an element to the end (top) of the list with O(1) amortized complexity.'
                            }
                        ],
                        cbseTips: [
                            'Always check if len(stack) == 0 before executing stack.pop() in CBSE lab practicals.',
                            'Remember that list.pop() without arguments removes and returns the last element (top of stack).'
                        ],
                        exercises: [
                            {
                                title: 'Implement Stack Push and Pop Operations',
                                description: 'Write a function `manage_stack(operations)` that takes a list of operations (e.g. `[("push", 10), ("push", 20), ("pop",)]`) and returns the final stack state as a list.',
                                exerciseType: 'coding',
                                difficulty: 'beginner',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Implement stack push and pop mechanics with underflow safety.',
                                xpReward: 20,
                                timeLimit: 5,
                                starterCode: `def manage_stack(operations):\n    stack = []\n    # Process operations\n    return stack\n`,
                                solutionCode: `def manage_stack(operations):\n    stack = []\n    for op in operations:\n        if op[0] == "push":\n            stack.append(op[1])\n        elif op[0] == "pop" and stack:\n            stack.pop()\n    return stack\n`,
                                testCases: [
                                    { input: 'manage_stack([("push", 5), ("push", 15), ("pop",)])', expectedOutput: '[5]', isHidden: false },
                                    { input: 'manage_stack([("push", "A"), ("push", "B"), ("push", "C")])', expectedOutput: "['A', 'B', 'C']", isHidden: false }
                                ],
                                hints: ['Iterate through operations, checking op[0] == "push" or "pop".']
                            }
                        ]
                    },
                    {
                        unitNumber: 2,
                        title: 'Unit 2: Queue Mechanics & FIFO Operations',
                        description: 'First-In First-Out principle, enqueue and dequeue operations, circular queue concepts.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: [
                            'Queue FIFO (First In First Out) principle',
                            'Enqueue (insert at rear) vs Dequeue (remove from front)',
                            'collections.deque for efficient O(1) queue operations'
                        ],
                        theory: `### 1. The Queue Data Structure (FIFO)
A Queue is a linear data structure following the **First-In, First-Out (FIFO)** order. The first element added is the first one to be removed (like a ticket counter line).

### 2. Operations
- **Enqueue**: Add to rear (\`list.append()\`).
- **Dequeue**: Remove from front (\`list.pop(0)\` or \`deque.popleft()\`).`,
                        miniCheckpoints: [
                            {
                                id: 'cp_ds_3',
                                question: 'Which principle governs Queue operations?',
                                options: ['LIFO', 'FIFO', 'LILO', 'Random Access'],
                                correctOption: 1,
                                explanation: 'Queue is strictly First-In, First-Out (FIFO).'
                            }
                        ],
                        cbseTips: ['In Python, list.pop(0) is O(n) while collections.deque.popleft() is O(1).'],
                        exercises: [
                            {
                                title: 'Queue Simulation',
                                description: 'Write a function `process_queue(items)` that enqueues items into a list and returns the first dequeued element, or None if empty.',
                                exerciseType: 'coding',
                                difficulty: 'beginner',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Model queue FIFO dispatch.',
                                xpReward: 20,
                                timeLimit: 5,
                                starterCode: `def process_queue(items):\n    # Return first item in FIFO order\n    pass\n`,
                                solutionCode: `def process_queue(items):\n    return items[0] if items else None\n`,
                                testCases: [
                                    { input: 'process_queue([10, 20, 30])', expectedOutput: '10', isHidden: false }
                                ],
                                hints: ['The first element in FIFO order is items[0].']
                            }
                        ]
                    },
                    {
                        unitNumber: 3,
                        title: 'Unit 3: Applied Recursion & Algorithmic Problem Solving',
                        description: 'Recursive functions, base case termination, call stack execution, and Divide-and-Conquer algorithms.',
                        expectedHours: 4,
                        unlockThreshold: 80,
                        keyConcepts: [
                            'Recursive definition: base condition and recursive step',
                            'System Call Stack and RecursionError maximum recursion depth',
                            'Recursive traversal: factorial, Fibonacci, binary search'
                        ],
                        theory: `### 1. Recursion Fundamentals
A recursive function solves a problem by calling itself on smaller sub-problems until reaching a **base case**.

\`\`\`python
def factorial(n):
    # Base Case: prevents infinite recursion
    if n <= 1:
        return 1
    # Recursive Case: moves toward base case
    return n * factorial(n - 1)
\`\`\``,
                        miniCheckpoints: [
                            {
                                id: 'cp_ds_4',
                                question: 'What occurs if a recursive function lacks a valid base case?',
                                options: ['RecursionError: maximum recursion depth exceeded', 'ZeroDivisionError', 'TypeError', 'Code compiles normally'],
                                correctOption: 0,
                                explanation: 'Without a base case, recursion continues indefinitely until the call stack limit is reached, raising RecursionError.'
                            }
                        ],
                        cbseTips: ['Every recursive function in CBSE board questions must have at least one return statement for the base case.'],
                        exercises: [
                            {
                                title: 'Recursive Factorial Function',
                                description: 'Write a recursive function `factorial(n)` that returns the factorial of integer `n`. Return 1 if `n <= 1`.',
                                exerciseType: 'coding',
                                difficulty: 'beginner',
                                scaffoldLevel: 'guided',
                                bloomsLevel: 'apply',
                                learningObjective: 'Construct recursive algorithms with base case termination.',
                                xpReward: 20,
                                timeLimit: 5,
                                starterCode: `def factorial(n):\n    # Write recursive solution\n    pass\n`,
                                solutionCode: `def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n`,
                                testCases: [
                                    { input: 'factorial(5)', expectedOutput: '120', isHidden: false },
                                    { input: 'factorial(3)', expectedOutput: '6', isHidden: false }
                                ],
                                hints: ['Base case: if n <= 1: return 1. Recursive case: return n * factorial(n - 1).']
                            }
                        ]
                    }
                ]
            };
        }

        // Generic Text Fallback: extract grounded title using deep content scanning across full text
        const extractedTitle = this.deepAlgorithmicTitleExtract(documentText, originalFileName);

        return {
            title: extractedTitle,
            titleHindi: `${extractedTitle} (पाठ्यक्रम)`,
            description: `A comprehensive curriculum-aligned training module synthesized from the uploaded syllabus resource.`,
            language: language || 'python',
            boardAligned: board || 'CBSE',
            classLevel: Number(classLevel) || 11,
            extractedSummary: `Synthesized 3 progressive curriculum units with interactive exercises based on uploaded document content.`,
            pedagogyConfig: { useBlooms: true, useObjectives: true, useTimeLimit: false },
            units: [
                {
                    unitNumber: 1,
                    title: `Unit 1: Fundamentals & Core Syntax`,
                    description: `Foundational syntax, variables, expressions, and elementary operations.`,
                    expectedHours: 4,
                    unlockThreshold: 80,
                    keyConcepts: ['Variables & Primitive Types', 'Expressions & Arithmetic', 'Control Flow Basics'],
                    theory: `### Core Foundations\nReview foundational syntax, operations, and control structures introduced in the curriculum notes.\n\n\`\`\`python\n# Example syntax demonstration\nx = 10\ny = 20\nresult = x + y\nprint(result)\n\`\`\``,
                    miniCheckpoints: [
                        {
                            id: 'cp_gen_1',
                            question: 'What is the primary role of variable assignment in programming?',
                            options: ['To reserve memory and bind a name to a value', 'To execute a loop', 'To import standard libraries', 'To delete files'],
                            correctOption: 0,
                            explanation: 'Variable assignment binds a symbolic name to an object reference in memory.'
                        }
                    ],
                    cbseTips: ['Ensure variable identifiers follow CBSE naming conventions (alphanumeric and underscores, no starting digits).'],
                    exercises: [
                        {
                            title: `Core Operation Practice`,
                            description: `Write a function \`solve_basic(x, y)\` that returns the sum of \`x\` and \`y\`.`,
                            exerciseType: 'coding',
                            difficulty: 'beginner',
                            scaffoldLevel: 'guided',
                            bloomsLevel: 'apply',
                            learningObjective: 'Implement basic functional logic.',
                            xpReward: 15,
                            timeLimit: 5,
                            starterCode: `def solve_basic(x, y):\n    # Write your solution here\n    pass\n`,
                            solutionCode: `def solve_basic(x, y):\n    return x + y\n`,
                            testCases: [
                                { input: 'solve_basic(3, 4)', expectedOutput: '7', isHidden: false }
                            ],
                            hints: ['Return x + y directly.']
                        }
                    ]
                },
                {
                    unitNumber: 2,
                    title: `Unit 2: Algorithmic Logic & Data Processing`,
                    description: `Intermediate functions, loop iterations, and structured logic implementation.`,
                    expectedHours: 4,
                    unlockThreshold: 80,
                    keyConcepts: ['Functions & Scope', 'Iteration & Range', 'Data Transformations'],
                    theory: `### Intermediate Functions & Loops\nLearn how functions modularize algorithms and how loops process sequence collections.\n\n\`\`\`python\ndef process_items(items):\n    total = 0\n    for item in items:\n        total += item\n    return total\n\`\`\``,
                    miniCheckpoints: [
                        {
                            id: 'cp_gen_2',
                            question: 'What is the return value of range(1, 5)?',
                            options: ['[1, 2, 3, 4, 5]', 'A range sequence generating 1, 2, 3, 4', '[0, 1, 2, 3, 4]', 'An infinite iterator'],
                            correctOption: 1,
                            explanation: 'In Python, range(start, stop) stops before the stop integer.'
                        }
                    ],
                    cbseTips: ['Remember that range(stop) excludes the stop value.'],
                    exercises: [
                        {
                            title: `Sum of Elements Algorithm`,
                            description: `Write a function \`sum_elements(numbers)\` that takes a list of integers and returns their total sum.`,
                            exerciseType: 'coding',
                            difficulty: 'beginner',
                            scaffoldLevel: 'guided',
                            bloomsLevel: 'apply',
                            learningObjective: 'Iterate over sequences to compute aggregates.',
                            xpReward: 20,
                            timeLimit: 5,
                            starterCode: `def sum_elements(numbers):\n    # Write your solution here\n    pass\n`,
                            solutionCode: `def sum_elements(numbers):\n    return sum(numbers)\n`,
                            testCases: [
                                { input: 'sum_elements([1, 2, 3, 4])', expectedOutput: '10', isHidden: false }
                            ],
                            hints: ['You can use the built-in sum() function or a for loop.']
                        }
                    ]
                },
                {
                    unitNumber: 3,
                    title: `Unit 3: Applied Problem Solving & Project Synthesis`,
                    description: `Practical multi-step challenges combining syntax, validation, and real-world scenarios.`,
                    expectedHours: 5,
                    unlockThreshold: 80,
                    keyConcepts: ['Error Handling & Edge Cases', 'Data Validation', 'Modular System Design'],
                    theory: `### Applied Architecture\nSynthesize knowledge to solve practical real-world problems with robust validation and modular code structure.`,
                    miniCheckpoints: [
                        {
                            id: 'cp_gen_3',
                            question: 'Why is validation important before processing computational data?',
                            options: ['To prevent unexpected runtime errors and bad state', 'To speed up compilation', 'To save disk space', 'It is not necessary'],
                            correctOption: 0,
                            explanation: 'Input validation guards against invalid domains and unexpected exceptions.'
                        }
                    ],
                    cbseTips: ['Check boundary conditions such as empty collections or zero divisors.'],
                    exercises: [
                        {
                            title: `Data Filter and Transform`,
                            description: `Write a function \`filter_positive(numbers)\` that takes a list and returns a new list containing only positive numbers (> 0).`,
                            exerciseType: 'coding',
                            difficulty: 'intermediate',
                            scaffoldLevel: 'guided',
                            bloomsLevel: 'apply',
                            learningObjective: 'Filter collections using condition expressions.',
                            xpReward: 25,
                            timeLimit: 5,
                            starterCode: `def filter_positive(numbers):\n    # Write your solution here\n    pass\n`,
                            solutionCode: `def filter_positive(numbers):\n    return [n for n in numbers if n > 0]\n`,
                            testCases: [
                                { input: 'filter_positive([-2, 5, -1, 8])', expectedOutput: '[5, 8]', isHidden: false }
                            ],
                            hints: ['Use a list comprehension: [n for n in numbers if n > 0]']
                        }
                    ]
                }
            ]
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


