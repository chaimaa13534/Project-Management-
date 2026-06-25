/**
 * controllers/userController.js
 * Gestion des utilisateurs
 */
const bcrypt = require('bcryptjs');
const path   = require('path');
const fs     = require('fs');
const pool   = require('../config/database');

const PUBLIC_FIELDS = 'id, firstname, lastname, username, email, avatar, role, is_active, created_at';

// GET /api/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const search    = req.query.search ? `%${req.query.search}%` : null;
    const excludeSelf = req.query.exclude_self === 'true'; // pour la recherche membres

    let sql    = `SELECT ${PUBLIC_FIELDS} FROM users WHERE is_active = 1`;
    const params = [];

    if (search) {
      sql += ' AND (firstname LIKE ? OR lastname LIKE ? OR username LIKE ? OR email LIKE ?)';
      params.push(search, search, search, search);
    }

    if (excludeSelf) {
      sql += ' AND id != ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY firstname ASC LIMIT 50';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);
    if (req.user.id !== targetId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const { firstname, lastname, username, password } = req.body;
    const updates = [];
    const params  = [];

    if (firstname) { updates.push('firstname = ?'); params.push(firstname); }
    if (lastname)  { updates.push('lastname = ?');  params.push(lastname); }
    if (username)  { updates.push('username = ?');  params.push(username); }
    if (password)  {
      const hashed = await bcrypt.hash(password, 12);
      updates.push('password = ?');
      params.push(hashed);
    }

    if (!updates.length) return res.status(400).json({ success: false, message: 'Aucun champ à mettre à jour' });

    params.push(targetId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [targetId]);
    res.json({ success: true, message: 'Profil mis à jour', data: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/users/avatar
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });

    // Supprimer l'ancien avatar
    const [old] = await pool.query('SELECT avatar FROM users WHERE id = ?', [req.user.id]);
    if (old[0]?.avatar) {
      const oldPath = path.join(__dirname, '../uploads/avatars', path.basename(old[0].avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, req.user.id]);

    res.json({ success: true, message: 'Avatar mis à jour', data: { avatar: avatarUrl } });
  } catch (err) { next(err); }
};