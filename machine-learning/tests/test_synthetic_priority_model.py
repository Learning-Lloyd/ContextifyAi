import importlib.util
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException
from pydantic import ValidationError


ROOT = Path(__file__).resolve().parents[2]
PREPROCESS_PATH = ROOT / "machine-learning" / "dataset" / "prepare_synthetic_priority_dataset.py"
PREPROCESS_SPEC = importlib.util.spec_from_file_location("prepare_synthetic_priority_dataset", PREPROCESS_PATH)
preprocess = importlib.util.module_from_spec(PREPROCESS_SPEC)
PREPROCESS_SPEC.loader.exec_module(preprocess)

API_PATH = ROOT / "machine-learning" / "api" / "main.py"
API_SPEC = importlib.util.spec_from_file_location("contextify_priority_api", API_PATH)
priority_api = importlib.util.module_from_spec(API_SPEC)
sys.modules[API_SPEC.name] = priority_api
API_SPEC.loader.exec_module(priority_api)


class SyntheticPriorityModelTests(unittest.TestCase):
    def test_preprocessing_maps_known_values_and_rejects_unknown_buckets(self):
        self.assertEqual(preprocess._urgency_from_deadline("Already overdue"), 10)
        self.assertEqual(preprocess._urgency_from_deadline("1–2 days"), 8)
        self.assertEqual(preprocess._time_availability("More than 6 hours"), 10)
        self.assertEqual(preprocess._workload("Not sure"), None)
        self.assertEqual(preprocess._duration_minutes("Not sure"), None)
        with self.assertRaises(ValueError):
            preprocess._urgency_from_deadline("future unknown bucket")

    def test_prepared_data_and_evaluation_keep_groups_out_of_features(self):
        audit_path = ROOT / "datasets" / "documentation" / "contextify_synthetic_priority_dataset_audit.json"
        evaluation_path = ROOT / "datasets" / "documentation" / "contextify_synthetic_priority_evaluation.json"
        audit = json.loads(audit_path.read_text(encoding="utf-8"))
        evaluation = json.loads(evaluation_path.read_text(encoding="utf-8"))
        self.assertEqual(audit["eligible_task_records"], 851)
        self.assertEqual(audit["priority_counts"]["Critical"], 7)
        self.assertTrue(evaluation["training_configuration"]["respondent_overlap"] is False)
        self.assertEqual(evaluation["classes"], ["Low", "Medium", "High"])
        self.assertEqual(evaluation["training_configuration"]["excluded_source_records"], 7)
        self.assertNotIn("participant_id", evaluation["feature_list"])
        self.assertNotIn("Task1_Rank", evaluation["feature_list"])
        self.assertNotIn("title", evaluation["feature_list"])
        self.assertNotIn("description", evaluation["feature_list"])
        self.assertIn("category", evaluation["feature_list"])
        self.assertEqual(evaluation["provenance"], "SYNTHETIC / AI-GENERATED SAMPLE DATA; not collected student responses")

    def test_saved_model_predicts_allowed_categories_without_confidence_claims(self):
        artifact = priority_api.get_artifact()
        self.assertEqual(artifact["metadata"]["feature_list"], priority_api.FEATURES)
        priority_api._cache.update({"modified": None, "artifact": None})
        result = priority_api.predict_priority(priority_api.PredictionRequest(assignments=[
            priority_api.AssignmentInput(
                task_id=1,
                title="Review lecture notes",
                description="Prepare for the quiz.",
                category="Academic assignment",
                importance=8,
                urgency=7,
                estimated_time_minutes=90,
                time_availability=6,
                current_workload=5,
                other_pending_assignments=2,
            ),
        ]))
        prediction = result["predictions"][0]
        self.assertIn(prediction["priority_category"], {"Low", "Medium", "High"})
        self.assertTrue(prediction["suggested_next_step"])
        self.assertEqual(prediction["prediction_type"], "experimental_synthetic_data")
        self.assertNotIn("confidence", prediction)
        self.assertNotIn("probabilities", prediction)
        self.assertNotIn("rank", prediction)
        self.assertIn("SYNTHETIC", result["model"]["provenance"])
        self.assertEqual(result["model"]["version"], "1.1.0")

    def test_saved_model_handles_missing_numeric_and_unseen_category_values(self):
        result = priority_api.predict_priority(priority_api.PredictionRequest(assignments=[
            priority_api.AssignmentInput(
                title="Community event",
                category="Unseen category",
                importance=6,
                urgency=4,
                estimated_time_minutes=None,
                time_availability=5,
                current_workload=4,
                other_pending_assignments=None,
            ),
        ]))
        self.assertIn(result["predictions"][0]["priority_category"], {"Low", "Medium", "High"})

    def test_next_step_suggestions_use_category_and_urgency_without_ranking(self):
        self.assertIn("High", priority_api._suggest_next_step("High", 9))
        self.assertIn("urgency is 9/10", priority_api._suggest_next_step("Medium", 9))
        self.assertIn("revisit it", priority_api._suggest_next_step("Low", 2))

    def test_registry_records_synthetic_provenance_without_changing_active_external_models(self):
        registry = json.loads((ROOT / "datasets" / "models" / "model_registry.json").read_text(encoding="utf-8"))
        synthetic = registry["experimental_models"]["contextify_task_priority_synthetic"]
        self.assertEqual(synthetic["deployment"], "experimental_only_synthetic_data")
        self.assertIn("SYNTHETIC", synthetic["provenance"])
        artifact_path = ROOT / synthetic["artifact"]
        self.assertEqual(hashlib.sha256(artifact_path.read_bytes()).hexdigest(), synthetic["artifact_sha256"])
        self.assertEqual(registry["models"]["likely_location"]["version"], "1.0.4")
        self.assertEqual(registry["models"]["likely_location"]["deployment"], "integrated_supplementary")
        self.assertEqual(registry["models"]["likely_time"]["deployment"], "research_only")

    def test_missing_artifact_returns_service_unavailable_and_invalid_values_are_rejected(self):
        original_path = priority_api.MODEL_PATH
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                priority_api.MODEL_PATH = Path(temp_dir) / "missing.joblib"
                priority_api._cache.update({"modified": None, "artifact": None})
                with self.assertRaises(HTTPException) as error:
                    priority_api.predict_priority(priority_api.PredictionRequest(assignments=[
                        priority_api.AssignmentInput(title="Test", importance=5, urgency=5,
                            time_availability=5, current_workload=5),
                    ]))
                self.assertEqual(error.exception.status_code, 503)
        finally:
            priority_api.MODEL_PATH = original_path
            priority_api._cache.update({"modified": None, "artifact": None})

        with self.assertRaises(ValidationError):
            priority_api.AssignmentInput(title="Invalid", importance=11, urgency=5,
                time_availability=5, current_workload=5)

        with self.assertRaises(ValidationError):
            priority_api.AssignmentInput(title="Missing importance", urgency=5,
                time_availability=5, current_workload=5)


if __name__ == "__main__":
    unittest.main()
