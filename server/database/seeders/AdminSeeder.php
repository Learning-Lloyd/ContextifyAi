<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        if (! config('admin.seeding_enabled')) {
            return;
        }

        $adminEmail = config('admin.email');
        $adminPassword = config('admin.password');
        $adminName = config('admin.name', 'Contextify Administrator');

        if (! is_string($adminEmail) || ! filter_var($adminEmail, FILTER_VALIDATE_EMAIL)
            || ! is_string($adminPassword) || strlen($adminPassword) < 16) {
            throw new RuntimeException('Admin seeding requires ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters.');
        }

        $admin = User::where('email', $adminEmail)->first();

        if (! $admin) {
            User::create([
                'name' => $adminName,
                'email' => $adminEmail,
                'password' => Hash::make($adminPassword),
                'role' => 'admin',
                'is_active' => true,
            ]);
            return;
        }

        // Never reset an existing account's password merely because seeding ran again.
        $admin->update(['role' => 'admin', 'is_active' => true]);
    }
}
