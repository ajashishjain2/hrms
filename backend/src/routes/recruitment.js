const router = require('express').Router();
const ctrl = require('../controllers/recruitmentController');
const { authorize } = require('../middleware/auth');
const { uploadResume } = require('../middleware/upload');

router.get('/jobs', ctrl.getJobs);
router.post('/jobs', authorize('superadmin','admin','hr'), ctrl.createJob);
router.put('/jobs/:id', authorize('superadmin','admin','hr'), ctrl.updateJob);
router.delete('/jobs/:id', authorize('superadmin','admin'), ctrl.deleteJob);
router.get('/applicants', ctrl.getApplicants);
router.post('/applicants', authorize('superadmin','admin','hr'), uploadResume, ctrl.addApplicant);
router.put('/applicants/:id/status', authorize('superadmin','admin','hr'), ctrl.updateApplicantStatus);

module.exports = router;
