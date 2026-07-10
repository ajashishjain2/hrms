const router = require('express').Router();
const ctrl = require('../controllers/payrollController');
const { authorize } = require('../middleware/auth');

router.get('/', authorize('superadmin','admin','hr'), ctrl.getRuns);
router.post('/run', authorize('superadmin','admin','hr'), ctrl.runPayroll);
router.get('/payslip/:employeeId/:month/:year', ctrl.getPayslip);
router.get('/salary/:employeeId', ctrl.getSalaryStructure);
router.post('/salary/:employeeId', authorize('superadmin','admin','hr'), ctrl.saveSalaryStructure);
router.get('/:id', authorize('superadmin','admin','hr'), ctrl.getRunDetails);
router.put('/:id/pay', authorize('superadmin','admin'), ctrl.markPaid);

module.exports = router;
