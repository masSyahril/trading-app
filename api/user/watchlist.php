<?php
require_once __DIR__ . '/../config/auth.php';

$user = requireAuth();
$db   = getDB();

switch ($_SERVER['REQUEST_METHOD']) {

    case 'GET':
        $stmt = $db->prepare('SELECT symbol, market_type, added_at FROM watchlist WHERE user_id = ? ORDER BY added_at DESC');
        $stmt->execute([$user['id']]);
        jsonResponse(['watchlist' => $stmt->fetchAll()]);

    case 'POST':
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $symbol = strtoupper(trim($body['symbol'] ?? ''));
        $type   = $body['market_type'] ?? 'crypto';

        if ($symbol === '')                              jsonResponse(['error' => 'Symbol required'], 400);
        if (strlen($symbol) > 20)                       jsonResponse(['error' => 'Symbol too long'], 400);
        if (!in_array($type, ['crypto','stock','taiwan'])) jsonResponse(['error' => 'Invalid market type'], 400);

        $db->prepare('INSERT IGNORE INTO watchlist (user_id, symbol, market_type) VALUES (?, ?, ?)')
           ->execute([$user['id'], $symbol, $type]);
        jsonResponse(['message' => 'Added to watchlist', 'symbol' => $symbol]);

    case 'DELETE':
        $symbol = strtoupper(trim($_GET['symbol'] ?? ''));
        if ($symbol === '') jsonResponse(['error' => 'Symbol required'], 400);

        $db->prepare('DELETE FROM watchlist WHERE user_id = ? AND symbol = ?')
           ->execute([$user['id'], $symbol]);
        jsonResponse(['message' => 'Removed from watchlist']);

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
