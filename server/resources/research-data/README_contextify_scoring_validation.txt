Contextify scoring validation dataset

File: contextify_scoring_validation.csv
Records: 180 synthetic test cases (15 task examples x 12 factor profiles).

Purpose
This file is a regression/validation fixture for Contextify's deterministic
priority calculation. It is not collected from people and is not research
participant data. Do not report it as survey results or use it as an empirical
finding. It is not a machine-learning training dataset.

Scoring method
Expected priority score = importance * 0.40 + urgency * 0.30 +
time_availability * 0.20 + current_workload * 0.10, rounded to 2 decimals.
Each factor is an integer from 1 to 10. Priority bands follow the application:
High >= 8, Medium >= 5 and < 8, Low < 5. The other-pending-task count is
context only and does not independently change the score.

Categories are Academic, Personal, and Work. Each sample task is repeated
across factor profiles so the expected result can be checked while holding
the task description constant. All records are marked
SYNTHETIC_VALIDATION_ONLY.

Regenerate the file with:
python generate_contextify_scoring_validation.py

Compatibility note
The manuscript and the deployed system should agree on the factor scale.
This fixture uses the application's 1-10 factor scale. One manuscript schema
table describes 1-5 fields, which conflicts with the 1-10 factor table and
the current implementation; revise that manuscript table before finalizing.
