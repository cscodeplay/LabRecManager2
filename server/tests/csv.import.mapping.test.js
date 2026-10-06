/**
 * Unit & Integration Tests for CSV Column Mapping, Unique Email Generation,
 * User Creation Guarantee, and Comma-Separated Address Parsing.
 */

const {
    detectTableAndMapping,
    applyMapping,
    generateUniqueStudentEmail,
    generateRandom3Digit
} = require('../src/utils/tableSchemaDetector');
const {
    parseCsvLine,
    parseCsvContent
} = require('../src/utils/csvParser');

describe('CSV Column Mapping & Ingestion Suite', () => {

    describe('1. Multi-Column Mapping: Closest Match Disambiguation', () => {
        test('should map closest match to firstName and ignore duplicate candidate columns', () => {
            // "Student Name" and "Candidate Name" both match firstName aliases
            // "Student Name" is a strong match, "Candidate Name" is also an alias
            const headers = ['Roll No', 'Student Name', 'Candidate Name', 'Phone'];
            const sampleRows = [{
                'Roll No': '101',
                'Student Name': 'Aarav Sharma',
                'Candidate Name': 'Aarav',
                'Phone': '9876543210'
            }];

            const detection = detectTableAndMapping(headers, sampleRows);
            expect(detection.detectedTable).toBe('users');

            const mapping = detection.columnMapping;
            const mappedValues = Object.values(mapping).filter(v => v !== '__ignore__');

            // Count how many headers map to firstName
            const firstNameMatches = Object.entries(mapping).filter(([_, v]) => v === 'firstName');

            // Exactly ONE header must map to firstName
            expect(firstNameMatches.length).toBe(1);

            // The loser candidate must be explicitly set to '__ignore__'
            const mappedHeader = firstNameMatches[0][0];
            const otherHeader = mappedHeader === 'Student Name' ? 'Candidate Name' : 'Student Name';
            expect(mapping[otherHeader]).toBe('__ignore__');
        });

        test('should disambiguate multiple roll number columns by picking closest match and ignoring rest', () => {
            const headers = ['Class Roll No', 'Roll No', 'Sr No', 'Student Name'];
            const detection = detectTableAndMapping(headers, []);
            const mapping = detection.columnMapping;

            const rollMatches = Object.entries(mapping).filter(([_, v]) => v === 'rollNumber');
            expect(rollMatches.length).toBe(1);

            // Other two roll number columns must be ignored
            const ignoredCount = ['Class Roll No', 'Roll No', 'Sr No'].filter(h => mapping[h] === '__ignore__').length;
            expect(ignoredCount).toBe(2);
        });
    });

    describe('2. Email Generation & Collision Avoidance (Rule 2)', () => {
        test('should never auto-map external CSV email column to users table', () => {
            const headers = ['Roll No', 'Student Name', 'Email', 'Mail Address', 'Phone'];
            const detection = detectTableAndMapping(headers, []);

            // Email columns should not map to 'email' field in users table
            expect(detection.columnMapping['Email']).toBe('__ignore__');
            expect(detection.columnMapping['Mail Address']).toBe('__ignore__');
        });

        test('should generate unique emails and add a 3-digit random number when names are identical', () => {
            const usedEmails = new Set();
            const email1 = generateUniqueStudentEmail('Aarav', 'Sharma', 'msldh.com', usedEmails);
            const email2 = generateUniqueStudentEmail('Aarav', 'Sharma', 'msldh.com', usedEmails);
            const email3 = generateUniqueStudentEmail('Aarav', 'Sharma', 'msldh.com', usedEmails);

            // First email should be standard
            expect(email1).toBe('aarav.sharma@msldh.com');

            // Second email must be unique and contain a 3-digit random number
            expect(email2).not.toBe(email1);
            expect(email2).toMatch(/^aarav\.sharma\.\d{3}@msldh\.com$/);

            // Third email must also be unique and contain a 3-digit random number
            expect(email3).not.toBe(email1);
            expect(email3).not.toBe(email2);
            expect(email3).toMatch(/^aarav\.sharma\.\d{3}@msldh\.com$/);
            expect(usedEmails.size).toBe(3);
        });

        test('applyMapping should generate unique emails across all records in batch', () => {
            const rawRecords = [
                { 'Name': 'Diya Patel', 'Roll': '101' },
                { 'Name': 'Diya Patel', 'Roll': '102' },
                { 'Name': 'Rohan Verma', 'Roll': '103' }
            ];
            const mapping = {
                'Name': 'firstName',
                'Roll': 'rollNumber'
            };

            const mapped = applyMapping(rawRecords, mapping, 'users', { emailDomain: 'school.edu' });
            expect(mapped.length).toBe(3);

            const emails = mapped.map(m => m.email);
            const uniqueEmails = new Set(emails);
            expect(uniqueEmails.size).toBe(3);

            expect(emails[0]).toBe('diya.patel@school.edu');
            expect(emails[1]).toMatch(/^diya\.patel\.\d{3}@school.edu$/);
            expect(emails[2]).toBe('rohan.verma@school.edu');
        });
    });

    describe('3. User Creation Guarantee (Rule 3)', () => {
        test('applyMapping produces complete user objects ready for prisma.user.create', () => {
            const rawRecords = [
                { 'Full Name': 'Kabir Singh', 'Admission No': 'ADM-2026-005', 'Gender': 'Male', 'Phone': '9876543214' }
            ];
            const mapping = {
                'Full Name': 'firstName',
                'Admission No': 'studentId',
                'Gender': 'gender',
                'Phone': 'phone'
            };

            const mapped = applyMapping(rawRecords, mapping, 'users');
            const student = mapped[0];

            expect(student.firstName).toBe('Kabir');
            expect(student.lastName).toBe('Singh');
            expect(student.email).toBe('kabir.singh@student.school.edu');
            expect(student.role).toBe('student');
            expect(student.gender).toBe('male');
            expect(student.studentId).toBe('ADM-2026-005');
        });
    });

    describe('4. Comma-Separated Values in Columns (Address Integrity - Rule 4)', () => {
        test('RFC 4180: should not split address containing commas inside double quotes into multiple columns', () => {
            const csvLine = '101,"Aarav Sharma","House No 123, Sector 4, Ludhiana",ADM-2026-001,9876543210';
            const parsed = parseCsvLine(csvLine);

            expect(parsed.length).toBe(5);
            expect(parsed[0]).toBe('101');
            expect(parsed[1]).toBe('Aarav Sharma');
            expect(parsed[2]).toBe('House No 123, Sector 4, Ludhiana'); // Preserved in single column!
            expect(parsed[3]).toBe('ADM-2026-001'); // Not shifted!
            expect(parsed[4]).toBe('9876543210');   // Not shifted!
        });

        test('Unquoted Address Fallback: should recombine unquoted commas in address without breaking subsequent columns', () => {
            const csvText = [
                'Roll No,Student Name,Address,Admission No,Phone',
                '101,Aarav Sharma,House No 123, Sector 4, Ludhiana,ADM-2026-001,9876543210',
                '102,Diya Patel,Flat 4B, Green Avenue, Delhi,ADM-2026-002,9876543211'
            ].join('\n');

            const result = parseCsvContent(csvText);

            expect(result.headers).toEqual(['Roll No', 'Student Name', 'Address', 'Admission No', 'Phone']);
            expect(result.records.length).toBe(2);

            // Record 1
            const rec1 = result.records[0];
            expect(rec1['Roll No']).toBe('101');
            expect(rec1['Student Name']).toBe('Aarav Sharma');
            expect(rec1['Address']).toBe('House No 123, Sector 4, Ludhiana');
            expect(rec1['Admission No']).toBe('ADM-2026-001'); // Aligned!
            expect(rec1['Phone']).toBe('9876543210');         // Aligned!

            // Record 2
            const rec2 = result.records[1];
            expect(rec2['Roll No']).toBe('102');
            expect(rec2['Student Name']).toBe('Diya Patel');
            expect(rec2['Address']).toBe('Flat 4B, Green Avenue, Delhi');
            expect(rec2['Admission No']).toBe('ADM-2026-002');
            expect(rec2['Phone']).toBe('9876543211');
        });
    });

});
