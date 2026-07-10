const bcrypt = require('bcryptjs');
const { query, queryOne, callProcedure } = require('../config/database');
const path = require('path');
const fs = require('fs');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', department = '', status = 'active' } = req.query;
    const offset = (page - 1) * limit;
    const params = [];

    let where = 'WHERE 1=1';
    if (status) { where += ' AND e.employment_status = ?'; params.push(status); }
    if (department) { where += ' AND e.department_id = ?'; params.push(department); }
    if (search) {
      where += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const sql = `
      SELECT e.*, d.name AS department_name, des.title AS designation_title,
             s.name AS shift_name,
             CONCAT(m.first_name,' ',m.last_name) AS manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN employees m ON e.reporting_manager_id = m.id
      ${where}
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?`;

    const countSql = `SELECT COUNT(*) AS total FROM employees e ${where}`;

    params.push(parseInt(limit), offset);
    const [employees, [countRow]] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, -2))
    ]);

    res.json({
      success: true,
      data: employees,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRow.total, pages: Math.ceil(countRow.total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const employee = await queryOne(
      `SELECT e.*, d.name AS department_name, des.title AS designation_title,
              s.name AS shift_name, s.start_time, s.end_time,
              CONCAT(m.first_name,' ',m.last_name) AS manager_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN shifts s ON e.shift_id = s.id
       LEFT JOIN employees m ON e.reporting_manager_id = m.id
       WHERE e.id = ?`,
      [req.params.id]
    );
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, date_of_birth, gender, blood_group, marital_status,
      address, city, state, pincode, department_id, designation_id, shift_id,
      employment_type, date_of_joining, reporting_manager_id, basic_salary,
      emergency_contact_name, emergency_contact_phone, pan_number, aadhaar_number,
      bank_account_number, bank_name, bank_ifsc, pf_number, esi_number
    } = req.body;

    // Generate employee code
    const [codeResult] = await callProcedure('sp_generate_employee_code', []);
    const employee_code = codeResult[0]?.employee_code || `EMP${Date.now()}`;

    const photoPath = req.file ? `photos/${req.file.filename}` : null;

    const result = await query(
      `INSERT INTO employees (employee_code, first_name, last_name, email, phone, date_of_birth, gender, blood_group, marital_status,
       address, city, state, pincode, department_id, designation_id, shift_id, employment_type, date_of_joining,
       reporting_manager_id, basic_salary, photo, emergency_contact_name, emergency_contact_phone,
       pan_number, aadhaar_number, bank_account_number, bank_name, bank_ifsc, pf_number, esi_number, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [employee_code, first_name, last_name, email, phone, date_of_birth, gender, blood_group, marital_status,
       address, city, state, pincode, department_id, designation_id, shift_id, employment_type, date_of_joining,
       reporting_manager_id, basic_salary, photoPath, emergency_contact_name, emergency_contact_phone,
       pan_number, aadhaar_number, bank_account_number, bank_name, bank_ifsc, pf_number, esi_number, req.user.id]
    );

    const empId = result.insertId;

    // Create user account
    const tempPassword = await bcrypt.hash('Welcome@123', 10);
    await query('INSERT INTO users (email, password, role, employee_id) VALUES (?,?,?,?)', [email, tempPassword, 'employee', empId]);

    // Init leave balance
    await callProcedure('sp_init_leave_balance', [empId, new Date().getFullYear()]);

    const newEmployee = await queryOne('SELECT * FROM employees WHERE id = ?', [empId]);
    res.status(201).json({ success: true, message: 'Employee created successfully', data: newEmployee });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = { ...req.body };
    delete fields.employee_code;

    if (req.file) fields.photo = `photos/${req.file.filename}`;

    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(fields), id];

    await query(`UPDATE employees SET ${sets} WHERE id = ?`, values);
    const updated = await queryOne('SELECT * FROM employees WHERE id = ?', [id]);
    res.json({ success: true, message: 'Employee updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.terminate = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_of_leaving, reason } = req.body;
    await query('UPDATE employees SET employment_status = "terminated", date_of_leaving = ? WHERE id = ?', [date_of_leaving || new Date(), id]);
    await query('UPDATE users SET is_active = 0 WHERE employee_id = ?', [id]);
    res.json({ success: true, message: 'Employee terminated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [total] = await query("SELECT COUNT(*) AS cnt FROM employees WHERE employment_status='active'");
    const [byDept] = await query(`SELECT d.name, COUNT(e.id) AS count FROM employees e LEFT JOIN departments d ON e.department_id=d.id WHERE e.employment_status='active' GROUP BY d.id, d.name ORDER BY count DESC`);
    const [byGender] = await query("SELECT gender, COUNT(*) AS count FROM employees WHERE employment_status='active' GROUP BY gender");
    const [byType] = await query("SELECT employment_type, COUNT(*) AS count FROM employees WHERE employment_status='active' GROUP BY employment_type");
    res.json({ success: true, data: { total: total[0]?.cnt, byDepartment: byDept, byGender, byType } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
