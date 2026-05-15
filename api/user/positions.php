<?php
require_once __DIR__ . '/../config/auth.php';

$user = requireAuth();
$db   = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$onlyOpen = !isset($_GET['all']);

if ($onlyOpen) {
    $stmt = $db->prepare('SELECT * FROM positions WHERE user_id = ? AND is_open = 1 ORDER BY opened_at DESC');
} else {
    $stmt = $db->prepare('SELECT * FROM positions WHERE user_id = ? ORDER BY opened_at DESC LIMIT 200');
}
$stmt->execute([$user['id']]);
$positions = $stmt->fetchAll();

// Cast numeric fields
foreach ($positions as &$p) {
    $p['quantity']        = (float)$p['quantity'];
    $p['avg_entry_price'] = (float)$p['avg_entry_price'];
    $p['current_price']   = (float)$p['current_price'];
    $p['realized_pnl']    = (float)$p['realized_pnl'];
    $p['is_open']         = (bool)$p['is_open'];
}

$stmt = $db->prepare('SELECT usd_balance FROM balances WHERE user_id = ?');
$stmt->execute([$user['id']]);
$bal = $stmt->fetch();

jsonResponse([
    'positions' => $positions,
    'balance'   => $bal ? (float)$bal['usd_balance'] : 0.0,
]);
