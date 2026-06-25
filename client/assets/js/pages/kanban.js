/**
 * assets/js/pages/kanban.js
 * Tableau Kanban avec Drag & Drop natif HTML5
 */

const KanbanPage = (() => {
  const COLUMNS = [
    { key: 'backlog',     label: 'Backlog',      color: '#6B7280' },
    { key: 'todo',        label: 'To Do',         color: '#3B82F6' },
    { key: 'in_progress', label: 'In Progress',   color: '#F59E0B' },
    { key: 'review',      label: 'Review',        color: '#8B5CF6' },
    { key: 'done',        label: 'Done',          color: '#10B981' },
  ];

  const PRIORITY_COLORS = {
    low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444'
  };

  let _projectId   = null;
  let _project     = null;
  let _tasks       = [];
  let _members     = [];
  let _editingTask = null;
  let _draggedId   = null;

  /* ── LOAD PROJECT ────────────────────────────────────── */
  const load = async (projectId) => {
    _projectId = projectId;

    try {
      const [projRes, taskRes] = await Promise.all([
        API.projects.get(projectId),
        API.tasks.list({ project_id: projectId })
      ]);

      _project = projRes.data;
      _tasks   = taskRes.data;
      _members = _project.members || [];

      // Update header
      document.getElementById('kanban-project-title').textContent = _project.title;
      document.getElementById('kanban-project-desc').textContent  = _project.description || '';

      renderMemberAvatars();
      renderAssigneeFilter();
      renderBoard();

      SocketManager.joinProject(projectId);
    } catch (err) {
      UI.toast('Erreur chargement projet', 'error');
    }
  };

  /* ── RENDER BOARD ────────────────────────────────────── */
  const renderBoard = () => {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    const priorityFilter  = document.getElementById('filter-priority')?.value  || '';
    const assigneeFilter  = document.getElementById('filter-assignee')?.value  || '';

    let filtered = _tasks.filter(t => {
      if (priorityFilter && t.priority  !== priorityFilter) return false;
      if (assigneeFilter && String(t.assigned_to) !== assigneeFilter) return false;
      return true;
    });

    board.innerHTML = COLUMNS.map(col => {
      const colTasks = filtered.filter(t => t.status === col.key);
      return `
        <div class="kanban-column" data-col="${col.key}">
          <div class="kanban-col-header">
            <div class="kanban-col-title">
              <span class="kanban-col-dot" style="background:${col.color}"></span>
              ${col.label}
            </div>
            <span class="kanban-col-count">${colTasks.length}</span>
          </div>
          <div class="kanban-cards" data-col="${col.key}">
            ${colTasks.map(renderTaskCard).join('')}
          </div>
          <div class="kanban-add-card" data-col="${col.key}">
            <i class="fa-solid fa-plus"></i> Ajouter une tâche
          </div>
        </div>`;
    }).join('');

    initDragDrop();
    initCardClicks();

    // Quick add
    board.querySelectorAll('.kanban-add-card').forEach(btn => {
      btn.addEventListener('click', () => openTaskModal(null, btn.dataset.col));
    });
  };

  const renderTaskCard = (task) => {
    const dueClass = UI.isOverdue(task.due_date) ? 'overdue' : UI.isDueSoon(task.due_date) ? 'upcoming' : '';
    const assignee = task.assigned_to
      ? `${UI.avatarUrl({ firstname: task.assigned_firstname, lastname: task.assigned_lastname, avatar: task.assigned_avatar, id: task.assigned_to }, 'xs')}`
      : '';

    return `
      <div class="task-card" draggable="true" data-id="${task.id}">
        <div class="task-card-priority-bar" style="background:${PRIORITY_COLORS[task.priority]}"></div>
        <div class="task-card-title">${task.title}</div>
        <div class="task-card-footer">
          <div class="task-card-meta">
            <span class="priority-badge priority-${task.priority}">${task.priority}</span>
            ${task.due_date ? `<span class="task-card-due ${dueClass}"><i class="fa-solid fa-calendar"></i>${UI.formatDate(task.due_date)}</span>` : ''}
          </div>
          ${assignee}
        </div>
      </div>`;
  };

  /* ── DRAG & DROP ─────────────────────────────────────── */
  const initDragDrop = () => {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    // Cards
    board.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        _draggedId = parseInt(card.dataset.id);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        board.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
        board.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
      });
    });

    // Drop zones
    board.querySelectorAll('.kanban-cards').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');

        // Placeholder
        const existing = zone.querySelector('.drag-placeholder');
        if (!existing) {
          const placeholder = document.createElement('div');
          placeholder.className = 'drag-placeholder';
          zone.appendChild(placeholder);
        }
      });

      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('drag-over');
          zone.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
        }
      });

      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        zone.querySelectorAll('.drag-placeholder').forEach(p => p.remove());

        const taskId   = _draggedId;
        const newStatus = zone.dataset.col;
        if (!taskId || !newStatus) return;

        const task = _tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Optimistic update
        task.status = newStatus;
        renderBoard();

        try {
          await API.tasks.update(taskId, { status: newStatus });
        } catch (err) {
          UI.toast('Erreur déplacement tâche', 'error');
          load(_projectId);
        }
      });
    });
  };

  const initCardClicks = () => {
    document.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[draggable]') && e.type === 'click') {
          const task = _tasks.find(t => t.id === parseInt(card.dataset.id));
          if (task) openTaskModal(task);
        }
      });
    });
  };

  /* ── MEMBER AVATARS ──────────────────────────────────── */
  const renderMemberAvatars = () => {
    const container = document.getElementById('kanban-members');
    if (!container) return;
    container.innerHTML = _members.slice(0, 5).map(m =>
      `<div title="${m.firstname} ${m.lastname}">${UI.avatarUrl(m, 'sm')}</div>`
    ).join('');
    if (_members.length > 5) {
      container.innerHTML += `<div class="avatar avatar-sm" style="background:var(--bg-overlay);color:var(--text-muted);font-size:0.7rem;">+${_members.length - 5}</div>`;
    }
  };

  const renderAssigneeFilter = () => {
    const sel = document.getElementById('filter-assignee');
    if (!sel) return;
    sel.innerHTML = `<option value="">Tous assignés</option>` +
      _members.map(m => `<option value="${m.id}">${m.firstname} ${m.lastname}</option>`).join('');
  };

  /* ── TASK MODAL ──────────────────────────────────────── */
  const openTaskModal = async (task = null, defaultStatus = 'backlog') => {
    _editingTask = task;

    const isEdit = !!task;
    document.getElementById('modal-task-title').textContent = isEdit ? 'Modifier la tâche' : 'Nouvelle tâche';
    document.getElementById('btn-save-task').textContent    = isEdit ? 'Enregistrer' : 'Créer';
    document.getElementById('task-title').value    = task?.title       || '';
    document.getElementById('task-desc').value     = task?.description || '';
    document.getElementById('task-status').value   = task?.status      || defaultStatus;
    document.getElementById('task-priority').value = task?.priority    || 'medium';
    document.getElementById('task-due-date').value = task?.due_date ? task.due_date.split('T')[0] : '';

    // Assignee select
    const assigneeSel = document.getElementById('task-assignee');
    assigneeSel.innerHTML = `<option value="">— Non assigné —</option>` +
      _members.map(m => `<option value="${m.id}" ${task?.assigned_to == m.id ? 'selected' : ''}>${m.firstname} ${m.lastname}</option>`).join('');

    // Delete btn
    const deleteBtn = document.getElementById('btn-delete-task');
    if (deleteBtn) deleteBtn.classList.toggle('hidden', !isEdit);

    // Comments section
    const commentsSection = document.getElementById('task-comments-section');
    if (commentsSection) {
      commentsSection.classList.toggle('hidden', !isEdit);
      if (isEdit) loadComments(task.id);
    }

    UI.openModal('modal-task');
  };

  const saveTask = async () => {
    const title      = document.getElementById('task-title').value.trim();
    const desc       = document.getElementById('task-desc').value.trim();
    const status     = document.getElementById('task-status').value;
    const priority   = document.getElementById('task-priority').value;
    const assigned   = document.getElementById('task-assignee').value;
    const due_date   = document.getElementById('task-due-date').value;

    if (!title) { UI.toast('Le titre est requis', 'error'); return; }

    const body = {
      title, description: desc, status, priority,
      assigned_to: assigned || null,
      due_date: due_date || null,
    };

    try {
      if (_editingTask) {
        await API.tasks.update(_editingTask.id, body);
        UI.toast('Tâche mise à jour', 'success');
      } else {
        body.project_id = _projectId;
        await API.tasks.create(body);
        UI.toast('Tâche créée', 'success');
      }
      UI.closeModal('modal-task');
      const { data } = await API.tasks.list({ project_id: _projectId });
      _tasks = data;
      renderBoard();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  };

  const deleteTask = async () => {
    if (!_editingTask) return;
    if (!confirm('Supprimer cette tâche ?')) return;
    try {
      await API.tasks.delete(_editingTask.id);
      UI.toast('Tâche supprimée', 'success');
      UI.closeModal('modal-task');
      _tasks = _tasks.filter(t => t.id !== _editingTask.id);
      renderBoard();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  };

  /* ── COMMENTS ────────────────────────────────────────── */
  const loadComments = async (taskId) => {
    const list = document.getElementById('task-comments-list');
    if (!list) return;
    try {
      const { data } = await API.comments.list(taskId);
      renderComments(data);
    } catch {}

    // Avatar for comment input
    const user = Auth.getUser();
    UI.setAvatarEl(document.getElementById('comment-avatar'), user);
  };

  const renderComments = (comments) => {
    const list = document.getElementById('task-comments-list');
    if (!list) return;
    if (!comments.length) {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">Aucun commentaire.</p>`;
      return;
    }
    list.innerHTML = comments.map(c => `
      <div class="comment-item">
        ${UI.avatarUrl(c, 'xs')}
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">${c.firstname} ${c.lastname}</span>
            <span class="comment-date">${UI.relativeTime(c.created_at)}</span>
          </div>
          <div class="comment-text">${c.content}</div>
        </div>
      </div>`
    ).join('');
  };

  const addComment = async () => {
    const input = document.getElementById('new-comment');
    const content = input?.value.trim();
    if (!content || !_editingTask) return;

    try {
      const { data } = await API.comments.create({ task_id: _editingTask.id, content });
      input.value = '';
      const { data: comments } = await API.comments.list(_editingTask.id);
      renderComments(comments);
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  };

  /* ── MEMBERS MODAL ───────────────────────────────────── */
  const openMembersModal = () => {
    renderCurrentMembers();
    UI.openModal('modal-members');
  };

  const renderCurrentMembers = () => {
    const container = document.getElementById('current-members-list');
    if (!container) return;
    container.innerHTML = _members.map(m => `
      <div class="member-list-item">
        ${UI.avatarUrl(m, 'sm')}
        <div class="member-list-info">
          <div class="member-list-name">${m.firstname} ${m.lastname}</div>
          <div class="member-list-role">@${m.username} · ${m.role}</div>
        </div>
        ${m.id !== _project.owner_id ? `
          <button class="btn btn-ghost btn-sm remove-member-btn" data-uid="${m.id}">
            <i class="fa-solid fa-times"></i>
          </button>` : '<span class="role-badge">Propriétaire</span>'}
      </div>`
    ).join('');

    container.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Retirer ce membre ?')) return;
        try {
          await API.projects.removeMember(_projectId, btn.dataset.uid);
          UI.toast('Membre retiré', 'success');
          _members = _members.filter(m => m.id != btn.dataset.uid);
          renderCurrentMembers();
          renderMemberAvatars();
        } catch (err) { UI.toast(err.message, 'error'); }
      });
    });
  };

  /* ── SOCKET EVENTS ───────────────────────────────────── */
  const onTaskCreated = (task) => {
    if (task.project_id != _projectId) return;
    _tasks.push(task);
    renderBoard();
  };

  const onTaskUpdated = (task) => {
    if (task.project_id != _projectId) return;
    const idx = _tasks.findIndex(t => t.id === task.id);
    if (idx > -1) _tasks[idx] = task; else _tasks.push(task);
    renderBoard();
  };

  const onTaskDeleted = (id) => {
    _tasks = _tasks.filter(t => t.id !== id);
    renderBoard();
  };

  const onCommentNew = (comment) => {
    if (_editingTask?.id === comment.task_id) {
      API.comments.list(comment.task_id).then(({ data }) => renderComments(data));
    }
  };

  /* ── INIT ────────────────────────────────────────────── */
  const init = () => {
    document.getElementById('btn-save-task')?.addEventListener('click', saveTask);
    document.getElementById('btn-delete-task')?.addEventListener('click', deleteTask);
    document.getElementById('btn-add-comment')?.addEventListener('click', addComment);
    document.getElementById('btn-add-task')?.addEventListener('click', () => openTaskModal());
    document.getElementById('btn-manage-members')?.addEventListener('click', openMembersModal);
    document.getElementById('btn-back-to-projects')?.addEventListener('click', () => App.navigate('projects'));

    document.getElementById('filter-priority')?.addEventListener('change', renderBoard);
    document.getElementById('filter-assignee')?.addEventListener('change', renderBoard);

    // Member search
    let memberSearchTimer;
    document.getElementById('member-search')?.addEventListener('input', (e) => {
      clearTimeout(memberSearchTimer);
      const q = e.target.value.trim();
      const container = document.getElementById('member-search-results');
      if (q.length < 2) {
        if (container) container.style.display = 'none';
        return;
      }
      memberSearchTimer = setTimeout(() => searchMembers(q), 350);
    });

    // Fermer le dropdown membres si clic en dehors
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#modal-members')) {
        const container = document.getElementById('member-search-results');
        if (container) container.style.display = 'none';
      }
    });
  };

  const searchMembers = async (query) => {
    const container = document.getElementById('member-search-results');
    if (!container) return;

    // Afficher le dropdown
    container.style.display = 'block';
    container.innerHTML = `<div class="search-result-item" style="cursor:default;color:var(--text-muted)">
      <i class="fa-solid fa-spinner fa-spin"></i> Recherche…
    </div>`;

    try {
      const res  = await fetch(`/api/users?search=${encodeURIComponent(query)}&exclude_self=true`, {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const json = await res.json();
      const data = json.data || [];

      // Exclure les membres déjà dans le projet
      const filtered = data.filter(u => !_members.find(m => m.id === u.id));

      if (!filtered.length) {
        container.innerHTML = `<div class="search-result-item" style="cursor:default;color:var(--text-muted)">
          <i class="fa-solid fa-user-slash"></i>&nbsp; Aucun utilisateur trouvé
        </div>`;
        return;
      }

      // Rendre les résultats
      container.innerHTML = filtered.map(u => `
        <div class="search-result-item add-member-result"
             data-id="${u.id}"
             data-name="${u.firstname} ${u.lastname}"
             style="cursor:pointer;">
          ${UI.avatarUrl(u, 'xs')}
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.875rem;">${u.firstname} ${u.lastname}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">@${u.username} · ${u.email}</div>
          </div>
          <i class="fa-solid fa-plus" style="color:var(--brand);font-size:0.8rem;flex-shrink:0;"></i>
        </div>`
      ).join('');

      // Délégation sur le container (évite les problèmes de re-render)
      container.onclick = null;
      container.addEventListener('click', async function handler(e) {
        const item = e.target.closest('.add-member-result');
        if (!item) return;

        const userId   = item.dataset.id;
        const userName = item.dataset.name;

        // Feedback visuel immédiat
        item.style.opacity = '0.5';
        item.style.pointerEvents = 'none';
        item.querySelector('i.fa-plus').className = 'fa-solid fa-spinner fa-spin';

        try {
          await API.projects.addMember(_projectId, { user_id: userId });

          // Fermer dropdown et vider la recherche
          container.style.display = 'none';
          container.innerHTML = '';
          document.getElementById('member-search').value = '';

          // Recharger les membres du projet
          const { data: proj } = await API.projects.get(_projectId);
          _members = proj.members;
          renderCurrentMembers();
          renderMemberAvatars();
          renderAssigneeFilter();

          UI.toast(`${userName} ajouté au projet`, 'success');
        } catch (err) {
          UI.toast(err.message || 'Erreur lors de l\'ajout', 'error');
          item.style.opacity = '';
          item.style.pointerEvents = '';
          item.querySelector('i').className = 'fa-solid fa-plus';
        }

        container.removeEventListener('click', handler);
      });

    } catch (err) {
      container.innerHTML = `<div class="search-result-item" style="cursor:default;color:var(--priority-critical)">
        <i class="fa-solid fa-triangle-exclamation"></i>&nbsp; Erreur de connexion
      </div>`;
    }
  };

  return { load, init, onTaskCreated, onTaskUpdated, onTaskDeleted, onCommentNew };
})();