# Model limitations

- The MS-LaTTE labels are human judgements about likely completion context. They are not observed completion events and are not labels from Contextify users.
- The models use only task title text because Contextify category and MS-LaTTE list title are not equivalent fields.
- Location and time targets are multi-label unions across known annotators. This preserves disagreement as multiple labels but does not model annotator identity or label prevalence per task.
- Evaluation is one deterministic 80/20 holdout grouped by token-normalized task title. Similar-but-not-identical wording may still cross the split. The scores do not establish real-world generalization.
- The simple custom Multinomial Naive Bayes implementation is a research baseline. The app shows its predicted label sets only as optional research cues, not as facts or calibrated probabilities.
- Rare time labels perform less well than common labels (latest candidate night recall: weekday 0.222, weekend 0.175). Time suggestions remain disabled in the app.
