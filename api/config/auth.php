<?php
require_once __DIR__ . '/database.php';

const SESSION_COOKIE  = 'trading_session';
const SESSION_EXPIRY  = 7 * 24 * 3600; // 7 days

// ----------------------------------------------------------------
// Session management
// ----------------------------------------------------------------

function createSession(int $userId): void {
    $token     = bin2hex(random_bytes(32));          // 64-char hex token
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_EXPIRY);

    $db = getDB();
    // Prune expired sessions for this user before creating a new one
    $db->prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < NOW()')
       ->execute([$userId]);

    $db->prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
       ->execute([$token, $userId, $expiresAt]);

    setcookie(SESSION_COOKIE, $token, [
        'expires'  => time() + SESSION_EXPIRY,
        'path'     => '/',
        'httponly' => true,   // not readable by JS — prevents XSS token theft
        'samesite' => 'Lax',
        'secure'   => !empty($_SERVER['HTTPS']),
    ]);
}

function getSessionUser(): ?array {
    $token = $_COOKIE[SESSION_COOKIE] ?? null;
    if (!$token || strlen($token) !== 64) return null;

    $stmt = getDB()->prepare('
        SELECT u.id, u.username, u.email, u.role, u.created_at
        FROM   sessions s
        JOIN   users u ON u.id = s.user_id
        WHERE  s.id = ?
          AND  s.expires_at > NOW()
          AND  u.is_active = 1
    ');
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

function deleteSession(): void {
    $token = $_COOKIE[SESSION_COOKIE] ?? null;
    if (!$token) return;

    getDB()->prepare('DELETE FROM sessions WHERE id = ?')->execute([$token]);

    setcookie(SESSION_COOKIE, '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => !empty($_SERVER['HTTPS']),
    ]);
}

// ----------------------------------------------------------------
// Guards & helpers
// ----------------------------------------------------------------

/** Call at the top of any protected endpoint. Returns the user row or exits 401. */
function requireAuth(): array {
    header('Content-Type: application/json');
    $user = getSessionUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }
    return $user;
}

/** Call at the top of admin-only endpoints. Returns the user row or exits 401/403. */
function requireAdmin(): array {
    header('Content-Type: application/json');
    $user = getSessionUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required']);
        exit;
    }
    return $user;
}

/** Send JSON response and exit. */
function jsonResponse(array $data, int $code = 200): void {
    header('Content-Type: application/json');
    http_response_code($code);
    echo json_encode($data);
    exit;
}
