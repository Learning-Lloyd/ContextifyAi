<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (config('admin.seeding_enabled')) {
            $this->call(AdminSeeder::class);
        }
    }
}
