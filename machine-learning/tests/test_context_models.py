import hashlib
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "machine-learning" / "training" / "train_context_models.py"
SPEC = importlib.util.spec_from_file_location("train_context_models", MODULE_PATH)
trainer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(trainer)
IMPORT_PATH = ROOT / "datasets" / "import_datasets.py"
IMPORT_SPEC = importlib.util.spec_from_file_location("import_datasets", IMPORT_PATH)
dataset_importer = importlib.util.module_from_spec(IMPORT_SPEC)
IMPORT_SPEC.loader.exec_module(dataset_importer)
class ContextModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records = [
            json.loads(line)
            for line in (ROOT / "datasets" / "processed" / "ms_latte.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]

    def test_processed_records_preserve_unique_source_ids_and_annotations(self):
        self.assertEqual(len(self.records), 10101)
        ids = [record["source_id"] for record in self.records]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(self.records[0]["location_judgements"])
        self.assertTrue(self.records[0]["time_judgements"])

    def test_group_split_keeps_repeated_titles_out_of_both_partitions(self):
        rows = []
        for record in self.records:
            labels, known = trainer.collect_targets(record, "location_judgements", "Locations")
            if known and labels:
                rows.append({"group": " ".join(trainer.tokens(record["title"])), "targets": labels})
        training, testing = trainer.split_by_title(rows)
        training_groups = {row["group"] for row in training}
        testing_groups = {row["group"] for row in testing}
        self.assertFalse(training_groups & testing_groups)
        self.assertEqual(testing_groups, {row["group"] for row in trainer.split_by_title(rows)[1]})

    def test_three_way_split_keeps_repeated_titles_isolated(self):
        rows = []
        for record in self.records:
            labels, known = trainer.collect_targets(record, "location_judgements", "Locations")
            if known and labels:
                rows.append({"group": " ".join(trainer.tokens(record["title"])), "targets": labels})
        training, validation, testing = trainer.split_train_validation_test_by_title(rows)
        groups = [{row["group"] for row in part} for part in (training, validation, testing)]
        self.assertFalse(groups[0] & groups[1])
        self.assertFalse(groups[0] & groups[2])
        self.assertFalse(groups[1] & groups[2])

    def test_candidate_release_gate_does_not_allow_metric_regression(self):
        self.assertTrue(trainer.candidate_can_replace(0.81, 0.81))
        self.assertTrue(trainer.candidate_can_replace(0.82, 0.81))
        self.assertFalse(trainer.candidate_can_replace(0.80, 0.81))
        self.assertEqual(trainer.next_patch_version("1.2.3"), "1.2.4")

    def test_saved_models_load_and_generate_context_labels(self):
        for filename, expected_labels in [
            ("ms_latte_location_model.json", {"home", "work", "public"}),
            ("ms_latte_time_model.json", {"wd-morning", "we-evening"}),
        ]:
            artifact = json.loads((ROOT / "datasets" / "models" / filename).read_text(encoding="utf-8"))
            self.assertTrue(expected_labels.issubset(artifact["labels"].keys()))
            row = {"tokens": trainer.tokens("Buy groceries"), "targets": set()}
            prediction = trainer.predict_nb([row], artifact["labels"], artifact.get("threshold", 0.5))
            self.assertEqual(len(prediction), 1)
            self.assertIsInstance(prediction[0], set)
            self.assertIsInstance(trainer.predict_nb([{"tokens": [], "targets": set()}], artifact["labels"])[0], set)

    def test_model_registry_artifact_hashes_match_selected_files(self):
        registry = json.loads((ROOT / "datasets" / "models" / "model_registry.json").read_text(encoding="utf-8"))
        self.assertEqual(set(registry["models"]), {"likely_location", "likely_time"})
        for key in ["likely_location", "likely_time"]:
            entry = registry["models"][key]
            artifact_path = ROOT / entry["artifact"]
            digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
            self.assertEqual(digest, entry["artifact_sha256"])
            artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
            self.assertEqual(entry["version"], artifact["model_version"])

        for candidate in registry["candidate_models"]:
            candidate_path = ROOT / candidate["artifact"]
            self.assertTrue(candidate_path.is_file())
            self.assertEqual(hashlib.sha256(candidate_path.read_bytes()).hexdigest(), candidate["artifact_sha256"])
            candidate_artifact = json.loads(candidate_path.read_text(encoding="utf-8"))
            self.assertEqual(candidate_artifact["model_version"], candidate["version"])
            self.assertIn(candidate_artifact["threshold"], [0.30, 0.40, 0.50, 0.60, 0.70])

    def test_multilabel_metrics_include_per_label_confusion_counts(self):
        result = trainer.f1_scores([{"a"}, set()], [{"a"}, {"b"}])
        self.assertEqual(result["per_label"]["a"]["true_positive"], 1)
        self.assertEqual(result["per_label"]["b"]["false_positive"], 1)
        self.assertIn("true_negative", result["per_label"]["a"])

    def test_shared_importer_public_report_is_ms_latte_only(self):
        report = dataset_importer.build_public_report({"processed_records": len(self.records)})
        self.assertEqual(report["ms_latte"]["processed_records"], 10101)

if __name__ == "__main__":
    unittest.main()
