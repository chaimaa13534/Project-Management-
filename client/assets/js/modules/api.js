/**
 * assets/js/modules/api.js
 * Couche HTTP centralisée — toutes les requêtes API
 */

const API = (() => {
  const BASE = '/api';

  const getToken = () => localStorage.getItem('pf_token');

  const request = async (method, path, body = null, isForm = false) => {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isForm) headers['Content-Type'] = 'application/json';

    const options = { method, headers };
    if (body) options.body = isForm ? body : JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, options);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Erreur serveur');
    return data;
  };

  return {
    get:    (path)           => request('GET',    path),
    post:   (path, body)     => request('POST',   path, body),
    put:    (path, body)     => request('PUT',    path, body),
    del:    (path)           => request('DELETE', path),
    upload: (path, formData) => request('POST',   path, formData, true),

    // Auth
    auth: {
      register: (data)  => request('POST', '/auth/register', data),
      login:    (data)  => request('POST', '/auth/login',    data),
      profile:  ()      => request('GET',  '/auth/profile'),
    },

    // Users
    users: {
      list:       (search)     => request('GET',  `/users${search ? '?search=' + encodeURIComponent(search) : ''}`),
      get:        (id)         => request('GET',  `/users/${id}`),
      update:     (id, data)   => request('PUT',  `/users/${id}`, data),
      avatar:     (formData)   => request('POST', '/users/avatar/upload', formData, true),
    },

    // Projects
    projects: {
      list:         ()          => request('GET',    '/projects'),
      create:       (data)      => request('POST',   '/projects', data),
      get:          (id)        => request('GET',    `/projects/${id}`),
      update:       (id, data)  => request('PUT',    `/projects/${id}`, data),
      delete:       (id)        => request('DELETE', `/projects/${id}`),
      addMember:    (id, data)  => request('POST',   `/projects/${id}/members`, data),
      removeMember: (id, uid)   => request('DELETE', `/projects/${id}/members/${uid}`),
    },

    // Tasks
    tasks: {
      list:   (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request('GET', `/tasks${q ? '?' + q : ''}`);
      },
      create: (data)        => request('POST',   '/tasks', data),
      get:    (id)          => request('GET',    `/tasks/${id}`),
      update: (id, data)    => request('PUT',    `/tasks/${id}`, data),
      delete: (id)          => request('DELETE', `/tasks/${id}`),
    },

    // Comments
    comments: {
      list:   (taskId) => request('GET',    `/comments/${taskId}`),
      create: (data)   => request('POST',   '/comments', data),
      update: (id, data) => request('PUT',  `/comments/${id}`, data),
      delete: (id)     => request('DELETE', `/comments/${id}`),
    },

    // Notifications
    notifications: {
      list:       ()   => request('GET', '/notifications'),
      markRead:   (id) => request('PUT', `/notifications/${id}/read`),
      markAllRead:()   => request('PUT', '/notifications/read-all'),
    },

    // Dashboard
    dashboard: {
      stats:      () => request('GET', '/dashboard/stats'),
      activities: (projectId) => request('GET', `/dashboard/activities${projectId ? '?project_id=' + projectId : ''}`),
    },
  };
})();
