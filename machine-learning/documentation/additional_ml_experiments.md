# Additional machine-learning experiments

## Survey dataset

No survey ML experiment was justified or run. With 244 respondents and strongly imbalanced candidate targets (for example, 221/244 positive responses for recommendation usefulness), an ordinary holdout would provide too few minority examples for a credible comparison. Similar positive/negative questions also create leakage risk. Keep this dataset for descriptive research and Contextify evaluation, not task recommendation prediction.

## Previously evaluated external experiments


## Contextify priority

A development-only model was trained from the separate synthetic task workbook. The current three-class version excludes seven source rows labeled Critical because Critical is not a manuscript category, and uses respondent-grouped splits for Low, Medium, and High. It is integrated only as a clearly marked Decision Lab preview and has no effect on task scores or order. See `task_priority_training_report.md` for the current evaluation.

No validated real-user task-priority model is available until actual task-factor snapshots and independently reviewed Contextify labels are collected under a documented protocol. Preserve formula-generated score approximation as a distinct, non-independent research question if ever evaluated.
