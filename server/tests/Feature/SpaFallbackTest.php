<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpaFallbackTest extends TestCase
{
    use RefreshDatabase;

    private string $spaIndexPath;

    private bool $createdTemporarySpaIndex = false;

    protected function setUp(): void
    {
        parent::setUp();

        $this->spaIndexPath = public_path('index.html');
        if (! is_file($this->spaIndexPath)) {
            file_put_contents($this->spaIndexPath, '<!-- CONTEXTIFY SPA ENTRY -->');
            $this->createdTemporarySpaIndex = true;
        }
    }

    protected function tearDown(): void
    {
        if ($this->createdTemporarySpaIndex && is_file($this->spaIndexPath)) {
            unlink($this->spaIndexPath);
        }

        parent::tearDown();
    }

    public function test_root_and_frontend_routes_serve_the_react_entry(): void
    {
        $this->get('/')->assertOk()->assertSee('CONTEXTIFY SPA ENTRY');
        $this->get('/dashboard')->assertOk()->assertSee('CONTEXTIFY SPA ENTRY');
        $this->get('/tasks/42')->assertOk()->assertSee('CONTEXTIFY SPA ENTRY');
        $this->get('/decision-lab')->assertOk()->assertSee('CONTEXTIFY SPA ENTRY');
        $this->get('/decision-insights')->assertOk()->assertSee('CONTEXTIFY SPA ENTRY');
    }

    public function test_api_and_health_routes_are_not_captured_by_the_spa_fallback(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
        $this->getJson('/api/not-a-real-route')->assertNotFound();
        $this->get('/up')->assertOk();
    }

    public function test_missing_static_assets_remain_not_found(): void
    {
        $this->get('/contextify-assets/missing.js')->assertNotFound();
        $this->get('/missing-image.svg')->assertNotFound();
    }

    public function test_existing_password_reset_redirect_is_preserved(): void
    {
        config(['app.frontend_url' => 'https://contextify.example']);

        $this->get('/reset-password/reset-token?email=student%40example.com')
            ->assertRedirect('https://contextify.example/reset-password?token=reset-token&email=student%40example.com');
    }
}
