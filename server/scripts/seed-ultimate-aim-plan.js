const prisma = require('../src/config/database');

async function seedNextBuildPlan() {
    try {
        console.log('🚀 Seeding Next Build: In-House AI Teaching & Classroom Studio (Ultimate AIM)...');

        const title = 'Next Build: In-House AI Teaching & Classroom Management Suite (Ultimate AIM)';
        const category = 'Curriculum & AI Studio';
        const status = 'in_progress';
        const started_at = new Date().toISOString();
        const description = 'All-in-one in-house AI-powered teaching, curriculum management, classroom interactive suite, and school media utilities leveraging multimodal LLM/vision/audio APIs. Empowers educators and administrators across four core pillars: (1) Dynamic Question Paper & Yearly Blueprint Engine with flexible chapter/unit weightage and multi-mark classification, (2) Time-Aware & Pedagogy-Driven Lesson Planner adapting to class durations (30/35/40/45/80 min) across 5E/Bloom\'s/Hands-on models, (3) Smart Panel Interactive Classroom Studio (IFPD 65"-86") featuring step-by-step visual tracers, clickable concept maps, real-time student quick-polls via QR/PIN, and whiteboard sync, and (4) In-House School Media, Poster Creation & Bulk Student Document Utilities (IIT-JEE / NEET / Admissions / Social Media / WhatsApp).';

        const outcomes = '1. Zero-friction creation of annual exam blueprints and balanced question papers with complete marking schemes and solution keys.\n2. Tailored, minute-by-minute lesson plans matching exact school period timings with pedagogy models and differentiation strategies.\n3. Active touch-first student engagement on 65"-86" Smart Interactive Flat Panels (IFPD) with real-time feedback and automatic Google Drive/Portal synchronization.\n4. Comprehensive 20-tool school media, poster, social media, presentation, and bulk student document suite for seamless admissions, WhatsApp channels, and IIT-JEE / NEET competitive exam applications.';

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

            // Pillar 4: In-House School Media, Poster Creation & Bulk Student Document Utilities
            {
                id: 'sm-1',
                title: 'NTA / IIT-JEE / NEET Spec Photo Standardizer: Auto-crop to 3.5×4.5 cm, white background isolation, name & date-of-photo stamp at bottom, compress between 10 KB – 200 KB JPG',
                completed: false,
                duration_minutes: 120
            },
            {
                id: 'sm-2',
                title: 'Student Signature Normalizer: Auto contrast enhancement, paper shadow removal, bounding box crop, compress to strict 4 KB – 30 KB JPG',
                completed: false,
                duration_minutes: 90
            },
            {
                id: 'sm-3',
                title: 'Left/Right Hand Thumb Impression Optimizer: Ridge detail sharpening, contrast adjustment, auto-fit to 10 KB – 200 KB as required by NTA/NEET guidelines',
                completed: false,
                duration_minutes: 90
            },
            {
                id: 'sm-4',
                title: 'Postcard Size Photo Generator (4"×6"): NTA NEET mandatory 4×6 inch photograph with white background, name, and roll/application number stamp (10 KB – 200 KB)',
                completed: false,
                duration_minutes: 90
            },
            {
                id: 'sm-5',
                title: 'Bulk Class Student Photo & ID Card Resizer: Batch process 100+ raw student camera photos with face detection, centered 4:5/3:4 aspect crop, and Roll No filename matching',
                completed: false,
                duration_minutes: 180
            },
            {
                id: 'sm-6',
                title: 'Category & Caste / EWS / PwD Certificate PDF Compressor: Smart downscale of scanned legal documents to under 300 KB (50–300 KB) with guaranteed text legibility',
                completed: false,
                duration_minutes: 120
            },
            {
                id: 'sm-7',
                title: 'Class 10th / 12th Marks Sheet & Passing Certificate PDF Resizer: Multi-page/single-page scan compression to 100 KB – 500 KB conforming to university & competitive exam portals',
                completed: false,
                duration_minutes: 120
            },
            {
                id: 'sm-8',
                title: 'Annual School Admission Announcement Banner & Poster Generator: Pre-designed templates with school branding, badges, admission dates, class tiers, and 1-click PNG/PDF export',
                completed: false,
                duration_minutes: 150
            },
            {
                id: 'sm-9',
                title: 'Social Media Post Creator (Instagram & Facebook 1:1 Square & 4:5 Portrait): Activity highlights, science exhibitions, sports day flyers with school watermark',
                completed: false,
                duration_minutes: 140
            },
            {
                id: 'sm-10',
                title: 'Instagram / Facebook / WhatsApp Status Story Creator (9:16 Vertical): Event schedules, countdown badges, school bus alerts, and instant announcement cards',
                completed: false,
                duration_minutes: 120
            },
            {
                id: 'sm-11',
                title: 'WhatsApp Channel Broadcast Banner Styler (16:9 / 1.91:1): High-visibility banners with bold headlines, emoji badges, and clean school header for broadcast channels',
                completed: false,
                duration_minutes: 100
            },
            {
                id: 'sm-12',
                title: 'Student Academic / Sports Achievement & Topper Congratulatory Flyer: Dynamic flyer inserting student photo, percentile/rank (IIT-JEE AIR, NEET Score, Board %), teacher quote, and crest',
                completed: false,
                duration_minutes: 130
            },
            {
                id: 'sm-13',
                title: 'Classroom AI Presentation & PPT Slide Deck Generator: Generate 5–15 structured presentation slides from chapter notes with title, key takeaways, diagrams, and touch-ready layout',
                completed: false,
                duration_minutes: 180
            },
            {
                id: 'sm-14',
                title: 'Official School Circular & Holiday Notice Generator: Formal school letterhead circular with circular number, date, principal signature placeholder, and bilingual summary',
                completed: false,
                duration_minutes: 110
            },
            {
                id: 'sm-15',
                title: 'Student Fee Reminder & Dues Slip Batch Generator: Personalized slips with student name, class, dues breakdown, dynamic UPI QR code, and export for WhatsApp delivery',
                completed: false,
                duration_minutes: 130
            },
            {
                id: 'sm-16',
                title: 'Teacher & Student ID Card Bulk Print-Ready Sheet Generator: 8-per-page or 10-per-page A4 print layout with barcodes, student photo, emergency contact, and blood group',
                completed: false,
                duration_minutes: 140
            },
            {
                id: 'sm-17',
                title: 'Parent-Teacher Meeting (PTM) Invite & Schedule Card Generator: Digital invite card with student name, roll number, time slot, room number, and teacher remarks for WhatsApp',
                completed: false,
                duration_minutes: 100
            },
            {
                id: 'sm-18',
                title: 'Certificate of Merit & Participation Batch Generator: 1-click batch generation of sports/cultural certificates merging student names, events, and positions with school crest',
                completed: false,
                duration_minutes: 120
            },
            {
                id: 'sm-19',
                title: 'Smart Document Scanner & Perspective Auto-Deskew Utility: Corner detection, perspective unwarping, B&W scan filter for homework and exam answer sheets into single PDF',
                completed: false,
                duration_minutes: 160
            },
            {
                id: 'sm-20',
                title: 'Bulk Image Watermark & School Branding Tool: Batch apply school crest, confidential/sample watermark, or admission contact footer across hundreds of gallery images',
                completed: false,
                duration_minutes: 90
            }
        ];

        const metadata = {
            target_build: 'v2.0 (Ultimate AIM)',
            architecture: 'Next.js 14 App Router + Express Node.js + PostgreSQL Neon + Multi-LLM Orchestration',
            pillars: [
                'Dynamic Question Paper & Yearly Blueprint Engine',
                'Time-Aware & Pedagogy-Driven Lesson Planner',
                'Smart Panel Interactive Classroom Studio (IFPD 65"-86")',
                'School Media, Poster Creation & Bulk Student Document Utilities (Admissions, Social Media, WhatsApp, IIT-JEE / NEET)'
            ],
            target_panels: ['65" 4K UHD', '75" 4K UHD', '86" 4K UHD Smart Panels'],
            board_standards: ['CBSE', 'ICSE', 'State Boards', 'Custom School Exams'],
            pedagogy_models: ['5E Model (Engage-Explore-Explain-Elaborate-Evaluate)', 'Bloom\'s Taxonomy Mastery', 'Hands-on Lab Discovery', 'Problem-Based Learning'],
            storage_sync: 'Google Drive 5TB Storage + Local Documents Vault',
            utilities_count: 20
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
