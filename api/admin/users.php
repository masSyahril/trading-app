<?php
require_once __DIR__ . '/../config/auth.php';

$admin = requireAdmin();
$db    = getDB();

switch ($_SERVER['REQUEST_METHOD']) {

    // GET — list all users with their stats
    case 'GET':
        $stmt = $db->query('
            SELECT
                u.id, u.username, u.email, u.role, u.is_active, u.last_login, u.created_at,
                COALESCE(b.usd_balance, 0)           AS balance,
                COALESCE(b.total_deposited, 0)       AS total_deposited,
                COUNT(DISTINCT o.id)                 AS total_orders,
                COUNT(DISTINCT CASE WHEN p.is_open = 1 THEN p.id END) AS open_positions
            FROM users u
            LEFT JOIN balances   b ON b.user_id = u.id
            LEFT JOIN orders     o ON o.user_id = u.id
            LEFT JOIN positions  p ON p.user_id = u.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        ');
        $users = $stmt->fetchAll();
        foreach ($users as &$u) {
            $u['balance']         = (float)$u['balance'];
            $u['total_deposited'] = (float)$u['total_deposited'];
            $u['total_orders']    = (int)$u['total_orders'];
            $u['open_positions']  = (int)$u['open_positions'];
            $u['is_active']       = (bool)$u['is_active'];
            $u['pnl']             = $u['balance'] - $u['total_deposited'];
        }
        jsonResponse(['users' => $users]);

    // POST — update a user's role or active status
    case 'POST':
        $body      = json_decode(file_get_contents('php://input'), true) ?? [];
        $targetId  = (int)($body['user_id'] ?? 0);
        $action    = $body['action'] ?? '';

        if (!$targetId) jsonResponse(['error' => 'user_id required'], 400);

        // Prevent admin from demoting themselves
        if ($targetId === (int)$admin['id'] && $action !== 'reset_balance') {
            jsonResponse(['error' => 'Cannot modify your own account role/status'], 403);
        }

        switch ($action) {
            case 'set_admin':
                $db->prepare("UPDATE users SET role = 'admin' WHERE id = ?")
                   ->execute([$targetId]);
                jsonResponse(['message' => 'User promoted to admin']);

            case 'set_user':
                $db->prepare("UPDATE users SET role = 'user' WHERE id = ?")
                   ->execute([$targetId]);
                jsonResponse(['message' => 'User demoted to user role']);

            case 'activate':
                $db->prepare('UPDATE users SET is_active = 1 WHERE id = ?')
                   ->execute([$targetId]);
                jsonResponse(['message' => 'User activated']);

            case 'deactivate':
                $db->prepare('UPDATE users SET is_active = 0 WHERE id = ?')
                   ->execute([$targetId]);
                // Kill all sessions for this user
                $db->prepare('DELETE FROM sessions WHERE user_id = ?')
                   ->execute([$targetId]);
                jsonResponse(['message' => 'User deactivated and sessions cleared']);

            case 'reset_balance':
                $db->prepare('UPDATE balances SET usd_balance = total_deposited WHERE user_id = ?')
                   ->execute([$targetId]);
                jsonResponse(['message' => 'Balance reset to starting amount']);

            default:
                jsonResponse(['error' => 'Unknown action'], 400);
        }

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
