# Iteration 046 — Receipt OCR log privacy

## Problem and evidence

The receipt OCR route logged the complete caught value. OCR worker/library failures may contain stack traces, filesystem paths, arbitrary properties, or receipt-derived private context.

## Scope and acceptance criteria

- Classify caught failures into the closed `OCR_TIMEOUT`, `OCR_BUSY`, or `OCR_FAILED` taxonomy.
- Log only the fixed event and `{ code }`; never pass the caught value to a logger.
- Preserve generic 500, retryable timeout 504, and busy 429 responses exactly.
- Prove sentinel error messages are absent from serialized log arguments.
- Preserve authentication, multipart/MIME/signature/size validation, OCR parsing, returned review prefill, and review-first/no-auto-save behavior.

## Exclusions

No OCR service, worker lifecycle, upload, UI, persistence, API envelope, schema, migration, or financial behavior changes.
