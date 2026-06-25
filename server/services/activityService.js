/**
 * services/activityService.js
 * Enregistrement des activités + envoi de notifications Socket.io
 */
const pool = require('../config/database');

const log = async ({ userId, projectId = null, action, entityType, entityId = null, entityTitle = null, meta = null }) => {
  try {
    await pool.query(
      `INSERT INTO activities (user_id, project_id, action, entity_type, entity_id, entity_title, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, projectId, action, entityType, entityId, entityTitle, meta ? JSON.stringify(meta) : null]
    );
  } catch (err) {
    console.error('Erreur activityService.log :', err.message);
  }
};

const getByProject = async (projectId, limit = 50) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.firstname, u.lastname, u.avatar
     FROM activities a
     JOIN users u ON u.id = a.user_id
     WHERE a.project_id = ?
     ORDER BY a.created_at DESC
     LIMIT ?`,
    [projectId, limit]
  );
  return rows;
};

const getGlobal = async (userId, limit = 30) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.firstname, u.lastname, u.avatar
     FROM activities a
     JOIN users u ON u.id = a.user_id
     WHERE a.project_id IN (
       SELECT project_id FROM project_members WHERE user_id = ?
       UNION
       SELECT id FROM projects WHERE owner_id = ?
     )
     ORDER BY a.created_at DESC
     LIMIT ?`,
    [userId, userId, limit]
  );
  return rows;
};

module.exports = { log, getByProject, getGlobal };
