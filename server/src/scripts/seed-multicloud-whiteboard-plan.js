/**
 * Seed Multi-Cloud Linking, Smart Panel Research & Whiteboard Bug Fixes Implementation Plan
 * Ensures this plan appears immediately on the /admin/implementation-plans page.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');

const dbUrl = process.env.ACTIVE_DB === 'old' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ep-dawn-math-aznkmg6c'))
    ? (process.env.DATABASE_URL_OLD || "postgresql://neondb_owner:npg_AqdEieg3QG0C@ep-icy-glade-ahfbz57u.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require")
    : (process.env.DATABASE_URL || "postgresql://neondb_owner:npg_AqdEieg3QG0C@ep-icy-glade-ahfbz57u.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require");

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function seedPlan() {
    console.log('[Seed Multi-Cloud & Whiteboard Plan] Connecting to PostgreSQL database...');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'admin', isActive: true },
            select: { id: true, schoolId: true }
        });
        const adminId = adminUser?.id || null;
        const schoolId = adminUser?.schoolId || null;

        const planTitle = 'Multi-Cloud Storage (Google/OneDrive/iCloud), EZWrite & myViewBoard Tools & Whiteboard Power Controls';

        const tasks = JSON.stringify([
            { id: 'mc-1', title: 'Restore charan881130@gmail.com Google Drive account ID using JWT id_token email extraction fallback', completed: true, duration_minutes: 20 },
            { id: 'mc-2', title: 'Architecture for Multi-Cloud Provider linking: Multiple Google accounts, Microsoft OneDrive (Graph API), Apple iCloud & Dropbox', completed: true, duration_minutes: 40 },
            { id: 'mc-3', title: 'Smart Interactive Flat Panel (IFP) Benchmarking: BenQ EZWrite 6 vs ViewSonic myViewBoard vs SMART Lumio toolset integration', completed: true, duration_minutes: 35 },
            { id: 'wb-template', title: 'BenQ EZWrite-style Organization Chart Templates: Hierarchical Org Chart, Cross-Functional Team Matrix, Stage-Gate Process Hierarchy', completed: true, duration_minutes: 30 },
            { id: 'wb-bug-1', title: 'Fix selection rectangle not persisting for freehand strokes and multi-object canvas ink selections', completed: true, duration_minutes: 30 },
            { id: 'wb-feat-1', title: 'Add horizontal and vertical flip controls (flipX, flipY) along selection rectangle for images, shapes, and canvas ink', completed: true, duration_minutes: 30 },
            { id: 'wb-feat-2', title: 'Add image adjustment controls: brightness, contrast, and sharpness filter sliders for selected images', completed: true, duration_minutes: 25 },
            { id: 'wb-bug-2', title: 'Fix floating ball radial toolbar: keep outer ring open on parent tool selection until child sub-tool is chosen', completed: true, duration_minutes: 25 },
            { id: 'wb-feat-3', title: 'Replace monochrome highlighter text labels with vibrant colored icons and color swatches in radial menu & toolbar', completed: true, duration_minutes: 20 },
            { id: 'wb-verify', title: 'Verify server test suites (32/32 tests) and Next.js client production build', completed: true, duration_minutes: 15 }
        ]);

        const metadata = JSON.stringify({
            category: 'Whiteboard & Cloud Integration',
            benchmarked_brands: [
                'BenQ EZWrite 6 (Floating palette, dual pens, math tools, cloud binder, OCR, Org Chart templates)',
                'ViewSonic myViewBoard (Magic Box, Throw feature, infinite canvas, AI recognition, spotlight/curtain)',
                'SMART Lumio / Notebook (Game templates, equation solver, polling)',
                'Promethean ActivInspire (Dual-user, revealers, ticker tape)'
            ],
            target_cloud_providers: [
                'Google Drive (Multi-account personal + institutional)',
                'Microsoft OneDrive / SharePoint (Microsoft Graph API v1.0)',
                'Apple iCloud Drive & Dropbox'
            ],
            templates_added: [
                'Hierarchical Org Chart (EZWrite): 3-tier Leadership -> Management -> Teams tree',
                'Team Matrix Org Chart (EZWrite): Cross-functional discipline chapters x product squads',
                'Process Hierarchy Flow (EZWrite): Stage-gate decision & review lifecycle'
            ],
            whiteboard_controls: [
                'Selection persistence for canvas drawings',
                'Flip horizontal & vertical transform hooks',
                'Image brightness, contrast & sharpness filters',
                'Floating ball radial persistent ring',
                'Visual color swatches for highlighters'
            ]
        });

        const existing = await prisma.$queryRawUnsafe(`
            SELECT id FROM "implementation_plans" WHERE title = $1 LIMIT 1
        `, planTitle);

        const outcomesText = '1. Restored Google Drive account identity charan881130@gmail.com permanently via JWT token extraction.\n2. Architectural plan for multi-account Google, Microsoft OneDrive, and Apple iCloud.\n3. Deep comparative research on BenQ EZWrite 6 and ViewSonic myViewBoard smart interactive panels.\n4. Added BenQ EZWrite-style Organization Chart templates (Hierarchical Tree, Cross-Functional Team Matrix, Stage-Gate Process Hierarchy).\n5. Selection rectangle persists for all canvas ink and drawings.\n6. Horizontal & vertical flip hooks along selection box.\n7. Image brightness, contrast, and sharpness controls.\n8. Floating ball radial menu keeps sub-tools ring open until child selection.\n9. Highlighters feature visual color icons and swatches.\n10. All 32 backend tests passed and Next.js client production build verified.';

        if (!existing || existing.length === 0) {
            await prisma.$executeRawUnsafe(`
                INSERT INTO "implementation_plans" (
                    "school_id", "created_by_id", "title", "description", "category", "status",
                    "started_at", "ended_at", "tasks", "outcomes", "metadata", "created_at", "updated_at"
                ) VALUES (
                    $1::uuid, $2::uuid, $3, $4, $5, 'completed',
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6::jsonb, $7, $8::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            `,
                schoolId, adminId, planTitle,
                'Full architectural implementation plan for Multi-Cloud account linking (Google, OneDrive, iCloud), interactive flat panel research (BenQ EZWrite 6 & ViewSonic myViewBoard), and Whiteboard bug fixes: selection persistence, flip hooks, image adjustments, floating ball ring fix, colored highlighters, and EZWrite Organization Chart templates.',
                'Whiteboard & Cloud Storage',
                tasks,
                outcomesText,
                metadata
            );
            console.log('✅ Multi-Cloud & EZWrite Whiteboard plan inserted into database.');
        } else {
            await prisma.$executeRawUnsafe(`
                UPDATE "implementation_plans"
                SET "status" = 'completed', "tasks" = $1::jsonb, "outcomes" = $2, "metadata" = $3::jsonb, "ended_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP
                WHERE "title" = $4
            `, tasks, outcomesText, metadata, planTitle);
            console.log('✅ Multi-Cloud & EZWrite Whiteboard plan updated in database.');
        }

        console.log('✅ Plan is now live on /admin/implementation-plans page.');
    } catch (err) {
        console.error('❌ Error seeding plan:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seedPlan();
