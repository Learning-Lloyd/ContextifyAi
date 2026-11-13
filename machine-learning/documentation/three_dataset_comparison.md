# Comparison of Contextify’s research datasets

Each source answers a different question. They are not combined into one training table.

| Dataset | Actual record/label content | Supported use | Not supported |
|---|---|---|---|
| MS-LaTTE | 10,101 task-title records with human location and time-of-day annotations | Supplementary likely-location suggestion; separate research-only time-of-day experiment | Contextify task priority, deadlines, available time, workload, or student-specific accuracy |
| Contextify survey | 244 cleaned student survey responses, questionnaire ratings, multi-select choices, optional suggestions | User-needs analysis, perceived acceptance/usefulness, desired features, decision-difficulty and fatigue research | Task-level examples, actual user behavior logs, supervised Contextify task-priority training |
| Synthetic Contextify task workbook | 234 synthetic respondent rows; 935 task rows total and 851 labeled current-student task rows from 212 respondent groups | Development-only three-class classifier; seven source rows labeled Critical excluded, remaining labels use grouped evaluation | Real student/user performance claims or independent real-world task-priority evidence |

## Model status verified in the repository

- MS-LaTTE likely-location v1.0.4 is listed as `integrated_supplementary`, with the saved artifact `datasets/models/ms_latte_location_model.json`; the registry records SHA-256 provenance and threshold 0.4.
- MS-LaTTE likely-time v1.0.0 is `research_only`.
- Synthetic task-priority classifier v1.1.0 is trained and served as an experimental-only Decision Lab preview for Low/Medium/High; current metrics are in `task_priority_training_report.md`.
- Candidate artifacts (including v1.0.5 MS-LaTTE candidates) are staged candidates, not active deployments. Do not report a candidate as promoted.
- No survey-response model exists. No validated real-student Contextify priority model exists.

The dataset-import report and model evaluation JSON files remain the detailed source of truth for the external experiments. Existing reports are not rewritten by this survey analysis.

## Why they cannot be merged for task priority


Keep the 40/30/20/10 Contextify formula authoritative. Use the survey to evaluate user needs separately and use external predictions only for the limited purposes recorded in the registry.

These datasets have distinct schemas and label meanings; their results should be reported separately rather than treating labels as interchangeable.
