# MS-LaTTE model experiment report

Run `python machine-learning/training/train_context_models.py` to train/evaluate candidates and reproduce the complete metric report at `ml_experiment_report.json`. This stages candidate artifacts without replacing the currently selected model. Use `--promote` only to request gated promotion; the selected model is retained if macro F1 regresses.

The experiment uses a deterministic 65/15/20 train/validation/test split grouped by lowercased, token-normalized task title, seed 42. It uses task title text only and one-vs-rest Multinomial Naive Bayes with Laplace smoothing. Candidate thresholds are selected on validation macro F1; final model vocabulary and weights are refit on train+validation. The untouched test split is used for final metrics. The task's original list title is not substituted with Contextify category because those fields do not have matching meanings.

| Prediction target | Model macro F1 | Baseline macro F1 | Model micro F1 | Test records |
| --- | ---: | ---: | ---: | ---: |
| Likely location labels (candidate v1.0.4; selected) | 0.8197 | 0.5924 | 0.8817 | 2,019 |
| Likely time labels (candidate v1.0.5; research only) | 0.6907 | 0.4898 | 0.8045 | 2,019 |

The location candidate improved validation macro F1 over the active 0.5 threshold (0.8175 vs 0.8022), so it passed the promotion gate and is now the selected Decision Lab suggestion model (threshold 0.4). The time candidate remains research-only; night-label recall is low (weekday 0.222, weekend 0.175). Neither result verifies predictions for Contextify students. Do not describe these external holdout scores as system-user accuracy or as validation of the priority formula. For authoritative per-label results, see `ml_experiment_report.json`.
