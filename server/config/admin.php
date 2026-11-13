<?php

return [
    'seeding_enabled' => (bool) env('ADMIN_SEED_ENABLED', false),
    'email' => env('ADMIN_EMAIL'),
    'password' => env('ADMIN_PASSWORD'),
    'name' => env('ADMIN_NAME', 'Contextify Administrator'),
];
