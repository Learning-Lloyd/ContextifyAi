# Model comparison

Only executed experiments appear below. Scores are the actual saved holdout reports; values are rounded to four decimals. Macro F1 is emphasized for class imbalance. There are no unreported Logistic Regression, tree, forest, gradient-boosting, or transformer results.

| Model | Prediction task | Dataset | Evaluation metrics | Selected / use |
|---|---|---|---|---|
| Most-frequent label-set baseline | Likely location | MS-LaTTE, 2,019 test | Macro F1 0.5924; micro F1 0.8332 | Baseline only |
| One-vs-rest Multinomial Naive Bayes, threshold 0.5 | Likely location | MS-LaTTE, validation 1,516 | Macro F1 0.8022 | Version 1.0.0 configuration reference during promotion evaluation |
| One-vs-rest Multinomial Naive Bayes, threshold selected as 0.4 | Likely location | MS-LaTTE, validation 1,516; test 2,019 | Validation macro F1 0.8175; test macro F1 0.8197; micro F1 0.8817; exact match 0.6424 | Selected as optional Decision Lab cue v1.0.4; not validated on Contextify users |
| Most-frequent label-set baseline | Likely time | MS-LaTTE, 2,019 test | Macro F1 0.4898; micro F1 0.7746 | Baseline only |
| One-vs-rest Multinomial Naive Bayes, threshold selected as 0.3 | Likely time | MS-LaTTE, validation 1,516; test 2,019 | Macro F1 0.6907; micro F1 0.8045; exact match 0.0926 | Latest candidate v1.0.5 retained in research only; night-label recall remains weak |
