# Priority constraints and importance provenance

## Official score remains unchanged

Contextify continues to calculate the official score as:

`Importance × 0.40 + Urgency × 0.30 + Time Availability × 0.20 + Current Workload × 0.10`

Each factor must be an integer from 1 to 10. The score remains on the 1–10 scale. Priority labels remain High at 8 or above, Medium at 5 to below 8, and Low below 5. Dashboard, Queue, and Decision Lab ordering were not changed by these constraint improvements.

## Importance source and its effect

Each task now stores `importance_source` as `user`, `ai`, `heuristic`, or `legacy`. Existing task records are marked `legacy` because their historical input source cannot be determined safely.

- If a user supplies an importance value from 1 through 10, that value is saved as `user` and is not replaced by the automatic suggestion on later edits.
- If the user leaves importance to Contextify, Gemini may suggest the importance factor. If Gemini is unavailable or returns an invalid response, the existing keyword heuristic supplies the factor instead.
- The selected importance factor is an input to the unchanged 40% importance component. Therefore, an AI suggestion can indirectly change the official score and task order. Gemini does not calculate the weighted score or choose the official ranking.
- Users can correct the suggested importance in the task form. The chosen value and its source are returned by the backend and shown on the task detail page.

## Scheduling and AI privacy

The seven-day plan now reports overdue tasks, tasks without deadlines, tasks missing a duration, and tasks that do not fit the stated available minutes. These remain pending and linked to their task details. The schedule is a capacity-based suggestion and does not inspect actual calendar appointments.

The AI privacy filter redacts common names in labeled/self-identifying phrases, emails, phone-like numbers, labeled identifiers, birth dates, addresses, and URLs. It is best effort and does not guarantee anonymization. Avoid putting sensitive personal information in task titles or descriptions.

## Experimental model inputs

Experimental ML predictions remain separate from the official formula and ranking. Tasks with missing or out-of-range required factors are not sent to the model and are returned as “Not predicted” with the missing factor names. Missing optional fields and importance values whose source predates provenance tracking are flagged for review. The task schema does not record the provenance of saved time-availability and workload factors, so the interface flags those sources as unverified. No missing task data is filled with a neutral factor value by the prediction controller.

## Database considerations

The migration adds `importance_source` with `legacy` as the default for existing rows. It does not rewrite factor values or priority scores. The existing database factor columns are unsigned tiny integers and do not enforce the 1–10 range. No new database check constraint is added in this change; the score-calculation boundary and application validation enforce the range without risking an unreviewed constraint against existing records.
