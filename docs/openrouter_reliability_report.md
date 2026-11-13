# Contextify OpenRouter reliability

## Current configuration

The active server configuration currently resolves to **`openrouter/free`**. The model is read from `OPENROUTER_MODEL`; when that variable is absent and OpenRouter is the selected provider, the default is also `openrouter/free`. No API key is included in this report.

`openrouter/free` is OpenRouter's automatic free-model router. Contextify keeps sending that same model ID during retries and does not automatically move to a paid model.

## Switching models manually

1. Choose a model ID from the OpenRouter model catalog and verify that it supports chat completions and JSON response format.
2. In `server/.env`, change only the model setting, for example:

   ```dotenv
   OPENROUTER_MODEL=openrouter/free
   ```

   To pin a compatible model, replace the value with its exact OpenRouter model ID. A model ID without a free suffix may incur charges. Contextify will never switch to it automatically.
3. Clear Laravel's cached configuration from the `server` directory:

   ```text
   php artisan config:clear
   ```

4. Restart any long-running PHP worker or local server process, then retry **Help me write**.

The API key stays in `server/.env` as `OPENROUTER_API_KEY`; do not paste it into the frontend or commit it. The client does not need changes when switching models.

## Request handling changes

- The existing OpenRouter provider, base URL, model selection, request body, and successful AI response shape remain intact.
- Temporary 429 rate limits, 5xx provider responses, and network connection failures/timeouts get at most three total attempts by default. Delays use bounded exponential backoff.
- A numeric or HTTP-date `Retry-After` is honored. If it asks Contextify to wait longer than `AI_RETRY_MAX_WAIT_SECONDS`, Contextify stops instead of retrying before the provider's requested time.
- HTTP 401, 402, and other non-transient client errors are not retried. They are recorded as authentication, insufficient-credit, or request/model errors.
- Failed provider status, a truncated response body (up to 4,000 characters), and `Retry-After` are written to the Laravel log. Network failures record the exception type and a bounded diagnostic message. No API key or authorization header is logged.
- The description endpoint returns a user-readable message for rate limiting, insufficient credits, authentication, provider unavailability, timeout, connection, and model-request failures. Successful response JSON is unchanged.
- The description button disables during generation and uses an in-flight guard to prevent repeated clicks. The frontend request service also coalesces concurrent identical description requests into one provider call.
- OpenRouter's own `openrouter/free` routing behavior is retained. Contextify does not add a cross-model or paid-model fallback.

## Retry settings

These may be set in `server/.env`; defaults are shown:

```dotenv
AI_RETRY_ATTEMPTS=3
AI_RETRY_BASE_DELAY_MS=300
AI_RETRY_MAX_DELAY_MS=2000
AI_RETRY_MAX_WAIT_SECONDS=5
```

`AI_RETRY_ATTEMPTS` is clamped to 1–5 total attempts. The retry wait limit prevents a UI request from hanging for a long provider-mandated delay; the returned error still tells the user to retry later.

## Tests and limitations

Mocked `AiClientReliabilityTest` cases cover 429 handling and preserved details, bounded retries, 401/402 no-retry behavior, 5xx recovery, timeout recovery, and honoring a long `Retry-After` without retrying early. Tests do not make live OpenRouter calls. Upstream provider capacity can still vary; a 429 that includes no reset or retry hint cannot provide an exact return-to-service time.
