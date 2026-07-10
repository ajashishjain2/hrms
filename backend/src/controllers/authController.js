const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/database');

const generateTokens = (user) => {
  const payload = { userId: user.id, role: user.role, employeeId: user.employee_id };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
  const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET || 'refresh_secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
  return { accessToken, refreshToken };
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await queryOne('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await query('UPDATE users SET last_login = NOW(), refresh_token = ? WHERE id = ?', [refreshToken, user.id]);

    let employeeData = null;
    if (user.employee_id) {
      employeeData = await queryOne(
        `SELECT e.*, d.name AS department_name, des.title AS designation
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations des ON e.designation_id = des.id
         WHERE e.id = ?`,
        [user.employee_id]
      );
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id, email: user.email, role: user.role,
          employee_id: user.employee_id, employee: employeeData
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
    const user = await queryOne('SELECT * FROM users WHERE id = ? AND refresh_token = ? AND is_active = 1', [decoded.userId, refreshToken]);

    if (!user) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const tokens = generateTokens(user);
    await query('UPDATE users SET refresh_token = ? WHERE id = ?', [tokens.refreshToken, user.id]);

    res.json({ success: true, data: tokens });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT u.id, u.email, u.role, u.employee_id, u.last_login,
              e.first_name, e.last_name, e.photo, e.phone,
              d.name AS department_name, des.title AS designation
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, current_password, new_password } = req.body;
    const oldPw = currentPassword || current_password;
    const freshPw = newPassword || new_password;
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

    const isMatch = await bcrypt.compare(oldPw, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password incorrect' });

    const hashed = await bcrypt.hash(freshPw, 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
