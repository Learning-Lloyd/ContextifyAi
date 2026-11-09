# Contextify existing feature inventory

Audited while continuing the Monday.com-inspired interface work. This is a code-based inventory; items are not represented as manually exercised workflows unless noted in the implementation report.

## Member-facing features and routes

| Area | Existing implementation | Preserved / current presentation |
|---|---|---|
| Authentication | Registration, login, logout, forgot/reset password, Sanctum-protected API | Existing auth flows and protected routes retained |
| Workspace navigation | Compact top navigation, Decision Lab dropdown, notifications, profile/settings, admin entry | Retained; Dashboard/Today, Queue, Calendar, Decision Lab and nested Insights/History/Feedback remain discoverable |
| Dashboard | Personalized recommendation, task counts, completion progress, due/overdue groups, workload, weather, recent activity, notifications count | Retained with recommendation explanation and local countdown from the previous work |
| Task management | Create, edit, delete, toggle completion, archive/restore, duplicate, search, status/category/priority filters and sorting | Table view plus collapsible grouping, Kanban view, deadline Calendar view, and in-place detail panel; overdue filter is derived from pending tasks and local countdown; task data continues to use existing APIs |
| Task data fields | Title, description, notes, category, estimate, location/coordinates, weather snapshot, due date/time, four scoring inputs, deterministic score, status, archive timestamp | UI reads supported values only; no database fields added |
| Decision Lab | Multi-select, analyze, rank, fixed-factor breakdown, compare/save, history, What-if simulation, weather context, AI explanation | Existing capabilities retained; candidate tasks presented in a table and rank is labeled separately from priority class |
| Decision Insights and history | Saved analyses/comparisons, timeline/history endpoints, aggregate insights | Existing pages and endpoints retained |
| Calendar and scheduling | Calendar endpoint and page, schedule suggestions | Existing page/route retained; Tasks also gains an independent deadline calendar view |
| Weather | Weather lookup/search and task/user location context | Existing integration retained; weather is contextual and does not affect scores |
| Notifications | In-app notification list, mark read/all-read, profile preferences and reminder backend | Existing UI and APIs retained |
| Feedback | Member submission and admin review/respond workflows | Existing pages and routes retained |
| Administration | Admin-only dashboard, users, tasks, decisions, analytics, audit, reports, notifications, feedback | Existing protected routes and admin middleware retained |

## Data model limits relevant to views

- Task status is validated as `pending` or `completed`; there is no persisted `in_progress` state. Kanban therefore uses Pending and Completed columns and marks overdue pending tasks inside the Pending column.
- Tasks store a due date/time but no start date or date-range duration. A timeline view cannot position task spans accurately. The UI explains this limitation and directs users to the calendar view.
- Task activity history is represented in workspace audit logs, not a task-scoped history endpoint exposed to the member detail screen. The detail panel therefore shows notes and saved task context, not a fabricated history feed.

## Research constraints

`PriorityCalculator` remains deterministic with weights Importance 0.40, Urgency 0.30, Time Availability 0.20, and Current Workload 0.10. AI is used only for explanation text. Weather remains advisory context and does not change the score or ordering.

## Route inventory source

Frontend route definitions are in `client/src/App.jsx`. API routes and Sanctum/admin middleware are in `server/routes/api.php`. Task fields/status and score computation are in `server/app/Models/Task.php` and `server/app/Services/PriorityCalculator.php`.
