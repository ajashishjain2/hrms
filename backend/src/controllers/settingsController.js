const { query, queryOne } = require('../config/database');

const DEFAULT_PAYSLIP_CONFIG = {
  earnings: [
    { key: 'basic',             label: 'Basic Salary',           active: true  },
    { key: 'hra',               label: 'HRA',                    active: true  },
    { key: 'da',                label: 'Dearness Allowance (DA)', active: true },
    { key: 'ta',                label: 'Travel Allowance (TA)',   active: true },
    { key: 'medical_allowance', label: 'Medical Allowance',      active: true  },
    { key: 'special_allowance', label: 'Special Allowance',      active: false },
    { key: 'overtime_pay',      label: 'Overtime Pay',           active: true  },
  ],
  deductions: [
    { key: 'pf_deduction',     label: 'Provident Fund (12%)', active: true },
    { key: 'esi_deduction',    label: 'ESI (0.75%)',          active: true },
    { key: 'professional_tax', label: 'Professional Tax',     active: true },
    { key: 'income_tax',       label: 'Income Tax / TDS',     active: true },
  ],
  show_attendance:   true,
  show_bank_details: true,
  show_pan:          true,
  show_pf_number:    true,
  footer_note: 'This is a system-generated salary statement. No physical signature or stamp is required.',
};

exports.getCompanySettings = async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM company_settings LIMIT 1');
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPayslipConfig = async (req, res) => {
  try {
    const row = await queryOne('SELECT payslip_config FROM company_settings LIMIT 1');
    const config = row?.payslip_config ? JSON.parse(row.payslip_config) : DEFAULT_PAYSLIP_CONFIG;
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePayslipConfig = async (req, res) => {
  try {
    const config = JSON.stringify(req.body);
    const row = await queryOne('SELECT id FROM company_settings LIMIT 1');
    if (row) {
      await query('UPDATE company_settings SET payslip_config = ? WHERE id = ?', [config, row.id]);
    } else {
      await query('INSERT INTO company_settings (payslip_config) VALUES (?)', [config]);
    }
    res.json({ success: true, message: 'Payslip template saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCompanySettings = async (req, res) => {
  try {
    const { company_name, company_email, company_phone, company_address, timezone, currency, working_hours, work_days,
            office_lat, office_lng, office_radius } = req.body;
    const logo = req.file ? `photos/${req.file.filename}` : undefined;

    const settings = await queryOne('SELECT id FROM company_settings LIMIT 1');
    const fields = { company_name, company_email, company_phone, company_address, timezone, currency, working_hours, work_days };
    if (office_lat)    fields.office_lat    = office_lat;
    if (office_lng)    fields.office_lng    = office_lng;
    if (office_radius) fields.office_radius = office_radius;
    if (logo) fields.company_logo = logo;

    if (settings) {
      const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
      await query(`UPDATE company_settings SET ${sets} WHERE id = ?`, [...Object.values(fields), settings.id]);
    } else {
      const cols = Object.keys(fields).join(', ');
      const vals = Object.keys(fields).map(() => '?').join(', ');
      await query(`INSERT INTO company_settings (${cols}) VALUES (${vals})`, Object.values(fields));
    }

    const updated = await queryOne('SELECT * FROM company_settings LIMIT 1');
    res.json({ success: true, message: 'Settings updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DEPARTMENTS
exports.getDepartments = async (req, res) => {
  try {
    const depts = await query(
      `SELECT d.*, CONCAT(e.first_name,' ',e.last_name) AS manager_name,
              (SELECT COUNT(*) FROM employees WHERE department_id = d.id AND employment_status='active') AS employee_count
       FROM departments d LEFT JOIN employees e ON d.manager_id = e.id
       WHERE d.is_active = 1 ORDER BY d.name`
    );
    res.json({ success: true, data: depts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, description, manager_id } = req.body;
    const result = await query('INSERT INTO departments (name, description, manager_id) VALUES (?,?,?)', [name, description, manager_id]);
    const dept = await queryOne('SELECT * FROM departments WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Department created', data: dept });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, manager_id } = req.body;
    await query('UPDATE departments SET name=?, description=?, manager_id=? WHERE id=?', [name, description, manager_id, id]);
    res.json({ success: true, message: 'Department updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    await query('UPDATE departments SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DESIGNATIONS
exports.getDesignations = async (req, res) => {
  try {
    const { department_id } = req.query;
    const params = [];
    let where = 'WHERE des.is_active = 1';
    if (department_id) { where += ' AND des.department_id = ?'; params.push(department_id); }

    const desig = await query(
      `SELECT des.*, d.name AS department_name FROM designations des
       LEFT JOIN departments d ON des.department_id = d.id ${where} ORDER BY des.title`,
      params
    );
    res.json({ success: true, data: desig });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDesignation = async (req, res) => {
  try {
    const { title, department_id, level } = req.body;
    const result = await query('INSERT INTO designations (title, department_id, level) VALUES (?,?,?)', [title, department_id, level]);
    res.status(201).json({ success: true, message: 'Designation created', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// SHIFTS
exports.getShifts = async (req, res) => {
  try {
    const shifts = await query('SELECT * FROM shifts WHERE is_active = 1 ORDER BY start_time');
    res.json({ success: true, data: shifts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createShift = async (req, res) => {
  try {
    const { name, start_time, end_time, break_duration } = req.body;
    const result = await query('INSERT INTO shifts (name, start_time, end_time, break_duration) VALUES (?,?,?,?)', [name, start_time, end_time, break_duration]);
    res.status(201).json({ success: true, message: 'Shift created', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, break_duration } = req.body;
    await query('UPDATE shifts SET name=?, start_time=?, end_time=?, break_duration=? WHERE id=?', [name, start_time, end_time, break_duration, id]);
    res.json({ success: true, message: 'Shift updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// LEAVE TYPES
exports.getLeaveTypes = async (req, res) => {
  try {
    const types = await query('SELECT * FROM leave_types ORDER BY name');
    res.json({ success: true, data: types });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createLeaveType = async (req, res) => {
  try {
    const { name, code, description, max_days_per_year, is_paid, carry_forward, requires_document } = req.body;
    const result = await query(
      'INSERT INTO leave_types (name, code, description, max_days_per_year, is_paid, carry_forward, requires_document) VALUES (?,?,?,?,?,?,?)',
      [name, code, description, max_days_per_year || 0, is_paid ?? 1, carry_forward ?? 0, requires_document ?? 0]
    );
    const lt = await queryOne('SELECT * FROM leave_types WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Leave type created', data: lt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const { name, code, description, max_days_per_year, is_paid, carry_forward, is_active } = req.body;
    await query(
      'UPDATE leave_types SET name=?, code=?, description=?, max_days_per_year=?, is_paid=?, carry_forward=?, is_active=? WHERE id=?',
      [name, code, description, max_days_per_year, is_paid, carry_forward, is_active ?? 1, req.params.id]
    );
    res.json({ success: true, message: 'Leave type updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    await query('UPDATE leave_types SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Leave type deactivated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// HOLIDAYS
exports.getHolidays = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const holidays = await query('SELECT * FROM holidays WHERE year = ? ORDER BY date', [year]);
    res.json({ success: true, data: holidays });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { name, date, type } = req.body;
    const year = new Date(date).getFullYear();
    await query('INSERT INTO holidays (name, date, type, year) VALUES (?,?,?,?)', [name, date, type, year]);
    res.status(201).json({ success: true, message: 'Holiday added' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    await query('DELETE FROM holidays WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
