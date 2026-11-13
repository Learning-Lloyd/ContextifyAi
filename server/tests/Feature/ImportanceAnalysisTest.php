<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AiClient;
use App\Services\ImportanceAnalysisService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ImportanceAnalysisTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'ai.enabled' => true,
            'ai.api_key' => 'test-api-key',
            'ai.provider' => 'gemini',
            'ai.base_url' => 'https://gemini.test/v1beta',
            'ai.model' => 'gemini-3.8-flash',
            'ai.timeout' => 30,
        ]);
    }

    public function test_ai_client_reports_configured_when_api_key_is_present(): void
    {
        $client = app(AiClient::class);

        $this->assertTrue($client->isConfigured());
    }

    public function test_importance_analysis_calls_ai_and_returns_structured_result(): void
    {
        Http::fake([
            'https://gemini.test/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => json_encode([
                            'importance' => 9,
                            'confidence' => 88,
                            'reason' => 'This capstone chapter is a major academic milestone with high consequences if delayed.',
                        ])]]]]],
            ]),
        ]);

        $service = app(ImportanceAnalysisService::class);
        $result = $service->analyze(
            'Finish Capstone Chapter 3',
            'Complete the literature review section before the advisor meeting next week.'
        );

        $this->assertSame('ai', $result['source']);
        $this->assertSame(9, $result['importance']);
        $this->assertSame(88, $result['confidence']);
        $this->assertNotEmpty($result['reason']);

        Http::assertSent(function ($request) {
            $body = $request->data();

            return str_contains($request->url(), ':generateContent')
                && ($body['contents'][0]['parts'][0]['text'] ?? '') !== ''
                && str_contains($body['contents'][0]['parts'][0]['text'], 'Finish Capstone Chapter 3')
                && str_contains($body['contents'][0]['parts'][0]['text'], 'literature review');
        });
    }

    public function test_analyze_importance_endpoint_returns_ai_structured_response(): void
    {
        Http::fake([
            'https://gemini.test/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => json_encode([
                            'importance' => 8,
                            'confidence' => 82,
                            'reason' => 'Final exam preparation has significant academic impact.',
                        ])]]]]],
            ]),
        ]);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/tasks/analyze-importance', [
            'title' => 'Study for Final Exam',
            'description' => 'Review all chapters and practice problems before the exam next week.',
        ]);

        $response->assertOk();
        $analysis = $response->json('analysis');

        $this->assertSame('ai', $analysis['source']);
        $this->assertSame(8, $analysis['importance']);
        $this->assertSame(82, $analysis['confidence']);
        $this->assertNotEmpty($analysis['reason']);
    }

    public function test_importance_analysis_falls_back_to_heuristic_when_ai_is_not_configured(): void
    {
        config(['ai.api_key' => null]);

        $service = app(ImportanceAnalysisService::class);
        $result = $service->analyze('Study for Final Exam', 'Prepare for the final exam next week.');

        $this->assertSame('heuristic', $result['source']);
        $this->assertGreaterThanOrEqual(1, $result['importance']);
        $this->assertLessThanOrEqual(10, $result['importance']);
    }

    public function test_importance_analysis_falls_back_to_heuristic_when_ai_request_fails(): void
    {
        Http::fake([
            'https://gemini.test/*' => Http::response('Service unavailable', 503),
        ]);

        $service = app(ImportanceAnalysisService::class);
        $result = $service->analyze('Study for Final Exam', 'Prepare for the final exam next week.');

        $this->assertSame('heuristic', $result['source']);
    }

    public function test_importance_analysis_rejects_out_of_range_or_incomplete_ai_factor_instead_of_clamping_it(): void
    {
        Http::fake([
            'https://gemini.test/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => '{"importance":99,"confidence":80,"reason":"Invalid value."}']]]]],
            ]),
        ]);

        $result = app(ImportanceAnalysisService::class)->analyze('Study for final exam');

        $this->assertSame('heuristic', $result['source']);
        $this->assertGreaterThanOrEqual(1, $result['importance']);
        $this->assertLessThanOrEqual(10, $result['importance']);
    }

    public function test_generate_description_expands_user_notes_without_creating_a_score(): void
    {
        Http::fake([
            'https://gemini.test/*' => Http::response([
                'candidates' => [[
                    'content' => [
                        'parts' => [[
                            'text' => '{"description":"Review the assigned chapters and prepare concise notes for the study session."}',
                        ]],
                    ],
                ]],
            ]),
        ]);
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/tasks/generate-description', [
            'title' => 'Prepare for study group',
            'description' => 'Read chapters 2 and 3',
        ]);

        $response->assertOk()->assertJsonStructure(['description']);
        $this->assertStringContainsString('chapters', $response->json('description'));
        $this->assertArrayNotHasKey('priority_score', $response->json());
    }

    public function test_generate_description_reports_unconfigured_provider(): void
    {
        config(['ai.api_key' => null]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/tasks/generate-description', ['title' => 'Prepare for study group'])
            ->assertStatus(503)
            ->assertJsonStructure(['message']);
    }
}
