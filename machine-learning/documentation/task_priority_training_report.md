# Contextify synthetic task-priority training report

> **This is an experimental classifier trained on SYNTHETIC / AI-GENERATED SAMPLE DATA. It does not establish real-student performance and must not override Contextify's weighted score or task order.**

Model: `contextify_task_priority_classifier` v`1.1.0`  
Algorithm selected by validation macro F1: RandomForestClassifier (class-weighted; structured features)  
Source: `contextify_survey_dataset_234_respondents.xlsx`  
Source workbook SHA-256: `436923281920066002f260d557841ec20e0daaeae0e124e2229194c8696baeb9`  
Artifact SHA-256: `5137ad1bd252bd4552a6e86fd3b571757b049b365b090e8cc9bfdbbfe2943f06`  
Evaluated: `2026-11-13T06:17:27.066640+00:00`

## Data split

Respondent-grouped split with seed 42. No respondent overlaps partitions. The 7-fold split assigns five folds to training and one each to validation and test: training 601 tasks / 151 respondents, validation 122 / 30, test 121 / 31.

| Partition | Low | Medium | High |
|---|---:|---:|---:|
| Train | 188 | 241 | 172 |
| Validation | 38 | 49 | 35 |
| Test | 38 | 48 | 35 |

## Model comparison

Candidates were chosen on the validation split by macro F1. The test split was held out until the selected pipeline was refitted on training plus validation.

| Candidate | Validation accuracy | Validation macro F1 |
|---|---:|---:|
| majority_baseline | 0.4016 | 0.1910 |
| logistic_regression_structured_balanced | 0.6230 | 0.6273 |
| logistic_regression_text_and_structured_balanced | 0.5984 | 0.6020 |
| random_forest_structured_balanced | 0.6393 | 0.6417 |

## Held-out test results

Selected model accuracy: **0.6612**. Macro precision: **0.6602**; macro recall: **0.6734**; macro F1: **0.6594**; weighted F1: **0.6549**.

Majority baseline accuracy: 0.3967; macro F1: 0.1893.

| Class | Precision | Recall | F1 | Test support |
|---|---:|---:|---:|---:|
| Low | 0.6809 | 0.8421 | 0.7529 | 38 |
| Medium | 0.6944 | 0.5208 | 0.5952 | 48 |
| High | 0.6053 | 0.6571 | 0.6301 | 35 |

### Confusion matrix

Rows are actual labels and columns are predicted labels, in Low / Medium / High order.

```text
[
  [
    32,
    3,
    3
  ],
  [
    11,
    25,
    12
  ],
  [
    4,
    8,
    23
  ]
]
```

## Features and preprocessing

Training records excluded from the model because Critical is not in the manuscript categories: 7. Selected model inputs: importance, urgency, estimated_time_minutes, time_availability, current_workload, other_pending_assignments, category. The title/description Logistic Regression candidate was also evaluated; validation macro F1 selected the structured-only candidate. Task rank and written explanations were excluded; respondent ID is a split group only. Missing values remain missing in the prepared CSV and are imputed inside each fitted pipeline using training data only.

Training compared a most-frequent baseline, class-weighted structured Logistic Regression, class-weighted text-plus-structured Logistic Regression, and class-weighted structured Random Forest. No oversampling was used. Confidence/probability calibration was not evaluated; the application does not show confidence.

## Limitations

- Synthetic/AI-generated sample records; results do not establish performance on real students.
- Seven source records labeled Critical were excluded because Critical is not a Contextify manuscript category; the model is trained and evaluated only on Low, Medium, and High.
- Only 40 task-title/description templates repeat across respondents. The text candidate could see repeated templates across respondent-group folds; the selected model excludes text, but the generated dataset still offers limited evidence about new real tasks.
- One validation/test split from a small synthetic dataset; no external validation or calibration.
- Ordinal mappings from questionnaire buckets to Contextify-like factor scales are documented transformations, not validated equivalences.
- Predicted category is experimental and must not replace or alter Contextify's deterministic weighted score or ranking.
- The priority category and task rank are strongly associated in the synthetic workbook, so the label may have been constructed from the same ranking judgment even though rank was excluded from inputs.
- Source questionnaire buckets mapped to Contextify scoring scales are approximations; no validation establishes that they are equivalent to the application's factor calculations.

## ZIP package inspection and runtime

The supplied ZIP contains a Joblib model artifact, a Markdown training report, a JSON metrics file, and a prepared CSV. It contains no wheel/installer packages, requirements file, dependency versions, or Python/scikit-learn version metadata. The included Joblib artifact was not deserialized or executed because pickle-based Joblib files can execute code when loaded and their environment/version compatibility is unknown. Its report's prior metric claims were not treated as this run's results.

Runtime used for this training:

- python: 3.12.14
- scikit_learn: 1.9.1
- pandas: 3.0.1
- numpy: 2.3.5
- joblib: 1.6.0
- openpyxl: 3.1.5
- fastapi: 0.162.5
- uvicorn: 0.54.0

The project environment uses the already-declared ML/API requirements plus `openpyxl`; no system Python packages were changed. Exact tested top-level versions are recorded in `machine-learning/requirements-synthetic-model.txt`.

The model remains an optional Decision Lab research preview. Formula score and formula-based task order are computed and displayed independently.

## Reproduction

```powershell
.\machine-learning\.venv-synthetic\Scripts\python.exe machine-learning\training\train_synthetic_priority_model.py --workbook "$env:USERPROFILE\Downloads\contextify_survey_dataset_234_respondents.xlsx"
```

Artifact: `datasets\models\contextify_task_priority_synthetic_v1.1.0.joblib`. Machine-readable metrics: `datasets/documentation/contextify_synthetic_priority_evaluation.json`. Model pipeline (preprocessing plus estimator) is serialized together.
