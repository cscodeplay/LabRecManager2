const PDFDocument = require('pdfkit');
const docx = require('docx');
const JSZip = require('jszip');

/**
 * Generates a complete project bundle as a ZIP buffer containing:
 * 1. The pure source code file (.py or .sql)
 * 2. A professionally formatted Report (.pdf and/or .docx) with embedded diagram & output
 * 3. Standalone high-res diagram image (.png)
 * 4. Raw execution output log (.txt)
 */
async function generateProjectBundleZip({
    fileName = 'program.py',
    code = '',
    language = 'python',
    diagramImageBase64 = null,
    output = null,
    stdin = '',
    format = 'both', // 'pdf' | 'docx' | 'both'
    studentName = 'Student',
    studentId = '',
    schoolName = 'Lab Record Manager'
}) {
    const isSql = language === 'sql' || fileName.toLowerCase().endsWith('.sql');
    const ext = isSql ? 'sql' : 'py';
    const cleanBaseName = fileName.replace(/\.[^/.]+$/, '').trim() || (isSql ? 'sql_query' : 'python_program');
    const fullFileName = `${cleanBaseName}.${ext}`;
    const timestampStr = new Date().toLocaleString();

    // 1. Process diagram image buffer if present
    let diagramBuf = null;
    if (diagramImageBase64) {
        try {
            const raw = diagramImageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
            diagramBuf = Buffer.from(raw, 'base64');
        } catch (_) {}
    }

    // 2. Format execution output text
    let outputText = '';
    if (output) {
        if (output.stdout) outputText += `=== STDOUT ===\n${output.stdout}\n`;
        if (output.stderr) outputText += `=== STDERR ===\n${output.stderr}\n`;
        if (output.exitCode !== undefined) outputText += `Exit Code: ${output.exitCode}\n`;
        if (output.durationMs !== undefined) outputText += `Duration: ${output.durationMs}ms\n`;
        if (output.tables && Array.isArray(output.tables)) {
            outputText += `\n=== DATABASE TABLES & RESULTS ===\n`;
            output.tables.forEach((t) => {
                outputText += `Table: ${t.name || 'Query Result'}\n`;
                if (Array.isArray(t.rows)) {
                    outputText += JSON.stringify(t.rows, null, 2) + '\n';
                }
            });
        }
    }
    if (!outputText.trim()) {
        outputText = '(Program was not executed or produced no output before export)\n';
    }

    // 3. Generate PDF Report if requested
    let pdfBuf = null;
    if (format === 'pdf' || format === 'both') {
        const pdfDoc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks = [];
        pdfDoc.on('data', (c) => chunks.push(c));

        // Header
        pdfDoc.fillColor('#0f172a').fontSize(18).text(schoolName, { bold: true });
        pdfDoc.moveDown(0.2);
        pdfDoc.fontSize(13).fillColor('#2563eb').text(`Project Report: ${fullFileName}`);
        pdfDoc.moveDown(0.3);
        pdfDoc.fontSize(9.5).fillColor('#64748b').text(`Student: ${studentName}${studentId ? ` (${studentId})` : ''} • Date: ${timestampStr} • Language: ${isSql ? 'SQL' : 'Python'}`);
        pdfDoc.moveDown(0.5);

        // Divider
        pdfDoc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, pdfDoc.y).lineTo(555, pdfDoc.y).stroke();
        pdfDoc.moveDown(0.8);

        // Section 1: Source Code
        pdfDoc.fillColor('#0f172a').fontSize(12).text('1. Source Code:', { bold: true });
        pdfDoc.moveDown(0.4);
        pdfDoc.font('Courier').fontSize(9).fillColor('#1e293b').text(code || (isSql ? '-- Empty SQL query' : '# Empty Python script'));
        pdfDoc.moveDown(1);

        // Section 2: Flowchart / ER Diagram
        pdfDoc.font('Helvetica').fillColor('#0f172a').fontSize(12).text(isSql ? '2. Database ER Diagram:' : '2. Flowchart Diagram:', { bold: true });
        pdfDoc.moveDown(0.4);
        if (diagramBuf) {
            try {
                pdfDoc.image(diagramBuf, { fit: [500, 320], align: 'center' });
            } catch (imgErr) {
                pdfDoc.font('Helvetica').fontSize(9.5).fillColor('#64748b').text('(Diagram image could not be rendered)');
            }
        } else {
            pdfDoc.font('Helvetica').fontSize(9.5).fillColor('#64748b').text('(No visual diagram generated for this file)');
        }
        pdfDoc.moveDown(1);

        // Section 3: Execution Output
        pdfDoc.font('Helvetica').fillColor('#0f172a').fontSize(12).text('3. Program Execution Output:', { bold: true });
        pdfDoc.moveDown(0.4);
        pdfDoc.font('Courier').fontSize(9).fillColor(output?.exitCode === 0 ? '#15803d' : '#334155').text(outputText);

        pdfDoc.end();
        await new Promise((r) => pdfDoc.on('end', r));
        pdfBuf = Buffer.concat(chunks);
    }

    // 4. Generate Word (.docx) Report if requested
    let docxBuf = null;
    if (format === 'docx' || format === 'both') {
        const docxChildren = [
            new docx.Paragraph({
                children: [new docx.TextRun({ text: schoolName, bold: true, size: 36, color: '0F172A' })]
            }),
            new docx.Paragraph({
                children: [new docx.TextRun({ text: `Project Report: ${fullFileName}`, bold: true, size: 28, color: '2563EB' })]
            }),
            new docx.Paragraph({
                children: [new docx.TextRun({ text: `Student: ${studentName}${studentId ? ` (${studentId})` : ''} • Date: ${timestampStr} • Language: ${isSql ? 'SQL' : 'Python'}`, size: 20, color: '64748B' })]
            }),
            new docx.Paragraph({ text: '' }),

            new docx.Paragraph({
                children: [new docx.TextRun({ text: '1. Source Code', bold: true, size: 24, color: '0F172A' })]
            })
        ];

        // Add code lines
        (code || '').split('\n').forEach((line) => {
            docxChildren.push(
                new docx.Paragraph({
                    children: [new docx.TextRun({ text: line || ' ', font: 'Courier New', size: 19, color: '1E293B' })]
                })
            );
        });

        docxChildren.push(new docx.Paragraph({ text: '' }));
        docxChildren.push(
            new docx.Paragraph({
                children: [new docx.TextRun({ text: isSql ? '2. Database ER Diagram' : '2. Flowchart Diagram', bold: true, size: 24, color: '0F172A' })]
            })
        );

        if (diagramBuf) {
            try {
                docxChildren.push(
                    new docx.Paragraph({
                        children: [
                            new docx.ImageRun({
                                data: diagramBuf,
                                transformation: { width: 500, height: 320 }
                            })
                        ]
                    })
                );
            } catch (_) {
                docxChildren.push(
                    new docx.Paragraph({
                        children: [new docx.TextRun({ text: '(Diagram image could not be embedded)', color: '64748B', size: 20 })]
                    })
                );
            }
        } else {
            docxChildren.push(
                new docx.Paragraph({
                    children: [new docx.TextRun({ text: '(No visual diagram generated for this file)', color: '64748B', size: 20 })]
                })
            );
        }

        docxChildren.push(new docx.Paragraph({ text: '' }));
        docxChildren.push(
            new docx.Paragraph({
                children: [new docx.TextRun({ text: '3. Program Execution Output', bold: true, size: 24, color: '0F172A' })]
            })
        );

        outputText.split('\n').forEach((line) => {
            docxChildren.push(
                new docx.Paragraph({
                    children: [new docx.TextRun({ text: line || ' ', font: 'Courier New', size: 19, color: '334155' })]
                })
            );
        });

        const wordDoc = new docx.Document({
            sections: [{ properties: {}, children: docxChildren }]
        });
        docxBuf = await docx.Packer.toBuffer(wordDoc);
    }

    // 5. Assemble ZIP Archive
    const zip = new JSZip();

    // Pure code script file
    zip.file(fullFileName, code || '');

    // Formatted Reports
    if (pdfBuf) {
        zip.file(`${cleanBaseName}_report.pdf`, pdfBuf);
    }
    if (docxBuf) {
        zip.file(`${cleanBaseName}_report.docx`, docxBuf);
    }

    // Standalone high-res diagram image
    if (diagramBuf) {
        zip.file(`${cleanBaseName}_diagram.png`, diagramBuf);
    }

    // Execution output log
    zip.file(`${cleanBaseName}_output.txt`, outputText);

    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = {
    generateProjectBundleZip
};
