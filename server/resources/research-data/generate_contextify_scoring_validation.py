"""Generate clearly synthetic test vectors for Contextify's fixed score formula."""

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "contextify_scoring_validation.csv"

TASKS = [
    ("Prepare biology lab report", "Organize observations and submit the lab report.", "Academic", 90),
    ("Review lecture notes", "Review this week's lecture notes and list questions.", "Academic", 45),
    ("Finish group presentation", "Complete slides and rehearse the assigned section.", "Academic", 120),
    ("Read research articles", "Read and summarize sources for the literature review.", "Academic", 75),
    ("Submit programming exercise", "Test and submit the weekly programming exercise.", "Academic", 100),
    ("Plan project milestones", "Break the team project into milestones and owners.", "Work", 60),
    ("Prepare meeting agenda", "Draft topics and materials for the team meeting.", "Work", 30),
    ("Review client feedback", "Group the latest feedback and identify follow-up actions.", "Work", 50),
    ("Update project documentation", "Bring project notes and documentation up to date.", "Work", 70),
    ("Send weekly progress update", "Summarize completed work and blockers for the team.", "Work", 25),
    ("Pay utility bill", "Check the amount and pay the monthly utility bill.", "Personal", 15),
    ("Schedule health appointment", "Find a suitable time and confirm an appointment.", "Personal", 20),
    ("Organize study space", "Sort materials and prepare a clear workspace.", "Personal", 35),
    ("Plan weekly meals", "Choose meals and prepare a short shopping list.", "Personal", 40),
    ("Review monthly expenses", "Check recurring expenses and update the budget.", "Personal", 55),
]

# Each tuple is (importance, urgency, time availability, current workload).
# Cases intentionally cover high, medium, and low score bands.
FACTOR_CASES = [
    (10, 10, 10, 10), (9, 8, 7, 6), (8, 8, 8, 8), (9, 10, 10, 9),
    (7, 7, 6, 6), (6, 5, 7, 4), (5, 5, 5, 5), (6, 9, 3, 7),
    (8, 5, 4, 2), (4, 3, 8, 6), (3, 4, 5, 3), (2, 2, 4, 3),
]

WEIGHTS = {
    "importance": 0.40,
    "urgency": 0.30,
    "time_availability": 0.20,
    "current_workload": 0.10,
}

FIELDS = [
    "test_case_id", "title", "description", "category", "estimated_time_minutes",
    "importance", "urgency", "time_availability", "current_workload",
    "other_pending_assignments", "importance_weight", "urgency_weight",
    "time_availability_weight", "current_workload_weight", "importance_points",
    "urgency_points", "time_availability_points", "current_workload_points",
    "expected_priority_score", "expected_priority_level", "record_type",
]


def priority_level(score: float) -> str:
    if score >= 8:
        return "High"
    if score >= 5:
        return "Medium"
    return "Low"


def main() -> None:
    with OUTPUT.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        case_number = 1
        for task_index, task in enumerate(TASKS):
            title, description, category, minutes = task
            for factor_index, factors in enumerate(FACTOR_CASES):
                importance, urgency, availability, workload = factors
                values = {
                    "importance": importance,
                    "urgency": urgency,
                    "time_availability": availability,
                    "current_workload": workload,
                }
                points = {key: round(value * WEIGHTS[key], 2) for key, value in values.items()}
                score = round(sum(points.values()), 2)
                writer.writerow({
                    "test_case_id": f"CTX-{case_number:03d}",
                    "title": title,
                    "description": description,
                    "category": category,
                    "estimated_time_minutes": minutes,
                    **values,
                    "other_pending_assignments": (task_index + factor_index) % 6,
                    "importance_weight": WEIGHTS["importance"],
                    "urgency_weight": WEIGHTS["urgency"],
                    "time_availability_weight": WEIGHTS["time_availability"],
                    "current_workload_weight": WEIGHTS["current_workload"],
                    "importance_points": points["importance"],
                    "urgency_points": points["urgency"],
                    "time_availability_points": points["time_availability"],
                    "current_workload_points": points["current_workload"],
                    "expected_priority_score": f"{score:.2f}",
                    "expected_priority_level": priority_level(score),
                    "record_type": "SYNTHETIC_VALIDATION_ONLY",
                })
                case_number += 1


if __name__ == "__main__":
    main()
