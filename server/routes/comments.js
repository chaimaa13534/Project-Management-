// routes/comments.js
const router = require('express').Router();
const ctrl   = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/:taskId', ctrl.getByTask);
router.post('/',       ctrl.create);
router.put('/:id',     ctrl.update);
router.delete('/:id',  ctrl.delete);

module.exports = router;
