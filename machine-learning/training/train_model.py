"""Train an academic-task priority classifier from human-labeled task records."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.model_selection import GroupShuffleSplit, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "priority_model.joblib"
METRICS_PATH = ROOT / "evaluation" / "latest_metrics.json"
LABELS = ["High", "Medium", "Low"]
NUMERIC_FEATURES = [
    "importance",
    "urgency",
    "days_remaining",
    "estimated_time_minutes",
    "time_availability",
    "current_workload",
    "other_pending_assignments",
]
CATEGORICAL_FEATURES = ["category"]
TEXT_FEATURES = ["title", "description"]
FEATURES = TEXT_FEATURES + CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET = "priority_label"
REQUIRED = FEATURES + [TARGET]
SCORE_FEATURES = ["importance", "urgency", "time_availability", "current_workload"]


def build_pipeline() -> Pipeline:
    preprocessing = ColumnTransformer(
        transformers=[
            (
                "numeric",
                SimpleImputer(strategy="median"),
                NUMERIC_FEATURES,
            ),
            (
                "category",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
                        ("one_hot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                CATEGORICAL_FEATURES,
            ),
            (
                "title_text",
                HashingVectorizer(n_features=2**12, alternate_sign=False, ngram_range=(1, 2)),
                "title",
            ),
            (
                "description_text",
                HashingVectorizer(n_features=2**12, alternate_sign=False, ngram_range=(1, 2)),
                "description",
            ),
        ],
        remainder="drop",
    )
    return Pipeline(
        steps=[
            ("preprocessing", preprocessing),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=400,
                    class_weight="balanced",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )


def load_training_data(path: Path) -> tuple[pd.DataFrame, pd.Series, int]:
    if not path.is_file():
        raise ValueError(f"Training CSV not found: {path}")

    frame = pd.read_csv(path)
    missing_columns = [column for column in REQUIRED if column not in frame.columns]
    if missing_columns:
        raise ValueError("Missing required columns: " + ", ".join(missing_columns))

    unlabeled = frame[TARGET].isna() | frame[TARGET].astype(str).str.strip().eq("")
    excluded_unlabeled = int(unlabeled.sum())
    frame = frame.loc[~unlabeled].copy()
    normalized_labels = frame[TARGET].astype(str).str.strip().str.title()
    unknown_labels = sorted(set(normalized_labels) - set(LABELS))
    if unknown_labels:
        raise ValueError(
            "priority_label must use only High, Medium, or Low. Found: "
            + ", ".join(unknown_labels)
        )

    for column in NUMERIC_FEATURES:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
        if frame[column].notna().sum() == 0:
            raise ValueError(f"Numeric feature '{column}' has no usable values.")

    for column in SCORE_FEATURES:
        values = frame[column].dropna()
        if ((values < 1) | (values > 10)).any():
            raise ValueError(f"'{column}' values must be between 1 and 10.")

    if (frame["estimated_time_minutes"].dropna() < 0).any():
        raise ValueError("estimated_time_minutes cannot be negative.")
    if (frame["other_pending_assignments"].dropna() < 0).any():
        raise ValueError("other_pending_assignments cannot be negative.")

    for column in TEXT_FEATURES + CATEGORICAL_FEATURES:
        frame[column] = frame[column].fillna("").astype(str)

    labels = normalized_labels
    present = set(labels)
    if present != set(LABELS):
        absent = sorted(set(LABELS) - present)
        raise ValueError("Training data must contain examples for all three labels; missing: " + ", ".join(absent))
    counts = labels.value_counts()
    too_small = counts[counts < 2]
    if not too_small.empty:
        raise ValueError("At least two records per priority class are needed to split training and test data.")

    return frame, labels, excluded_unlabeled


def split_records(frame: pd.DataFrame, labels: pd.Series):
    """Prefer participant-separated evaluation when participant IDs are available."""
    if "participant_id" in frame.columns:
        groups = frame["participant_id"].fillna("").astype(str)
        valid_groups = groups.ne("")
        if valid_groups.all() and groups.nunique() >= 3:
            splitter = GroupShuffleSplit(n_splits=100, test_size=0.2, random_state=42)
            for train_indices, test_indices in splitter.split(frame, labels, groups):
                if set(labels.iloc[train_indices]) == set(LABELS) and set(labels.iloc[test_indices]) == set(LABELS):
                    return train_indices, test_indices, "participant-separated holdout"
            raise ValueError(
                "Could not make a participant-separated split containing every label in both sets. "
                "Collect more participants or review the label distribution."
            )

    indices = list(range(len(frame)))
    train_indices, test_indices = train_test_split(
        indices,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )
    return train_indices, test_indices, "stratified record-level holdout"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "csv",
        nargs="?",
        default=str(ROOT / "dataset" / "training_template.csv"),
        help="CSV containing real assignment records and human-reviewed priority labels.",
    )
    args = parser.parse_args()

    try:
        frame, labels, excluded_unlabeled = load_training_data(Path(args.csv))
        train_indices, test_indices, split_method = split_records(frame, labels)
    except (ValueError, OSError, pd.errors.ParserError) as error:
        print(f"Training stopped: {error}", file=sys.stderr)
        return 2

    X = frame[FEATURES]
    X_train, X_test = X.iloc[train_indices], X.iloc[test_indices]
    y_train, y_test = labels.iloc[train_indices], labels.iloc[test_indices]
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    probabilities = pipeline.predict_proba(X_test)
    metrics = {
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "dataset_file": str(Path(args.csv).resolve()),
        "total_labeled_records": int(len(frame)),
        "unlabeled_records_excluded": excluded_unlabeled,
        "train_records": int(len(train_indices)),
        "test_records": int(len(test_indices)),
        "split_method": split_method,
        "class_distribution": {label: int(labels.value_counts().get(label, 0)) for label in LABELS},
        "accuracy": float(accuracy_score(y_test, predictions)),
        "macro_precision": float(precision_score(y_test, predictions, labels=LABELS, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_test, predictions, labels=LABELS, average="macro", zero_division=0)),
        "macro_f1": float(f1_score(y_test, predictions, labels=LABELS, average="macro", zero_division=0)),
        "confusion_matrix_labels": LABELS,
        "confusion_matrix": confusion_matrix(y_test, predictions, labels=LABELS).tolist(),
        "classification_report": classification_report(
            y_test,
            predictions,
            labels=LABELS,
            output_dict=True,
            zero_division=0,
        ),
        "mean_max_probability": float(probabilities.max(axis=1).mean()),
        "model": "RandomForestClassifier",
        "random_state": 42,
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "pipeline": pipeline,
            "classes": list(pipeline.named_steps["classifier"].classes_),
            "trained_at": metrics["evaluated_at"],
            "feature_columns": FEATURES,
            "evaluation": metrics,
        },
        MODEL_PATH,
    )
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    print(f"\nSaved model: {MODEL_PATH}")
    print(f"Saved evaluation: {METRICS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
