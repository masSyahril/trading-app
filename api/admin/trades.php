<?php
require_once __DIR__ . '/../config/auth.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$db    = getDB();
$limit = min((int)($_GET['limit'] ?? 50), 200);
$page  = max((int)($_GET['page']  ?? 1), 1);
$offset = ($page - 1) * $limit;

$total = $db->query('SELECT COUNT(*) FROM orders')->fetchColumn();

$stmt = $db->prepare('
    SELECT
        o.id, o.symbol, o.market_type, o.side, o.order_type,
        o.quantity, o.price, o.status, o.created_at,
        u.id AS user_id, u.username, u.role
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
');
$stmt->execute([$limit, $offset]);
$trades = $stmt->fetchAll();

foreach ($trades as &$t) {
    $t['quantity'] = (float)$t['quantity'];
    $t['price']    = (float)$t['price'];
    $t['value']    = round($t['quantity'] * $t['price'], 2);
}

jsonResponse([
    'trades' => $trades,
    'total'  => (int)$total,
    'page'   => $page,
    'limit'  => $limit,
    'pages'  => (int)ceil($total / $limit),
]);
