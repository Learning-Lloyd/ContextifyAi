# Contextify research datasets

This folder holds source copies, processed research records, reproducible reports, and experimental model artifacts. External records never become tasks owned by a Contextify user.

## Import or refresh the files

The public source file is in `original/`. From the project root, run:

```powershell
python datasets/import_datasets.py
```
## Rebuild the supplementary context models

After importing, run:

```powershell
python machine-learning/training/train_context_models.py
```

This uses the Python standard library only. It trains location and time multi-label Naive Bayes candidates from MS-LaTTE's known human judgements and stages them in `models/candidates/`. The authenticated Decision Lab continues using the selected location model unless explicit gated promotion is requested with `--promote`; promotion requires that holdout macro F1 does not regress. `models/model_registry.json` records version, hashes, metrics, training date, and deployment status. Predictions do not alter task fields or weighted scores.
Run the model and dataset checks with:

```powershell
python -m unittest discover -s machine-learning/tests -v
```

## Current research use

- `contextify_scoring_validation.csv` remains a synthetic check set for the established 40/30/20/10 formula. It is not training data.
- MS-LaTTE supports exploratory predictions of annotator-provided likely task locations and times.
- MS-LaTTE does not supply Contextify's four scoring factors or human-reviewed Contextify priority targets. It must not replace or train the priority score.

See `documentation/` for provenance, schema, transformations, evaluation, and limitations.
