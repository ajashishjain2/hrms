const router = require('express').Router();
const ctrl = require('../controllers/attendanceController');
const { authorize } = require('../middleware/auth');
const { uploadSelfie } = require('../middleware/upload');

router.get('/today', ctrl.getToday);
router.get('/', ctrl.getAll);
router.post('/check-in', uploadSelfie, ctrl.checkIn);
router.put('/check-out', uploadSelfie, ctrl.checkOut);
router.get('/employee/:id', ctrl.getEmployeeHistory);
router.post('/manual', authorize('superadmin','admin','hr'), ctrl.manualEntry);

module.exports = router;
