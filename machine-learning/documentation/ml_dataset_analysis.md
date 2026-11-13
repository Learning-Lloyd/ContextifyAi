# ML dataset feasibility and analysis

The source-level audit is reproducible in `datasets/documentation/dataset_import_report.json`; raw files and their checksums are recorded there. Missingness percentages below are based on supplied rows.

| Objective | Dataset / fields | Usable records | Target distribution / missingness | Feasibility and decision |
|---|---|---:|---|---|
| Likely task location | MS-LaTTE `TaskTitle`, known `LocJudgements` | 10,101 | 29,154 known judgements; home 22,178, work 16,786, public 5,001; no invalid/duplicate source IDs | Feasible multi-label annotation prediction. Trained; location suggestion integrated as optional. |
| Likely task time-of-day | MS-LaTTE `TaskTitle`, known `TimeJudgements` | 10,101 | 50,245 known judgements across 10 weekday/weekend-time labels | Feasible multi-label annotation prediction. Trained but research-only because rare night-label recall is weak. These labels are not deadlines. |
| List-context/annotation relationship | MS-LaTTE `TaskTitle`, `ListTitle`, and annotation fields | 10,101 | Both text fields are present; the targets are human annotation labels | Supported for offline analysis, but not trained here because Contextify has no corresponding task-list context field and list title semantics do not match task category. |
| Synthetic Contextify priority prototype | Separate synthetic workbook; 851 eligible task rows from 212 respondent groups | Source labels: Low 264, Medium 338, High 242, Critical 7; Critical excluded from training | Development-only three-class grouped classifier is evaluated separately; not real-user validation. |


## Leakage and representativeness

- Repeated MS-LaTTE titles are grouped by normalized title so duplicates do not cross the holdout boundary.
- MS-LaTTE does not represent Contextify users, and its labels do not validate the manuscript's weighting formula.
