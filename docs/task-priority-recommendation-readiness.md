# Task priority recommendation and demo readiness

## Official Contextify result

The saved priority score remains the authoritative recommendation:

`score = importance × 0.40 + urgency × 0.30 + time availability × 0.20 + current workload × 0.10`

All four factors use the application's 1–10 scale, so the weighted score range is 1–10. Existing labels remain High at 8 or above, Medium from 5 to below 8, and Low below 5. The boundary mapping is also used by task records and explanation output.

The current deadline-to-urgency rule is date-based: no deadline uses 5; overdue or due today uses 10; tomorrow uses 8; 2–3 days away uses 6; 4–7 days away uses 4; and later dates use 3. The countdown and overdue grouping honor a task's due time when one is saved; a date-only deadline remains due through the end of that local day.

The existing calendar factors were retained. Time availability estimates average free minutes across the next seven days, using 480 productive minutes per day. Workload is derived from pending dated commitments in the next 14 days. When no dated commitments exist, both factors use the existing neutral 5/10 baseline. A higher factor value raises the score because that is how the established formula is defined; this represents the formula's semantics and should be explained during the presentation.

Dashboard and the default Queue view sort active unfinished work by score descending, then dated deadline ascending (no deadline last), then task ID. Decision Lab uses the same score and tie-break rule. Completed tasks are excluded from Decision Lab's unfinished-work analysis; Queue displays pending work before completed work. Equal scores therefore produce a repeatable order.

Task-level explanations are generated from the saved formula result and task record. They identify the rank, score, importance, deadline/countdown (or no deadline), estimated duration when present, available-time factor, workload factor, and largest weighted contributions. The separate AI narrative may explain the overall analysis, but it cannot replace the formula-backed task rationale, score, or rank. Weather remains advisory context and never affects scoring.

## Experimental model boundary and verified evaluation

The source checkout's actual saved classifier is **v1.1.0 RandomForestClassifier**, not Logistic Regression v1.0.0 as stated in the presentation request. It uses seven structured inputs: importance, urgency, estimated duration, time availability, current workload, other pending assignments, and category. Training and inference now verify the same ordered feature list from the model artifact. The serialized pipeline performs training-fitted median imputation, numeric scaling, and one-hot category encoding with unseen categories ignored. It returns no probabilities because calibration was not evaluated.

The model was selected on validation macro F1 and evaluated on a held-out respondent-group test split. The verified saved report records 601 training tasks/151 respondents, 122 validation tasks/30 respondents, and 121 test tasks/31 respondents, with no respondent overlap. The test accuracy is **0.6612**, macro F1 **0.6594**, and weighted F1 **0.6549**. The majority baseline recorded test accuracy **0.3967** and macro F1 **0.1893**. The model is trained from synthetic/AI-generated sample data, not real student behavior; these figures do not establish real-world effectiveness.

Decision Lab shows official formula rank, score, and category beside the experimental model category, plus whether the categories agree. A disagreement is shown plainly and is not resolved in favor of the classifier. The synthetic-data disclosure and model version remain visible. The trained artifact and source dataset were not changed.

## Verification

- Frontend production build: passed; Vite warns that the generated JavaScript bundle exceeds 500 kB.
- Frontend lint: completed with 14 existing warnings and no errors.
- ML suite: 16 tests passed, including saved-artifact prediction, feature-schema match, missing numeric values, unseen categories, and provenance checks.
- Backend PHPUnit suite: 51 tests and 259 assertions passed, including the added formula regression, eight recommendation scenarios, and Dashboard/Queue ordering check.
- PHP syntax checks: all 11 changed PHP source and test files passed `php -l`.
- `git diff --check`: passed.

## Presentation flow

1. Create or select several pending tasks with different importance, deadlines, estimates, and calendar commitments.
2. Open Decision Lab and run **Analyze**. Point out the official 40/30/20/10 score, its factor breakdown, deadline countdown, and formula-backed explanation.
3. Open the Dashboard and Queue to show the same top unfinished task and ordering. Mention that an unanalyzed task asks for analysis first.
4. Run **Synthetic ML preview** separately. Compare its category with the formula result; explain that it is an experiment trained and evaluated on synthetic records and does not change task order.
5. Use **What if?** to change factor values and show how the deterministic score changes.

Do not describe the synthetic classifier's test metrics as accuracy on actual students. Real-world validation requires independently collected labeled task-decision records and an evaluation that does not reuse training respondents.
