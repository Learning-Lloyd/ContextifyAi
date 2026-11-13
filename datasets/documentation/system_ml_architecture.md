# Contextify scoring and research model architecture

1. User tasks remain in the existing authenticated task tables.
2. The backend calculates priority with `PriorityCalculator`: importance 40%, urgency 30%, time availability 20%, and current workload 10%.
3. Decision Lab may separately request MS-LaTTE location suggestions from `ResearchContextPredictor`, using only the task title and the trained location model artifact. The response identifies the model and target, but does not show uncalibrated probabilities. The time model remains in the research area because rare time-label results need improvement.
4. Suggestions are read-only and do not set location, due time, weather, task state, analysis history, or any scoring factor.
5. The existing explanation layer remains separate. Neither it nor the context model changes the calculated score.
6. External datasets and their summary analytics remain available in the research dataset browser and are excluded from personal productivity analytics and user reports.

The optional inference route requires normal authenticated access and accepts up to 20 task IDs/titles. The model can be rebuilt from the copied data with `python machine-learning/training/train_context_models.py`.
