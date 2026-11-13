# Training data summary

The location and time experiments use only MS-LaTTE's `TaskTitle` and `Known=true` human judgements. They use a multi-label union: a label is positive for a record when at least one known annotator supplied it. This preserves multiple labels where annotators disagree.

All 10,101 MS-LaTTE records have at least one usable location and time annotation. The 65/15/20 split grouped token-normalized duplicate titles, giving 6,566 training, 1,516 validation, and 2,019 test records. The final model is refit on the combined 8,082 training+validation records. Split seed: 42. The selected location artifact is version 1.0.4; the latest time candidate remains research-only.
