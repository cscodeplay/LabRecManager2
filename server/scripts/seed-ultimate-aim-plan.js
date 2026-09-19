const prisma = require('../src/config/database');

async function seedNextBuildPlan() {
    try {
        console.log('🚀 Seeding Next Build: In-House AI Teaching & Classroom Studio (Ultimate AIM)...');

        const title = 'Next Build: In-House AI Teaching & Classroom Management Suite (Ultimate AIM)';
        const category = 'Curriculum & AI Studio';
        const status = 'in_progress';
        const started_at = new Date().toISOString();
        const description = 'All-in-one in-house AI-powered teaching, curriculum management, and classroom interactive suite leveraging multimodal LLM/vision/audio APIs. Empowers educators to complete daily prep in minimum time across three core pillars: (1) Dynamic Question Paper & Yearly Blueprint Engine with flexible chapter/unit weightage and multi-mark classification, (2) Time-Aware & Pedagogy-Driven Lesson Planner adapting to class durations (30/35/40/45/80 min) across 5E/Bloom\'s/Hands-on models, and (3) Smart Panel Interactive Classroom Studio (IFPD 65"-86") featuring step-by-step code/concept visual tracers, clickable smart charts, real-time student quick-polls via QR/PIN, and whiteboard sync.';

        const outcomes = '1. Zero-friction creation of annual exam blueprints and balanced question papers with complete marking schemes and solution keys.\n2. Tailored, minute-by-minute lesson plans matching exact school period timings with pedagogy models and differentiation strategies.\n3. Active touch-first student engagement on 65"-86" Smart Interactive Flat Panels (IFPD) with real-time feedback and automatic Google Drive/Portal synchronization.\n4. Comprehensive multi-utility AI toolkit (text, image, OCR, document extraction) cutting daily teacher administration time by 80%.';

        const tasks = [
            // Pillar 1: Dynamic Question Paper Maker & Blueprint Engine
            {
                id: 'qp-1',
                title: 'Architect 2D Interactive Blueprint Matrix (units/chapters vs 1m, 2m, 3m, 4m case-study, 5m questions with auto-tallying total marks)',
                completed: false,
                duration_minutes: 180
            },
            {
                id: 'qp-2',
                title: 'Implement dynamic annual pattern presets (CBSE, ICSE, State Boards, custom school exam schemes with section-level internal "OR" choices)',
                completed: false,
                duration_minutes: 120
            },
            {
                id: 'qp-3',
                title: 'Build syllabus & curriculum source ingestion (upload textbook PDF, syllabus doc, past papers with OCR parsing)',
                completed: false,
                duration_minutes: 150
            },
            {
                id: 'qp-4',
                title: 'Engine dual-document generation: Student Exam Paper + Teacher Scoring Rubric & Step-by-Step Answer Key',
                completed: false,
                duration_minutes: 180
            },
            {
                id: 'qp-5',
                title: 'Implement export to print-ready PDF with school letterhead, watermark, and 1-click cloud sync to 5TB Google Drive',
                completed: false,
                duration_minutes: 90
            },

            // Pillar 2: Time-Aware Pedagogy Lesson Planner
            {
                id: 'lp-1',
                title: 'Build period duration pacing calculator (30m, 35m, 40m, 45m, 80m block periods) with automatic minute allocation per phase',
                completed: false,
                duration_minutes: 120
            },
            {
                id: 'lp-2',
                title: 'Implement pedagogy instructional frameworks selector (5E Model, Bloom\'s Taxonomy Mastery, Hands-on Lab Discovery, Problem-Based Learning)',
                completed: false,
                duration_minutes: 150
            },
            {
                id: 'lp-3',
                title: 'Create comprehensive Classroom Pack generator: Lesson overview, blackboard/smart panel layout, teacher discussion prompts, and exit slips',
                completed: false,
                duration_minutes: 140
            },
            {
                id: 'lp-4',
                title: 'Integrate multi-tier student differentiation engine (remedial scaffolds for struggling learners & advanced extension challenges for fast learners)',
                completed: false,
                duration_minutes: 120
            },

            // Pillar 3: Smart Panel Interactive Classroom Studio (IFPD)
            {
                id: 'sp-1',
                title: 'Develop touch-first high-contrast fullscreen IFPD presentation mode (optimized for 65", 75", 86" smart panels with pen overlay)',
                completed: false,
                duration_minutes: 200
            },
            {
                id: 'sp-2',
                title: 'Build step-by-step interactive visual tracer (code execution, loop iterations, flowchart paths, math derivations with touch "Next Step" button)',
                completed: false,
                duration_minutes: 240
            },
            {
                id: 'sp-3',
                title: 'Create clickable smart charts & concept maps engine (dynamic Mermaid.js, SVG flowcharts, expandable mind-maps)',
                completed: false,
                duration_minutes: 160
            },
            {
                id: 'sp-4',
                title: 'Implement live student quick-poll / exit ticket system via QR code or short PIN with instant real-time response charts on smart panel',
                completed: false,
                duration_minutes: 210
            },
            {
                id: 'sp-5',
                title: 'Add 1-click smart panel whiteboard snapshot capture with auto-export to student portal and class Google Drive folder',
                completed: false,
                duration_minutes: 90
            },

            // Pillar 4: Multimodal AI Utility Foundation & API Orchestration
            {
                id: 'ai-1',
                title: 'Set up multi-provider AI model router (Groq Llama 3.3 for high-speed text, Gemini 2.0 Flash for multimodal vision/PDF OCR, image/audio utilities)',
                completed: false,
                duration_minutes: 150
            },
            {
                id: 'ai-2',
                title: 'Implement prompt template management and persistent teacher preset library for recurring department workflows',
                completed: false,
                duration_minutes: 100
            }
        ];

        const metadata = {
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
        };

        // Check if plan exists
        const existing = await prisma.$queryRawUnsafe(
            `SELECT id FROM "implementation_plans" WHERE title ILIKE '%Ultimate AIM%' OR title ILIKE '%In-House AI Teaching%' LIMIT 1`
        );

        if (existing && existing.length > 0) {
            const planId = existing[0].id;
            console.log(`Plan already exists (ID: ${planId}). Updating with latest full plan specifications...`);
            await prisma.$executeRawUnsafe(`
                UPDATE "implementation_plans"
                SET "title" = $1,
                    "description" = $2,
                    "category" = $3,
                    "status" = $4,
                    "tasks" = $5::jsonb,
                    "outcomes" = $6,
                    "metadata" = $7::jsonb,
                    "updated_at" = CURRENT_TIMESTAMP
                WHERE "id" = $8::uuid
            `, title, description, category, status, JSON.stringify(tasks), outcomes, JSON.stringify(metadata), planId);
            console.log('✅ Plan updated successfully.');
        } else {
            console.log('Inserting new implementation plan...');
            await prisma.$executeRawUnsafe(`
                INSERT INTO "implementation_plans" (
                    "title", "description", "category", "status",
                    "started_at", "tasks", "outcomes", "metadata",
                    "created_at", "updated_at"
                ) VALUES (
                    $1, $2, $3, $4,
                    $5::timestamp, $6::jsonb, $7, $8::jsonb,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            `, title, description, category, status, started_at, JSON.stringify(tasks), outcomes, JSON.stringify(metadata));
            console.log('✅ Plan inserted successfully.');
        }

        const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "implementation_plans"`);
        console.log(`Total implementation plans in database: ${countResult[0]?.count}`);
    } catch (error) {
        console.error('❌ Error seeding implementation plan:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

seedNextBuildPlan();
