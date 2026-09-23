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
            { key: 'boyCount', label: 'Male Count' },
            { key: 'girlCount', label: 'Female Count' },
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
        try {
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
                        include: {
                            grade: { select: { finalMarks: true, percentage: true } }
                        }
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

                const scores = (s.submissions || [])
                    .map(sub => sub.grade?.percentage ? parseFloat(sub.grade.percentage) : (sub.grade?.finalMarks || null))
                    .filter(val => val !== null && !isNaN(val));
                const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';

                const rowData = {};
                if (activeCols.includes('admissionNumber')) rowData['Admission / Student ID'] = s.studentId || s.admissionNumber || '-';
                if (activeCols.includes('fullName')) rowData['Student Name'] = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student';
                if (activeCols.includes('className')) {
                    const clsName = enrollment?.class?.name || '-';
                    rowData['Class Name'] = clsName;
                    rowData['Enrolled Class'] = clsName;
                }
                if (activeCols.includes('rollNumber')) rowData['Roll Number'] = s.rollNumber ? `#${s.rollNumber}` : '-';
                if (activeCols.includes('gender')) rowData['Gender'] = s.gender === 'female' ? 'Female' : 'Male';
                if (activeCols.includes('email')) rowData['Email Address'] = s.email || '-';
                if (activeCols.includes('phone')) rowData['Phone Number'] = s.phone || '-';
                if (activeCols.includes('groupName')) {
                    const grpName = group?.name || 'Ungrouped';
                    rowData['Group Name'] = grpName;
                    rowData['Assigned Group'] = grpName;
                }
                if (activeCols.includes('assignedPc')) {
                    const pcNum = pc ? pc.itemNumber : 'No PC';
                    rowData['PC Number'] = pcNum;
                    rowData['Assigned Lab PC'] = pc ? `${pc.itemNumber} (${pc.lab?.name || 'Lab'})` : 'No PC';
                    rowData['Lab Name'] = pc?.lab?.name || '-';
                }
                if (activeCols.includes('submissionsCount')) rowData['Total Submissions'] = s.submissions?.length || 0;
                if (activeCols.includes('avgScore')) rowData['Average Score (%)'] = avgScore;

                return rowData;
            });

            reportResults.students = {
                title: 'Students & Roster Report',
                count: rows.length,
                rows
            };
        } catch (err) {
            console.error('Error fetching students for custom report:', err);
            reportResults.students = { title: 'Students & Roster Report', count: 0, rows: [] };
        }
    }

    // 2. CLASSES ENTITY DATA
    if (entities.includes('classes')) {
        try {
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
                        include: { assignedPc: { include: { lab: true } } }
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
                if (activeCols.includes('boyCount')) rowData['Male Count'] = boyCount;
                if (activeCols.includes('girlCount')) rowData['Female Count'] = girlCount;
                if (activeCols.includes('groupsCount')) rowData['Total Groups'] = c.groups?.length || 0;
                if (activeCols.includes('pcsAssigned')) rowData['PCs Allocated'] = pcsAssigned;

                return rowData;
            });

            reportResults.classes = {
                title: 'Classes & Enrolled Summary Report',
                count: rows.length,
                rows
            };
        } catch (err) {
            console.error('Error fetching classes for custom report:', err);
            reportResults.classes = { title: 'Classes & Enrolled Summary Report', count: 0, rows: [] };
        }
    }

    // 3. GROUPS ENTITY DATA
    if (entities.includes('groups')) {
        try {
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
                if (activeCols.includes('genderType')) rowData['Gender Category'] = isGirlGroup ? 'Female' : 'Male';
                if (activeCols.includes('memberCount')) rowData['Member Count'] = g.members?.length || 0;
                if (activeCols.includes('memberNames')) rowData['Member Names'] = memberNames || 'No Members';
                if (activeCols.includes('assignedPc')) {
                    const pcNum = g.assignedPc ? g.assignedPc.itemNumber : 'No PC';
                    rowData['PC Number'] = pcNum;
                    rowData['Assigned Lab PC'] = pcNum;
                }
                if (activeCols.includes('labName')) rowData['Lab Name'] = g.assignedPc?.lab?.name || '-';
                if (activeCols.includes('leaderName')) rowData['Group Leader'] = leader ? `${leader.firstName || ''} ${leader.lastName || ''}`.trim() : '-';

                return rowData;
            });

            reportResults.groups = {
                title: 'Student Groups & PC Allocations Report',
                count: rows.length,
                rows
            };
        } catch (err) {
            console.error('Error fetching groups for custom report:', err);
            reportResults.groups = { title: 'Student Groups & PC Allocations Report', count: 0, rows: [] };
        }
    }

    // 4. ASSIGNMENTS ENTITY DATA
    if (entities.includes('assignments')) {
        try {
            const assignWhere = { ...(schoolId && { schoolId }) };
            if (sessionId && sessionId !== 'null' && sessionId !== 'undefined') {
                assignWhere.academicYearId = sessionId;
            }

            const assignments = await prisma.assignment.findMany({
                where: assignWhere,
                include: {
                    subject: true,
                    targets: {
                        include: { targetClass: true, targetGroup: true }
                    },
                    submissions: {
                        include: {
                            grade: { select: { finalMarks: true, percentage: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const activeCols = selectedColumns.assignments || [
                'title', 'experimentNumber', 'subjectName', 'programmingLanguage', 'maxMarks', 'targetClasses', 'submissionsCount', 'avgScore', 'status'
            ];

            const rows = assignments.map(a => {
                const scores = (a.submissions || [])
                    .map(sub => sub.grade?.percentage ? parseFloat(sub.grade.percentage) : (sub.grade?.finalMarks || null))
                    .filter(val => val !== null && !isNaN(val));
                const avgScore = scores.length > 0 ? (scores.reduce((st, val) => st + val, 0) / scores.length).toFixed(1) : '-';
                const targetsStr = (a.targets || []).map(t => t.targetClass?.name || t.targetGroup?.name || 'Custom').join(', ');
                const targetClassesStr = (a.targets || []).map(t => t.targetClass?.name).filter(Boolean).join(', ');
                const targetGroupsStr = (a.targets || []).map(t => t.targetGroup?.name).filter(Boolean).join(', ');

                const rowData = {};
                if (activeCols.includes('title')) rowData['Assignment Title'] = a.title;
                if (activeCols.includes('experimentNumber')) rowData['Experiment No'] = a.experimentNumber || '-';
                if (activeCols.includes('subjectName')) rowData['Subject'] = a.subject?.name || '-';
                if (activeCols.includes('programmingLanguage')) rowData['Language'] = a.programmingLanguage || '-';
                if (activeCols.includes('maxMarks')) rowData['Max Marks'] = a.maxMarks;
                if (activeCols.includes('targetClasses')) {
                    rowData['Target Classes/Groups'] = targetsStr || 'All';
                    rowData['Class Name'] = targetClassesStr || 'All Classes';
                    rowData['Group Name'] = targetGroupsStr || 'All Groups';
                }
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
        } catch (err) {
            console.error('Error fetching assignments for custom report:', err);
            reportResults.assignments = { title: 'Assignments & Performance Report', count: 0, rows: [] };
        }
    }

    // 5. LAB PCS ENTITY DATA
    if (entities.includes('lab_pcs')) {
        try {
            const pcs = await prisma.labItem.findMany({
                where: {
                    ...(schoolId && { schoolId })
                },
                include: {
                    lab: true,
                    assignedGroups: { include: { class: true } }
                },
                orderBy: { itemNumber: 'asc' }
            });

            const activeCols = selectedColumns.lab_pcs || [
                'itemNumber', 'labName', 'status', 'ipAddress', 'assignedGroup', 'assignedClass'
            ];

            const rows = pcs.map(pc => {
                const group = pc.assignedGroups?.[0];

                const rowData = {};
                if (activeCols.includes('itemNumber')) rowData['PC Number'] = pc.itemNumber;
                if (activeCols.includes('labName')) rowData['Lab Name'] = pc.lab?.name || '-';
                if (activeCols.includes('status')) rowData['Status'] = pc.status;
                if (activeCols.includes('ipAddress')) rowData['IP Address'] = (pc.specs && pc.specs.ipAddress) ? pc.specs.ipAddress : '-';
                if (activeCols.includes('macAddress')) rowData['MAC Address'] = (pc.specs && pc.specs.macAddress) ? pc.specs.macAddress : '-';
                if (activeCols.includes('assignedGroup')) {
                    const grpName = group?.name || 'Unassigned';
                    rowData['Group Name'] = grpName;
                    rowData['Assigned Group'] = grpName;
                }
                if (activeCols.includes('assignedClass')) {
                    const clsName = group?.class?.name || '-';
                    rowData['Class Name'] = clsName;
                    rowData['Assigned Class'] = clsName;
                }

                return rowData;
            });

            reportResults.lab_pcs = {
                title: 'Lab PCs & Inventory Report',
                count: rows.length,
                rows
            };
        } catch (err) {
            console.error('Error fetching lab_pcs for custom report:', err);
            reportResults.lab_pcs = { title: 'Lab PCs & Inventory Report', count: 0, rows: [] };
        }
    }

    // 6. INTELLIGENT UNIFIED JOINED MASTER TABLE (When 2+ entities requested)
    if (entities.length > 1) {
        try {
            let unifiedRows = [];

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

                const masterStudents = await prisma.user.findMany({
                    where: studentWhere,
                    include: {
                        classEnrollments: {
                            where: { status: 'active' },
                            include: { class: { include: { groups: true } } }
                        },
                        groupMemberships: {
                            include: {
                                group: {
                                    include: {
                                        assignedPc: { include: { lab: true } },
                                        members: { include: { student: true } }
                                    }
                                }
                            }
                        },
                        submissions: {
                            include: {
                                assignment: true,
                                grade: { select: { finalMarks: true, percentage: true } }
                            }
                        }
                    },
                    orderBy: { firstName: 'asc' }
                });

                const stdCols = selectedColumns.students || ['admissionNumber', 'fullName', 'className', 'rollNumber', 'gender', 'email'];
                const clsCols = selectedColumns.classes || ['name', 'gradeLevel', 'section', 'stream'];
                const grpCols = selectedColumns.groups || ['name', 'className', 'genderType', 'memberCount', 'assignedPc'];
                const pcCols = selectedColumns.lab_pcs || ['itemNumber', 'labName', 'status', 'ipAddress'];
                const asgCols = selectedColumns.assignments || ['title', 'submissionsCount', 'avgScore'];

                unifiedRows = masterStudents.map(s => {
                    const enrollment = s.classEnrollments?.[0];
                    const cls = enrollment?.class;
                    const groupMember = s.groupMemberships?.[0];
                    const group = groupMember?.group;
                    const pc = group?.assignedPc;
                    const leader = group?.members?.find(m => m.role === 'leader')?.student;

                    const scores = (s.submissions || [])
                        .map(sub => sub.grade?.percentage ? parseFloat(sub.grade.percentage) : (sub.grade?.finalMarks || null))
                        .filter(val => val !== null && !isNaN(val));
                    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';

                    const row = {};

                    // Students fields (only if students entity requested)
                    if (entities.includes('students')) {
                        if (stdCols.includes('fullName')) row['Student Name'] = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student';
                        if (stdCols.includes('admissionNumber')) row['Admission ID'] = s.studentId || s.admissionNumber || '-';
                        if (stdCols.includes('rollNumber')) row['Roll Number'] = s.rollNumber ? `#${s.rollNumber}` : '-';
                        if (stdCols.includes('gender')) row['Gender'] = s.gender === 'female' ? 'Female' : 'Male';
                        if (stdCols.includes('email')) row['Email Address'] = s.email || '-';
                        if (stdCols.includes('phone')) row['Phone Number'] = s.phone || '-';
                    }

                    // Classes fields (only if classes entity requested)
                    if (entities.includes('classes')) {
                        if (clsCols.includes('name')) {
                            row['Class Name'] = cls?.name || '-';
                            row['Enrolled Class'] = cls?.name || '-';
                        }
                        if (clsCols.includes('section')) row['Section'] = cls?.section || '-';
                        if (clsCols.includes('gradeLevel')) row['Grade Level'] = cls?.gradeLevel || '-';
                        if (clsCols.includes('stream')) row['Stream'] = cls?.stream || '-';
                    }

                    // Groups fields (only if groups entity requested)
                    if (entities.includes('groups')) {
                        if (grpCols.includes('name')) {
                            row['Group Name'] = group?.name || 'Ungrouped';
                            row['Assigned Group'] = group?.name || 'Ungrouped';
                        }
                        if (grpCols.includes('genderType')) row['Group Gender'] = group?.genderType || '-';
                        if (grpCols.includes('leaderName')) row['Group Leader'] = leader ? `${leader.firstName || ''} ${leader.lastName || ''}`.trim() : '-';
                        if (grpCols.includes('memberCount')) row['Group Member Count'] = group?.members?.length || 0;
                    }

                    // Lab PCs fields (only if lab_pcs entity requested)
                    if (entities.includes('lab_pcs')) {
                        if (pcCols.includes('itemNumber')) {
                            row['PC Number'] = pc ? `${pc.itemNumber}` : 'No PC';
                            row['Assigned Lab PC'] = pc ? `${pc.itemNumber}` : 'No PC';
                        }
                        if (pcCols.includes('labName')) {
                            row['Lab Name'] = pc?.lab?.name || '-';
                            row['Lab Location'] = pc?.lab?.name || '-';
                        }
                        if (pcCols.includes('status')) row['PC Status'] = pc?.status || '-';
                        if (pcCols.includes('ipAddress')) row['IP Address'] = (pc?.specs && pc.specs.ipAddress) ? pc.specs.ipAddress : '-';
                    }

                    // Assignments & Submissions fields (only if assignments entity requested)
                    if (entities.includes('assignments')) {
                        if (asgCols.includes('submissionsCount')) row['Total Submissions'] = s.submissions?.length || 0;
                        if (asgCols.includes('avgScore')) row['Average Score (%)'] = avgScore;
                    }

                    return row;
                });
            } else if (entities.includes('groups')) {
                // Unified Join using Groups as the primary entity
                const groupWhere = {};
                if (filters.classId) groupWhere.classId = filters.classId;

                const masterGroups = await prisma.studentGroup.findMany({
                    where: groupWhere,
                    include: {
                        class: true,
                        assignedPc: { include: { lab: true } },
                        members: { include: { student: true } }
                    },
                    orderBy: { name: 'asc' }
                });

                const clsCols = selectedColumns.classes || ['name', 'gradeLevel', 'section'];
                const grpCols = selectedColumns.groups || ['name', 'className', 'genderType', 'memberCount', 'assignedPc'];
                const pcCols = selectedColumns.lab_pcs || ['itemNumber', 'labName', 'status', 'ipAddress'];

                unifiedRows = masterGroups.map(g => {
                    const row = {};
                    const leader = g.members?.find(m => m.role === 'leader')?.student;
                    const pc = g.assignedPc;

                    if (entities.includes('classes')) {
                        if (clsCols.includes('name')) row['Class Name'] = g.class?.name || '-';
                        if (clsCols.includes('gradeLevel')) row['Grade Level'] = g.class?.gradeLevel || '-';
                        if (clsCols.includes('section')) row['Section'] = g.class?.section || '-';
                    }

                    if (entities.includes('groups')) {
                        if (grpCols.includes('name')) row['Group Name'] = g.name;
                        if (grpCols.includes('genderType')) row['Group Gender'] = g.genderType || '-';
                        if (grpCols.includes('memberCount')) row['Member Count'] = g.members?.length || 0;
                        if (grpCols.includes('leaderName')) row['Group Leader'] = leader ? `${leader.firstName || ''} ${leader.lastName || ''}`.trim() : '-';
                    }

                    if (entities.includes('lab_pcs')) {
                        if (pcCols.includes('itemNumber')) {
                            row['PC Number'] = pc ? `${pc.itemNumber}` : 'No PC';
                            row['Assigned Lab PC'] = pc ? `${pc.itemNumber}` : 'No PC';
                        }
                        if (pcCols.includes('labName')) {
                            row['Lab Name'] = pc?.lab?.name || '-';
                            row['Lab Location'] = pc?.lab?.name || '-';
                        }
                        if (pcCols.includes('status')) row['PC Status'] = pc?.status || '-';
                        if (pcCols.includes('ipAddress')) row['IP Address'] = (pc?.specs && pc.specs.ipAddress) ? pc.specs.ipAddress : '-';
                    }

                    return row;
                });
            }

            // Only add unified table if at least one column was populated
            if (unifiedRows.length > 0 && Object.keys(unifiedRows[0]).length > 0) {
                reportResults.unified = {
                    title: `Unified Joined Master Report (${entities.map(e => e.toUpperCase()).join(' + ')})`,
                    count: unifiedRows.length,
                    rows: unifiedRows
                };
            }
        } catch (err) {
            console.error('Error generating unified joined master report:', err);
        }
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
