const prisma = require('../config/database');

async function initQuizTables() {
    try {
        console.log('[QuizInit] Ensuring quiz tables exist...');

        // 1. Quizzes table
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "quizzes" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "code" VARCHAR(10) NOT NULL,
                "title" VARCHAR(255) NOT NULL,
                "description" TEXT,
                "keywords" TEXT,
                "difficulty" VARCHAR(50) DEFAULT 'medium',
                "total_questions" INTEGER NOT NULL DEFAULT 5,
                "time_limit_minutes" INTEGER NOT NULL DEFAULT 10,
                "questions" JSONB NOT NULL DEFAULT '[]',
                "status" VARCHAR(50) NOT NULL DEFAULT 'published',
                "created_by_id" UUID,
                "school_id" UUID,
                "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "quizzes_code_key" UNIQUE ("code")
            );
        `);

        // Index on code and created_by_id
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_quizzes_code" ON "quizzes"("code");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_quizzes_created_by" ON "quizzes"("created_by_id");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_quizzes_status" ON "quizzes"("status");
        `);

        // Add max_attempts column to quizzes if it does not exist
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER NOT NULL DEFAULT 1;
        `);

        // 2. Quiz Submissions table
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "quiz_submissions" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "quiz_id" UUID NOT NULL,
                "user_id" UUID NOT NULL,
                "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "max_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "correct_answers" INTEGER NOT NULL DEFAULT 0,
                "total_questions" INTEGER NOT NULL DEFAULT 0,
                "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
                "answers" JSONB NOT NULL DEFAULT '[]',
                "is_timed_out" BOOLEAN NOT NULL DEFAULT false,
                "submitted_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "quiz_submissions_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "fk_quiz_submissions_quiz" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_quiz_submissions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_quiz_submissions_quiz_id" ON "quiz_submissions"("quiz_id");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_quiz_submissions_user_id" ON "quiz_submissions"("user_id");
        `);

        // 3. Quiz Assignments table (assign to class, group, or student)
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "quiz_assignments" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "quiz_id" UUID NOT NULL,
                "target_type" VARCHAR(50) NOT NULL,
                "target_class_id" UUID,
                "target_group_id" UUID,
                "target_student_id" UUID,
                "assigned_by_id" UUID NOT NULL,
                "assigned_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "quiz_assignments_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "fk_quiz_assignments_quiz" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_quiz_assignments_class" FOREIGN KEY ("target_class_id") REFERENCES "classes"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_quiz_assignments_group" FOREIGN KEY ("target_group_id") REFERENCES "student_groups"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_quiz_assignments_student" FOREIGN KEY ("target_student_id") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_quiz_assignments_assigned_by" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_quiz_assignments_quiz_id" ON "quiz_assignments"("quiz_id");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_quiz_assignments_class_id" ON "quiz_assignments"("target_class_id");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_quiz_assignments_group_id" ON "quiz_assignments"("target_group_id");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_quiz_assignments_student_id" ON "quiz_assignments"("target_student_id");
        `);

        console.log('[QuizInit] Quiz tables successfully verified/created.');
    } catch (error) {
        console.error('[QuizInit] Error initializing quiz tables:', error.message);
    }
}

if (require.main === module) {
    initQuizTables()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = initQuizTables;
