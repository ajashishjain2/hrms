const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const { authorize } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');

router.get('/company', ctrl.getCompanySettings);
router.put('/company', authorize('superadmin','admin'), uploadPhoto, ctrl.updateCompanySettings);
router.get('/payslip-config', ctrl.getPayslipConfig);
router.put('/payslip-config', authorize('superadmin','admin','hr'), ctrl.updatePayslipConfig);

router.get('/departments', ctrl.getDepartments);
router.post('/departments', authorize('superadmin','admin'), ctrl.createDepartment);
router.put('/departments/:id', authorize('superadmin','admin'), ctrl.updateDepartment);
router.delete('/departments/:id', authorize('superadmin','admin'), ctrl.deleteDepartment);

router.get('/designations', ctrl.getDesignations);
router.post('/designations', authorize('superadmin','admin'), ctrl.createDesignation);

router.get('/shifts', ctrl.getShifts);
router.post('/shifts', authorize('superadmin','admin'), ctrl.createShift);
router.put('/shifts/:id', authorize('superadmin','admin'), ctrl.updateShift);

router.get('/leave-types', ctrl.getLeaveTypes);
router.post('/leave-types', authorize('superadmin','admin','hr'), ctrl.createLeaveType);
router.put('/leave-types/:id', authorize('superadmin','admin','hr'), ctrl.updateLeaveType);
router.delete('/leave-types/:id', authorize('superadmin','admin'), ctrl.deleteLeaveType);

router.get('/holidays', ctrl.getHolidays);
router.post('/holidays', authorize('superadmin','admin','hr'), ctrl.createHoliday);
router.delete('/holidays/:id', authorize('superadmin','admin'), ctrl.deleteHoliday);

module.exports = router;
