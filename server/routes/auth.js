const router = require('express').Router();
const { body } = require('express-validator');
const ctrl   = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error('Validation');
    err.type   = 'validation';
    err.errors = errors.array();
    return next(err);
  }
  next();
};

router.post('/register',
  [
    body('firstname').trim().notEmpty().withMessage('Prénom requis'),
    body('lastname').trim().notEmpty().withMessage('Nom requis'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username min 3 caractères'),
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe min 6 caractères')
  ],
  validate,
  ctrl.register
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis')
  ],
  validate,
  ctrl.login
);

router.get('/profile', authenticate, ctrl.getProfile);

module.exports = router;
