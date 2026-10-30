const prisma = require('../config/database');

async function initBackupCodeTables() {
    try {
        console.log('[BackupCodeInit] Ensuring backup_codes table exists...');
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "backup_codes" (
                "id" UUID NOT NULL DEFAULT gen_random_uuid(),
                "user_id" UUID NOT NULL,
                "code_hash" VARCHAR(255) NOT NULL,
                "turn_index" INTEGER NOT NULL,
                "is_used" BOOLEAN NOT NULL DEFAULT false,
                "used_at" TIMESTAMP(6),
                "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "backup_codes_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "fk_backup_codes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_backup_codes_user_id" ON "backup_codes"("user_id");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_backup_codes_code_hash" ON "backup_codes"("code_hash");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_backup_codes_user_unused" ON "backup_codes"("user_id", "is_used");
        `);

        // Ensure security questions & must_change_password columns exist on users table
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "users"
            ADD COLUMN IF NOT EXISTS "security_question" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "security_answer_hash" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN DEFAULT false;
        `);

        console.log('[BackupCodeInit] backup_codes table & user security columns verified.');
    } catch (err) {
        console.warn('[BackupCodeInit] Table initialization warning:', err.message);
    }
}

module.exports = initBackupCodeTables;
