/**
 * controllers/commentController.js
 * CRUD commentaires par tâche
 */
const pool     = require('../config/database');
const activity = require('../services/activityService');
const notify   = require('../services/notificationService');

// GET /api/comments/:taskId
exports.getByTask = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.firstname, u.lastname, u.avatar, u.username
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.taskId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/comments
exports.create = async (req, res, next) => {
  try {
    const { task_id, content } = req.body;

    const [result] = await pool.query(
      'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)',
      [task_id, req.user.id, content]
    );

    const [rows] = await pool.query(
      `SELECT c.*, u.firstname, u.lastname, u.avatar, u.username
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [result.insertId]
    );

    // Notifier le créateur de la tâche
    const [task] = await pool.query(
      'SELECT created_by, title, project_id FROM tasks WHERE id = ?',
      [task_id]
    );
    if (task.length && task[0].created_by !== req.user.id) {
      await notify.create({
        userId: task[0].created_by, type: 'comment_added',
        message: `${req.user.firstname} a commenté la tâche « ${task[0].title} »`,
        entityId: task_id, entityType: 'task'
      });
    }

    await activity.log({
      userId: req.user.id, projectId: task[0]?.project_id,
      action: 'commented', entityType: 'task',
      entityId: task_id, entityTitle: task[0]?.title
    });

    try {
      const { getIo } = require('../config/socket');
      getIo().to(`project:${task[0].project_id}`).emit('comment:new', rows[0]);
    } catch (_) {}

    res.status(201).json({ success: true, message: 'Commentaire ajouté', data: rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/comments/:id
exports.update = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Commentaire introuvable' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    await pool.query('UPDATE comments SET content = ? WHERE id = ?', [req.body.content, req.params.id]);
    const [updated] = await pool.query(
      `SELECT c.*, u.firstname, u.lastname, u.avatar, u.username
       FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Commentaire modifié', data: updated[0] });
  } catch (err) { next(err); }
};

// DELETE /api/comments/:id
exports.delete = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Commentaire introuvable' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Commentaire supprimé' });
  } catch (err) { next(err); }
};
