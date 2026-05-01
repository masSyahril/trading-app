<?php
// Simple stock data proxy using Stooq daily CSV (no API key required)
// Usage:
//   /api/stocks.php?symbol=AAPL            -> returns JSON candles (daily)
//   /api/stocks.php?symbol=AAPL&latest=1   -> returns { last, prevClose, lastTime }

header('Content-Type: application/json');

$symbol = isset($_GET['symbol']) ? strtoupper(trim($_GET['symbol'])) : '';
$latest = isset($_GET['latest']) ? (int)$_GET['latest'] : 0;

if ($symbol === '') {
  http_response_code(400);
  echo json_encode([ 'error' => 'symbol is required' ]);
  exit;
}

// Map to Stooq symbol format (US stocks use .us suffix)
// Stooq uses dashes for class shares (e.g., BRK-B). Normalize dots to dashes.
$symbolMap = [
  'BRK.B' => 'brk-b',
  'BRK.A' => 'brk-a',
  'BF.B'  => 'bf-b',
];
if (isset($symbolMap[$symbol])) {
  $stooqCore = $symbolMap[$symbol];
} else {
  $stooqCore = strtolower(str_replace('.', '-', $symbol));
}
$stooq = $stooqCore . '.us';
$url = "https://stooq.com/q/d/l/?s={$stooq}&i=d";

$context = stream_context_create([
  'http' => [
    'method' => 'GET',
    'header' => [
      'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
      'Accept: text/csv,application/json;q=0.9,*/*;q=0.8',
    ],
    'timeout' => 10,
  ],
]);

$csv = @file_get_contents($url, false, $context);
if ($csv === false || strlen($csv) === 0) {
  http_response_code(502);
  echo json_encode([ 'error' => 'Failed to fetch data from source', 'source' => $url ]);
  exit;
}

$lines = preg_split('/\r?\n/', trim($csv));
if (count($lines) <= 1) {
  http_response_code(404);
  echo json_encode([ 'error' => 'No data returned for symbol', 'symbol' => $symbol ]);
  exit;
}

// First row is header: Date,Open,High,Low,Close,Volume
$headers = str_getcsv($lines[0]);
$candleRows = array_slice($lines, 1);

$candles = [];
foreach ($candleRows as $row) {
  if (trim($row) === '') continue;
  $cols = str_getcsv($row);
  if (count($cols) < 5) continue;
  $dateStr = $cols[0];
  $open = (float)$cols[1];
  $high = (float)$cols[2];
  $low = (float)$cols[3];
  $close = (float)$cols[4];
  $vol = isset($cols[5]) ? (int)$cols[5] : 0;
  $ts = strtotime($dateStr . ' 16:00:00 America/New_York');
  if ($ts === false) $ts = strtotime($dateStr);
  $candles[] = [
    'time' => $ts,
    'open' => $open,
    'high' => $high,
    'low' => $low,
    'close' => $close,
    'volume' => $vol,
  ];
}

if ($latest === 1) {
  $n = count($candles);
  if ($n === 0) {
    http_response_code(404);
    echo json_encode([ 'error' => 'No candles for latest', 'symbol' => $symbol ]);
    exit;
  }
  $last = $candles[$n - 1]['close'];
  $prev = $n > 1 ? $candles[$n - 2]['close'] : $last;
  echo json_encode([
    'symbol' => $symbol,
    'last' => $last,
    'prevClose' => $prev,
    'lastTime' => $candles[$n - 1]['time'],
  ]);
  exit;
}

echo json_encode([
  'symbol' => $symbol,
  'candles' => $candles,
]);
