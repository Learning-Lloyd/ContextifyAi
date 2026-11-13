"""FastAPI endpoint for the synthetic-data experimental priority classifier.

Predictions are supplemental research output. The Laravel weighted-score engine
remains authoritative and this endpoint never ranks or changes user tasks.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field


ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent
MODEL_PATH = Path(os.getenv(
    "CONTEXTIFY_ML_MODEL",
    PROJECT_ROOT / "datasets" / "models" / "contextify_task_priority_synthetic_v1.1.0.joblib",
))
FEATURES = [
    "importance",
    "urgency",
    "estimated_time_minutes",
    "time_availability",
    "current_workload",
    "other_pending_assignments",
    "category",
]
_cache: dict[str, Any] = {"modified": None, "artifact": None}

app = FastAPI(
    title="Contextify Priority Model",
    version="0.1.0",
    description="Serves clearly labeled experimental predictions trained from synthetic sample data.",
)


class AssignmentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_id: int | str | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=5000)
    category: str | None = Field(default=None, max_length=100)
    importance: int = Field(ge=1, le=10)
    urgency: int = Field(ge=1, le=10)
    days_remaining: float | None = None
    estimated_time_minutes: float | None = Field(default=None, ge=0)
    time_availability: int = Field(ge=1, le=10)
    current_workload: int = Field(ge=1, le=10)
    other_pending_assignments: int | None = Field(default=None, ge=0)


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assignments: list[AssignmentInput] = Field(min_length=1, max_length=50)


def _suggest_next_step(priority_category: str, urgency: int) -> str:
    """Return a transparent rule-based suggestion; never changes task order."""
    if priority_category == "High" and urgency >= 8:
        return f"Review this task soon: the model predicts High and its urgency is {urgency}/10. Check the deadline and available time before deciding."
    if priority_category == "High":
        return "Consider scheduling this task soon: the experimental model predicts High. Review its deadline and available time before deciding."
    if priority_category == "Medium" and urgency >= 8:
        return f"Check this task's deadline soon: the model predicts Medium, while urgency is {urgency}/10. Decide whether it needs earlier attention."
    if priority_category == "Medium":
        return "Plan this task after items you consider more urgent, then review its deadline."
    return "Keep this task in your queue and revisit it if its deadline, available time, or workload changes."


def get_artifact() -> dict[str, Any] | None:
    if not MODEL_PATH.is_file():
        return None

    modified = MODEL_PATH.stat().st_mtime
    if _cache["artifact"] is None or _cache["modified"] != modified:
        artifact = joblib.load(MODEL_PATH)
        if not isinstance(artifact, dict) or "pipeline" not in artifact or "classes" not in artifact:
            raise RuntimeError("The model artifact has an unexpected format.")
        _cache["artifact"] = artifact
        _cache["modified"] = modified
    return _cache["artifact"]


@app.get("/health")
def health() -> dict[str, Any]:
    try:
        artifact = get_artifact()
    except Exception:
        artifact = None
    return {
        "service": "contextify-priority-model",
        "model_ready": artifact is not None,
        "mode": "experimental_only_synthetic_data",
        "model_version": artifact.get("metadata", {}).get("version") if artifact else None,
        "model_path": str(MODEL_PATH),
    }


@app.post("/predict-priority")
def predict_priority(request: PredictionRequest) -> dict[str, Any]:
    try:
        artifact = get_artifact()
    except Exception as error:
        raise HTTPException(status_code=503, detail="The saved model could not be loaded.") from error

    if artifact is None:
        raise HTTPException(
            status_code=503,
            detail="The experimental synthetic-data priority model is unavailable.",
        )

    rows = [assignment.model_dump() for assignment in request.assignments]
    frame = pd.DataFrame(rows)
    for column in FEATURES:
        if column not in frame:
            frame[column] = None
    frame["category"] = frame["category"].fillna("").astype(str)
    frame["description"] = frame["description"].fillna("").astype(str)

    metadata = artifact.get("metadata", {})
    artifact_features = metadata.get("feature_list")
    if artifact_features != FEATURES:
        raise HTTPException(
            status_code=503,
            detail="The experimental model feature schema does not match the prediction service.",
        )

    pipeline = artifact["pipeline"]
    try:
        predictions = pipeline.predict(frame[artifact_features])
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="The experimental model could not process these task details.",
        ) from error
    output_predictions = []

    for row, prediction in zip(rows, predictions):
        output_predictions.append({
            "task_id": row.get("task_id"),
            "title": row["title"],
            "priority_category": str(prediction),
            "suggested_next_step": _suggest_next_step(str(prediction), row["urgency"]),
            "prediction_type": "experimental_synthetic_data",
        })

    return {
        "predictions": output_predictions,
        "model": {
            "name": metadata.get("name", "contextify_task_priority_classifier"),
            "version": metadata.get("version"),
            "algorithm": metadata.get("algorithm"),
            "provenance": metadata.get("provenance"),
            "mode": "experimental_only_synthetic_data",
        },
    }
