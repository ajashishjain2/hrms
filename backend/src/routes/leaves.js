const router = require('express').Router();
const ctrl = require('../controllers/leaveController');
const { authorize } = require('../middleware/auth');

router.get('/types', ctrl.getTypes);
router.get('/balance/:employeeId', ctrl.getBalance);
router.get('/', ctrl.getAll);
router.post('/apply', ctrl.apply);
router.put('/:id/approve', authorize('superadmin','admin','hr'), ctrl.updateStatus);
router.put('/:id/reject', authorize('superadmin','admin','hr'), ctrl.updateStatus);
router.put('/:id/cancel', ctrl.cancel);

module.exports = router;
