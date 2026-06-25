const router = require('express').Router();
const ctrl   = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/',              ctrl.getAll);
router.put('/read-all',      ctrl.markAllRead);
router.put('/:id/read',      ctrl.markRead);

module.exports = router;
