/**
 * controllers/dashboardController.js
 * Statistiques globales pour le dashboard
 */
const pool     = require('../config/database');
const activity = require('../services/activityService');

// GET /api/dashboard/stats
exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Nombre de projets accessibles
    const [[{ project_count }]] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS project_count
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id
       WHERE p.owner_id = ? OR pm.user_id = ?`,
      [userId, userId]
    );

    // Stats des tâches
    const [taskStats] = await pool.query(
      `SELECT
         COUNT(*)                           AS total,
         SUM(t.status = 'done')            AS done,
         SUM(t.status = 'in_progress')     AS in_progress,
         SUM(t.status = 'backlog')         AS backlog,
         SUM(t.status = 'todo')            AS todo,
         SUM(t.status = 'review')          AS review,
         SUM(t.due_date < CURDATE() AND t.status != 'done') AS overdue
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN project_members pm ON pm.project_id = p.id
       WHERE p.owner_id = ? OR pm.user_id = ?`,
      [userId, userId]
    );

    // Répartition par priorité
    const [priorityStats] = await pool.query(
      `SELECT t.priority, COUNT(*) AS count
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN project_members pm ON pm.project_id = p.id
       WHERE (p.owner_id = ? OR pm.user_id = ?) AND t.status != 'done'
       GROUP BY t.priority`,
      [userId, userId]
    );

    // Progression par projet
    const [projectProgress] = await pool.query(
      `SELECT p.id, p.title, p.color,
              COUNT(t.id)          AS total,
              SUM(t.status='done') AS done
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       LEFT JOIN project_members pm ON pm.project_id = p.id
       WHERE p.owner_id = ? OR pm.user_id = ?
       GROUP BY p.id
       LIMIT 5`,
      [userId, userId]
    );

    // Activités récentes
    const recentActivities = await activity.getGlobal(userId, 10);

    res.json({
      success: true,
      data: {
        project_count,
        task_stats: taskStats[0],
        priority_stats: priorityStats,
        project_progress: projectProgress,
        recent_activities: recentActivities
      }
    });
  } catch (err) { next(err); }
};

// GET /api/dashboard/activities
exports.getActivities = async (req, res, next) => {
  try {
    const projectId = req.query.project_id;
    let rows;
    if (projectId) {
      rows = await activity.getByProject(projectId);
    } else {
      rows = await activity.getGlobal(req.user.id, 50);
    }
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
