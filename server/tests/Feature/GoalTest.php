<?php

namespace Tests\Feature;

use App\Models\Goal;
use App\Models\Task;
use App\Models\User;
use App\Models\UserNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GoalTest extends TestCase
{
    use RefreshDatabase;

    public function test_goals_are_private_and_progress_is_returned(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $goal = Goal::create(['user_id' => $owner->id, 'title' => 'Weekly focus', 'target_count' => 3, 'starts_on' => now()->toDateString(), 'ends_on' => now()->addWeek()->toDateString(), 'category' => 'Academic']);
        $otherGoal = Goal::create(['user_id' => $other->id, 'title' => 'Private goal', 'target_count' => 4, 'starts_on' => now()->toDateString(), 'ends_on' => now()->addWeek()->toDateString()]);
        Task::create(['user_id' => $owner->id, 'title' => 'Completed class reading', 'category' => 'Academic', 'status' => 'completed', 'importance' => 7, 'urgency' => 5, 'time_availability' => 6, 'current_workload' => 4]);
        Task::create(['user_id' => $owner->id, 'title' => 'Upcoming class reading', 'category' => 'Academic', 'status' => 'pending', 'due_date' => now()->addDays(2)->toDateString(), 'importance' => 7, 'urgency' => 5, 'time_availability' => 6, 'current_workload' => 4]);
        Task::create(['user_id' => $owner->id, 'title' => 'Personal errand', 'category' => 'Personal', 'status' => 'pending', 'due_date' => now()->addDay()->toDateString(), 'importance' => 4, 'urgency' => 5, 'time_availability' => 6, 'current_workload' => 4]);
        Task::create(['user_id' => $other->id, 'title' => 'Other user task', 'category' => 'Academic', 'status' => 'pending', 'due_date' => now()->addDay()->toDateString(), 'importance' => 4, 'urgency' => 5, 'time_availability' => 6, 'current_workload' => 4]);

        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/goals')->assertOk();
        $response->assertJsonCount(1, 'goals')->assertJsonPath('goals.0.title', 'Weekly focus')
            ->assertJsonPath('goals.0.completed_count', 1)
            ->assertJsonPath('goals.0.remaining_count', 2)
            ->assertJsonPath('goals.0.progress', 33)
            ->assertJsonPath('goals.0.scheduled_outstanding_count', 1)
            ->assertJsonPath('goals.0.next_task_deadline.date', now()->addDays(2)->toDateString())
            ->assertJsonPath('goals.0.summary', '1 of 3 completed; 2 remaining.')
            ->assertJsonPath('goals.0.progress_basis', 'Completed tasks are counted by completed status and last-updated date within the goal period; no dedicated completion timestamp is stored.');
        $this->putJson('/api/goals/'.$otherGoal->id, ['title' => 'Changed', 'target_count' => 1, 'starts_on' => now()->toDateString(), 'ends_on' => now()->addWeek()->toDateString()])->assertNotFound();
    }

    public function test_active_goal_feedback_distinguishes_partial_and_zero_progress(): void
    {
        $user = User::factory()->create();
        $goal = $this->makeGoal($user, 'Active goal', 3, now()->subDay()->toDateString(), now()->addDay()->toDateString());
        $this->makeCompletedTask($user);

        Sanctum::actingAs($user);
        $this->getJson('/api/goals')->assertOk()
            ->assertJsonPath('goals.0.feedback_state', 'active')
            ->assertJsonPath('goals.0.feedback_message', "You're making progress! You've completed 1 of 3 tasks. Just 2 more to reach your goal.");

        DB::table('tasks')->where('user_id', $user->id)->delete();
        $this->getJson('/api/goals')->assertJsonPath('goals.0.completed_count', 0)
            ->assertJsonPath('goals.0.feedback_message', 'Every great achievement starts with one step. Complete your first task to get started!');
        $this->assertDatabaseCount('user_notifications', 0);
    }

    public function test_expired_goal_feedback_distinguishes_partial_and_zero_progress(): void
    {
        $this->travelTo(Carbon::parse('2026-11-26 00:00:00', 'Asia/Manila'));
        $user = User::factory()->create();
        $partial = $this->makeGoal($user, 'Partial expired', 3, '2026-11-20', '2026-11-25', 'Academic');
        $zero = $this->makeGoal($user, 'Zero expired', 2, '2026-11-20', '2026-11-25', 'Personal');
        $this->makeCompletedTask($user, '2026-11-25 10:00:00');

        Sanctum::actingAs($user);
        $response = $this->withHeader('X-Client-Timezone', 'Asia/Manila')->getJson('/api/goals')->assertOk();
        $goals = collect($response->json('goals'))->keyBy('id');
        $this->assertSame('expired', $goals[$partial->id]['feedback_state']);
        $this->assertSame("Good effort! You completed 1 of 3 planned tasks. You didn't reach your target this time, but you can build on your progress next week.", $goals[$partial->id]['feedback_message']);
        $this->assertSame('expired', $goals[$zero->id]['feedback_state']);
        $this->assertSame("This week didn't go as planned, and that's okay. Try setting a smaller target and taking one task at a time next week.", $goals[$zero->id]['feedback_message']);

        $this->assertDatabaseCount('user_notifications', 2);
        $this->getJson('/api/goals')->assertOk();
        $this->assertDatabaseCount('user_notifications', 2);
        $this->travelBack();
    }

    public function test_completed_goal_is_congratulated_once_and_includes_counts(): void
    {
        $this->travelTo(Carbon::parse('2026-11-25 12:00:00', 'UTC'));
        $user = User::factory()->create();
        $goal = $this->makeGoal($user, 'Complete target', 1, '2026-11-25', '2026-11-25');
        $this->makeCompletedTask($user, '2026-11-25 12:00:00');

        Sanctum::actingAs($user);
        $this->getJson('/api/goals')->assertOk()
            ->assertJsonPath('goals.0.feedback_state', 'completed')
            ->assertJsonPath('goals.0.progress', 100)
            ->assertJsonPath('goals.0.feedback_message', 'Well done! You achieved your weekly goal! Keep up the great work! You completed 1 of 1 planned tasks within the goal period.');

        $this->getJson('/api/goals')->assertOk();
        $this->assertDatabaseCount('user_notifications', 1);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'type' => 'weekly_goal',
            'title' => 'Weekly goal achieved',
            'dedupe_key' => "weekly-goal:{$goal->id}:completed",
        ]);
    }

    public function test_goal_deadline_is_inclusive_in_the_clients_timezone(): void
    {
        $this->travelTo(Carbon::parse('2026-11-25 23:59:59', 'Asia/Manila'));
        $user = User::factory()->create();
        $goal = $this->makeGoal($user, 'Manila deadline', 1, '2026-11-25', '2026-11-25');
        $this->makeCompletedTask($user, '2026-11-25 15:59:59');

        Sanctum::actingAs($user);
        $this->withHeader('X-Client-Timezone', 'Asia/Manila')->getJson('/api/goals')->assertOk()
            ->assertJsonPath('goals.0.id', $goal->id)
            ->assertJsonPath('goals.0.completed_count', 1)
            ->assertJsonPath('goals.0.feedback_state', 'completed');

        $this->travelBack();
    }

    public function test_empty_goals_response_remains_empty(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $this->getJson('/api/goals')->assertOk()->assertExactJson(['goals' => []]);
        $this->assertDatabaseCount('user_notifications', 0);
    }

    private function makeGoal(User $user, string $title, int $target, string $start, string $end, ?string $category = null): Goal
    {
        return Goal::create([
            'user_id' => $user->id,
            'title' => $title,
            'target_count' => $target,
            'starts_on' => $start,
            'ends_on' => $end,
            'category' => $category,
        ]);
    }

    private function makeCompletedTask(User $user, ?string $updatedAt = null): Task
    {
        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'Completed test task',
            'category' => 'Academic',
            'status' => 'completed',
            'importance' => 6,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 4,
        ]);

        if ($updatedAt) {
            DB::table('tasks')->where('id', $task->id)->update(['updated_at' => $updatedAt]);
        }

        return $task;
    }
}
