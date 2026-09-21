<?php

namespace Tests\Feature;

use App\Models\Feedback;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FeedbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_feedback(): void
    {
        $this->getJson('/api/feedback')->assertUnauthorized();
        $this->postJson('/api/feedback', ['message' => 'Hello'])->assertUnauthorized();
        $this->getJson('/api/admin/feedback')->assertUnauthorized();
    }

    public function test_user_can_submit_valid_feedback(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/feedback', [
            'type' => 'usability',
            'rating' => 5,
            'message' => 'The What-If analysis simulator is very intuitive and helpful!',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('feedback.type', 'usability');
        $response->assertJsonPath('feedback.rating', 5);
        $response->assertJsonPath('feedback.status', 'pending');

        $this->assertDatabaseHas('feedback', [
            'user_id' => $user->id,
            'type' => 'usability',
            'rating' => 5,
            'status' => 'pending',
        ]);
    }

    public function test_feedback_validation_requires_message(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/feedback', [
            'type' => 'general',
            'rating' => 4,
            'message' => '', // Empty message
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['message']);
    }

    public function test_feedback_validation_rejects_invalid_rating(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/feedback', [
            'message' => 'Valid message text',
            'rating' => 10, // Max is 5
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['rating']);
    }

    public function test_user_only_sees_own_feedback(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        Feedback::create([
            'user_id' => $user1->id,
            'type' => 'general',
            'rating' => 4,
            'message' => 'User 1 message',
            'status' => 'pending',
        ]);

        Feedback::create([
            'user_id' => $user2->id,
            'type' => 'bug',
            'rating' => 2,
            'message' => 'User 2 secret message',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($user1);
        $response = $this->getJson('/api/feedback');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertSame('User 1 message', $data[0]['message']);
        $this->assertNotSame('User 2 secret message', $data[0]['message']);
    }

    public function test_normal_user_cannot_access_admin_feedback_endpoints(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->getJson('/api/admin/feedback')->assertForbidden();

        $feedback = Feedback::create([
            'user_id' => $user->id,
            'message' => 'Some feedback',
            'status' => 'pending',
        ]);

        $this->patchJson("/api/admin/feedback/{$feedback->id}", ['status' => 'reviewed'])->assertForbidden();
        $this->postJson("/api/admin/feedback/{$feedback->id}/respond", ['response' => 'Admin answer'])->assertForbidden();
        $this->deleteJson("/api/admin/feedback/{$feedback->id}")->assertForbidden();
    }

    public function test_admin_can_view_all_feedback_with_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);

        Feedback::create([
            'user_id' => $user->id,
            'type' => 'bug',
            'rating' => 2,
            'message' => 'Found an issue with task priority display',
            'status' => 'pending',
        ]);

        Feedback::create([
            'user_id' => $user->id,
            'type' => 'feature',
            'rating' => 5,
            'message' => 'Please add calendar export feature',
            'status' => 'reviewed',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->getJson('/api/admin/feedback');

        $response->assertOk();
        $response->assertJsonStructure([
            'feedbacks' => ['data'],
            'stats' => ['total', 'pending', 'reviewed', 'resolved', 'avg_rating'],
        ]);

        $this->assertEquals(2, $response->json('stats.total'));
        $this->assertEquals(1, $response->json('stats.pending'));
        $this->assertEquals(1, $response->json('stats.reviewed'));
    }

    public function test_admin_can_update_status_and_respond(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);

        $feedback = Feedback::create([
            'user_id' => $user->id,
            'type' => 'feature',
            'rating' => 5,
            'message' => 'Please add dark mode customization',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);

        // Test status update
        $updateResp = $this->patchJson("/api/admin/feedback/{$feedback->id}", [
            'status' => 'reviewed',
        ]);
        $updateResp->assertOk();
        $this->assertSame('reviewed', $updateResp->json('feedback.status'));

        // Test respond action
        $respondResp = $this->postJson("/api/admin/feedback/{$feedback->id}/respond", [
            'response' => 'Thank you! Dark mode is already live in the latest version.',
            'status' => 'resolved',
        ]);

        $respondResp->assertOk();
        $respondResp->assertJsonPath('feedback.status', 'resolved');
        $respondResp->assertJsonPath('feedback.admin_response', 'Thank you! Dark mode is already live in the latest version.');
        $this->assertNotNull($respondResp->json('feedback.responded_at'));
        $this->assertSame($admin->id, $respondResp->json('feedback.responded_by'));

        $feedback->refresh();
        $this->assertSame('resolved', $feedback->status);
        $this->assertSame($admin->id, $feedback->responded_by);
    }

    public function test_admin_can_delete_feedback(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);

        $feedback = Feedback::create([
            'user_id' => $user->id,
            'message' => 'Spam or irrelevant message',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->deleteJson("/api/admin/feedback/{$feedback->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('feedback', ['id' => $feedback->id]);
    }
}
