# Contextify machine-learning implementation report

Date: 2026-11-13

## What was already implemented

- A standard-library Multinomial Naive Bayes experiment predicted MS-LaTTE location/time annotation labels; the location cue was already connected to Decision Lab.
- The existing Contextify priority formula was already implemented as importance 40%, urgency 30%, time availability 20%, and current workload 10%.

## Additional survey audit (2026-11-13)

- Inspected the user-supplied `Contextify_FormResponses2_Valid.xlsx` in place. The workbook has Clean Data (245 × 39 including headers), Removed Respondents (55 × 40), Codebook (44 × 2), and Cleaning Log (12 × 3). The cleaned sheet contains 244 respondents, no missing data cells, and no exact duplicate rows. The workbook SHA-256 is `195dca84b4479e681f010249ec0d2362bfa13c8ed5226a8909c0f4ba6b57118a`.
- Reviewed the codebook and cleaning log: 300 original responses, 2 duplicates removed, and 54 invalid responses excluded (with 3 overlapping invalid rules), leaving 244. The log says negative `_R` fields were not reverse-coded. The source workbook was not changed or copied into the repository or app; reports omit respondent identities, demographics, timestamps, and raw comments.
- Added six survey and feasibility documents: `survey_dataset_analysis.md`, `survey_data_dictionary.md`, `survey_ml_feasibility.md`, `three_dataset_comparison.md`, `contextify_priority_model_feasibility.md`, and `additional_ml_experiments.md`.
- Preserved the PHP weighted scoring formula at 40/30/20/10; it was inspected and not edited.

## Synthetic task-priority prototype (2026-11-13)

- Inspected `contextify_synthetic_model_package.zip` before installation. It contained a Joblib model, Markdown report, JSON metrics, and prepared CSV, but no wheel files, installers, requirements file, or dependency/Python/scikit-learn versions. The archived Joblib was not deserialized or executed because its provenance and runtime compatibility were unverified; its prior metric claims were not treated as this implementation's results.
- Inspected `contextify_survey_dataset_234_respondents.xlsx` read-only. The Responses sheet has 234 rows and 68 columns; Codebook defines its fields. The workbook SHA-256 is `436923281920066002f260d557841ec20e0daaeae0e124e2229194c8696baeb9`. The source workbook stayed unchanged.
- Prepared 851 labeled task rows from 212 current-student respondent groups. The target has Low 264, Medium 338, High 242, Critical 7. All seven Critical records are in separate respondent groups. Task rank and reasoning were excluded as inputs. Bucket-to-factor transformations and missing-value handling are documented; no records were fabricated or oversampled.
- Compared a majority baseline, class-weighted structured Logistic Regression, class-weighted text-plus-structured Logistic Regression, and class-weighted structured Random Forest. The current three-class v1.1.0 selects structured Random Forest by validation macro F1; seven source rows labeled Critical were excluded because Critical is not a manuscript category.
- Used respondent-grouped partitions: train 601 tasks/151 respondents, validation 122/30, test 121/31. No respondent crosses partitions. Repeated task templates can cross respondent groups, and only 40 templates occur, so new-task generalization remains uncertain.
- Current held-out test: accuracy 0.6612, macro F1 0.6594, versus majority baseline accuracy 0.3967 and macro F1 0.1893. Per-class F1: Low 0.7529, Medium 0.5952, High 0.6301. These are synthetic-distribution metrics only.
- Registered model `contextify_task_priority_classifier` v1.1.0 with dataset/artifact hashes and provenance as `experimental_only_synthetic_data`. It is served from a separate local FastAPI API, called through an authenticated Laravel route, and shown in Decision Lab as a separate synthetic-data preview. It returns no confidence, changes no task field, and does not affect the formula or formula-based order.
- Installed missing scikit-learn, Joblib, FastAPI, and Uvicorn into the project Python environment; reused available NumPy, pandas, and openpyxl. Python 3.12.14; scikit-learn 1.9.1; Joblib 1.6.0; pandas 3.0.1; NumPy 2.3.5; openpyxl 3.1.5; FastAPI 0.162.5; Uvicorn 0.54.0. Exact tested versions are recorded in `machine-learning/requirements-synthetic-model.txt`.
- Preserved the existing external model registry entries and all 40/30/20/10 weights.

## Work completed in this continuation

- Audited the current saved reports and corrected thesis-facing documentation to match real results.
- Added group-isolated train/validation/test splitting for MS-LaTTE (65/15/20, seed 42), threshold selection on validation macro F1, and final refitting on train+validation. Repeated normalized titles do not cross split boundaries.
- Promoted the location model to version 1.0.4 after its validation macro F1 (0.8175) exceeded the active threshold configuration (0.8022). The untouched test macro F1 was 0.8197. This remains a clearly labeled, read-only location suggestion.
- Updated PHP inference to use the selected model's saved threshold and include model version and dataset provenance in prediction metadata.
- Added versioned candidate artifacts and a model registry with artifact/data hashes, training metadata, metrics, and deployment state. New training runs stage candidates; `--promote` is required and promotion is blocked if validation macro F1 regresses against the selected threshold configuration.
- Added feasibility, preprocessing, methodology, comparison, evaluation, integration, architecture, and limitations documentation.

## Actual experiment results

| Objective | Dataset and split | Result | Decision |
|---|---|---|---|
| Likely location | MS-LaTTE; 6,566 train, 1,516 validation, 8,082 final fit, 2,019 test | Multinomial Naive Bayes macro F1 0.8197, micro F1 0.8817; most-frequent-label baseline macro F1 0.5924. Validation macro F1 was 0.8175 at threshold 0.4 vs 0.8022 at threshold 0.5. | Selected location model v1.0.4, supplementary Decision Lab suggestion only. |
| Likely time-of-day | Same MS-LaTTE split | Candidate macro F1 0.6907, micro F1 0.8045 vs baseline macro F1 0.4898. Night recall: weekday 0.2222, weekend 0.1751. | Research only; not integrated as a user-facing time prediction. |
| Contextify task priority | Synthetic workbook; 851 labeled task rows; seven Critical-labeled source rows excluded; grouped train 601 / validation 122 / test 121 | Class-weighted Random Forest, structured features; three output categories Low/Medium/High | Accuracy 0.6612, macro F1 0.6594; majority baseline 0.3967 / 0.1893. Per-class F1 Low 0.7529, Medium 0.5952, High 0.6301. | Experimental-only Decision Lab preview; not real-user validated. Formula remains authoritative. |


## Files created or modified for this ML work

- `machine-learning/training/train_context_models.py` — group-safe validation, threshold selection, candidate staging, and gated promotion.
- `machine-learning/tests/test_context_models.py` — ML and registry checks.
- `machine-learning/dataset/prepare_synthetic_priority_dataset.py` and `machine-learning/training/train_synthetic_priority_model.py` — workbook audit/preprocessing and reproducible grouped model training.
- `machine-learning/api/main.py`, `server/app/Http/Controllers/Api/ExperimentalPriorityPredictionController.php`, authenticated API route, and Decision Lab UI — separate synthetic-data category preview, isolated from scoring and ranking.
- `machine-learning/tests/test_synthetic_priority_model.py` and `server/tests/Feature/ExperimentalPriorityPredictionTest.php` — model and backend isolation/error-path tests.
- `machine-learning/documentation/task_priority_dataset_report.md`, `task_priority_training_report.md`, `datasets/documentation/contextify_synthetic_priority_evaluation.json`, prepared synthetic CSV, versioned model artifact, and experimental model registry entry — provenance, features, metrics, and limitations.
- `machine-learning/documentation/*.md` — architecture, feasibility, preprocessing, training, comparisons, evaluation, integration, limitations, and this report.
- `datasets/models/model_registry.json` and versioned `datasets/models/candidates/` artifacts — provenance and candidate history.
- `server/app/Services/ResearchContextPredictor.php` and `server/app/Http/Controllers/Api/ResearchDatasetController.php` — versioned inference metadata, saved-threshold behavior, and research summary metadata.
- `server/tests/Feature/ResearchContextTest.php` — auth, isolation, and response metadata assertions.
- `client/src/components/ResearchContextPanel.jsx` and `client/src/pages/ResearchDataset.jsx` — display prediction version and research experiment metadata.
- `machine-learning/documentation/survey_dataset_analysis.md`, `survey_data_dictionary.md`, `survey_ml_feasibility.md`, `three_dataset_comparison.md`, `contextify_priority_model_feasibility.md`, and `additional_ml_experiments.md` — aggregate-only survey audit, feasibility findings, and responsible-use recommendations.
- This report — appended survey audit and verified registry status.

The survey workbook remains at the user-provided Downloads path and is not committed or exposed in the app. The separate synthetic workbook also remains in Downloads; only its prepared synthetic task rows and model artifact were added to the project.

Existing unrelated workspace edits from earlier Contextify work remain outside this report.

## Verification

- Python ML suite: 14 tests passed (including model loading, allowed-label prediction, validation/error handling, provenance, registry hashes, and respondent isolation).
- Python `compileall`: passed for the new preparation, training, API, and test files.
- Live FastAPI smoke test: `/health` returned `model_ready: true`; a sample prediction returned HTTP 200 and an experimental category with synthetic provenance.
- Frontend production build: passed; Vite reports a large-chunk advisory (996 kB uncompressed JS).
- Frontend lint: exited successfully with 14 warnings in other existing files; no warning was reported in the edited Decision Lab page.
- PHP syntax checks: passed for the new controller, route, config, and feature test.
- Formula check: `PriorityCalculator` weights remain 0.40/0.30/0.20/0.10 and the calculation code was not modified.
- Direct Laravel service inference: passed; `Buy groceries` returned a likely-location label and model version 1.0.4.
- `git diff --check`: passed.
- Laravel PHPUnit feature tests could not start: PHPUnit's bootstrap check reports `server/vendor/autoload.php` unreadable (`is_readable` returns false in this environment), although the file exists and can be required directly. This appears to be an environment file-readability issue, not a test assertion failure.

## Remaining limitations

- The synthetic prototype is not validated on actual students. Collect independently reviewed real task/factor labels before making real-world performance claims.
- Seven source records labeled Critical are excluded from the model because the manuscript defines only Low, Medium, and High categories.
- The PHP feature suite could not run: PHPUnit could not open `server/vendor/autoload.php` because PHP reports it unreadable, although requiring the file directly succeeds. The newly added feature tests remain to be run in an environment where PHPUnit can read the Composer bootstrap.
- The local ML API must be running on `127.0.0.1:8010` for the preview to work; otherwise the UI shows an unavailable message.
- The location predictor is based on external human annotations and has weaker Public-label F1 (0.6319) than Home/Work. Treat outputs as suggestions.
- The app's Laravel feature suite and live browser flow still need a full run in an environment where PHPUnit can read the Composer bootstrap.
