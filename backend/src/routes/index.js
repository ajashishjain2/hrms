const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.use('/auth', require('./auth'));
// Public — no auth needed
router.get('/careers', require('../controllers/recruitmentController').getPublicJobs);
router.use('/employees', authenticate, require('./employees'));
router.use('/attendance', authenticate, require('./attendance'));
router.use('/leaves', authenticate, require('./leaves'));
router.use('/payroll', authenticate, require('./payroll'));
router.use('/recruitment', authenticate, require('./recruitment'));
router.use('/reports', authenticate, require('./reports'));
router.use('/settings', authenticate, require('./settings'));
router.use('/documents', authenticate, require('./documents'));
router.use('/emails',   authenticate, require('./email'));

module.exports = router;
