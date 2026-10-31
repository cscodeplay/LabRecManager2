const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const prisma = require('../config/database');

const WORKSPACES_DIR = path.join(__dirname, '../../storage/workspaces/students');

class StudentCodeReviewService {
    constructor() {
        this.genAI = null;
        this.groq = null;
        this.initAi();
    }

    initAi() {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            this.genAI = new GoogleGenerativeAI(geminiKey);
        }
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            this.groq = new Groq({ apiKey: groqKey });
        }
    }

    getStudentDir(studentId) {
        return path.join(WORKSPACES_DIR, String(studentId));
    }

    getReviewFilePath(studentId) {
        return path.join(this.getStudentDir(studentId), 'reviews.json');
    }

    getWorkspaceFilePath(studentId) {
        return path.join(this.getStudentDir(studentId), 'workspace.json');
    }

    /**
     * Get review history for a student
     */
    getStudentReviewData(studentId) {
        const filePath = this.getReviewFilePath(studentId);
        if (fs.existsSync(filePath)) {
            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(raw);
            } catch (e) {
                console.error(`[CodeReview] Error reading reviews for ${studentId}:`, e.message);
            }
        }
        return { latestReview: null, history: [] };
    }

    /**
     * Save an instructor manual review or approved AI review
     */
    saveStudentReview(studentId, reviewData, reviewerUser = null) {
        const dir = this.getStudentDir(studentId);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const currentData = this.getStudentReviewData(studentId);
        const reviewEntry = {
            id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            rating: Math.max(1, Math.min(5, parseInt(reviewData.rating, 10) || 5)),
            status: reviewData.status || 'reviewed', // 'reviewed' | 'needs_improvement' | 'excellent'
            comments: reviewData.comments || '',
            suggestions: Array.isArray(reviewData.suggestions) ? reviewData.suggestions.filter(Boolean) : [],
            reviewedBy: reviewData.reviewedBy || (reviewerUser ? `${reviewerUser.firstName || ''} ${reviewerUser.lastName || ''}`.trim() || reviewerUser.email : 'Instructor'),
            reviewerId: reviewerUser?.id || null,
            reviewedAt: new Date().toISOString(),
            isAiGenerated: Boolean(reviewData.isAiGenerated)
        };

        const updatedData = {
            latestReview: reviewEntry,
            history: [reviewEntry, ...(currentData.history || [])].slice(0, 20)
        };

        const reviewFilePath = this.getReviewFilePath(studentId);
        fs.writeFileSync(reviewFilePath, JSON.stringify(updatedData, null, 2), 'utf8');

        // Also update the workspace.json summary field
        const workspacePath = this.getWorkspaceFilePath(studentId);
        if (fs.existsSync(workspacePath)) {
            try {
                const ws = JSON.parse(fs.readFileSync(workspacePath, 'utf8'));
                ws.latestReview = reviewEntry;
                fs.writeFileSync(workspacePath, JSON.stringify(ws, null, 2), 'utf8');
            } catch (_) {}
        }

        return reviewEntry;
    }

    /**
     * Generate AI Code Review using Gemini with fallback to Groq or rule-based heuristics
     */
    async generateAiReview({ studentName = 'Student', files = [], existingTables = [] }) {
        if (!files || files.length === 0) {
            return {
                rating: 3,
                status: 'needs_improvement',
                comments: 'No active code files found in student workspace to review.',
                suggestions: ['Create and run at least one Python or SQL script to begin code review evaluation.'],
                isAiGenerated: true
            };
        }

        const filesSummary = files.map((f, i) => {
            const title = f.name || `Tab ${i + 1}`;
            const lang = f.language || 'python';
            const code = (f.code || '').trim();
            return `--- FILE: ${title} (${lang}) ---\n${code.substring(0, 3000)}`;
        }).join('\n\n');

        const prompt = `You are a distinguished Computer Science Professor and Code Review Mentor evaluating student coding lab work.
Analyze the following student code submissions thoroughly and return a constructive, pedagogically sound code review.

STUDENT NAME: ${studentName}
DATABASE TABLES CREATED: ${existingTables.join(', ') || 'None'}

CODE ARTIFACTS:
${filesSummary}

EVALUATION CRITERIA:
1. Logic, Correctness & Syntax: Does the code work as intended? Are there syntax errors or runtime exceptions?
2. Algorithmic Efficiency & Complexity: Evaluate Time and Space Complexity (Big-O notation).
3. Code Cleanliness & Best Practices: PEP 8 guidelines for Python, SQL schema design, indentation, meaningful variable names.
4. Edge Cases: Handles empty inputs, zero division, boundaries, constraints.

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following structure (no markdown wrappers, no backticks):
{
  "rating": <integer from 1 to 5, where 1=Poor/Broken, 3=Average/Needs Work, 4=Good, 5=Excellent>,
  "status": "<one of 'needs_improvement', 'reviewed', 'excellent'>",
  "summary": "<2-3 concise paragraphs reviewing code quality, structure, and algorithmic thinking>",
  "complexityAnalysis": "<short explanation of time and space complexity, e.g. O(n) time, O(1) auxiliary space>",
  "suggestions": [
    "<actionable suggestion 1>",
    "<actionable suggestion 2>",
    "<actionable suggestion 3>"
  ]
}`;

        // 1. Try Gemini
        if (this.genAI) {
            const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.7-flash'];
            for (const modelName of models) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text().trim();
                    const parsed = this.parseAiJsonResponse(text);
                    if (parsed) {
                        return {
                            rating: parsed.rating || 4,
                            status: parsed.status || (parsed.rating >= 4 ? 'reviewed' : 'needs_improvement'),
                            comments: `${parsed.summary || ''}\n\n**Complexity Analysis:** ${parsed.complexityAnalysis || 'Standard'}`.trim(),
                            suggestions: parsed.suggestions || [],
                            isAiGenerated: true
                        };
                    }
                } catch (e) {
                    console.warn(`[CodeReview] Gemini ${modelName} error:`, e.message);
                }
            }
        }

        // 2. Try Groq
        if (this.groq) {
            try {
                const completion = await this.groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'llama-3.3-70b-versatile',
                    temperature: 0.3
                });
                const text = completion.choices[0]?.message?.content?.trim();
                const parsed = this.parseAiJsonResponse(text);
                if (parsed) {
                    return {
                        rating: parsed.rating || 4,
                        status: parsed.status || (parsed.rating >= 4 ? 'reviewed' : 'needs_improvement'),
                        comments: `${parsed.summary || ''}\n\n**Complexity Analysis:** ${parsed.complexityAnalysis || 'Standard'}`.trim(),
                        suggestions: parsed.suggestions || [],
                        isAiGenerated: true
                    };
                }
            } catch (e) {
                console.warn('[CodeReview] Groq error:', e.message);
            }
        }

        // 3. Fallback heuristic review if both AI APIs are unavailable or network down
        return this.generateHeuristicReview(files);
    }

    parseAiJsonResponse(text) {
        if (!text) return null;
        try {
            let clean = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                clean = clean.substring(start, end + 1);
            }
            return JSON.parse(clean);
        } catch (e) {
            return null;
        }
    }

    generateHeuristicReview(files) {
        const totalLines = files.reduce((acc, f) => acc + (f.code ? f.code.split('\n').length : 0), 0);
        const hasSql = files.some(f => f.language === 'sql');
        const hasPy = files.some(f => f.language === 'python');

        const suggestions = [];
        if (hasPy) {
            suggestions.push('Add type annotations and descriptive docstrings to all Python functions.');
            suggestions.push('Implement input validation checks for edge cases such as empty values.');
        }
        if (hasSql) {
            suggestions.push('Ensure primary keys and foreign key constraints are explicitly indexed.');
            suggestions.push('Test queries with sample datasets using EXPLAIN to inspect query plan performance.');
        }
        suggestions.push('Maintain consistent indentation and clean naming conventions across all modules.');

        return {
            rating: totalLines > 25 ? 4 : 3,
            status: totalLines > 25 ? 'reviewed' : 'needs_improvement',
            comments: `Code review evaluated across ${files.length} practice tab(s) (${totalLines} total lines of code). The implementation shows logical problem formulation. Review the suggestions below to enhance robustness and efficiency.`,
            suggestions,
            isAiGenerated: true
        };
    }

    /**
     * Get Enriched Student Inspection Directory
     */
    async getStudentsInspectionList({ schoolId = null }) {
        const students = await prisma.user.findMany({
            where: {
                role: 'student',
                isActive: true,
                ...(schoolId ? { schoolId } : {})
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                admissionNumber: true,
                studentId: true,
                classEnrollments: {
                    select: {
                        rollNumber: true,
                        class: {
                            select: { id: true, name: true, section: true }
                        }
                    },
                    take: 1
                }
            },
            orderBy: { firstName: 'asc' },
            take: 200
        });

        const list = students.map((s) => {
            const studentId = s.id;
            const dir = this.getStudentDir(studentId);
            const workspaceFile = this.getWorkspaceFilePath(studentId);
            const reviewFile = this.getReviewFilePath(studentId);

            let hasWorkspace = false;
            let updatedAt = null;
            let tabsCount = 0;
            let languages = [];
            let activeTabTitle = '';

            if (fs.existsSync(workspaceFile)) {
                hasWorkspace = true;
                try {
                    const ws = JSON.parse(fs.readFileSync(workspaceFile, 'utf8'));
                    updatedAt = ws.updatedAt || null;
                    if (Array.isArray(ws.tabs)) {
                        tabsCount = ws.tabs.length;
                        const langSet = new Set(ws.tabs.map(t => t.language).filter(Boolean));
                        languages = Array.from(langSet);
                        const active = ws.tabs.find(t => t.id === ws.activeTabId) || ws.tabs[0];
                        if (active) activeTabTitle = active.name;
                    }
                } catch (_) {}
            }

            let reviewData = { latestReview: null };
            if (fs.existsSync(reviewFile)) {
                try {
                    reviewData = JSON.parse(fs.readFileSync(reviewFile, 'utf8'));
                } catch (_) {}
            }

            const latestReview = reviewData.latestReview || null;

            const enrollment = s.classEnrollments[0];
            const className = enrollment?.class?.name 
                ? `${enrollment.class.name}${enrollment.class.section ? ` - ${enrollment.class.section}` : ''}`
                : 'General';

            return {
                id: s.id,
                name: `${s.firstName} ${s.lastName || ''}`.trim(),
                email: s.email,
                admissionNumber: s.admissionNumber || s.studentId || 'N/A',
                rollNumber: enrollment?.rollNumber || 'N/A',
                className,
                classId: enrollment?.class?.id || null,
                hasWorkspace,
                updatedAt,
                tabsCount,
                languages,
                activeTabTitle,
                reviewStatus: latestReview ? latestReview.status : (hasWorkspace ? 'unreviewed' : 'no_activity'),
                latestRating: latestReview ? latestReview.rating : null,
                latestReviewedAt: latestReview ? latestReview.reviewedAt : null,
                latestReviewedBy: latestReview ? latestReview.reviewedBy : null
            };
        });

        // Sort: Active workspaces first, most recently updated first
        list.sort((a, b) => {
            if (a.updatedAt && b.updatedAt) {
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
            if (a.updatedAt) return -1;
            if (b.updatedAt) return 1;
            return a.name.localeCompare(b.name);
        });

        return list;
    }

    /**
     * Run Bulk AI Code Reviews across multiple students
     */
    async runBulkAiReview(studentIds = [], reviewerUser = null) {
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            throw new Error('No student IDs provided for bulk review');
        }

        const results = [];
        let successCount = 0;
        let failedCount = 0;

        for (const studentId of studentIds) {
            try {
                const workspacePath = this.getWorkspaceFilePath(studentId);
                if (!fs.existsSync(workspacePath)) {
                    failedCount++;
                    results.push({ studentId, success: false, reason: 'No workspace code found' });
                    continue;
                }

                const ws = JSON.parse(fs.readFileSync(workspacePath, 'utf8'));
                const files = Array.isArray(ws.tabs) && ws.tabs.length > 0
                    ? ws.tabs.map(t => ({ name: t.name, language: t.language, code: t.code }))
                    : [
                        { name: 'Python Code', language: 'python', code: ws.pythonCode || '' },
                        { name: 'SQL Code', language: 'sql', code: ws.sqlCode || '' }
                    ].filter(f => Boolean(f.code));

                // Fetch student name
                const student = await prisma.user.findUnique({
                    where: { id: studentId },
                    select: { firstName: true, lastName: true }
                });
                const studentName = student ? `${student.firstName} ${student.lastName || ''}`.trim() : 'Student';

                const aiReview = await this.generateAiReview({
                    studentName,
                    files,
                    existingTables: []
                });

                const saved = this.saveStudentReview(studentId, {
                    ...aiReview,
                    reviewedBy: reviewerUser ? `AI (Bulk by ${reviewerUser.firstName || 'Instructor'})` : 'AI Reviewer'
                }, reviewerUser);

                successCount++;
                results.push({
                    studentId,
                    studentName,
                    success: true,
                    review: saved
                });
            } catch (err) {
                failedCount++;
                results.push({
                    studentId,
                    success: false,
                    reason: err.message
                });
            }
        }

        return {
            total: studentIds.length,
            successCount,
            failedCount,
            results
        };
    }
}

module.exports = new StudentCodeReviewService();
