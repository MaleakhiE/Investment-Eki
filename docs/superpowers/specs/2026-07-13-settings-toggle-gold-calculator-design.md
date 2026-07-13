# Settings Toggle and Gold Calculator Visual Polish

## Goal

Improve the clarity and visual quality of settings toggles and the gold calculator while preserving all existing behavior, data flow, and the app's mint mobile-first design language.

## Approved Direction

Use a reusable, accessible switch across settings and calculator controls. Pair it with a warm cream and muted-gold calculator treatment that complements the existing mint interface instead of using bright orange text and translucent amber surfaces.

## Toggle Design

- Use a 44 by 24 pixel pill track with a two-pixel thumb inset.
- Use mint for enabled, a visible blue-gray for disabled, and a white thumb with a restrained shadow.
- Display an explicit `On` or `Off` state label beside the track.
- Preserve `role="switch"`, `aria-checked`, keyboard activation, disabled behavior, and an obvious focus-visible ring.
- Centralize the markup and state-dependent classes in a reusable UI component.
- Apply it to AI recommendations, notification settings, custom alerts, and the gold calculator option.

## Gold Calculator Design

- Use a warm cream panel, muted gold border, and dark brown text for accessible contrast.
- Use a pale-gold live-price strip with a stronger gold price value.
- Keep live/offline source status semantically green or red.
- Replace the native calculator checkbox with the reusable switch.
- Keep input backgrounds white, labels dark, and borders neutral-gold so the fields remain readable.
- Preserve the existing calculator logic, price refresh, calculations, and responsive layout.

## Responsive Behavior

- Keep settings rows compact on desktop while allowing state labels and controls to wrap safely on narrow screens.
- Stack the gold calculator heading and controls when necessary, while retaining the two-column input layout where space permits.
- Maintain touch targets of at least 44 pixels around interactive switch controls.

## Error Handling and Data Flow

No API or persistence behavior changes. Existing loading, disabled, success, and error behavior remains authoritative. A failed settings update continues to use the current page-level feedback.

## Verification

- Add focused component tests for enabled, disabled, accessible, and click behavior of the shared switch.
- Run the full Jest suite, ESLint, TypeScript through the production build, and `git diff --check`.
- Inspect desktop and mobile renderings for toggle clarity, color contrast, alignment, wrapping, and gold calculator consistency.

## Out of Scope

- Changes to settings APIs or notification semantics.
- Changes to gold-price sources or calculation formulas.
- A broader investments-page or settings-page redesign.
