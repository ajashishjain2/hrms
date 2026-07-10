const { query, queryOne, callProcedure } = require('../config/database');
const { getIO } = require('../socket');

exports.getTypes = async (req, res) => {
  try {
    const types = await query('SELECT * FROM leave_types WHERE is_active = 1 ORDER BY name');
    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBalance = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user.employee_id;
    const year = req.query.year || new Date().getFullYear();

    const balance = await query(
      `SELECT elb.*, lt.name AS leave_type_name, lt.code, lt.is_paid, lt.max_days_per_year
       FROM employee_leave_balance elb
       JOIN leave_types lt ON elb.leave_type_id = lt.id
       WHERE elb.employee_id = ? AND elb.year = ?`,
      [employeeId, year]
    );

    res.json({ success: true, data: balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.apply = async (req, res) => {
  try {
    const { leave_type_id, from_date, to_date, reason } = req.body;
    const employeeId = req.user.employee_id;

    if (!employeeId) return res.status(400).json({ success: false, message: 'Employee profile not linked' });

    // Calculate total days (excluding weekends)
    const from = new Date(from_date);
    const to = new Date(to_date);
    let totalDays = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) totalDays++;
    }

    if (totalDays === 0) return res.status(400).json({ success: false, message: 'No working days in selected range' });

    // Check balance
    const year = from.getFullYear();
    const balance = await queryOne(
      'SELECT * FROM employee_leave_balance WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
      [employeeId, leave_type_id, year]
    );

    if (balance && balance.remaining_days < totalDays) {
      return res.status(400).json({ success: false, message: `Insufficient leave balance. Available: ${balance.remaining_days} days` });
    }

    const result = await query(
      'INSERT INTO leave_applications (employee_id, leave_type_id, from_date, to_date, total_days, reason) VALUES (?,?,?,?,?,?)',
      [employeeId, leave_type_id, from_date, to_date, totalDays, reason]
    );

    // Update pending balance
    if (balance) {
      await query(
        'UPDATE employee_leave_balance SET pending_days = pending_days + ?, remaining_days = remaining_days - ? WHERE id = ?',
        [totalDays, totalDays, balance.id]
      );
    }

    const application = await queryOne('SELECT * FROM leave_applications WHERE id = ?', [result.insertId]);

    const io = getIO();
    if (io) io.emit('leave:applied', { employeeId, application });

    res.status(201).json({ success: true, message: 'Leave applied successfully', data: application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { status, employee_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    // Employees can only see their own leaves
    if (req.user.role === 'employee') {
      where += ' AND la.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (employee_id) {
      where += ' AND la.employee_id = ?';
      params.push(employee_id);
    }

    if (status) { where += ' AND la.status = ?'; params.push(status); }

    const sql = `
      SELECT la.*, lt.name AS leave_type_name, lt.code AS leave_code,
             CONCAT(e.first_name,' ',e.last_name) AS employee_name, e.employee_code, e.photo,
             d.name AS department_name,
             CONCAT(r.first_name,' ',r.last_name) AS reviewed_by_name
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees r ON la.reviewed_by = r.id
      ${where}
      ORDER BY la.applied_at DESC
      LIMIT ? OFFSET ?`;

    params.push(parseInt(limit), offset);
    const leaves = await query(sql, params);

    res.json({ success: true, data: leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_remarks } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const application = await queryOne('SELECT * FROM leave_applications WHERE id = ?', [id]);
    if (!application) return res.status(404).json({ success: false, message: 'Leave application not found' });
    if (application.status !== 'pending') return res.status(400).json({ success: false, message: 'Leave already processed' });

    await query(
      'UPDATE leave_applications SET status=?, reviewed_by=?, reviewed_at=NOW(), review_remarks=? WHERE id=?',
      [status, req.user.employee_id || null, review_remarks, id]
    );

    // Update leave balance
    const year = new Date(application.from_date).getFullYear();
    const balance = await queryOne(
      'SELECT * FROM employee_leave_balance WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
      [application.employee_id, application.leave_type_id, year]
    );

    if (balance) {
      if (status === 'approved') {
        await query(
          'UPDATE employee_leave_balance SET used_days = used_days + ?, pending_days = pending_days - ? WHERE id = ?',
          [application.total_days, application.total_days, balance.id]
        );
        // Mark attendance as on_leave
        const from = new Date(application.from_date);
        const to = new Date(application.to_date);
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          if (d.getDay() !== 0 && d.getDay() !== 6) {
            const dateStr = d.toISOString().split('T')[0];
            await query(
              'INSERT INTO attendance (employee_id, attendance_date, status) VALUES (?,?,?) ON DUPLICATE KEY UPDATE status=?',
              [application.employee_id, dateStr, 'on_leave', 'on_leave']
            );
          }
        }
      } else {
        await query(
          'UPDATE employee_leave_balance SET pending_days = pending_days - ?, remaining_days = remaining_days + ? WHERE id = ?',
          [application.total_days, application.total_days, balance.id]
        );
      }
    }

    const io = getIO();
    if (io) io.emit('leave:updated', { id, status, employeeId: application.employee_id });

    res.json({ success: true, message: `Leave ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await queryOne('SELECT * FROM leave_applications WHERE id = ?', [id]);
    if (!application) return res.status(404).json({ success: false, message: 'Not found' });
    if (application.employee_id !== req.user.employee_id && req.user.role === 'employee') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await query('UPDATE leave_applications SET status = "cancelled" WHERE id = ?', [id]);

    if (application.status === 'pending') {
      const year = new Date(application.from_date).getFullYear();
      await query(
        'UPDATE employee_leave_balance SET pending_days = pending_days - ?, remaining_days = remaining_days + ? WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
        [application.total_days, application.total_days, application.employee_id, application.leave_type_id, year]
      );
    }

    res.json({ success: true, message: 'Leave cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
