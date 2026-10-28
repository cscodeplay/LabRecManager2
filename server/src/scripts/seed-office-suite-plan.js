/**
 * Seed Office Suite & Universal Document Conversion Implementation Plan (PLAN-011)
 * Universal document conversion (Image <-> PDF, Word <-> PDF, Excel <-> PDF)
 * and rich web editors for Word documents and Excel spreadsheets.
 * Ensures this plan appears immediately on the /admin/implementation-plans page.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');

const dbUrl = process.env.ACTIVE_DB === 'old' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ep-dawn-math-aznkmg6c'))
    ? (process.env.DATABASE_URL_OLD || "postgresql://neondb_owner:npg_AqdEieg3QG0C@ep-icy-glade-ahfbz57u.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require")
    : (process.env.DATABASE_URL || "postgresql://neondb_owner:npg_AqdEieg3QG0C@ep-icy-glade-ahfbz57u.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require");

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function seedOfficeSuitePlan() {
    console.log('[Seed Office Suite Plan] Connecting to PostgreSQL database...');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'admin', isActive: true },
            select: { id: true, schoolId: true }
        });
        const adminId = adminUser?.id || null;
        const schoolId = adminUser?.schoolId || null;

        const planTitle = 'Next-Gen Office Suite & Universal Document Conversion Engine';
        const serialId = 'PLAN-011';
        const category = 'Office Suite & Document Conversion';

        const tasks = JSON.stringify([
            {
                id: 'doc-1',
                title: 'Multi-Format Universal Document Converter: Bidirectional Image <-> PDF (Multi-page stitching & 300 DPI rasterization)',
                completed: true,
                duration_minutes: 40
            },
            {
                id: 'doc-2',
                title: 'High-Fidelity Word <-> PDF Conversion Engine: Mammoth/LibreOffice headless parser with font and layout preservation',
                completed: true,
                duration_minutes: 45
            },
            {
                id: 'doc-3',
                title: 'Excel <-> PDF Vector Converter: SheetJS / ExcelJS renderer preserving cell boundaries, formula evaluation, and print layouts',
                completed: true,
                duration_minutes: 40
            },
            {
                id: 'doc-4',
                title: 'PDF <-> Word Conversion: PDF text, table, and image extraction pipeline reconstructing editable DOCX structures',
                completed: true,
                duration_minutes: 50
            },
            {
                id: 'doc-5',
                title: 'PDF <-> Excel Tabular Extraction: AI-assisted and coordinate-based grid detector reconstructing XLSX workbooks from PDF tables',
                completed: true,
                duration_minutes: 45
            },
            {
                id: 'doc-6',
                title: 'Full-Featured Online Word Processor: Tiptap / ProseMirror rich text editor with CBSE templates, math equations, tables, headers/footers, and real-time collaboration',
                completed: true,
                duration_minutes: 60
            },
            {
                id: 'doc-7',
                title: 'Full-Featured Online Spreadsheet: FortuneSheet / Handsontable workbook editor with 450+ Excel formulas, charting, sorting, filtering, and conditional formatting',
                completed: true,
                duration_minutes: 60
            },
            {
                id: 'doc-8',
                title: 'Cloud Integration & Auto-Sync: Direct bilateral synchronization with Google Drive (5TB quota active), Cloudinary, and local device downloads',
                completed: true,
                duration_minutes: 35
            },
            {
                id: 'doc-9',
                title: 'Whiteboard & Classroom Integration: 1-click clipboard paste for Mermaid diagrams and STEM equations into Word/Excel and Whiteboard table placement',
                completed: true,
                duration_minutes: 30
            },
            {
                id: 'doc-10',
                title: 'LabPDF Studio: Multi-File PDF Merger, Visual Page Thumbnail Rearrangement, 90° CW/CCW Rotations, Range Splitter, Diagonal Watermarking & Page Numbers',
                completed: true,
                duration_minutes: 45
            },
            {
                id: 'doc-11',
                title: 'LOMS Media Studio: FFmpeg 7.1.1 Hardware-Accelerated Video/Audio/Image Converter, Smart Compressor (CRF 18-35), Timeline Keyframe Clipper, MP3 Audio Extractor & Animated GIF Generator',
                completed: true,
                duration_minutes: 50
            },
            {
                id: 'doc-12',
                title: 'LOMS Unified Brand & Navigation Rail: Persistent Left App Switcher Rail across LabDocs, LabSheets, LabSlides, LabPDF Studio, Media Studio, Universal Converter & CloudVault (5TB)',
                completed: true,
                duration_minutes: 35
            }
        ]);

        const metadata = JSON.stringify({
            serial_id: serialId,
            category: category,
            brand: 'LOMS — Lab Operations & Media Suite',
            target_formats: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'PNG', 'JPEG', 'WEBP', 'MP4', 'WEBM', 'MKV', 'MP3', 'WAV'],
            supported_conversions: [
                'Image -> PDF (Multi-image PDF book, OCR text layer)',
                'PDF -> Image (Zip bundle of 300 DPI PNG/JPEG page renders)',
                'Word (DOCX) -> PDF (High fidelity typography, tables & math)',
                'PDF -> Word (DOCX) (Editable paragraphs, tables & images)',
                'Excel (XLSX) -> PDF (Sheet-by-sheet print pagination & vector grids)',
                'PDF -> Excel (XLSX) (Tabular data detection & numeric parsing)',
                'Video -> MP4 / WebM / MKV (Hardware-accelerated libx264 / libvpx)',
                'Audio -> MP3 / WAV / AAC (320kbps libmp3lame)',
                'Video -> GIF (Palettegen two-pass high quality)'
            ],
            editor_features: {
                pdf_studio: [
                    'Multi-file PDF merge queue with up/down sequence controls',
                    'Visual page thumbnail grid with 90° CW and CCW rotation',
                    'Page reordering, duplication, and deletion',
                    'Custom page range splitter (e.g. 1-3, 5)',
                    'Customizable diagonal text watermark overlay',
                    'Dynamic page numbering (Page X of Y)'
                ],
                media_studio: [
                    'Sub-tabs for Video, Audio, and Image processing',
                    'HTML5 video/audio player preview with playhead scrub',
                    'Timeline clipper with [Set In] and [Set Out] markers',
                    'CRF 18-35 compression quality slider with live size reduction predictions',
                    'One-click MP3 audio track extraction from video',
                    'High-palette animated GIF generator'
                ],
                word_processor: [
                    'Typography (Google Fonts, headings, margins, line heights)',
                    'CBSE Exam & Lab Manual Templates (Question papers, lesson plans)',
                    'LaTeX Math formula insertion ($$...$$ and KaTeX)',
                    'Dynamic tables with column resizing, cell merging, and colored headers',
                    'Mermaid flowcharts & vector diagrams insertion',
                    'Version history & real-time cursor collaboration via WebSockets',
                    'Export to DOCX, PDF, Markdown, and Google Drive'
                ],
                spreadsheet: [
                    'Multi-sheet tabs with sheet cloning, renaming, and reordering',
                    '450+ standard Excel functions (SUM, VLOOKUP, XLOOKUP, INDEX, MATCH, IF, COUNTIF)',
                    'CBSE STEM formula engine (Kinematics, Thermodynamics, Trigonometry)',
                    'Data validation, dropdown filters, column sorting, and freezing rows/cols',
                    'Charts & Visualizations (Bar, Line, Pie, Scatter, Candlestick)',
                    'Export to XLSX, CSV, PDF, and Whiteboard table'
                ]
            }
        });

        const outcomesText = `
### Next-Gen Office Suite & Universal Document Conversion Engine (PLAN-011)

#### 1. Universal Document Conversion Engine
* **Image ↔ PDF**:
  * Multi-image stitching with margin controls, orientation detection (Portrait/Landscape), and page compression.
  * PDF to image rasterization delivering 300 DPI high-resolution PNG/JPEG zip archives.
* **Word ↔ PDF**:
  * DOCX to PDF conversion preserving styles, tables, header/footer page numbers, and embedded images.
  * PDF to DOCX reconstruction with paragraph flow, font sizing, and editable tabular layouts.
* **Excel ↔ PDF**:
  * Multi-sheet workbook pagination, grid lines, and formula value caching.
  * PDF tabular extraction parsing financial reports, marksheets, and scientific data into structured Excel spreadsheets.

#### 2. Full-Featured Collaborative Word Processor
* **Core Editing**: Clean ribbon toolbar with Font, Style, Alignment, Lists, Line Height, Subscript/Superscript, and Color pickers.
* **STEM & Educational Integrations**:
  * Live KaTeX math formula editor with instant preview.
  * 1-click insertion of Mermaid flowcharts and Whiteboard canvas captures.
  * CBSE lesson plans, question paper generator templates, and laboratory experiment record sheets.
* **Document Management**: Direct save to Google Drive (connected with 5TB storage), local DOCX/PDF export, and printable page preview.

#### 3. Full-Featured Collaborative Spreadsheet
* **Calculation Engine**: Comprehensive Excel formula engine with 450+ functions, array formulas, and STEM computation presets.
* **Data Handling**: Filtering, multi-column sorting, conditional formatting (color scales, data bars), and cell merging.
* **Whiteboard Bridge**: Instant "Place on Whiteboard" export to convert spreadsheet ranges into interactive 12px whiteboard tables.
* **Multi-Cloud Persistence**: Auto-save to PostgreSQL database and cloud storage with offline draft caching.
        `.trim();

        const existing = await prisma.$queryRawUnsafe(`
            SELECT id FROM "implementation_plans" WHERE title = $1 OR metadata->>'serial_id' = $2 LIMIT 1
        `, planTitle, serialId);

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
                'Full architectural and implementation specification for the Next-Gen LOMS Office & Media Suite, featuring LabDocs, LabSheets, LabSlides, LabPDF Studio, LOMS Media Studio, Universal Converter, and CloudVault 5TB Google Drive synchronization.',
                category,
                tasks,
                outcomesText,
                metadata
            );
            console.log('✅ Office Suite implementation plan inserted into database.');
        } else {
            await prisma.$executeRawUnsafe(`
                UPDATE "implementation_plans"
                SET "status" = 'completed', "ended_at" = CURRENT_TIMESTAMP, "tasks" = $1::jsonb, "outcomes" = $2, "metadata" = $3::jsonb, "updated_at" = CURRENT_TIMESTAMP
                WHERE "title" = $4 OR "metadata"->>'serial_id' = $5
            `, tasks, outcomesText, metadata, planTitle, serialId);
            console.log('✅ Office Suite implementation plan updated in database.');
        }

        console.log('✅ PLAN-011 is now live on /admin/implementation-plans page.');
    } catch (err) {
        console.error('❌ Error seeding Office Suite plan:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seedOfficeSuitePlan();
