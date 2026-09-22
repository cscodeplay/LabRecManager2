const XLSX = require('xlsx');
const reportEmailService = require('../src/services/report.email.service');
const emailService = require('../src/services/email.service');

// Mock emailService to prevent real network dispatch during tests
jest.mock('../src/services/email.service', () => ({
    sendImplementationReport: jest.fn().mockResolvedValue({
        id: 'msg_test_123',
        status: 'sent',
        to: ['charan881130@gmail.com']
    })
}));

describe('Report Email Service (report.email.service.js)', () => {
    const mockReportResults = {
        students: {
            title: 'Students & Roster Report',
            count: 2,
            rows: [
                { 'Admission ID': '7947459', 'Student Name': 'Shruti Sharma', 'Enrolled Class': 'Class 10-A', 'Average Score (%)': '90.0' },
                { 'Admission ID': '7167067', 'Student Name': 'Ritika Yadav', 'Enrolled Class': 'Class 10-A', 'Average Score (%)': '88.5' }
            ]
        },
        classes: {
            title: 'Classes & Sections Report',
            count: 1,
            rows: [
                { 'Class Name': 'Class 10-A', 'Grade Level': '10', 'Section': 'A', 'Total Students': 30 }
            ]
        },
        lab_pcs: {
            title: 'Lab PCs & Inventory Report',
            count: 2,
            rows: [
                { 'PC Number': 'PC-01', 'Lab Location': 'Computer Lab 1', 'PC Status': 'active', 'Assigned Group': 'Group Alpha' },
                { 'PC Number': 'PC-02', 'Lab Location': 'Computer Lab 1', 'PC Status': 'maintenance', 'Assigned Group': 'Unassigned' }
            ]
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateReportExcelBuffer', () => {
        it('should generate a valid multi-sheet Excel (.xlsx) buffer', () => {
            const buffer = reportEmailService.generateReportExcelBuffer(mockReportResults);
            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.length).toBeGreaterThan(0);

            // Verify with XLSX reader
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            expect(workbook.SheetNames.length).toBe(3);

            // Read the students sheet
            const studentsSheet = workbook.Sheets[workbook.SheetNames[0]];
            const studentsJson = XLSX.utils.sheet_to_json(studentsSheet);
            expect(studentsJson.length).toBe(2);
            expect(studentsJson[0]['Student Name']).toBe('Shruti Sharma');
            expect(studentsJson[1]['Admission ID']).toBe('7167067');

            // Read the lab_pcs sheet
            const pcSheet = workbook.Sheets[workbook.SheetNames[2]];
            const pcJson = XLSX.utils.sheet_to_json(pcSheet);
            expect(pcJson.length).toBe(2);
            expect(pcJson[0]['PC Number']).toBe('PC-01');
        });

        it('should sanitize sheet names that contain invalid Excel characters and handle length > 30 chars', () => {
            const specialResults = {
                special: {
                    title: 'Reports/Special:Characters*[Test]?TitleWithExtremelyLongNameToExceedExcelLimit',
                    rows: [{ Key: 'Value' }]
                }
            };

            const buffer = reportEmailService.generateReportExcelBuffer(specialResults);
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            const sheetName = workbook.SheetNames[0];
            expect(sheetName.length).toBeLessThanOrEqual(31);
            expect(sheetName).not.toMatch(/[\\/?*[\]:]/);
        });

        it('should provide a Summary sheet when report results contain no rows', () => {
            const emptyResults = {
                students: { title: 'Students', rows: [] }
            };

            const buffer = reportEmailService.generateReportExcelBuffer(emptyResults);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            expect(workbook.SheetNames).toContain('Summary');

            const summarySheet = workbook.Sheets['Summary'];
            const json = XLSX.utils.sheet_to_json(summarySheet);
            expect(json[0].Note).toContain('No records found');
        });

        it('should throw an error when passed invalid input', () => {
            expect(() => reportEmailService.generateReportExcelBuffer(null)).toThrow('Invalid report results');
            expect(() => reportEmailService.generateReportExcelBuffer('invalid')).toThrow('Invalid report results');
        });
    });

    describe('generateReportCsvBuffer', () => {
        it('should generate valid CSV buffer prioritizing unified view if present', () => {
            const resultsWithUnified = {
                ...mockReportResults,
                unified: {
                    title: 'Unified Master Report',
                    rows: [
                        { 'Student Name': 'Shruti Sharma', 'Enrolled Class': 'Class 10-A', 'PC Number': 'PC-01' }
                    ]
                }
            };

            const buffer = reportEmailService.generateReportCsvBuffer(resultsWithUnified);
            expect(buffer).toBeInstanceOf(Buffer);

            const csvString = buffer.toString('utf-8');
            expect(csvString).toContain('Student Name');
            expect(csvString).toContain('Enrolled Class');
            expect(csvString).toContain('Shruti Sharma');
            expect(csvString).toContain('PC-01');
        });

        it('should fall back to primary entity when unified view is not present', () => {
            const buffer = reportEmailService.generateReportCsvBuffer(mockReportResults);
            const csvString = buffer.toString('utf-8');
            expect(csvString).toContain('Admission ID');
            expect(csvString).toContain('Shruti Sharma');
        });

        it('should return a fallback buffer when report results are empty', () => {
            const buffer = reportEmailService.generateReportCsvBuffer({});
            expect(buffer.toString('utf-8')).toBe('No data');
        });
    });

    describe('generateReportEmailHtml', () => {
        it('should render complete responsive HTML template with branding and summary cards', () => {
            const html = reportEmailService.generateReportEmailHtml({
                title: 'Weekly Academic Performance Digest',
                message: 'Please review the attached academic report.',
                reportResults: mockReportResults,
                schoolName: 'Senior Secondary Residential School'
            });

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('Weekly Academic Performance Digest');
            expect(html).toContain('Senior Secondary Residential School');
            expect(html).toContain('Please review the attached academic report.');
            expect(html).toContain('Admin Note:');

            // Entity count cards
            expect(html).toContain('Students & Roster Report');
            expect(html).toContain('records compiled');

            // Preview table
            expect(html).toContain('Sample Preview:');
            expect(html).toContain('Shruti Sharma');
            expect(html).toContain('Official Data Attachments Included');
        });
    });

    describe('sendCustomReportEmail', () => {
        it('should throw an error if recipient email is missing', async () => {
            await expect(reportEmailService.sendCustomReportEmail({
                to: '',
                reportTitle: 'Test'
            })).rejects.toThrow('Recipient email address is required');
        });

        it('should compile .xlsx and invoke emailService.sendImplementationReport by default', async () => {
            const result = await reportEmailService.sendCustomReportEmail({
                to: 'charan881130@gmail.com',
                subject: 'Institutional Performance Report',
                message: 'Monthly report for review.',
                reportTitle: 'Monthly Performance',
                reportResults: mockReportResults,
                schoolName: 'DPS Mathura',
                formats: { xlsx: true, csv: false }
            });

            expect(emailService.sendImplementationReport).toHaveBeenCalledTimes(1);
            const callArgs = emailService.sendImplementationReport.mock.calls[0][0];

            expect(callArgs.to).toBe('charan881130@gmail.com');
            expect(callArgs.subject).toBe('Institutional Performance Report');
            expect(callArgs.message).toBe('Monthly report for review.');
            expect(callArgs.attachments.length).toBe(1);
            expect(callArgs.attachments[0].filename).toMatch(/Monthly_Performance_.*\.xlsx/);
            expect(callArgs.attachments[0].contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            expect(result.status).toBe('sent');
        });

        it('should include both .xlsx and .csv attachments when requested', async () => {
            await reportEmailService.sendCustomReportEmail({
                to: ['charan881130@gmail.com', 'admin@dps.edu'],
                reportTitle: 'Lab Audit',
                reportResults: mockReportResults,
                formats: { xlsx: true, csv: true }
            });

            const callArgs = emailService.sendImplementationReport.mock.calls[0][0];
            expect(callArgs.to).toBe('charan881130@gmail.com, admin@dps.edu');
            expect(callArgs.attachments.length).toBe(2);
            expect(callArgs.attachments.some(a => a.filename.endsWith('.xlsx'))).toBe(true);
            expect(callArgs.attachments.some(a => a.filename.endsWith('.csv'))).toBe(true);
        });
    });
});
