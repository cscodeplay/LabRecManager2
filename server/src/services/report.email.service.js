/**
 * Report Email Service for LabRecManager
 * Compiles multi-entity reports into formatted Excel (.xlsx) workbooks,
 * CSV files, and branded HTML summaries, and dispatches via Resend/SMTP.
 */

const XLSX = require('xlsx');
const emailService = require('./email.service');

/**
 * Generate in-memory multi-tab Excel (.xlsx) workbook buffer from report results
 */
function generateReportExcelBuffer(reportResults) {
    if (!reportResults || typeof reportResults !== 'object') {
        throw new Error('Invalid report results provided for Excel generation');
    }

    const workbook = XLSX.utils.book_new();
    let sheetCount = 0;

    for (const key of Object.keys(reportResults)) {
        const entity = reportResults[key];
        if (entity && Array.isArray(entity.rows) && entity.rows.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(entity.rows);
            // Excel sheet names must be <= 31 chars and cannot contain certain chars
            let sheetName = (entity.title || key)
                .replace(/Report/gi, '')
                .replace(/[\\/?*[\]:]/g, '')
                .trim()
                .substring(0, 30) || `Sheet${sheetCount + 1}`;

            // Ensure unique sheet name
            if (workbook.SheetNames.includes(sheetName)) {
                sheetName = `${sheetName.substring(0, 27)}_${sheetCount + 1}`;
            }

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            sheetCount++;
        }
    }

    if (sheetCount === 0) {
        // Create an empty summary sheet if no rows exist
        const emptySheet = XLSX.utils.json_to_sheet([{ Note: 'No records found matching filters' }]);
        XLSX.utils.book_append_sheet(workbook, emptySheet, 'Summary');
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate CSV string/buffer from the primary or unified report entity
 */
function generateReportCsvBuffer(reportResults) {
    if (!reportResults || typeof reportResults !== 'object') {
        return Buffer.from('No data', 'utf-8');
    }

    const keys = Object.keys(reportResults);
    if (keys.length === 0) {
        return Buffer.from('No data', 'utf-8');
    }

    // Prefer unified, otherwise first entity
    const targetKey = reportResults.unified ? 'unified' : keys[0];
    const entity = reportResults[targetKey];

    if (!entity || !Array.isArray(entity.rows) || entity.rows.length === 0) {
        return Buffer.from('No records found', 'utf-8');
    }

    const worksheet = XLSX.utils.json_to_sheet(entity.rows);
    const csvString = XLSX.utils.sheet_to_csv(worksheet);
    return Buffer.from(csvString, 'utf-8');
}

/**
 * Generate responsive branded HTML email body for custom reports
 */
function generateReportEmailHtml({
    title = 'Official Institutional Report',
    message = '',
    reportResults = {},
    filters = {},
    schoolName = 'LabRecManager Institution'
}) {
    const timestamp = new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium'
    });

    const entityKeys = Object.keys(reportResults).filter(k => k !== 'unified');
    const totalEntities = entityKeys.length;
    const totalRecords = Object.values(reportResults).reduce((sum, e) => sum + (e.rows?.length || 0), 0);

    // Build entity summary cards
    const entityCardsHtml = entityKeys.map(key => {
        const ent = reportResults[key];
        const count = ent.rows?.length || 0;
        return `
            <div style="flex: 1; min-width: 130px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 4px; text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">${ent.title || key}</div>
                <div style="font-size: 20px; font-weight: 800; color: #1e3a8a; margin-top: 4px;">${count}</div>
                <div style="font-size: 11px; color: #94a3b8;">records compiled</div>
            </div>
        `;
    }).join('');

    // Build preview table for top records (up to 5 rows of primary entity)
    let previewTableHtml = '';
    const previewEntityKey = reportResults.unified ? 'unified' : entityKeys[0];
    const previewEntity = reportResults[previewEntityKey];

    if (previewEntity && Array.isArray(previewEntity.rows) && previewEntity.rows.length > 0) {
        const previewRows = previewEntity.rows.slice(0, 6);
        const headers = Object.keys(previewRows[0]).slice(0, 5); // top 5 columns

        previewTableHtml = `
            <div style="margin-top: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: #f1f5f9; padding: 10px 14px; font-weight: 700; font-size: 12px; color: #334155; border-bottom: 1px solid #e2e8f0;">
                    Sample Preview: ${previewEntity.title || 'Report Records'} (Showing top ${previewRows.length} of ${previewEntity.rows.length})
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            ${headers.map(h => `<th style="padding: 8px 10px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${previewRows.map((r, i) => `
                            <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                                ${headers.map(h => `<td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #334155;">${r[h] ?? '-'}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.07); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.85; margin-bottom: 6px;">${schoolName}</div>
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">${title}</h1>
      <p style="margin: 0; font-size: 13px; opacity: 0.9;">Generated on ${timestamp}</p>
    </div>

    <!-- Content -->
    <div style="padding: 28px 24px;">
      
      ${message ? `
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px; font-size: 13px; color: #1e3a8a; line-height: 1.6;">
          <strong>Admin Note:</strong> ${message}
        </div>
      ` : ''}

      <!-- Entity Counts Grid -->
      <div style="display: flex; flex-wrap: wrap; margin: -4px 0 20px 0;">
        ${entityCardsHtml}
      </div>

      <!-- Preview Table -->
      ${previewTableHtml}

      <!-- Attachment Banner -->
      <div style="margin-top: 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; display: flex; align-items: center;">
        <div style="font-size: 13px; color: #166534; line-height: 1.5;">
          📎 <strong>Official Data Attachments Included:</strong><br>
          Please find attached the complete multi-tab <strong>Excel (.xlsx)</strong> workbook and/or <strong>CSV</strong> spreadsheet containing all ${totalRecords} compiled records for thorough analysis.
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
      <div>Lab Record Manager • Automated Institutional Reporting System</div>
      <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">This is an automated system dispatch. Replies are routed to administrative staff.</div>
    </div>

  </div>
</body>
</html>
    `;
}

/**
 * Send custom report via email to any specified recipient(s)
 */
async function sendCustomReportEmail({
    to,
    subject,
    message = '',
    reportTitle = 'Custom Report',
    reportResults = {},
    filters = {},
    schoolName = 'LabRecManager Institution',
    formats = { xlsx: true, csv: false }
}) {
    if (!to) {
        throw new Error('Recipient email address is required');
    }

    const recipients = Array.isArray(to) ? to.join(', ') : to;
    const finalSubject = subject || `[LabRecManager] ${reportTitle} - ${new Date().toLocaleDateString()}`;
    const html = generateReportEmailHtml({
        title: reportTitle,
        message,
        reportResults,
        filters,
        schoolName
    });

    const attachments = [];
    const dateStr = new Date().toISOString().slice(0, 10);
    const safeTitle = (reportTitle || 'Report').replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);

    // 1. Generate Excel Attachment if requested
    if (formats.xlsx !== false) {
        const xlsxBuffer = generateReportExcelBuffer(reportResults);
        attachments.push({
            filename: `${safeTitle}_${dateStr}.xlsx`,
            content: xlsxBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
    }

    // 2. Generate CSV Attachment if requested
    if (formats.csv === true) {
        const csvBuffer = generateReportCsvBuffer(reportResults);
        attachments.push({
            filename: `${safeTitle}_${dateStr}.csv`,
            content: csvBuffer,
            contentType: 'text/csv'
        });
    }

    // Delegate delivery to emailService (routes via Resend HTTP API Port 443)
    return await emailService.sendImplementationReport({
        to: recipients,
        subject: finalSubject,
        message: message || `Attached please find the official institutional report for "${reportTitle}".`,
        attachments,
        summary: {
            total: Object.values(reportResults).reduce((sum, e) => sum + (e.rows?.length || 0), 0)
        }
    });
}

module.exports = {
    generateReportExcelBuffer,
    generateReportCsvBuffer,
    generateReportEmailHtml,
    sendCustomReportEmail
};
