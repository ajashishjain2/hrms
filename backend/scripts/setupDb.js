require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🔄 Setting up HR Management Database...\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'vishal',
    password: process.env.DB_PASSWORD || 1234,
    multipleStatements: true
  });

  try {
    const dbPath = path.join(__dirname, '../../database');
    const files = ['schema.sql', 'stored_procedures.sql', 'seed_data.sql'];

    for (const file of files) {
      const filePath = path.join(dbPath, file);
      if (fs.existsSync(filePath)) {
        console.log(`📄 Running ${file}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await conn.query(sql);
        console.log(`✅ ${file} completed\n`);
      }
    }

    console.log('🎉 Database setup complete!');
    console.log('\n📋 Default Login Credentials:');
    console.log('   SuperAdmin: superadmin@azadhr.com / Admin@123');
    console.log('   HR:         rajesh.kumar@azadhr.com / Welcome@123');
    console.log('   Employee:   priya.sharma@azadhr.com / Welcome@123\n');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

setupDatabase();
