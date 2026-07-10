const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { query, queryOne } = require('../config/database');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

const FROM = `"${process.env.SMTP_FROM_NAME || 'HR Management'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;

const logEmail = async ({ toEmail, toName, employeeId, subject, body, type, status, errorMessage, sentByUserId, sentByName, referenceId }) => {
  try {
    await query(
      `INSERT INTO email_logs (to_email, to_name, employee_id, subject, body, type, status,
        error_message, sent_by_user_id, sent_by_name, reference_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [toEmail, toName || null, employeeId || null, subject, body || null,
       type || 'custom', status || 'sent', errorMessage || null,
       sentByUserId || null, sentByName || null, referenceId || null]
    );
  } catch (e) {
    console.error('Email log error:', e.message);
  }
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DEFAULT_PAYSLIP_CONFIG = {
  template_type: 'corporate',
  earnings: [
    { key: 'basic', label: 'Basic Salary', active: true },
    { key: 'hra', label: 'HRA', active: true },
    { key: 'da', label: 'Dearness Allowance (DA)', active: true },
    { key: 'ta', label: 'Travel Allowance (TA)', active: true },
    { key: 'medical_allowance', label: 'Medical Allowance', active: true },
    { key: 'special_allowance', label: 'Special Allowance', active: false },
    { key: 'overtime_pay', label: 'Overtime Pay', active: true },
  ],
  deductions: [
    { key: 'pf_deduction', label: 'Provident Fund (12%)', active: true },
    { key: 'esi_deduction', label: 'ESI (0.75%)', active: true },
    { key: 'professional_tax', label: 'Professional Tax', active: true },
    { key: 'income_tax', label: 'Income Tax / TDS', active: true },
  ],
  show_attendance: true,
  show_bank_details: true,
  show_pan: true,
  show_pf_number: true,
  footer_note: 'This is a system-generated salary statement. No physical signature or stamp is required.',
};

const getPayslipConfig = async () => {
  try {
    const row = await query('SELECT payslip_config FROM company_settings LIMIT 1');
    return row[0]?.payslip_config ? JSON.parse(row[0].payslip_config) : DEFAULT_PAYSLIP_CONFIG;
  } catch { return DEFAULT_PAYSLIP_CONFIG; }
};

const fmt = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// ── PDF Payslip Generator ──────────────────────────────────────────────────────
const generatePayslipPDF = (company, payslip, cfg) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const coName = company?.company_name || 'HR Management';
      const coAddress = company?.company_address || '';
      const coEmail = company?.company_email || '';
      const coPhone = company?.company_phone || '';
      const period = `${MONTHS[(payslip.month ?? 1) - 1]} ${payslip.year}`;
      const slipNo = `PS-${payslip.year}${String(payslip.month).padStart(2,'0')}-${String(payslip.employee_id || payslip.employeeId).padStart(4,'0')}`;
      const paymentStatus = payslip.payment_status === 'paid' ? '✓ PAID' : 'PENDING';
      const gw = doc.page.width - 80;
      const col1 = 40;
      const col2 = 100;
      const val1 = 200;
      const val2 = 320;
      let y = 40;

      // Helper
      const line = (yPos) => {
        doc.moveTo(40, yPos).lineTo(40 + gw, yPos).strokeColor('#ccc').lineWidth(0.5).stroke();
      };
      const textKV = (label, value, x, yPos, opts = {}) => {
        doc.fontSize(opts.size || 9).font('Helvetica-Bold').fillColor('#555').text(label, x, yPos, { width: 80 });
        doc.font('Helvetica').fillColor('#222').text(value || '—', x + 85, yPos, { width: 180 });
      };

      // ── Header ──
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text(coName, 40, y, { align: 'center' });
      y += 20;
      doc.fontSize(8).font('Helvetica').fillColor('#666').text([coAddress, coEmail, coPhone].filter(Boolean).join(' | '), 40, y, { align: 'center' });
      y += 14;
      line(y); y += 10;

      // ── Title ──
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text('SALARY SLIP', 40, y, { align: 'center' });
      y += 16;
      doc.fontSize(10).font('Helvetica').fillColor('#888').text(`${period}  |  Slip No: ${slipNo}`, 40, y, { align: 'center' });
      y += 8;
      line(y); y += 14;

      // ── Employee Details ──
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('EMPLOYEE DETAILS', 40, y);
      y += 16;
      doc.rect(40, y - 4, gw, 52).fillColor('#f8f9fa').fill();
      doc.fillColor('#222');
      textKV('Employee Code', payslip.employee_code, col1, y + 2);
      textKV('Employee Name', payslip.employee_name, val1, y + 2);
      textKV('Department', payslip.department_name, col1, y + 16);
      textKV('Designation', payslip.designation, val1, y + 16);

      if (cfg.show_pan) {
        textKV('PAN No.', payslip.pan_number, col1, y + 30);
      }
      if (cfg.show_pf_number) {
        textKV('PF No.', payslip.pf_number, val1, y + 30);
      }

      y += 56;
      line(y); y += 12;

      // ── Earnings ──
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('EARNINGS', 40, y);
      y += 16;

      const earnings = (cfg.earnings ?? DEFAULT_PAYSLIP_CONFIG.earnings)
        .filter(e => e.active && Number(payslip[e.key]) > 0);
      const customEarnings = (cfg.custom_earnings ?? [])
        .filter(c => c.active && Number(c.amount) > 0);

      // Earnings header
      doc.rect(40, y - 4, gw, 16).fillColor('#1a1a2e').fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff');
      doc.text('Description', 44, y, { width: 300 });
      doc.text('Amount', 40 + gw - 80, y, { width: 76, align: 'right' });
      y += 16;

      let gross = 0;
      [...earnings, ...customEarnings].forEach((e, i) => {
        const amt = Number(e.amount || payslip[e.key] || 0);
        gross += amt;
        if (i % 2 === 0) doc.rect(40, y - 4, gw, 18).fillColor('#f8f9fa').fill();
        doc.fillColor('#222');
        doc.fontSize(9).font('Helvetica').text(e.label, 44, y, { width: 300 });
        doc.font('Helvetica-Bold').text(fmt(amt), 40 + gw - 80, y, { width: 76, align: 'right' });
        y += 18;
      });

      // Gross total
      doc.rect(40, y - 4, gw, 20).fillColor('#e8f5e9').fill();
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#2e7d32');
      doc.text('Gross Pay', 44, y, { width: 300 });
      doc.text(fmt(payslip.gross_salary), 40 + gw - 80, y, { width: 76, align: 'right' });
      y += 20;

      line(y); y += 12;

      // ── Deductions ──
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('DEDUCTIONS', 40, y);
      y += 16;

      const deductions = (cfg.deductions ?? DEFAULT_PAYSLIP_CONFIG.deductions)
        .filter(d => d.active && Number(payslip[d.key]) > 0);
      const customDeductions = (cfg.custom_deductions ?? [])
        .filter(c => c.active && Number(c.amount) > 0);
      const allDeductions = [...deductions, ...customDeductions];

      if (allDeductions.length === 0) {
        doc.fontSize(9).font('Helvetica').fillColor('#999').text('No deductions', 44, y);
        y += 18;
      } else {
        doc.rect(40, y - 4, gw, 16).fillColor('#1a1a2e').fill();
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff');
        doc.text('Description', 44, y, { width: 300 });
        doc.text('Amount', 40 + gw - 80, y, { width: 76, align: 'right' });
        y += 16;

        allDeductions.forEach((d, i) => {
          const amt = Number(d.amount || payslip[d.key] || 0);
          if (i % 2 === 0) doc.rect(40, y - 4, gw, 18).fillColor('#f8f9fa').fill();
          doc.fillColor('#222');
          doc.fontSize(9).font('Helvetica').text(d.label, 44, y, { width: 300 });
          doc.font('Helvetica-Bold').text(fmt(amt), 40 + gw - 80, y, { width: 76, align: 'right' });
          y += 18;
        });
      }

      // Deductions total
      doc.rect(40, y - 4, gw, 20).fillColor('#fbe9e7').fill();
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#c62828');
      doc.text('Total Deductions', 44, y, { width: 300 });
      doc.text(fmt(payslip.total_deductions), 40 + gw - 80, y, { width: 76, align: 'right' });
      y += 20;

      line(y); y += 14;

      // ── Net Pay ──
      doc.rect(40, y, gw, 36).fillColor('#1a1a2e').fill();
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#fff');
      doc.text('NET PAYABLE', 44, y + 4, { width: 200 });
      doc.fontSize(16).text(fmt(payslip.net_salary), 40 + gw - 120, y + 4, { width: 116, align: 'right' });
      doc.fontSize(8).font('Helvetica').fillColor('#aaa').text(`For the period: ${period}`, 44, y + 22);
      y += 44;

      // ── Attendance ──
      if (cfg.show_attendance) {
        line(y); y += 10;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('ATTENDANCE SUMMARY', 40, y);
        y += 16;
        const items = [
          { label: 'Present', value: payslip.present_days, color: '#2e7d32' },
          { label: 'Absent', value: payslip.absent_days, color: '#c62828' },
          { label: 'Leave', value: payslip.leave_days, color: '#9333ea' },
          { label: 'OT Hrs', value: payslip.overtime_hours, color: '#4F46E5' },
        ];
        const boxW = (gw - 24) / 4;
        items.forEach((item, i) => {
          const x = 40 + i * (boxW + 8);
          doc.rect(x, y, boxW, 34).fillColor('#f8f9fa').fill();
          doc.fontSize(14).font('Helvetica-Bold').fillColor(item.color).text(String(item.value ?? 0), x, y + 3, { width: boxW, align: 'center' });
          doc.fontSize(8).font('Helvetica').fillColor('#888').text(item.label, x, y + 20, { width: boxW, align: 'center' });
        });
        y += 42;
      }

      // ── Payment Status ──
      line(y); y += 10;
      doc.fontSize(9).font('Helvetica').fillColor('#555').text('Payment Status:', 40, y);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(payslip.payment_status === 'paid' ? '#2e7d32' : '#b45309').text(paymentStatus, 130, y);
      y += 18;

      // ── Bank Details ──
      if (cfg.show_bank_details && payslip.bank_name) {
        doc.fontSize(9).font('Helvetica').fillColor('#555').text('Bank:', 40, y);
        doc.font('Helvetica-Bold').fillColor('#222').text(`${payslip.bank_name}${payslip.bank_account_number ? '  ·  A/C: ' + payslip.bank_account_number : ''}`, 80, y);
        y += 18;
      }

      // ── Footer ──
      y = Math.max(y + 10, doc.page.height - 70);
      line(y); y += 8;
      doc.fontSize(7).font('Helvetica').fillColor('#999').text(
        cfg.footer_note || DEFAULT_PAYSLIP_CONFIG.footer_note,
        40, y, { align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ── Email payslip template (clean, no gradient) ────────────────────────────────
const payslipEmailHtml = (company, payslip, cfg) => {
  const period = `${MONTHS[(payslip.month ?? 1) - 1]} ${payslip.year}`;
  const slipNo = `PS-${payslip.year}${String(payslip.month).padStart(2,'0')}-${String(payslip.employee_id || payslip.employeeId).padStart(4,'0')}`;
  const paymentStatus = payslip.payment_status === 'paid'
    ? '<span style="color:#16a34a;font-weight:700">✓ Paid</span>'
    : '<span style="color:#b45309;font-weight:700">⏳ Pending</span>';

  const coName = company?.company_name || 'HR Management';
  const coAddress = company?.company_address || '';
  const coEmail = company?.company_email || '';
  const coPhone = company?.company_phone || '';

  const earningsRows = (cfg.earnings ?? DEFAULT_PAYSLIP_CONFIG.earnings)
    .filter(e => e.active && Number(payslip[e.key]) > 0)
    .map(e => `<tr><td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px">${e.label}</td><td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;color:#16a34a">${fmt(payslip[e.key])}</td></tr>`)
    .join('');

  const deductionRows = (cfg.deductions ?? DEFAULT_PAYSLIP_CONFIG.deductions)
    .filter(d => d.active && Number(payslip[d.key]) > 0)
    .map(d => `<tr><td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px">${d.label}</td><td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;color:#dc2626">${fmt(payslip[d.key])}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#333;font-size:14px">
<div style="max-width:640px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:20px 28px;color:#fff;text-align:center">
    <div style="font-size:18px;font-weight:900;margin:0 0 4px">${coName}</div>
    <div style="font-size:11px;opacity:.75">${[coAddress, coEmail, coPhone].filter(Boolean).join('  ·  ')}</div>
    <div style="display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);padding:4px 14px;border-radius:4px;font-size:11px;font-weight:700;margin-top:10px;letter-spacing:.5px">SALARY SLIP — ${period}</div>
  </div>
  <div style="padding:24px 28px">
    <p style="font-size:13px;color:#666;margin:0 0 4px">Slip No: <strong style="color:#333">${slipNo}</strong></p>
    <p style="font-size:13px;color:#666;margin:0 0 16px">Dear <strong style="color:#333">${payslip.employee_name}</strong>, please find your salary details below.</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:6px 10px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;font-size:12px;color:#888;width:35%">Employee Code</td><td style="padding:6px 10px;border-bottom:1px solid #e0e0e0;font-size:13px;font-weight:600">${payslip.employee_code ?? ''}</td></tr>
      <tr><td style="padding:6px 10px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;font-size:12px;color:#888">Department</td><td style="padding:6px 10px;border-bottom:1px solid #e0e0e0;font-size:13px;font-weight:600">${payslip.department_name ?? ''}</td></tr>
      <tr><td style="padding:6px 10px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;font-size:12px;color:#888">Designation</td><td style="padding:6px 10px;border-bottom:1px solid #e0e0e0;font-size:13px;font-weight:600">${payslip.designation ?? ''}</td></tr>
      ${cfg.show_pan ? `<tr><td style="padding:6px 10px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;font-size:12px;color:#888">PAN No.</td><td style="padding:6px 10px;border-bottom:1px solid #e0e0e0;font-size:13px;font-weight:600">${payslip.pan_number || '—'}</td></tr>` : ''}
      ${cfg.show_pf_number ? `<tr><td style="padding:6px 10px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;font-size:12px;color:#888">PF No.</td><td style="padding:6px 10px;border-bottom:1px solid #e0e0e0;font-size:13px;font-weight:600">${payslip.pf_number || '—'}</td></tr>` : ''}
      <tr><td style="padding:6px 10px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;font-size:12px;color:#888">Pay Period</td><td style="padding:6px 10px;border-bottom:1px solid #e0e0e0;font-size:13px;font-weight:600">${period}</td></tr>
      <tr><td style="padding:6px 10px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;font-size:12px;color:#888">Payment Status</td><td style="padding:6px 10px;border-bottom:1px solid #e0e0e0;font-size:13px;font-weight:600">${paymentStatus}</td></tr>
    </table>

    ${cfg.show_attendance ? `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
      <div style="text-align:center;background:#f8f9fa;border-radius:6px;padding:8px"><div style="font-size:18px;font-weight:800;color:#16a34a">${payslip.present_days ?? 0}</div><div style="font-size:10px;color:#888">Present</div></div>
      <div style="text-align:center;background:#f8f9fa;border-radius:6px;padding:8px"><div style="font-size:18px;font-weight:800;color:#dc2626">${payslip.absent_days ?? 0}</div><div style="font-size:10px;color:#888">Absent</div></div>
      <div style="text-align:center;background:#f8f9fa;border-radius:6px;padding:8px"><div style="font-size:18px;font-weight:800;color:#9333ea">${payslip.leave_days ?? 0}</div><div style="font-size:10px;color:#888">Leave</div></div>
      <div style="text-align:center;background:#f8f9fa;border-radius:6px;padding:8px"><div style="font-size:18px;font-weight:800;color:#4F46E5">${payslip.overtime_hours ?? 0}</div><div style="font-size:10px;color:#888">OT Hrs</div></div>
    </div>` : ''}

    <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      <tr><td style="padding:8px 10px;background:#1a1a2e;color:#fff;font-size:12px;font-weight:700;text-transform:uppercase">Earnings</td><td style="padding:8px 10px;background:#1a1a2e;color:#fff;font-size:12px;font-weight:700;text-align:right">Amount</td></tr>
      ${earningsRows}
      <tr><td style="padding:8px 10px;background:#e8f5e9;font-size:13px;font-weight:700;color:#2e7d32">Gross Pay</td><td style="padding:8px 10px;background:#e8f5e9;font-size:13px;font-weight:700;color:#2e7d32;text-align:right">${fmt(payslip.gross_salary)}</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      <tr><td style="padding:8px 10px;background:#1a1a2e;color:#fff;font-size:12px;font-weight:700;text-transform:uppercase">Deductions</td><td style="padding:8px 10px;background:#1a1a2e;color:#fff;font-size:12px;font-weight:700;text-align:right">Amount</td></tr>
      ${deductionRows || '<tr><td style="padding:8px 10px;color:#999;font-size:13px" colspan="2">No deductions</td></tr>'}
      <tr><td style="padding:8px 10px;background:#fbe9e7;font-size:13px;font-weight:700;color:#c62828">Total Deductions</td><td style="padding:8px 10px;background:#fbe9e7;font-size:13px;font-weight:700;color:#c62828;text-align:right">${fmt(payslip.total_deductions)}</td></tr>
    </table>

    <div style="background:#1a1a2e;border-radius:8px;padding:16px;text-align:center;margin:16px 0 12px">
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.8px">Net Payable Salary</div>
      <div style="font-size:28px;font-weight:900;color:#fff;margin:4px 0">${fmt(payslip.net_salary)}</div>
      <div style="font-size:11px;color:#aaa">${period}</div>
    </div>

    ${(cfg.show_bank_details && payslip.bank_name) ? `<p style="text-align:center;color:#888;font-size:12px;margin:0 0 12px">Credited to: <strong style="color:#333">${payslip.bank_name}</strong>${payslip.bank_account_number ? ' · A/C: ' + payslip.bank_account_number : ''}</p>` : ''}

    <div style="background:#fff8f0;border:1px solid #ffe0b2;border-radius:6px;padding:10px 14px;font-size:11px;color:#b45309;line-height:1.6">
      ${cfg.footer_note || 'This is a system-generated salary statement. No physical signature or stamp is required.'}
    </div>
  </div>
  <div style="background:#f8f8fb;border-top:1px solid #eee;padding:14px 28px;text-align:center;font-size:11px;color:#999">
    This is a system-generated email from <strong>${coName}</strong> HR Portal.<br>
    Please do not reply to this email. For queries contact: ${coEmail || 'hr@company.com'}
  </div>
</div>
</body></html>`;
};

// ── Public API ─────────────────────────────────────────────────────────────────
exports.sendPayslipEmail = async ({ employee, payslip, company, sentByUserId, sentByName, referenceId }) => {
  const transporter = createTransporter();
  const cfg = await getPayslipConfig();
  const html = payslipEmailHtml(company, payslip, cfg);
  const period = `${MONTHS[(payslip.month ?? 1) - 1]} ${payslip.year}`;
  const subject = `Salary Slip — ${period} | ${company?.company_name || 'HR'}`;

  let status = 'sent', errorMessage = null;
  try {
    const pdfBuffer = await generatePayslipPDF(company, payslip, cfg);
    await transporter.sendMail({
      from: FROM,
      to: employee.email,
      subject,
      html,
      attachments: [{
        filename: `Salary_Slip_${period.replace(' ','_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });
  } catch (err) {
    status = 'failed';
    errorMessage = err.message;
    console.error(`Payslip email failed for ${employee.email}:`, err.message);
  }

  await logEmail({
    toEmail: employee.email,
    toName: employee.name,
    employeeId: employee.id,
    subject,
    body: html,
    type: 'payslip',
    status,
    errorMessage,
    sentByUserId,
    sentByName,
    referenceId,
  });

  return status === 'sent';
};

exports.sendCustomEmail = async ({ toEmail, toName, employeeId, cc, subject, body, type, company, sentByUserId, sentByName }) => {
  const transporter = createTransporter();
  const coName    = company?.company_name    || 'HR Management';
  const coAddress = company?.company_address || '';
  const coEmail   = company?.company_email   || '';
  const coPhone   = company?.company_phone   || '';
  const dateStr   = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#333;font-size:14px">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:3px solid #1a1a2e">
    <tr>
      <td style="padding:24px 28px 16px">
        <div style="font-size:20px;font-weight:900;color:#1a1a2e;letter-spacing:.5px">${coName}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;line-height:1.5">
          ${coAddress}<br>
          ${[coEmail, coPhone].filter(Boolean).join('  |  ')}
        </div>
      </td>
      <td style="padding:24px 28px 16px;text-align:right;vertical-align:top">
        <div style="font-size:11px;color:#888">Date: ${dateStr}</div>
      </td>
    </tr>
  </table>
  <div style="padding:28px">
    ${toName ? `<p style="font-size:13px;color:#555;margin:0 0 6px">Dear <strong style="color:#333">${toName}</strong>,</p>` : ''}
    <h2 style="font-size:16px;font-weight:700;color:#1a1a2e;margin:0 0 14px;padding-bottom:10px;border-bottom:2px solid #eee">${subject}</h2>
    ${body.split('\n').map(line => line.trim() ? `<p style="margin:0 0 10px;line-height:1.7;color:#444">${line}</p>` : '<br/>').join('')}
    <p style="margin:20px 0 0;font-size:13px;color:#555">Best regards,<br><strong style="color:#1a1a2e">${coName}</strong> HR Team</p>
  </div>
  <div style="background:#f8f8fb;border-top:1px solid #eee;padding:16px 28px;text-align:center;font-size:11px;color:#999;line-height:1.6">
    <strong style="color:#666">${coName}</strong><br>
    ${[coAddress, coEmail, coPhone].filter(Boolean).join('  |  ')}
  </div>
</div></body></html>`;

  let status = 'sent', errorMessage = null;
  try {
    const mailOptions = { from: FROM, to: toEmail, subject, html };
    if (cc) mailOptions.cc = cc;
    await transporter.sendMail(mailOptions);
  } catch (err) {
    status = 'failed';
    errorMessage = err.message;
  }

  await logEmail({
    toEmail, toName, employeeId, subject, body: html, type: type || 'custom',
    status, errorMessage, sentByUserId, sentByName,
  });

  return { status, errorMessage };
};

exports.verifyConnection = async () => {
  try {
    const t = createTransporter();
    await t.verify();
    return true;
  } catch (err) {
    console.error('SMTP connection error:', err.message);
    return false;
  }
};
