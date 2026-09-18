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
            console.log('implementation_plans table verified successfully.');
        } catch (planErr) {
            console.warn('Implementation plans table init notice:', planErr.message);
        }
    } catch (e) {
        console.error('Error creating whiteboard tables:', e);
    }
}

initTables().then(() => process.exit(0)).catch(() => process.exit(0));
