/**
 * Email Service for LabRecManager
 * Handles sending emails with attachments via Nodemailer.
 * Falls back gracefully to simulation/preview mode if SMTP credentials are not configured.
 */

const nodemailer = require('nodemailer');

function getSmtpConfig() {
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const brevoApiKey = process.env.BREVO_API_KEY || '';

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"LabRec Implementation Manager" <noreply@labrecmanager.com>';

  const isHttpConfigured = Boolean(resendApiKey || brevoApiKey);
  const isSmtpConfigured = Boolean(user && pass);
  const isConfigured = isHttpConfigured || isSmtpConfigured;

  let serverType = 'custom';
  if (resendApiKey) serverType = 'resend';
  else if (brevoApiKey) serverType = 'brevo';
  else if (host.toLowerCase().includes('gmail.com')) serverType = 'gmail';
  else if (host.toLowerCase().includes('office365.com') || host.toLowerCase().includes('outlook.com')) serverType = 'outlook';

  return { host, port, secure, user, pass, from, isConfigured, isHttpConfigured, resendApiKey, brevoApiKey, serverType };
}

let cachedTransporter = null;

function createTransporter() {
  const config = getSmtpConfig();

  if (!config.isConfigured || config.isHttpConfigured) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: 10000, // 10s connection timeout to fail fast if port is firewalled
    greetingTimeout: 10000,
    socketTimeout: 15000,
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
 * Send email via Resend HTTP REST API (Port 443 - works on Render Free Tier)
 */
async function sendViaResend({ to, subject, html, text, attachments = [] }) {
  const config = getSmtpConfig();
  const apiKey = config.resendApiKey;

  // Resend strictly requires a verified custom domain, or its sandbox onboarding address.
  // Standard free domains (@gmail.com, @yahoo.com, etc.) cannot be used directly as 'from' without domain DNS verification.
  let from = process.env.RESEND_FROM;
  if (!from || from.includes('@gmail.com') || from.includes('@yahoo.com') || from.includes('@outlook.com') || from.includes('@hotmail.com')) {
    from = 'LabRecManager <onboarding@resend.dev>';
  }

  const replyTo = config.user || (config.from?.match(/<([^>]+)>/)?.[1]) || undefined;

  const formattedAttachments = attachments.map(att => {
    let base64Content = '';
    if (Buffer.isBuffer(att.content)) {
      base64Content = att.content.toString('base64');
    } else if (typeof att.content === 'string') {
      base64Content = Buffer.from(att.content, 'utf-8').toString('base64');
    }
    return {
      filename: att.filename,
      content: base64Content
    };
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : to.split(',').map(s => s.trim()),
      reply_to: replyTo,
      subject,
      html,
      text,
      attachments: formattedAttachments.length > 0 ? formattedAttachments : undefined
    })
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 403 || data.message?.includes('only send testing emails')) {
      const sandboxMsg = data.message || 'You can only send testing emails to your own email address (charan881130@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain.';
      const err = new Error(sandboxMsg);
      err.isSandboxRestriction = true;
      err.status = 403;
      throw err;
    }
    throw new Error(data.message || `Resend error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Send email via Brevo HTTP REST API (Port 443 - works on Render Free Tier)
 */
async function sendViaBrevo({ to, subject, html, text, attachments = [] }) {
  const config = getSmtpConfig();
  const apiKey = config.brevoApiKey;
  const fromEmail = config.user || 'noreply@labrecmanager.com';

  const formattedAttachments = attachments.map(att => ({
    name: att.filename,
    content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : Buffer.from(att.content).toString('base64')
  }));

  const recipientList = (Array.isArray(to) ? to : to.split(',')).map(email => ({ email: email.trim() }));

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'LabRecManager', email: fromEmail },
      to: recipientList,
      subject,
      htmlContent: html,
      textContent: text,
      attachment: formattedAttachments.length > 0 ? formattedAttachments : undefined
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Brevo error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
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

  // If HTTP API is configured (Resend / Brevo), use it (Render Port 443 compatible)
  if (config.isHttpConfigured) {
    try {
      let info;
      if (config.resendApiKey) {
        info = await sendViaResend({
          to: recipients,
          subject: finalSubject,
          html,
          text: `${finalSubject}\n\n${message || 'Please find attached the exported Implementation Plans report.'}\n\nGenerated by LabRecManager.`,
          attachments: mailAttachments
        });
      } else if (config.brevoApiKey) {
        info = await sendViaBrevo({
          to: recipients,
          subject: finalSubject,
          html,
          text: `${finalSubject}\n\n${message || 'Please find attached the exported Implementation Plans report.'}\n\nGenerated by LabRecManager.`,
          attachments: mailAttachments
        });
      }

      console.log(`[EmailService] Implementation report sent successfully via HTTP API. ID: ${info?.id || 'ok'}`);
      return {
        success: true,
        simulated: false,
        messageId: info?.id || `http-${Date.now()}`,
        recipients: recipients.split(',').map(s => s.trim()),
        attachmentsCount: mailAttachments.length
      };
    } catch (err) {
      console.error('[EmailService] Failed to send implementation report via HTTP API:', err.message);
      if (config.isConfigured) {
        console.info('[EmailService] Attempting fallback to SMTP transporter...');
        try {
          const transporter = createTransporter();
          if (transporter) {
            const info = await transporter.sendMail({
              from: config.from,
              to: recipients,
              subject: finalSubject,
              html,
              text: `${finalSubject}\n\n${message || 'Please find attached the exported Implementation Plans report.'}\n\nGenerated by LabRecManager.`,
              attachments: mailAttachments
            });
            console.log(`[EmailService] Implementation report sent successfully via fallback SMTP. ID: ${info?.messageId}`);
            return {
              success: true,
              simulated: false,
              messageId: info?.messageId || `smtp-${Date.now()}`,
              recipients: recipients.split(',').map(s => s.trim()),
              attachmentsCount: mailAttachments.length
            };
          }
        } catch (smtpErr) {
          console.error('[EmailService] SMTP fallback also failed:', smtpErr.message);
        }
      }
      throw new Error(`Email dispatch failed: ${err.message}`);
    }
  }

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


/**
 * Generate a responsive branded HTML email body for Weekly Storage Quota reports
 */
function generateStorageQuotaEmailHtml({ title = 'Weekly Storage Quota & Capacity Report', summary = [], allUsers = [], usersOverQuota = [], schoolName = 'LabRecManager Institution' }) {
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const totalUsedBytes = summary.reduce((sum, s) => sum + (s.totalUsedBytes || 0), 0);
  const totalQuotaBytes = summary.reduce((sum, s) => sum + (s.totalQuotaBytes || 0), 0);
  const totalUsers = summary.reduce((sum, s) => sum + (s.userCount || 0), 0);
  const percentUsed = totalQuotaBytes > 0 ? Math.round((totalUsedBytes / totalQuotaBytes) * 100) : 0;

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em; }
    .header p { margin: 0; font-size: 13px; opacity: 0.85; }
    .content { padding: 28px 24px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-ok { background: #dcfce7; color: #15803d; }
    .badge-warn { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: #f1f5f9; border-radius: 10px; padding: 14px 10px; text-align: center; border: 1px solid #e2e8f0; }
    .kpi-value { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
    .alert-box { background: #fff1f2; border: 1px solid #fecdd3; border-left: 4px solid #e11d48; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; color: #881337; }
    .table-container { margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
    th { background: #f8fafc; padding: 10px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .progress-bar-bg { background: #e2e8f0; height: 6px; border-radius: 9999px; overflow: hidden; margin-top: 4px; }
    .progress-bar-fill { height: 100%; border-radius: 9999px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${title}</h1>
      <p>${schoolName} • Automated System Storage Governance</p>
    </div>
    <div class="content">
      <!-- KPI Overview -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${formatSize(totalUsedBytes)}</div>
          <div class="kpi-label">Used Storage</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatSize(totalQuotaBytes)}</div>
          <div class="kpi-label">Total Allocated</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value ${percentUsed >= 90 ? 'badge-danger' : percentUsed >= 70 ? 'badge-warn' : 'badge-ok'}">${percentUsed}%</div>
          <div class="kpi-label">Capacity Used</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${totalUsers}</div>
          <div class="kpi-label">Active Users</div>
        </div>
      </div>

      ${usersOverQuota.length > 0 ? `
      <div class="alert-box">
        <strong>⚠️ Attention Required (${usersOverQuota.length} Accounts Near or Exceeding Quota):</strong><br/>
        <ul style="margin: 6px 0 0 16px; padding: 0;">
          ${usersOverQuota.slice(0, 5).map(u => `
            <li><strong>${u.firstName} ${u.lastName}</strong> (${u.role}) — ${u.usedFormatted} of ${u.quotaFormatted} (${u.percentUsed}%)</li>
          `).join('')}
          ${usersOverQuota.length > 5 ? `<li>...and ${usersOverQuota.length - 5} more users (see attached CSV)</li>` : ''}
        </ul>
      </div>
      ` : `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; color: #14532d;">
        ✅ <strong>Healthy Capacity:</strong> All user accounts are operating within their allocated storage thresholds.
      </div>
      `}

      <!-- Role Breakdown -->
      <h3 style="font-size: 14px; margin: 0 0 10px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Storage Breakdown by Role</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Users</th>
              <th>Total Used</th>
              <th>Total Quota</th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            ${summary.map(s => `
              <tr>
                <td style="font-weight: 600; text-transform: capitalize;">${(s.role || '').replace('_', ' ')}</td>
                <td>${s.userCount}</td>
                <td>${s.totalUsedFormatted || formatSize(s.totalUsedBytes)}</td>
                <td>${formatSize(s.totalQuotaBytes)}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 600; font-size: 11px;">${s.percentUsed}%</span>
                    <div class="progress-bar-bg" style="flex: 1;">
                      <div class="progress-bar-fill" style="width: ${Math.min(100, s.percentUsed)}%; background: ${s.percentUsed >= 90 ? '#ef4444' : s.percentUsed >= 70 ? '#f59e0b' : '#10b981'};"></div>
                    </div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="font-size: 12px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px dashed #cbd5e1;">
        📎 <strong>Attached Report:</strong> A complete individual user breakdown spreadsheet (CSV) is attached to this email for audit compliance and quota adjustments.
      </div>
    </div>
    <div class="footer">
      <p>Report generated automatically on ${timestamp}</p>
      <p>© ${new Date().getFullYear()} LabRecManager Administration & Infrastructure Portal.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate CSV text for user storage breakdown
 */
function generateStorageCsvAttachment(users = []) {
  const headers = ['User ID', 'First Name', 'Last Name', 'Email', 'Role', 'Quota (MB)', 'Used (Bytes)', 'Used Formatted', 'Quota Formatted', 'Percent Used'];
  const rows = users.map(u => [
    `"${u.id || ''}"`,
    `"${(u.firstName || '').replace(/"/g, '""')}"`,
    `"${(u.lastName || '').replace(/"/g, '""')}"`,
    `"${(u.email || '').replace(/"/g, '""')}"`,
    `"${u.role || ''}"`,
    u.storageQuotaMb || 500,
    u.storageUsedBytes || 0,
    `"${u.usedFormatted || ''}"`,
    `"${u.quotaFormatted || ''}"`,
    `${u.percentUsed || 0}%`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * Send Weekly Storage Quota Report Email
 */
async function sendStorageQuotaReport({ to, subject, summary = [], users = [], schoolName = 'LabRecManager Institution', includeAttachment = true }) {
  const config = getSmtpConfig();
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  if (!recipients || !recipients.trim()) {
    throw new Error('Recipient email address is required');
  }

  const usersOverQuota = users.filter(u => (u.percentUsed || 0) >= 85);
  const finalSubject = subject || `[LabRecManager] Weekly Storage Quota Report - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const html = generateStorageQuotaEmailHtml({ title: finalSubject, summary, allUsers: users, usersOverQuota, schoolName });

  const attachments = [];
  if (includeAttachment && users.length > 0) {
    const csvContent = generateStorageCsvAttachment(users);
    attachments.push({
      filename: `storage-quota-report-${new Date().toISOString().split('T')[0]}.csv`,
      content: Buffer.from(csvContent, 'utf-8'),
      contentType: 'text/csv'
    });
  }

  // If HTTP API is configured (Resend / Brevo), use it (Render Port 443 compatible)
  if (config.isHttpConfigured) {
    try {
      let info;
      if (config.resendApiKey) {
        info = await sendViaResend({
          to: recipients,
          subject: finalSubject,
          html,
          text: `${finalSubject}\n\nWeekly storage quota report for ${schoolName}.\nPlease find the attached CSV for full user breakdown.\n\nGenerated by LabRecManager.`,
          attachments
        });
      } else if (config.brevoApiKey) {
        info = await sendViaBrevo({
          to: recipients,
          subject: finalSubject,
          html,
          text: `${finalSubject}\n\nWeekly storage quota report for ${schoolName}.\nPlease find the attached CSV for full user breakdown.\n\nGenerated by LabRecManager.`,
          attachments
        });
      }

      console.log(`[EmailService] Storage quota report sent successfully via HTTP API. ID: ${info?.id || 'ok'}`);
      return {
        success: true,
        simulated: false,
        messageId: info?.id || `http-${Date.now()}`,
        recipients: recipients.split(',').map(s => s.trim()),
        attachmentsCount: attachments.length
      };
    } catch (err) {
      console.error('[EmailService] Failed to send storage quota report via HTTP API:', err);
      throw new Error(`Email dispatch failed: ${err.message}`);
    }
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.warn('[EmailService] SMTP credentials not configured. Simulating weekly storage quota report:');
    console.log(`[EmailService] Simulated To: ${recipients}`);
    console.log(`[EmailService] Simulated Subject: ${finalSubject}`);
    console.log(`[EmailService] Simulated Attachment: ${attachments.map(a => a.filename).join(', ') || 'None'}`);

    return {
      success: true,
      simulated: true,
      messageId: `simulated-storage-${Date.now()}`,
      recipients: recipients.split(',').map(s => s.trim()),
      attachmentsCount: attachments.length,
      note: 'SMTP not configured in environment. Weekly storage report simulated successfully.'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: recipients,
      subject: finalSubject,
      text: `${finalSubject}\n\nWeekly storage quota report for ${schoolName}.\nPlease find the attached CSV for full user breakdown.\n\nGenerated by LabRecManager.`,
      html,
      attachments
    });

    console.log(`[EmailService] Storage quota report sent successfully. Message ID: ${info.messageId}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      recipients: recipients.split(',').map(s => s.trim()),
      attachmentsCount: attachments.length
    };
  } catch (err) {
    console.error('[EmailService] Failed to send storage quota report:', err);
    throw new Error(`Email dispatch failed: ${err.message}`);
  }
}

/**
 * Test SMTP connection
 */
async function testSmtpConnection() {
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    return {
      configured: false,
      serverType: config.serverType,
      host: config.host,
      port: config.port,
      user: config.user,
      message: 'SMTP credentials not configured (SMTP_USER/SMTP_PASS are empty). System is using simulation mode.'
    };
  }

  // If HTTP API is configured, verify API key over HTTPS Port 443
  if (config.isHttpConfigured) {
    if (config.resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/api-keys', {
          headers: { 'Authorization': `Bearer ${config.resendApiKey}` }
        });
        if (res.ok) {
          return {
            configured: true,
            connected: true,
            serverType: 'resend',
            host: 'api.resend.com (HTTPS Port 443)',
            port: 443,
            user: 'Resend API Key',
            from: config.from,
            message: 'Successfully verified Resend HTTP Email API (Render Port 443 Compatible)!'
          };
        } else {
          const errData = await res.json().catch(() => ({}));
          return {
            configured: true,
            connected: false,
            serverType: 'resend',
            host: 'api.resend.com',
            port: 443,
            error: errData.message || `HTTP ${res.status}`,
            message: `Resend API authentication failed: ${errData.message || res.statusText}`
          };
        }
      } catch (err) {
        return {
          configured: true,
          connected: false,
          serverType: 'resend',
          host: 'api.resend.com',
          port: 443,
          error: err.message,
          message: `Failed to connect to Resend API: ${err.message}`
        };
      }
    }
  }

  const transporter = createTransporter();
  try {
    await transporter.verify();
    return {
      configured: true,
      connected: true,
      serverType: config.serverType,
      host: config.host,
      port: config.port,
      user: config.user,
      from: config.from,
      message: `Successfully connected to ${config.serverType.toUpperCase()} SMTP server (${config.host}:${config.port}).`
    };
  } catch (err) {
    let friendlyMessage = `Failed to connect to SMTP server: ${err.message}`;
    if (err.message?.includes('ETIMEDOUT') || err.code === 'ETIMEDOUT' || err.message?.includes('Greeting never received')) {
      friendlyMessage = `Connection timed out to ${config.host}:${config.port}. Note: Render Free Tier blocks outbound SMTP traffic on ports 25, 465, and 587. To send emails from Render, add RESEND_API_KEY (HTTP Port 443).`;
    } else if (err.message?.includes('535') || err.message?.includes('BadCredentials') || err.message?.includes('Username and Password not accepted')) {
      friendlyMessage = `Authentication failed on ${config.host}. Please verify your 16-character Google App Password (not your regular account password).`;
    }

    return {
      configured: true,
      connected: false,
      serverType: config.serverType,
      host: config.host,
      port: config.port,
      error: err.message,
      message: friendlyMessage
    };
  }
}

module.exports = {
  getSmtpConfig,
  sendImplementationReport,
  generateEmailHtml,
  generateStorageQuotaEmailHtml,
  sendStorageQuotaReport,
  testSmtpConnection
};
