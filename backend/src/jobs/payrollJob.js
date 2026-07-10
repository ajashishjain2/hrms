const cron = require('node-cron');
const { callProcedure } = require('../config/database');

// Auto-run payroll on 28th of each month at midnight
const startPayrollJob = () => {
  cron.schedule('0 0 28 * *', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    console.log(`[PayrollJob] Auto-running payroll for ${month}/${year}`);

    try {
      await callProcedure('sp_run_payroll', [month, year, null]);
      console.log(`[PayrollJob] Payroll completed for ${month}/${year}`);
    } catch (err) {
      console.error('[PayrollJob] Error:', err.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('📅 Payroll auto-run job scheduled (28th of each month)');
};

module.exports = { startPayrollJob };
