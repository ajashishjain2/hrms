const { query, queryOne } = require('../config/database');
const emailService = require('../services/emailService');

const getCompany = async () => {
  try { return await queryOne('SELECT * FROM company_settings LIMIT 1'); } catch { return {}; }
};

const senderName = (user) =>
  [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

// POST /api/emails/send
exports.sendEmail = async (req, res) => {
  try {
    const { employee_id, to_email, to_name, subject, body, type, cc } = req.body;
    if (!subject || !body) return res.status(400).json({ success: false, message: 'Subject and body are required' });

    let email = to_email, name = to_name, empId = employee_id;

    if (employee_id && !to_email) {
      const emp = await queryOne(
        `SELECT e.id, e.email, CONCAT(e.first_name,' ',e.last_name) AS full_name
         FROM employees e WHERE e.id = ?`, [employee_id]
      );
      if (!emp || !emp.email) return res.status(400).json({ success: false, message: 'Employee email not found' });
      email = emp.email;
      name  = emp.full_name;
      empId = emp.id;
    }

    if (!email) return res.status(400).json({ success: false, message: 'Recipient email is required' });

    const company = await getCompany();
    const result = await emailService.sendCustomEmail({
      toEmail: email, toName: name, employeeId: empId,
      cc: cc || '',
      subject, body, type: type || 'custom',
      company, sentByUserId: req.user.id, sentByName: senderName(req.user),
    });

    res.json({ success: result.status === 'sent', message: result.status === 'sent' ? 'Email sent successfully' : `Failed: ${result.errorMessage}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/emails/send-bulk
exports.sendBulkEmail = async (req, res) => {
  try {
    const { employee_ids, send_to_all, department_id, subject, body, type, cc } = req.body;
    if (!subject || !body) return res.status(400).json({ success: false, message: 'Subject and body are required' });

    let employees = [];
    if (send_to_all) {
      employees = await query(
        `SELECT id, email AS email, CONCAT(first_name,' ',last_name) AS name
         FROM employees WHERE employment_status='active' AND email IS NOT NULL AND email != ''`
      );
    } else if (department_id) {
      employees = await query(
        `SELECT id, email AS email, CONCAT(first_name,' ',last_name) AS name
         FROM employees WHERE department_id=? AND employment_status='active' AND email IS NOT NULL AND email != ''`,
        [department_id]
      );
    } else if (employee_ids?.length) {
      employees = await query(
        `SELECT id, email AS email, CONCAT(first_name,' ',last_name) AS name
         FROM employees WHERE id IN (?) AND email IS NOT NULL AND email != ''`,
        [employee_ids]
      );
    }

    if (!employees.length) return res.status(400).json({ success: false, message: 'No recipients found with valid email addresses' });

    const company = await getCompany();
    const results = { sent: 0, failed: 0 };

    // Send in background, return immediately
    res.json({ success: true, message: `Sending emails to ${employees.length} employee(s) in background...`, total: employees.length });

    for (const emp of employees) {
      const r = await emailService.sendCustomEmail({
        toEmail: emp.email, toName: emp.name, employeeId: emp.id,
        cc: cc || '',
        subject, body, type: type || 'custom',
        company, sentByUserId: req.user.id, sentByName: senderName(req.user),
      });
      r.status === 'sent' ? results.sent++ : results.failed++;
    }
    console.log(`Bulk email complete: ${results.sent} sent, ${results.failed} failed`);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/emails/send-payslips/:runId
exports.sendPayslipEmails = async (req, res) => {
  try {
    const { runId } = req.params;
    const run = await queryOne('SELECT * FROM payroll_runs WHERE id = ?', [runId]);
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    const details = await query(
      `SELECT pd.*, pr.month, pr.year,
              e.id AS employee_id,
              CONCAT(e.first_name,' ',e.last_name) AS employee_name,
              e.employee_code, e.email,
              e.pan_number, e.pf_number, e.bank_account_number, e.bank_name, e.bank_ifsc,
              d.name AS department_name, des.title AS designation
       FROM payroll_details pd
       JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
       JOIN employees e ON pd.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       WHERE pd.payroll_run_id = ? AND e.email IS NOT NULL AND e.email != ''`,
      [runId]
    );

    if (!details.length) return res.status(400).json({ success: false, message: 'No employees with email found in this payroll run' });

    const company = await getCompany();
    res.json({ success: true, message: `Sending payslip emails to ${details.length} employee(s)...`, total: details.length });

    let sent = 0, failed = 0;
    for (const pd of details) {
      const ok = await emailService.sendPayslipEmail({
        employee: { id: pd.employee_id, email: pd.email, name: pd.employee_name },
        payslip: pd,
        company,
        sentByUserId: req.user.id,
        sentByName: senderName(req.user),
        referenceId: runId,
      });
      ok ? sent++ : failed++;
    }
    console.log(`Payslip emails: ${sent} sent, ${failed} failed for run ${runId}`);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/emails/logs
exports.getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30, type, status, search, employee_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];
    if (type)        { where += ' AND type = ?';              params.push(type); }
    if (status)      { where += ' AND status = ?';            params.push(status); }
    if (employee_id) { where += ' AND employee_id = ?';       params.push(employee_id); }
    if (search)      { where += ' AND (to_name LIKE ? OR to_email LIKE ? OR subject LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const [logs, countRow] = await Promise.all([
      query(`SELECT id, to_email, to_name, employee_id, subject, type, status, error_message,
                    sent_by_name, reference_id, sent_at
             FROM email_logs ${where} ORDER BY sent_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]),
      queryOne(`SELECT COUNT(*) AS total FROM email_logs ${where}`, params),
    ]);

    res.json({ success: true, data: { logs, total: countRow.total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/emails/logs/:id  (full body)
exports.getLogDetail = async (req, res) => {
  try {
    const log = await queryOne('SELECT * FROM email_logs WHERE id = ?', [req.params.id]);
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/emails/verify  (test SMTP connection)
exports.verifySmtp = async (req, res) => {
  const ok = await emailService.verifyConnection();
  res.json({ success: ok, message: ok ? 'SMTP connection successful' : 'SMTP connection failed — check .env settings' });
};
