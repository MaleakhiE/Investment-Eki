# FinTrack Mobile-First Interface Redesign

## Objective

Redesign every FinTrack interface as one coherent mobile-first finance product while preserving existing business logic, API contracts, authentication, authorization, and database behavior. The visual direction is "FinTrack evolved": retain the green brand identity while adopting the calm hierarchy, soft pastel surfaces, rounded geometry, and app-oriented interaction patterns approved from the Cash Advance Finance App reference.

## Scope

The redesign covers:

- Login, registration, forgot-password, and reset-password screens.
- Dashboard, cash flow, investments, analytics, budgets, and goals.
- Settings, notifications, and account presentation.
- Superadmin SMTP configuration and testing.
- Shared navigation, responsive layout, forms, dialogs, loading states, errors, and empty states.
- Mobile, tablet, and desktop layouts.

No business features, API behavior, calculations, persistence rules, or authorization policies will be changed as part of the visual migration.

## Product Language

All user-facing copy will use English. Navigation labels, headings, form labels, validation messages, empty states, and action text will be standardized during each page migration. Internal identifiers and API fields remain unchanged.

## Visual Direction

### Brand

FinTrack retains green as its primary identity. A deep evergreen provides strong financial anchors and primary contrast. Mint supports positive and interactive states. Pale yellow and muted lavender provide limited category and insight accents. Warm white and mist-green backgrounds keep the product calm and readable.

### Typography

Use a system-first sans-serif stack with large, compact financial figures and clear supporting labels. Typography follows a small tokenized scale rather than arbitrary per-page sizes. Financial amounts use tabular numerals where supported.

### Shape and Elevation

Cards use generous rounded corners, restrained borders, and minimal shadow. Large cards establish page hierarchy; compact grouped rows handle settings and repeated records. Pills are reserved for filters, status, and short actions.

### Iconography

Use custom line icons with rounded geometry and consistent stroke width. Icons communicate navigation, categories, and actions; they are not decorative. Emoji and inconsistent generic pictograms are prohibited.

### Motion

Motion is short and functional: bottom-sheet transitions, press feedback, restrained card entry, and progress changes. The interface respects reduced-motion preferences.

## Information Architecture

### Primary Navigation

Mobile navigation contains four persistent destinations:

1. Home
2. Activity
3. Invest
4. More

More exposes budgets, goals, analytics, settings, sign-out, and superadmin tools when authorized. Desktop presents the same hierarchy in compact left navigation. Tablet retains touch-oriented navigation until the desktop breakpoint.

### Home

The page order is:

1. Date and financial overview heading.
2. Net-worth hero card with monthly movement.
3. Income and spending summary cards.
4. Three quick actions: add transaction, set budget, and add goal.
5. Recent activity.
6. Budget progress.
7. Goal progress and relevant insights.

Primary financial information remains above the fold on common mobile heights.

### Activity

Cash flow uses compact filter chips, monthly summary, date-grouped transaction rows, and one prominent add-transaction action. Transaction entry uses a mobile bottom sheet and a desktop dialog or side panel using the same fields and validation. OCR receipt review remains explicit and user-confirmed.

### Invest

Investment screens lead with total portfolio value and movement, followed by allocation, individual holdings, performance history, and add/update actions. Charts include accessible text summaries and retain usable dimensions on narrow screens.

### Budgets and Goals

Budgets and goals use progress-focused cards, meaningful status color, concise remaining values, and clear creation/edit actions. Repeated data becomes single-column mobile cards and responsive desktop grids.

### Analytics

Analytics prioritizes one insight per section. Charts use compact legends, accessible summaries, responsive tooltips, and fixed minimum heights. Dense desktop arrangements collapse into ordered mobile sections without hiding primary information.

### Settings and Superadmin

Settings uses grouped rows rather than oversized independent cards. Account identity appears first, followed by preferences and notifications. Superadmin tools appear in a dedicated administration group only for authorized accounts. SMTP configuration retains password masking, role-protected APIs, origin checks, validation, and connection testing.

### Authentication

Authentication screens use a focused mobile card with concise supporting copy, persistent labels, clear password requirements, accessible errors, and a single primary action. Desktop adds whitespace and brand context without changing the form hierarchy.

## Responsive Rules

### Mobile: 320-767 px

- Single-column content.
- Four-tab bottom navigation with safe-area support.
- Compact sticky mobile header when useful.
- Bottom-sheet forms for short creation and editing flows.
- Full-width primary actions.
- Horizontally scrollable filter chips when necessary.
- Minimum 44 px interactive targets.

### Tablet: 768-1023 px

- Wide single-column or balanced two-column cards.
- Touch-oriented navigation retained.
- Dialog width and chart density increase without changing information order.

### Desktop: 1024 px and above

- Compact persistent left navigation.
- Responsive multi-column content grid.
- Same components, tokens, terminology, and hierarchy as mobile.
- Maximum content widths prevent uncontrolled stretching.

Tables that cannot remain readable on mobile must become grouped rows rather than horizontal overflow. Secondary data collapses before primary financial data.

## Component Architecture

### App Shell

One `AppShell` owns the desktop navigation, mobile header, bottom navigation, safe-area padding, content width, and active-route behavior. Navigation configuration and page metadata are centralized.

### Shared Primitives

Create focused reusable components for:

- Page headers and section headers.
- Buttons and icon buttons.
- Form fields, selects, toggles, and validation feedback.
- Financial metric cards and section cards.
- Transaction and grouped settings rows.
- Status badges and filter chips.
- Progress bars and goal cards.
- Tabs, dialogs, and bottom sheets.
- Loading skeletons, empty states, and section-level errors.
- Custom line icons.

Components receive data and callbacks through explicit typed interfaces. They do not fetch application data directly.

### Design Tokens

Global CSS defines semantic tokens for color, typography, spacing, radii, shadows, motion, focus, safe areas, and responsive containers. New page code uses semantic component variants instead of repeated arbitrary color values. The existing compatibility bridge is removed only after all pages are migrated.

## Data and State Behavior

Existing page-level data loading and API calls remain intact. Page containers translate current response data into presentation-component props. Forms retain current validation and submission behavior. Optimistic interactions are used only where the current backend semantics safely support them.

Loading appears at the affected structural level. Errors remain close to the failed operation and provide a retry path when possible. Empty states explain what is absent and provide the next relevant action.

## Security and Authorization

- Server APIs remain the source of truth for authentication and roles.
- Client-side navigation visibility is convenience only.
- SMTP secrets remain encrypted and never return to the browser.
- Existing origin checks, rate controls, validation, and credential masking remain intact.
- The redesign does not introduce HTML injection or render unsanitized external content.

## Accessibility

- Semantic interactive elements and persistent labels.
- Visible keyboard focus.
- Sufficient text and control contrast.
- Keyboard-operable dialogs and bottom sheets with focus management.
- Reduced-motion support.
- Accessible names for icons and icon-only controls.
- Text summaries for financial charts.
- Status communication that does not rely on color alone.

## Delivery Strategy

Implementation is incremental and keeps the application buildable:

1. Establish tokens, icons, primitives, and the responsive app shell.
2. Migrate authentication and the global navigation shell.
3. Migrate Home and Activity.
4. Migrate Invest and Analytics.
5. Migrate Budgets and Goals.
6. Migrate Settings and Superadmin.
7. Remove obsolete styling and complete cross-page polish.

Each phase includes responsive verification before proceeding.

## Verification

The completed redesign must pass:

- TypeScript type checking.
- ESLint with no new errors.
- Full Jest suite.
- Production `npm run build`.
- Browser checks at representative 320 px, 390 px, 768 px, 1024 px, and wide desktop viewports.
- Authentication, transaction entry, investment viewing, budget management, goal management, settings, password reset, and superadmin SMTP critical flows.
- Keyboard navigation, focus visibility, reduced motion, empty states, loading states, and failure states.

## Acceptance Criteria

- Every interface uses the approved FinTrack-evolved design system.
- All visible product copy is English.
- The application is fully usable without horizontal page overflow at 320 px.
- Primary navigation and actions remain reachable on mobile safe-area devices.
- Custom line icons are visually consistent and purposeful.
- Desktop is an expanded form of the mobile system rather than a separate design.
- Existing functional, security, and authorization behavior remains intact.
- The full verification suite passes before completion.
