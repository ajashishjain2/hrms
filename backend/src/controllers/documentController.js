const { query, queryOne } = require('../config/database');
const fs = require('fs');
const path = require('path');

exports.getByEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const docs = await query(
      `SELECT ed.*, CONCAT(v.first_name,' ',v.last_name) AS verified_by_name
       FROM employee_documents ed
       LEFT JOIN employees v ON ed.verified_by = v.id
       WHERE ed.employee_id = ?
       ORDER BY ed.uploaded_at DESC`,
      [id]
    );
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.upload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { employee_id, document_type, document_name } = req.body;
    const filePath = `documents/${req.file.filename}`;

    const result = await query(
      'INSERT INTO employee_documents (employee_id, document_type, document_name, file_path, file_size, mime_type) VALUES (?,?,?,?,?,?)',
      [employee_id, document_type, document_name || req.file.originalname, filePath, req.file.size, req.file.mimetype]
    );

    const doc = await queryOne('SELECT * FROM employee_documents WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Document uploaded', data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verify = async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      'UPDATE employee_documents SET is_verified = 1, verified_by = ?, verified_at = NOW() WHERE id = ?',
      [req.user.employee_id || null, id]
    );
    res.json({ success: true, message: 'Document verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await queryOne('SELECT * FROM employee_documents WHERE id = ?', [id]);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Delete physical file
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', doc.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await query('DELETE FROM employee_documents WHERE id = ?', [id]);
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
