const { query, queryOne, callProcedure } = require('../config/database');
const emailService = require('../services/emailService');

const getCompany = async () => {
  try { return await queryOne('SELECT * FROM company_settings LIMIT 1'); } catch { return {}; }
};
const senderName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;

exports.getRuns = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const runs = await query(
      'SELECT * FROM payroll_runs WHERE year = ? ORDER BY month DESC', [year]
    );
    res.json({ success: true, data: runs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.runPayroll = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.body;

    const existing = await queryOne('SELECT * FROM payroll_runs WHERE month=? AND year=? AND status="paid"', [month, year]);
    if (existing) return res.status(400).json({ success: false, message: 'Payroll already paid for this month' });

    const result = await callProcedure('sp_run_payroll', [month, year, req.user.employee_id || null]);
    const run = result[0]?.[0];

    res.json({ success: true, message: 'Payroll processed successfully', data: run });

    // Send payslip emails in background
    if (run?.id) {
      (async () => {
        try {
          const details = await query(
            `SELECT pd.*, pr.month, pr.year,
                    e.id AS employee_id, CONCAT(e.first_name,' ',e.last_name) AS employee_name,
                    e.employee_code, e.email,
                    e.pan_number, e.pf_number, e.bank_account_number, e.bank_name,
                    d.name AS department_name, des.title AS designation
             FROM payroll_details pd
             JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
             JOIN employees e ON pd.employee_id = e.id
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN designations des ON e.designation_id = des.id
             WHERE pd.payroll_run_id = ? AND e.email IS NOT NULL AND e.email != ''`,
            [run.id]
          );
          const company = await getCompany();
          let sent = 0;
          for (const pd of details) {
            const ok = await emailService.sendPayslipEmail({
              employee: { id: pd.employee_id, email: pd.email, name: pd.employee_name },
              payslip: pd, company,
              sentByUserId: req.user.id, sentByName: senderName(req.user),
              referenceId: run.id,
            });
            if (ok) sent++;
          }
          console.log(`Auto payslip emails: ${sent}/${details.length} sent for run ${run.id}`);
        } catch (e) {
          console.error('Auto payslip email error:', e.message);
        }
      })();
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRunDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const run = await queryOne('SELECT * FROM payroll_runs WHERE id = ?', [id]);
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    const details = await query(
      `SELECT pd.*, CONCAT(e.first_name,' ',e.last_name) AS employee_name,
              e.employee_code, e.bank_account_number, e.bank_name, e.bank_ifsc,
              d.name AS department_name
       FROM payroll_details pd
       JOIN employees e ON pd.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE pd.payroll_run_id = ?
       ORDER BY e.employee_code`,
      [id]
    );

    res.json({ success: true, data: { run, details } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPayslip = async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;

    // Employees can only view their own payslip
    if (req.user.role === 'employee' && req.user.employee_id != employeeId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const payslip = await queryOne(
      `SELECT pd.*, pr.month, pr.year,
              CONCAT(e.first_name,' ',e.last_name) AS employee_name, e.employee_code,
              e.pan_number, e.pf_number, e.esi_number,
              e.bank_account_number, e.bank_name, e.bank_ifsc,
              d.name AS department_name, des.title AS designation, s.name AS shift_name
       FROM payroll_details pd
       JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
       JOIN employees e ON pd.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN shifts s ON e.shift_id = s.id
       WHERE pd.employee_id = ? AND pr.month = ? AND pr.year = ?`,
      [employeeId, month, year]
    );

    if (!payslip) return res.status(404).json({ success: false, message: 'Payslip not found' });

    res.json({ success: true, data: payslip });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markPaid = async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE payroll_runs SET status="paid", paid_at=NOW() WHERE id=?', [id]);
    await query('UPDATE payroll_details SET payment_status="paid", payment_date=CURDATE() WHERE payroll_run_id=?', [id]);
    res.json({ success: true, message: 'Payroll marked as paid' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const structure = await queryOne(
      'SELECT * FROM salary_structure WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 1', [employeeId]
    );
    res.json({ success: true, data: structure });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { basic, hra, da, ta, medical_allowance, special_allowance, pf_employee, pf_employer,
            esi_employee, esi_employer, professional_tax, income_tax, effective_from } = req.body;

    const gross = parseFloat(basic||0)+parseFloat(hra||0)+parseFloat(da||0)+parseFloat(ta||0)+parseFloat(medical_allowance||0)+parseFloat(special_allowance||0);
    const totalDed = parseFloat(pf_employee||0)+parseFloat(esi_employee||0)+parseFloat(professional_tax||0)+parseFloat(income_tax||0);
    const net = gross - totalDed;

    await query(
      `INSERT INTO salary_structure (employee_id, effective_from, basic, hra, da, ta, medical_allowance, special_allowance,
       pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, income_tax, gross_salary, net_salary)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [employeeId, effective_from, basic, hra, da, ta, medical_allowance, special_allowance,
       pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, income_tax, gross, net]
    );

    await query('UPDATE employees SET basic_salary = ? WHERE id = ?', [basic, employeeId]);
    res.json({ success: true, message: 'Salary structure saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
