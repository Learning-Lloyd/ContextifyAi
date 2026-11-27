<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSystemSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['settings' => [
            ['key' => 'registration_enabled', 'label' => 'Allow new registrations', 'value' => SystemSetting::boolean('registration_enabled', true)],
        ]]);
    }

    public function update(Request $request, string $key, AuditLogService $auditLogService): JsonResponse
    {
        abort_unless($key === 'registration_enabled', 404);
        $validated = $request->validate(['value' => ['required', 'boolean']]);
        $value = $validated['value'] ? '1' : '0';
        $setting = SystemSetting::updateOrCreate(['key' => $key], [
            'value' => $value,
            'updated_by' => $request->user()->id,
        ]);
        $auditLogService->log($request->user()->id, 'admin_system_setting_updated', $request, [
            'key' => $key,
            'value' => $value,
        ]);

        return response()->json(['message' => 'System setting updated.', 'setting' => [
            'key' => $setting->key,
            'value' => filter_var($setting->value, FILTER_VALIDATE_BOOL),
        ]]);
    }
}
