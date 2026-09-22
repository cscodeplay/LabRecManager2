const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

class ImplementationExportService {
    /**
     * Calculate human-readable duration between two dates
     */
    calculateDuration(startDate, endDate) {
        if (!startDate) return 'Not Started';
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        const diffMs = Math.max(0, end.getTime() - start.getTime());
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const days = Math.floor(hours / 24);

        if (days > 0) {
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h ${minutes}m`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    /**
     * Generate CSV Buffer
     */
    generateCsv(plans) {
        const headers = [
            'Serial ID',
            'Plan ID',
            'Title',
            'Category',
            'Status',
            'Start Date Time',
            'End Date Time',
            'Duration',
            'Total Tasks',
            'Completed Tasks',
            'Progress %',
            'Description',
            'Outcomes',
            'Created At'
        ];

        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = (plans || []).map((p, idx) => {
            const tasks = Array.isArray(p.tasks) ? p.tasks : [];
            const completedTasks = tasks.filter(t => t.completed).length;
            const progressPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : (p.status === 'completed' ? 100 : 0);
            const duration = this.calculateDuration(p.started_at, p.ended_at);
            const serialId = p.serial_id || (p.metadata && p.metadata.serial_id) || ('PLAN-' + String(p.serial_no || (idx + 1)).padStart(3, '0'));

            return [
                escapeCsv(serialId),
                escapeCsv(p.id),
                escapeCsv(p.title),
                escapeCsv(p.category || 'General'),
                escapeCsv(p.status ? p.status.toUpperCase() : 'DRAFT'),
                escapeCsv(p.started_at ? new Date(p.started_at).toISOString().replace('T', ' ').substring(0, 19) : 'N/A'),
                escapeCsv(p.ended_at ? new Date(p.ended_at).toISOString().replace('T', ' ').substring(0, 19) : (p.status === 'in_progress' ? 'Running' : 'N/A')),
                escapeCsv(duration),
                escapeCsv(tasks.length),
                escapeCsv(completedTasks),
                escapeCsv(`${progressPct}%`),
                escapeCsv(p.description || ''),
                escapeCsv(p.outcomes || ''),
                escapeCsv(p.created_at ? new Date(p.created_at).toISOString().replace('T', ' ').substring(0, 19) : '')
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\r\n');
        return Buffer.from(csvContent, 'utf-8');
    }

    /**
     * Generate XLSX Buffer
     */
    generateXlsx(plans) {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Plans Summary
        const planRows = (plans || []).map((p, idx) => {
            const tasks = Array.isArray(p.tasks) ? p.tasks : [];
            const completedTasks = tasks.filter(t => t.completed).length;
            const progressPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : (p.status === 'completed' ? 100 : 0);
            const serialId = p.serial_id || (p.metadata && p.metadata.serial_id) || ('PLAN-' + String(p.serial_no || (idx + 1)).padStart(3, '0'));

            return {
                '#': idx + 1,
                'Serial ID': serialId,
                'Plan ID': p.id,
                'Title': p.title,
                'Category': p.category || 'General',
                'Status': (p.status || 'draft').toUpperCase(),
                'Start DateTime': p.started_at ? new Date(p.started_at).toISOString().replace('T', ' ').substring(0, 19) : 'Not Started',
                'End DateTime': p.ended_at ? new Date(p.ended_at).toISOString().replace('T', ' ').substring(0, 19) : (p.status === 'in_progress' ? 'In Progress' : 'Pending'),
                'Duration': this.calculateDuration(p.started_at, p.ended_at),
                'Total Tasks': tasks.length,
                'Completed Tasks': completedTasks,
                'Progress': `${progressPct}%`,
                'Description': p.description || '',
                'Outcomes': p.outcomes || '',
                'Created At': p.created_at ? new Date(p.created_at).toISOString().replace('T', ' ').substring(0, 19) : ''
            };
        });

        const wsPlans = XLSX.utils.json_to_sheet(planRows);
        wsPlans['!cols'] = [
            { wch: 4 },  // #
            { wch: 12 }, // Serial ID
            { wch: 36 }, // Plan ID
            { wch: 35 }, // Title
            { wch: 20 }, // Category
            { wch: 14 }, // Status
            { wch: 20 }, // Start
            { wch: 20 }, // End
            { wch: 12 }, // Duration
            { wch: 12 }, // Total Tasks
            { wch: 15 }, // Completed
            { wch: 10 }, // Progress
            { wch: 40 }, // Description
            { wch: 40 }, // Outcomes
            { wch: 20 }  // Created At
        ];
        XLSX.utils.book_append_sheet(wb, wsPlans, 'Implementation Plans');

        // Sheet 2: Tasks Detailed Breakdown
        const taskRows = [];
        (plans || []).forEach((p, pIdx) => {
            const tasks = Array.isArray(p.tasks) ? p.tasks : [];
            const serialId = p.serial_id || (p.metadata && p.metadata.serial_id) || ('PLAN-' + String(p.serial_no || (pIdx + 1)).padStart(3, '0'));
            tasks.forEach((t, tIdx) => {
                taskRows.push({
                    'Serial ID': serialId,
                    'Plan Title': p.title,
                    'Category': p.category || 'General',
                    'Task #': tIdx + 1,
                    'Task ID': t.serial_id || t.id || `${serialId}-T${tIdx + 1}`,
                    'Task Description': t.title || 'Untitled Task',
                    'Completed': t.completed ? 'YES' : 'NO',
                    'Completed At': t.completedAt ? new Date(t.completedAt).toISOString().replace('T', ' ').substring(0, 19) : 'Pending'
                });
            });
        });

        if (taskRows.length > 0) {
            const wsTasks = XLSX.utils.json_to_sheet(taskRows);
            wsTasks['!cols'] = [
                { wch: 12 }, // Serial ID
                { wch: 35 },
                { wch: 20 },
                { wch: 8 },
                { wch: 15 },
                { wch: 50 },
                { wch: 12 },
                { wch: 20 }
            ];
            XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks Breakdown');
        }

        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    /**
     * Generate PDF Buffer using pdfkit
     */
    generatePdf(plans, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', err => reject(err));

                const titleText = options.title || 'Implementation Plans & Execution Audit Report';
                const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

                // Header Banner
                doc.rect(0, 0, doc.page.width, 70).fill('#1E1B4B');
                doc.fillColor('#FFFFFF')
                    .fontSize(18)
                    .font('Helvetica-Bold')
                    .text('ULRMS LAB RECORD MANAGER', 40, 20);
                doc.fontSize(10)
                    .font('Helvetica')
                    .fillColor('#C7D2FE')
                    .text(titleText, 40, 42);

                doc.fontSize(8)
                    .fillColor('#94A3B8')
                    .text(`Generated: ${nowStr}`, doc.page.width - 200, 42, { align: 'right', width: 160 });

                let currentY = 85;

                // KPI Summary Cards Box
                const totalCount = (plans || []).length;
                const completedCount = (plans || []).filter(p => p.status === 'completed').length;
                const inProgressCount = (plans || []).filter(p => p.status === 'in_progress').length;
                const draftCount = (plans || []).filter(p => p.status === 'draft').length;

                doc.rect(40, currentY, doc.page.width - 80, 50).fillAndStroke('#F8FAFC', '#E2E8F0');

                const colWidth = (doc.page.width - 80) / 4;
                const metrics = [
                    { label: 'TOTAL PLANS', val: String(totalCount), color: '#312E81' },
                    { label: 'COMPLETED', val: String(completedCount), color: '#047857' },
                    { label: 'IN PROGRESS', val: String(inProgressCount), color: '#0284C7' },
                    { label: 'DRAFT / OTHER', val: String(draftCount), color: '#D97706' }
                ];

                metrics.forEach((m, i) => {
                    const boxX = 40 + (i * colWidth);
                    doc.fillColor('#64748B')
                        .fontSize(7)
                        .font('Helvetica-Bold')
                        .text(m.label, boxX + 10, currentY + 10);
                    doc.fillColor(m.color)
                        .fontSize(16)
                        .font('Helvetica-Bold')
                        .text(m.val, boxX + 10, currentY + 24);
                });

                currentY += 65;

                // Section: Executive Summary Table
                doc.fillColor('#0F172A')
                    .fontSize(12)
                    .font('Helvetica-Bold')
                    .text('Implementation Plans Summary', 40, currentY);

                currentY += 16;

                // Table Header
                doc.rect(40, currentY, doc.page.width - 80, 18).fill('#EEF2F6');
                doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold');
                doc.text('PLAN TITLE', 45, currentY + 5, { width: 170 });
                doc.text('MODULE', 220, currentY + 5, { width: 90 });
                doc.text('STATUS', 315, currentY + 5, { width: 65 });
                doc.text('START TIME', 385, currentY + 5, { width: 85 });
                doc.text('END TIME', 475, currentY + 5, { width: 80 });

                currentY += 19;

                (plans || []).forEach((p, idx) => {
                    if (currentY > doc.page.height - 80) {
                        doc.addPage();
                        currentY = 40;
                    }

                    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                    doc.rect(40, currentY, doc.page.width - 80, 20).fill(bg);

                    const serialId = p.serial_id || (p.metadata && p.metadata.serial_id) || ('PLAN-' + String(p.serial_no || (idx + 1)).padStart(3, '0'));

                    doc.fillColor('#1E293B').fontSize(7.5).font('Helvetica-Bold');
                    doc.text(`[${serialId}] ${p.title || 'Untitled'}`, 45, currentY + 5, { width: 170, ellipsis: true });

                    doc.fillColor('#64748B').font('Helvetica');
                    doc.text(p.category || 'General', 220, currentY + 5, { width: 90, ellipsis: true });

                    const statusColor = p.status === 'completed' ? '#047857' : (p.status === 'in_progress' ? '#0284C7' : '#D97706');
                    doc.fillColor(statusColor).font('Helvetica-Bold');
                    doc.text((p.status || 'draft').toUpperCase(), 315, currentY + 5, { width: 65 });

                    doc.fillColor('#475569').font('Helvetica');
                    const startStr = p.started_at ? new Date(p.started_at).toISOString().replace('T', ' ').substring(5, 16) : '-';
                    const endStr = p.ended_at ? new Date(p.ended_at).toISOString().replace('T', ' ').substring(5, 16) : (p.status === 'in_progress' ? 'Running' : '-');
                    doc.text(startStr, 385, currentY + 5, { width: 85 });
                    doc.text(endStr, 475, currentY + 5, { width: 80 });

                    currentY += 20;
                });

                currentY += 15;

                // Section: Detailed Plan Breakdown
                (plans || []).forEach((p, idx) => {
                    if (currentY > doc.page.height - 120) {
                        doc.addPage();
                        currentY = 40;
                    }

                    doc.rect(40, currentY, doc.page.width - 80, 2).fill('#E2E8F0');
                    currentY += 10;

                    const serialId = p.serial_id || (p.metadata && p.metadata.serial_id) || ('PLAN-' + String(p.serial_no || (idx + 1)).padStart(3, '0'));

                    // Plan Title & Category
                    doc.fillColor('#1E1B4B').fontSize(12).font('Helvetica-Bold');
                    doc.text(`[${serialId}] ${p.title}`, 40, currentY, { width: doc.page.width - 160 });

                    const durationStr = this.calculateDuration(p.started_at, p.ended_at);
                    doc.fillColor('#6366F1').fontSize(8).font('Helvetica-Bold');
                    doc.text(`[${(p.category || 'General').toUpperCase()}] - Duration: ${durationStr}`, doc.page.width - 200, currentY, { align: 'right', width: 160 });

                    currentY += 16;

                    // Plan timestamps info
                    doc.fillColor('#475569').fontSize(8).font('Helvetica');
                    const sTime = p.started_at ? new Date(p.started_at).toUTCString() : 'Not recorded';
                    const eTime = p.ended_at ? new Date(p.ended_at).toUTCString() : (p.status === 'in_progress' ? 'Currently Running' : 'Pending');
                    doc.text(`Started: ${sTime}  |  Ended: ${eTime}`, 40, currentY);

                    currentY += 14;

                    if (p.description) {
                        doc.fillColor('#334155').fontSize(8).font('Helvetica');
                        doc.text(p.description, 40, currentY, { width: doc.page.width - 80 });
                        currentY += doc.heightOfString(p.description, { width: doc.page.width - 80 }) + 6;
                    }

                    // Tasks
                    const tasks = Array.isArray(p.tasks) ? p.tasks : [];
                    if (tasks.length > 0) {
                        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text('Tasks & Deliverables:', 40, currentY);
                        currentY += 11;

                        tasks.forEach(t => {
                            if (currentY > doc.page.height - 40) {
                                doc.addPage();
                                currentY = 40;
                            }
                            const checkMark = t.completed ? '[DONE]' : '[TODO]';
                            const checkColor = t.completed ? '#059669' : '#94A3B8';
                            doc.fillColor(checkColor).font('Helvetica-Bold').fontSize(7.5).text(checkMark, 48, currentY, { width: 35 });
                            doc.fillColor('#1E293B').font('Helvetica').text(t.title || 'Untitled', 85, currentY, { width: doc.page.width - 130 });
                            currentY += 12;
                        });
                        currentY += 4;
                    }

                    if (p.outcomes) {
                        doc.fillColor('#059669').fontSize(7.5).font('Helvetica-Bold').text(`Outcomes: `, 40, currentY, { continued: true });
                        doc.fillColor('#334155').font('Helvetica').text(p.outcomes);
                        currentY += 14;
                    }

                    currentY += 8;
                });

                // Footer on all pages
                const pageCount = doc.bufferedPageRange().count;
                for (let i = 0; i < pageCount; i++) {
                    doc.switchToPage(i);
                    doc.rect(40, doc.page.height - 30, doc.page.width - 80, 0.5).fill('#CBD5E1');
                    doc.fillColor('#94A3B8').fontSize(7).font('Helvetica');
                    doc.text('ULRMS Enterprise Lab Record Manager • Implementation Audit Log', 40, doc.page.height - 22);
                    doc.text(`Page ${i + 1} of ${pageCount}`, doc.page.width - 120, doc.page.height - 22, { align: 'right', width: 80 });
                }

                doc.end();
            } catch (err) {
                reject(err);
            }
        });
    }
}

module.exports = new ImplementationExportService();
