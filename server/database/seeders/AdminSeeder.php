<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $adminEmail = env('ADMIN_EMAIL', 'admin@contextify.ai');
        $adminPassword = env('ADMIN_PASSWORD', 'password123');
        $adminName = env('ADMIN_NAME', 'Admin User');

        // Check whether the admin account already exists
        $admin = User::where('email', $adminEmail)->first();

        if (! $admin) {
            // Create admin user if it does not exist
            User::create([
                'name' => $adminName,
                'email' => $adminEmail,
                'password' => Hash::make($adminPassword),
                'role' => 'admin',
                'is_active' => true,
            ]);
        } else {
            // Update/ensure the administrator role and active status
            $admin->update([
                'role' => 'admin',
                'is_active' => true,
                // Ensure password hash is valid
                'password' => Hash::make($adminPassword),
            ]);
        }
    }
}
