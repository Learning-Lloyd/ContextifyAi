"""Train and evaluate multi-label MS-LaTTE context models with Python's stdlib.

Targets are the union of explicit human annotations. The model predicts contextual
time/location labels only; it does not predict or modify Contextify priority.
"""
from __future__ import annotations

import json
import hashlib
import argparse
import shutil
import math
import random
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "datasets" / "processed" / "ms_latte.jsonl"
OUT = ROOT / "datasets" / "models"
CANDIDATES = OUT / "candidates"
REPORT = ROOT / "datasets" / "documentation" / "ml_experiment_report.json"
SEED = 42
TEST_FRACTION = 0.20
MAX_FEATURES = 12000
TOKEN_RE = re.compile(r"[\w']+", re.UNICODE)
MODEL_VERSION = "1.0.0"


def candidate_can_replace(candidate_macro_f1: float, current_macro_f1: float) -> bool:
    """Require a candidate to match or improve the selected pipeline's validation macro F1."""
    return candidate_macro_f1 >= current_macro_f1


def next_patch_version(version: str | None) -> str:
    try:
        major, minor, patch = (int(part) for part in str(version).split(".")[:3])
        return f"{major}.{minor}.{patch + 1}"
    except (TypeError, ValueError):
        return "1.0.0"


def parse_judgements(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return []
    return value if isinstance(value, list) else []


def collect_targets(record, field, label_field):
    labels = set()
    known_judgements = 0
    for judgement in parse_judgements(record.get(field)):
        if str(judgement.get("Known", "")).casefold() not in {"yes", "true", "1"}:
            continue
        known_judgements += 1
        raw = judgement.get(label_field, "")
        values = raw if isinstance(raw, list) else str(raw).split(",")
        labels.update(str(item).strip().casefold() for item in values if str(item).strip())
    return labels, known_judgements


def tokens(text):
    return TOKEN_RE.findall(text.casefold())


def f1_scores(actual, predicted):
    all_labels = sorted(set(label for row in actual + predicted for label in row))
    tp = fp = fn = 0
    per_label = {}
    for label in all_labels:
        a = sum(label in row for row in actual)
        p = sum(label in row for row in predicted)
        true_positive = sum(label in arow and label in prow for arow, prow in zip(actual, predicted))
        tp += true_positive
        fp += p - true_positive
        fn += a - true_positive
        true_negative = len(actual) - true_positive - (p - true_positive) - (a - true_positive)
        precision = true_positive / p if p else 0.0
        recall = true_positive / a if a else 0.0
        per_label[label] = {"support": a, "precision": precision, "recall": recall,
                            "true_positive": true_positive, "false_positive": p - true_positive,
                            "false_negative": a - true_positive, "true_negative": true_negative,
                            "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0.0}
    micro_precision = tp / (tp + fp) if tp + fp else 0.0
    micro_recall = tp / (tp + fn) if tp + fn else 0.0
    micro_f1 = 2 * micro_precision * micro_recall / (micro_precision + micro_recall) if micro_precision + micro_recall else 0.0
    macro_f1 = sum(v["f1"] for v in per_label.values()) / len(per_label) if per_label else 0.0
    exact_match = sum(a == p for a, p in zip(actual, predicted)) / len(actual) if actual else 0.0
    hamming = sum(len(a ^ p) for a, p in zip(actual, predicted)) / (len(actual) * len(all_labels)) if actual and all_labels else 0.0
    return {"micro_precision": micro_precision, "micro_recall": micro_recall, "micro_f1": micro_f1,
            "macro_f1": macro_f1, "exact_match_accuracy": exact_match, "hamming_loss": hamming,
            "per_label": per_label, "label_count": len(all_labels),
            "positive_labels": sum(len(row) for row in actual)}


def split_by_title(records):
    groups = sorted({record["group"] for record in records})
    random.Random(SEED).shuffle(groups)
    test_groups = set(groups[:max(1, round(len(groups) * TEST_FRACTION))])
    train = [r for r in records if r["group"] not in test_groups]
    test = [r for r in records if r["group"] in test_groups]
    return train, test


def split_train_validation_test_by_title(records):
    """Deterministically isolate repeated titles across 65/15/20 partitions."""
    groups = sorted({record["group"] for record in records})
    random.Random(SEED).shuffle(groups)
    test_count = max(1, round(len(groups) * 0.20))
    validation_count = max(1, round(len(groups) * 0.15))
    test_groups = set(groups[:test_count])
    validation_groups = set(groups[test_count:test_count + validation_count])
    train_groups = set(groups[test_count + validation_count:])
    train = [record for record in records if record["group"] in train_groups]
    validation = [record for record in records if record["group"] in validation_groups]
    test = [record for record in records if record["group"] in test_groups]
    return train, validation, test


def fit_nb(train_rows, labels, vocabulary):
    models = {}
    alpha = 1.0
    for label in labels:
        pos_docs = neg_docs = 0
        pos_counts, neg_counts = Counter(), Counter()
        vocab = set(vocabulary)
        for row in train_rows:
            target = label in row["targets"]
            if target:
                pos_docs += 1
                pos_counts.update(word for word in row["tokens"] if word in vocab)
            else:
                neg_docs += 1
                neg_counts.update(word for word in row["tokens"] if word in vocab)
        pos_total = sum(pos_counts.values())
        neg_total = sum(neg_counts.values())
        log_odds = {}
        for word in vocabulary:
            p_pos = (pos_counts[word] + alpha) / (pos_total + alpha * len(vocabulary))
            p_neg = (neg_counts[word] + alpha) / (neg_total + alpha * len(vocabulary))
            log_odds[word] = math.log(p_pos / p_neg)
        prior = math.log((pos_docs + alpha) / (neg_docs + alpha))
        models[label] = {"positive_documents": pos_docs, "negative_documents": neg_docs,
                         "prior_log_odds": prior, "term_log_odds": log_odds}
    return models


def predict_nb(rows, models, threshold=0.5):
    result = []
    threshold_log_odds = math.log(threshold / (1.0 - threshold))
    for row in rows:
        prediction = set()
        counts = Counter(row["tokens"])
        for label, model in models.items():
            score = model["prior_log_odds"] + sum(
                count * model["term_log_odds"].get(word, 0.0) for word, count in counts.items()
            )
            if score >= threshold_log_odds:
                prediction.add(label)
        result.append(prediction)
    return result


def train_experiment(records, name, target_field, label_field, current_threshold=0.5):
    eligible = []
    for record in records:
        targets, known = collect_targets(record, target_field, label_field)
        if not known or not targets:
            continue
        # Contextify tasks always have a title; its category is not equivalent to
        # MS-LaTTE's user-created list title, so do not substitute one for the other.
        text = record["title"]
        eligible.append({"id": record["source_id"], "text": text, "group": " ".join(tokens(record["title"])),
                         "tokens": tokens(text), "targets": targets})
    train, validation, test = split_train_validation_test_by_title(eligible)
    doc_freq = Counter(word for row in train for word in set(row["tokens"]))
    vocabulary = [word for word, count in doc_freq.most_common(MAX_FEATURES) if count >= 2]
    label_counts = Counter(label for row in eligible for label in row["targets"])
    labels = sorted(label_counts)
    validation_models = fit_nb(train, labels, vocabulary)
    thresholds = [0.30, 0.40, 0.50, 0.60, 0.70]
    threshold_results = []
    validation_actual = [row["targets"] for row in validation]
    validation_predictions = {}
    for candidate_threshold in thresholds:
        predictions = predict_nb(validation, validation_models, candidate_threshold)
        validation_predictions[candidate_threshold] = predictions
        metrics = f1_scores(validation_actual, predictions)
        threshold_results.append({"threshold": candidate_threshold, "macro_f1": metrics["macro_f1"]})
    selected_threshold = max(thresholds, key=lambda value: (
        next(item["macro_f1"] for item in threshold_results if item["threshold"] == value),
        -abs(value - 0.5),
    ))
    validation_current_macro_f1 = f1_scores(
        validation_actual,
        validation_predictions.get(current_threshold, predict_nb(validation, validation_models, current_threshold)),
    )["macro_f1"]
    validation_candidate_macro_f1 = next(item["macro_f1"] for item in threshold_results if item["threshold"] == selected_threshold)

    development = train + validation
    doc_freq = Counter(word for row in development for word in set(row["tokens"]))
    vocabulary = [word for word, count in doc_freq.most_common(MAX_FEATURES) if count >= 2]
    models = fit_nb(development, labels, vocabulary)
    actual = [row["targets"] for row in test]
    candidate_predictions = predict_nb(test, models, selected_threshold)
    baseline = [
        {label for label, model in models.items() if model["positive_documents"] >= model["negative_documents"]}
        for _ in test
    ]
    evaluation = {
        "baseline_most_frequent": f1_scores(actual, baseline),
        "multinomial_naive_bayes": f1_scores(actual, candidate_predictions),
    }
    artifact = {
        "model_version": MODEL_VERSION,
        "model": "Multinomial Naive Bayes, one-vs-rest, Laplace alpha=1",
        "target": name,
        "dataset": "Microsoft MS-LaTTE",
        "dataset_sha256": hashlib.sha256(DATA.read_bytes()).hexdigest(),
        "input_features": ["TaskTitle"],
        "threshold": selected_threshold,
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "seed": SEED,
        "training_records": len(development),
        "test_records": len(test),
        "vocabulary": vocabulary,
        "labels": models,
    }
    return artifact, {"eligible_records": len(eligible), "train_records": len(train), "validation_records": len(validation),
                      "final_fit_records": len(development), "test_records": len(test),
                      "evaluation_protocol": "ms-latte-title-group-65-15-20-seed42-v1",
                      "promotion_comparison": {"metric": "validation macro F1", "active_threshold": current_threshold,
                                               "active_pipeline_macro_f1": validation_current_macro_f1,
                                               "candidate_threshold": selected_threshold,
                                               "candidate_macro_f1": validation_candidate_macro_f1},
                      "threshold_selection": {"metric": "validation macro F1", "selected_threshold": selected_threshold,
                                              "candidates": threshold_results},
                      "distinct_title_groups": len({r['group'] for r in eligible}),
                      "labels": {label: label_counts[label] for label in labels}, "metrics": evaluation}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--promote", action="store_true", help="Promote the location candidate only if its validation macro F1 does not regress against the selected pipeline.")
    args = parser.parse_args()
    if not DATA.is_file():
        raise SystemExit(f"Processed data missing: run datasets/import_datasets.py first")
    records = [json.loads(line) for line in DATA.read_text(encoding="utf-8").splitlines() if line.strip()]
    OUT.mkdir(parents=True, exist_ok=True)
    CANDIDATES.mkdir(parents=True, exist_ok=True)
    registry_path = OUT / "model_registry.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8")) if registry_path.is_file() else {"schema_version": 1, "models": {}, "candidate_models": []}
    registry.setdefault("models", {})
    registry.setdefault("candidate_models", [])
    registry["candidate_models"] = [
        item for item in registry["candidate_models"]
        if item.get("artifact")
        and (ROOT / item["artifact"]).is_file()
        and hashlib.sha256((ROOT / item["artifact"]).read_bytes()).hexdigest() == item.get("artifact_sha256")
    ]
    current_version = registry["models"].get("likely_location", {}).get("version")
    previous_candidates = [
        item.get("version") for item in registry["candidate_models"]
        if item.get("target") == "likely_location"
    ]
    candidate_version = next_patch_version(previous_candidates[-1] if previous_candidates else current_version)
    report = {
        "dataset": "Microsoft MS-LaTTE",
        "dataset_sha256": hashlib.sha256(DATA.read_bytes()).hexdigest(),
        "model_version": candidate_version,
        "source_records": len(records),
        "method": "Independent multi-label targets use the union of supplied Known=true human annotations. Titles are lowercased and token-normalized for grouping, so repeated titles cannot cross train, validation, or test boundaries. Fixed 65/15/20 group split with seed 42. The label threshold is selected from 0.30, 0.40, 0.50, 0.60, 0.70 by validation macro F1; vocabulary and final model are refit on train+validation. Text feature is TaskTitle only; ListTitle is not substituted with Contextify task category because the field meanings differ. No Contextify priority labels or scoring factors are used.",
        "experiments": {},
        "limitations": [
            "The labels represent annotators' judgments of likely context, not observed completion events or Contextify user behavior.",
            "Only the MS-LaTTE task-context annotations are used for these experiments.",
            "This external task corpus does not establish performance for Contextify users.",
            "The simple Naive Bayes model and single holdout are research baselines, not deployment validation.",
        ],
    }
    for name, target_field, label_field, filename in [
        ("likely_location", "location_judgements", "Locations", "ms_latte_location_model.json"),
        ("likely_time", "time_judgements", "Times", "ms_latte_time_model.json"),
    ]:
        active_entry = registry["models"].get(name, {})
        active_threshold = float(active_entry.get("threshold", 0.5))
        artifact, details = train_experiment(records, name, target_field, label_field, active_threshold)
        artifact["model_version"] = candidate_version
        candidate_filename = f"{filename[:-5]}_v{candidate_version}.json"
        candidate_path = CANDIDATES / candidate_filename
        candidate_path.write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        details["model_version"] = candidate_version
        details["model"] = artifact["model"]
        details["input_features"] = artifact["input_features"]
        details["dataset_sha256"] = artifact["dataset_sha256"]
        report["experiments"][name] = details
    for name, _, _, filename in [
        ("likely_location", "location_judgements", "Locations", "ms_latte_location_model.json"),
        ("likely_time", "time_judgements", "Times", "ms_latte_time_model.json"),
    ]:
        candidate_filename = f"{filename[:-5]}_v{candidate_version}.json"
        candidate_path = CANDIDATES / candidate_filename
        artifact = json.loads(candidate_path.read_text(encoding="utf-8"))
        candidate_entry = {
            "version": candidate_version,
            "artifact": f"datasets/models/candidates/{candidate_filename}",
            "artifact_sha256": hashlib.sha256(candidate_path.read_bytes()).hexdigest(),
            "dataset": artifact["dataset"],
            "dataset_sha256": artifact["dataset_sha256"],
            "target": artifact["target"],
            "algorithm": artifact["model"],
            "threshold": artifact["threshold"],
            "input_features": artifact["input_features"],
            "trained_at": artifact["trained_at"],
            "training_records": artifact["training_records"],
            "test_records": artifact["test_records"],
            "metrics": report["experiments"][name]["metrics"],
            "deployment": "candidate",
        }
        candidate_entry["validation_records"] = report["experiments"][name]["validation_records"]
        candidate_entry["evaluation_protocol"] = report["experiments"][name]["evaluation_protocol"]
        candidate_entry["promotion_comparison"] = report["experiments"][name]["promotion_comparison"]
        registry["candidate_models"].append({"target": name, **candidate_entry, "compared_to_version": current_version})
        if name == "likely_location" and args.promote:
            comparison = report["experiments"][name]["promotion_comparison"]
            candidate_f1 = comparison["candidate_macro_f1"]
            current_f1 = comparison["active_pipeline_macro_f1"]
            if not candidate_can_replace(candidate_f1, current_f1):
                raise SystemExit(f"Candidate validation macro F1 {candidate_f1:.4f} is below the current pipeline ({current_f1:.4f}); current model was not replaced.")
            active_path = OUT / filename
            shutil.copyfile(candidate_path, active_path)
            candidate_entry["artifact"] = f"datasets/models/{filename}"
            candidate_entry["artifact_sha256"] = hashlib.sha256(active_path.read_bytes()).hexdigest()
            candidate_entry["deployment"] = "integrated_supplementary"
            candidate_entry["promotion_validation"] = comparison
            registry["models"][name] = candidate_entry
            for history_entry in reversed(registry["candidate_models"]):
                if history_entry.get("target") == name and history_entry.get("version") == candidate_version:
                    history_entry["deployment"] = "promoted"
                    history_entry["promoted_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
                    history_entry["promotion_validation"] = comparison
                    break
        elif name == "likely_time":
            registry["models"].setdefault(name, {**candidate_entry, "deployment": "research_only"})
    registry["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
