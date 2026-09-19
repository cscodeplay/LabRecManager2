const prisma = require('../config/database');

async function initTables() {
    try {
        console.log('Ensuring whiteboard tables exist...');
        
        await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                CREATE TYPE "WhiteboardSessionStatus" AS ENUM ('active', 'paused', 'ended');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        
        await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                CREATE TYPE "WhiteboardTargetType" AS ENUM ('class', 'group', 'student');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        
        await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                CREATE TYPE "WhiteboardParticipantRole" AS ENUM ('host', 'cohost', 'viewer');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "whiteboard_sessions" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "school_id" UUID NOT NULL,
                "host_id" UUID NOT NULL,
                "title" VARCHAR(255),
                "status" "WhiteboardSessionStatus" NOT NULL DEFAULT 'active',
                "target_type" "WhiteboardTargetType",
                "target_class_id" UUID,
                "target_group_id" UUID,
                "started_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                "ended_at" TIMESTAMP(6),
                "recording_url" TEXT,
                "is_recording" BOOLEAN DEFAULT false,
                "canvas_data" TEXT,
                "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "whiteboard_sessions_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "whiteboard_participants" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "session_id" UUID NOT NULL,
                "user_id" UUID NOT NULL,
                "role" "WhiteboardParticipantRole" NOT NULL DEFAULT 'viewer',
                "joined_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                "left_at" TIMESTAMP(6),
                "is_active" BOOLEAN DEFAULT true,
                CONSTRAINT "whiteboard_participants_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "whiteboard_recordings" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "user_id" UUID NOT NULL,
                "school_id" UUID NOT NULL,
                "title" VARCHAR(255) NOT NULL,
                "description" TEXT,
                "session_id" VARCHAR(100),
                "cloudinary_id" VARCHAR(255) NOT NULL,
                "cloudinary_url" TEXT NOT NULL,
                "thumbnail_url" TEXT,
                "duration" INTEGER,
                "file_size" INTEGER,
                "is_public" BOOLEAN NOT NULL DEFAULT true,
                "share_token" VARCHAR(64),
                "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "whiteboard_recordings_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "whiteboard_recording_shares" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "recording_id" UUID NOT NULL,
                "shared_by_id" UUID NOT NULL,
                "target_type" document_share_target_type NOT NULL,
                "target_class_id" UUID,
                "target_group_id" UUID,
                "target_user_id" UUID,
                "message" TEXT,
                "shared_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "whiteboard_recording_shares_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "whiteboard_recording_shares_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "whiteboard_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "whiteboard_recording_shares_shared_by_id_fkey" FOREIGN KEY ("shared_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
                CONSTRAINT "whiteboard_recording_shares_target_class_id_fkey" FOREIGN KEY ("target_class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "whiteboard_recording_shares_target_group_id_fkey" FOREIGN KEY ("target_group_id") REFERENCES "student_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "whiteboard_recording_shares_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
        `);

        // Ensure meeting-related enums exist
        await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                CREATE TYPE "MeetingMode" AS ENUM ('online', 'offline', 'recorded');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                CREATE TYPE "MeetingStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await prisma.$executeRawUnsafe(`
            DO $$ BEGIN
                CREATE TYPE "ParticipantStatus" AS ENUM ('waiting', 'admitted', 'in_session', 'left', 'rejected');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Ensure meetings table exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "meetings" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "school_id" UUID NOT NULL,
                "title" VARCHAR(255) NOT NULL,
                "type" VARCHAR(50) DEFAULT 'instant',
                "target_class_id" UUID,
                "target_group_id" UUID,
                "target_student_id" UUID,
                "submission_id" UUID,
                "host_id" UUID NOT NULL,
                "scheduled_at" TIMESTAMP(6),
                "duration_minutes" INTEGER DEFAULT 10,
                "actual_start_time" TIMESTAMP(6),
                "actual_end_time" TIMESTAMP(6),
                "mode" "MeetingMode" DEFAULT 'online',
                "meeting_link" TEXT,
                "recording_url" TEXT,
                "questions_asked" JSONB,
                "student_responses" JSONB,
                "marks_obtained" DECIMAL(5,2),
                "max_marks" DECIMAL(5,2),
                "performance_rating" INTEGER,
                "examiner_remarks" TEXT,
                "examiner_remarks_hindi" TEXT,
                "improvement_suggestions" TEXT,
                "status" "MeetingStatus" DEFAULT 'scheduled',
                "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                "scheduled_end_time" TIMESTAMP(6),
                "auto_start" BOOLEAN DEFAULT true,
                "recording_file_path" TEXT,
                "recording_size_bytes" INTEGER,
                "recording_duration_seconds" INTEGER,
                CONSTRAINT "meetings_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "meetings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "meetings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            );
        `);

        // Ensure meeting_participants table exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "meeting_participants" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "session_id" UUID NOT NULL,
                "user_id" UUID NOT NULL,
                "role" VARCHAR(50) DEFAULT 'student',
                "status" "ParticipantStatus" DEFAULT 'waiting',
                "joined_waiting_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                "admitted_at" TIMESTAMP(6),
                "left_at" TIMESTAMP(6),
                "socket_id" VARCHAR(255),
                "is_video_enabled" BOOLEAN DEFAULT false,
                "is_audio_enabled" BOOLEAN DEFAULT false,
                CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "meeting_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "meeting_participants_session_user_unique" UNIQUE ("session_id", "user_id")
            );
        `);

        console.log('Whiteboard and Meeting tables verified/created successfully.');

        // Ensure document_shares schema is up to date with 'student' target type and permissions
        try {
            console.log('Ensuring document_shares schema & constraints are up to date...');
            await prisma.$executeRawUnsafe(`
                DO $$ BEGIN
                    ALTER TYPE "document_share_target_type" ADD VALUE IF NOT EXISTS 'student';
                EXCEPTION WHEN duplicate_object THEN null;
                END $$;
            `);

            await prisma.$executeRawUnsafe(`
                DO $$ BEGIN
                    ALTER TABLE "document_shares" DROP CONSTRAINT IF EXISTS "valid_target";
                    ALTER TABLE "document_shares" ADD CONSTRAINT "valid_target" CHECK (
                        (target_type = 'class' AND target_class_id IS NOT NULL) OR
                        (target_type = 'group' AND target_group_id IS NOT NULL) OR
                        (target_type IN ('instructor', 'admin', 'student') AND target_user_id IS NOT NULL)
                    );
                EXCEPTION WHEN others THEN
                    RAISE NOTICE 'Could not update valid_target constraint: %', SQLERRM;
                END $$;
            `);

            await prisma.$executeRawUnsafe(`
                DO $$ BEGIN
                    CREATE TYPE "share_permission" AS ENUM ('view', 'download');
                EXCEPTION WHEN duplicate_object THEN null;
                END $$;
            `);

            await prisma.$executeRawUnsafe(`
                DO $$ BEGIN
                    ALTER TABLE "document_shares" ADD COLUMN IF NOT EXISTS "permission" "share_permission" NOT NULL DEFAULT 'download';
                EXCEPTION WHEN others THEN null;
                END $$;
            `);

            await prisma.$executeRawUnsafe(`
                DO $$ BEGIN
                    ALTER TABLE "folder_shares" ADD COLUMN IF NOT EXISTS "permission" "share_permission" NOT NULL DEFAULT 'download';
                EXCEPTION WHEN others THEN null;
                END $$;
            `);
            console.log('Document sharing schema & constraints verified successfully.');
        } catch (docShareErr) {
            console.warn('Document sharing schema update notice:', docShareErr.message);
        }

        // Ensure system_settings table exists for persistent OAuth tokens and configurations
        try {
            console.log('Ensuring system_settings table exists...');
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "system_settings" (
                    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                    "key" VARCHAR(100) UNIQUE NOT NULL,
                    "value" JSONB NOT NULL,
                    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
                );
            `);
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS "idx_system_settings_key" ON "system_settings"("key");
            `);
            console.log('system_settings table verified successfully.');
        } catch (setErr) {
            console.warn('system_settings table init notice:', setErr.message);
        }

        // Ensure implementation_plans table exists
        try {
            console.log('Ensuring implementation_plans table exists...');
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "implementation_plans" (
                    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                    "school_id" UUID,
                    "created_by_id" UUID,
                    "title" VARCHAR(255) NOT NULL,
                    "description" TEXT,
                    "category" VARCHAR(100) DEFAULT 'General',
                    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
                    "started_at" TIMESTAMP(6),
                    "ended_at" TIMESTAMP(6),
                    "tasks" JSONB DEFAULT '[]'::jsonb,
                    "outcomes" TEXT,
                    "metadata" JSONB DEFAULT '{}'::jsonb,
                    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "implementation_plans_pkey" PRIMARY KEY ("id")
                );
            `);

            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS "idx_implementation_plans_status" ON "implementation_plans"("status")
            `);
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS "idx_implementation_plans_dates" ON "implementation_plans"("started_at", "ended_at")
            `);
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS "idx_implementation_plans_category" ON "implementation_plans"("category")
            `);

            const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "implementation_plans"`);
            const currentCount = countResult?.[0]?.count || 0;
            if (currentCount === 0) {
                console.log('Seeding initial implementation plans...');
                const seedPlans = [
                    {
                        title: 'Document Sharing & Permissions Architecture Fix',
                        description: 'Resolved chatbot entity resolution, check constraints on PostgreSQL for student targets, and parallelized option fetching with 1-click select all.',
                        category: 'Documents & Sharing',
                        status: 'completed',
                        started_at: '2026-09-18 10:30:00',
                        ended_at: '2026-09-18 12:15:00',
                        tasks: JSON.stringify([
                            { title: 'Update valid_target CHECK constraint on document_shares table', completed: true, completedAt: '2026-09-18T10:45:00Z' },
                            { title: 'Implement fuzzy token overlap scoring in chatbot service', completed: true, completedAt: '2026-09-18T11:10:00Z' },
                            { title: 'Add "Select All" / "Deselect All" options in Step 2 of Share modal', completed: true, completedAt: '2026-09-18T11:40:00Z' },
                            { title: 'Convert confirmation card to compact icon-only buttons with tooltips', completed: true, completedAt: '2026-09-18T12:00:00Z' },
                            { title: 'Verify student document retrieval filter when schoolId is null', completed: true, completedAt: '2026-09-18T12:15:00Z' }
                        ]),
                        outcomes: 'Zero false-positive student matches, robust multi-target sharing with transaction safety, and instant UI table refresh.'
                    },
                    {
                        title: 'Interactive Realtime Whiteboard & Sockets Engine',
                        description: 'Built multi-user collaborative canvas with socket broadcasting, stroke persistence, shapes engine, and WebM session recording.',
                        category: 'Whiteboard & Collab',
                        status: 'completed',
                        started_at: '2026-09-17 14:00:00',
                        ended_at: '2026-09-17 17:30:00',
                        tasks: JSON.stringify([
                            { title: 'Architect Socket.IO room lifecycle and authentication', completed: true, completedAt: '2026-09-17T14:30:00Z' },
                            { title: 'Build canvas rendering pipeline with brush, highlighter, eraser', completed: true, completedAt: '2026-09-17T15:15:00Z' },
                            { title: 'Implement sticky notes and geometric shape connectors', completed: true, completedAt: '2026-09-17T16:00:00Z' },
                            { title: 'Add in-browser screen and audio recording with WebM export', completed: true, completedAt: '2026-09-17T17:10:00Z' },
                            { title: 'Verify live participant permissions and host controls', completed: true, completedAt: '2026-09-17T17:30:00Z' }
                        ]),
                        outcomes: 'Smooth 60fps real-time collaboration with zero stroke lag, session persistence, and recording playback.'
                    },
                    {
                        title: 'AI Training Curriculum & Socratic Practice Copilot',
                        description: 'Engineered automated multi-unit syllabus generation from textbook content with test runner and Socratic hints.',
                        category: 'AI & Training',
                        status: 'completed',
                        started_at: '2026-09-16 09:00:00',
                        ended_at: '2026-09-16 16:45:00',
                        tasks: JSON.stringify([
                            { title: 'Integrate Groq and Gemini SDKs with JSON schema output', completed: true, completedAt: '2026-09-16T10:30:00Z' },
                            { title: 'Create Chapter exercise generator targeting textbook topics', completed: true, completedAt: '2026-09-16T12:00:00Z' },
                            { title: 'Implement automated code execution test runner', completed: true, completedAt: '2026-09-16T14:30:00Z' },
                            { title: 'Build student code editor with Monaco and Socratic hints', completed: true, completedAt: '2026-09-16T16:45:00Z' }
                        ]),
                        outcomes: 'Generated aligned coding modules with automated test cases and instantaneous student feedback.'
                    },
                    {
                        title: 'Multi-Tenant Cloud Storage Quota & Archival System',
                        description: 'Optimizing file uploads, Cloudinary/Render bucket usage tracking, and automated quota re-calculation.',
                        category: 'Storage & Infra',
                        status: 'in_progress',
                        started_at: '2026-09-18 11:00:00',
                        ended_at: null,
                        tasks: JSON.stringify([
                            { title: 'Implement chunked multipart upload for files > 50MB', completed: true, completedAt: '2026-09-18T11:45:00Z' },
                            { title: 'Add real-time storage quota gauges in admin dashboard', completed: true, completedAt: '2026-09-18T12:00:00Z' },
                            { title: 'Automate weekly storage quota reports via email', completed: false, completedAt: null }
                        ]),
                        outcomes: 'In progress - Storage calculation active with real-time tracking.'
                    }
                ];

                for (const plan of seedPlans) {
                    await prisma.$executeRawUnsafe(`
                        INSERT INTO "implementation_plans" 
                        ("title", "description", "category", "status", "started_at", "ended_at", "tasks", "outcomes")
                        VALUES ($1, $2, $3, $4, $5::timestamp, $6::timestamp, $7::jsonb, $8)
                    `, plan.title, plan.description, plan.category, plan.status, plan.started_at, plan.ended_at, plan.tasks, plan.outcomes);
                }
                console.log('Seeded initial implementation plans successfully.');
            }

            // Ensure Next Build Ultimate AIM plan exists
            const nextBuildCheck = await prisma.$queryRawUnsafe(`
                SELECT id FROM "implementation_plans" WHERE title ILIKE '%Ultimate AIM%' LIMIT 1
            `);
            if (!nextBuildCheck || nextBuildCheck.length === 0) {
                console.log('Inserting Next Build Ultimate AIM implementation plan...');
                const ultimateAimTasks = JSON.stringify([
                    { id: 'qp-1', title: 'Architect 2D Interactive Blueprint Matrix (units/chapters vs 1m, 2m, 3m, 4m case-study, 5m questions with auto-tallying total marks)', completed: false, duration_minutes: 180 },
                    { id: 'qp-2', title: 'Implement dynamic annual pattern presets (CBSE, ICSE, State Boards, custom school exam schemes with section-level internal "OR" choices)', completed: false, duration_minutes: 120 },
                    { id: 'qp-3', title: 'Build syllabus & curriculum source ingestion (upload textbook PDF, syllabus doc, past papers with OCR parsing)', completed: false, duration_minutes: 150 },
                    { id: 'qp-4', title: 'Engine dual-document generation: Student Exam Paper + Teacher Scoring Rubric & Step-by-Step Answer Key', completed: false, duration_minutes: 180 },
                    { id: 'qp-5', title: 'Implement export to print-ready PDF with school letterhead, watermark, and 1-click cloud sync to 5TB Google Drive', completed: false, duration_minutes: 90 },
                    { id: 'lp-1', title: 'Build period duration pacing calculator (30m, 35m, 40m, 45m, 80m block periods) with automatic minute allocation per phase', completed: false, duration_minutes: 120 },
                    { id: 'lp-2', title: 'Implement pedagogy instructional frameworks selector (5E Model, Bloom\'s Taxonomy Mastery, Hands-on Lab Discovery, Problem-Based Learning)', completed: false, duration_minutes: 150 },
                    { id: 'lp-3', title: 'Create comprehensive Classroom Pack generator: Lesson overview, blackboard/smart panel layout, teacher discussion prompts, and exit slips', completed: false, duration_minutes: 140 },
                    { id: 'lp-4', title: 'Integrate multi-tier student differentiation engine (remedial scaffolds for struggling learners & advanced extension challenges for fast learners)', completed: false, duration_minutes: 120 },
                    { id: 'sp-1', title: 'Develop touch-first high-contrast fullscreen IFPD presentation mode (optimized for 65", 75", 86" smart panels with pen overlay)', completed: false, duration_minutes: 200 },
                    { id: 'sp-2', title: 'Build step-by-step interactive visual tracer (code execution, loop iterations, flowchart paths, math derivations with touch "Next Step" button)', completed: false, duration_minutes: 240 },
                    { id: 'sp-3', title: 'Create clickable smart charts & concept maps engine (dynamic Mermaid.js, SVG flowcharts, expandable mind-maps)', completed: false, duration_minutes: 160 },
                    { id: 'sp-4', title: 'Implement live student quick-poll / exit ticket system via QR code or short PIN with instant real-time response charts on smart panel', completed: false, duration_minutes: 210 },
                    { id: 'sp-5', title: 'Add 1-click smart panel whiteboard snapshot capture with auto-export to student portal and class Google Drive folder', completed: false, duration_minutes: 90 },
                    { id: 'ai-1', title: 'Set up multi-provider AI model router (Groq Llama 3.3 for high-speed text, Gemini 2.0 Flash for multimodal vision/PDF OCR, image/audio utilities)', completed: false, duration_minutes: 150 },
                    { id: 'ai-2', title: 'Implement prompt template management and persistent teacher preset library for recurring department workflows', completed: false, duration_minutes: 100 }
                ]);
                const ultimateAimMeta = JSON.stringify({
                    target_build: 'v2.0 (Ultimate AIM)',
                    architecture: 'Next.js 14 App Router + Express Node.js + PostgreSQL Neon + Multi-LLM Orchestration',
                    pillars: [
                        'Dynamic Question Paper & Yearly Blueprint Engine',
                        'Time-Aware & Pedagogy-Driven Lesson Planner',
                        'Smart Panel Interactive Classroom Studio (IFPD 65"-86")',
                        'Multimodal In-House AI Utilities'
                    ],
                    target_panels: ['65" 4K UHD', '75" 4K UHD', '86" 4K UHD Smart Panels'],
                    board_standards: ['CBSE', 'ICSE', 'State Boards', 'Custom School Exams'],
                    pedagogy_models: ['5E Model (Engage-Explore-Explain-Elaborate-Evaluate)', 'Bloom\'s Taxonomy Mastery', 'Hands-on Lab Discovery', 'Problem-Based Learning'],
                    storage_sync: 'Google Drive 5TB Storage + Local Documents Vault'
                });
                await prisma.$executeRawUnsafe(`
                    INSERT INTO "implementation_plans" (
                        "title", "description", "category", "status",
                        "started_at", "tasks", "outcomes", "metadata"
                    ) VALUES (
                        $1, $2, $3, $4,
                        CURRENT_TIMESTAMP, $5::jsonb, $6, $7::jsonb
                    )
                `, 
                    'Next Build: In-House AI Teaching & Classroom Management Suite (Ultimate AIM)',
                    'All-in-one in-house AI-powered teaching, curriculum management, and classroom interactive suite leveraging multimodal LLM/vision/audio APIs. Empowers educators to complete daily prep in minimum time across three core pillars: (1) Dynamic Question Paper & Yearly Blueprint Engine with flexible chapter/unit weightage and multi-mark classification, (2) Time-Aware & Pedagogy-Driven Lesson Planner adapting to class durations (30/35/40/45/80 min) across 5E/Bloom\'s/Hands-on models, and (3) Smart Panel Interactive Classroom Studio (IFPD 65"-86") featuring step-by-step code/concept visual tracers, clickable smart charts, real-time student quick-polls via QR/PIN, and whiteboard sync.',
                    'Curriculum & AI Studio',
                    'in_progress',
                    ultimateAimTasks,
                    '1. Zero-friction creation of annual exam blueprints and balanced question papers with complete marking schemes and solution keys.\n2. Tailored, minute-by-minute lesson plans matching exact school period timings with pedagogy models and differentiation strategies.\n3. Active touch-first student engagement on 65"-86" Smart Interactive Flat Panels (IFPD) with real-time feedback and automatic Google Drive/Portal synchronization.\n4. Comprehensive multi-utility AI toolkit (text, image, OCR, document extraction) cutting daily teacher administration time by 80%.',
                    ultimateAimMeta
                );
                console.log('Next Build Ultimate AIM plan seeded.');
            }
            console.log('implementation_plans table verified successfully.');
        } catch (planErr) {
            console.warn('Implementation plans table init notice:', planErr.message);
        }
    } catch (e) {
        console.error('Error creating whiteboard tables:', e);
    }
}

initTables().then(() => process.exit(0)).catch(() => process.exit(0));
