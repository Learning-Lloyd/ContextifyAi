# Contextify redesign and task explanation implementation

## What changed

- Updated the application to an original, Monday.com-inspired workspace design: compact navigation, consistent spacing, scannable task rows, status indicators, progress, and clearer page hierarchy. Existing routes, access controls, task actions, search, sorting, filters, notifications, and profile/settings navigation remain in place.
- Standardized the UI on a black-and-white palette. White mode is the default for new users; a saved theme preference and optional dark mode remain supported. Priority badges keep their semantic colors and labels: high/red, medium/yellow, low/green.
- Refocused the Dashboard on the next decision: the recommended task, explanation, local deadline countdown, daily progress, upcoming deadlines, queue, workload, weather context, and activity. The numeric score stays out of Dashboard and task list cards; Decision Lab retains the numerical score and detailed breakdown.
- Task cards show title, description, analysis state, status, priority, deadline/countdown, category, estimated time, and available task actions. An unanalyzed pending task prompts the user to analyze in Decision Lab before showing a priority recommendation or score.
- Login and registration email/password icons are positioned inside relative input wrappers, do not intercept clicks or typing, and inputs have extra left padding. Authentication behavior was left intact.

## Task explanations and ranking behavior

- After analysis, each ranked task gets a concise “Why this is your priority” explanation. It identifies its actual rank, compares only with a real adjacent ranked task when appropriate, and uses saved factor contributions in the rule-based fallback.
- OpenRouter may provide natural-language explanations from the already-computed task rank, score, deadline, task context, and supported weather information. It cannot set scores, weights, or ordering. If unavailable or missing a task explanation, Contextify uses its deterministic explanation fallback.
- The fixed formula remains Importance 40%, Urgency 30%, Time Availability 20%, Current Workload 10%.
- Countdown labels and Dashboard deadline grouping use the client’s IANA timezone (sent through `X-Client-Timezone`). A task with a time uses that time; a date-only task is due through the end of that local day. Labels include hours/minutes for near deadlines, days/weeks for farther deadlines, and elapsed time for overdue tasks.
- When a task has coordinates (or the user has a saved city) and its deadline falls in the forecast window, Decision Lab attaches the forecast closest to its scheduled hour. Relevant outdoor tasks may mention forecast rain or storms. Weather is omitted when unavailable or irrelevant and never changes a score.
- Saved explanations and ranks are considered current only while all tasks in that analysis remain unchanged. Editing, completing, archiving, deleting, or otherwise changing an analyzed task invalidates the old ranking explanation until the tasks are analyzed again.
- Decision Insights now also returns the average top-task score from saved analyses; this is calculated from real saved results.

## API and data changes

- No migration, database schema change, or new endpoint was added.
- Existing task and Dashboard responses add current analysis explanation and source fields.
- Analysis requests use the `X-Client-Timezone` header. Forecast responses used internally by the Decision Lab now include hourly values alongside daily summaries.
- Existing saved analysis JSON remains readable; older records use a generated fallback where appropriate.

## Key implementation files

- Frontend: `client/src/index.css`, `client/src/context/ThemeContext.jsx`, `client/src/services/api.js`, `client/src/utils/taskUtils.js`, `client/src/components/TaskCard.jsx`, `client/src/components/RankedTaskCard.jsx`, `client/src/pages/Dashboard.jsx`, `client/src/pages/TaskDetail.jsx`, `client/src/pages/Login.jsx`, `client/src/pages/Register.jsx`, and shared page/component styles.
- Backend: `server/app/Services/ExplanationService.php`, `AiExplanationService.php`, `DecisionService.php`, `DeadlineUrgencyService.php`, `TaskAnalysisStatusService.php`, `WeatherService.php`, and API controllers for Dashboard, tasks, and Decision Lab.
- Coverage: `server/tests/Unit/TaskCardExplanationTest.php`.

## Follow-up: Task board and input alignment

- Replaced the My Tasks card list with a responsive, horizontally scrollable table with Task, Status, Priority, Deadline, Time Remaining, Category, Estimate, and Actions columns. The task description and current explanation stay within the task cell. Existing edit, complete/reopen, delete, archive/restore, duplicate, search, category/status filters, and sort options are preserved.
- Added priority filtering and priority sorting to the task board controls. Unanalyzed tasks do not show a priority classification until analyzed.
- Replaced the Decision Lab task picker with a scrollable selection table showing supported task details, deadline/countdown, completion state, analysis state, analyzed priority classification, and available location/weather context. Checkbox multi-selection, Analyze, Save Decision, and the What-if tab remain available.
- Decision Lab results show an ordinal rank and a separate “First priority”/ranking label from the High/Medium/Low classification. The score ring and breakdown remain available only in analysis results.
- Standardized decorative leading icons through a shared CSS layout: fixed icon positioning, `pointer-events: none`, and explicit input padding. Applied to task search, login and registration fields, city search, profile name, and admin search fields. Forgot/reset password fields have no leading icons and need no special wrapper.
- No schema or endpoint change was needed; the existing task list filter API already supports priority filtering and sort-by-score.

## Follow-up: Complete task workspace views

- Added collapsible Table groups by status or priority. Each task appears in exactly one group, group headers show counts, and groups update from the currently fetched task records. Overdue is calculated from the actual local countdown and pending status.
- Added a Kanban view using the system’s real Pending and Completed states. Overdue tasks stay in Pending and carry an Overdue marker. Kanban actions call existing complete/reopen and edit operations; the detail panel contains delete/archive/duplicate actions. No drag-and-drop status change was introduced.
- Added a monthly Calendar view using stored due dates, with month navigation and a separate list for tasks without deadlines. Selecting a task opens the detail panel.
- Added a Timeline tab that explains why timeline placement is unavailable: the Task model has due dates but no task start dates or date-range duration. It offers the deadline Calendar view instead of fabricating spans.
- Added an in-place task detail side panel with description, status, analyzed priority classification, deadline/countdown, category, estimate, location/weather snapshot, notes, explanation, and existing edit/complete/archive/delete actions. The existing full task-detail route remains available from the panel.
- Added an Overdue status filter as a client-side derivation from the existing pending status and local countdown, without changing the API’s accepted persisted statuses.
- In Progress is not displayed as a persisted status because task validation and the Task model support only `pending` and `completed`. Dashboard counts remain based on actual supported states.
- Added [contextify-feature-inventory.md](contextify-feature-inventory.md), documenting existing member/admin functionality, routes, and the data-model constraints used to decide which views can be represented accurately.

### Follow-up files

- `client/src/pages/Tasks.jsx`, `client/src/components/TaskCard.jsx`, and new `client/src/components/TaskDetailPanel.jsx` implement task grouping, views, and task detail interactions.
- `client/src/index.css` contains responsive styles for grouped tables, Kanban, Calendar, and the side panel.
- `docs/contextify-feature-inventory.md` records the feature/route and data-model audit.

## Verification

- `npm run build`: passed. Vite emitted its advisory that the main JavaScript chunk is over 500 kB.
- `npm run lint`: completed with no errors; it reported existing hook dependency, Fast Refresh export, and unused-import warnings.
- PHP syntax checks for all changed backend files and the added test: passed.
- Backend suite: **36 tests, 165 assertions passed**. Ran PHPUnit with SQLite in-memory because the default MySQL connection is unavailable in this environment.
- `git diff --check`: no whitespace errors; Git printed Windows line-ending conversion notices.
- No visual verification was completed for this follow-up. The earlier browser attempt could not reach the local dev server (`ERR_CONNECTION_TIMED_OUT`), so desktop/mobile appearance remains to be visually checked.
