const router = require('express').Router();
const ctrl = require('../controllers/employeeController');
const { authorize } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');

router.get('/', ctrl.getAll);
router.get('/stats', ctrl.getStats);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('superadmin','admin','hr'), uploadPhoto, ctrl.create);
router.put('/:id', authorize('superadmin','admin'), uploadPhoto, ctrl.update);
router.put('/:id/terminate', authorize('superadmin','admin'), ctrl.terminate);

module.exports = router;
