<?php
require_once __DIR__ . '/../config/auth.php';

requireAdmin();

$db = getDB();

$totalUsers   = $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
$activeUsers  = $db->query('SELECT COUNT(*) FROM users WHERE is_active = 1')->fetchColumn();
$adminCount   = $db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
$totalTrades  = $db->query('SELECT COUNT(*) FROM orders')->fetchColumn();
$todayTrades  = $db->query("SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()")->fetchColumn();
$totalVolume  = $db->query('SELECT COALESCE(SUM(quantity * price), 0) FROM orders')->fetchColumn();
$platformCash = $db->query('SELECT COALESCE(SUM(usd_balance), 0) FROM balances')->fetchColumn();
$openPositions = $db->query('SELECT COUNT(*) FROM positions WHERE is_open = 1')->fetchColumn();

jsonResponse([
    'users' => [
        'total'  => (int)$totalUsers,
        'active' => (int)$activeUsers,
        'admins' => (int)$adminCount,
    ],
    'trades' => [
        'total'   => (int)$totalTrades,
        'today'   => (int)$todayTrades,
        'volume'  => (float)$totalVolume,
    ],
    'platform' => [
        'total_cash'     => (float)$platformCash,
        'open_positions' => (int)$openPositions,
    ],
]);
