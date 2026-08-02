# Iteration 047 — Accessible analytics tabs

## Problem

Analytics views were plain visual buttons without tab semantics, relationships, roving focus, arrow navigation, explicit touch targets, or visible keyboard focus.

## Scope and acceptance

- Add a labelled tablist with stable tab/panel IDs, selected state, controls/label relationships, and roving tab order.
- Support automatic activation with Left/Right wrapping and Home/End navigation; ignore unrelated keys.
- Keep inactive panel relationship targets in the DOM and render tabs only with ready analytics content.
- Add 44px targets, visible focus, and mobile-safe horizontal containment.
- Preserve fetching, calculations, recommendation behavior, content, and API contracts.

## Tests and limitations

A pure navigation helper covers every supported key boundary. A source contract covers ARIA wiring. Authenticated browser keyboard, screen-reader, and 320px overflow checks remain release gates.
