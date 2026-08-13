# Iteration 092 — Persist password-reset abuse limiting

Category: security / reliability

## Problem and evidence

The forgot-password route previously limited requests with an in-memory `Map`. In a multi-instance or serverless deployment, each instance had an independent counter, allowing the per-email limit to be bypassed by distributing requests across instances. The public API contract still intentionally returns the same status code and payload for unknown-account and rate-limited requests; this iteration hardens the backend behavior and side effects behind that contract.

## Scope and acceptance criteria

- Enforce the five-request, fifteen-minute window from persistent password-reset token records.
- Keep unknown-account and rate-limited public responses indistinguishable at the API contract level (same status code and payload).
- Do not create a token or send mail after the limit is reached.
- Preserve existing token invalidation and expiry behavior.

Non-goals: adding a new cache provider, changing public reset-token semantics, or changing password-reset UI.

## Implementation

`requestPasswordReset` counts recent token rows for the resolved account (identified by deterministic email lookup) before creating a new token. The account row is locked inside a serializable transaction so concurrent requests cannot pass the count check together; transient serialization conflicts are retried a bounded number of times. Token counting is scoped to the resolved account rather than an authenticated user, since password recovery is a public endpoint. The deterministic email lookup is an intentional exception to authenticated-user scoping, necessary for the forgot-password flow. This state is shared by application instances through the existing database.

## Security and privacy

The route continues to return the generic reset response. No email, token, or exception details are logged or returned.

## Database and compatibility

No schema or migration change. The existing `password_reset_tokens.created_at` index path is used; the query is scoped by `user_id` and time window.

## Validation

- Focused password-reset service tests cover generic responses, token hashing, SMTP failure, and persistent rate limiting.
- Full validation and role reviews are recorded on the pull request.

## Rollback

Revert the implementation commit; existing token issuance resumes without data migration.

## Follow-up

Add IP/device-level throttling if abuse telemetry shows distributed account-targeting beyond the per-account limit.
