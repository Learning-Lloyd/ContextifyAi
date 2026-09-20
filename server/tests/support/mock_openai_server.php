<?php

$uri = $_SERVER['REQUEST_URI'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST' && str_contains($uri, '/chat/completions')) {
    $input = json_decode(file_get_contents('php://input'), true);
    $userContent = $input['messages'][1]['content'] ?? '';

    header('Content-Type: application/json');
    echo json_encode([
        'choices' => [[
            'message' => [
                'content' => json_encode([
                    'importance' => str_contains(strtolower($userContent), 'capstone') ? 9 : 7,
                    'confidence' => 90,
                    'reason' => 'Mock AI analyzed task title and description successfully.',
                ]),
            ],
        ]],
    ]);

    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
