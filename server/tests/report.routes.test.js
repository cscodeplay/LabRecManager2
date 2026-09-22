const request = require('supertest');
const express = require('express');

// Mocks
const mockPrisma = {
    school: { findUnique: jest.fn() },
    user: { count: jest.fn(), findMany: jest.fn() },
    assignment: { count: jest.fn() },
    submission: { count: jest.fn() },
    grade: { aggregate: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    classEnrollment: { findMany: jest.fn() }
};

const mockReportService = {
    generateCustomReportData: jest.fn()
};

const mockReportEmailService = {
    sendCustomReportEmail: jest.fn()
};

jest.mock('../src/config/database', () => mockPrisma);
jest.mock('../src/services/report.service', () => mockReportService);
jest.mock('../src/services/report.email.service', () => mockReportEmailService);

// Mock Auth Middleware to simulate authenticated Admin
let mockUser = {
    id: 'user-admin-1',
    role: 'admin',
    schoolId: 'school-1'
};
let mockAuthFail = false;

jest.mock('../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
        if (mockAuthFail) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        req.user = mockUser;
        next();
    },
    authorize: (...roles) => (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        next();
    }
}));

const reportRoutes = require('../src/routes/report.routes');

// Setup test express application
const app = express();
app.use(express.json());
app.use('/api/reports', reportRoutes);

describe('Report Routes (report.routes.js)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUser = { id: 'user-admin-1', role: 'admin', schoolId: 'school-1' };
        mockAuthFail = false;
    });

    describe('POST /api/reports/send-email', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockAuthFail = true;

            const res = await request(app)
                .post('/api/reports/send-email')
                .send({ to: 'charan881130@gmail.com' });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return 403 when user role is not authorized (e.g. student)', async () => {
            mockUser = { id: 'usr-student', role: 'student', schoolId: 'school-1' };

            const res = await request(app)
                .post('/api/reports/send-email')
                .send({ to: 'charan881130@gmail.com' });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when recipient email (to) is missing', async () => {
            const res = await request(app)
                .post('/api/reports/send-email')
                .send({
                    subject: 'Test Report'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Recipient email address (to) is required');
        });

        it('should successfully compile and dispatch report email when valid data is provided', async () => {
            mockPrisma.school.findUnique.mockResolvedValueOnce({ name: 'Delhi Public School' });
            mockReportEmailService.sendCustomReportEmail.mockResolvedValueOnce({
                id: 'msg_98765',
                status: 'delivered'
            });

            const payload = {
                to: 'charan881130@gmail.com',
                subject: 'Weekly Academic Report',
                message: 'Attached is the weekly report.',
                reportTitle: 'Weekly Academic Report',
                reportResults: {
                    students: { title: 'Students', rows: [{ Name: 'Test Student' }] }
                },
                formats: { xlsx: true, csv: true }
            };

            const res = await request(app)
                .post('/api/reports/send-email')
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Report successfully dispatched to charan881130@gmail.com');
            expect(mockReportEmailService.sendCustomReportEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'charan881130@gmail.com',
                    subject: 'Weekly Academic Report',
                    reportTitle: 'Weekly Academic Report',
                    schoolName: 'Delhi Public School',
                    formats: { xlsx: true, csv: true }
                })
            );
        });

        it('should auto-generate report data if reportResults is omitted', async () => {
            mockPrisma.school.findUnique.mockResolvedValueOnce({ name: 'Residential School' });
            mockReportService.generateCustomReportData.mockResolvedValueOnce({
                reportResults: {
                    lab_pcs: { title: 'Lab PCs', rows: [{ PC: 'PC-01' }] }
                }
            });
            mockReportEmailService.sendCustomReportEmail.mockResolvedValueOnce({
                id: 'msg_11223'
            });

            const res = await request(app)
                .post('/api/reports/send-email')
                .send({
                    to: 'charan881130@gmail.com',
                    entities: ['lab_pcs'],
                    selectedColumns: { lab_pcs: ['itemNumber'] }
                });

            expect(res.status).toBe(200);
            expect(mockReportService.generateCustomReportData).toHaveBeenCalledTimes(1);
            expect(mockReportEmailService.sendCustomReportEmail).toHaveBeenCalledTimes(1);
        });

        it('should return 500 when email service encounters a failure', async () => {
            mockPrisma.school.findUnique.mockResolvedValueOnce({ name: 'Residential School' });
            mockReportEmailService.sendCustomReportEmail.mockRejectedValueOnce(
                new Error('SMTP/Resend connection timeout')
            );

            const res = await request(app)
                .post('/api/reports/send-email')
                .send({
                    to: 'charan881130@gmail.com',
                    reportResults: { test: { rows: [] } }
                });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('SMTP/Resend connection timeout');
        });
    });

    describe('GET /api/reports/analytics', () => {
        it('should return analytics metrics successfully', async () => {
            mockPrisma.user.count.mockResolvedValueOnce(120); // total students
            mockPrisma.assignment.count.mockResolvedValueOnce(10); // total assignments
            mockPrisma.submission.count
                .mockResolvedValueOnce(80) // total submissions
                .mockResolvedValueOnce(75); // graded submissions
            mockPrisma.grade.aggregate.mockResolvedValueOnce({
                _avg: { percentage: 78.5 },
                _min: { percentage: 45 },
                _max: { percentage: 98 }
            });
            mockPrisma.grade.findMany.mockResolvedValueOnce([
                { gradeLetter: 'A' },
                { gradeLetter: 'A' },
                { gradeLetter: 'B' }
            ]);
            mockPrisma.grade.groupBy.mockResolvedValueOnce([
                { studentId: 'std-1', _avg: { percentage: 95 } }
            ]);
            mockPrisma.user.findMany.mockResolvedValueOnce([
                {
                    id: 'std-1',
                    firstName: 'Top',
                    lastName: 'Performer',
                    studentId: '101',
                    admissionNumber: '101',
                    email: 'top@school.edu',
                    submissions: [{ grade: { percentage: 95 } }]
                }
            ]);

            const res = await request(app)
                .get('/api/reports/analytics?dateRange=month');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.totalStudents).toBe(120);
            expect(res.body.data.totalAssignments).toBe(10);
            expect(res.body.data.avgScore).toBe(79);
            expect(res.body.data.topPerformers.length).toBeGreaterThanOrEqual(1);
        });
    });
});
