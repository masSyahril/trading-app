<?php
require_once __DIR__ . '/../config/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$user = requireAuth();

$stmt = getDB()->prepare('SELECT usd_balance FROM balances WHERE user_id = ?');
$stmt->execute([$user['id']]);
$balance = $stmt->fetch();

jsonResponse([
    'user'    => $user,
    'balance' => $balance ? (float)$balance['usd_balance'] : 100000.0,
]);
