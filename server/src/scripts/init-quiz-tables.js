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

        // 4. Question Bank table (for exam types like GATE, JEE, UGC-NET, topics, years, and authentic questions)
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "question_bank" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "topic" VARCHAR(255) NOT NULL,
                "exam_type" VARCHAR(100) NOT NULL,
                "exam_year" VARCHAR(50),
                "difficulty" VARCHAR(50) DEFAULT 'medium',
                "question" TEXT NOT NULL,
                "options" JSONB NOT NULL DEFAULT '[]',
                "correct_option" VARCHAR(10) NOT NULL,
                "explanation" TEXT,
                "points" INTEGER NOT NULL DEFAULT 1,
                "source" VARCHAR(100) DEFAULT 'question_bank',
                "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_question_bank_topic" ON "question_bank"("topic");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_question_bank_exam_type" ON "question_bank"("exam_type");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_question_bank_exam_year" ON "question_bank"("exam_year");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_question_bank_lookup" ON "question_bank"("exam_type", "exam_year", "topic");
        `);

        // Seed authentic GATE Computer Science Architecture questions if not present
        const existingCount = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*)::int as count FROM "question_bank" 
            WHERE "exam_type" ILIKE '%GATE%' AND "topic" ILIKE '%Architecture%';
        `);

        if (existingCount[0]?.count === 0) {
            console.log('[QuizInit] Seeding authentic GATE Computer Science Architecture questions...');
            const seedQuestions = [
                {
                    topic: 'Computer Science Architecture',
                    exam_type: 'GATE',
                    exam_year: '2026',
                    difficulty: 'medium',
                    question: 'Consider a 5-stage instruction pipeline (IF, ID, EX, MEM, WB) executing a program of 1000 instructions where each stage takes 1 clock cycle. 20% of instructions are branch instructions. Assume that 60% of branch instructions are taken and cause a 2-cycle branch penalty (stall), while untaken branches cause 0 penalty cycles. There are no other data or structural hazards. What is the average Cycles Per Instruction (CPI) of the pipeline?',
                    options: [
                        { key: 'A', text: '1.12' },
                        { key: 'B', text: '1.24' },
                        { key: 'C', text: '1.48' },
                        { key: 'D', text: '1.60' }
                    ],
                    correct_option: 'B',
                    explanation: 'Base CPI for an ideal pipeline without hazards is 1 cycle. Penalty only occurs on taken branches. Fraction of branch instructions = 0.20. Fraction of taken branches = $0.20 \\times 0.60 = 0.12$ (12% of total instructions). Each taken branch incurs a penalty of 2 cycles. Therefore, average CPI = $\\text{Base CPI} + (\\text{Branch Frequency} \\times \\text{Branch Taken Fraction} \\times \\text{Penalty}) = 1 + (0.20 \\times 0.60 \\times 2) = 1 + 0.24 = 1.24$.',
                    points: 1,
                    source: 'gate_official_archive'
                },
                {
                    topic: 'Computer Science Architecture',
                    exam_type: 'GATE',
                    exam_year: '2026',
                    difficulty: 'medium',
                    question: 'A 32-bit byte-addressable processor has a 64 KB 4-way set-associative L1 data cache with a cache block (line) size of 64 bytes. How many bits are used for the Tag, Set Index, and Block Offset fields respectively?',
                    options: [
                        { key: 'A', text: '18 bits, 8 bits, 6 bits' },
                        { key: 'B', text: '16 bits, 10 bits, 6 bits' },
                        { key: 'C', text: '20 bits, 6 bits, 6 bits' },
                        { key: 'D', text: '17 bits, 9 bits, 6 bits' }
                    ],
                    correct_option: 'A',
                    explanation: 'Address space = 32 bits. 1. Block size = 64 bytes = $2^6$ bytes $\\implies$ Block Offset = 6 bits. 2. Total cache capacity = 64 KB = $64 \\times 1024 = 65,536$ bytes. Number of blocks in cache = $\\frac{65,536}{64} = 1024$ lines. Since it is 4-way set associative, number of sets = $\\frac{1024}{4} = 256 = 2^8$ sets $\\implies$ Set Index = 8 bits. 3. Tag bits = $32 - (\\text{Set Index} + \\text{Block Offset}) = 32 - (8 + 6) = 32 - 14 = 18$ bits. Hence, Tag = 18 bits, Set Index = 8 bits, Block Offset = 6 bits.',
                    points: 1,
                    source: 'gate_official_archive'
                },
                {
                    topic: 'Computer Science Architecture',
                    exam_type: 'GATE',
                    exam_year: '2026',
                    difficulty: 'medium',
                    question: 'In a computer system, the L1 cache access time is 2 ns with a hit ratio of 0.90. The L2 cache access time is 10 ns with a local hit ratio of 0.80. The main memory access time is 80 ns. What is the Effective Memory Access Time (EMAT) assuming a hierarchical simultaneous lookup where L1 miss triggers L2, and L2 miss triggers main memory?',
                    options: [
                        { key: 'A', text: '4.6 ns' },
                        { key: 'B', text: '3.8 ns' },
                        { key: 'C', text: '5.2 ns' },
                        { key: 'D', text: '6.4 ns' }
                    ],
                    correct_option: 'A',
                    explanation: '$\\text{EMAT} = T_{L1} + (1 - H_{L1}) \\times [T_{L2} + (1 - H_{L2}) \\times T_{MM}]$. Given: $T_{L1} = 2\\text{ ns}$, $H_{L1} = 0.90$, Miss Rate L1 = $1 - 0.90 = 0.10$. $T_{L2} = 10\\text{ ns}$, $H_{L2} = 0.80$, Miss Rate L2 = $1 - 0.80 = 0.20$. $T_{MM} = 80\\text{ ns}$. Penalty on L1 miss = $10 + (0.20 \\times 80) = 10 + 16 = 26\\text{ ns}$. Therefore, $\\text{EMAT} = 2 + (0.10 \\times 26) = 2 + 2.6 = 4.6\\text{ ns}$.',
                    points: 1,
                    source: 'gate_official_archive'
                },
                {
                    topic: 'Computer Science Architecture',
                    exam_type: 'GATE',
                    exam_year: '2026',
                    difficulty: 'medium',
                    question: 'The decimal number -27.625 is represented in IEEE-754 32-bit single-precision floating-point format. What is the hexadecimal representation of the 32-bit word?',
                    options: [
                        { key: 'A', text: '0xC1DD0000' },
                        { key: 'B', text: '0xC1DC0000' },
                        { key: 'C', text: '0x41DD0000' },
                        { key: 'D', text: '0xC2DC0000' }
                    ],
                    correct_option: 'A',
                    explanation: '1. Sign bit ($S$): Negative number $\\implies S = 1$. 2. Binary conversion: $27 = 11011_2$. Fractional part $0.625 = 0.5 + 0.125 = 0.101_2$. So $27.625 = 11011.101_2 = 1.1011101_2 \\times 2^4$. 3. Biased Exponent ($E$): Excess-127 bias, so $E = 4 + 127 = 131 = 10000011_2$. 4. Mantissa ($M$): Fractional part after leading 1 is $1011101_2$, padded to 23 bits with trailing zeros: $10111010000000000000000_2$. 5. Combine: $S = 1$, $E = 10000011$, $M = 10111010000000000000000$. Group into 4 bits: `1100 0001 1101 1101 0000 0000 0000 0000` = `0xC1DD0000`.',
                    points: 1,
                    source: 'gate_official_archive'
                },
                {
                    topic: 'Computer Science Architecture',
                    exam_type: 'GATE',
                    exam_year: '2026',
                    difficulty: 'medium',
                    question: 'A 32-bit virtual address space uses a two-level page table system with a page size of 4 KB. Each page table entry (PTE) at both levels is 4 bytes. The virtual address is split into $(p_1, p_2, d)$ where $p_1$ is the outer page directory index, $p_2$ is the inner page table index, and $d$ is the page offset. To ensure each page table fits exactly into a single page frame, how many bits are allocated to $p_1$ and $p_2$?',
                    options: [
                        { key: 'A', text: '$p_1 = 10$ bits, $p_2 = 10$ bits' },
                        { key: 'B', text: '$p_1 = 12$ bits, $p_2 = 8$ bits' },
                        { key: 'C', text: '$p_1 = 8$ bits, $p_2 = 12$ bits' },
                        { key: 'D', text: '$p_1 = 11$ bits, $p_2 = 9$ bits' }
                    ],
                    correct_option: 'A',
                    explanation: 'Page size = 4 KB = $2^{12}$ bytes $\\implies$ Offset $d = 12$ bits. Remaining bits for virtual page number = $32 - 12 = 20$ bits. Size of one page frame = 4 KB = 4096 bytes. Each PTE = 4 bytes. The maximum number of PTEs that can fit in a single page frame = $\\frac{4096}{4} = 1024 = 2^{10}$ entries. Thus, the inner page table index $p_2$ must be $\\log_2(1024) = 10$ bits so that the inner page table fits in a single frame. The remaining bits for $p_1 = 20 - 10 = 10$ bits. Thus, $p_1 = 10$ bits, $p_2 = 10$ bits.',
                    points: 1,
                    source: 'gate_official_archive'
                },
                {
                    topic: 'Computer Science Architecture',
                    exam_type: 'GATE',
                    exam_year: '2025',
                    difficulty: 'medium',
                    question: 'A non-pipelined processor has a cycle time of 10 ns to execute an instruction. The processor is designed as a 5-stage pipeline where stage delays are 2 ns, 3 ns, 2.5 ns, 1.5 ns, and 1 ns. An additional pipeline register delay of 0.5 ns is introduced per stage. What is the maximum speedup achievable by this pipelined processor over the non-pipelined processor for a large number of instructions?',
                    options: [
                        { key: 'A', text: '2.86' },
                        { key: 'B', text: '3.33' },
                        { key: 'C', text: '2.50' },
                        { key: 'D', text: '4.00' }
                    ],
                    correct_option: 'A',
                    explanation: 'In the pipelined processor, the clock cycle time is determined by the slowest stage plus the register delay: $\\tau = \\max(2, 3, 2.5, 1.5, 1) + 0.5 = 3 + 0.5 = 3.5\\text{ ns}$. The non-pipelined execution time per instruction is $T_{\\text{non-pipe}} = 10\\text{ ns}$. For a large number of instructions ($n \\to \\infty$), the pipelined processor completes one instruction every clock cycle $\\tau = 3.5\\text{ ns}$. Thus, Speedup = $\\frac{T_{\\text{non-pipe}}}{\\tau} = \\frac{10}{3.5} \\approx 2.857 \\approx 2.86$.',
                    points: 1,
                    source: 'gate_official_archive'
                }
            ];

            for (const sq of seedQuestions) {
                await prisma.$executeRawUnsafe(`
                    INSERT INTO "question_bank" ("topic", "exam_type", "exam_year", "difficulty", "question", "options", "correct_option", "explanation", "points", "source")
                    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
                `, sq.topic, sq.exam_type, sq.exam_year, sq.difficulty, sq.question, JSON.stringify(sq.options), sq.correct_option, sq.explanation, sq.points, sq.source);
            }
            console.log('[QuizInit] Successfully seeded GATE Computer Science Architecture questions.');
        }

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
