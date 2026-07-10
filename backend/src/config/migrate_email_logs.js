// Run once: node src/config/migrate_email_logs.js
require('dotenv').config();
const { query } = require('./database');

(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        to_email        VARCHAR(255) NOT NULL,
        to_name         VARCHAR(255),
        employee_id     INT,
        subject         VARCHAR(500) NOT NULL,
        body            LONGTEXT,
        type            ENUM('payslip','custom','announcement','leave','other') DEFAULT 'custom',
        status          ENUM('sent','failed') DEFAULT 'sent',
        error_message   TEXT,
        sent_by_user_id INT,
        sent_by_name    VARCHAR(255),
        reference_id    INT COMMENT 'payroll_run_id for payslip emails',
        sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_employee (employee_id),
        INDEX idx_type     (type),
        INDEX idx_status   (status),
        INDEX idx_sent_at  (sent_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ email_logs table created (or already exists)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();
