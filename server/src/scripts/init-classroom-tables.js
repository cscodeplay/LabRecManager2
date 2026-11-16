const prisma = require('../config/database');

async function initClassroomTables() {
    try {
        console.log('[initClassroomTables] Ensuring classrooms and class_incharges tables exist...');

        // 1. Create classrooms table
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "classrooms" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "school_id" UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
                "academic_year_id" UUID REFERENCES "academic_years"("id") ON DELETE SET NULL,
                "room_number" VARCHAR(50) NOT NULL,
                "room_name" VARCHAR(100),
                "room_type" VARCHAR(50) DEFAULT 'classroom',
                "class_id" UUID REFERENCES "classes"("id") ON DELETE SET NULL,
                "capacity" INT DEFAULT 40,
                "building" VARCHAR(100),
                "floor" VARCHAR(50),
                "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "classrooms_school_room_unique" UNIQUE ("school_id", "room_number")
            );
        `);

        // 2. Create class_incharges table
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "class_incharges" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "school_id" UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
                "academic_year_id" UUID REFERENCES "academic_years"("id") ON DELETE SET NULL,
                "class_id" UUID NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
                "staff_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "designation" VARCHAR(100) DEFAULT 'Class Incharge / PGT',
                "room_number" VARCHAR(50),
                "is_primary" BOOLEAN DEFAULT true,
                "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "class_incharges_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "class_incharges_class_staff_unique" UNIQUE ("class_id", "staff_id", "is_primary")
            );
        `);

        // 3. Seed initial default classrooms and map them to classes
        const defaultSchool = await prisma.school.findFirst({ select: { id: true } });
        if (!defaultSchool) {
            console.log('[initClassroomTables] No default school found, skipping seeding.');
            return;
        }

        const currentYear = await prisma.academicYear.findFirst({
            where: { isCurrent: true },
            select: { id: true, yearLabel: true }
        });

        // Get classes
        const classes = await prisma.class.findMany({
            where: { schoolId: defaultSchool.id, ...(currentYear?.id ? { academicYearId: currentYear.id } : {}) },
            orderBy: [{ gradeLevel: 'asc' }, { section: 'asc' }],
            select: { id: true, name: true, section: true, gradeLevel: true }
        });

        // Get staff
        const instructors = await prisma.user.findMany({
            where: {
                schoolId: defaultSchool.id,
                role: { in: ['instructor', 'admin', 'principal', 'lab_assistant'] }
            },
            select: { id: true, firstName: true, lastName: true, role: true }
        });

        console.log(`[initClassroomTables] Found ${classes.length} classes and ${instructors.length} staff members.`);

        // Seed Room 5 specifically (as in reference voucher) and rooms 1-20
        const roomNumbers = [
            '5', '1', '2', '3', '4', '6', '7', '8', '9', '10',
            '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'
        ];

        for (let i = 0; i < roomNumbers.length; i++) {
            const rm = roomNumbers[i];
            const cls = classes[i % classes.length];
            const staff = instructors[i % (instructors.length || 1)];

            // Check if room exists
            const existingRoom = await prisma.$queryRaw`
                SELECT id FROM "classrooms" WHERE "school_id" = ${defaultSchool.id}::uuid AND "room_number" = ${rm};
            `;

            let roomId;
            if (!existingRoom || existingRoom.length === 0) {
                const roomName = rm === '5' ? 'Room 5 (Smart Classroom)' : `Room ${rm} (${cls ? cls.name : 'Classroom'})`;
                const roomType = rm === '5' ? 'smart_classroom' : 'classroom';

                const inserted = await prisma.$queryRaw`
                    INSERT INTO "classrooms" (
                        "school_id", "academic_year_id", "room_number", "room_name", "room_type", "class_id", "capacity", "floor"
                    ) VALUES (
                        ${defaultSchool.id}::uuid,
                        ${currentYear?.id || null}::uuid,
                        ${rm},
                        ${roomName},
                        ${roomType},
                        ${cls?.id || null}::uuid,
                        40,
                        'Ground Floor'
                    )
                    RETURNING id;
                `;
                roomId = inserted[0]?.id;
            }

            // Also seed incharge if class and staff exist
            if (cls && staff) {
                const existingIncharge = await prisma.$queryRaw`
                    SELECT id FROM "class_incharges" 
                    WHERE "class_id" = ${cls.id}::uuid AND "staff_id" = ${staff.id}::uuid AND "is_primary" = true;
                `;

                if (!existingIncharge || existingIncharge.length === 0) {
                    const designation = staff.role === 'principal' ? 'Principal / Incharge' : 'Class Incharge / PGT';
                    await prisma.$executeRawUnsafe(`
                        INSERT INTO "class_incharges" (
                            "school_id", "academic_year_id", "class_id", "staff_id", "designation", "room_number", "is_primary"
                        ) VALUES (
                            '${defaultSchool.id}',
                            ${currentYear?.id ? `'${currentYear.id}'` : 'NULL'},
                            '${cls.id}',
                            '${staff.id}',
                            '${designation}',
                            '${rm}',
                            true
                        )
                        ON CONFLICT ("class_id", "staff_id", "is_primary") DO NOTHING;
                    `);
                }
            }
        }

        console.log('[initClassroomTables] classrooms and class_incharges verified and seeded successfully.');
    } catch (err) {
        console.error('[initClassroomTables] Error:', err);
    }
}

if (require.main === module) {
    initClassroomTables().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = initClassroomTables;
