<?php
require_once __DIR__ . '/../config/auth.php';

$user = requireAuth();
$db   = getDB();

switch ($_SERVER['REQUEST_METHOD']) {

    // ---- GET: list orders -----------------------------------------------
    case 'GET':
        $symbol = isset($_GET['symbol']) ? strtoupper(trim($_GET['symbol'])) : null;
        $limit  = min((int)($_GET['limit'] ?? 50), 200);

        if ($symbol) {
            $stmt = $db->prepare('SELECT * FROM orders WHERE user_id = ? AND symbol = ? ORDER BY created_at DESC LIMIT ?');
            $stmt->execute([$user['id'], $symbol, $limit]);
        } else {
            $stmt = $db->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?');
            $stmt->execute([$user['id'], $limit]);
        }

        $orders = $stmt->fetchAll();
        foreach ($orders as &$o) {
            $o['quantity'] = (float)$o['quantity'];
            $o['price']    = (float)$o['price'];
        }
        jsonResponse(['orders' => $orders]);

    // ---- POST: place paper order ----------------------------------------
    case 'POST':
        $body      = json_decode(file_get_contents('php://input'), true) ?? [];
        $symbol    = strtoupper(trim($body['symbol'] ?? ''));
        $side      = $body['side'] ?? '';
        $qty       = (float)($body['quantity'] ?? 0);
        $price     = (float)($body['price'] ?? 0);
        $orderType = in_array($body['order_type'] ?? 'market', ['market','limit']) ? $body['order_type'] : 'market';
        $market    = in_array($body['market_type'] ?? 'crypto', ['crypto','stock','taiwan']) ? $body['market_type'] : 'crypto';

        // Validate
        if ($symbol === '')                         jsonResponse(['error' => 'Symbol required'], 400);
        if (!in_array($side, ['buy','sell']))        jsonResponse(['error' => 'Side must be buy or sell'], 400);
        if ($qty  <= 0)                             jsonResponse(['error' => 'Quantity must be positive'], 400);
        if ($price <= 0)                            jsonResponse(['error' => 'Price must be positive'], 400);

        $db->beginTransaction();
        try {
            // Lock balance row
            $stmt = $db->prepare('SELECT usd_balance FROM balances WHERE user_id = ? FOR UPDATE');
            $stmt->execute([$user['id']]);
            $bal = $stmt->fetch();
            if (!$bal) throw new RuntimeException('Balance record missing');
            $balance = (float)$bal['usd_balance'];

            if ($side === 'buy') {
                $cost = $qty * $price;
                if ($balance < $cost) {
                    $db->rollBack();
                    jsonResponse(['error' => sprintf('Insufficient balance (need $%.2f, have $%.2f)', $cost, $balance)], 400);
                }
                $db->prepare('UPDATE balances SET usd_balance = usd_balance - ? WHERE user_id = ?')
                   ->execute([$cost, $user['id']]);

                // Upsert position (average down/up)
                $stmt = $db->prepare('SELECT id, quantity, avg_entry_price FROM positions WHERE user_id = ? AND symbol = ? AND is_open = 1 LIMIT 1');
                $stmt->execute([$user['id'], $symbol]);
                $pos = $stmt->fetch();

                if ($pos) {
                    $newQty = $pos['quantity'] + $qty;
                    $newAvg = (($pos['quantity'] * $pos['avg_entry_price']) + ($qty * $price)) / $newQty;
                    $db->prepare('UPDATE positions SET quantity = ?, avg_entry_price = ?, current_price = ? WHERE id = ?')
                       ->execute([$newQty, $newAvg, $price, $pos['id']]);
                } else {
                    $db->prepare('INSERT INTO positions (user_id, symbol, market_type, quantity, avg_entry_price, current_price) VALUES (?, ?, ?, ?, ?, ?)')
                       ->execute([$user['id'], $symbol, $market, $qty, $price, $price]);
                }

            } else { // sell
                $stmt = $db->prepare('SELECT id, quantity, avg_entry_price FROM positions WHERE user_id = ? AND symbol = ? AND is_open = 1 LIMIT 1');
                $stmt->execute([$user['id'], $symbol]);
                $pos = $stmt->fetch();

                if (!$pos || (float)$pos['quantity'] < $qty) {
                    $db->rollBack();
                    jsonResponse(['error' => 'Insufficient position to sell'], 400);
                }

                $realizedPnl = ($price - $pos['avg_entry_price']) * $qty;
                $proceeds    = $qty * $price;

                $db->prepare('UPDATE balances SET usd_balance = usd_balance + ? WHERE user_id = ?')
                   ->execute([$proceeds, $user['id']]);

                $remaining = (float)$pos['quantity'] - $qty;
                if ($remaining < 0.00000001) {
                    $db->prepare('UPDATE positions SET is_open = 0, closed_at = NOW(), close_price = ?, realized_pnl = realized_pnl + ?, quantity = 0 WHERE id = ?')
                       ->execute([$price, $realizedPnl, $pos['id']]);
                } else {
                    $db->prepare('UPDATE positions SET quantity = ?, current_price = ?, realized_pnl = realized_pnl + ? WHERE id = ?')
                       ->execute([$remaining, $price, $realizedPnl, $pos['id']]);
                }
            }

            // Record the order
            $stmt = $db->prepare('INSERT INTO orders (user_id, symbol, market_type, side, order_type, quantity, price, status, filled_at) VALUES (?, ?, ?, ?, ?, ?, ?, "filled", NOW())');
            $stmt->execute([$user['id'], $symbol, $market, $side, $orderType, $qty, $price]);
            $orderId = (int)$db->lastInsertId();

            $db->commit();

            // Return updated balance
            $stmt = $db->prepare('SELECT usd_balance FROM balances WHERE user_id = ?');
            $stmt->execute([$user['id']]);
            $newBal = (float)$stmt->fetchColumn();

            jsonResponse(['message' => 'Order filled', 'order_id' => $orderId, 'new_balance' => $newBal]);

        } catch (RuntimeException $e) {
            $db->rollBack();
            jsonResponse(['error' => $e->getMessage()], 400);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(['error' => 'Order failed — please try again'], 500);
        }

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
