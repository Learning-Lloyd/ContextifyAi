# Adviser feedback implementation report

## What changed

- Added private personal goals with create, edit, delete, target counts, optional category, date range, live completion counts, progress bars, and completed/in-progress/overdue states. Progress comes from the signed-in user's completed tasks and is separate from priority scoring.
- Added a first-time two-step preference setup. Focus and category choices are saved on the user's account, can be updated from Profile, and are not shown again after completion. Preferences do not change scores.
- Added a per-user weekly/monthly PDF activity report with task counts, completion rate, category totals, recent task activity, and recent Decision Lab analyses. The endpoint uses the authenticated account and does not accept a user ID.
- Replaced the task category free-text input with Academic, Personal, and Work options. Editing an existing legacy category keeps that value available until the user chooses another category.
- Expanded productivity analytics with real user-specific category, priority, completion-trend, and due-date charts, plus a completion rate. The existing stats remain.
- Improved calendar task chips with visible priority color backgrounds, title/category text, completed styling, overdue indication, and existing task-detail links.
- Added navigation entries for Goals and My Reports, and linked preference management from Profile.
- Kept light mode as the default and retained dark-mode styling. The existing Contextify branding and research features remain in place.

## Research scoring

The existing `PriorityCalculator` remains unchanged: Importance 40%, Deadline Urgency 30%, Time Availability 20%, and Current Workload 10%. AI, weather, goals, and preferences do not change priority values.

## Database changes

- Added nullable preference and onboarding completion fields to `users`.
- Added a `goals` table with a user foreign key and cascade delete.
- Both migrations have reversible `down()` methods; they do not remove existing task records.

## Files changed for this request

Added:

- `server/database/migrations/2026_11_11_100000_add_workspace_preferences_and_onboarding_to_users.php`
- `server/database/migrations/2026_11_11_100001_create_goals_table.php`
- `server/app/Models/Goal.php`
- `server/app/Http/Controllers/Api/GoalController.php`
- `server/app/Http/Controllers/Api/UserReportController.php`
- `server/tests/Feature/GoalTest.php`
- `client/src/services/goalsService.js`
- `client/src/pages/Goals.jsx`
- `client/src/pages/Reports.jsx`
- `client/src/pages/Onboarding.jsx`

Modified:

- `server/app/Models/User.php`
- `server/app/Http/Controllers/Api/AuthController.php`
- `server/app/Http/Controllers/Api/AnalyticsController.php`
- `server/routes/api.php`
- `client/src/App.jsx`
- `client/src/components/WorkspaceShell.jsx`
- `client/src/components/TaskForm.jsx`
- `client/src/components/TaskCard.jsx`
- `client/src/pages/TaskDetail.jsx`
- `client/src/pages/Dashboard.jsx`
- `client/src/pages/Profile.jsx`
- `client/src/pages/Analytics.jsx`
- `client/src/pages/Calendar.jsx`
- `client/src/index.css`

## Undo notes

These changes are uncommitted and can be removed on request. Remove the files listed under Added, then reverse only the adviser-feedback hunks in the Modified files above. In particular, preserve earlier unrelated changes in `client/src/App.jsx`, `client/src/components/WorkspaceShell.jsx`, `client/src/components/TaskForm.jsx`, and `server/routes/api.php` (Research Dataset routes/navigation, the Notes-field change, and prior work). The two migrations are reversible with Laravel rollback if they have already been applied. No prior dataset, machine-learning, or task-note work is part of this implementation.

## Verification

- `npm run build` — passed. Vite emitted its existing bundle-size advisory for the main JavaScript chunk.
- `npm run lint` — completed with warnings in existing project files; the initial new Dashboard naming error was fixed and lint then completed without errors.
- PHP syntax checks — passed for the new controllers and user migration.
- Both additive migrations (`workspace_preferences`/onboarding and `goals`) were applied successfully to the configured local Contextify database on 2026-11-11.
- `php artisan test` — PHPUnit could not open its configured `server/vendor/autoload.php` bootstrap, so the suite did not run. The new `GoalTest` covers goal privacy and progress response shape.
- Browser-level PDF/onboarding/calendar checks were not run in this environment.

## Manual setup

The preference and Goals migrations have been applied to the configured local database. Users without a saved onboarding completion date will be sent through the one-time preference setup.
