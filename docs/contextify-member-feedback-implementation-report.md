# Contextify – Member Feedback Implementation and Enhancement Report

**Prepared:** 8 November 2026  
**Project:** Contextify AI  
**Scope:** Member feedback improvements for task planning, reminders, scheduling, decision support, privacy, and usability.

## 1. Summary

Contextify now has user-controlled in-app deadline reminders, a seven-day schedule suggestion flow based on the member’s stated daily capacity, task progress and recent activity on the dashboard, an editable AI task breakdown, and an in-app quick-start guide. Numeric priority scores remain available in Decision Lab after analysis and have been removed from the dashboard, queue/task details, calendar, analytics, command search, decision timeline, and ordinary task/scoring-preview API responses. The existing deterministic scoring weights remain unchanged: importance 40%, deadline urgency 30%, time availability 20%, and current workload 10%.

## 2. Implemented changes

### Reminders and notification preferences

- Added per-user reminder settings: reminders enabled, overdue reminders enabled, and lead time (1, 6, 12, 24, or 48 hours).
- Added user-scoped in-app notification history, unread counts, mark-as-read, and mark-all-as-read actions.
- Added a notification menu and history page.
- Added a scheduled server command that checks pending tasks every 15 minutes. Unique deduplication keys prevent repeating the same reminder for the same task deadline. Editing a deadline creates a new reminder identity.
- Reminder generation is server-side; browser notifications are not enabled, so the app does not request browser permission.

### Dashboard and task workflow

- Added task completion progress, pending/completed counts, unread reminder count, and recent task activity to the dashboard.
- Kept task creation, editing, completion, archiving, and existing search/filter behavior.
- Task scoring previews and routine task responses no longer expose the numeric priority score. The Dashboard directs members to analyze tasks first when pending tasks have not been analyzed or were changed after the last analysis.
- Removed score presentation from task details, calendar, analytics, search results, decision history, and decision insights. Decision Lab remains the place to inspect numeric scores and weighted analysis.
- Reworked general analytics to focus on task status and overdue work rather than score averages and distributions.

### Scheduling

- Added profile fields for daily available minutes and a preferred workday start time.
- Added seven-day schedule suggestions that place estimated-duration tasks before their deadlines, within the capacity the member entered.
- Tasks without an estimate or that do not fit are shown with an explanation. Suggestions do not modify task deadlines, durations, or scores.
- No daily routine or personal availability is invented; scheduling remains unset until the member supplies the preferences.

### AI assistance

- Added a review-before-save task breakdown flow. Members can edit, remove, add, or deselect suggested steps before creating normal task records.
- Existing “Help me write” description assistance remains separate from prioritization. AI outputs do not set task scores or change the fixed scoring formula.
- AI request logs now record provider/status or exception type rather than response bodies or raw exception messages, reducing the chance of storing task content in logs.

### Help and usability

- Added an in-app Help page with a short workflow guide and links to task and decision-support pages.
- Added notification and schedule preference controls to Profile.
- Existing navigation and visual style were retained; no permanent sidebar was added.

## 3. Security, privacy, and data handling

- Notifications are queried through the authenticated user’s relationship; attempts to mark another user’s notification read return 404.
- Task breakdown requests first locate the task under the authenticated user’s `user_id`; another user’s task cannot be used for generation.
- Scheduling queries use the signed-in user’s task relationship.
- Dashboard activity is loaded from the signed-in user’s audit logs and returns only a short action label and timestamp.
- New profile settings are validated and included in the authenticated profile response.
- The AI provider receives the task text needed to produce the requested suggestion. AI output is treated as editable draft content; users review it before it is saved.
- Two migrations add the preference columns and notification table. They have not been applied to the local database during this implementation.

## 4. Validation performed

- Frontend production build: **passed** (`npm run build`). Vite reports the existing large JavaScript chunk warning.
- Frontend lint: **completed with warnings** (`npm run lint`). Warnings include existing hook dependency/Fast Refresh warnings and unused imports in other pages; no lint errors were reported.
- PHP syntax checks: **passed** for the changed controllers, models, services, command, routes, migrations, and updated scoring feature test.
- Backend PHPUnit suite: **not run**. `php artisan test` stopped before test execution because PHPUnit could not open `C:\xamppn\htdocs\ContextifyAI\server\vendor\autoload.php` in this environment.
- Live database migrations and scheduler execution: **not run**. Existing local database integrity concerns were noted during earlier work, so these changes require a backup and deliberate migration run before exercising persistent data.
- Live OpenRouter generation: **not verified**. This environment has blocked outbound provider connections in previous attempts; no live API request was used to claim the AI connection works.

## 5. Remaining setup and operational notes

1. Back up the local database, then apply migrations from the `server` directory with `php artisan migrate`.
2. Confirm the Laravel scheduler is invoked every minute by the local/production scheduler (for example, the Windows Task Scheduler or server cron). The reminder command itself runs every 15 minutes when the scheduler is active.
3. Ensure the OpenRouter key and selected model are configured in the server environment. Keep the key private and do not commit it. Verify “Help me write” and “Suggest steps” in an environment with outbound network access.
4. Install/repair Composer dependencies if `server/vendor/autoload.php` is missing or unreadable, then rerun `php artisan test`.

## 6. Phase 2 feature evaluation

| Proposal | Recommendation | Reason / next step |
|---|---|---|
| Grading calculator | Evaluate separately with members and manuscript scope | Academic planning may benefit, but grades, course weights, and institutional rules need a clear model and validation before implementation. |
| Note organizer | Defer pending discovery | Notes can expand into a separate product area; define whether they attach to tasks, subjects, or courses first. |
| External calendar integration | Evaluate after schedule suggestions are validated | Contextify already has an internal deadline calendar. External providers require consent, OAuth, conflict handling, and privacy review. |
| Dedicated notes app | Defer | Overlaps the note-organizer proposal and requires its own scope. |
| Smartwatch / desktop assistant | Defer | High maintenance across platforms with unclear core-study benefit. |
| Offline sync | Evaluate if member research shows connectivity is a frequent barrier | Requires conflict resolution, local storage protection, and sync behavior design. |
| Ads or donations | Defer | Monetization should follow user research and a privacy/consent review; ads may conflict with a focused academic tool. |
| Plant/gamification feature | Optional experiment only | It may encourage consistent use, but should be tested with members and must not distract from decision support. |

## 7. Limitations

- Backend behavior could not be integration-tested because the PHPUnit bootstrap could not access the Composer autoloader.
- Reminder delivery depends on the Laravel scheduler being active; merely serving the web app does not run scheduled checks.
- Schedule suggestions are a bounded heuristic, not an external calendar sync or a guarantee of a feasible real-world plan. It uses member-provided capacity, task estimates, deadlines, and existing task priority ordering.
- AI features depend on valid provider configuration and network access. The core task creation and deterministic scoring flow remains independent of the AI provider.
