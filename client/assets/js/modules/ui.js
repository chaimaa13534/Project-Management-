/**
 * assets/js/modules/ui.js
 * Utilitaires UI — toasts, modals, avatars, helpers
 */

const UI = (() => {

  /* ── TOAST ─────────────────────────────────────────────── */
  const toast = (message, type = 'info', duration = 3500) => {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${message}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => el.remove());
    }, duration);
  };

  /* ── MODAL ─────────────────────────────────────────────── */
  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('hidden');
      modal.querySelectorAll('.modal-close').forEach(btn => {
        btn.onclick = () => closeModal(id);
      });
      modal.querySelector('.modal-overlay').onclick = () => closeModal(id);
    }
  };

  const closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  };

  const closeAllModals = () => {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  };

  /* ── AVATAR ─────────────────────────────────────────────── */
  const avatarUrl = (user, size = 'sm') => {
    if (user?.avatar) return `<img src="${user.avatar}" alt="${user.firstname}" class="avatar avatar-${size}" />`;
    const initials = `${(user?.firstname || '?')[0]}${(user?.lastname || '')[0] || ''}`.toUpperCase();
    const colors   = ['#6C63FF','#22D3A5','#EF4444','#F59E0B','#3B82F6','#EC4899','#10B981'];
    const color    = colors[(user?.id || 0) % colors.length];
    return `<div class="avatar avatar-${size}" style="background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">${initials}</div>`;
  };

  const setAvatarEl = (el, user) => {
    if (!el) return;
    if (user?.avatar) {
      el.src = user.avatar;
      el.style.display = '';
    } else {
      el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.firstname || '') + '+' + (user?.lastname || ''))}&background=6C63FF&color=fff&size=128`;
    }
  };

  /* ── PRIORITY ───────────────────────────────────────────── */
  const priorityBadge = (p) => {
    const map = { low: '🟢 Low', medium: '🟡 Medium', high: '🟠 High', critical: '🔴 Critical' };
    return `<span class="priority-badge priority-${p}">${map[p] || p}</span>`;
  };

  const statusBadge = (s) => {
    const map = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
    return `<span class="status-badge status-${s}">${map[s] || s}</span>`;
  };

  /* ── DATE ───────────────────────────────────────────────── */
  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const relativeTime = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)    return 'à l\'instant';
    if (mins < 60)   return `il y a ${mins}min`;
    if (hours < 24)  return `il y a ${hours}h`;
    if (days < 7)    return `il y a ${days}j`;
    return formatDate(d);
  };

  const isOverdue = (d) => d && new Date(d) < new Date() && new Date(d).toDateString() !== new Date().toDateString();
  const isDueSoon = (d) => {
    if (!d) return false;
    const diff = new Date(d) - new Date();
    return diff > 0 && diff < 86400000 * 3;
  };

  /* ── NOTIFICATIONS ──────────────────────────────────────── */
  let _notifications = [];
  let _unreadCount   = 0;

  const addNotification = (notif) => {
    _notifications.unshift(notif);
    _unreadCount++;
    renderNotifBadge();
    renderNotifPanel();
    toast(notif.message, 'info');
  };

  const setNotifications = (list, unread) => {
    _notifications = list;
    _unreadCount   = unread;
    renderNotifBadge();
    renderNotifPanel();
  };

  const renderNotifBadge = () => {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (_unreadCount > 0) {
      badge.textContent = _unreadCount > 99 ? '99+' : _unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  };

  const notifIcon = (type) => {
    const map = {
      task_assigned: 'fa-user-check',
      comment_added: 'fa-comment',
      member_added:  'fa-user-plus',
      status_changed:'fa-arrows-rotate',
    };
    return map[type] || 'fa-bell';
  };

  const renderNotifPanel = () => {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;

    if (!_notifications.length) {
      panel.innerHTML = `<div class="notif-panel-header"><h4>Notifications</h4></div>
        <div style="padding:32px;text-align:center;color:var(--text-muted)">
          <i class="fa-solid fa-bell-slash" style="font-size:2rem;margin-bottom:8px;display:block"></i>Aucune notification
        </div>`;
      return;
    }

    panel.innerHTML = `
      <div class="notif-panel-header">
        <h4>Notifications</h4>
        <button id="mark-all-read">Tout marquer lu</button>
      </div>
      <div class="notif-list">
        ${_notifications.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notif-icon"><i class="fa-solid ${notifIcon(n.type)}"></i></div>
            <div class="notif-text">
              <div class="notif-message">${n.message}</div>
              <div class="notif-time">${relativeTime(n.created_at)}</div>
            </div>
          </div>
        `).join('')}
      </div>`;

    panel.querySelector('#mark-all-read')?.addEventListener('click', async () => {
      await API.notifications.markAllRead();
      _notifications.forEach(n => n.is_read = true);
      _unreadCount = 0;
      renderNotifBadge();
      renderNotifPanel();
    });
  };

  /* ── SEARCH RESULTS ─────────────────────────────────────── */
  const renderSearchResults = (results) => {
    const container = document.getElementById('search-results');
    if (!container) return;
    if (!results.length) { container.classList.add('hidden'); return; }

    container.innerHTML = results.map(r => `
      <div class="search-result-item" data-type="${r.type}" data-id="${r.id}">
        <span class="search-result-type">${r.type === 'project' ? 'Projet' : 'Tâche'}</span>
        <span>${r.title}</span>
      </div>
    `).join('');
    container.classList.remove('hidden');

    container.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const { type, id } = el.dataset;
        container.classList.add('hidden');
        if (type === 'project') window.App && App.navigateToProject(id);
      });
    });
  };

  /* ── EMPTY STATE ────────────────────────────────────────── */
  const emptyState = (icon, title, subtitle = '') =>
    `<div class="empty-state"><i class="fa-solid ${icon}"></i><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ''}</div>`;

  return {
    toast, openModal, closeModal, closeAllModals,
    avatarUrl, setAvatarEl, priorityBadge, statusBadge,
    formatDate, relativeTime, isOverdue, isDueSoon,
    addNotification, setNotifications, renderSearchResults, emptyState,
  };
})();
