<?php
// Stock data via Yahoo Finance (no API key required)
// Usage:
//   /api/stocks.php?symbol=AAPL            -> returns JSON candles (daily, 5y)
//   /api/stocks.php?symbol=AAPL&latest=1   -> returns { last, prevClose, lastTime }

header('Content-Type: application/json');

$symbol = isset($_GET['symbol']) ? strtoupper(trim($_GET['symbol'])) : '';
$latest = isset($_GET['latest']) ? (int)$_GET['latest'] : 0;

if ($symbol === '') {
  http_response_code(400);
  echo json_encode(['error' => 'symbol is required']);
  exit;
}

$url = "https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}?range=5y&interval=1d";

$context = stream_context_create([
  'http' => [
    'method'          => 'GET',
    'header'          => implode("\r\n", [
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept: application/json',
      'Accept-Language: en-US,en;q=0.9',
    ]),
    'timeout'         => 15,
    'ignore_errors'   => true,
  ],
  'ssl' => [
    'verify_peer'      => false,
    'verify_peer_name' => false,
  ],
]);

$raw = @file_get_contents($url, false, $context);
if ($raw === false || $raw === '') {
  http_response_code(502);
  echo json_encode(['error' => 'Failed to fetch data from Yahoo Finance', 'symbol' => $symbol]);
  exit;
}

$data = json_decode($raw, true);
if (!$data || empty($data['chart']['result'][0])) {
  $msg = isset($data['chart']['error']['description']) ? $data['chart']['error']['description'] : 'No data';
  http_response_code(404);
  echo json_encode(['error' => $msg, 'symbol' => $symbol]);
  exit;
}

$result     = $data['chart']['result'][0];
$timestamps = $result['timestamp'] ?? [];
$quote      = $result['indicators']['quote'][0] ?? [];
$opens      = $quote['open']   ?? [];
$highs      = $quote['high']   ?? [];
$lows       = $quote['low']    ?? [];
$closes     = $quote['close']  ?? [];
$volumes    = $quote['volume'] ?? [];

$candles = [];
foreach ($timestamps as $i => $ts) {
  $o = isset($opens[$i])  ? $opens[$i]  : null;
  $h = isset($highs[$i])  ? $highs[$i]  : null;
  $l = isset($lows[$i])   ? $lows[$i]   : null;
  $c = isset($closes[$i]) ? $closes[$i] : null;
  if ($o === null || $h === null || $l === null || $c === null) continue;
  $candles[] = [
    'time'   => (int)$ts,
    'open'   => round((float)$o, 4),
    'high'   => round((float)$h, 4),
    'low'    => round((float)$l, 4),
    'close'  => round((float)$c, 4),
    'volume' => (int)(isset($volumes[$i]) ? $volumes[$i] : 0),
  ];
}

if ($latest === 1) {
  $n = count($candles);
  if ($n === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'No candles available', 'symbol' => $symbol]);
    exit;
  }
  $last = $candles[$n - 1]['close'];
  $prev = $n > 1 ? $candles[$n - 2]['close'] : $last;
  echo json_encode([
    'symbol'    => $symbol,
    'last'      => $last,
    'prevClose' => $prev,
    'lastTime'  => $candles[$n - 1]['time'],
  ]);
  exit;
}

echo json_encode([
  'symbol'  => $symbol,
  'candles' => $candles,
]);
