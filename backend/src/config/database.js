const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hr_management',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+05:30',
  ssl: false,
  authPlugins: undefined,
});

pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

const query = async (sql, params) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

const queryOne = async (sql, params) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const callProcedure = async (name, params = []) => {
  const placeholders = params.map(() => '?').join(',');
  const sql = `CALL ${name}(${placeholders})`;
  const [results] = await pool.query(sql, params);
  return results;
};

module.exports = { pool, query, queryOne, callProcedure };
