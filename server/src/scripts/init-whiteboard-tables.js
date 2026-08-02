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

        console.log('Whiteboard tables verified/created successfully.');
    } catch (e) {
        console.error('Error creating whiteboard tables:', e);
    }
}

initTables().then(() => process.exit(0)).catch(() => process.exit(1));
