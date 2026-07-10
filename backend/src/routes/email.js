const router = require('express').Router();
const ctrl = require('../controllers/emailController');
const { authorize } = require('../middleware/auth');

router.get('/verify',           authorize('superadmin','admin'), ctrl.verifySmtp);
router.get('/logs',             authorize('superadmin','admin'), ctrl.getLogs);
router.get('/logs/:id',         authorize('superadmin','admin'), ctrl.getLogDetail);
router.post('/send',            authorize('superadmin','admin','hr'), ctrl.sendEmail);
router.post('/send-bulk',       authorize('superadmin','admin','hr'), ctrl.sendBulkEmail);
router.post('/send-payslips/:runId', authorize('superadmin','admin','hr'), ctrl.sendPayslipEmails);

module.exports = router;
