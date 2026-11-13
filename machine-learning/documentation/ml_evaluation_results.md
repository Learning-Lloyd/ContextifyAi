# ML evaluation results

## MS-LaTTE

The selected location v1.0.4 achieves macro F1 0.8197 and micro F1 0.8817 on the 2,019-record test set, compared with macro F1 0.5924 for the most-frequent-label-set baseline. Per-label F1 is Home 0.9424, Work 0.8848, Public 0.6319. Public is the weakest label. On validation, the selected threshold 0.4 achieved macro F1 0.8175 versus 0.8022 for active version 1.0.0's 0.5 threshold.

The latest time candidate achieves macro F1 0.6907 and micro F1 0.8045 against baseline macro F1 0.4898 and micro F1 0.7746. Night-label F1/recall remain weak: weekday 0.2773/0.2222, weekend 0.2403/0.1751. It remains research-only and is not a user-facing time suggestion.

## Interpretation

These are external benchmark holdouts. They do not measure performance on Contextify users, show that predictions are correct for an individual's tasks, or validate the weighted priority formula. Full figures are generated from the reproducible JSON reports; this document summarizes them without replacing those reports.
