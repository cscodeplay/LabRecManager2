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
    "suggestedSubject": "Computer Science" or detected subject name
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
            const geminiModels = ['gemini-3.6-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
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
    "suggestedSubject": "Computer Science"
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
            const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
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
            const geminiModels = ['gemini-3.6-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
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
  "dueDateHoursFromNow": 24 (default 24 unless prompt specifies custom timeframe e.g. "due in 3 days" = 72)
}

RULES:
1. Match Class names liberally e.g. "XII COM-A", "12 COM A", "12A" should match matching grade/section/name in Classes list.
2. ONLY set publishImmediately to true if the prompt EXPLICITLY asks to "publish" or "assign". Otherwise, default to false.
3. ONLY populate matchedClassIds, matchedGroupIds, or matchedStudentIds if the prompt EXPLICITLY mentions them (e.g. "assign to Class X", "assign to student Y", or "assign to all students"). If no assignment target is mentioned, leave all arrays empty []. If "all students" is mentioned, include the IDs of all students or the appropriate global class.
4. Default selectedSubjectId to the Computer Science subject ID if found in Subjects list, unless request specifies another subject.
5. Default dueDateHoursFromNow to 24 unless specified in request.
6. Output MUST be valid JSON only.`;

        // 1. Try Groq (Primary)
        if ((preferredProvider === 'groq' || preferredProvider === 'auto') && this.groq) {
            const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
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
            const geminiModels = ['gemini-3.6-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
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
            const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
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
            const geminiModels = ['gemini-3.6-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
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
