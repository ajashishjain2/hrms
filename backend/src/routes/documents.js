const router = require('express').Router();
const ctrl = require('../controllers/documentController');
const { authorize } = require('../middleware/auth');
const { uploadDocument } = require('../middleware/upload');

router.get('/employee/:id', ctrl.getByEmployee);
router.post('/upload', authorize('superadmin','admin','hr'), uploadDocument, ctrl.upload);
router.put('/:id/verify', authorize('superadmin','admin','hr'), ctrl.verify);
router.delete('/:id', authorize('superadmin','admin','hr'), ctrl.delete);

module.exports = router;
