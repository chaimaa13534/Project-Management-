/**
 * assets/js/pages/projects.js
 * Liste et gestion des projets
 */

const ProjectsPage = (() => {
  let _selectedColor = '#6C63FF';
  let _editingId     = null;

  const load = async () => {
    try {
      const { data } = await API.projects.list();
      render(data);
      updateSidebar(data);
    } catch (err) {
      UI.toast('Erreur chargement projets', 'error');
    }
  };

  const render = (projects) => {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    if (!projects.length) {
      grid.innerHTML = UI.emptyState('fa-folder-open', 'Aucun projet', 'Créez votre premier projet pour commencer');
      return;
    }

    grid.innerHTML = projects.map(p => {
      const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
      const owner = { firstname: p.firstname, lastname: p.lastname, avatar: p.owner_avatar, id: p.owner_id };

      return `
        <div class="project-card" data-id="${p.id}">
          <div class="project-card-accent" style="background:${p.color}"></div>
          <div class="project-card-body">
            <div class="project-card-title">${p.title}</div>
            <div class="project-card-desc">${p.description || '<span style="color:var(--text-muted)">Aucune description</span>'}</div>
            <div class="project-progress-bar">
              <div class="project-progress-fill" style="width:${pct}%;background:${p.color}"></div>
            </div>
            <div class="project-progress-label">
              <span>${pct}% terminé</span>
              <span>${p.done_count}/${p.task_count} tâches</span>
            </div>
          </div>
          <div class="project-card-footer">
            <div style="display:flex;align-items:center;gap:8px;">
              ${UI.avatarUrl(owner, 'xs')}
              <span style="font-size:0.78rem;color:var(--text-muted)">${p.member_count} membre${p.member_count > 1 ? 's' : ''}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="status-badge status-${p.status}">${statusLabel(p.status)}</span>
              <button class="btn-icon project-edit-btn" data-id="${p.id}" title="Modifier">
                <i class="fa-solid fa-pen"></i>
              </button>
            </div>
          </div>
        </div>`;
    }).join('');

    // Click card → Kanban
    grid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.project-edit-btn')) return;
        App.openProject(card.dataset.id);
      });
    });

    // Edit buttons
    grid.querySelectorAll('.project-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const proj = projects.find(p => p.id == btn.dataset.id);
        if (proj) openEditModal(proj);
      });
    });
  };

  const updateSidebar = (projects) => {
    const container = document.getElementById('sidebar-projects');
    if (!container) return;
    container.innerHTML = projects.slice(0, 6).map(p => `
      <div class="sidebar-project-item" data-id="${p.id}">
        <span class="sidebar-project-dot" style="background:${p.color}"></span>
        <span>${p.title}</span>
      </div>`
    ).join('');

    container.querySelectorAll('.sidebar-project-item').forEach(el => {
      el.addEventListener('click', () => App.openProject(el.dataset.id));
    });
  };

  const statusLabel = (s) => ({ active: 'Actif', archived: 'Archivé', completed: 'Terminé' }[s] || s);

  /* ── MODAL CRÉATION / ÉDITION ─────────────────────────── */
  const openCreateModal = () => {
    _editingId = null;
    _selectedColor = '#6C63FF';

    document.getElementById('modal-project-title').textContent = 'Nouveau projet';
    document.getElementById('proj-title').value    = '';
    document.getElementById('proj-desc').value     = '';
    document.getElementById('proj-due-date').value = '';
    document.getElementById('btn-save-project').textContent = 'Créer';

    // Reset color swatches
    document.querySelectorAll('#proj-colors .swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === _selectedColor);
    });

    UI.openModal('modal-project');
  };

  const openEditModal = (project) => {
    _editingId = project.id;
    _selectedColor = project.color;

    document.getElementById('modal-project-title').textContent = 'Modifier le projet';
    document.getElementById('proj-title').value    = project.title;
    document.getElementById('proj-desc').value     = project.description || '';
    document.getElementById('proj-due-date').value = project.due_date ? project.due_date.split('T')[0] : '';
    document.getElementById('btn-save-project').textContent = 'Enregistrer';

    document.querySelectorAll('#proj-colors .swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === project.color);
    });

    UI.openModal('modal-project');
  };

  const saveProject = async () => {
    const title    = document.getElementById('proj-title').value.trim();
    const desc     = document.getElementById('proj-desc').value.trim();
    const due_date = document.getElementById('proj-due-date').value;

    if (!title) { UI.toast('Le titre est requis', 'error'); return; }

    const body = { title, description: desc, color: _selectedColor, due_date: due_date || null };

    try {
      if (_editingId) {
        await API.projects.update(_editingId, body);
        UI.toast('Projet mis à jour', 'success');
      } else {
        await API.projects.create(body);
        UI.toast('Projet créé', 'success');
      }
      UI.closeModal('modal-project');
      load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  };

  /* ── INIT ─────────────────────────────────────────────── */
  const init = () => {
    // Color swatches
    document.querySelectorAll('#proj-colors .swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('#proj-colors .swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        _selectedColor = swatch.dataset.color;
      });
    });

    document.getElementById('btn-save-project')?.addEventListener('click', saveProject);
    document.getElementById('btn-new-project')?.addEventListener('click',  openCreateModal);
    document.getElementById('btn-new-project-2')?.addEventListener('click', openCreateModal);
  };

  return { load, render, init, openCreateModal };
})();
