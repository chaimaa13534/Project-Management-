/**
 * assets/js/modules/auth.js
 * Gestion de l'authentification côté client
 */

const Auth = (() => {
  const TOKEN_KEY = 'pf_token';
  const USER_KEY  = 'pf_user';

  let _user  = null;
  let _token = null;

  const save = (token, user) => {
    _token = token;
    _user  = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const clear = () => {
    _token = null;
    _user  = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const load = () => {
    _token = localStorage.getItem(TOKEN_KEY);
    try { _user = JSON.parse(localStorage.getItem(USER_KEY)); } catch {}
  };

  const isLoggedIn = () => !!_token && !!_user;

  const getUser  = () => _user;
  const getToken = () => _token;

  const updateUser = (data) => {
    _user = { ..._user, ...data };
    localStorage.setItem(USER_KEY, JSON.stringify(_user));
  };

  // Init state from storage
  load();

  return { save, clear, isLoggedIn, getUser, getToken, updateUser };
})();
