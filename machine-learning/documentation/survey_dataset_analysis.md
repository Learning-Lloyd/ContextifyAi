# Contextify survey dataset analysis

Audit date: 2026-11-13  
Source: user-supplied `Contextify_FormResponses2_Valid.xlsx` (kept in Downloads; not copied into the repository or application).  
SHA-256: `195dca84b4479e681f010249ec0d2362bfa13c8ed5226a8909c0f4ba6b57118a`

## Workbook integrity

| Worksheet | Dimensions | Interpretation |
|---|---:|---|
| Clean Data | 245 × 39 | Header plus 244 cleaned responses |
| Removed Respondents | 55 × 40 | Header plus 54 excluded responses; not used in analysis |
| Codebook | 44 × 2 | Field meanings and response scales |
| Cleaning Log | 12 × 3 | Source and cleaning decisions |

The cleaning log states 300 source responses, 2 duplicate removals, and 54 invalid responses removed, yielding 244 retained responses. It records removal of two identifying columns (department and phone number), Likert/frequency/satisfaction recoding, and normalization of open-ended nonanswers. It says 3 records overlap between the straight-line and contradictory-response exclusion rules. Negative-worded `_R` items were not reverse-coded. The workbook itself was not edited.

The cleaned sheet has 39 columns and 244 data rows. All cells in the cleaned data area are populated, with no exact duplicate full rows. One response profile is identical after excluding respondent ID and timestamp; this is not treated as a duplicate because separate people can give the same answers. The source contains respondent IDs, timestamps, demographics, and comments; none are reproduced here. All respondents are coded as students.

## Main observed patterns

Counts below are aggregate response counts only. For ordinal items, 4–5 are the top two response categories; labels follow the codebook and not a reverse-coded transformation.

| Survey item | 4–5 count / 244 | What it measures |
|---|---:|---|
| Prioritize_Freq | 230 (94.3%) | How often participants prioritize tasks |
| Q1_Difficulty_Deciding | 216 (88.5%) | Difficulty deciding what to do first |
| Q2_Overwhelmed | 216 (88.5%) | Feeling overwhelmed by task volume |
| Q4_Delay_Tasks | 206 (84.4%) | Delaying important tasks due to uncertainty |
| Q7_Uncertain_Why | 211 (86.5%) | Uncertainty about prioritization reasons |
| Q8_Want_Score | 211 (86.5%) | Desire for a numerical score/ranking |
| Q9_Want_Explanation | 211 (86.5%) | Desire for an explanation of recommendations |
| Q10_Satisfaction | 230 (94.3%) | Satisfaction with current approach (4 satisfied, 5 very satisfied) |
| S1_Q3_ExplainableTrust | 232 (95.1%) | Whether explainable recommendations increase trust |
| S1_Q4_WeightedScoring | 234 (95.9%) | Whether weighted scoring helps explain recommendations |
| S1_Q5_ReduceFatigue | 228 (93.4%) | Perceived potential to reduce decision fatigue |
| S1_Q6_RecsHelp | 221 (90.6%) | Perceived usefulness of recommendations |
| S1_Q10_ExplainValuable | 237 (97.1%) | Value of explainable recommendations |
| S2_Q5_Privacy | 241 (98.8%) | Importance of privacy/security measures |
| S2_Q3_CustomWeights | 237 (97.1%) | Interest in adjustable factor weights |
| S2_Q2_CalendarIntegration | 233 (95.5%) | Interest in calendar integration |
| S2_Q4_Notifications | 230 (94.3%) | Interest in notifications/reminders |
| S2_Q8_MobileImprove | 239 (98.0%) | Perceived mobile-integration benefit |

For multi-select fields, respondents selected academic assignments/examinations 217 times, personal responsibilities 136, research/manuscript work 75, and part-time work 54. Current methods selected included mobile applications 90 times, to-do lists 79, written notes 40, and calendars 28. These are selection counts (the question allows multiple choices), not exclusive categories. The 244 responses contain 77 nonempty suggestion entries; free text is intentionally not quoted or included in this repository.

## Use in Contextify

This cross-sectional self-report survey can inform user-needs analysis, feature priorities, explainability acceptance, perceived usefulness, and system evaluation. It is not a log of actual Contextify task decisions and does not contain task descriptions paired with importance, urgency, available time, workload, or independently reviewed priority outcomes. It therefore cannot train or validate the task-priority model or replace the existing formula.

The strict consistency filters may create selection bias: 54 of 298 nonduplicate responses were excluded (18.1%). Findings describe this cleaned sample and are not automatically representative of all students or users. The overwhelmingly positive response distributions also limit inference about less favorable user experiences. The `_R` fields are negatively worded but not reverse-coded; analyze them as written or transform them explicitly in a separate, documented analysis.

## Handling and privacy

The workbook remains in the user’s Downloads folder. Do not import respondent-level rows, timestamps, IDs, demographics, or free-text comments into the app or commit the workbook. If findings are later shown in Contextify, expose only clearly labeled aggregate research results with access controls appropriate to the study.
