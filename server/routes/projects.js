const router = require('express').Router();
const ctrl   = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/',                          ctrl.getAll);
router.post('/',                         ctrl.create);
router.get('/:id',                       ctrl.getById);
router.put('/:id',                       ctrl.update);
router.delete('/:id',                    ctrl.delete);
router.post('/:id/members',              ctrl.addMember);
router.delete('/:id/members/:userId',    ctrl.removeMember);

module.exports = router;
