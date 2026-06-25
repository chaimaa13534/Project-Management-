/**
 * services/notificationService.js
 * Création de notifications + push via Socket.io
 */
const pool = require('../config/database');

const create = async ({ userId, type, message, entityId = null, entityType = null }) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, type, message, entity_id, entity_type)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, message, entityId, entityType]
    );

    // Push temps réel
    try {
      const { getIo } = require('../config/socket');
      const io = getIo();
      io.to(`user:${userId}`).emit('notification:new', {
        id: result.insertId,
        type,
        message,
        entity_id: entityId,
        entity_type: entityType,
        is_read: false,
        created_at: new Date()
      });
    } catch (_) { /* socket pas encore initié */ }

    return result.insertId;
  } catch (err) {
    console.error('Erreur notificationService.create :', err.message);
  }
};

module.exports = { create };
