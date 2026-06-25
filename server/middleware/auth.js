/**
 * middleware/auth.js
 * Vérification JWT — protège toutes les routes privées
 */
const jwt  = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe encore
    const [rows] = await pool.query(
      'SELECT id, firstname, lastname, username, email, avatar, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable ou désactivé' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expiré' });
    }
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
};

// Vérifier que l'utilisateur est admin du système
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
  }
  next();
};

// Vérifier que l'utilisateur est membre (ou plus) du projet
const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.project_id || req.params.id;
    const [rows] = await pool.query(
      `SELECT pm.role FROM project_members pm WHERE pm.project_id = ? AND pm.user_id = ?
       UNION
       SELECT 'owner' AS role FROM projects p WHERE p.id = ? AND p.owner_id = ?`,
      [projectId, req.user.id, projectId, req.user.id]
    );
    if (!rows.length && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès au projet refusé' });
    }
    req.projectRole = rows[0]?.role || null;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, requireAdmin, requireProjectMember };
