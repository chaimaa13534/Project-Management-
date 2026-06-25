const router = require('express').Router();
const ctrl   = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

router.use(authenticate);

// ⚠️ Routes fixes AVANT les routes paramétrées /:id
router.get('/',    ctrl.getAllUsers);

router.post('/avatar/upload', (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, ctrl.uploadAvatar);

router.get('/:id',  ctrl.getUserById);
router.put('/:id',  ctrl.updateUser);

module.exports = router;