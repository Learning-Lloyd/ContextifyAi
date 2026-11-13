# Survey machine-learning feasibility

## Decision

Do not train a survey-response prediction model from this workbook for the current Contextify release. It is valid for descriptive and exploratory research, but a small and highly skewed, cross-sectional self-report dataset is not a sound basis for user-level prediction. In particular, it cannot predict which task a user should do first.

## Potential target and limitations

A possible research-only target is agreement with `S1_Q6_RecsHelp` (ordinal response 1–5), or a predeclared binary split of 4–5 versus 1–3. The cleaned sample has 221/244 (90.6%) responses in categories 4–5 and only 23 in categories 1–3. A random 20% holdout would have about 4–5 minority examples on average, too few for dependable model comparisons or subgroup interpretation. Satisfaction has 230/244 responses in categories 4–5, with only 14 other responses.

Several other plausible outcomes are similarly skewed: desire for a numerical score (Q8) has 211/244 responses at 4–5; desire for explanations (Q9) also has 211/244 at 4–5. S1/S2 feature items are dominated by agreement. A classifier could achieve superficially high accuracy by predicting the majority class while learning little useful signal.

There is also construct overlap and leakage risk: predicting a stated attitude from other questions that ask nearly the same attitude (including paired positive/negative statements) would measure response consistency, not a useful independent prediction. All `_R` fields are unreversed, and the dataset is one-time survey data rather than longitudinal behavior or randomized evaluation.

## What was run


If an adviser specifically requires a survey prediction experiment, pre-register one narrow ordinal outcome and its interpretation, exclude same-construct and paired items from inputs, compare against majority/ordinal baselines, use repeated stratified cross-validation with uncertainty intervals, report per-class metrics and calibration, and label the result exploratory. Collect a larger independent cohort before claiming generalizable predictions. Do not call such a model a task-priority model.
