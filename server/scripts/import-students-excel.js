const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

/**
 * Script to import students from an Excel (.xlsx / .xls) or CSV file.
 * 
 * Expected columns in Excel (flexible case-insensitive headers):
 * - Class / Class Name / Grade / Section (e.g. "XII NM-A", "12 NM-A", "XI COM-B")
 * - First Name / Name / Student Name
 * - Last Name
 * - Roll Number / Roll / Roll No
 * - Student ID / Admission No / Adm No / Reg No
 * - Email (Optional - auto generated if missing)
 * - Phone / Contact (Optional)
 * 
 * Usage: node server/scripts/import-students-excel.js <path-to-excel-or-csv-file> [target-class-id-or-name]
 */

async function importStudents() {
    const filePath = process.argv[2];
    const defaultClassName = process.argv[3];

    if (!filePath) {
        console.log('Usage: node server/scripts/import-students-excel.js <file-path> [default-class-name]');
        console.log('Example: node server/scripts/import-students-excel.js ./students.xlsx');
        process.exit(1);
    }

    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`Error: File not found at ${absolutePath}`);
        process.exit(1);
    }

    console.log(`Reading Excel file: ${absolutePath}...`);
    const workbook = XLSX.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`Found ${rows.length} rows in sheet "${sheetName}".`);

    // Fetch active session and classes
    const activeSession = await prisma.academicYear.findFirst({
        where: { isCurrent: true }
    });

    if (!activeSession) {
        console.error('Error: No active academic session found in DB!');
        process.exit(1);
    }

    const allClasses = await prisma.class.findMany({
        where: { academicYearId: activeSession.id }
    });

    const classMap = new Map();
    allClasses.forEach(c => {
        classMap.set(c.name.toLowerCase().trim(), c);
        classMap.set(`${c.gradeLevel}-${c.section}`.toLowerCase().trim(), c);
        classMap.set(`class ${c.gradeLevel}-${c.section}`.toLowerCase().trim(), c);
    });

    // Fetch default school
    const school = await prisma.school.findFirst();
    if (!school) {
        console.error('Error: No school found in DB!');
        process.exit(1);
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Helper to get field by possible column names
        const getVal = (...keys) => {
            for (const key of Object.keys(row)) {
                const cleanKey = key.toLowerCase().trim();
                for (const target of keys) {
                    if (cleanKey === target.toLowerCase()) {
                        return String(row[key]).trim();
                    }
                }
            }
            return '';
        };

        const rawName = getVal('First Name', 'FirstName', 'Name', 'Student Name', 'Full Name');
        let firstName = rawName;
        let lastName = getVal('Last Name', 'LastName', 'Surname');

        if (!lastName && rawName.includes(' ')) {
            const parts = rawName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
        }
        if (!lastName) lastName = 'Student';

        if (!firstName) {
            console.log(`Row ${i + 2}: Skipped (Missing Name)`);
            failCount++;
            continue;
        }

        const rollNoRaw = getVal('Roll Number', 'Roll No', 'Roll', 'RollNo');
        const rollNumber = rollNoRaw ? parseInt(rollNoRaw) : undefined;
        const studentId = getVal('Student ID', 'StudentID', 'Admission No', 'Admission Number', 'Adm No', 'Reg No');
        const phone = getVal('Phone', 'Mobile', 'Contact', 'Phone Number');
        const classNameRaw = getVal('Class', 'Class Name', 'ClassName', 'Grade', 'Section') || defaultClassName || '';

        // Match Class
        let targetClass = null;
        if (classNameRaw) {
            targetClass = classMap.get(classNameRaw.toLowerCase().trim());
        }

        const email = getVal('Email', 'Email Address') || `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.school.edu`;

        try {
            // Check if user already exists
            let user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email },
                        ...(studentId ? [{ studentId }] : [])
                    ]
                }
            });

            if (!user) {
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash('password123', salt);

                user = await prisma.user.create({
                    data: {
                        email,
                        passwordHash,
                        firstName,
                        lastName,
                        role: 'student',
                        schoolId: school.id,
                        phone: phone || null,
                        studentId: studentId || null,
                        admissionNumber: studentId || null
                    }
                });
            }

            // Enroll in class if matched
            if (targetClass) {
                await prisma.classEnrollment.upsert({
                    where: {
                        studentId_classId: {
                            studentId: user.id,
                            classId: targetClass.id
                        }
                    },
                    update: {
                        rollNumber: rollNumber || undefined,
                        status: 'active'
                    },
                    create: {
                        studentId: user.id,
                        classId: targetClass.id,
                        rollNumber: rollNumber || undefined,
                        status: 'active'
                    }
                });
            }

            console.log(`Row ${i + 2}: Successfully imported ${firstName} ${lastName} (${targetClass ? targetClass.name : 'No Class'})`);
            successCount++;
        } catch (err) {
            console.error(`Row ${i + 2}: Error importing ${firstName} ${lastName}:`, err.message);
            failCount++;
        }
    }

    console.log(`\nImport Summary: ${successCount} imported successfully, ${failCount} failed.`);
    await prisma.$disconnect();
}

importStudents().catch(err => {
    console.error('Import failed:', err);
    prisma.$disconnect();
});
