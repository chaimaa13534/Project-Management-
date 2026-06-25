/**
 * controllers/projectController.js
 * CRUD projets + gestion des membres
 */
const pool      = require('../config/database');
const activity  = require('../services/activityService');
const notify    = require('../services/notificationService');

// GET /api/projects
exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*,
              u.firstname, u.lastname, u.avatar AS owner_avatar,
              COUNT(DISTINCT pm.user_id) AS member_count,
              COUNT(DISTINCT t.id)       AS task_count,
              SUM(t.status = 'done')     AS done_count
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN project_members pm ON pm.project_id = p.id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.owner_id = ? OR pm.user_id = ?
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [req.user.id, req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/projects
exports.create = async (req, res, next) => {
  try {
    const { title, description, color, due_date } = req.body;
    const [result] = await pool.query(
      `INSERT INTO projects (title, description, owner_id, color, due_date) VALUES (?, ?, ?, ?, ?)`,
      [title, description || null, req.user.id, color || '#6C63FF', due_date || null]
    );
    const projectId = result.insertId;

    // Owner = membre admin automatiquement
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, req.user.id, 'admin']
    );

    await activity.log({
      userId: req.user.id, projectId,
      action: 'created', entityType: 'project',
      entityId: projectId, entityTitle: title
    });

    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    res.status(201).json({ success: true, message: 'Projet créé', data: rows[0] });
  } catch (err) { next(err); }
};

// GET /api/projects/:id
exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.firstname, u.lastname, u.avatar AS owner_avatar,
              COUNT(DISTINCT t.id)   AS task_count,
              SUM(t.status = 'done') AS done_count
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Projet introuvable' });

    // Membres
    const [members] = await pool.query(
      `SELECT pm.role, pm.joined_at, u.id, u.firstname, u.lastname, u.username, u.avatar, u.email
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], members } });
  } catch (err) { next(err); }
};

// PUT /api/projects/:id
exports.update = async (req, res, next) => {
  try {
    const { title, description, status, color, due_date } = req.body;
    const id = req.params.id;

    await pool.query(
      `UPDATE projects SET
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         status = COALESCE(?, status),
         color  = COALESCE(?, color),
         due_date = COALESCE(?, due_date)
       WHERE id = ?`,
      [title, description, status, color, due_date, id]
    );

    await activity.log({
      userId: req.user.id, projectId: id,
      action: 'updated', entityType: 'project',
      entityId: id, entityTitle: title
    });

    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    res.json({ success: true, message: 'Projet mis à jour', data: rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/projects/:id
exports.delete = async (req, res, next) => {
  try {
    const [project] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!project.length) return res.status(404).json({ success: false, message: 'Projet introuvable' });
    if (project[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Seul le propriétaire peut supprimer ce projet' });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Projet supprimé' });
  } catch (err) { next(err); }
};

// POST /api/projects/:id/members
exports.addMember = async (req, res, next) => {
  try {
    const { user_id, role = 'member' } = req.body;
    const projectId = req.params.id;

    const [exists] = await pool.query(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, user_id]
    );
    if (exists.length) return res.status(409).json({ success: false, message: 'Déjà membre du projet' });

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, user_id, role]
    );

    const [project] = await pool.query('SELECT title FROM projects WHERE id = ?', [projectId]);
    await notify.create({
      userId: user_id, type: 'member_added',
      message: `Vous avez été ajouté au projet « ${project[0].title} »`,
      entityId: projectId, entityType: 'project'
    });

    await activity.log({
      userId: req.user.id, projectId,
      action: 'added_member', entityType: 'project_member',
      entityId: user_id
    });

    res.status(201).json({ success: true, message: 'Membre ajouté' });
  } catch (err) { next(err); }
};

// DELETE /api/projects/:id/members/:userId
exports.removeMember = async (req, res, next) => {
  try {
    const { id: projectId, userId } = req.params;
    await pool.query(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );
    res.json({ success: true, message: 'Membre retiré' });
  } catch (err) { next(err); }
};
