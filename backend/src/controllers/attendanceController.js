const { query, queryOne } = require('../config/database');
const { getIO } = require('../socket');

exports.getToday = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await query(
      `SELECT a.*, CONCAT(e.first_name,' ',e.last_name) AS employee_name, e.employee_code, e.photo,
              d.name AS department_name
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE a.attendance_date = ?
       ORDER BY a.check_in_time DESC`,
      [today]
    );

    const [stats] = await query(
      `SELECT
         COUNT(CASE WHEN status='present' THEN 1 END) AS present,
         COUNT(CASE WHEN status='absent' THEN 1 END) AS absent,
         COUNT(CASE WHEN status='late' THEN 1 END) AS late,
         COUNT(CASE WHEN status='on_leave' THEN 1 END) AS on_leave,
         (SELECT COUNT(*) FROM employees WHERE employment_status='active') AS total_employees
       FROM attendance WHERE attendance_date = ?`,
      [today]
    );

    res.json({ success: true, data: { records, stats: stats[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { from, to, employee_id, department_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (from) { where += ' AND a.attendance_date >= ?'; params.push(from); }
    if (to) { where += ' AND a.attendance_date <= ?'; params.push(to); }
    if (employee_id) { where += ' AND a.employee_id = ?'; params.push(employee_id); }
    if (department_id) { where += ' AND e.department_id = ?'; params.push(department_id); }
    if (status) { where += ' AND a.status = ?'; params.push(status); }

    const sql = `
      SELECT a.*, CONCAT(e.first_name,' ',e.last_name) AS employee_name,
             e.employee_code, d.name AS department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${where}
      ORDER BY a.attendance_date DESC, a.check_in_time DESC
      LIMIT ? OFFSET ?`;

    const countSql = `SELECT COUNT(*) AS total FROM attendance a JOIN employees e ON a.employee_id = e.id ${where}`;

    params.push(parseInt(limit), offset);
    const [records, [countRow]] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, -2))
    ]);

    res.json({
      success: true,
      data: records,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countRow.total }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const employeeId = req.user.employee_id || req.body.employee_id;
    if (!employeeId) return res.status(400).json({ success: false, message: 'Employee ID required' });

    const today = new Date().toISOString().split('T')[0];
    const existing = await queryOne('SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?', [employeeId, today]);
    if (existing?.check_in_time) {
      return res.status(400).json({ success: false, message: 'Already checked in today' });
    }

    const now = new Date();
    const selfiePath = req.file ? `selfies/${req.file.filename}` : null;
    const { lat, lng, address, is_wfh = 0 } = req.body;

    // Check if late (assuming shift start is 09:00)
    const employee = await queryOne(
      'SELECT e.*, s.start_time FROM employees e LEFT JOIN shifts s ON e.shift_id = s.id WHERE e.id = ?',
      [employeeId]
    );
    const shiftStart = employee?.start_time || '09:00:00';
    const [sh, sm] = shiftStart.split(':');
    const shiftDate = new Date(today);
    shiftDate.setHours(parseInt(sh), parseInt(sm) + 15, 0); // 15 min grace
    const isLate = now > shiftDate;

    if (existing) {
      await query(
        `UPDATE attendance SET check_in_time=?, check_in_lat=?, check_in_lng=?, check_in_address=?,
         check_in_selfie=?, is_wfh=?, status=? WHERE id=?`,
        [now, lat || null, lng || null, address || null, selfiePath, is_wfh, isLate ? 'late' : 'present', existing.id]
      );
    } else {
      await query(
        `INSERT INTO attendance (employee_id, attendance_date, check_in_time, check_in_lat, check_in_lng,
         check_in_address, check_in_selfie, is_wfh, status)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [employeeId, today, now, lat || null, lng || null, address || null, selfiePath, is_wfh, isLate ? 'late' : 'present']
      );
    }

    const record = await queryOne('SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?', [employeeId, today]);

    // Broadcast via socket
    const io = getIO();
    if (io) io.emit('attendance:checkin', { employeeId, record });

    res.json({ success: true, message: 'Check-in recorded', data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const employeeId = req.user.employee_id || req.body.employee_id;
    const today = new Date().toISOString().split('T')[0];
    const record = await queryOne('SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?', [employeeId, today]);

    if (!record?.check_in_time) {
      return res.status(400).json({ success: false, message: 'No check-in found for today' });
    }
    if (record.check_out_time) {
      return res.status(400).json({ success: false, message: 'Already checked out today' });
    }

    const now = new Date();
    const checkIn = new Date(record.check_in_time);
    const workHours = parseFloat(((now - checkIn) / 3600000).toFixed(2));
    const overtimeHours = Math.max(0, workHours - 8);
    const selfiePath = req.file ? `selfies/${req.file.filename}` : null;
    const { lat, lng, address } = req.body;

    await query(
      `UPDATE attendance SET check_out_time=?, check_out_lat=?, check_out_lng=?, check_out_address=?,
       check_out_selfie=?, work_hours=?, overtime_hours=? WHERE id=?`,
      [now, lat || null, lng || null, address || null, selfiePath, workHours, overtimeHours, record.id]
    );

    const updated = await queryOne('SELECT * FROM attendance WHERE id = ?', [record.id]);
    const io = getIO();
    if (io) io.emit('attendance:checkout', { employeeId, record: updated });

    res.json({ success: true, message: 'Check-out recorded', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEmployeeHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const records = await query(
      `SELECT * FROM attendance WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
       ORDER BY attendance_date DESC`,
      [id, m, y]
    );

    const [stats] = await query(
      `SELECT
         COUNT(CASE WHEN status='present' THEN 1 END) AS present,
         COUNT(CASE WHEN status='absent' THEN 1 END) AS absent,
         COUNT(CASE WHEN status='late' THEN 1 END) AS late,
         COUNT(CASE WHEN status='half_day' THEN 1 END) AS half_day,
         COUNT(CASE WHEN status='on_leave' THEN 1 END) AS on_leave,
         COALESCE(SUM(work_hours),0) AS total_work_hours,
         COALESCE(SUM(overtime_hours),0) AS total_overtime
       FROM attendance WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?`,
      [id, m, y]
    );

    res.json({ success: true, data: { records, stats: stats[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.manualEntry = async (req, res) => {
  try {
    const { employee_id, attendance_date, check_in_time, check_out_time, status, remarks } = req.body;
    let workHours = 0;
    if (check_in_time && check_out_time) {
      workHours = parseFloat(((new Date(check_out_time) - new Date(check_in_time)) / 3600000).toFixed(2));
    }

    await query(
      `INSERT INTO attendance (employee_id, attendance_date, check_in_time, check_out_time, work_hours, status, remarks)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE check_in_time=?, check_out_time=?, work_hours=?, status=?, remarks=?`,
      [employee_id, attendance_date, check_in_time, check_out_time, workHours, status, remarks,
       check_in_time, check_out_time, workHours, status, remarks]
    );

    res.json({ success: true, message: 'Attendance updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
