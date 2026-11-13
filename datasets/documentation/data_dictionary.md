# Processed data dictionary

Processed files are UTF-8 JSON Lines. Each line is one external record. Raw originals stay unchanged in `datasets/original/`.

## MS-LaTTE (`processed/ms_latte.jsonl`)

| Processed field | Source field | Meaning |
| --- | --- | --- |
| `source_id` | `ID` | Original record identifier |
| `title` | `TaskTitle` | Task title |
| `list_title` | `ListTitle` | Original task-list title |
| `location_judgements` | `LocJudgements` | Original known/unknown judgements and location annotations |
| `time_judgements` | `TimeJudgements` | Original known/unknown judgements and time annotations |

The browser summarizes known annotations as label sets and counts. The processed file retains all supplied judgements.
