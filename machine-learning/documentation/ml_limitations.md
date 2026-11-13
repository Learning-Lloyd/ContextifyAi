# ML limitations

- MS-LaTTE annotations describe human judgments of likely context, not measured outcomes or Contextify student behavior.
- The evaluation is one grouped holdout, not repeated cross-validation or external cohort validation. Similar paraphrases can still occur across partitions.
- The selected location model has weaker Public F1 (0.6319) than Home and Work. User-facing suggestions are optional and must be verified by the user.
- The time model has very weak night-label recall and remains research-only. Predicted time-of-day is not a deadline.
- The supplied synthetic workbook contains 851 eligible task examples, but they are AI-generated/sample data, not independently verified real student outcomes. The current three-class model excludes seven source rows labeled Critical because that category is absent from the manuscript. Do not present its evaluation as real-world performance or a validated priority model.
- The synthetic target is strongly associated with the separately recorded rank (which is excluded from features), and the same 40 task templates repeat across respondent groups. This limits how much the holdout says about new tasks.
- No independently reviewed real Contextify task labels are available. The deterministic score remains separate and unchanged.
- The survey workbook contains 244 cleaned respondent-level questionnaire records, not task-level decisions. Its positive-leaning and imbalanced responses support aggregate needs analysis, but not a dependable supervised task-priority or generalizable survey-prediction model.
- The survey cleaning log excluded 54 of 298 nonduplicate records. This can create selection bias; its cleaned results should be described as findings from this sample.
- Survey negative-worded `_R` questions were not reverse-coded. Do not combine them into an overall attitude score without an explicit, documented recoding decision.
- No model confidence has been calibrated. Do not interpret internal scores as probabilities.
