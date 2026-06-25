/**
 * controllers/taskController.js
 * CRUD tâches + déplacement Kanban
 */
const pool     = require('../config/database');
const activity = require('../services/activityService');
const notify   = require('../services/notificationService');

const TASK_FIELDS = `
  t.*,
  u_assigned.firstname AS assigned_firstname, u_assigned.lastname AS assigned_lastname,
  u_assigned.avatar AS assigned_avatar,
  u_creator.firstname AS creator_firstname, u_creator.lastname AS creator_lastname
`;

// GET /api/tasks?project_id=&status=&priority=&assigned_to=
exports.getAll = async (req, res, next) => {
  try {
    const { project_id, status, priority, assigned_to, search } = req.query;
    let sql = `SELECT ${TASK_FIELDS}
               FROM tasks t
               LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
               LEFT JOIN users u_creator  ON u_creator.id  = t.created_by
               WHERE 1=1`;
    const params = [];

    if (project_id)  { sql += ' AND t.project_id = ?';   params.push(project_id); }
    if (status)      { sql += ' AND t.status = ?';        params.push(status); }
    if (priority)    { sql += ' AND t.priority = ?';      params.push(priority); }
    if (assigned_to) { sql += ' AND t.assigned_to = ?';   params.push(assigned_to); }
    if (search)      { sql += ' AND t.title LIKE ?';      params.push(`%${search}%`); }

    sql += ' ORDER BY t.position ASC, t.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/tasks
exports.create = async (req, res, next) => {
  try {
    const { project_id, title, description, priority, status, assigned_to, due_date } = req.body;

    // Position = max actuel + 1
    const [[{ maxPos }]] = await pool.query(
      'SELECT COALESCE(MAX(position), 0) AS maxPos FROM tasks WHERE project_id = ? AND status = ?',
      [project_id, status || 'backlog']
    );

    const [result] = await pool.query(
      `INSERT INTO tasks (project_id, title, description, priority, status, assigned_to, created_by, due_date, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [project_id, title, description || null, priority || 'medium',
       status || 'backlog', assigned_to || null, req.user.id, due_date || null, maxPos + 1]
    );

    const taskId = result.insertId;

    // Notification si assignée
    if (assigned_to && assigned_to !== req.user.id) {
      await notify.create({
        userId: assigned_to, type: 'task_assigned',
        message: `${req.user.firstname} vous a assigné la tâche « ${title} »`,
        entityId: taskId, entityType: 'task'
      });
    }

    await activity.log({
      userId: req.user.id, projectId: project_id,
      action: 'created', entityType: 'task',
      entityId: taskId, entityTitle: title
    });

    // Emit socket à tout le projet
    try {
      const { getIo } = require('../config/socket');
      const [task] = await pool.query(
        `SELECT ${TASK_FIELDS} FROM tasks t
         LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
         LEFT JOIN users u_creator  ON u_creator.id  = t.created_by
         WHERE t.id = ?`, [taskId]
      );
      getIo().to(`project:${project_id}`).emit('task:created', task[0]);
    } catch (_) {}

    const [rows] = await pool.query(
      `SELECT ${TASK_FIELDS} FROM tasks t
       LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
       LEFT JOIN users u_creator  ON u_creator.id  = t.created_by
       WHERE t.id = ?`, [taskId]
    );
    res.status(201).json({ success: true, message: 'Tâche créée', data: rows[0] });
  } catch (err) { next(err); }
};

// GET /api/tasks/:id
exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${TASK_FIELDS} FROM tasks t
       LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
       LEFT JOIN users u_creator  ON u_creator.id  = t.created_by
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Tâche introuvable' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/tasks/:id
exports.update = async (req, res, next) => {
  try {
    const { title, description, priority, status, assigned_to, due_date, position } = req.body;
    const taskId = req.params.id;

    const [before] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!before.length) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    await pool.query(
      `UPDATE tasks SET
         title       = COALESCE(?, title),
         description = COALESCE(?, description),
         priority    = COALESCE(?, priority),
         status      = COALESCE(?, status),
         assigned_to = COALESCE(?, assigned_to),
         due_date    = COALESCE(?, due_date),
         position    = COALESCE(?, position)
       WHERE id = ?`,
      [title, description, priority, status, assigned_to, due_date, position, taskId]
    );

    const oldStatus = before[0].status;
    const newStatus = status || oldStatus;

    if (oldStatus !== newStatus) {
      await activity.log({
        userId: req.user.id, projectId: before[0].project_id,
        action: 'moved', entityType: 'task',
        entityId: taskId, entityTitle: before[0].title,
        meta: { from: oldStatus, to: newStatus }
      });
    }

    // Notification si nouvelle assignation
    if (assigned_to && assigned_to !== before[0].assigned_to && assigned_to !== req.user.id) {
      await notify.create({
        userId: assigned_to, type: 'task_assigned',
        message: `${req.user.firstname} vous a assigné la tâche « ${before[0].title} »`,
        entityId: taskId, entityType: 'task'
      });
    }

    const [rows] = await pool.query(
      `SELECT ${TASK_FIELDS} FROM tasks t
       LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
       LEFT JOIN users u_creator  ON u_creator.id  = t.created_by
       WHERE t.id = ?`, [taskId]
    );

    try {
      const { getIo } = require('../config/socket');
      getIo().to(`project:${before[0].project_id}`).emit('task:updated', rows[0]);
    } catch (_) {}

    res.json({ success: true, message: 'Tâche mise à jour', data: rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/tasks/:id
exports.delete = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);

    try {
      const { getIo } = require('../config/socket');
      getIo().to(`project:${rows[0].project_id}`).emit('task:deleted', { id: parseInt(req.params.id) });
    } catch (_) {}

    res.json({ success: true, message: 'Tâche supprimée' });
  } catch (err) { next(err); }
};
