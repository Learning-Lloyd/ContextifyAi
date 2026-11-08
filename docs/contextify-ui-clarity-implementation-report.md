# Contextify UI clarity and text reduction

## Scope

Applied the pasted UI clarity brief to the member and admin interface. The work focuses on shorter labels, clearer page headings, larger secondary text, and progressive disclosure for explanations that do not need to be open by default. Existing task workflows, decision features, fixed scoring weights, and API behavior are preserved.

## Pages and components updated

- **Today / Dashboard:** removed redundant intro copy, clarified the recommendation rationale, and put detailed scoring factors behind “Why recommended?”. Shortened progress, queue, workload, and activity labels.
- **Tasks and task cards:** shortened sorting and filtering labels, removed the tiny factor-number strip from each card, limited descriptions to two lines, and made key card text easier to read.
- **Decision Lab and What if?:** simplified instructions, selection controls, action labels, and ranking comparison headings. Detailed rank explanations and score breakdowns are collapsed by default.
- **Decision Insights, history, analytics:** reduced repeated descriptions and metric labels while retaining the decision patterns and analysis content.
- **Task form:** shortened helper text and placed scoring-factor guidance in a collapsed section. The AI description helper remains optional and does not change scoring.
- **Calendar, weather, schedule suggestions:** added a readable mobile deadline list; moved workload and forecast details behind expandable sections; simplified labels and helper text.
- **Notifications, profile, feedback, help:** shortened headings and instructions, clarified form labels, and removed repeated explanatory copy.
- **Admin pages and shared navigation:** shortened page introductions and labels for consistency.
- **Typography and responsive layout:** increased readability for task metadata, descriptions, notification controls, and secondary actions; adjusted task cards and controls for narrow screens.

## Behavior preserved

Task creation, editing, completion, filtering, analysis, scenario simulation, notification actions, and admin workflows remain in place. The fixed factor weights remain 40% importance, 30% urgency, 20% time availability, and 10% workload. AI description assistance only drafts text; it does not set or alter priority scores. Priority-score visibility behavior remains limited to decision analysis views as previously requested.

## Verification

- `npm run build` — passed.
- `npm run lint` — completed with warnings. Warnings include existing React Fast Refresh and hook dependency warnings, plus unused imports in admin pages. The What-if component also has hook dependency warnings; no lint errors were reported.
- Vite reports the generated JavaScript chunk is larger than 500 kB; production build still completes successfully.

## Remaining review

No visual browser review was performed in this pass. Please review the mobile calendar and collapsed explanation sections in the running app for fit with your preferred wording and navigation.
