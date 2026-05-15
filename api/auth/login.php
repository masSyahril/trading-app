<?php
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$email    = strtolower(trim($body['email'] ?? ''));
$password = $body['password'] ?? '';

if ($email === '' || $password === '') {
    jsonResponse(['error' => 'Email and password are required'], 400);
}

$db   = getDB();
$stmt = $db->prepare('SELECT id, username, email, password_hash, is_active FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Use a constant-time comparison to prevent timing attacks
if (!$user || !password_verify($password, $user['password_hash'])) {
    jsonResponse(['error' => 'Invalid email or password'], 401);
}

if (!$user['is_active']) {
    jsonResponse(['error' => 'Account is disabled — contact support'], 403);
}

// Update last_login
$db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

createSession((int)$user['id']);

jsonResponse([
    'message' => 'Login successful',
    'user'    => ['id' => $user['id'], 'username' => $user['username'], 'email' => $user['email']],
]);
