/**
 * controllers/authController.js
 * Inscription / Connexion / Profil
 */
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/database');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { firstname, lastname, username, email, password } = req.body;

    // Vérifier doublons
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email ou username déjà utilisé' });
    }

    const hashed = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users (firstname, lastname, username, email, password)
       VALUES (?, ?, ?, ?, ?)`,
      [firstname, lastname, username, email, hashed]
    );

    const userId = result.insertId;
    const [rows]  = await pool.query(
      'SELECT id, firstname, lastname, username, email, avatar, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    const token = generateToken(rows[0]);
    res.status(201).json({ success: true, message: 'Compte créé avec succès', data: { token, user: rows[0] } });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    delete user.password;
    const token = generateToken(user);
    res.json({ success: true, message: 'Connexion réussie', data: { token, user } });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/profile
exports.getProfile = async (req, res) => {
  res.json({ success: true, data: req.user });
};
