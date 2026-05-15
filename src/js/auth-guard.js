/**
 * Auth guard — include in every protected page (user AND admin).
 *
 * Usage: <script src="../src/js/auth-guard.js"></script>
 *
 * Sets: window.currentUser  { id, username, email, role, created_at }
 *       window.currentBalance (number)
 *       window.isAdmin       (boolean)
 *
 * Fires: CustomEvent 'auth:ready' on document with detail = { user, balance }
 */
(function () {
  const scriptSrc = document.currentScript?.src || '';
  const appBase   = scriptSrc.replace(/\/src\/js\/auth-guard\.js.*$/, '');

  const API_ME    = appBase + '/api/auth/me.php';
  const LOGIN_URL = appBase + '/auth/login.html';

  async function checkAuth() {
    try {
      const res = await fetch(API_ME, { credentials: 'include' });

      if (res.status === 401) { window.location.replace(LOGIN_URL); return; }
      if (!res.ok)            { window.location.replace(LOGIN_URL); return; }

      const data = await res.json();

      window.currentUser    = data.user;
      window.currentBalance = data.balance;
      window.isAdmin        = data.user?.role === 'admin';

      document.dispatchEvent(new CustomEvent('auth:ready', { detail: data }));

    } catch (_) {
      window.location.replace(LOGIN_URL);
    }
  }

  checkAuth();
})();
