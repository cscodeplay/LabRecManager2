const { ENTITY_COLUMNS, generateCustomReportData } = require('../src/services/report.service');
const prisma = require('../src/config/database');

// Mock Prisma
jest.mock('../src/config/database', () => ({
    user: {
        findMany: jest.fn()
    },
    class: {
        findMany: jest.fn()
    },
    group: {
        findMany: jest.fn()
    },
    assignment: {
        findMany: jest.fn()
    },
    labItem: {
        findMany: jest.fn()
    }
}));

describe('Report Service (report.service.js)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('ENTITY_COLUMNS definitions', () => {
        it('should define necessary and optional columns for all 5 core entities', () => {
            const expectedEntities = ['students', 'classes', 'groups', 'assignments', 'lab_pcs'];
            expectedEntities.forEach(entity => {
                expect(ENTITY_COLUMNS[entity]).toBeDefined();
                expect(Array.isArray(ENTITY_COLUMNS[entity].necessary)).toBe(true);
                expect(Array.isArray(ENTITY_COLUMNS[entity].optional)).toBe(true);
                expect(ENTITY_COLUMNS[entity].necessary.length).toBeGreaterThan(0);
                expect(ENTITY_COLUMNS[entity].optional.length).toBeGreaterThan(0);
            });
        });

        it('should have proper keys and labels in column schema', () => {
            ENTITY_COLUMNS.students.necessary.forEach(col => {
                expect(col).toHaveProperty('key');
                expect(col).toHaveProperty('label');
            });
            expect(ENTITY_COLUMNS.students.necessary.map(c => c.key)).toContain('fullName');
            expect(ENTITY_COLUMNS.classes.necessary.map(c => c.key)).toContain('name');
            expect(ENTITY_COLUMNS.lab_pcs.necessary.map(c => c.key)).toContain('itemNumber');
        });
    });

    describe('generateCustomReportData - Multi-Table & Column Customization', () => {
        it('should query and format students with only selected columns', async () => {
            prisma.user.findMany.mockResolvedValueOnce([
                {
                    id: 'usr-1',
                    studentId: 'S101',
                    admissionNumber: 'ADM101',
                    firstName: 'Aarav',
                    lastName: 'Patel',
                    rollNumber: '12',
                    gender: 'male',
                    email: 'aarav@school.edu',
                    phone: '9876543210',
                    classEnrollments: [{ class: { name: 'Class 10-A' } }],
                    groupMemberships: [{ group: { name: 'Alpha Group', assignedPc: { itemNumber: 'PC-05' } } }],
                    submissions: [
                        { grade: { percentage: '85.0', finalMarks: 85 } },
                        { grade: { percentage: '95.0', finalMarks: 95 } }
                    ]
                }
            ]);

            const result = await generateCustomReportData({
                entities: ['students'],
                selectedColumns: {
                    students: ['admissionNumber', 'fullName', 'className', 'avgScore']
                },
                filters: { gender: 'all' },
                schoolId: 'sch-1'
            });

            expect(result.success).toBe(true);
            expect(result.entities).toContain('students');
            expect(result.reportResults.students).toBeDefined();
            expect(result.reportResults.students.count).toBe(1);

            const row = result.reportResults.students.rows[0];
            expect(row['Student Name']).toBe('Aarav Patel');
            expect(row['Admission / Student ID']).toBe('S101');
            expect(row['Enrolled Class']).toBe('Class 10-A');
            expect(row['Average Score (%)']).toBe('90.0');

            // Columns that were not in selectedColumns must NOT be present
            expect(row['Phone Number']).toBeUndefined();
            expect(row['Gender']).toBeUndefined();
        });

        it('should query and format classes with selected columns', async () => {
            prisma.class.findMany.mockResolvedValueOnce([
                {
                    id: 'cls-1',
                    name: 'Class 12-Science',
                    gradeLevel: '12',
                    section: 'A',
                    stream: 'Science',
                    enrollments: [
                        { student: { gender: 'male' } },
                        { student: { gender: 'female' } }
                    ],
                    groups: [{ id: 'grp-1', assignedPcId: 'pc-1' }]
                }
            ]);

            const result = await generateCustomReportData({
                entities: ['classes'],
                selectedColumns: {
                    classes: ['name', 'gradeLevel', 'totalEnrolled', 'boyCount', 'girlCount']
                },
                schoolId: 'sch-1'
            });

            expect(result.success).toBe(true);
            expect(result.reportResults.classes).toBeDefined();
            const row = result.reportResults.classes.rows[0];
            expect(row['Class Name']).toBe('Class 12-Science');
            expect(row['Grade Level']).toBe('12');
            expect(row['Total Students']).toBe(2);
            expect(row['Male Count']).toBe(1);
            expect(row['Female Count']).toBe(1);
        });

        it('should query lab PCs with assigned group and hardware specs', async () => {
            prisma.labItem.findMany.mockResolvedValueOnce([
                {
                    id: 'item-1',
                    itemNumber: 'PC-12',
                    status: 'active',
                    specs: { ipAddress: '192.168.1.112', macAddress: '00:1B:44:11:3A:B7' },
                    lab: { name: 'Robotics Lab' },
                    assignedGroups: [{ name: 'Group Beta', class: { name: 'Class 11-B' } }]
                }
            ]);

            const result = await generateCustomReportData({
                entities: ['lab_pcs'],
                selectedColumns: {
                    lab_pcs: ['itemNumber', 'labName', 'status', 'ipAddress', 'assignedGroup', 'assignedClass']
                },
                schoolId: 'sch-1'
            });

            expect(result.success).toBe(true);
            const row = result.reportResults.lab_pcs.rows[0];
            expect(row['PC Number']).toBe('PC-12');
            expect(row['Lab Name']).toBe('Robotics Lab');
            expect(row['Status']).toBe('active');
            expect(row['IP Address']).toBe('192.168.1.112');
            expect(row['Assigned Group']).toBe('Group Beta');
            expect(row['Assigned Class']).toBe('Class 11-B');
        });

        it('should build an intelligent unified table without collapsing when multiple entities are selected', async () => {
            // Mock individual queries
            prisma.user.findMany
                .mockResolvedValueOnce([
                    {
                        id: 'usr-1',
                        studentId: 'S101',
                        admissionNumber: 'S101',
                        firstName: 'Shruti',
                        lastName: 'Sharma',
                        gender: 'female',
                        classEnrollments: [{ class: { name: 'Class 10-A', section: 'A', gradeLevel: '10' } }],
                        groupMemberships: [{
                            group: {
                                name: 'Alpha',
                                genderType: 'girls',
                                assignedPc: { itemNumber: 'PC-01', lab: { name: 'Main Lab' }, status: 'active', specs: { ipAddress: '10.0.0.1' } },
                                members: [{ role: 'leader', student: { firstName: 'Shruti', lastName: 'Sharma' } }]
                            }
                        }],
                        submissions: [{ grade: { percentage: '92.0' } }]
                    }
                ]) // for students individual query
                .mockResolvedValueOnce([
                    {
                        id: 'usr-1',
                        studentId: 'S101',
                        admissionNumber: 'S101',
                        firstName: 'Shruti',
                        lastName: 'Sharma',
                        gender: 'female',
                        email: 'shruti@school.edu',
                        classEnrollments: [{ class: { name: 'Class 10-A', section: 'A', gradeLevel: '10', stream: 'General' } }],
                        groupMemberships: [{
                            group: {
                                name: 'Alpha',
                                genderType: 'girls',
                                assignedPc: { itemNumber: 'PC-01', lab: { name: 'Main Lab' }, status: 'active', specs: { ipAddress: '10.0.0.1' } },
                                members: [{ role: 'leader', student: { firstName: 'Shruti', lastName: 'Sharma' } }]
                            }
                        }],
                        submissions: [{ grade: { percentage: '92.0' } }]
                    }
                ]); // for unified query

            prisma.class.findMany.mockResolvedValueOnce([
                {
                    id: 'cls-1',
                    name: 'Class 10-A',
                    gradeLevel: '10',
                    section: 'A',
                    stream: 'General',
                    enrollments: [],
                    groups: []
                }
            ]);

            prisma.labItem.findMany.mockResolvedValueOnce([
                {
                    id: 'pc-1',
                    itemNumber: 'PC-01',
                    status: 'active',
                    specs: { ipAddress: '10.0.0.1' },
                    lab: { name: 'Main Lab' },
                    assignedGroups: []
                }
            ]);

            const result = await generateCustomReportData({
                entities: ['students', 'classes', 'lab_pcs'],
                selectedColumns: {
                    students: ['fullName', 'admissionNumber', 'gender'],
                    classes: ['name', 'section'],
                    lab_pcs: ['itemNumber', 'labName', 'status']
                },
                schoolId: 'sch-1'
            });

            expect(result.success).toBe(true);
            // Must contain individual entity reports
            expect(result.reportResults.students).toBeDefined();
            expect(result.reportResults.classes).toBeDefined();
            expect(result.reportResults.lab_pcs).toBeDefined();

            // Must contain unified report
            expect(result.reportResults.unified).toBeDefined();
            const unifiedRow = result.reportResults.unified.rows[0];

            // Verify joined fields from across all 3 entities exist in the same row
            expect(unifiedRow['Student Name']).toBe('Shruti Sharma');
            expect(unifiedRow['Admission ID']).toBe('S101');
            expect(unifiedRow['Gender']).toBe('Female');
            expect(unifiedRow['Enrolled Class']).toBe('Class 10-A');
            expect(unifiedRow['Section']).toBe('A');
            expect(unifiedRow['Assigned Lab PC']).toBe('PC-01');
            expect(unifiedRow['Lab Location']).toBe('Main Lab');
            expect(unifiedRow['PC Status']).toBe('active');
        });
    });
});
