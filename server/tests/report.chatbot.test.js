/**
 * Chatbot Conversational Report Intent & Emailing Test Suite
 * Validates conversational parsing of natural language report requests
 * and automated email dispatch parameters.
 */

describe('AI Bot Conversational Report Generation & Email Dispatch', () => {
    // Helper function reproducing chatbot report intent extraction logic
    function parseChatbotReportAction(message, aiText = '') {
        const msgLower = (message || '').toLowerCase();
        let reportAction = null;

        // 1. Check for explicit AI tag
        const reportMatch = aiText.match(/<!--REPORT_ACTION:([\s\S]*?):END_REPORT-->/);
        if (reportMatch) {
            try {
                reportAction = JSON.parse(reportMatch[1].trim());
            } catch (e) {
                // parse error
            }
            aiText = aiText.replace(/<!--REPORT_ACTION:[\s\S]*?:END_REPORT-->/g, '').trim();
        }

        // 2. Intent fallback if not tagged
        const isTemplateOrImport = msgLower.includes('template') || msgLower.includes('import') || msgLower.includes('upload');
        const isReportIntent = !isTemplateOrImport && (
            msgLower.includes('report') || msgLower.includes('pdf') ||
            msgLower.includes('excel') || msgLower.includes('csv') ||
            msgLower.includes('xlsx') || (msgLower.includes('email') && (msgLower.includes('student') || msgLower.includes('class') || msgLower.includes('assignment') || msgLower.includes('inventory') || msgLower.includes('hardware')))
        );

        if (!reportAction && isReportIntent) {
            const entities = [];
            if (msgLower.includes('student') || msgLower.includes('girl') || msgLower.includes('boy') || msgLower.includes('attendance') || msgLower.includes('roster')) entities.push('students');
            if (msgLower.includes('group')) entities.push('groups');
            if (msgLower.includes('class') || msgLower.includes('section')) entities.push('classes');
            if (msgLower.includes('assignment') || msgLower.includes('score') || msgLower.includes('marks') || msgLower.includes('grade')) entities.push('assignments');
            if (msgLower.includes('pc') || msgLower.includes('lab') || msgLower.includes('computer') || msgLower.includes('inventory') || msgLower.includes('equipment') || msgLower.includes('item') || msgLower.includes('hardware')) entities.push('lab_pcs');

            if (entities.length === 0) entities.push('students');

            const filters = {};
            if (msgLower.includes('girl') || msgLower.includes('female')) filters.gender = 'female';
            else if (msgLower.includes('boy') || msgLower.includes('male')) filters.gender = 'male';

            let format = 'xlsx';
            if (msgLower.includes('pdf')) format = 'pdf';
            else if (msgLower.includes('csv')) format = 'csv';

            reportAction = { entities, filters, format };
        }

        // 3. Email recipient extraction
        let targetEmail = null;
        if (reportAction) {
            const emailInMsgMatch = message.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
            if (reportAction.emailTo && reportAction.emailTo !== 'me') {
                targetEmail = reportAction.emailTo;
            } else if (emailInMsgMatch) {
                targetEmail = emailInMsgMatch[1];
            }
        }

        return {
            cleanAiText: aiText,
            reportAction,
            targetEmail
        };
    }

    it('should detect natural language report prompt and extract target email', () => {
        const prompt = 'Generate the assignment report for Class 10-A and email it to charan881130@gmail.com';
        const parsed = parseChatbotReportAction(prompt);

        expect(parsed.reportAction).toBeDefined();
        expect(parsed.reportAction.entities).toContain('assignments');
        expect(parsed.reportAction.entities).toContain('classes');
        expect(parsed.targetEmail).toBe('charan881130@gmail.com');
        expect(parsed.reportAction.format).toBe('xlsx');
    });

    it('should identify lab PC hardware inventory report requests', () => {
        const prompt = 'Show me the computer lab PC hardware inventory report in excel';
        const parsed = parseChatbotReportAction(prompt);

        expect(parsed.reportAction).toBeDefined();
        expect(parsed.reportAction.entities).toContain('lab_pcs');
        expect(parsed.reportAction.format).toBe('xlsx');
        expect(parsed.targetEmail).toBeNull();
    });

    it('should extract gender filters and recipient email for student rosters', () => {
        const prompt = 'Email the female students roster report in PDF format to principal@dps.edu';
        const parsed = parseChatbotReportAction(prompt);

        expect(parsed.reportAction).toBeDefined();
        expect(parsed.reportAction.entities).toContain('students');
        expect(parsed.reportAction.filters.gender).toBe('female');
        expect(parsed.reportAction.format).toBe('pdf');
        expect(parsed.targetEmail).toBe('principal@dps.edu');
    });

    it('should parse explicit AI REPORT_ACTION tag and strip it from user visible text', () => {
        const aiResponse = `Here is your requested institutional summary.
<!--REPORT_ACTION:{"entities":["students","groups"],"filters":{"gender":"all"},"format":"xlsx","emailTo":"charan881130@gmail.com","reportTitle":"Comprehensive Roster"}:END_REPORT-->
All files have been compiled and sent.`;

        const parsed = parseChatbotReportAction('Please send report', aiResponse);

        expect(parsed.cleanAiText).not.toContain('<!--REPORT_ACTION:');
        expect(parsed.cleanAiText).toContain('Here is your requested institutional summary.');
        expect(parsed.cleanAiText).toContain('All files have been compiled and sent.');
        expect(parsed.reportAction.entities).toEqual(['students', 'groups']);
        expect(parsed.targetEmail).toBe('charan881130@gmail.com');
    });

    it('should ignore non-report requests like CSV file import or upload templates', () => {
        const prompt = 'How do I upload a template or import students via CSV?';
        const parsed = parseChatbotReportAction(prompt);

        expect(parsed.reportAction).toBeNull();
    });
});
