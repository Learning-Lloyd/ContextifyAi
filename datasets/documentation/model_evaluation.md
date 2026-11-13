# Model evaluation

Detailed metrics, per-label precision/recall/F1, exact-match accuracy, and Hamming loss are in `ml_experiment_report.json`.

| Target | Macro F1 | Exact-match accuracy | Hamming loss |
| --- | ---: | ---: | ---: |
| Location labels | 0.8197 | 0.6424 | 0.1527 |
| Time labels | 0.6907 | 0.0926 | 0.2119 |

These are metrics from one held-out split of external data after validation-selected thresholds. They are not calibrated probabilities. Thresholds were selected from 0.30, 0.40, 0.50, 0.60, 0.70 using validation macro F1. The time model's rare night-label results are why it is not used for live suggestions. The location model remains an optional read-only cue and does not populate any user's task fields.
