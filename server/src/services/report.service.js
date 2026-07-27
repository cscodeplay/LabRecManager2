const prisma = require('../config/database');

/**
 * Report Service - Multi-Entity Query & Data Formatting Engine
 */

// Available Column Definitions per Entity
const ENTITY_COLUMNS = {
    students: {
        necessary: [
            { key: 'admissionNumber', label: 'Admission / Student ID' },
            { key: 'fullName', label: 'Student Name' },
            { key: 'className', label: 'Enrolled Class' }
        ],
        optional: [
            { key: 'rollNumber', label: 'Roll Number' },
            { key: 'gender', label: 'Gender' },
            { key: 'email', label: 'Email Address' },
            { key: 'phone', label: 'Phone Number' },
            { key: 'groupName', label: 'Assigned Group' },
            { key: 'assignedPc', label: 'Assigned Lab PC' },
            { key: 'submissionsCount', label: 'Total Submissions' },
            { key: 'avgScore', label: 'Average Score (%)' }
        ]
    },
    classes: {
        necessary: [
            { key: 'name', label: 'Class Name' },
            { key: 'gradeLevel', label: 'Grade Level' },
            { key: 'section', label: 'Section' }
        ],
        optional: [
            { key: 'stream', label: 'Stream' },
            { key: 'totalEnrolled', label: 'Total Students' },
            { key: 'boyCount', label: 'Boys Count' },
            { key: 'girlCount', label: 'Girls Count' },
            { key: 'groupsCount', label: 'Total Groups' },
            { key: 'pcsAssigned', label: 'PCs Allocated' }
        ]
    },
    groups: {
        necessary: [
            { key: 'name', label: 'Group Name' },
            { key: 'className', label: 'Class Name' },
            { key: 'genderType', label: 'Gender Category' }
        ],
        optional: [
            { key: 'memberCount', label: 'Member Count' },
            { key: 'memberNames', label: 'Member Names' },
            { key: 'assignedPc', label: 'Assigned Lab PC' },
            { key: 'labName', label: 'Lab Name' },
            { key: 'leaderName', label: 'Group Leader' }
        ]
    },
    assignments: {
        necessary: [
            { key: 'title', label: 'Assignment Title' },
            { key: 'experimentNumber', label: 'Experiment No' },
            { key: 'subjectName', label: 'Subject' }
        ],
        optional: [
            { key: 'programmingLanguage', label: 'Language' },
            { key: 'maxMarks', label: 'Max Marks' },
            { key: 'targetClasses', label: 'Target Classes/Groups' },
            { key: 'submissionsCount', label: 'Total Submissions' },
            { key: 'avgScore', label: 'Average Score' },
            { key: 'status', label: 'Status' }
        ]
    },
    lab_pcs: {
        necessary: [
            { key: 'itemNumber', label: 'PC Number' },
            { key: 'labName', label: 'Lab Name' },
            { key: 'status', label: 'Status' }
        ],
        optional: [
            { key: 'ipAddress', label: 'IP Address' },
            { key: 'macAddress', label: 'MAC Address' },
            { key: 'assignedGroup', label: 'Assigned Group' },
            { key: 'assignedClass', label: 'Assigned Class' }
        ]
    }
};

async function generateCustomReportData({ entities = ['students'], selectedColumns = {}, filters = {}, schoolId, sessionId }) {
    const reportResults = {};

    // 1. STUDENTS ENTITY DATA
    if (entities.includes('students')) {
        const studentWhere = {
            role: 'student',
            isActive: true,
            ...(schoolId && { schoolId })
        };

        if (filters.gender && filters.gender !== 'all') {
            studentWhere.gender = filters.gender;
        }

        if (filters.classId) {
            studentWhere.classEnrollments = {
                some: { classId: filters.classId, status: 'active' }
            };
        }

        const students = await prisma.user.findMany({
            where: studentWhere,
            include: {
                classEnrollments: {
                    where: { status: 'active' },
                    include: { class: true }
                },
                groupMemberships: {
                    include: {
                        group: {
                            include: {
                                assignedPc: { include: { lab: true } }
                            }
                        }
                    }
                },
                submissions: {
                    select: { status: true, score: true, marksObtained: true }
                }
            },
            orderBy: { firstName: 'asc' }
        });

        const activeCols = selectedColumns.students || [
            'admissionNumber', 'fullName', 'className', 'rollNumber', 'gender', 'email', 'phone', 'groupName', 'assignedPc'
        ];

        const rows = students.map(s => {
            const enrollment = s.classEnrollments?.[0];
            const groupMember = s.groupMemberships?.[0];
            const group = groupMember?.group;
            const pc = group?.assignedPc;

            const scores = (s.submissions || []).map(sub => sub.marksObtained || sub.score || 0);
            const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';

            const rowData = {};
            if (activeCols.includes('admissionNumber')) rowData['Admission / Student ID'] = s.studentId || s.admissionNumber || '-';
            if (activeCols.includes('fullName')) rowData['Student Name'] = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student';
            if (activeCols.includes('className')) rowData['Enrolled Class'] = enrollment?.class?.name || '-';
            if (activeCols.includes('rollNumber')) rowData['Roll Number'] = s.rollNumber ? `#${s.rollNumber}` : '-';
            if (activeCols.includes('gender')) rowData['Gender'] = s.gender === 'female' ? 'Girl' : 'Boy';
            if (activeCols.includes('email')) rowData['Email Address'] = s.email || '-';
            if (activeCols.includes('phone')) rowData['Phone Number'] = s.phone || '-';
            if (activeCols.includes('groupName')) rowData['Assigned Group'] = group?.name || 'Ungrouped';
            if (activeCols.includes('assignedPc')) rowData['Assigned Lab PC'] = pc ? `${pc.itemNumber} (${pc.lab?.name || 'Lab'})` : 'No PC';
            if (activeCols.includes('submissionsCount')) rowData['Total Submissions'] = s.submissions?.length || 0;
            if (activeCols.includes('avgScore')) rowData['Average Score (%)'] = avgScore;

            return rowData;
        });

        reportResults.students = {
            title: 'Students & Roster Report',
            count: rows.length,
            rows
        };
    }

    // 2. CLASSES ENTITY DATA
    if (entities.includes('classes')) {
        const classWhere = { ...(schoolId && { schoolId }) };
        if (filters.classId) classWhere.id = filters.classId;

        const classes = await prisma.class.findMany({
            where: classWhere,
            include: {
                enrollments: {
                    where: { status: 'active' },
                    include: { student: true }
                },
                groups: {
                    include: { assignedPc: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        const activeCols = selectedColumns.classes || [
            'name', 'gradeLevel', 'section', 'stream', 'totalEnrolled', 'boyCount', 'girlCount', 'groupsCount', 'pcsAssigned'
        ];

        const rows = classes.map(c => {
            const students = (c.enrollments || []).map(e => e.student).filter(Boolean);
            const boyCount = students.filter(s => s.gender === 'male').length;
            const girlCount = students.filter(s => s.gender === 'female').length;
            const pcsAssigned = (c.groups || []).filter(g => g.assignedPcId).length;

            const rowData = {};
            if (activeCols.includes('name')) rowData['Class Name'] = c.name;
            if (activeCols.includes('gradeLevel')) rowData['Grade Level'] = c.gradeLevel || '-';
            if (activeCols.includes('section')) rowData['Section'] = c.section || '-';
            if (activeCols.includes('stream')) rowData['Stream'] = c.stream || '-';
            if (activeCols.includes('totalEnrolled')) rowData['Total Students'] = students.length;
            if (activeCols.includes('boyCount')) rowData['Boys Count'] = boyCount;
            if (activeCols.includes('girlCount')) rowData['Girls Count'] = girlCount;
            if (activeCols.includes('groupsCount')) rowData['Total Groups'] = c.groups?.length || 0;
            if (activeCols.includes('pcsAssigned')) rowData['PCs Allocated'] = pcsAssigned;

            return rowData;
        });

        reportResults.classes = {
            title: 'Classes & Enrolled Summary Report',
            count: rows.length,
            rows
        };
    }

    // 3. GROUPS ENTITY DATA
    if (entities.includes('groups')) {
        const groupWhere = {};
        if (filters.classId) groupWhere.classId = filters.classId;

        const groups = await prisma.studentGroup.findMany({
            where: groupWhere,
            include: {
                class: true,
                assignedPc: { include: { lab: true } },
                members: {
                    include: { student: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        const activeCols = selectedColumns.groups || [
            'name', 'className', 'genderType', 'memberCount', 'memberNames', 'assignedPc', 'labName'
        ];

        const rows = groups.filter(g => {
            if (!filters.gender || filters.gender === 'all') return true;
            const nameLower = (g.name || '').toLowerCase();
            if (filters.gender === 'female') return nameLower.includes('girls') || (g.members || []).some(m => m.student?.gender === 'female');
            if (filters.gender === 'male') return nameLower.includes('boys') || (g.members || []).some(m => m.student?.gender === 'male');
            return true;
        }).map(g => {
            const memberNames = (g.members || []).map(m => m.student ? `${m.student.firstName || ''} ${m.student.lastName || ''}`.trim() : '').filter(Boolean).join(', ');
            const leader = (g.members || []).find(m => m.role === 'leader')?.student;
            const isGirlGroup = (g.name || '').toLowerCase().includes('girls') || ((g.members || []).length > 0 && g.members.every(m => m.student?.gender === 'female'));

            const rowData = {};
            if (activeCols.includes('name')) rowData['Group Name'] = g.name;
            if (activeCols.includes('className')) rowData['Class Name'] = g.class?.name || '-';
            if (activeCols.includes('genderType')) rowData['Gender Category'] = isGirlGroup ? 'Girls' : 'Boys';
            if (activeCols.includes('memberCount')) rowData['Member Count'] = g.members?.length || 0;
            if (activeCols.includes('memberNames')) rowData['Member Names'] = memberNames || 'No Members';
            if (activeCols.includes('assignedPc')) rowData['Assigned Lab PC'] = g.assignedPc ? g.assignedPc.itemNumber : 'No PC';
            if (activeCols.includes('labName')) rowData['Lab Name'] = g.assignedPc?.lab?.name || '-';
            if (activeCols.includes('leaderName')) rowData['Group Leader'] = leader ? `${leader.firstName || ''} ${leader.lastName || ''}`.trim() : '-';

            return rowData;
        });

        reportResults.groups = {
            title: 'Student Groups & PC Allocations Report',
            count: rows.length,
            rows
        };
    }

    // 4. ASSIGNMENTS ENTITY DATA
    if (entities.includes('assignments')) {
        const assignWhere = { ...(schoolId && { schoolId }) };
        if (sessionId) assignWhere.academicYearId = sessionId;

        const assignments = await prisma.assignment.findMany({
            where: assignWhere,
            include: {
                subject: true,
                targets: {
                    include: { targetClass: true, targetGroup: true }
                },
                submissions: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const activeCols = selectedColumns.assignments || [
            'title', 'experimentNumber', 'subjectName', 'programmingLanguage', 'maxMarks', 'targetClasses', 'submissionsCount', 'avgScore', 'status'
        ];

        const rows = assignments.map(a => {
            const scores = (a.submissions || []).map(sub => sub.marksObtained || sub.score || 0);
            const avgScore = scores.length > 0 ? (scores.reduce((st, val) => st + val, 0) / scores.length).toFixed(1) : '-';
            const targetsStr = (a.targets || []).map(t => t.targetClass?.name || t.targetGroup?.name || 'Custom').join(', ');

            const rowData = {};
            if (activeCols.includes('title')) rowData['Assignment Title'] = a.title;
            if (activeCols.includes('experimentNumber')) rowData['Experiment No'] = a.experimentNumber || '-';
            if (activeCols.includes('subjectName')) rowData['Subject'] = a.subject?.name || '-';
            if (activeCols.includes('programmingLanguage')) rowData['Language'] = a.programmingLanguage || '-';
            if (activeCols.includes('maxMarks')) rowData['Max Marks'] = a.maxMarks;
            if (activeCols.includes('targetClasses')) rowData['Target Classes/Groups'] = targetsStr || 'All';
            if (activeCols.includes('submissionsCount')) rowData['Total Submissions'] = a.submissions?.length || 0;
            if (activeCols.includes('avgScore')) rowData['Average Score'] = avgScore;
            if (activeCols.includes('status')) rowData['Status'] = a.status;

            return rowData;
        });

        reportResults.assignments = {
            title: 'Assignments & Performance Report',
            count: rows.length,
            rows
        };
    }

    // 5. LAB PCS ENTITY DATA
    if (entities.includes('lab_pcs')) {
        const pcs = await prisma.labItem.findMany({
            where: { category: 'PC' },
            include: {
                lab: true,
                assignedGroup: { include: { class: true } }
            },
            orderBy: { itemNumber: 'asc' }
        });

        const activeCols = selectedColumns.lab_pcs || [
            'itemNumber', 'labName', 'status', 'ipAddress', 'assignedGroup', 'assignedClass'
        ];

        const rows = pcs.map(pc => {
            const group = pc.assignedGroup;

            const rowData = {};
            if (activeCols.includes('itemNumber')) rowData['PC Number'] = pc.itemNumber;
            if (activeCols.includes('labName')) rowData['Lab Name'] = pc.lab?.name || '-';
            if (activeCols.includes('status')) rowData['Status'] = pc.status;
            if (activeCols.includes('ipAddress')) rowData['IP Address'] = pc.ipAddress || '-';
            if (activeCols.includes('macAddress')) rowData['MAC Address'] = pc.macAddress || '-';
            if (activeCols.includes('assignedGroup')) rowData['Assigned Group'] = group?.name || 'Unassigned';
            if (activeCols.includes('assignedClass')) rowData['Assigned Class'] = group?.class?.name || '-';

            return rowData;
        });

        reportResults.lab_pcs = {
            title: 'Lab PCs & Inventory Report',
            count: rows.length,
            rows
        };
    }

    return {
        success: true,
        generatedAt: new Date().toISOString(),
        entities: Object.keys(reportResults),
        reportResults
    };
}

module.exports = {
    ENTITY_COLUMNS,
    generateCustomReportData
};
