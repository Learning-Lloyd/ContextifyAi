# Contextify survey data dictionary

Source workbook: `Contextify_FormResponses2_Valid.xlsx`, worksheet `Clean Data`. The workbook stays outside the repository. There are 244 cleaned response rows and 39 columns. This dictionary records meanings, not respondent-level values.

## Respondent and task-management fields

| Field | Meaning / scale |
|---|---|
| Respondent_ID | Workbook-assigned response identifier; sensitive linkage field, omit from analysis exports. |
| Timestamp | Response submission time; identifying/contextual metadata, omit from analysis exports. |
| Respondent_Type | Respondent type. |
| Gender | Demographic response; sensitive and unnecessary for the current system analysis. |
| Age | Demographic response; sensitive and unnecessary for the current system analysis. |
| Prioritize_Freq | How often the respondent prioritizes daily tasks; 1 Never to 5 Always. |
| Q1_Difficulty_Deciding | Frequency of difficulty deciding which task to do first; 1 Never to 5 Always. |
| Q2_Overwhelmed | Frequency of feeling overwhelmed by task volume; 1 Never to 5 Always. |
| Q3_Struggle_Tasks | Task types difficult to prioritize; multiple selections. |
| Q4_Delay_Tasks | Frequency of delaying important tasks due to uncertainty; 1 Never to 5 Always. |
| Q5_Method | Current task-management/prioritization methods; multiple selections. |
| Q6_Factors | Factors currently considered while prioritizing; multiple selections. |
| Q7_Uncertain_Why | Frequency of uncertainty about why a task was prioritized; 1 Never to 5 Always. |
| Q8_Want_Score | Frequency of wanting a numerical task score/ranking; 1 Never to 5 Always. |
| Q9_Want_Explanation | Frequency of wanting an explanation for a recommendation; 1 Never to 5 Always. |
| Q10_Satisfaction | Satisfaction with current approach: 2 dissatisfied, 3 neutral, 4 satisfied, 5 very satisfied. No value 1 occurs in the cleaned sheet. |

## Section S1: perceptions of Contextify

All S1 fields use 1 Strongly disagree to 5 Strongly agree. Fields ending `_R` have negative wording and were not reverse-coded in the source.

| Field | Statement measured |
|---|---|
| S1_Q1_UrgencyImportance | Urgency and importance would improve prioritization. |
| S1_Q2_Workload | Current workload would help decision quality. |
| S1_Q3_ExplainableTrust | Explainable recommendations would increase trust. |
| S1_Q4_WeightedScoring | Weighted scoring would clarify why a task is recommended. |
| S1_Q5_ReduceFatigue | Contextify would reduce decision fatigue. |
| S1_Q6_RecsHelp | Contextify recommendations would help prioritize effectively. |
| S1_Q7_RecsNotHelp_R | Contextify recommendations would not help prioritize effectively. |
| S1_Q8_ContextFactorsImprove | Contextify contextual factors would improve decisions. |
| S1_Q9_ContextFactorsNotImprove_R | Contextify contextual factors would not improve decisions. |
| S1_Q10_ExplainValuable | Explainable recommendations are valuable. |
| S1_Q11_ExplainNotValuable_R | Explainable recommendations are not valuable. |

## Section S2: feature preferences

All S2 fields use 1 Strongly disagree to 5 Strongly agree. Fields ending `_R` have negative wording and were not reverse-coded in the source.

| Field | Statement measured |
|---|---|
| S2_Q1_RealTimeUpdate | Real-time updates and dynamic reprioritization. |
| S2_Q2_CalendarIntegration | Calendar integration. |
| S2_Q3_CustomWeights | Adjustable prioritization weights. |
| S2_Q4_Notifications | Notifications and reminders. |
| S2_Q5_Privacy | Importance of privacy and security measures. |
| S2_Q6_CustomizableValuable | A customizable prioritization system is valuable. |
| S2_Q7_CustomizableNotValuable_R | A customizable prioritization system is not valuable. |
| S2_Q8_MobileImprove | Mobile integration would improve usability. |
| S2_Q9_MobileNotImprove_R | Mobile integration would not improve usability. |
| S2_Q10_NotifEnhance | Real-time notifications would enhance task management. |
| S2_Q11_NotifNotEnhance_R | Real-time notifications would not enhance task management. |

## Open response and data quality

`Suggestions` contains optional free-text feature suggestions. The data cleaning log says nonanswers such as “none”, “na”, and punctuation were set to blank. It has 77 nonempty cleaned responses; do not redistribute raw comments without an approved privacy review.

The cleaning log records 300 original responses, 2 duplicates removed, and 54 invalid responses removed (3 overlap across invalid-response rules), leaving 244. It records recoding of 22 Likert items and 8 frequency/satisfaction fields. It also says department and phone-number columns were removed. Do not reinterpret `_R` items as positive scores without an explicit transformation.
