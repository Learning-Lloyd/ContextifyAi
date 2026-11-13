"""Train and evaluate an experimental classifier using synthetic Contextify tasks."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import platform
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "machine-learning" / "dataset"))
from prepare_synthetic_priority_dataset import write_prepared_dataset
DEFAULT_WORKBOOK = Path.home() / "Downloads" / "contextify_survey_dataset_234_respondents.xlsx"
DATA_PATH = ROOT / "datasets" / "processed" / "contextify_synthetic_priority_training_v1.csv"
AUDIT_PATH = ROOT / "datasets" / "documentation" / "contextify_synthetic_priority_dataset_audit.json"
MODEL_PATH = ROOT / "datasets" / "models" / "contextify_task_priority_synthetic_v1.1.0.joblib"
EVALUATION_PATH = ROOT / "datasets" / "documentation" / "contextify_synthetic_priority_evaluation.json"
TRAINING_REPORT_PATH = ROOT / "machine-learning" / "documentation" / "task_priority_training_report.md"
REGISTRY_PATH = ROOT / "datasets" / "models" / "model_registry.json"
VERSION = "1.1.0"
SEED = 42
LABELS = ["Low", "Medium", "High"]
SOURCE_LABELS = {*LABELS, "Critical"}
NUMERIC = [
    "importance", "urgency", "estimated_time_minutes", "time_availability",
    "current_workload", "other_pending_assignments",
]
CATEGORICAL = ["category"]
TEXT = ["title", "description"]
ALL_FEATURES = TEXT + CATEGORICAL + NUMERIC
STRUCTURED_FEATURES = NUMERIC + CATEGORICAL


def _pipeline(model: Any, include_text: bool) -> Pipeline:
    transformers: list[tuple[str, Any, Any]] = [
        (
            "numeric",
            Pipeline([
                ("impute", SimpleImputer(strategy="median", keep_empty_features=True)),
                ("scale", StandardScaler()),
            ]),
            NUMERIC,
        ),
        (
            "category",
            Pipeline([
                ("impute", SimpleImputer(strategy="constant", fill_value="Unknown")),
                ("one_hot", OneHotEncoder(handle_unknown="ignore")),
            ]),
            CATEGORICAL,
        ),
    ]
    if include_text:
        transformers.extend([
            ("title_text", HashingVectorizer(n_features=2**10, alternate_sign=False, ngram_range=(1, 2)), "title"),
            ("description_text", HashingVectorizer(n_features=2**11, alternate_sign=False, ngram_range=(1, 2)), "description"),
        ])
    return Pipeline([
        ("preprocessing", ColumnTransformer(transformers=transformers, remainder="drop")),
        ("classifier", model),
    ])


def _metrics(y_true: pd.Series, predictions: np.ndarray) -> dict[str, Any]:
    return {
        "accuracy": float(accuracy_score(y_true, predictions)),
        "macro_precision": float(precision_score(y_true, predictions, labels=LABELS, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_true, predictions, labels=LABELS, average="macro", zero_division=0)),
        "macro_f1": float(f1_score(y_true, predictions, labels=LABELS, average="macro", zero_division=0)),
        "weighted_f1": float(f1_score(y_true, predictions, labels=LABELS, average="weighted", zero_division=0)),
        "per_class": classification_report(y_true, predictions, labels=LABELS, output_dict=True, zero_division=0),
        "confusion_matrix_labels": LABELS,
        "confusion_matrix": confusion_matrix(y_true, predictions, labels=LABELS).tolist(),
    }


def _versions() -> dict[str, str]:
    packages = {
        "scikit_learn": "scikit-learn", "pandas": "pandas", "numpy": "numpy",
        "joblib": "joblib", "openpyxl": "openpyxl", "fastapi": "fastapi", "uvicorn": "uvicorn",
    }
    return {"python": platform.python_version(), **{
        key: importlib.metadata.version(package) for key, package in packages.items()
    }}


def train(data_path: Path = DATA_PATH, audit_path: Path = AUDIT_PATH, model_path: Path = MODEL_PATH,
          evaluation_path: Path = EVALUATION_PATH, registry_path: Path = REGISTRY_PATH) -> dict[str, Any]:
    frame = pd.read_csv(data_path)
    required = set(ALL_FEATURES + ["priority_label", "participant_id"])
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError("Prepared dataset is missing columns: " + ", ".join(missing))
    frame = frame.copy()
    frame["priority_label"] = frame["priority_label"].astype(str).str.strip().str.title()
    invalid = sorted(set(frame["priority_label"]) - SOURCE_LABELS)
    if invalid:
        raise ValueError("Unexpected priority labels: " + ", ".join(invalid))
    excluded_source_records = int((~frame["priority_label"].isin(LABELS)).sum())
    frame = frame.loc[frame["priority_label"].isin(LABELS)].copy().reset_index(drop=True)
    if frame["participant_id"].isna().any() or frame["participant_id"].astype(str).str.strip().eq("").any():
        raise ValueError("Participant grouping IDs must be present")
    for column in NUMERIC:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
        if frame[column].notna().sum() == 0:
            raise ValueError(f"Feature {column} has no usable numeric values")

    y = frame["priority_label"]
    groups = frame["participant_id"].astype(str)
    if len(set(y)) != len(LABELS):
        raise ValueError("All three Contextify target classes must be present")

    splitter = StratifiedGroupKFold(n_splits=7, shuffle=True, random_state=SEED)
    folds = list(splitter.split(frame, y, groups))
    test_indices = folds[0][1]
    validation_indices = folds[1][1]
    test_set = set(test_indices.tolist())
    validation_set = set(validation_indices.tolist())
    train_indices = np.array([i for i in range(len(frame)) if i not in test_set and i not in validation_set])
    partitions = {
        "train": train_indices,
        "validation": validation_indices,
        "test": test_indices,
    }
    for name, indices in partitions.items():
        present = set(y.iloc[indices])
        if present != set(LABELS):
            raise ValueError(f"{name} partition does not include every target class: {sorted(present)}")
    group_sets = {name: set(groups.iloc[idx]) for name, idx in partitions.items()}
    if (group_sets["train"] & group_sets["validation"] or group_sets["train"] & group_sets["test"]
            or group_sets["validation"] & group_sets["test"]):
        raise AssertionError("Respondent leakage detected across partitions")

    x = frame[ALL_FEATURES]
    candidates = {
        "majority_baseline": DummyClassifier(strategy="most_frequent"),
        "logistic_regression_structured_balanced": _pipeline(
            LogisticRegression(class_weight="balanced", max_iter=3000, random_state=SEED), include_text=False
        ),
        "logistic_regression_text_and_structured_balanced": _pipeline(
            LogisticRegression(class_weight="balanced", max_iter=3000, random_state=SEED), include_text=True
        ),
        "random_forest_structured_balanced": _pipeline(
            RandomForestClassifier(n_estimators=300, class_weight="balanced", min_samples_leaf=2, random_state=SEED, n_jobs=-1),
            include_text=False,
        ),
    }
    validation_results: dict[str, Any] = {}
    validation_rank: list[tuple[float, str]] = []
    for name, candidate in candidates.items():
        if name == "majority_baseline":
            candidate.fit(x.iloc[train_indices], y.iloc[train_indices])
        else:
            candidate.fit(x.iloc[train_indices], y.iloc[train_indices])
        prediction = candidate.predict(x.iloc[validation_indices])
        score = f1_score(y.iloc[validation_indices], prediction, labels=LABELS, average="macro", zero_division=0)
        validation_results[name] = _metrics(y.iloc[validation_indices], prediction)
        validation_rank.append((float(score), name))

    selected_name = sorted(validation_rank, key=lambda item: (item[0], item[1]))[-1][1]
    if selected_name == "majority_baseline":
        # A predictive artifact must be a trained classifier, even if the baseline wins.
        selected_name = sorted((item for item in validation_rank if item[1] != "majority_baseline"), key=lambda item: (item[0], item[1]))[-1][1]
    if selected_name == "logistic_regression_structured_balanced":
        final_pipeline = _pipeline(LogisticRegression(class_weight="balanced", max_iter=3000, random_state=SEED), False)
        algorithm = "LogisticRegression (class-weighted; structured features)"
    elif selected_name == "logistic_regression_text_and_structured_balanced":
        final_pipeline = _pipeline(LogisticRegression(class_weight="balanced", max_iter=3000, random_state=SEED), True)
        algorithm = "LogisticRegression (class-weighted; text and structured features)"
    else:
        final_pipeline = _pipeline(RandomForestClassifier(n_estimators=300, class_weight="balanced", min_samples_leaf=2, random_state=SEED, n_jobs=-1), False)
        algorithm = "RandomForestClassifier (class-weighted; structured features)"
    selected_features = ALL_FEATURES if selected_name == "logistic_regression_text_and_structured_balanced" else STRUCTURED_FEATURES

    train_validation_indices = np.concatenate([train_indices, validation_indices])
    final_pipeline.fit(x.iloc[train_validation_indices], y.iloc[train_validation_indices])
    test_predictions = final_pipeline.predict(x.iloc[test_indices])
    baseline = DummyClassifier(strategy="most_frequent").fit(x.iloc[train_validation_indices], y.iloc[train_validation_indices])
    baseline_predictions = baseline.predict(x.iloc[test_indices])

    source_hash = json.loads(audit_path.read_text(encoding="utf-8"))["source_sha256"]
    evaluated_at = datetime.now(timezone.utc).isoformat()
    evaluation: dict[str, Any] = {
        "schema_version": 1,
        "model_name": "contextify_task_priority_classifier",
        "model_version": VERSION,
        "provenance": "SYNTHETIC / AI-GENERATED SAMPLE DATA; not collected student responses",
        "dataset_filename": "contextify_survey_dataset_234_respondents.xlsx",
        "dataset_sha256": source_hash,
        "training_configuration": {
            "split": "StratifiedGroupKFold, 7 folds; two held-out respondent folds (validation and test); remaining five folds train",
            "random_seed": SEED,
            "train_records": int(len(train_indices)),
            "validation_records": int(len(validation_indices)),
            "test_records": int(len(test_indices)),
            "excluded_source_records": excluded_source_records,
            "excluded_source_labels": {"Critical": excluded_source_records},
            "train_respondents": len(group_sets["train"]),
            "validation_respondents": len(group_sets["validation"]),
            "test_respondents": len(group_sets["test"]),
            "train_label_counts": dict(Counter(y.iloc[train_indices])),
            "validation_label_counts": dict(Counter(y.iloc[validation_indices])),
            "test_label_counts": dict(Counter(y.iloc[test_indices])),
            "respondent_overlap": False,
        },
        "target_column": "priority_label",
        "classes": LABELS,
        "feature_list": selected_features,
        "excluded_features": ["participant_id (split group only)", "source_slot", "Task*_Rank", "Q20_Reasoning", "Q22_Change_If_Less_Time", "Q23_How_Ranking_Changes", "Task*_Priority_Level except target", "Task*_Difficulty", "Task*_Consequence", "Persona", "Q17_Circumstances"],
        "candidate_validation_metrics": validation_results,
        "selected_candidate": selected_name,
        "validation_selection_metric": "macro F1 across all three Contextify classes",
        "test_metrics": _metrics(y.iloc[test_indices], test_predictions),
        "majority_baseline_test_metrics": _metrics(y.iloc[test_indices], baseline_predictions),
        "probability_calibration": "Not evaluated; API returns no confidence/probability values.",
        "algorithm": algorithm,
        "random_seed": SEED,
        "package_versions": _versions(),
        "evaluated_at": evaluated_at,
        "limitations": [
            "Synthetic/AI-generated sample records; results do not establish performance on real students.",
            "Seven source records labeled Critical were excluded because Critical is not a Contextify manuscript category; the model is trained and evaluated only on Low, Medium, and High.",
            "Only 40 task-title/description templates repeat across respondents. The text candidate could see repeated templates across respondent-group folds; the selected model excludes text, but the generated dataset still offers limited evidence about new real tasks.",
            "One validation/test split from a small synthetic dataset; no external validation or calibration.",
            "Ordinal mappings from questionnaire buckets to Contextify-like factor scales are documented transformations, not validated equivalences.",
            "Predicted category is experimental and must not replace or alter Contextify's deterministic weighted score or ranking.",
        ],
    }

    model_path.parent.mkdir(parents=True, exist_ok=True)
    evaluation_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "pipeline": final_pipeline,
        "classes": LABELS,
        "metadata": {
            "name": evaluation["model_name"],
            "version": VERSION,
            "provenance": evaluation["provenance"],
            "dataset_sha256": source_hash,
            "feature_list": selected_features,
            "algorithm": algorithm,
            "package_versions": _versions(),
            "trained_at": evaluated_at,
            "test_accuracy": evaluation["test_metrics"]["accuracy"],
            "test_macro_f1": evaluation["test_metrics"]["macro_f1"],
        },
    }, model_path)
    artifact_hash = hashlib.sha256(model_path.read_bytes()).hexdigest()
    evaluation["artifact_path"] = str(model_path.relative_to(ROOT))
    evaluation["artifact_sha256"] = artifact_hash
    evaluation_path.write_text(json.dumps(evaluation, indent=2, ensure_ascii=False), encoding="utf-8")

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8")) if REGISTRY_PATH.exists() else {"schema_version": 1, "models": {}}
    registry.setdefault("experimental_models", {})["contextify_task_priority_synthetic"] = {
        "version": VERSION,
        "artifact": str(model_path.relative_to(ROOT)).replace("\\", "/"),
        "artifact_sha256": artifact_hash,
        "dataset": "Contextify survey task scenarios (synthetic sample data)",
        "dataset_sha256": source_hash,
        "provenance": evaluation["provenance"],
        "target": "priority_label (Low, Medium, High); Critical source records excluded",
        "algorithm": algorithm,
        "input_features": selected_features,
        "trained_at": evaluated_at,
        "deployment": "experimental_only_synthetic_data",
        "evaluation_report": str(evaluation_path.relative_to(ROOT)).replace("\\", "/"),
        "test_accuracy": evaluation["test_metrics"]["accuracy"],
        "test_macro_f1": evaluation["test_metrics"]["macro_f1"],
        "known_limitations": evaluation["limitations"],
    }
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return evaluation


def write_training_report(evaluation: dict[str, Any], output_path: Path = TRAINING_REPORT_PATH) -> None:
    split = evaluation["training_configuration"]
    metrics = evaluation["test_metrics"]
    baseline = evaluation["majority_baseline_test_metrics"]
    lines = [
        "# Contextify synthetic task-priority training report", "",
        "> **This is an experimental classifier trained on SYNTHETIC / AI-GENERATED SAMPLE DATA. It does not establish real-student performance and must not override Contextify's weighted score or task order.**", "",
        f"Model: `{evaluation['model_name']}` v`{evaluation['model_version']}`  ",
        f"Algorithm selected by validation macro F1: {evaluation['algorithm']}  ",
        f"Source: `{evaluation['dataset_filename']}`  ",
        f"Source workbook SHA-256: `{evaluation['dataset_sha256']}`  ",
        f"Artifact SHA-256: `{evaluation['artifact_sha256']}`  ",
        f"Evaluated: `{evaluation['evaluated_at']}`", "",
        "## Data split", "",
        f"Respondent-grouped split with seed {evaluation['random_seed']}. No respondent overlaps partitions. The 7-fold split assigns five folds to training and one each to validation and test: training {split['train_records']} tasks / {split['train_respondents']} respondents, validation {split['validation_records']} / {split['validation_respondents']}, test {split['test_records']} / {split['test_respondents']}.", "",
        "| Partition | Low | Medium | High |", "|---|---:|---:|---:|",
    ]
    for partition, key in [("Train", "train_label_counts"), ("Validation", "validation_label_counts"), ("Test", "test_label_counts")]:
        counts = split[key]
        lines.append(f"| {partition} | {counts.get('Low', 0)} | {counts.get('Medium', 0)} | {counts.get('High', 0)} |")
    lines.extend([
        "", "## Model comparison", "",
        "Candidates were chosen on the validation split by macro F1. The test split was held out until the selected pipeline was refitted on training plus validation.", "",
        "| Candidate | Validation accuracy | Validation macro F1 |", "|---|---:|---:|",
    ])
    for name, result in evaluation["candidate_validation_metrics"].items():
        lines.append(f"| {name} | {result['accuracy']:.4f} | {result['macro_f1']:.4f} |")
    lines.extend([
        "", "## Held-out test results", "",
        f"Selected model accuracy: **{metrics['accuracy']:.4f}**. Macro precision: **{metrics['macro_precision']:.4f}**; macro recall: **{metrics['macro_recall']:.4f}**; macro F1: **{metrics['macro_f1']:.4f}**; weighted F1: **{metrics['weighted_f1']:.4f}**.", "",
        f"Majority baseline accuracy: {baseline['accuracy']:.4f}; macro F1: {baseline['macro_f1']:.4f}.", "",
        "| Class | Precision | Recall | F1 | Test support |", "|---|---:|---:|---:|---:|",
    ])
    for label in LABELS:
        row = metrics["per_class"][label]
        lines.append(f"| {label} | {row['precision']:.4f} | {row['recall']:.4f} | {row['f1-score']:.4f} | {int(row['support'])} |")
    lines.extend([
        "", "### Confusion matrix", "",
        "Rows are actual labels and columns are predicted labels, in Low / Medium / High order.", "",
        "```text", json.dumps(metrics["confusion_matrix"], indent=2), "```", "",
        "## Features and preprocessing", "",
        f"Training records excluded from the model because Critical is not in the manuscript categories: {split['excluded_source_records']}. Selected model inputs: " + ", ".join(evaluation["feature_list"]) + ". The title/description Logistic Regression candidate was also evaluated; validation macro F1 selected the structured-only candidate. Task rank and written explanations were excluded; respondent ID is a split group only. Missing values remain missing in the prepared CSV and are imputed inside each fitted pipeline using training data only.", "",
        "Training compared a most-frequent baseline, class-weighted structured Logistic Regression, class-weighted text-plus-structured Logistic Regression, and class-weighted structured Random Forest. No oversampling was used. Confidence/probability calibration was not evaluated; the application does not show confidence.", "",
        "## Limitations", "",
        *[f"- {item}" for item in evaluation["limitations"]],
        "- The priority category and task rank are strongly associated in the synthetic workbook, so the label may have been constructed from the same ranking judgment even though rank was excluded from inputs.",
        "- Source questionnaire buckets mapped to Contextify scoring scales are approximations; no validation establishes that they are equivalent to the application's factor calculations.",
        "", "## ZIP package inspection and runtime", "",
        "The supplied ZIP contains a Joblib model artifact, a Markdown training report, a JSON metrics file, and a prepared CSV. It contains no wheel/installer packages, requirements file, dependency versions, or Python/scikit-learn version metadata. The included Joblib artifact was not deserialized or executed because pickle-based Joblib files can execute code when loaded and their environment/version compatibility is unknown. Its report's prior metric claims were not treated as this run's results.",
        "", "Runtime used for this training:", "",
        *[f"- {name}: {version}" for name, version in evaluation["package_versions"].items()],
        "", "The project environment uses the already-declared ML/API requirements plus `openpyxl`; no system Python packages were changed. Exact tested top-level versions are recorded in `machine-learning/requirements-synthetic-model.txt`.",
        "", "The model remains an optional Decision Lab research preview. Formula score and formula-based task order are computed and displayed independently.", "",
        "## Reproduction", "",
        "```powershell", ".\\machine-learning\\.venv-synthetic\\Scripts\\python.exe machine-learning\\training\\train_synthetic_priority_model.py --workbook \"$env:USERPROFILE\\Downloads\\contextify_survey_dataset_234_respondents.xlsx\"", "```", "",
        f"Artifact: `{evaluation['artifact_path']}`. Machine-readable metrics: `datasets/documentation/contextify_synthetic_priority_evaluation.json`. Model pipeline (preprocessing plus estimator) is serialized together.", "",
    ])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--data", type=Path, default=DATA_PATH)
    parser.add_argument("--audit", type=Path, default=AUDIT_PATH)
    parser.add_argument("--model", type=Path, default=MODEL_PATH)
    parser.add_argument("--evaluation", type=Path, default=EVALUATION_PATH)
    parser.add_argument("--registry", type=Path, default=REGISTRY_PATH)
    parser.add_argument("--training-report", type=Path, default=TRAINING_REPORT_PATH)
    parser.add_argument("--prepared-only", action="store_true", help="Train from the prepared CSV and audit JSON without reopening the workbook")
    args = parser.parse_args()
    if not args.prepared_only:
        write_prepared_dataset(args.workbook, args.data, args.audit)
    elif not args.data.is_file() or not args.audit.is_file():
        parser.error("--prepared-only requires existing --data and --audit files")
    result = train(args.data, args.audit, args.model, args.evaluation, args.registry)
    write_training_report(result, args.training_report)
    print(json.dumps({
        "model_name": result["model_name"],
        "model_version": result["model_version"],
        "selected_candidate": result["selected_candidate"],
        "train_records": result["training_configuration"]["train_records"],
        "validation_records": result["training_configuration"]["validation_records"],
        "test_records": result["training_configuration"]["test_records"],
        "test_metrics": result["test_metrics"],
        "artifact_path": result["artifact_path"],
        "artifact_sha256": result["artifact_sha256"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
