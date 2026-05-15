/**
 * Admin guard — include ONLY in admin pages.
 *
 * Usage: <script src="../../src/js/admin-guard.js"></script>
 *
 * Behaviour:
 *   - Not logged in  → redirect to /auth/login.html
 *   - Logged in as user (not admin) → redirect to /crypto-trading/index.html
 *   - Logged in as admin → sets window.currentUser / window.isAdmin, fires 'auth:ready'
 */
(function () {
  const scriptSrc  = document.currentScript?.src || '';
  const appBase    = scriptSrc.replace(/\/src\/js\/admin-guard\.js.*$/, '');

  const API_ME      = appBase + '/api/auth/me.php';
  const LOGIN_URL   = appBase + '/auth/login.html';
  const TRADING_URL = appBase + '/crypto-trading/index.html';

  async function checkAdmin() {
    try {
      const res = await fetch(API_ME, { credentials: 'include' });

      if (res.status === 401) { window.location.replace(LOGIN_URL);   return; }
      if (!res.ok)            { window.location.replace(LOGIN_URL);   return; }

      const data = await res.json();

      if (data.user?.role !== 'admin') {
        window.location.replace(TRADING_URL);
        return;
      }

      window.currentUser    = data.user;
      window.currentBalance = data.balance;
      window.isAdmin        = true;

      document.dispatchEvent(new CustomEvent('auth:ready', { detail: data }));

    } catch (_) {
      window.location.replace(LOGIN_URL);
    }
  }

  checkAdmin();
})();
