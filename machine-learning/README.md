# Contextify machine learning experiments

## Current status

The image and prompt agree on the intended flow: selected assignments are classified by a trained model, ranked from High to Low, and explained afterward by an AI. The project itself uses React, Laravel, MySQL, and its configured OpenRouter AI client, so those are the components to retain; this module does not introduce Node/Express or a separate Gemini integration.

Contextify now has trained, supplementary MS-LaTTE context models for likely location and time labels. The location model is available as a read-only suggestion in the authenticated Decision Lab. The time model remains a research artifact because its rare night-label F1 is only 0.220 on weekdays and 0.102 on weekends. Neither predicts Contextify priority.

There is now an experimental three-class Contextify task-priority classifier trained on the user-provided **synthetic / AI-generated sample workbook**. It predicts Low, Medium, or High; the seven source rows labeled Critical are excluded because Critical is not a manuscript category. It is a separate Decision Lab preview only, not validated on real students, and it does not change the deterministic weighted formula, task score, or task order. No human-collected labeled Contextify task dataset is available yet. The synthetic scoring-validation examples in the Research Dataset browser remain formula test cases, not participant records or ML labels.

The Decision Lab's deterministic score and ranking remain authoritative. The optional experimental prediction appears in a separate panel and is explicitly marked as trained from synthetic sample data.

## Training data needed

Use one row per real academic assignment at the time a priority decision is made. The header-only example is `dataset/training_template.csv`. Required columns:

| Column | Meaning |
| --- | --- |
| `title`, `description`, `category` | Assignment text and the existing task category/type |
| `importance`, `urgency` | Human/user ratings from 1 to 10 |
| `days_remaining` | Days until deadline; negative values can represent overdue tasks |
| `estimated_time_minutes` | Estimated effort; can be blank if unknown |
| `time_availability`, `current_workload` | Contextify factor ratings from 1 to 10 |
| `other_pending_assignments` | Number of other pending assignments |
| `priority_label` | Human-reviewed target: exactly `High`, `Medium`, or `Low` |
| `participant_id` | Optional anonymous ID used only to keep participants separated between train and test sets |

Priority labels must come from an adviser-approved, consistent human labeling rubric or observed user decisions. Do not derive them from Contextify's existing weighted score, stress level, exam grade, or random assignment; that would either teach the model the old formula or label a different outcome. Keep participant identity out of the dataset and use anonymous IDs only if group-aware evaluation is needed.

## Train the model

From this folder, create a Python virtual environment, install `requirements.txt`, then run:

```powershell
python training/train_model.py path\to\human_labeled_assignments.csv
```

The script validates the columns, values, and all three classes; makes a stratified holdout split (or participant-separated split when possible); trains a Random Forest pipeline; and reports accuracy, macro precision/recall/F1, per-class metrics, and a confusion matrix. It saves the fitted pipeline and evaluation report under `models/` and `evaluation/`. A small holdout score is not evidence of generalization; the study should collect enough balanced, independent assignment labels and report limitations.


## Train the synthetic experimental model

The prepared CSV, aggregate workbook audit, model artifact, and held-out evaluation are in `datasets/`. The original workbook is not copied into the repository. Re-run preprocessing and training from the supplied synthetic workbook:

```powershell
cd C:\xamppn\htdocs\ContextifyAI
python -m venv machine-learning\.venv-synthetic
machine-learning\.venv-synthetic\Scripts\python.exe -m pip install -r machine-learning\requirements-synthetic-model.txt
machine-learning\.venv-synthetic\Scripts\python.exe machine-learning\training\train_synthetic_priority_model.py --workbook "$env:USERPROFILE\Downloads\contextify_survey_dataset_234_respondents.xlsx"
```

To train again from the already prepared synthetic CSV and audit without reopening the workbook, add `--prepared-only`. The pipeline saves the preprocessor and estimator together, stages the artifact under `datasets/models/`, writes the evaluation report, and adds a separate `experimental_models` entry in the registry. Seven source rows labeled Critical are excluded because Critical is not a manuscript category. Only Low, Medium, and High are modeled; do not treat the preview as a validated recommendation.

## Rebuild the MS-LaTTE research models

The independent external context experiments are trained with the standard-library script:

```powershell
python datasets/import_datasets.py
python machine-learning/training/train_context_models.py
```

The script trains multi-label Multinomial Naive Bayes candidates for likely location and time from task title text. It uses a fixed 80/20 holdout grouped by token-normalized task title and compares with a most-frequent-label baseline and the currently selected model. Candidates are staged in `datasets/models/candidates/`; the selected artifact remains unchanged unless explicit gated promotion is requested. Registry metadata is in `datasets/models/model_registry.json`.

```powershell
python machine-learning/training/train_context_models.py --promote
```

Promotion is optional and explicit. The script retains the selected model if the candidate location macro F1 is lower. The default command only stages a candidate.

## Start the experimental priority model API

After the model dependencies are installed and the artifact has been generated, start the local API from the project root in a separate terminal:

```powershell
machine-learning\.venv-synthetic\Scripts\python.exe -m uvicorn api.main:app --app-dir machine-learning --host 127.0.0.1 --port 8010
```

`GET /health` reports whether the experimental artifact is loadable. `POST /predict-priority` accepts one or more assignments and returns a Low/Medium/High category plus a separate rule-based next-step suggestion for each assignment, in input order, with explicit synthetic-data provenance. The suggestion uses the predicted category and urgency; it is not generative-AI text. The endpoint returns no confidence or probability because calibration was not evaluated, and it does not rank tasks. If the artifact is unavailable, the endpoint returns HTTP 503.

Laravel calls this service server-to-server through the authenticated `/api/decision-lab/predict-experimental-priority` route. The separate Decision Lab preview shows predicted categories and their next-step suggestions; it does not display confidence, alter formula scores, or reorder tasks. Keep the service bound to localhost. It returns a clear unavailable response if the API or artifact is not ready.

## Input example

```json
{
  "assignments": [
    {
      "task_id": 42,
      "title": "Literature review draft",
      "description": "Summarize the related studies for the research paper.",
      "category": "Academic",
      "importance": 8,
      "urgency": 7,
      "days_remaining": 2,
      "estimated_time_minutes": 180,
      "time_availability": 4,
      "current_workload": 7,
      "other_pending_assignments": 3
    }
  ]
}
```

The example is API documentation only; it is not a training record or a hardcoded prediction.
