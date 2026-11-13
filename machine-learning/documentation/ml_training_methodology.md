# ML training methodology

The repeatable scripts are in `machine-learning/training/`. They use fixed random seed 42 and write candidate/evaluation artifacts under `datasets/`. New MS-LaTTE candidates are staged without replacing selected artifacts. Promotion requires an explicit `--promote` and a non-regressing location macro F1; the current model registry and artifact hashes remain the selected deployment reference.

## MS-LaTTE context labels

Two separate multi-label tasks are trained: likely location and likely time-of-day. A deterministic 65/15/20 split by normalized TaskTitle group (seed 42) produces 6,566 train, 1,516 validation, and 2,019 test records. No normalized title crosses partitions. The threshold is selected from 0.30, 0.40, 0.50, 0.60, 0.70 using validation macro F1; vocabulary and final model are refit on train+validation (8,082 records). The untouched test partition is evaluated once. The candidate is one-vs-rest Multinomial Naive Bayes with alpha 1; a most-frequent-label-set predictor is the test baseline.

## Reproduction

From the project root:

```powershell
python datasets/import_datasets.py
python machine-learning/training/train_context_models.py
python -m unittest discover -s machine-learning/tests -v
```

Add `--promote` to the context-model training command only when intentionally requesting the release gate to promote a candidate after its evaluation.
