const { query, queryOne } = require('../config/database');

exports.getJobs = async (req, res) => {
  try {
    const { status, department_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (status) { where += ' AND jp.status = ?'; params.push(status); }
    if (department_id) { where += ' AND jp.department_id = ?'; params.push(department_id); }

    const sql = `
      SELECT jp.*, d.name AS department_name, des.title AS designation_title,
             (SELECT COUNT(*) FROM applicants WHERE job_posting_id = jp.id) AS total_applicants,
             (SELECT COUNT(*) FROM applicants WHERE job_posting_id = jp.id AND status='applied') AS new_applicants
      FROM job_postings jp
      LEFT JOIN departments d ON jp.department_id = d.id
      LEFT JOIN designations des ON jp.designation_id = des.id
      ${where}
      ORDER BY jp.created_at DESC LIMIT ? OFFSET ?`;

    params.push(parseInt(limit), offset);
    const jobs = await query(sql, params);
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createJob = async (req, res) => {
  try {
    const { title, department_id, designation_id, description, requirements, location, employment_type,
            salary_min, salary_max, openings, status, closing_date } = req.body;

    const result = await query(
      `INSERT INTO job_postings (title, department_id, designation_id, description, requirements, location,
       employment_type, salary_min, salary_max, openings, status, posted_by, posted_at, closing_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title, department_id, designation_id, description, requirements, location, employment_type,
       salary_min, salary_max, openings, status || 'draft', req.user.employee_id, status === 'active' ? new Date() : null, closing_date]
    );

    const job = await queryOne('SELECT * FROM job_postings WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Job posting created', data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, department_id, designation_id, description, requirements, location, employment_type,
            salary_min, salary_max, openings, status, closing_date } = req.body;

    await query(
      `UPDATE job_postings SET title=?, department_id=?, designation_id=?, description=?, requirements=?,
       location=?, employment_type=?, salary_min=?, salary_max=?, openings=?, status=?, closing_date=? WHERE id=?`,
      [title, department_id, designation_id, description, requirements, location, employment_type,
       salary_min, salary_max, openings, status, closing_date, id]
    );

    res.json({ success: true, message: 'Job updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    await query('DELETE FROM job_postings WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApplicants = async (req, res) => {
  try {
    const { job_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (job_id) { where += ' AND a.job_posting_id = ?'; params.push(job_id); }
    if (status) { where += ' AND a.status = ?'; params.push(status); }

    const sql = `
      SELECT a.*, jp.title AS job_title, d.name AS department_name
      FROM applicants a
      JOIN job_postings jp ON a.job_posting_id = jp.id
      LEFT JOIN departments d ON jp.department_id = d.id
      ${where}
      ORDER BY a.applied_at DESC LIMIT ? OFFSET ?`;

    params.push(parseInt(limit), offset);
    const applicants = await query(sql, params);
    res.json({ success: true, data: applicants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addApplicant = async (req, res) => {
  try {
    const { job_posting_id, first_name, last_name, email, phone, experience_years, current_salary, expected_salary, cover_letter } = req.body;
    const resumePath = req.file ? `documents/${req.file.filename}` : null;

    const result = await query(
      `INSERT INTO applicants (job_posting_id, first_name, last_name, email, phone, experience_years,
       current_salary, expected_salary, resume_path, cover_letter) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [job_posting_id, first_name, last_name, email, phone, experience_years, current_salary, expected_salary, resumePath, cover_letter]
    );

    const applicant = await queryOne('SELECT * FROM applicants WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Applicant added', data: applicant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateApplicantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const validStatuses = ['applied','screening','interview','technical','hr_round','offer','hired','rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    await query('UPDATE applicants SET status=?, notes=? WHERE id=?', [status, notes, id]);
    res.json({ success: true, message: 'Applicant status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Public — no auth
exports.getPublicJobs = async (req, res) => {
  try {
    const jobs = await query(
      `SELECT jp.id, jp.title, jp.description, jp.job_type, jp.experience_required,
              jp.salary_min, jp.salary_max, jp.last_date, jp.created_at,
              d.name AS department_name, des.title AS designation_title
       FROM job_postings jp
       LEFT JOIN departments d ON jp.department_id = d.id
       LEFT JOIN designations des ON jp.designation_id = des.id
       WHERE jp.status = 'active'
       ORDER BY jp.created_at DESC`
    );
    const company = await queryOne('SELECT company_name, company_address, company_email FROM company_settings LIMIT 1');
    res.json({ success: true, data: { jobs, company } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
