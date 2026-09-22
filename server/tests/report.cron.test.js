const { getInstitutionalReportRecipients, dispatchAutomatedReport } = require('../src/services/cron.service');
const prisma = require('../src/config/database');
const reportService = require('../src/services/report.service');
const reportEmailService = require('../src/services/report.email.service');

// Mocks
jest.mock('../src/config/database', () => ({
    user: { findMany: jest.fn() },
    school: { findMany: jest.fn() },
    academicYear: { findFirst: jest.fn() },
    meeting: { findMany: jest.fn(), update: jest.fn() },
    schoolCalendar: { findMany: jest.fn() },
    timetableSlot: { findMany: jest.fn() }
}));

jest.mock('../src/services/report.service', () => ({
    generateCustomReportData: jest.fn()
}));

jest.mock('../src/services/report.email.service', () => ({
    sendCustomReportEmail: jest.fn()
}));

describe('Automated Institutional Cron Reporting (cron.service.js)', () => {
    const originalEnv = process.env.SMTP_ADMIN_EMAIL;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SMTP_ADMIN_EMAIL = 'charan881130@gmail.com';
    });

    afterAll(() => {
        process.env.SMTP_ADMIN_EMAIL = originalEnv;
    });

    describe('getInstitutionalReportRecipients', () => {
        it('should return deduplicated list of active DB admins/principals and SMTP_ADMIN_EMAIL', async () => {
            prisma.user.findMany.mockResolvedValueOnce([
                { email: 'admin@dps.edu' },
                { email: 'principal@dps.edu' },
                { email: 'charan881130@gmail.com' } // already in DB
            ]);

            const recipients = await getInstitutionalReportRecipients('school-1');

            expect(prisma.user.findMany).toHaveBeenCalledWith({
                where: {
                    role: { in: ['admin', 'principal'] },
                    isActive: true,
                    schoolId: 'school-1'
                },
                select: { email: true }
            });

            expect(recipients).toContain('admin@dps.edu');
            expect(recipients).toContain('principal@dps.edu');
            expect(recipients).toContain('charan881130@gmail.com');
            // Ensure deduplication
            expect(recipients.filter(r => r === 'charan881130@gmail.com').length).toBe(1);
        });

        it('should fallback to SMTP_ADMIN_EMAIL if database query errors', async () => {
            prisma.user.findMany.mockRejectedValueOnce(new Error('DB Timeout'));

            const recipients = await getInstitutionalReportRecipients('school-1');
            expect(recipients).toEqual(['charan881130@gmail.com']);
        });
    });

    describe('dispatchAutomatedReport', () => {
        it('should compile and dispatch report email for each school to verified recipients', async () => {
            prisma.school.findMany.mockResolvedValueOnce([
                { id: 'school-101', name: 'Meritorious Residential School' }
            ]);

            prisma.user.findMany.mockResolvedValueOnce([
                { email: 'admin@meritorious.edu' }
            ]);

            prisma.academicYear.findFirst.mockResolvedValueOnce({
                id: 'sess-2026-27'
            });

            reportService.generateCustomReportData.mockResolvedValueOnce({
                reportResults: {
                    students: { title: 'Students', rows: [{ Name: 'Student 1' }] },
                    assignments: { title: 'Assignments', rows: [{ Title: 'Physics Lab 1' }] }
                }
            });

            reportEmailService.sendCustomReportEmail.mockResolvedValueOnce({
                id: 'msg_cron_001',
                status: 'delivered'
            });

            await dispatchAutomatedReport({
                reportKey: 'weekly-academic-digest',
                title: 'Weekly Academic Performance Digest',
                entities: ['students', 'assignments'],
                filters: { dateRange: 'week' },
                note: 'Official weekly digest.'
            });

            expect(prisma.school.findMany).toHaveBeenCalled();
            expect(reportService.generateCustomReportData).toHaveBeenCalledWith({
                entities: ['students', 'assignments'],
                filters: { dateRange: 'week' },
                schoolId: 'school-101',
                sessionId: 'sess-2026-27'
            });

            expect(reportEmailService.sendCustomReportEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: expect.arrayContaining(['admin@meritorious.edu', 'charan881130@gmail.com']),
                    subject: '[Automated Report] Weekly Academic Performance Digest - Meritorious Residential School',
                    reportTitle: 'Weekly Academic Performance Digest',
                    schoolName: 'Meritorious Residential School'
                })
            );
        });
    });
});
