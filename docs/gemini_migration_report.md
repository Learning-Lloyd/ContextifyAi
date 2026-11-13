# Contextify Gemini migration

## Status

Contextify uses Google Gemini for backend AI features through Gemini's `generateContent` REST endpoint and JSON response mode. The configured model is **`gemini-3.5-flash-lite`**, verified against Google's official model listing as a stable model with structured-output support. Its availability and quota depend on the Google AI project and account; do not enable paid billing to bypass free-tier limits. The user's key remains in the server environment. No live Gemini request was made for this model change; a live smoke test requires the user's explicit approval.

Official references:

- [Gemini 3.8 Flash model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
- [Gemini 3.5 Flash-Lite model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [GenerateContent REST API](https://ai.google.dev/api/generate-content)
- [Structured output guide](https://ai.google.dev/gemini-api/docs/structured-output?lang=rest)
- [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

Google currently recommends its newer Interactions API for new projects, while stating that `generateContent` remains supported. Contextify uses `generateContent` to preserve the existing single-request JSON service pattern.

## Features routed through the configured provider

These existing backend features all use the shared `AiClient`, and therefore use Gemini by default or OpenRouter when explicitly selected:

- Task description drafting (`POST /api/tasks/generate-description`)
- Task importance suggestions (`POST /api/tasks/analyze-importance`)
- Task breakdown suggestions (`POST /api/tasks/breakdown`)
- Decision Lab ranking narratives and task explanations

Decision Insights is analytics over saved decisions and is not an AI provider call. The experimental Random Forest service is also separate from Gemini. Routes and successful response shapes remain unchanged.

The official task priority weights (40/30/20/10), thresholds, ranking order, Random Forest v1.1.0, synthetic training data, and database records were not changed by this migration.

## Environment configuration

Set these in `server/.env` (or the server's deployment secret/config store):

```dotenv
AI_ENABLED=true
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_from_google_ai_studio
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
AI_TIMEOUT=30
AI_RETRY_ATTEMPTS=3
AI_RETRY_BASE_DELAY_MS=300
AI_RETRY_MAX_DELAY_MS=2000
AI_RETRY_MAX_WAIT_SECONDS=5
```

The API key is read only by Laravel on the server. Do not add it to Vite/client variables, commit it, or share it in chat. The `.env.example` contains only an empty placeholder.

To select OpenRouter instead, set `AI_PROVIDER=openrouter` and configure `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and optionally `OPENROUTER_BASE_URL`. This is an explicit choice; Contextify does not automatically switch providers or models. No request is sent to OpenRouter while `AI_PROVIDER=gemini`.

## Local setup

1. Create an API key in Google AI Studio and confirm the project uses the Free Tier if you want to avoid paid use.
2. Add the values above to `server/.env`; keep the key private.
3. From `server`, run `php artisan config:clear` so Laravel reloads the environment settings.
4. Restart the Laravel API process. Use an existing description-help, importance-suggestion, breakdown, or Decision Lab explanation action to make a request.
5. If a request fails, the API response gives a provider-specific message; Laravel logs retain bounded HTTP failure details and status, without logging the configured key.

For deployment, put the key in the host's encrypted environment-variable/secret manager, set the same provider/model values, clear or rebuild Laravel's config cache during deployment, and restart the application workers. Never put the API key in client build-time variables.

## Privacy and prompt scope

Prompts do not include account names/emails, database user IDs, task database IDs in Decision Lab explanation prompts, or location fields. Description, importance, breakdown, and explanation prompts apply best-effort redaction for email addresses, phone-like numbers, labeled student identifiers, and URLs. Explanation prompts include only selected weather condition/temperature/rain fields.

Redaction cannot reliably detect every name or identifying detail in free text. Google documents that Free Tier data may be used to improve its products. Do not send real student personal information or confidential task text using a Free Tier key; use de-identified task descriptions. For real participant data, consult your institution's data/privacy requirements and Google's current paid-tier data terms before enabling a provider project.

## Reliability and errors

- Gemini uses the `x-goog-api-key` header; credentials never enter browser code or URLs.
- Transient 429, 5xx, network-timeout, and connection failures use the existing bounded retry and `Retry-After` handling. There are at most three attempts by default, and long `Retry-After` values stop retrying rather than being ignored.
- HTTP 400, 401/403, 402, 429, 5xx, timeouts, network errors, and malformed responses receive distinct internal categories and user-facing explanations. OpenRouter-specific 402 is retained for that optional provider.
- The UI's existing in-flight guard prevents duplicate Help me write clicks. Client services coalesce identical overlapping description, importance, breakdown, scoring-preview, and Decision Lab analysis requests.
- Draft scoring previews use the local heuristic for their importance suggestion so changing form fields does not spend Gemini requests. Saving a task may still request its importance suggestion once; explicit Help me write and other AI actions continue to use the configured provider.
- Gemini's `RetryInfo.retryDelay` is read from 429 response bodies when no `Retry-After` header is present, preventing immediate retries before the provider's requested wait.
- Gemini quota errors distinguish per-minute and per-day limits. Long reset times are displayed as hours/minutes instead of a large number of seconds.
- Decision Lab explanations are prompted to sound conversational and student-friendly, explain why and what to do next, and avoid displaying score values, weights, or formula calculations in the narrative. Numeric scores remain separate UI data. The model receives only qualitative leading-factor labels plus task context and final ranks.
- If Gemini is unavailable, the fallback gives short plain-language guidance without presenting a score breakdown, and the UI labels it as basic guidance rather than a Gemini response.
- Gemini text is used only for narrative or task text suggestions. It cannot calculate or overwrite official scores or ranking.

## Tests and verification

Mocked backend coverage includes Gemini JSON success, API-key header use, authentication rejection, invalid requests, rate-limit retry and Retry-After, 5xx recovery, timeouts, malformed success payloads, and explicit OpenRouter selection. Existing feature and AI explanation tests use Gemini response envelopes.

Recorded on 2026-11-13 (rechecked after selecting Gemini 3.5 Flash-Lite):

- Full backend suite: **64 tests, 312 assertions passed**.
- ML tests: **16 passed**.
- PHP syntax checks for the AI config/client and affected tests: **passed**.
- Frontend production build: **passed**. Vite reported the existing large JavaScript chunk warning (~994 kB).
- Frontend lint: **passed with existing warnings**, none were errors.
- Live Gemini smoke test for `gemini-3.5-flash-lite`: **not run**; it requires the user's explicit approval. The existing key setting is present but was not read aloud or exposed.

## Model change (2026-11-13)

Changed only the model value from `gemini-3.8-flash` to `gemini-3.5-flash-lite` in the server `.env`, configuration default, example environment file, and PHPUnit environment. Preserved the existing `GEMINI_API_KEY` setting and its value. Laravel's configuration cache was cleared after the change; `php artisan config:show` confirmed the effective provider is `gemini` and effective model is `gemini-3.5-flash-lite`. No long-running application worker was identified, so no separate backend restart was needed. No live API request was made for this model change.

## Remaining limitation

The model selection is verified in Laravel's effective configuration. The new model's account quota and live request behavior have not been checked because no smoke test was approved. A mocked test confirms the existing request/response contract only; it does not prove the configured Google project can use this model.
