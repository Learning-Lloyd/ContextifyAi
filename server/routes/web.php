<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/reset-password/{token}', function (Request $request, string $token) {
    $frontend = rtrim(config('app.frontend_url'), '/');
    $query = http_build_query(['token' => $token, 'email' => $request->query('email')]);

    return redirect("{$frontend}/reset-password?{$query}");
})->name('password.reset');
