const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

/**
 * Helper to normalize ePunjab and custom class names to canonical system names.
 * Examples:
 * - "12th Non Medical A", "12-NM-A", "XII NM A" -> "XII NM-A"
 * - "11th Commerce B", "11-COM-B", "XI COM B" -> "XI COM-B"
 * - "12th Medical A", "12-MED-A", "XII MED A" -> "XII MED-A"
 */
function normalizeClassName(rawClass, rawStream, rawSection) {
    const text = `${rawClass} ${rawStream || ''} ${rawSection || ''}`.toLowerCase().trim();
    if (!text) return '';

    let grade = '';
    if (text.includes('12') || text.includes('xii')) grade = 'XII';
    else if (text.includes('11') || text.includes('xi')) grade = 'XI';

    let stream = '';
    if (text.includes('non') || text.includes('nm')) stream = 'NM';
    else if (text.includes('com')) stream = 'COM';
    else if (text.includes('med')) stream = 'MED';

    let section = 'A';
    const secMatch = text.match(/\b([a-f])\b/i);
    if (secMatch) section = secMatch[1].toUpperCase();

    if (grade && stream) {
        return `${grade} ${stream}-${section}`;
    }
    return rawClass.trim();
}

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

    console.log(`Reading Excel/ePunjab file: ${absolutePath}...`);
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

    console.log('\n--- ePunjab / Excel Intelligent Preview & Mapping ---');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Helper to get field by possible column names (including ePunjab format)
        const getVal = (...keys) => {
            for (const key of Object.keys(row)) {
                const cleanKey = key.toLowerCase().trim().replace(/[\s-]/g, '_');
                for (const target of keys) {
                    const cleanTarget = target.toLowerCase().trim().replace(/[\s-]/g, '_');
                    if (cleanKey === cleanTarget) {
                        return String(row[key]).trim();
                    }
                }
            }
            return '';
        };

        const rawName = getVal('student_name', 'name', 'first_name', 'firstname', 'candidate_name', 'studentname');
        let firstName = rawName;
        let lastName = getVal('last_name', 'lastname', 'surname', 'father_name');

        if (!getVal('last_name', 'lastname', 'surname') && rawName.includes(' ')) {
            const parts = rawName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
        }
        if (!lastName) lastName = 'Student';

        if (!firstName) {
            console.log(`Row ${i + 2}: Skipped (Missing Student Name)`);
            failCount++;
            continue;
        }

        const rollNoRaw = getVal('roll_no', 'class_roll_no', 'roll', 'roll_number', 'sr_no', 'sn');
        const rollNumber = rollNoRaw ? parseInt(rollNoRaw) : (i + 1);
        const studentId = getVal('epunjab_id', 'student_id', 'studentid', 'admission_no', 'admission_number', 'reg_no');
        const phone = getVal('mobile', 'phone', 'contact', 'mobile_no', 'contact_no');
        
        const rawClass = getVal('class', 'class_name', 'grade');
        const rawStream = getVal('stream');
        const rawSection = getVal('section');
        
        const normalizedClassName = normalizeClassName(rawClass, rawStream, rawSection) || defaultClassName || '';

        // Match Class in DB
        let targetClass = null;
        if (normalizedClassName) {
            targetClass = classMap.get(normalizedClassName.toLowerCase().trim());
        }

        const email = getVal('email', 'email_address') || (studentId ? `${studentId}@epunjab.edu` : `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.school.edu`);

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
