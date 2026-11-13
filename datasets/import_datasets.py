"""Repeatable, non-destructive import and validation for Contextify research data."""
from __future__ import annotations

import csv
import argparse
import json
import hashlib
from collections import Counter
from datetime import datetime
from pathlib import Path



ROOT = Path(__file__).resolve().parent
ORIGINAL = ROOT / "original"
PROCESSED = ROOT / "processed"
REPORTS = ROOT / "documentation"


def json_field(value):
    if value in (None, ""):
        return []
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return []
    return value if isinstance(value, list) else []


def read_ms_latte():
    path = ORIGINAL / "MS-LaTTE.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("MS-LaTTE root must be a JSON array")
    rows, invalid, seen = [], 0, set()
    location_counts, time_counts = Counter(), Counter()
    known_location = known_time = 0
    for item in raw:
        if not isinstance(item, dict) or not item.get("ID") or not item.get("TaskTitle"):
            invalid += 1
            continue
        source_id = str(item["ID"])
        if source_id in seen:
            invalid += 1
            continue
        seen.add(source_id)
        locations = json_field(item.get("LocJudgements"))
        times = json_field(item.get("TimeJudgements"))
        for judgement in locations:
            if str(judgement.get("Known", "")).casefold() in {"yes", "true", "1"}:
                known_location += 1
                location_counts.update(value.strip().casefold() for value in str(judgement.get("Locations") or "").split(",") if value.strip())
        for judgement in times:
            if str(judgement.get("Known", "")).casefold() in {"yes", "true", "1"}:
                known_time += 1
                time_counts.update(value.strip().casefold() for value in str(judgement.get("Times") or "").split(",") if value.strip())
        rows.append({
            "source_id": source_id,
            "title": str(item["TaskTitle"]),
            "list_title": str(item.get("ListTitle") or ""),
            "location_judgements": locations,
            "time_judgements": times,
        })
    return rows, {"source_records": len(raw), "processed_records": len(rows), "invalid_or_duplicate": invalid,
                  "known_location_judgements": known_location, "known_time_judgements": known_time,
                  "location_annotation_counts": dict(location_counts), "time_annotation_counts": dict(time_counts)}


def write_jsonl(path, rows):
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")


def describe_file(path):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return {"filename": path.name, "bytes": path.stat().st_size, "sha256": digest}


def build_public_report(ms_stats):
    return {
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "repeatable_import": True,
        "source_files": [describe_file(ORIGINAL / "MS-LaTTE.json")],
        "ms_latte": ms_stats,
        "personal_tasks_created": 0,
        "notes": [
            "External dataset records are stored separately from authenticated users' tasks.",
            "MS-LaTTE annotation fields are preserved as their original human judgements.",
            "Missing values remain null; no scoring factors or priority labels are synthesized.",
        ],
    }


def require_private_path(path, parser, argument):
    try:
        path.relative_to(ROOT)
    except ValueError:
        return
    parser.error(f"{argument} must be outside the project repository.")


def main():
    parser = argparse.ArgumentParser(description="Import the public MS-LaTTE research dataset.")
    parser.parse_args()
    PROCESSED.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)
    rows, stats = read_ms_latte()
    write_jsonl(PROCESSED / "ms_latte.jsonl", rows)
    report = build_public_report(stats)
    (REPORTS / "dataset_import_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"MS-LaTTE": stats, "report": str(REPORTS / "dataset_import_report.json")}, indent=2))


if __name__ == "__main__":
    main()
