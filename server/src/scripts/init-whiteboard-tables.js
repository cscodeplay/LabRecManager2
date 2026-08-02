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

        console.log('Whiteboard tables verified/created successfully.');
    } catch (e) {
        console.error('Error creating whiteboard tables:', e);
    }
}

initTables().then(() => process.exit(0)).catch(() => process.exit(0));
