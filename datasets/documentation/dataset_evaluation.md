# Dataset evaluation summary

The repeatable import report is in `dataset_import_report.json`.

## MS-LaTTE

- 10,101 records; all were retained.
- Original fields: `ID`, `TaskTitle`, `ListTitle`, `LocJudgements`, `TimeJudgements`.
- 29,154 location and 50,245 time judgements are marked known; each record keeps the original annotations.
- No missing task titles or duplicate source IDs were found.
- Suitable experiment: multi-label prediction of annotated likely location and time from task titles. These labels represent annotator judgements, not actual Contextify outcomes.
