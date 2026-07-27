const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Intelligent Indian Naming Gender Classification & Strict Gender Group Re-Organizer
 */

const FEMALE_FIRST_NAMES = new Set([
    'ananya', 'priya', 'simran', 'pooja', 'neha', 'sneha', 'divya', 'meenakshi', 'sunita',
    'anita', 'geeta', 'seema', 'rekha', 'kavita', 'deepa', 'monika', 'arti', 'aarti', 'sonia',
    'isha', 'tanya', 'riya', 'khushi', 'kumari', 'begum', 'lata', 'pushpa', 'radha', 'suman',
    'urmila', 'vidya', 'shobha', 'nirmala', 'savita', 'asha', 'sudha', 'bano', 'misha', 'kajal',
    'muskan', 'komal', 'sakshi', 'tanvi', 'palak', 'ishita', 'isita', 'jasleen', 'harleen', 'gurleen',
    'taranpreet', 'avneet', 'kiranjot', 'manjot', 'harjot', 'lovepreet', 'jasmeet', 'harmeet',
    'gurmeet', 'navjot', 'prabhjot', 'manmeet', 'sukhman', 'reena', 'tina', 'meena', 'veena',
    'shalu', 'sanam', 'jyoti', 'swati', 'preeti', 'archana', 'vandana', 'bharti', 'sapna',
    'dimple', 'twinkle', 'pinky', 'sweety', 'honey', 'dolly', 'ruby', 'simranjeet', 'taranjeet'
]);

const FEMALE_KEYWORDS = [
    'kaur', 'rani', 'devi', 'kumari', 'begum', 'f'
];

const MALE_FIRST_NAMES = new Set([
    'rahul', 'rohit', 'amit', 'sumit', 'vikas', 'vickey', 'deepak', 'sandeep', 'kuldeep',
    'mandeep', 'jagdeep', 'sukhdeep', 'hardeep', 'gurdeep', 'amrit', 'jaspreet', 'harpreet',
    'gurpreet', 'manpreet', 'rajwinder', 'tarun', 'varun', 'arun', 'karan', 'arjun', 'vijay',
    'ajay', 'sanjay', 'sujay', 'sunil', 'anil', 'sushil', 'kapil', 'sahil', 'nikhil', 'akhil',
    'pankaj', 'neeraj', 'suraj', 'dheeraj', 'balraj', 'yuvraj', 'hansraj', 'hemant', 'jayant',
    'yash', 'harsh', 'sparsh', 'laksh', 'daksh', 'vivan', 'aarav', 'vivaan', 'vihaan', 'advait',
    'kabir', 'reyansh', 'shreyas', 'atharva', 'ishaan', 'parth', 'devansh', 'samarth', 'ritvik'
]);

const MALE_KEYWORDS = [
    'singh', 'kumar', 'ram', 'lal', 'lall', 'chand', 'mohan', 'dutt', 'nath', 'raj',
    'parkash', 'prakash', 'dev', 'pal', 'paul', 'deep', 'jeet', 'vender', 'pinder', 'winder',
    'bhan', 'krishan', 'kishore', 'm'
];

function classifyGender(student) {
    if (student.gender) {
        const g = String(student.gender).toLowerCase().trim();
        if (g === 'female' || g === 'f' || g === 'girl') return 'female';
        if (g === 'male' || g === 'm' || g === 'boy') return 'male';
    }

    const firstName = (student.firstName || '').toLowerCase().trim();
    const lastName = (student.lastName || '').toLowerCase().trim();
    const fullName = `${firstName} ${lastName}`.trim();

    // 1. Check female explicit keywords (e.g. Kaur, Devi, Rani)
    for (const kw of FEMALE_KEYWORDS) {
        if (fullName.includes(kw)) return 'female';
    }

    // 2. Check male explicit keywords (e.g. Singh, Kumar, Lal)
    for (const kw of MALE_KEYWORDS) {
        if (fullName.includes(kw)) return 'male';
    }

    // 3. Check female first name set
    if (FEMALE_FIRST_NAMES.has(firstName)) return 'female';

    // 4. Check male first name set
    if (MALE_FIRST_NAMES.has(firstName)) return 'male';

    // Default heuristic for Indian names ending in 'a' or 'i' (frequently female) vs consonant/'o'/'u' (frequently male)
    if (firstName.endsWith('a') || firstName.endsWith('i') || firstName.endsWith('ee')) {
        return 'female';
    }

    return 'male';
}

async function processGendersAndGroups() {
    console.log('--- Starting Indian Name Gender Classification & Group Segregation ---');

    // 1. Update all student genders in DB
    const students = await prisma.user.findMany({
        where: { role: 'student' }
    });

    console.log(`Found ${students.length} student records in database.`);

    let maleCount = 0;
    let femaleCount = 0;

    for (const student of students) {
        const gender = classifyGender(student);
        if (gender === 'female') femaleCount++;
        else maleCount++;

        await prisma.user.update({
            where: { id: student.id },
            data: { gender }
        });
    }

    console.log(`Updated Student Genders in DB: ${maleCount} Boys (Male), ${femaleCount} Girls (Female).`);

    // 2. Scan all student groups and fix mixed-gender groups
    const allClasses = await prisma.class.findMany({
        select: { id: true, name: true }
    });

    let totalGroupsFixed = 0;

    for (const cls of allClasses) {
        const classGroups = await prisma.studentGroup.findMany({
            where: { classId: cls.id },
            include: {
                members: {
                    include: { student: true }
                }
            }
        });

        if (classGroups.length === 0) continue;

        // Check if any group has mixed genders
        let hasMixed = false;
        for (const g of classGroups) {
            const genders = g.members.map(m => m.student.gender);
            const hasM = genders.includes('male');
            const hasF = genders.includes('female');
            if (hasM && hasF) {
                hasMixed = true;
                break;
            }
        }

        if (hasMixed) {
            console.log(`Class "${cls.name}" has mixed-gender groups! Re-generating strict single-gender groups...`);
            
            // Delete existing groups for this class
            for (const g of classGroups) {
                await prisma.groupMember.deleteMany({ where: { groupId: g.id } });
                await prisma.studentGroup.delete({ where: { id: g.id } });
            }

            // Get all enrolled students for this class
            const enrollments = await prisma.classEnrollment.findMany({
                where: { classId: cls.id, status: 'active' },
                include: { student: true }
            });

            const classStudents = enrollments.map(e => e.student);
            const boys = classStudents.filter(s => s.gender === 'male');
            const girls = classStudents.filter(s => s.gender === 'female');

            let groupNum = 1;

            // Helper to create single-gender groups
            const createGenderGroupBatch = async (studentList, genderLabel) => {
                let i = 0;
                while (i < studentList.length) {
                    const remaining = studentList.length - i;
                    let size = remaining <= 3 ? remaining : (remaining === 4 ? 2 : 3);
                    const members = studentList.slice(i, i + size);

                    const group = await prisma.studentGroup.create({
                        data: {
                            classId: cls.id,
                            name: `Group ${groupNum} (${genderLabel})`,
                            createdById: (await prisma.user.findFirst({ where: { role: 'admin' } }))?.id || members[0].id,
                            members: {
                                create: members.map((m, idx) => ({
                                    studentId: m.id,
                                    role: idx === 0 ? 'leader' : 'member'
                                }))
                            }
                        }
                    });

                    i += size;
                    groupNum++;
                    totalGroupsFixed++;
                }
            };

            await createGenderGroupBatch(boys, 'Boys');
            await createGenderGroupBatch(girls, 'Girls');

            console.log(`Re-created ${groupNum - 1} single-gender groups for class "${cls.name}".`);
        }
    }

    console.log(`\nAll done! Updated all ${students.length} students with Indian name gender classification and ensured zero mixed-gender groups in database.`);
    await prisma.$disconnect();
}

processGendersAndGroups().catch(err => {
    console.error('Error:', err);
    prisma.$disconnect();
});
