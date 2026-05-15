<?php
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$username = trim($body['username'] ?? '');
$email    = strtolower(trim($body['email'] ?? ''));
$password = $body['password'] ?? '';

// --- Validate ---
if ($username === '' || $email === '' || $password === '') {
    jsonResponse(['error' => 'Username, email, and password are required'], 400);
}
if (strlen($username) < 3 || strlen($username) > 50) {
    jsonResponse(['error' => 'Username must be 3–50 characters'], 400);
}
if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    jsonResponse(['error' => 'Username may only contain letters, numbers, and underscores'], 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['error' => 'Invalid email address'], 400);
}
if (strlen($password) < 8) {
    jsonResponse(['error' => 'Password must be at least 8 characters'], 400);
}

$db = getDB();

// --- Check uniqueness ---
$stmt = $db->prepare('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1');
$stmt->execute([$email, $username]);
if ($stmt->fetch()) {
    jsonResponse(['error' => 'Email or username already taken'], 409);
}

// --- Create user ---
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
$db->prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
   ->execute([$username, $email, $hash]);
$userId = (int)$db->lastInsertId();

// --- Seed balance: $100,000 paper money ---
$db->prepare('INSERT INTO balances (user_id, usd_balance, total_deposited) VALUES (?, 100000.00, 100000.00)')
   ->execute([$userId]);

// --- Auto-login ---
createSession($userId);

jsonResponse([
    'message' => 'Account created successfully',
    'user'    => ['id' => $userId, 'username' => $username, 'email' => $email],
], 201);
