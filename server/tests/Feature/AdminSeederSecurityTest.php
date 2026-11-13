<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class AdminSeederSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_seeding_is_disabled_unless_explicitly_enabled(): void
    {
        config(['admin.seeding_enabled' => false]);

        (new AdminSeeder())->run();

        $this->assertDatabaseCount('users', 0);
    }

    public function test_explicit_seeding_creates_an_admin_from_supplied_secure_settings(): void
    {
        config([
            'admin.seeding_enabled' => true,
            'admin.email' => 'admin-phase1@example.test',
            'admin.password' => 'test-only-long-password-123',
            'admin.name' => 'Phase One Admin',
        ]);

        (new AdminSeeder())->run();

        $admin = User::where('email', 'admin-phase1@example.test')->firstOrFail();
        $this->assertSame('admin', $admin->role);
        $this->assertTrue(Hash::check('test-only-long-password-123', $admin->password));
    }

    public function test_rerunning_admin_seeder_does_not_reset_existing_password(): void
    {
        config([
            'admin.seeding_enabled' => true,
            'admin.email' => 'admin-phase1@example.test',
            'admin.password' => 'test-only-long-password-123',
        ]);
        $existing = User::factory()->create([
            'email' => 'admin-phase1@example.test',
            'password' => Hash::make('existing-password-remains-456'),
            'role' => 'user',
        ]);

        (new AdminSeeder())->run();

        $existing->refresh();
        $this->assertSame('admin', $existing->role);
        $this->assertTrue(Hash::check('existing-password-remains-456', $existing->password));
        $this->assertFalse(Hash::check('test-only-long-password-123', $existing->password));
    }

    public function test_admin_seeding_rejects_missing_or_weak_credentials(): void
    {
        config([
            'admin.seeding_enabled' => true,
            'admin.email' => 'admin-phase1@example.test',
            'admin.password' => 'too-short',
        ]);

        $this->expectException(RuntimeException::class);
        (new AdminSeeder())->run();
    }
}
