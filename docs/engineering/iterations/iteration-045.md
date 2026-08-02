# Iteration 045 — Truthful investment availability and retry UX

## Problem

Failed investment-history requests were rendered as zero totals and “No records yet,” making unavailable financial data indistinguishable from a verified empty portfolio.

## Scope and acceptance criteria

- Model loading, ready, and error states explicitly.
- Require both history responses to be successful and array-shaped before atomically committing them.
- Never render partial totals as a complete portfolio.
- Show an accessible, non-private unavailable message and retry action on HTTP, network, or malformed-response failure.
- Keep genuine empty history messaging only after verified successful responses.
- Preserve API, calculations, authentication, authorization, encryption, and persistence.

## Accessibility and failure design

Loading uses `role=status`. Failure uses a visible `role=alert` heading, explanation, and keyboard-focusable 44px retry button. The error does not expose server messages or caught values. A failed retry remains error; a successful retry restores the complete view.

## Tests

A pure parser verifies atomic response validation. A colocated markup contract verifies state semantics, error copy, and retry wiring. Browser keyboard/screen-reader/responsive checks remain release gates when no configured runtime is available.
