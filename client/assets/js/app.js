/**
 * assets/js/app.js
 * Orchestrateur principal — routing, auth, initialisation
 */

const App = (() => {
  let _currentPage      = 'dashboard';
  let _currentProjectId = null;

  /* ── NAVIGATION ─────────────────────────────────────── */
  const navigate = (page) => {
    if (_currentProjectId && page !== 'kanban') {
      SocketManager.leaveProject(_currentProjectId);
      _currentProjectId = null;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    _currentPage = page;

    switch (page) {
      case 'dashboard': DashboardPage.load();   break;
      case 'projects':  ProjectsPage.load();    break;
      case 'tasks':     TasksPage.load();       break;
      case 'profile':   ProfilePage.load();     break;
    }
  };

  const openProject = async (projectId, openTaskId = null) => {
    _currentProjectId = projectId;
    navigate('kanban');
    await KanbanPage.load(projectId);
    if (openTaskId) {
      try {
        const { data } = await API.tasks.get(openTaskId);
        KanbanPage.openTaskModal && KanbanPage.openTaskModal(data);
      } catch {}
    }
  };

  const navigateToProject = (id) => openProject(id);

  /* ── AUTH ───────────────────────────────────────────── */
  const showAuth  = () => {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
  };

  const showApp = async () => {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');

    const user = Auth.getUser();
    document.getElementById('topbar-name').textContent = `${user.firstname} ${user.lastname}`;
    UI.setAvatarEl(document.getElementById('topbar-avatar'), user);

    SocketManager.connect();
    loadNotifications();
    navigate('dashboard');
  };

  const logout = () => {
    SocketManager.disconnect();
    Auth.clear();
    showAuth();
  };

  /* ── NOTIFICATIONS ──────────────────────────────────── */
  const loadNotifications = async () => {
    try {
      const { data, unread_count } = await API.notifications.list();
      UI.setNotifications(data, unread_count);
    } catch {}
  };

  /* ── SEARCH ─────────────────────────────────────────── */
  let _searchTimer;
  const initSearch = () => {
    const input = document.getElementById('global-search');
    if (!input) return;

    input.addEventListener('input', (e) => {
      clearTimeout(_searchTimer);
      const q = e.target.value.trim();
      if (!q) {
        document.getElementById('search-results')?.classList.add('hidden');
        return;
      }
      _searchTimer = setTimeout(() => runSearch(q), 300);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrap')) {
        document.getElementById('search-results')?.classList.add('hidden');
      }
    });
  };

  const runSearch = async (q) => {
    try {
      const [projRes, taskRes] = await Promise.all([
        API.projects.list(),
        API.tasks.list({ search: q })
      ]);

      const results = [
        ...projRes.data.filter(p => p.title.toLowerCase().includes(q.toLowerCase()))
                       .map(p => ({ type: 'project', id: p.id, title: p.title })),
        ...taskRes.data.slice(0, 5).map(t => ({ type: 'task', id: t.id, title: t.title }))
      ].slice(0, 8);

      UI.renderSearchResults(results);
    } catch {}
  };

  /* ── AUTH FORMS ─────────────────────────────────────── */
  const initAuthForms = () => {
    // Toggle forms
    document.getElementById('link-to-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('register-form').classList.remove('hidden');
    });
    document.getElementById('link-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('register-form').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
    });

    // Toggle password visibility
    document.querySelector('.toggle-password')?.addEventListener('click', (e) => {
      const input = e.target.closest('.input-icon-wrap').querySelector('input');
      const icon  = e.target.closest('.toggle-password').querySelector('i');
      input.type  = input.type === 'password' ? 'text' : 'password';
      icon.className = input.type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });

    // Login
    document.getElementById('btn-login')?.addEventListener('click', async () => {
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { UI.toast('Remplissez tous les champs', 'error'); return; }

      const btn = document.getElementById('btn-login');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Connexion…';

      try {
        const { data } = await API.auth.login({ email, password });
        Auth.save(data.token, data.user);
        showApp();
      } catch (err) {
        UI.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Se connecter';
      }
    });

    // Enter key login
    document.getElementById('login-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-login').click();
    });

    // Register
    document.getElementById('btn-register')?.addEventListener('click', async () => {
      const firstname = document.getElementById('reg-firstname').value.trim();
      const lastname  = document.getElementById('reg-lastname').value.trim();
      const username  = document.getElementById('reg-username').value.trim();
      const email     = document.getElementById('reg-email').value.trim();
      const password  = document.getElementById('reg-password').value;

      if (!firstname || !lastname || !username || !email || !password) {
        UI.toast('Remplissez tous les champs', 'error'); return;
      }

      const btn = document.getElementById('btn-register');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Création…';

      try {
        const { data } = await API.auth.register({ firstname, lastname, username, email, password });
        Auth.save(data.token, data.user);
        showApp();
        UI.toast('Compte créé avec succès !', 'success');
      } catch (err) {
        UI.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Créer le compte';
      }
    });
  };

  /* ── SIDEBAR & THEME ─────────────────────────────────── */
  const initSidebar = () => {
    const sidebar = document.getElementById('sidebar');

    document.getElementById('btn-sidebar-toggle')?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });

    // Mobile overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });

    // Nav items
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(item.dataset.page);
        if (window.innerWidth < 768) {
          sidebar.classList.remove('mobile-open');
          overlay.classList.remove('active');
        }
      });
    });
  };

  const initTheme = () => {
    const btn = document.getElementById('btn-theme-toggle');
    const html = document.documentElement;

    const saved = localStorage.getItem('pf_theme') || 'dark';
    html.setAttribute('data-theme', saved);
    updateThemeIcon(saved);

    btn?.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      const next    = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('pf_theme', next);
      updateThemeIcon(next);
    });
  };

  const updateThemeIcon = (theme) => {
    const icon = document.querySelector('#btn-theme-toggle i');
    if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  };

  /* ── NOTIFICATIONS PANEL ─────────────────────────────── */
  const initNotifPanel = () => {
    const btn   = document.getElementById('btn-notif');
    const panel = document.getElementById('notif-panel');

    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notif-wrap')) panel?.classList.add('hidden');
    });
  };

  /* ── USER DROPDOWN ──────────────────────────────────── */
  const initUserMenu = () => {
    const btn      = document.getElementById('btn-user-menu');
    const dropdown = document.getElementById('user-dropdown');

    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu-wrap')) dropdown?.classList.add('hidden');
    });

    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });

    // Profile link
    dropdown?.querySelector('[data-page="profile"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown.classList.add('hidden');
      navigate('profile');
    });
  };

  /* ── MAIN INIT ──────────────────────────────────────── */
  const init = () => {
    initTheme();
    initAuthForms();
    initSidebar();
    initNotifPanel();
    initUserMenu();
    initSearch();

    // Init sub-modules
    ProjectsPage.init();
    KanbanPage.init();
    TasksPage.init();
    ProfilePage.init();

    // Check auth state
    if (Auth.isLoggedIn()) {
      showApp();
    } else {
      showAuth();
    }
  };

  // Auto-init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', init);

  return { navigate, openProject, navigateToProject };
})();
