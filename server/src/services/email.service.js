/**
 * Email Service for LabRecManager
 * Handles sending emails with attachments via Nodemailer.
 * Falls back gracefully to simulation/preview mode if SMTP credentials are not configured.
 */

const nodemailer = require('nodemailer');

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"LabRec Implementation Manager" <noreply@labrecmanager.com>';

  const isConfigured = Boolean(user && pass);

  return { host, port, secure, user, pass, from, isConfigured };
}

let cachedTransporter = null;

function createTransporter() {
  const config = getSmtpConfig();

  if (!config.isConfigured) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false // Helps avoid SSL self-signed issues in test setups
    }
  });

  return cachedTransporter;
}

/**
 * Generate a responsive branded HTML email body for Implementation Plan reports
 */
function generateEmailHtml({ title = 'Implementation Plans Export Report', message = '', summary = {}, plans = [] }) {
  const total = summary.total ?? plans.length ?? 0;
  const completed = summary.completed ?? plans.filter(p => p.status === 'completed').length;
  const inProgress = summary.in_progress ?? plans.filter(p => p.status === 'in_progress').length;
  const draft = summary.draft ?? plans.filter(p => p.status === 'draft').length;
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 28px 24px; }
    .message-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px; font-size: 14px; color: #334155; line-height: 1.6; }
    .kpi-grid { display: flex; gap: 12px; margin-bottom: 28px; }
    .kpi-card { flex: 1; background: #f1f5f9; border-radius: 8px; padding: 14px 12px; text-align: center; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
    .badge-completed { color: #16a34a; }
    .badge-in_progress { color: #2563eb; }
    .badge-draft { color: #d97706; }
    .table-container { margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { background: #f8fafc; padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #3b82f6; text-decoration: none; }
    .attachments-note { font-size: 13px; color: #64748b; margin-top: 20px; padding: 12px; background: #eff6ff; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 ${title}</h1>
      <p>LabRecManager System Governance & Implementation Log</p>
    </div>
    <div class="content">
      ${message ? `<div class="message-box"><strong>Admin Note:</strong><br/>${message.replace(/\n/g, '<br/>')}</div>` : ''}

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${total}</div>
          <div class="kpi-label">Total Plans</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value badge-completed">${completed}</div>
          <div class="kpi-label">Completed</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value badge-in_progress">${inProgress}</div>
          <div class="kpi-label">In Progress</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value badge-draft">${draft}</div>
          <div class="kpi-label">Drafts</div>
        </div>
      </div>

      ${plans.length > 0 ? `
      <h3 style="font-size: 15px; margin: 0 0 12px 0; color: #0f172a;">Plan Overview Summary</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${plans.slice(0, 8).map(p => `
              <tr>
                <td style="font-weight: 500;">${p.title || 'Untitled'}</td>
                <td>${p.category || 'General'}</td>
                <td>
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: capitalize; background: ${
                    p.status === 'completed' ? '#dcfce7; color: #166534;' :
                    p.status === 'in_progress' ? '#dbeafe; color: #1e40af;' :
                    '#fef3c7; color: #92400e;'
                  }">${(p.status || 'draft').replace('_', ' ')}</span>
                </td>
                <td style="color: #64748b;">${p.duration || '—'}</td>
              </tr>
            `).join('')}
            ${plans.length > 8 ? `<tr><td colspan="4" style="text-align: center; color: #64748b; font-style: italic;">...and ${plans.length - 8} more plan(s) detailed in attachments</td></tr>` : ''}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="attachments-note">
        📎 <strong>Attached Documentation:</strong> Export files in requested formats (PDF, XLSX, CSV) are attached to this email for full task breakdowns and audit trail.
      </div>
    </div>
    <div class="footer">
      <p>Export generated on ${timestamp}</p>
      <p>© ${new Date().getFullYear()} LabRecManager Administration Portal. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send Implementation Plan Report Email
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} [options.subject] - Email subject
 * @param {string} [options.message] - Custom admin note/message
 * @param {Array} [options.attachments] - Array of { filename, content, contentType }
 * @param {Object} [options.summary] - Summary metrics
 * @param {Array} [options.plans] - List of plans included
 */
async function sendImplementationReport({ to, subject, message, attachments = [], summary = {}, plans = [] }) {
  const config = getSmtpConfig();
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  if (!recipients || !recipients.trim()) {
    throw new Error('Recipient email address is required');
  }

  const finalSubject = subject || `[LabRecManager] Implementation Plans Export Report - ${new Date().toLocaleDateString()}`;
  const html = generateEmailHtml({ title: finalSubject, message, summary, plans });

  // Format attachments for nodemailer
  const mailAttachments = attachments.map(att => ({
    filename: att.filename,
    content: att.content,
    contentType: att.contentType
  }));

  const transporter = createTransporter();

  if (!transporter) {
    console.warn('[EmailService] SMTP credentials not configured (SMTP_USER/SMTP_PASS). Simulating email dispatch:');
    console.log(`[EmailService] Simulated To: ${recipients}`);
    console.log(`[EmailService] Simulated Subject: ${finalSubject}`);
    console.log(`[EmailService] Simulated Attachments: ${mailAttachments.map(a => a.filename).join(', ')}`);

    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
      recipients: recipients.split(',').map(s => s.trim()),
      attachmentsCount: mailAttachments.length,
      note: 'SMTP not configured in environment. Email simulated successfully.'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: recipients,
      subject: finalSubject,
      text: `${finalSubject}\n\n${message || 'Please find attached the exported Implementation Plans report.'}\n\nGenerated by LabRecManager.`,
      html,
      attachments: mailAttachments
    });

    console.log(`[EmailService] Email sent successfully. Message ID: ${info.messageId}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      recipients: recipients.split(',').map(s => s.trim()),
      attachmentsCount: mailAttachments.length
    };
  } catch (err) {
    console.error('[EmailService] Failed to send email via SMTP:', err);
    throw new Error(`Email dispatch failed: ${err.message}`);
  }
}

module.exports = {
  getSmtpConfig,
  sendImplementationReport,
  generateEmailHtml
};
