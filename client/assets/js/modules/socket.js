/**
 * assets/js/modules/socket.js
 * Client Socket.io — notifications et mises à jour temps réel
 */

const SocketManager = (() => {
  let socket = null;

  const connect = () => {
    if (socket) return;
    const token = Auth.getToken();
    if (!token) return;

    socket = io({ auth: { token } });

    socket.on('connect', () => {
      console.log('🔌 Socket connecté');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket déconnecté');
    });

    // Notifications temps réel
    socket.on('notification:new', (notif) => {
      UI.addNotification(notif);
    });

    // Mises à jour tâches Kanban
    socket.on('task:created', (task) => {
      if (window.KanbanPage) KanbanPage.onTaskCreated(task);
    });

    socket.on('task:updated', (task) => {
      if (window.KanbanPage) KanbanPage.onTaskUpdated(task);
    });

    socket.on('task:deleted', ({ id }) => {
      if (window.KanbanPage) KanbanPage.onTaskDeleted(id);
    });

    socket.on('comment:new', (comment) => {
      if (window.KanbanPage) KanbanPage.onCommentNew(comment);
    });
  };

  const joinProject = (projectId) => {
    if (socket) socket.emit('join:project', projectId);
  };

  const leaveProject = (projectId) => {
    if (socket) socket.emit('leave:project', projectId);
  };

  const disconnect = () => {
    if (socket) { socket.disconnect(); socket = null; }
  };

  return { connect, joinProject, leaveProject, disconnect };
})();
