<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLogService)
    {
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'user',
            'is_active' => true,
        ]);

        $this->auditLogService->log($user->id, 'user_registered', $request, ['email' => $user->email]);
        $this->auditLogService->notifyAdmin('new_user', 'New User Registered', "{$user->name} ({$user->email}) registered.", ['user_id' => $user->id]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful',
            'user' => $this->formatUser($user),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($validated)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => ['Your account has been disabled.'],
            ]);
        }

        $user->update(['last_login_at' => now()]);
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->auditLogService->log($user->id, 'user_login', $request);

        return response()->json([
            'message' => 'Login successful',
            'user' => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auditLogService->log($request->user()->id, 'user_logout', $request);
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUser($request->user()),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'city' => 'nullable|string|max:255',
            'city_latitude' => 'nullable|numeric|between:-90,90',
            'city_longitude' => 'nullable|numeric|between:-180,180',
        ]);

        if (array_key_exists('city', $validated) && empty($validated['city'])) {
            $validated['city_latitude'] = null;
            $validated['city_longitude'] = null;
        }

        $request->user()->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $this->formatUser($request->user()->fresh()),
        ]);
    }

    private function formatUser(User $user): array
    {
        return $user->only([
            'id',
            'name',
            'email',
            'role',
            'is_active',
            'last_login_at',
            'city',
            'city_latitude',
            'city_longitude',
            'created_at',
        ]);
    }
}
