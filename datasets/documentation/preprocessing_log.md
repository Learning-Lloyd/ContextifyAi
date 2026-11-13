# Preprocessing log

Run `python datasets/import_datasets.py` to reproduce processed files and the JSON import report.

- MS-LaTTE: validated that each record is an object with a non-empty source ID and task title; rejected missing/duplicate IDs if found; decoded the judgement arrays and retained original annotations; no rows were rejected in the supplied file.
- Duplicate source IDs are rejected during MS-LaTTE processing; the supplied records have unique IDs.
- No scoring factors, labels, priority outcomes, timestamps, or task descriptions were fabricated.
- External records are only written to `datasets/processed/`; they are not imported into `tasks` or attributed to a signed-in user.
