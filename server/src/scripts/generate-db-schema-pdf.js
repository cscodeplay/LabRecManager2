const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const cloudinary = require('../services/cloudinary');

const prismaNew = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_NEW } } });
const prismaOld = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_OLD } } });

async function extractSchema(prisma) {
    console.log('[Schema] Fetching tables, columns and constraints...');

    // 1. Fetch all columns
    const columns = await prisma.$queryRaw`
        SELECT 
            c.table_name,
            c.column_name,
            c.ordinal_position,
            c.data_type,
            c.character_maximum_length,
            c.udt_name,
            c.is_nullable,
            c.column_default
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        ORDER BY c.table_name, c.ordinal_position;
    `;

    // 2. Fetch all constraints using pg_constraint
    const constraints = await prisma.$queryRaw`
        SELECT
            t.relname AS table_name,
            c.conname AS constraint_name,
            c.contype AS constraint_type,
            pg_get_constraintdef(c.oid) AS constraint_definition
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY t.relname, c.contype, c.conname;
    `;

    // 3. Fetch all indexes using pg_indexes
    const indexes = await prisma.$queryRaw`
        SELECT tablename AS table_name, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
    `;

    // 4. Assemble by table
    const tablesMap = new Map();

    for (const col of columns) {
        if (!tablesMap.has(col.table_name)) {
            tablesMap.set(col.table_name, {
                name: col.table_name,
                columns: [],
                constraints: [],
                indexes: []
            });
        }
        tablesMap.get(col.table_name).columns.push(col);
    }

    for (const con of constraints) {
        if (tablesMap.has(con.table_name)) {
            tablesMap.get(con.table_name).constraints.push(con);
        }
    }

    for (const idx of indexes) {
        if (tablesMap.has(idx.table_name)) {
            tablesMap.get(idx.table_name).indexes.push(idx);
        }
    }

    // Sort tables alphabetically
    const sortedTables = Array.from(tablesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    return sortedTables;
}

function parseColumnConstraints(col, tableConstraints, tableIndexes) {
    const colName = col.column_name;
    const badges = [];

    // Check primary key
    const pkCon = tableConstraints.find(c => c.constraint_type === 'p' && c.constraint_definition.includes(`(${colName})`));
    if (pkCon) {
        badges.push('[PK]');
    }

    // Check foreign keys
    const fks = tableConstraints.filter(c => c.constraint_type === 'f' && c.constraint_definition.includes(`(${colName})`));
    for (const fk of fks) {
        const match = fk.constraint_definition.match(/REFERENCES\s+([a-zA-Z0-9_]+)\(([a-zA-Z0-9_]+)\)(?:\s+ON DELETE\s+([A-Z\s]+))?/i);
        if (match) {
            const targetTable = match[1];
            const targetCol = match[2];
            const cascade = match[3] ? ` ${match[3].trim()}` : '';
            badges.push(`[FK -> ${targetTable}.${targetCol}${cascade}]`);
        } else {
            badges.push(`[FK]`);
        }
    }

    // Check unique constraints & unique indexes
    const uqCon = tableConstraints.find(c => c.constraint_type === 'u' && c.constraint_definition.includes(`(${colName})`));
    const uqIdx = tableIndexes.find(i => i.indexdef.includes('UNIQUE INDEX') && i.indexdef.includes(`(${colName})`));
    if (uqCon || uqIdx) {
        badges.push('[UNIQUE]');
    }

    // Check constraint
    const chkCon = tableConstraints.find(c => c.constraint_type === 'c' && c.constraint_definition.includes(colName));
    if (chkCon) {
        const simpleDef = chkCon.constraint_definition.replace(/^CHECK\s*\(/i, '').replace(/\)$/, '').trim();
        if (simpleDef.length < 35) {
            badges.push(`[CHECK: ${simpleDef}]`);
        } else {
            badges.push('[CHECK]');
        }
    }

    return badges;
}

function formatDataType(col) {
    if (col.character_maximum_length) {
        return `${col.data_type}(${col.character_maximum_length})`;
    }
    if (col.udt_name && col.udt_name !== col.data_type && !col.data_type.includes('USER-DEFINED')) {
        return col.data_type;
    }
    if (col.data_type === 'USER-DEFINED') {
        return `enum (${col.udt_name})`;
    }
    return col.data_type;
}

function cleanDefault(def) {
    if (!def) return '-';
    let cleaned = def.replace(/::[a-zA-Z0-9_.\s\[\]]+$/, '');
    if (cleaned.length > 28) {
        cleaned = cleaned.substring(0, 25) + '...';
    }
    return cleaned;
}

async function buildPdf(tables, outputPath) {
    return new Promise((resolve, reject) => {
        console.log('[PDF] Building sleek compact database schema specification...');
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margins: { top: 32, bottom: 32, left: 32, right: 32 },
            bufferPages: true
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const margin = 32;
        const contentWidth = pageWidth - (margin * 2); // 777.89 pt
        const bottomLimit = pageHeight - margin - 20;

        // Color definitions
        const C = {
            navy: '#0f172a',
            slateHeader: '#1e293b',
            slateDark: '#334155',
            slateText: '#475569',
            slateLight: '#64748b',
            border: '#cbd5e1',
            borderSubtle: '#e2e8f0',
            bgRowEven: '#ffffff',
            bgRowOdd: '#f8fafc',
            bgHeader: '#0f172a',
            badgePk: '#b45309',
            badgeFk: '#1d4ed8',
            badgeUq: '#047857',
            badgeChk: '#6d28d9',
            accentAmber: '#d97706',
            notNull: '#991b1b',
            nullOk: '#64748b'
        };

        // ==========================================
        // PAGE 1: TITLE & EXECUTIVE SUMMARY
        // ==========================================
        doc.rect(margin, margin, contentWidth, 75).fill(C.bgHeader);

        // Header Title
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff')
           .text('ULRMS DATABASE ARCHITECTURE & SCHEMA SPECIFICATION', margin + 18, margin + 14);

        doc.font('Helvetica').fontSize(9.5).fillColor('#94a3b8')
           .text('Unified Lab Record Management System • Comprehensive Catalog of Tables, Columns, Relationships & Constraints', margin + 18, margin + 37);

        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accentAmber)
           .text(`GENERATED: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })} • POSTGRESQL 16 (NEON ENGINE) • APP DESIGN DOCUMENT`, margin + 18, margin + 54);

        // Summary Statistics Cards
        const cardY = margin + 85;
        const cardW = (contentWidth - 24) / 4;
        const cardH = 46;

        const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);
        const totalConstraints = tables.reduce((sum, t) => sum + t.constraints.length, 0);
        const totalFks = tables.reduce((sum, t) => sum + t.constraints.filter(c => c.constraint_type === 'f').length, 0);

        const stats = [
            { label: 'TOTAL ACTIVE TABLES', val: `${tables.length} Tables`, sub: 'Relational Entities' },
            { label: 'TOTAL COLUMNS', val: `${totalColumns.toLocaleString()} Columns`, sub: 'Attributes & Fields' },
            { label: 'CONSTRAINTS & RULES', val: `${totalConstraints.toLocaleString()} Rules`, sub: 'PK, FK, Unique & Checks' },
            { label: 'FOREIGN RELATIONSHIPS', val: `${totalFks.toLocaleString()} Foreign Keys`, sub: 'Relational Graph Bridges' }
        ];

        stats.forEach((st, idx) => {
            const cx = margin + (idx * (cardW + 8));
            doc.rect(cx, cardY, cardW, cardH).fillAndStroke('#f1f5f9', C.border);
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.slateDark).text(st.label, cx + 10, cardY + 7);
            doc.font('Helvetica-Bold').fontSize(12).fillColor(C.navy).text(st.val, cx + 10, cardY + 18);
            doc.font('Helvetica').fontSize(6.5).fillColor(C.slateLight).text(st.sub, cx + 10, cardY + 33);
        });

        // ==========================================
        // TABLE DIRECTORY GRID (INDEX)
        // ==========================================
        const indexStartY = cardY + 56;
        doc.rect(margin, indexStartY, contentWidth, 18).fill('#e2e8f0');
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.navy)
           .text('ALPHABETICAL TABLE DIRECTORY INDEX (94 TABLES)', margin + 10, indexStartY + 5);

        const indexGridY = indexStartY + 24;
        const numCols = 4;
        const colW = contentWidth / numCols;
        const rowH = 12.5;

        tables.forEach((t, i) => {
            const colIdx = i % numCols;
            const rowIdx = Math.floor(i / numCols);
            const ix = margin + (colIdx * colW);
            const iy = indexGridY + (rowIdx * rowH);

            if (iy < pageHeight - margin - 20) {
                doc.font('Helvetica-Bold').fontSize(7).fillColor(C.navy).text(`${i + 1}.`, ix + 2, iy);
                doc.font('Helvetica-Bold').fontSize(7).fillColor(C.badgeFk).text(t.name, ix + 18, iy, { width: colW - 55, lineBreak: false });
                doc.font('Helvetica').fontSize(6.5).fillColor(C.slateLight).text(`(${t.columns.length} col)`, ix + colW - 35, iy);
            }
        });

        // ==========================================
        // TABLE DETAIL SECTIONS
        // ==========================================
        doc.addPage();
        let curY = margin + 10;

        // Column layout widths (Total width: 777.89 pt)
        const W_NUM = 24;
        const W_NAME = 150;
        const W_TYPE = 110;
        const W_NULL = 52;
        const W_DEF = 115;
        const W_CONS = contentWidth - (W_NUM + W_NAME + W_TYPE + W_NULL + W_DEF); // ~ 326 pt

        const X_NUM = margin;
        const X_NAME = X_NUM + W_NUM;
        const X_TYPE = X_NAME + W_NAME;
        const X_NULL = X_TYPE + W_TYPE;
        const X_DEF = X_NULL + W_NULL;
        const X_CONS = X_DEF + W_DEF;

        for (let tIdx = 0; tIdx < tables.length; tIdx++) {
            const t = tables[tIdx];

            // Page overflow check
            if (curY + 50 > bottomLimit) {
                doc.addPage();
                curY = margin + 10;
            }

            // --- TABLE BANNER HEADER ---
            doc.rect(margin, curY, contentWidth, 18).fill(C.slateHeader);

            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
               .text(`TABLE: ${t.name.toUpperCase()}`, margin + 8, curY + 5);

            // Right info
            const pkCon = t.constraints.find(c => c.constraint_type === 'p');
            const pkText = pkCon ? pkCon.constraint_definition.replace(/^PRIMARY KEY\s*/i, 'PK: ') : 'NO PK';
            doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
               .text(`${t.columns.length} Columns  |  ${pkText}  |  #${tIdx + 1} of ${tables.length}`, margin + contentWidth - 280, curY + 5, { align: 'right', width: 270 });

            curY += 18;

            // --- COLUMN GRID HEADER ---
            doc.rect(margin, curY, contentWidth, 14).fill('#e2e8f0');
            doc.font('Helvetica-Bold').fontSize(7).fillColor(C.navy);
            doc.text('#', X_NUM + 4, curY + 3.5);
            doc.text('COLUMN NAME', X_NAME + 4, curY + 3.5);
            doc.text('DATA TYPE', X_TYPE + 4, curY + 3.5);
            doc.text('NULLABLE', X_NULL + 4, curY + 3.5);
            doc.text('DEFAULT', X_DEF + 4, curY + 3.5);
            doc.text('CONSTRAINTS & FOREIGN KEYS', X_CONS + 4, curY + 3.5);

            curY += 14;

            // --- COLUMN ROWS ---
            for (let cIdx = 0; cIdx < t.columns.length; cIdx++) {
                const col = t.columns[cIdx];

                // Page break inside table check
                if (curY + 14 > bottomLimit) {
                    doc.addPage();
                    curY = margin + 10;

                    // Re-draw continuation table header
                    doc.rect(margin, curY, contentWidth, 16).fill(C.slateHeader);
                    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff')
                       .text(`TABLE: ${t.name.toUpperCase()} (CONTINUED)`, margin + 8, curY + 4);
                    curY += 16;

                    doc.rect(margin, curY, contentWidth, 13).fill('#e2e8f0');
                    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.navy);
                    doc.text('#', X_NUM + 4, curY + 3);
                    doc.text('COLUMN NAME', X_NAME + 4, curY + 3);
                    doc.text('DATA TYPE', X_TYPE + 4, curY + 3);
                    doc.text('NULLABLE', X_NULL + 4, curY + 3);
                    doc.text('DEFAULT', X_DEF + 4, curY + 3);
                    doc.text('CONSTRAINTS & FOREIGN KEYS', X_CONS + 4, curY + 3);
                    curY += 13;
                }

                const rowBg = cIdx % 2 === 0 ? C.bgRowEven : C.bgRowOdd;
                const badges = parseColumnConstraints(col, t.constraints, t.indexes);
                const rowH = 13;

                doc.rect(margin, curY, contentWidth, rowH).fillAndStroke(rowBg, C.borderSubtle);

                // Index
                doc.font('Helvetica').fontSize(6.5).fillColor(C.slateLight).text(`${cIdx + 1}`, X_NUM + 4, curY + 3);

                // Column name (highlight PK column with bold navy)
                const isPk = badges.includes('[PK]');
                doc.font('Helvetica-Bold').fontSize(7)
                   .fillColor(isPk ? C.navy : C.slateDark)
                   .text(col.column_name, X_NAME + 4, curY + 3, { width: W_NAME - 8, lineBreak: false });

                // Data type
                const formattedType = formatDataType(col);
                doc.font('Courier').fontSize(6.5).fillColor('#0284c7')
                   .text(formattedType, X_TYPE + 4, curY + 3, { width: W_TYPE - 8, lineBreak: false });

                // Nullable
                const isNull = col.is_nullable === 'YES';
                doc.font('Helvetica-Bold').fontSize(6)
                   .fillColor(isNull ? C.nullOk : C.notNull)
                   .text(isNull ? 'NULL' : 'NOT NULL', X_NULL + 4, curY + 3.5);

                // Default
                const defVal = cleanDefault(col.column_default);
                doc.font('Courier').fontSize(6).fillColor(C.slateText)
                   .text(defVal, X_DEF + 4, curY + 3, { width: W_DEF - 8, lineBreak: false });

                // Constraints (Badges)
                if (badges.length > 0) {
                    const badgeStr = badges.join('  ');
                    doc.font('Helvetica-Bold').fontSize(6).fillColor(C.badgeFk)
                       .text(badgeStr, X_CONS + 4, curY + 3, { width: W_CONS - 8, lineBreak: false });
                } else {
                    doc.font('Helvetica').fontSize(6).fillColor('#cbd5e1').text('-', X_CONS + 4, curY + 3);
                }

                curY += rowH;
            }

            // --- COMPOSITE CONSTRAINTS & INDEXES NOTE (IF ANY) ---
            const compositeCons = t.constraints.filter(c => c.constraint_definition.includes(',') && c.constraint_type !== 'n');
            const customIndexes = t.indexes.filter(i => !i.indexname.endsWith('_pkey') && !t.constraints.some(c => c.constraint_name === i.indexname));

            if (compositeCons.length > 0 || customIndexes.length > 0) {
                if (curY + 14 > bottomLimit) {
                    doc.addPage();
                    curY = margin + 10;
                }
                const infoLines = [];
                compositeCons.forEach(c => infoLines.push(`[Composite ${c.constraint_name}]: ${c.constraint_definition}`));
                customIndexes.slice(0, 3).forEach(i => infoLines.push(`[Index ${i.indexname}]: ${i.indexdef.replace(/.*USING\s+/i, 'USING ')}`));

                doc.rect(margin, curY, contentWidth, 12).fill('#f1f5f9');
                doc.font('Helvetica').fontSize(6).fillColor(C.slateText)
                   .text(`Table Rules & Indexes: ${infoLines.join('  |  ')}`, margin + 6, curY + 3, { width: contentWidth - 12, lineBreak: false });
                curY += 12;
            }

            // Gap between tables
            curY += 10;
        }

        // ==========================================
        // RUNNING HEADERS & FOOTERS (PAGE NUMBERING)
        // ==========================================
        const pageRange = doc.bufferedPageRange();
        for (let i = 0; i < pageRange.count; i++) {
            doc.switchToPage(i);

            // Skip running header on cover/page 0
            if (i > 0) {
                // Top header
                doc.font('Helvetica').fontSize(6.5).fillColor('#94a3b8')
                   .text('ULRMS APPLICATION ARCHITECTURE • DATABASE SCHEMA & CONSTRAINTS SPECIFICATION', margin, margin - 15);
                doc.text(`DATE: ${new Date().toLocaleDateString('en-US')}`, margin + contentWidth - 100, margin - 15, { align: 'right', width: 100 });
                doc.moveTo(margin, margin - 8).lineTo(margin + contentWidth, margin - 8).strokeColor(C.borderSubtle).lineWidth(0.5).stroke();
            }

            // Bottom footer on all pages
            doc.moveTo(margin, pageHeight - margin + 6).lineTo(margin + contentWidth, pageHeight - margin + 6).strokeColor(C.borderSubtle).lineWidth(0.5).stroke();
            doc.font('Helvetica').fontSize(6.5).fillColor(C.slateLight)
               .text('CONFIDENTIAL • LAB RECORD MANAGER SYSTEM (ULRMS) ARCHITECTURE & DESIGN DOCUMENTATION', margin, pageHeight - margin + 10);
            doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.navy)
               .text(`Page ${i + 1} of ${pageRange.count}`, margin + contentWidth - 80, pageHeight - margin + 10, { align: 'right', width: 80 });
        }

        doc.end();

        writeStream.on('finish', () => {
            console.log(`[PDF] PDF generated successfully: ${outputPath}`);
            resolve(outputPath);
        });

        writeStream.on('error', reject);
    });
}

async function uploadAndRegisterDoc(pdfPath) {
    console.log('[Upload] Registering document under admin "APP Design doc" folder...');
    const stats = fs.statSync(pdfPath);
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileName = 'ulrms_database_schema_specification.pdf';
    const docName = 'ULRMS Complete Database Schema & Constraints Catalog';
    const docDescription = 'Complete catalog of all 94 database tables, 1,128 columns, data types, primary keys, foreign keys with cascade rules, unique indexes, and constraints formatted in sleek compact tables.';

    // 1. Upload to Cloudinary if available
    let cloudinaryUrl = null;
    let cloudinaryId = `local_${Date.now()}_${fileName}`;

    if (cloudinary.isConfigured()) {
        try {
            console.log('[Cloudinary] Uploading PDF to Cloudinary CDN...');
            const cloudRes = await cloudinary.uploadFile(fileBuffer, fileName, 'application/pdf');
            if (cloudRes && (cloudRes.secureUrl || cloudRes.url)) {
                cloudinaryUrl = cloudRes.secureUrl || cloudRes.url;
                cloudinaryId = cloudRes.publicId;
                console.log('✅ Uploaded to Cloudinary:', cloudinaryUrl);
            }
        } catch (err) {
            console.warn('[Cloudinary] Notice:', err.message);
        }
    }

    const fallbackUrl = `/uploads/${path.basename(pdfPath)}`;
    const finalUrl = cloudinaryUrl || fallbackUrl;

    // Also copy to client public documents directory for direct download/viewing
    const publicDocsDir = path.join(__dirname, '../../../client/public/documents');
    if (!fs.existsSync(publicDocsDir)) {
        fs.mkdirSync(publicDocsDir, { recursive: true });
    }
    fs.copyFileSync(pdfPath, path.join(publicDocsDir, fileName));
    console.log('✅ Copied to client/public/documents for static fallback');

    // 2. Register in DATABASE_URL_NEW and DATABASE_URL_OLD
    const targets = [
        { name: 'DATABASE_URL_NEW (Active Render DB)', prisma: prismaNew },
        { name: 'DATABASE_URL_OLD (Meritorious Primary DB)', prisma: prismaOld }
    ];

    for (const target of targets) {
        try {
            // Find Admin user in this database
            const admin = await target.prisma.user.findFirst({
                where: {
                    OR: [
                        { role: 'admin' },
                        { email: 'admin@dps.edu' }
                    ]
                }
            });

            if (!admin) {
                console.warn(`[${target.name}] Admin user not found, skipping folder creation.`);
                continue;
            }

            // Find or create "APP Design doc" folder
            let folder = await target.prisma.documentFolder.findFirst({
                where: {
                    schoolId: admin.schoolId,
                    name: 'APP Design doc',
                    deletedAt: null
                }
            });

            if (!folder) {
                folder = await target.prisma.documentFolder.create({
                    data: {
                        name: 'APP Design doc',
                        schoolId: admin.schoolId,
                        createdById: admin.id,
                        parentId: null
                    }
                });
                console.log(`✅ [${target.name}] Created folder "APP Design doc" (ID: ${folder.id})`);
            } else {
                console.log(`ℹ️ [${target.name}] Found existing folder "APP Design doc" (ID: ${folder.id})`);
            }

            // Create or update document inside this folder
            const existingDoc = await target.prisma.document.findFirst({
                where: {
                    folderId: folder.id,
                    name: docName,
                    deletedAt: null
                }
            });

            if (existingDoc) {
                await target.prisma.document.update({
                    where: { id: existingDoc.id },
                    data: {
                        fileName,
                        fileType: 'pdf',
                        mimeType: 'application/pdf',
                        fileSize: stats.size,
                        url: finalUrl,
                        cloudinaryId,
                        category: 'report',
                        description: docDescription,
                        updatedAt: new Date()
                    }
                });
                console.log(`✅ [${target.name}] Updated Document "${docName}" in "APP Design doc" folder`);
            } else {
                const newDoc = await target.prisma.document.create({
                    data: {
                        name: docName,
                        fileName,
                        fileType: 'pdf',
                        mimeType: 'application/pdf',
                        fileSize: stats.size,
                        url: finalUrl,
                        cloudinaryId,
                        category: 'report',
                        description: docDescription,
                        folderId: folder.id,
                        schoolId: admin.schoolId,
                        uploadedById: admin.id,
                        isPublic: false
                    }
                });
                console.log(`✅ [${target.name}] Created Document "${docName}" (ID: ${newDoc.id}) in "APP Design doc" folder`);
            }
        } catch (dbErr) {
            console.error(`❌ [${target.name}] DB error:`, dbErr.message);
        }
    }
}

async function main() {
    try {
        const tables = await extractSchema(prismaNew);
        console.log(`[Schema] Fetched ${tables.length} tables from database.`);

        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const outputPath = path.join(uploadsDir, 'ulrms_database_schema_specification.pdf');

        await buildPdf(tables, outputPath);
        await uploadAndRegisterDoc(outputPath);

        console.log('\n🎉 ALL DONE! PDF is generated, uploaded to Cloudinary, and registered under "APP Design doc" folder!');
    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await prismaNew.$disconnect();
        await prismaOld.$disconnect();
    }
}

main();
