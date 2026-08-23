<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLogService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = User::query()->withCount(['tasks', 'decisionAnalyses']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $users = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'user' => $user->loadCount(['tasks', 'decisionAnalyses']),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:admin,user',
            'is_active' => 'sometimes|boolean',
        ]);

        $user->update($validated);
        $this->auditLogService->log($request->user()->id, 'admin_user_update', $request, ['target_user_id' => $user->id]);

        return response()->json(['message' => 'User updated', 'user' => $user->fresh()]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user->update(['password' => Hash::make($validated['password'])]);
        $this->auditLogService->log($request->user()->id, 'admin_password_reset', $request, ['target_user_id' => $user->id]);

        return response()->json(['message' => 'Password reset successfully']);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete your own account.'], 422);
        }

        $this->auditLogService->log($request->user()->id, 'admin_user_delete', $request, ['target_user_id' => $user->id]);
        $this->auditLogService->notifyAdmin('deleted_account', 'Account Deleted', "User {$user->email} was deleted by admin.", ['user_id' => $user->id]);

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function toggleActive(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot disable your own account.'], 422);
        }

        $user->update(['is_active' => ! $user->is_active]);
        $action = $user->is_active ? 'admin_user_enable' : 'admin_user_disable';
        $this->auditLogService->log($request->user()->id, $action, $request, ['target_user_id' => $user->id]);

        return response()->json([
            'message' => $user->is_active ? 'User enabled' : 'User disabled',
            'user' => $user,
        ]);
    }
}
