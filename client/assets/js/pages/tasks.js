/**
 * assets/js/pages/tasks.js
 * Liste de toutes les tâches assignées à l'utilisateur courant
 */

const TasksPage = (() => {

  const load = async () => {
    const user = Auth.getUser();
    try {
      const params = { assigned_to: user.id };
      const statusFilter   = document.getElementById('tasks-filter-status')?.value;
      const priorityFilter = document.getElementById('tasks-filter-priority')?.value;
      if (statusFilter)   params.status   = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const { data } = await API.tasks.list(params);
      render(data);

      // Update sidebar badge
      const inProgress = data.filter(t => t.status !== 'done').length;
      const badge = document.getElementById('my-tasks-badge');
      if (badge) {
        badge.textContent = inProgress || '';
        badge.style.display = inProgress ? '' : 'none';
      }
    } catch (err) {
      UI.toast('Erreur chargement tâches', 'error');
    }
  };

  const render = (tasks) => {
    const container = document.getElementById('my-tasks-list');
    if (!container) return;

    if (!tasks.length) {
      container.innerHTML = UI.emptyState('fa-list-check', 'Aucune tâche', 'Aucune tâche ne vous est assignée pour le moment');
      return;
    }

    // Group by status
    const groups = {
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      todo:        tasks.filter(t => t.status === 'todo'),
      review:      tasks.filter(t => t.status === 'review'),
      backlog:     tasks.filter(t => t.status === 'backlog'),
      done:        tasks.filter(t => t.status === 'done'),
    };

    const groupLabels = {
      in_progress: 'En cours', todo: 'À faire', review: 'En révision',
      backlog: 'Backlog', done: 'Terminées'
    };

    let html = '';
    for (const [status, list] of Object.entries(groups)) {
      if (!list.length) continue;
      html += `
        <div style="margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            ${UI.statusBadge(status)}
            <span style="font-size:0.8rem;color:var(--text-muted)">${list.length} tâche${list.length > 1 ? 's' : ''}</span>
          </div>
          ${list.map(renderTaskItem).join('')}
        </div>`;
    }

    container.innerHTML = html;

    // Click → go to project kanban and open task
    container.querySelectorAll('.task-list-item').forEach(el => {
      el.addEventListener('click', () => {
        const projectId = el.dataset.projectId;
        const taskId    = el.dataset.taskId;
        App.openProject(projectId, taskId);
      });
    });
  };

  const renderTaskItem = (task) => {
    const overdue = UI.isOverdue(task.due_date) && task.status !== 'done';
    return `
      <div class="task-list-item" data-task-id="${task.id}" data-project-id="${task.project_id}">
        <span class="priority-badge priority-${task.priority}" title="${task.priority}">${task.priority[0].toUpperCase()}</span>
        <div class="task-list-info">
          <div class="task-list-title">${task.title}</div>
          <div class="task-list-meta">
            ${task.due_date ? `<span class="${overdue ? 'due-date-overdue' : ''}"><i class="fa-solid fa-calendar${overdue ? '-xmark' : ''}"></i> ${UI.formatDate(task.due_date)}</span>` : ''}
          </div>
        </div>
        ${UI.statusBadge(task.status)}
      </div>`;
  };

  const init = () => {
    document.getElementById('tasks-filter-status')?.addEventListener('change', load);
    document.getElementById('tasks-filter-priority')?.addEventListener('change', load);
  };

  return { load, init };
})();
