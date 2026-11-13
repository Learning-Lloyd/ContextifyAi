<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

Route::get('/reset-password/{token}', function (Request $request, string $token) {
    $frontend = rtrim(config('app.frontend_url'), '/');
    $query = http_build_query(['token' => $token, 'email' => $request->query('email')]);

    return redirect("{$frontend}/reset-password?{$query}");
})->name('password.reset');

Route::get('/{spaPath?}', function (Request $request) {
    $indexPath = public_path('index.html');
    abort_unless(is_file($indexPath), 503, 'The Contextify frontend has not been built.');
    $indexHtml = @file_get_contents($indexPath);
    abort_if($indexHtml === false, 503, 'The Contextify frontend could not be read.');

    return response($indexHtml, 200, [
        'Content-Type' => 'text/html; charset=UTF-8',
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
    ]);
})->where(
    'spaPath',
    '(?!api(?:/|$)|sanctum(?:/|$)|up(?:/|$)|storage(?:/|$)|contextify-assets(?:/|$)|build(?:/|$)|.*\\.[^/]+$).*'
)->name('spa.fallback');
