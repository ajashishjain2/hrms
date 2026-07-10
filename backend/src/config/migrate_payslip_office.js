require('dotenv').config();
const { query } = require('./database');

const DEFAULT_CONFIG = JSON.stringify({
  earnings: [
    { key: 'basic',             label: 'Basic Salary',     active: true  },
    { key: 'hra',               label: 'HRA',              active: true  },
    { key: 'da',                label: 'Dearness Allowance (DA)', active: true },
    { key: 'ta',                label: 'Travel Allowance (TA)',   active: true },
    { key: 'medical_allowance', label: 'Medical Allowance', active: true  },
    { key: 'special_allowance', label: 'Special Allowance', active: false },
    { key: 'overtime_pay',      label: 'Overtime Pay',     active: true  },
  ],
  deductions: [
    { key: 'pf_deduction',     label: 'Provident Fund (12%)',  active: true },
    { key: 'esi_deduction',    label: 'ESI (0.75%)',           active: true },
    { key: 'professional_tax', label: 'Professional Tax',      active: true },
    { key: 'income_tax',       label: 'Income Tax / TDS',      active: true },
  ],
  show_attendance:   true,
  show_bank_details: true,
  show_pan:          true,
  show_pf_number:    true,
  footer_note: 'This is a system-generated salary statement. No physical signature or stamp is required.',
});

(async () => {
  try {
    const cols = await query(`SHOW COLUMNS FROM company_settings`);
    const existing = cols.map(c => c.Field);
    if (!existing.includes('payslip_config'))
      await query(`ALTER TABLE company_settings ADD COLUMN payslip_config LONGTEXT`);
    if (!existing.includes('office_lat'))
      await query(`ALTER TABLE company_settings ADD COLUMN office_lat DECIMAL(10,8)`);
    if (!existing.includes('office_lng'))
      await query(`ALTER TABLE company_settings ADD COLUMN office_lng DECIMAL(11,8)`);
    if (!existing.includes('office_radius'))
      await query(`ALTER TABLE company_settings ADD COLUMN office_radius INT DEFAULT 300`);
    await query(`UPDATE company_settings SET payslip_config = ? WHERE payslip_config IS NULL`, [DEFAULT_CONFIG]);
    console.log('✅ payslip_config + office location columns added');
    process.exit(0);
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
})();
