# Contextify priority-model feasibility

## Finding

The supplied synthetic workbook supports a development-only classifier, but the available sources do not support a validated real-world Contextify task-priority model. The workbook has 851 synthetic task rows with a priority category and approximate factor inputs; it does not contain genuine observed student behavior or independent real-world outcomes. The development model is registered as experimental only.

## Required fields missing from the available sources

For each real task, a defensible training example needs at minimum:

- Task description or title.
- Importance rating.
- Actual deadline or a defined urgency measure at the decision time.
- Time available to work on the task.
- Current workload at the decision time.
- A human-reviewed priority label assigned independently of the formula.
- A short reason for the label, and enough provenance to audit the labeling process.


## Defensible data collection protocol

Collect a consented, de-identified set of actual task snapshots at the moment a prioritization decision is made. Have at least two reviewers independently label urgency among tasks available to that user, using a written rubric; resolve disagreements with a third reviewer or documented adjudication. Keep the current formula score hidden from reviewers during labeling to avoid circular ground truth. Record each factor as it was known at that time, the label, reviewer agreement, and rationale. Avoid collecting unnecessary personal details. Split evaluation by user (and preferably time) so a person's tasks do not leak across train and test.

Before claiming real-world performance, collect an adviser-approved set of actual task snapshots and independently reviewed labels, then compare transparent baselines with grouped cross-validation and a held-out cohort. Report macro F1, class-specific recall, calibration, confidence intervals, and the formula-only baseline. Predefine a minimum data-quality and performance gate with the adviser. Keep model predictions supplementary and preserve human override.

If labels are generated from the existing 40/30/20/10 score, the experiment can only be described as score approximation, not learning independent human priorities. The active formula in `server/app/Services/PriorityCalculator.php` remains unchanged.
