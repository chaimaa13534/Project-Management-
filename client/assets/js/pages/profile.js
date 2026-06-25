/**
 * assets/js/pages/profile.js
 * Page profil utilisateur — modification et upload avatar
 */

const ProfilePage = (() => {

  const load = () => {
    const user = Auth.getUser();
    if (!user) return;

    UI.setAvatarEl(document.getElementById('profile-avatar'), user);
    document.getElementById('profile-fullname').textContent = `${user.firstname} ${user.lastname}`;
    document.getElementById('profile-role').textContent     = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    document.getElementById('edit-firstname').value = user.firstname || '';
    document.getElementById('edit-lastname').value  = user.lastname  || '';
    document.getElementById('edit-username').value  = user.username  || '';
    document.getElementById('edit-email').value     = user.email     || '';
    document.getElementById('edit-password').value  = '';
  };

  const saveProfile = async () => {
    const body = {
      firstname: document.getElementById('edit-firstname').value.trim(),
      lastname:  document.getElementById('edit-lastname').value.trim(),
      username:  document.getElementById('edit-username').value.trim(),
    };
    const password = document.getElementById('edit-password').value;
    if (password) body.password = password;

    try {
      const user = Auth.getUser();
      const { data } = await API.users.update(user.id, body);
      Auth.updateUser(data);
      load();
      updateTopbar();
      UI.toast('Profil mis à jour', 'success');
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const { data } = await API.users.avatar(formData);
      Auth.updateUser({ avatar: data.avatar });
      load();
      updateTopbar();
      UI.toast('Avatar mis à jour', 'success');
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  };

  const updateTopbar = () => {
    const user = Auth.getUser();
    document.getElementById('topbar-name').textContent = `${user.firstname} ${user.lastname}`;
    UI.setAvatarEl(document.getElementById('topbar-avatar'), user);
  };

  const init = () => {
    document.getElementById('btn-save-profile')?.addEventListener('click', saveProfile);
    document.getElementById('avatar-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) uploadAvatar(file);
    });
  };

  return { load, init, updateTopbar };
})();
