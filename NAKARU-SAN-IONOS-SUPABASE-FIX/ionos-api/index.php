<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$dataDir = __DIR__ . '/../ionos-data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}

function json_response(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function read_json(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function db_path(string $name): string {
    global $dataDir;
    return $dataDir . '/' . $name . '.json';
}

function db_read(string $name, array $default): array {
    $path = db_path($name);
    if (!file_exists($path)) {
        file_put_contents($path, json_encode($default, JSON_PRETTY_PRINT));
        return $default;
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : $default;
}

function db_write(string $name, array $data): void {
    file_put_contents(db_path($name), json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
}

function seed_messages(): array {
    $now = round(microtime(true) * 1000);
    return [
        'Moonlit Lounge' => [
            ['id' => uniqid('', true), 'from' => 'Ami', 'text' => 'The soundtrack has no business being this good.', 'at' => $now],
            ['id' => uniqid('', true), 'from' => 'Kairo', 'text' => 'Anyone staying for co-op after the episode?', 'at' => $now],
            ['id' => uniqid('', true), 'from' => 'Mina', 'text' => 'New here. This room already feels comfortable.', 'at' => $now],
            ['id' => uniqid('', true), 'from' => 'Sora', 'text' => 'Spoiler shield saved me twice tonight.', 'at' => $now],
        ],
        'Raid After Credits' => [],
        'Classic Mecha Night' => []
    ];
}

function seed_feed(): array {
    $now = round(microtime(true) * 1000);
    return [
        ['id' => uniqid('', true), 'from' => 'Ami', 'text' => "Tonight's watch party is spoiler-safe. Drop your favorite opening themes.", 'youtubeUrl' => '', 'image' => '', 'at' => $now - 18000, 'appropriate' => true],
        ['id' => uniqid('', true), 'from' => 'RaeArcade', 'text' => 'Raid After Credits is open after the episode. Bring your builds.', 'youtubeUrl' => '', 'image' => '', 'at' => $now - 10000, 'appropriate' => true],
    ];
}

function seed_dms(): array {
    $now = round(microtime(true) * 1000);
    return [
        'RaeArcade' => [
            ['id' => uniqid('', true), 'from' => 'RaeArcade', 'text' => 'You joining the raid after credits?', 'at' => $now],
            ['id' => uniqid('', true), 'from' => 'YukiKaze', 'text' => 'Yes. Save me a slot.', 'at' => $now],
        ],
        'NovaOnigiri' => [],
        'KuroQuest' => []
    ];
}

function public_account(array $account): array {
    return ['id' => $account['id'], 'username' => $account['username'], 'email' => $account['email']];
}

function current_account(): ?array {
    $sessionId = $_COOKIE['nakaru_session'] ?? '';
    if (!$sessionId) return null;
    $sessions = db_read('sessions', []);
    $accounts = db_read('accounts', []);
    $accountId = $sessions[$sessionId] ?? '';
    foreach ($accounts as $account) {
        if (($account['id'] ?? '') === $accountId) return $account;
    }
    return null;
}

function is_appropriate(string $text): bool {
    $blocked = ['hate', 'slur', 'nsfw', 'porn', 'kill yourself'];
    $clean = strtolower($text);
    foreach ($blocked as $word) {
        if (str_contains($clean, $word)) return false;
    }
    return true;
}

function extract_youtube_url(string $text): string {
    if (preg_match('/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s]+/i', $text, $matches)) {
        return $matches[0];
    }
    return '';
}

function google_links(string $query): array {
    return [
        'googleImages' => 'https://www.google.com/search?tbm=isch&q=' . rawurlencode($query . ' anime character reference'),
        'googleSearch' => 'https://www.google.com/search?q=' . rawurlencode($query . ' anime forum discussion')
    ];
}

$path = trim($_GET['path'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];

if ($path === 'auth/me' && $method === 'GET') {
    $account = current_account();
    json_response(200, ['account' => $account ? public_account($account) : null]);
}

if ($path === 'auth/signup' && $method === 'POST') {
    $body = read_json();
    $username = trim($body['username'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    if (strlen($username) < 3) json_response(400, ['error' => 'Username must be at least 3 characters.']);
    if (!str_contains($email, '@')) json_response(400, ['error' => 'Enter a valid email.']);
    if (strlen($password) < 8) json_response(400, ['error' => 'Password must be at least 8 characters.']);

    $accounts = db_read('accounts', []);
    foreach ($accounts as $account) {
        if (($account['email'] ?? '') === $email) json_response(409, ['error' => 'An account already exists for that email.']);
    }

    $account = ['id' => uniqid('', true), 'username' => $username, 'email' => $email, 'passwordHash' => password_hash($password, PASSWORD_DEFAULT)];
    $accounts[] = $account;
    db_write('accounts', $accounts);
    $sessions = db_read('sessions', []);
    $sessionId = uniqid('', true);
    $sessions[$sessionId] = $account['id'];
    db_write('sessions', $sessions);
    setcookie('nakaru_session', $sessionId, time() + 2592000, '/', '', true, true);
    json_response(201, ['account' => public_account($account)]);
}

if ($path === 'auth/login' && $method === 'POST') {
    $body = read_json();
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $accounts = db_read('accounts', []);
    foreach ($accounts as $account) {
        if (($account['email'] ?? '') === $email && password_verify($password, $account['passwordHash'] ?? '')) {
            $sessions = db_read('sessions', []);
            $sessionId = uniqid('', true);
            $sessions[$sessionId] = $account['id'];
            db_write('sessions', $sessions);
            setcookie('nakaru_session', $sessionId, time() + 2592000, '/', '', true, true);
            json_response(200, ['account' => public_account($account)]);
        }
    }
    json_response(401, ['error' => 'Email or password is incorrect.']);
}

if ($path === 'auth/logout' && $method === 'POST') {
    $sessions = db_read('sessions', []);
    unset($sessions[$_COOKIE['nakaru_session'] ?? '']);
    db_write('sessions', $sessions);
    setcookie('nakaru_session', '', time() - 3600, '/', '', true, true);
    json_response(200, ['ok' => true]);
}

if (preg_match('/^auth\/oauth\/([^\/]+)$/', $path, $matches) && $method === 'GET') {
    json_response(501, [
        'error' => ucfirst($matches[1]) . ' login needs OAuth app credentials and provider setup on IONOS.',
        'provider' => $matches[1]
    ]);
}

if ($path === 'feed' && $method === 'GET') {
    $posts = array_values(array_filter(db_read('feed', seed_feed()), fn($post) => $post['appropriate'] ?? false));
    usort($posts, fn($a, $b) => ($b['at'] ?? 0) <=> ($a['at'] ?? 0));
    json_response(200, ['posts' => $posts]);
}

if ($path === 'feed' && $method === 'POST') {
    $body = read_json();
    $text = trim($body['text'] ?? '');
    $image = $body['image'] ?? '';
    if ($text === '' && $image === '') json_response(400, ['error' => 'Post cannot be empty']);
    $posts = db_read('feed', seed_feed());
    $appropriate = is_appropriate($text);
    $post = ['id' => uniqid('', true), 'from' => $body['from'] ?? 'YukiKaze', 'text' => $text ?: 'Shared an image.', 'youtubeUrl' => extract_youtube_url($text), 'image' => $image, 'at' => round(microtime(true) * 1000), 'appropriate' => $appropriate];
    $posts[] = $post;
    db_write('feed', $posts);
    json_response($appropriate ? 201 : 202, ['post' => $post, 'visible' => $appropriate]);
}

if ($path === 'search' && $method === 'GET') {
    $q = trim($_GET['q'] ?? '');
    json_response(200, ['query' => $q, 'images' => [], 'posts' => [], 'googleConfigured' => false, 'links' => google_links($q)]);
}

if ($path === 'presence' && $method === 'POST') {
    $body = read_json();
    $users = db_read('presence', []);
    $id = $body['userId'] ?? uniqid('', true);
    $room = $body['room'] ?? 'Moonlit Lounge';
    $users[$id] = ['id' => $id, 'name' => $body['name'] ?? 'YukiKaze', 'room' => $room, 'lastSeen' => time()];
    foreach ($users as $key => $user) {
        if (($user['lastSeen'] ?? 0) < time() - 15) unset($users[$key]);
    }
    db_write('presence', $users);
    $roomCount = count(array_filter($users, fn($user) => ($user['room'] ?? '') === $room));
    json_response(200, ['userId' => $id, 'total' => count($users), 'room' => $room, 'roomCount' => $roomCount, 'users' => array_values($users)]);
}

if ($path === 'messages' && $method === 'GET') {
    $room = $_GET['room'] ?? 'Moonlit Lounge';
    $messages = db_read('messages', seed_messages());
    json_response(200, ['room' => $room, 'messages' => $messages[$room] ?? [], 'roomCount' => 0]);
}

if ($path === 'messages' && $method === 'POST') {
    $body = read_json();
    $room = $body['room'] ?? 'Moonlit Lounge';
    $text = trim($body['text'] ?? '');
    if ($text === '') json_response(400, ['error' => 'Message cannot be empty']);
    $messages = db_read('messages', seed_messages());
    $message = ['id' => uniqid('', true), 'from' => $body['from'] ?? 'YukiKaze', 'text' => $text, 'at' => round(microtime(true) * 1000)];
    $messages[$room] = $messages[$room] ?? [];
    $messages[$room][] = $message;
    db_write('messages', $messages);
    json_response(201, ['message' => $message]);
}

if ($path === 'dm' && $method === 'GET') {
    $thread = $_GET['thread'] ?? 'RaeArcade';
    $dms = db_read('dms', seed_dms());
    json_response(200, ['thread' => $thread, 'messages' => $dms[$thread] ?? []]);
}

if ($path === 'dm' && $method === 'POST') {
    $body = read_json();
    $thread = $body['thread'] ?? 'RaeArcade';
    $text = trim($body['text'] ?? '');
    if ($text === '') json_response(400, ['error' => 'Message cannot be empty']);
    $dms = db_read('dms', seed_dms());
    $message = ['id' => uniqid('', true), 'from' => $body['from'] ?? 'YukiKaze', 'text' => $text, 'at' => round(microtime(true) * 1000)];
    $dms[$thread] = $dms[$thread] ?? [];
    $dms[$thread][] = $message;
    db_write('dms', $dms);
    json_response(201, ['message' => $message]);
}

if ($path === 'calls' && $method === 'GET') {
    $callId = $_GET['callId'] ?? 'RaeArcade';
    $since = (int) ($_GET['since'] ?? 0);
    $signals = db_read('calls', []);
    $items = array_values(array_filter($signals[$callId] ?? [], fn($signal) => ($signal['at'] ?? 0) > $since));
    json_response(200, ['callId' => $callId, 'signals' => $items]);
}

if ($path === 'calls' && $method === 'POST') {
    $body = read_json();
    $callId = $body['callId'] ?? 'RaeArcade';
    $signals = db_read('calls', []);
    $signal = ['id' => uniqid('', true), 'callId' => $callId, 'from' => $body['from'] ?? 'YukiKaze', 'type' => $body['type'] ?? '', 'payload' => $body['payload'] ?? null, 'at' => round(microtime(true) * 1000)];
    $signals[$callId] = array_slice(array_merge($signals[$callId] ?? [], [$signal]), -100);
    db_write('calls', $signals);
    json_response(201, ['signal' => $signal]);
}

json_response(404, ['error' => 'Not found']);
