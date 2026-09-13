<?php
/**
 * PhantomChecker Webhook Telemetry Listener
 * 
 * Production-ready PHP script to receive, verify, and log hit dispatches from PhantomChecker.
 * Upload this file to your web server (Apache/Nginx/cPanel/VPS).
 */

header('Content-Type: application/json; charset=utf-8');

// Optional Shared Secret Token: Set in PhantomChecker Webhook headers as X-Phantom-Token
define('PHANTOM_AUTH_TOKEN', getenv('PHANTOM_AUTH_TOKEN') ?: 'phantom_secret_key_change_me');

// Ensure POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// Check authorization header if secret token is configured
$providedToken = $_SERVER['HTTP_X_PHANTOM_TOKEN'] ?? $_GET['token'] ?? '';
if (PHANTOM_AUTH_TOKEN !== 'phantom_secret_key_change_me' && $providedToken !== PHANTOM_AUTH_TOKEN) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Read raw JSON body
$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

if (!$payload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON Payload']);
    exit;
}

$sourceAccount = substr(htmlspecialchars($payload['sourceAccount'] ?? 'Unknown'), 0, 150);
$combo = substr(htmlspecialchars($payload['combo'] ?? $sourceAccount), 0, 180);
$note = substr(htmlspecialchars($payload['note'] ?? 'Hit Alert'), 0, 100);
$totalEmails = isset($payload['totalEmails']) ? (int)$payload['totalEmails'] : (isset($payload['emails']) && is_array($payload['emails']) ? count($payload['emails']) : 0);
$timestamp = date('Y-m-d H:i:s');

// Format structured log entry
$logEntry = [
    'time' => $timestamp,
    'source' => $sourceAccount,
    'combo' => $combo,
    'note' => $note,
    'email_count' => $totalEmails,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
];

if (!empty($payload['emails']) && is_array($payload['emails'])) {
    $logEntry['samples'] = [];
    foreach (array_slice($payload['emails'], 0, 5) as $email) {
        $logEntry['samples'][] = [
            'subject' => substr(htmlspecialchars($email['subject'] ?? 'No Subject'), 0, 120),
            'sender' => substr(htmlspecialchars($email['sender'] ?? $email['from'] ?? 'Unknown'), 0, 100),
            'targets' => $email['matchedTargets'] ?? []
        ];
    }
}

// Thread-safe append to daily log file
$logFileName = __DIR__ . '/phantom_hits_' . date('Y-m-d') . '.log';
$logLine = json_encode($logEntry, JSON_UNESCAPED_SLASHES) . PHP_EOL;

if (file_put_contents($logFileName, $logLine, FILE_APPEND | LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to write to log file']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Hit recorded successfully',
    'timestamp' => $timestamp,
    'receivedEmails' => $totalEmails
]);
