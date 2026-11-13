# Synthetic task-priority dataset report

> **Provenance: SYNTHETIC / AI-GENERATED SAMPLE DATA.** These are not real student-collected survey responses or real observed Contextify tasks.

Source workbook: `contextify_survey_dataset_234_respondents.xlsx` (not modified). SHA-256: `436923281920066002f260d557841ec20e0daaeae0e124e2229194c8696baeb9`.

## Workbook and inclusion

The workbook contains `Responses` (234 response rows plus the header; 68 columns) and `Codebook` (68 field definitions plus its header). All 234 respondents consented; 22 are not marked as current students and are excluded. The current-student subset contains 851 labeled task records from 212 respondents. All five task slots were read; blank fourth/fifth slots were skipped, not imputed as tasks. No source rows were deleted or modified.

## Target distribution

| Priority label | Eligible tasks | Share |
|---|---:|---:|
| Critical | 7 | 0.8% |
| High | 242 | 28.4% |
| Low | 264 | 31.0% |
| Medium | 338 | 39.7% |

The source workbook contains seven records labeled Critical. Because Critical is not a manuscript category, the priority model excludes all seven and trains only on Low, Medium, and High.

## Data quality and repeated scenarios

There are 40 distinct task titles among eligible rows; 811 records are additional appearances of an existing title template. There are 0 repeated titles within the same respondent and 0 exact duplicate prepared feature/target records. Repeated scenarios across respondents are retained because they represent separate synthetic respondent judgments, but title templates can cross respondent-group splits and make evaluation optimistic for novel tasks. No records were automatically removed as duplicates.

Observed task categories: Academic assignment (222), Examination or review (152), Extracurricular activity (86), Group project (150), Other (64), Personal responsibility (177). No invalid target labels were found.

The source target category is strongly associated with the separately recorded human rank (which is excluded from model inputs). All seven source rows labeled Critical are rank 1; this raises concern that the synthetic category may be derived from the same constructed ranking. No claim is made that the category is an independent real-world ground truth.

## Feature transformations

| Model feature | Workbook source | Preparation |
|---|---|---|
| `title`, `description`, `category` | Per-task fields | Title/description text was compared in a separate candidate but is excluded from the selected structured-only model; category remains a model input. |
| `importance` | Task importance 1–5 | Multiplied by two to align with Contextify's 1–10 scale. |
| `urgency` | Time-remaining bucket | Mapped monotonically: overdue 10, <24 hours 9, 1–2 days 8, 3–5 days 7, 6–7 days 6, 1–2 weeks 4, >2 weeks 2, no deadline 1. |
| `estimated_time_minutes` | Estimated-duration bucket | Midpoint estimates (15, 45, 90, 210, 390, 600); Not sure remains missing and is imputed only within the fitted training pipeline. |
| `time_availability` | Uninterrupted-time-today bucket | Monotonic 1, 2, 4, 6, 8, 10 mapping by available-time bucket. |
| `current_workload` | Other-task-workload bucket | Monotonic 1, 3, 5, 7, 9, 10 mapping; Not sure remains missing and is imputed only in the training pipeline. |
| `other_pending_assignments` | Other unfinished tasks count | Numeric value, retained. |
| `priority_label` | Per-task source priority category | Source labels include Low/Medium/High/Critical; model training excludes Critical and uses Low/Medium/High. |
| `participant_id` | Synthetic respondent ID | Split group only; never a model feature. |
| `source_slot` | Workbook task slot 1–5 | Audit only; never a model feature. |

These questionnaire-bucket mappings approximate Contextify's factor scale; they are documented transformations, not empirically validated equivalences. Difficulty and consequence are excluded because Contextify's task form does not collect those fields. Rank and written reasoning are excluded to avoid direct target leakage.

## Missing values in prepared model features

| Feature | Missing rows |
|---|---:|
| `estimated_time_minutes` | 67 |
| `current_workload` | 25 |

## All source columns, observed types, and missing counts

Types are observed Excel-cell categories (`text`, `number`, `date/time`, `boolean`, `blank`) across 234 response rows. Field meanings come from the workbook Codebook. The complete machine-readable audit is `datasets/documentation/contextify_synthetic_priority_dataset_audit.json`.

| Workbook column | Observed cell types/counts | Blank cells | Codebook meaning |
|---|---|---:|---|
| `Respondent_ID` | text: 234 | 0 | Synthetic respondent ID |
| `Persona` | text: 234 | 0 | Persona type (student / working_student / fresh_grad) |
| `Q1_Consent` | text: 234 | 0 | Q1 consent |
| `Q2_Current_Student` | text: 234 | 0 | Q2 currently a student |
| `Q3_Main_Category` | text: 234 | 0 | Q3 main task category |
| `Q4_Unfinished_Tasks` | text: 234 | 0 | Q4 usual unfinished tasks |
| `Q5_Hours_Per_Day` | text: 234 | 0 | Q5 hours/day dedicated |
| `Task1_Title` | text: 234 | 0 | Task1 title |
| `Task1_Description` | text: 234 | 0 | Task1 description |
| `Task1_Category` | text: 234 | 0 | Task1 category |
| `Task1_Importance` | number: 234 | 0 | Task1 importance (1-5) |
| `Task1_Time_Remaining` | text: 234 | 0 | Task1 time remaining |
| `Task1_Est_Duration` | text: 234 | 0 | Task1 estimated duration |
| `Task1_Difficulty` | number: 234 | 0 | Task1 difficulty (1-5) |
| `Task1_Consequence` | text: 234 | 0 | Task1 consequence |
| `Task1_Rank` | number: 234 | 0 | Task1 rank (1=highest) |
| `Task1_Priority_Level` | text: 234 | 0 | Task1 priority level |
| `Task2_Title` | text: 234 | 0 | Task2 title |
| `Task2_Description` | text: 234 | 0 | Task2 description |
| `Task2_Category` | text: 234 | 0 | Task2 category |
| `Task2_Importance` | number: 234 | 0 | Task2 importance (1-5) |
| `Task2_Time_Remaining` | text: 234 | 0 | Task2 time remaining |
| `Task2_Est_Duration` | text: 234 | 0 | Task2 estimated duration |
| `Task2_Difficulty` | number: 234 | 0 | Task2 difficulty (1-5) |
| `Task2_Consequence` | text: 234 | 0 | Task2 consequence |
| `Task2_Rank` | number: 234 | 0 | Task2 rank (1=highest) |
| `Task2_Priority_Level` | text: 234 | 0 | Task2 priority level |
| `Task3_Title` | text: 234 | 0 | Task3 title |
| `Task3_Description` | text: 234 | 0 | Task3 description |
| `Task3_Category` | text: 234 | 0 | Task3 category |
| `Task3_Importance` | number: 234 | 0 | Task3 importance (1-5) |
| `Task3_Time_Remaining` | text: 234 | 0 | Task3 time remaining |
| `Task3_Est_Duration` | text: 234 | 0 | Task3 estimated duration |
| `Task3_Difficulty` | number: 234 | 0 | Task3 difficulty (1-5) |
| `Task3_Consequence` | text: 234 | 0 | Task3 consequence |
| `Task3_Rank` | number: 234 | 0 | Task3 rank (1=highest) |
| `Task3_Priority_Level` | text: 234 | 0 | Task3 priority level |
| `Task4_Title` | blank: 79, text: 155 | 79 | Task4 title |
| `Task4_Description` | blank: 79, text: 155 | 79 | Task4 description |
| `Task4_Category` | blank: 79, text: 155 | 79 | Task4 category |
| `Task4_Importance` | blank: 79, number: 155 | 79 | Task4 importance (1-5) |
| `Task4_Time_Remaining` | blank: 79, text: 155 | 79 | Task4 time remaining |
| `Task4_Est_Duration` | blank: 79, text: 155 | 79 | Task4 estimated duration |
| `Task4_Difficulty` | blank: 79, number: 155 | 79 | Task4 difficulty (1-5) |
| `Task4_Consequence` | blank: 79, text: 155 | 79 | Task4 consequence |
| `Task4_Rank` | blank: 79, number: 155 | 79 | Task4 rank (1=highest) |
| `Task4_Priority_Level` | blank: 79, text: 155 | 79 | Task4 priority level |
| `Task5_Title` | blank: 156, text: 78 | 156 | Task5 title |
| `Task5_Description` | blank: 156, text: 78 | 156 | Task5 description |
| `Task5_Category` | blank: 156, text: 78 | 156 | Task5 category |
| `Task5_Importance` | blank: 156, number: 78 | 156 | Task5 importance (1-5) |
| `Task5_Time_Remaining` | blank: 156, text: 78 | 156 | Task5 time remaining |
| `Task5_Est_Duration` | blank: 156, text: 78 | 156 | Task5 estimated duration |
| `Task5_Difficulty` | blank: 156, number: 78 | 156 | Task5 difficulty (1-5) |
| `Task5_Consequence` | blank: 156, text: 78 | 156 | Task5 consequence |
| `Task5_Rank` | blank: 156, number: 78 | 156 | Task5 rank (1=highest) |
| `Task5_Priority_Level` | blank: 156, text: 78 | 156 | Task5 priority level |
| `Q14_Other_Unfinished_Tasks` | number: 234 | 0 | Q14 other unfinished tasks |
| `Q15_Other_Task_Workload` | text: 234 | 0 | Q15 workload of other tasks |
| `Q16_Uninterrupted_Time_Today` | text: 234 | 0 | Q16 uninterrupted time today |
| `Q17_Circumstances` | text: 234 | 0 | Q17 circumstances |
| `Q20_Reasoning` | text: 234 | 0 | Q20 priority reasoning |
| `Q21_Most_Important_Factor` | text: 234 | 0 | Q21 most important factor |
| `Q22_Change_If_Less_Time` | text: 234 | 0 | What the respondent would change if less time were available. |
| `Q23_How_Ranking_Changes` | blank: 104, text: 130 | 104 | Explanation of how the respondent's ranking would change. |
| `Q24_System_Useful` | text: 234 | 0 | Q24 system useful |
| `Q25_Wants_Explanation` | text: 234 | 0 | Q25 wants explanation |
| `Q26_Additional_Info` | blank: 20, text: 214 | 20 | Q26 additional info |

The workbook remains in Downloads. This process exports a prepared synthetic-only CSV for reproducible training; it contains synthetic task text and synthetic respondent grouping IDs, not respondent personal identifiers.
