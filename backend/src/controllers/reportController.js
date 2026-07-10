const { query, callProcedure } = require('../config/database');

exports.attendanceReport = async (req, res) => {
  try {
    const { from, to, department_id } = req.query;
    const fromDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];

    const result = await callProcedure('sp_get_attendance_report', [fromDate, toDate, department_id || null]);
    res.json({ success: true, data: result[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.leaveReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear(), department_id } = req.query;
    const result = await callProcedure('sp_get_leave_report', [year, department_id || null]);
    res.json({ success: true, data: result[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.payrollReport = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    const data = await query(
      `SELECT pd.*, CONCAT(e.first_name,' ',e.last_name) AS employee_name,
              e.employee_code, d.name AS department_name, pr.month, pr.year
       FROM payroll_details pd
       JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
       JOIN employees e ON pd.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE pr.month = ? AND pr.year = ?
       ORDER BY e.employee_code`,
      [month, year]
    );

    const [summary] = await query(
      `SELECT SUM(pd.gross_salary) AS total_gross, SUM(pd.total_deductions) AS total_deductions,
              SUM(pd.net_salary) AS total_net, COUNT(*) AS total_employees
       FROM payroll_details pd
       JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
       WHERE pr.month = ? AND pr.year = ?`,
      [month, year]
    );

    res.json({ success: true, data: { details: data, summary: summary[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.employeeReport = async (req, res) => {
  try {
    const { department_id, employment_type, status = 'active' } = req.query;
    const params = [status];
    let where = 'WHERE e.employment_status = ?';

    if (department_id) { where += ' AND e.department_id = ?'; params.push(department_id); }
    if (employment_type) { where += ' AND e.employment_type = ?'; params.push(employment_type); }

    const data = await query(
      `SELECT e.*, d.name AS department_name, des.title AS designation_title,
              s.name AS shift_name,
              CONCAT(m.first_name,' ',m.last_name) AS manager_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN shifts s ON e.shift_id = s.id
       LEFT JOIN employees m ON e.reporting_manager_id = m.id
       ${where}
       ORDER BY e.department_id, e.employee_code`,
      params
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.overtimeReport = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), department_id } = req.query;
    const params = [month, year];
    let where = '';
    if (department_id) { where = 'AND e.department_id = ?'; params.push(department_id); }

    const data = await query(
      `SELECT CONCAT(e.first_name,' ',e.last_name) AS employee_name, e.employee_code,
              d.name AS department_name,
              COUNT(*) AS overtime_days,
              SUM(a.overtime_hours) AS total_overtime_hours,
              SUM(a.overtime_hours) * (e.basic_salary/26/8) * 1.5 AS estimated_overtime_pay
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?
         AND a.overtime_hours > 0 ${where}
       GROUP BY e.id, employee_name, e.employee_code, department_name, e.basic_salary
       ORDER BY total_overtime_hours DESC`,
      params
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.performanceReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear(), department_id } = req.query;
    const params = [year];
    let where = '';
    if (department_id) { where = 'AND e.department_id = ?'; params.push(department_id); }

    const data = await query(
      `SELECT e.employee_code, CONCAT(e.first_name,' ',e.last_name) AS employee_name,
              d.name AS department_name, pr.overall_rating, pr.goals_rating,
              pr.skills_rating, pr.behavior_rating, pr.comments, pr.status,
              CONCAT(r.first_name,' ',r.last_name) AS reviewer_name
       FROM performance_reviews pr
       JOIN employees e ON pr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN employees r ON pr.reviewer_id = r.id
       WHERE YEAR(pr.review_period_end) = ? ${where}
       ORDER BY pr.overall_rating DESC`,
      params
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.dashboardStats = async (req, res) => {
  try {
    const result = await callProcedure('sp_get_dashboard_stats', []);
    res.json({ success: true, data: result[0]?.[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
