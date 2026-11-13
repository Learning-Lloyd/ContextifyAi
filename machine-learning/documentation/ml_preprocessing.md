# ML preprocessing

## MS-LaTTE

- Preserve original JSON records and annotations; normalize only into UTF-8 JSONL for analysis.
- Keep rows with at least one `Known=true` judgement and a non-empty target label.
- Union all known annotations per record as a multi-label target; annotator disagreements remain multi-label rather than being fabricated into a single answer.
- Lowercase and tokenize `TaskTitle`; punctuation splits tokens. Do not use `ListTitle` as a substitute for Contextify category.
- Group repeated titles by normalized tokens before creating the deterministic 80/20 holdout (seed 42).
- Fit vocabulary from training data only, retain terms occurring at least twice, cap at 12,000 features, and use one-vs-rest Multinomial Naive Bayes with Laplace alpha 1.
