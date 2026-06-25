/**
 * assets/js/pages/dashboard.js
 * Chargement et rendu du tableau de bord
 */

const DashboardPage = (() => {

  const priorityColors = {
    low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444'
  };

  const load = async () => {
    // Greeting
    const user = Auth.getUser();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    const el = document.getElementById('dashboard-greeting');
    if (el) el.textContent = `${greeting}, ${user?.firstname} 👋`;

    try {
      const { data } = await API.dashboard.stats();
      renderStats(data);
      renderProjectProgress(data.project_progress);
      renderActivityFeed(data.recent_activities);
      renderPriorityChart(data.priority_stats, data.task_stats);
      renderOverdueTasks();
    } catch (err) {
      UI.toast('Erreur chargement dashboard', 'error');
    }
  };

  const renderStats = ({ project_count, task_stats }) => {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? 0; };
    set('stat-projects', project_count);
    set('stat-tasks',    task_stats?.total || 0);
    set('stat-done',     task_stats?.done  || 0);
    set('stat-overdue',  task_stats?.overdue || 0);

    // Animate numbers
    document.querySelectorAll('.stat-value').forEach(el => {
      const target = parseInt(el.textContent) || 0;
      let current = 0;
      const step = Math.max(1, Math.floor(target / 20));
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
      }, 30);
    });
  };

  const renderProjectProgress = (projects) => {
    const container = document.getElementById('project-progress-list');
    if (!container) return;

    if (!projects?.length) {
      container.innerHTML = UI.emptyState('fa-folder-open', 'Aucun projet', 'Créez votre premier projet');
      return;
    }

    container.innerHTML = projects.map(p => {
      const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
      return `
        <div class="progress-item">
          <div class="progress-label">
            <span class="progress-title">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>
              ${p.title}
            </span>
            <span class="progress-pct">${pct}% · ${p.done}/${p.total} tâches</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:0%;background:${p.color}" data-pct="${pct}"></div>
          </div>
        </div>`;
    }).join('');

    // Animate bars
    setTimeout(() => {
      container.querySelectorAll('.progress-fill').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    }, 100);
  };

  const renderActivityFeed = (activities) => {
    const container = document.getElementById('activity-feed');
    if (!container) return;

    if (!activities?.length) {
      container.innerHTML = UI.emptyState('fa-clock-rotate-left', 'Aucune activité récente');
      return;
    }

    const actionLabel = (action, entityType) => {
      const map = {
        created:      entityType === 'project' ? 'a créé le projet' : 'a créé la tâche',
        updated:      'a mis à jour',
        deleted:      'a supprimé',
        moved:        'a déplacé la tâche',
        commented:    'a commenté',
        added_member: 'a ajouté un membre à',
      };
      return map[action] || action;
    };

    container.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-avatar">${UI.avatarUrl(a, 'xs')}</div>
        <div class="activity-text">
          <strong>${a.firstname} ${a.lastname}</strong>
          ${actionLabel(a.action, a.entity_type)}
          ${a.entity_title ? `<em> « ${a.entity_title} »</em>` : ''}
          ${a.meta?.from ? `<span style="color:var(--text-muted)"> (${a.meta.from} → ${a.meta.to})</span>` : ''}
        </div>
        <div class="activity-time">${UI.relativeTime(a.created_at)}</div>
      </div>`
    ).join('');
  };

  const renderPriorityChart = (priorityStats, taskStats) => {
    const container = document.getElementById('priority-chart');
    if (!container) return;

    const priorities = ['critical', 'high', 'medium', 'low'];
    const labels     = { critical: '🔴 Critical', high: '🟠 High', medium: '🟡 Medium', low: '🟢 Low' };
    const total      = taskStats?.total || 1;

    const statsMap = {};
    (priorityStats || []).forEach(s => statsMap[s.priority] = s.count);

    container.innerHTML = priorities.map(p => {
      const count = statsMap[p] || 0;
      const pct   = Math.round((count / total) * 100);
      return `
        <div class="priority-row">
          <span class="priority-row-label">${labels[p]}</span>
          <div class="priority-row-bar">
            <div class="priority-row-fill" style="width:0%;background:${priorityColors[p]}" data-pct="${pct}">
              ${count > 0 ? `<span class="priority-row-count">${count}</span>` : ''}
            </div>
          </div>
          <span class="priority-row-total">${count}</span>
        </div>`;
    }).join('');

    setTimeout(() => {
      container.querySelectorAll('.priority-row-fill').forEach(bar => {
        bar.style.width = Math.max(bar.dataset.pct, bar.dataset.pct > 0 ? 5 : 0) + '%';
      });
    }, 100);
  };

  const renderOverdueTasks = async () => {
    const container = document.getElementById('overdue-tasks-list');
    if (!container) return;

    try {
      const user = Auth.getUser();
      const { data } = await API.tasks.list({ assigned_to: user.id });
      const overdue = data.filter(t => UI.isOverdue(t.due_date) && t.status !== 'done');

      if (!overdue.length) {
        container.innerHTML = UI.emptyState('fa-circle-check', 'Aucun retard', 'Tout est à jour !');
        return;
      }

      container.innerHTML = overdue.slice(0, 8).map(t => `
        <div class="overdue-item">
          <div class="overdue-dot"></div>
          <span class="overdue-title">${t.title}</span>
          <span class="overdue-date"><i class="fa-solid fa-calendar-xmark"></i> ${UI.formatDate(t.due_date)}</span>
        </div>`
      ).join('');
    } catch {}
  };

  return { load, renderActivityFeed };
})();
