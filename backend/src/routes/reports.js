const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { authorize } = require('../middleware/auth');

router.get('/dashboard', ctrl.dashboardStats);
router.get('/attendance', ctrl.attendanceReport);
router.get('/leave', ctrl.leaveReport);
router.get('/payroll', authorize('superadmin','admin','hr'), ctrl.payrollReport);
router.get('/employee', ctrl.employeeReport);
router.get('/overtime', ctrl.overtimeReport);
router.get('/performance', ctrl.performanceReport);

module.exports = router;
