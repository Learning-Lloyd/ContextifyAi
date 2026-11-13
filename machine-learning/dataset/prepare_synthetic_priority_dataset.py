"""Extract synthetic respondent task scenarios into a model-ready CSV.

The source workbook is opened read-only and never modified. Respondent IDs are
retained solely as split groups; they are not model features.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any

import openpyxl


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = Path.home() / "Downloads" / "contextify_survey_dataset_234_respondents.xlsx"
DEFAULT_OUTPUT = ROOT / "datasets" / "processed" / "contextify_synthetic_priority_training_v1.csv"
DEFAULT_AUDIT = ROOT / "datasets" / "documentation" / "contextify_synthetic_priority_dataset_audit.json"
DEFAULT_REPORT = ROOT / "machine-learning" / "documentation" / "task_priority_dataset_report.md"
LABELS = {"Low", "Medium", "High", "Critical"}

FEATURE_COLUMNS = [
    "title", "description", "category", "importance", "urgency",
    "estimated_time_minutes", "time_availability", "current_workload",
    "other_pending_assignments", "priority_label", "participant_id", "source_slot",
]


def _normal(value: Any) -> str:
    return " ".join(str(value or "").replace("–", "-").replace("—", "-").replace("−", "-").split()).casefold()


def _urgency_from_deadline(value: Any) -> int:
    key = _normal(value)
    mapping = {
        "already overdue": 10,
        "less than 24 hours": 9,
        "1-2 days": 8,
        "3-5 days": 7,
        "6-7 days": 6,
        "1-2 weeks": 4,
        "more than 2 weeks": 2,
        "no deadline": 1,
    }
    if key not in mapping:
        raise ValueError(f"Unknown time-remaining value: {value!r}")
    return mapping[key]


def _time_availability(value: Any) -> int:
    key = _normal(value)
    mapping = {
        "less than 30 minutes": 1,
        "30 minutes-1 hour": 2,
        "1-2 hours": 4,
        "3-4 hours": 6,
        "5-6 hours": 8,
        "more than 6 hours": 10,
    }
    if key not in mapping:
        raise ValueError(f"Unknown uninterrupted-time value: {value!r}")
    return mapping[key]


def _workload(value: Any) -> int:
    key = _normal(value)
    mapping = {
        "less than 1 hour": 1,
        "1-3 hours": 3,
        "4-6 hours": 5,
        "7-10 hours": 7,
        "11-15 hours": 9,
        "more than 15 hours": 10,
        "not sure": None,
    }
    if key not in mapping:
        raise ValueError(f"Unknown other-task-workload value: {value!r}")
    return mapping[key]


def _duration_minutes(value: Any) -> int | None:
    key = _normal(value)
    mapping = {
        "less than 30 minutes": 15,
        "30 minutes-1 hour": 45,
        "1-2 hours": 90,
        "3-4 hours": 210,
        "5-8 hours": 390,
        "more than 8 hours": 600,
        "not sure": None,
    }
    if key not in mapping:
        raise ValueError(f"Unknown estimated-duration value: {value!r}")
    return mapping[key]


def _cell_type(value: Any) -> str:
    if value is None:
        return "blank"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, (date, datetime)):
        return "date/time"
    return "text"


def extract_workbook(source: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if not source.is_file():
        raise FileNotFoundError(f"Synthetic source workbook not found: {source}")
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    expected_sheets = {"Responses", "Codebook"}
    if set(workbook.sheetnames) != expected_sheets:
        raise ValueError(f"Expected sheets {sorted(expected_sheets)}, found {workbook.sheetnames}")

    responses = workbook["Responses"]
    values = list(responses.values)
    if not values or not values[0]:
        raise ValueError("Responses worksheet is empty")
    headers = [str(value).strip() if value is not None else "" for value in values[0]]
    if len(headers) != 68 or len(set(headers)) != len(headers):
        raise ValueError(f"Expected 68 unique response columns, found {len(headers)}")
    rows = [dict(zip(headers, row)) for row in values[1:]]
    required_response_fields = {
        "Respondent_ID", "Q1_Consent", "Q2_Current_Student", "Q14_Other_Unfinished_Tasks",
        "Q15_Other_Task_Workload", "Q16_Uninterrupted_Time_Today",
    }
    for slot in range(1, 6):
        prefix = f"Task{slot}_"
        required_response_fields.update(prefix + name for name in (
            "Title", "Description", "Category", "Importance", "Time_Remaining",
            "Est_Duration", "Rank", "Priority_Level",
        ))
    missing_headers = sorted(required_response_fields - set(headers))
    if missing_headers:
        raise ValueError("Missing required workbook columns: " + ", ".join(missing_headers))

    codebook_rows = list(workbook["Codebook"].values)
    codebook = {
        str(row[0]).strip(): str(row[1]).strip()
        for row in codebook_rows[1:]
        if row and row[0] is not None and row[1] is not None
    }
    expected_codebook = {"Respondent_ID", "Task1_Priority_Level", "Task1_Rank", "Q16_Uninterrupted_Time_Today"}
    if not expected_codebook.issubset(codebook):
        raise ValueError("Codebook is missing expected definitions")
    response_dimensions = {"rows_including_header": responses.max_row, "columns": responses.max_column}
    codebook_dimensions = {
        "rows_including_header": workbook["Codebook"].max_row,
        "columns": workbook["Codebook"].max_column,
    }

    extracted: list[dict[str, Any]] = []
    all_task_rows = 0
    target_by_rank: dict[str, Counter[str]] = {}
    rejected_nonstudents = 0
    rejected_consent = 0
    for respondent in rows:
        if _normal(respondent.get("Q1_Consent")) != "yes, i voluntarily agree.":
            rejected_consent += 1
            continue
        if _normal(respondent.get("Q2_Current_Student")) != "yes":
            rejected_nonstudents += 1
            continue
        group_id = str(respondent.get("Respondent_ID") or "").strip()
        if not group_id:
            raise ValueError("A current-student respondent has no group ID")
        for slot in range(1, 6):
            prefix = f"Task{slot}_"
            title = str(respondent.get(prefix + "Title") or "").strip()
            label = str(respondent.get(prefix + "Priority_Level") or "").strip().title()
            if not title or not label:
                continue
            all_task_rows += 1
            if label not in LABELS:
                raise ValueError(f"Unexpected priority label {label!r} in {group_id}/{prefix}")
            description = str(respondent.get(prefix + "Description") or "").strip()
            category = str(respondent.get(prefix + "Category") or "").strip()
            if not description or not category:
                raise ValueError(f"Missing description or category in {group_id}/{prefix}")
            try:
                importance_raw = int(respondent[prefix + "Importance"])
                if importance_raw not in range(1, 6):
                    raise ValueError("importance outside 1..5")
                unfinished = int(respondent["Q14_Other_Unfinished_Tasks"])
                if unfinished < 0:
                    raise ValueError("negative unfinished-task count")
                urgency = _urgency_from_deadline(respondent[prefix + "Time_Remaining"])
                availability = _time_availability(respondent["Q16_Uninterrupted_Time_Today"])
                workload = _workload(respondent["Q15_Other_Task_Workload"])
                duration = _duration_minutes(respondent[prefix + "Est_Duration"])
            except (TypeError, ValueError) as error:
                raise ValueError(f"Invalid feature in {group_id}/{prefix}: {error}") from error
            extracted.append({
                "title": title,
                "description": description,
                "category": category,
                "importance": importance_raw * 2,
                "urgency": urgency,
                "estimated_time_minutes": duration,
                "time_availability": availability,
                "current_workload": workload,
                "other_pending_assignments": unfinished,
                "priority_label": label,
                "participant_id": group_id,
                "source_slot": slot,
            })
            rank_value = str(respondent.get(prefix + "Rank"))
            target_by_rank.setdefault(rank_value, Counter())[label] += 1

    if not extracted:
        raise ValueError("No eligible current-student labeled task records were found")

    task_title_counts = Counter(row["title"] for row in extracted)
    label_counts = Counter(row["priority_label"] for row in extracted)
    grouped_counts = Counter(row["participant_id"] for row in extracted)
    respondent_title_counts = Counter((row["participant_id"], row["title"]) for row in extracted)
    exact_feature_counts = Counter(
        tuple(row[column] for column in FEATURE_COLUMNS if column not in {"participant_id", "source_slot"})
        for row in extracted
    )
    all_columns = {}
    for index, header in enumerate(headers):
        cells = [row[index] if index < len(row) else None for row in values[1:]]
        all_columns[header] = {
            "observed_types": dict(sorted(Counter(_cell_type(cell) for cell in cells).items())),
            "blank_cells": sum(cell is None or (isinstance(cell, str) and not cell.strip()) for cell in cells),
            "nonblank_cells": sum(not (cell is None or (isinstance(cell, str) and not cell.strip())) for cell in cells),
        }
    workbook.close()

    audit = {
        "schema_version": 1,
        "provenance": "SYNTHETIC / AI-GENERATED SAMPLE DATA; not collected student responses",
        "source_filename": source.name,
        "source_sha256": source_hash,
        "source_workbook_unchanged": True,
        "sheets": {
            "Responses": response_dimensions,
            "Codebook": codebook_dimensions,
        },
        "source_column_audit": all_columns,
        "respondent_rows": len(rows),
        "respondents_with_consent": len(rows) - rejected_consent,
        "excluded_missing_consent": rejected_consent,
        "excluded_not_current_student": rejected_nonstudents,
        "task_slots_with_nonempty_title_and_label_among_current_students": all_task_rows,
        "eligible_task_records": len(extracted),
        "eligible_respondents": len(grouped_counts),
        "priority_counts": dict(sorted(label_counts.items())),
        "unique_titles": len(task_title_counts),
        "records_beyond_first_occurrence_of_same_title": sum(count - 1 for count in task_title_counts.values()),
        "category_counts": dict(sorted(Counter(row["category"] for row in extracted).items())),
        "duplicate_task_titles_within_same_respondent": sum(count - 1 for count in respondent_title_counts.values() if count > 1),
        "exact_duplicate_feature_and_target_records": sum(count - 1 for count in exact_feature_counts.values() if count > 1),
        "feature_missing_counts": {
            column: sum(row.get(column) is None or row.get(column) == "" for row in extracted)
            for column in FEATURE_COLUMNS
        },
        "rank_label_cross_tab": {rank: dict(sorted(counts.items())) for rank, counts in sorted(target_by_rank.items())},
        "prepared_feature_columns": FEATURE_COLUMNS[:-2],
        "excluded_from_features": ["Task*_Rank", "Task*_Priority_Level (target only)", "Q20_Reasoning", "Q22_Change_If_Less_Time", "Q23_How_Ranking_Changes", "Respondent_ID (group only)", "Persona", "Q17_Circumstances", "Task*_Difficulty", "Task*_Consequence"],
        "transformations": {
            "importance": "Source 1..5 converted to Contextify-like 2,4,6,8,10 by multiplying by 2.",
            "urgency": "Mapped deadline buckets to 1..10 in increasing urgency; overdue=10, no deadline=1.",
            "time_availability": "Mapped uninterrupted-time buckets monotonically to 1,2,4,6,8,10.",
            "current_workload": "Mapped reported other-task-workload buckets monotonically to 1,3,5,7,9,10; Not sure remains missing for training-time imputation.",
            "estimated_time_minutes": "Bucket midpoint estimates; Not sure remains missing for training-time imputation.",
            "task_rank": "Excluded from inputs; retained only in this aggregate audit to inspect potential target association.",
            "duplicates": "No rows removed. Repeated task titles are retained; 40 title templates repeat across respondent records.",
        },
    }
    return extracted, audit


def _write_dataset_report(source: Path, audit: dict[str, Any], report_path: Path) -> None:
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    codebook_rows = list(workbook["Codebook"].values)
    codebook = {
        str(row[0]).strip(): str(row[1]).strip()
        for row in codebook_rows[1:]
        if row and row[0] is not None and row[1] is not None
    }
    workbook.close()
    columns: list[str] = []
    for name, values in audit["source_column_audit"].items():
        types = ", ".join(f"{kind}: {count}" for kind, count in values["observed_types"].items()) or "no data"
        meaning = codebook.get(name, "")
        if not meaning and name.startswith("Task"):
            base = name.replace("Task2_", "Task1_").replace("Task3_", "Task1_").replace("Task4_", "Task1_").replace("Task5_", "Task1_")
            meaning = codebook.get(base, "")
        if name == "Q22_Change_If_Less_Time":
            meaning = "What the respondent would change if less time were available."
        if name == "Q23_How_Ranking_Changes":
            meaning = "Explanation of how the respondent's ranking would change."
        columns.append(f"| `{name}` | {types} | {values['blank_cells']} | {meaning.replace('|', '/')} |")

    counts = audit["priority_counts"]
    total = audit["eligible_task_records"]
    label_table = "\n".join(
        f"| {label} | {count} | {count / total:.1%} |"
        for label, count in counts.items()
    )
    miss_table = "\n".join(
        f"| `{feature}` | {count} |"
        for feature, count in audit["feature_missing_counts"].items()
        if count
    ) or "| None | 0 |"
    rank_rows = "\n".join(
        "| " + rank + " | " + " · ".join(f"{label}: {count}" for label, count in values.items()) + " |"
        for rank, values in audit["rank_label_cross_tab"].items()
    )
    lines = [
        "# Synthetic task-priority dataset report", "",
        "> **Provenance: SYNTHETIC / AI-GENERATED SAMPLE DATA.** These are not real student-collected survey responses or real observed Contextify tasks.", "",
        f"Source workbook: `{audit['source_filename']}` (not modified). SHA-256: `{audit['source_sha256']}`.", "",
        "## Workbook and inclusion", "",
        "The workbook contains `Responses` (234 response rows plus the header; 68 columns) and `Codebook` (68 field definitions plus its header). All 234 respondents consented; 22 are not marked as current students and are excluded. The current-student subset contains 851 labeled task records from 212 respondents. All five task slots were read; blank fourth/fifth slots were skipped, not imputed as tasks. No source rows were deleted or modified.", "",
        "## Target distribution", "",
        "| Priority label | Eligible tasks | Share |", "|---|---:|---:|", label_table, "",
        "The source workbook contains seven records labeled Critical. Because Critical is not a manuscript category, the priority model excludes all seven and trains only on Low, Medium, and High.", "",
        "## Data quality and repeated scenarios", "",
        f"There are {audit['unique_titles']} distinct task titles among eligible rows; {audit['records_beyond_first_occurrence_of_same_title']} records are additional appearances of an existing title template. There are {audit['duplicate_task_titles_within_same_respondent']} repeated titles within the same respondent and {audit['exact_duplicate_feature_and_target_records']} exact duplicate prepared feature/target records. Repeated scenarios across respondents are retained because they represent separate synthetic respondent judgments, but title templates can cross respondent-group splits and make evaluation optimistic for novel tasks. No records were automatically removed as duplicates.", "",
        "Observed task categories: " + ", ".join(f"{name} ({count})" for name, count in audit["category_counts"].items()) + ". No invalid target labels were found.", "",
        "The source target category is strongly associated with the separately recorded human rank (which is excluded from model inputs). All seven source rows labeled Critical are rank 1; this raises concern that the synthetic category may be derived from the same constructed ranking. No claim is made that the category is an independent real-world ground truth.", "",
        "## Feature transformations", "",
        "| Model feature | Workbook source | Preparation |", "|---|---|---|",
        "| `title`, `description`, `category` | Per-task fields | Title/description text was compared in a separate candidate but is excluded from the selected structured-only model; category remains a model input. |",
        "| `importance` | Task importance 1–5 | Multiplied by two to align with Contextify's 1–10 scale. |",
        "| `urgency` | Time-remaining bucket | Mapped monotonically: overdue 10, <24 hours 9, 1–2 days 8, 3–5 days 7, 6–7 days 6, 1–2 weeks 4, >2 weeks 2, no deadline 1. |",
        "| `estimated_time_minutes` | Estimated-duration bucket | Midpoint estimates (15, 45, 90, 210, 390, 600); Not sure remains missing and is imputed only within the fitted training pipeline. |",
        "| `time_availability` | Uninterrupted-time-today bucket | Monotonic 1, 2, 4, 6, 8, 10 mapping by available-time bucket. |",
        "| `current_workload` | Other-task-workload bucket | Monotonic 1, 3, 5, 7, 9, 10 mapping; Not sure remains missing and is imputed only in the training pipeline. |",
        "| `other_pending_assignments` | Other unfinished tasks count | Numeric value, retained. |",
        "| `priority_label` | Per-task source priority category | Source labels include Low/Medium/High/Critical; model training excludes Critical and uses Low/Medium/High. |",
        "| `participant_id` | Synthetic respondent ID | Split group only; never a model feature. |",
        "| `source_slot` | Workbook task slot 1–5 | Audit only; never a model feature. |", "",
        "These questionnaire-bucket mappings approximate Contextify's factor scale; they are documented transformations, not empirically validated equivalences. Difficulty and consequence are excluded because Contextify's task form does not collect those fields. Rank and written reasoning are excluded to avoid direct target leakage.", "",
        "## Missing values in prepared model features", "",
        "| Feature | Missing rows |", "|---|---:|", miss_table, "",
        "## All source columns, observed types, and missing counts", "",
        "Types are observed Excel-cell categories (`text`, `number`, `date/time`, `boolean`, `blank`) across 234 response rows. Field meanings come from the workbook Codebook. The complete machine-readable audit is `datasets/documentation/contextify_synthetic_priority_dataset_audit.json`.", "",
        "| Workbook column | Observed cell types/counts | Blank cells | Codebook meaning |", "|---|---|---:|---|", *columns, "",
        "The workbook remains in Downloads. This process exports a prepared synthetic-only CSV for reproducible training; it contains synthetic task text and synthetic respondent grouping IDs, not respondent personal identifiers.", "",
    ]
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines), encoding="utf-8")


def write_prepared_dataset(source: Path, output: Path, audit_path: Path,
                           report_path: Path = DEFAULT_REPORT) -> dict[str, Any]:
    rows, audit = extract_workbook(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FEATURE_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    audit["prepared_csv"] = str(output.relative_to(ROOT)) if output.is_relative_to(ROOT) else output.name
    audit["prepared_csv_sha256"] = hashlib.sha256(output.read_bytes()).hexdigest()
    audit_path.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    _write_dataset_report(source, audit, report_path)
    return audit


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Source synthetic workbook")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Prepared synthetic task CSV")
    parser.add_argument("--audit", type=Path, default=DEFAULT_AUDIT, help="Aggregate source audit JSON")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="Human-readable dataset report")
    args = parser.parse_args()
    audit = write_prepared_dataset(args.input, args.output, args.audit, args.report)
    print(json.dumps({key: audit[key] for key in (
        "source_filename", "source_sha256", "respondent_rows", "eligible_task_records",
        "eligible_respondents", "priority_counts", "prepared_csv", "prepared_csv_sha256",
    )}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
