# Investment-Eki Function, Feature, and Design Research

*Generated: 2026-08-10 | Sources: 12 primary/official pages plus repository evidence | Confidence: High for regulatory and platform facts; medium for product opportunity inference*

## Executive summary

Investment-Eki should stay a privacy-first tracking and education product rather than becoming another trading marketplace. The strongest near-term opportunity is a trustworthy “money context” layer: every balance, investment value, scenario, and recurring plan should show its source, freshness, assumptions, and user control. This responds to Indonesia’s literacy/inclusion gap, the scale of QRIS-led digital transactions, and the regulatory boundary around financial aggregation.

The next bounded implementation should be a read-only “decision context” slice: a shared provenance model for dashboard/analytics/investments, a small recurring-plan readiness panel, and accessible text alternatives for chart data. It should not connect bank credentials, execute trades, or present individualized buy/sell advice.

## Repository evidence

- `src/app/investments/page.tsx` already distinguishes loading, ready, and error states and now exposes gold-source/manual-snapshot provenance.
- `src/services/recommendation.service.ts` and `src/app/analytics/page.tsx` now describe allocation scenarios rather than imperative recommendations; this boundary should remain enforced by tests.
- `src/services/recurring.service.ts` and the dashboard already provide a foundation for recurring cash-flow planning.
- `src/services/export.service.ts` supports account-aware exports, giving the product a privacy and portability advantage.
- `src/components/finance/index.tsx` contains reusable metric, progress, row, and chart surfaces; chart data needs a text-equivalent path before it becomes a primary decision surface.
- Hallmark’s current stamp is `Split Studio`, with a mint soft-utilitarian palette. `.hallmark/log.json` records the prior `Workbench` run, so future redesigns must rotate structure and preserve the existing token/spacing language rather than restyling every page independently.

## 1. Market and regulatory signal

OJK/BPS SNLIK 2024 measured financial literacy at 65.43% versus 75.02% inclusion; sharia literacy was 39.11% versus 12.88% inclusion. The survey also identifies rural users, younger/older age groups, lower education cohorts, and several informal occupations as below-national-rate segments. The product implication is educational context and plain-language explanation before action, not more complex trading features. ([OJK/BPS SNLIK 2024](https://ojk.go.id/en/berita-dan-kegiatan/siaran-pers/Pages/OJK-And-Statistics-Indonesia-Present-National-Survey-On-Financial-Literacy-And-Inclusion-2024-Findings.aspx))

Bank Indonesia reported that by H1 2025 QRIS reached 57 million users, 39.3 million merchants, 93.16% of them UMKM, and 6.05 billion transactions worth Rp579 trillion. This is evidence for low-friction manual/import capture and duplicate/reconciliation tooling, not an assumption that Investment-Eki should obtain bank credentials or a universal QRIS feed. ([Bank Indonesia QRIS Jelajah 2025](https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_2717025.aspx))

POJK 4/2025 makes financial aggregation a governed PAJK activity and requires parties already performing PAJK activities to apply for a licence within the stated transition period. The safe product boundary is therefore read-only, user-supplied tracking and education unless a future partner/licensing decision is made. ([OJK POJK 4/2025](https://ojk.go.id/id/regulasi/Pages/POJK-4-2025-Penyelenggara-Agregasi-Jasa-Keuangan.aspx))

## 2. Competitor gaps worth exploiting

Jenius Moneytory automatically records and categorizes transactions, supports custom periods such as payday-aligned periods, and is limited to Jenius balances/cards. Investment-Eki can differentiate with multi-institution manual import, explicit ownership/export, and reconciliation without being locked to one bank. ([Jenius Moneytory](https://www.jenius.com/en/faq/mengenal-jenius/moneytory))

Bibit’s current Flexible SIP supports configurable product, amount, frequency, payment method, reminders, day-of payment changes, and partial-payment handling. Investment-Eki should borrow the intent/readiness model while remaining non-executing: planned amount, cash-flow coverage, next run, timezone/month-end handling, and explicit “no order will be placed” copy. ([Bibit Flexible SIP](https://faq.bibit.id/id/article/cara-membuat-jadwal-flexible-systematic-investment-plan-flexible-sip-di-aplikasi-bibit-13d2r1q/), [Bibit partial SIP](https://faq.bibit.id/id/article/apa-itu-partial-pada-sip-autodebit-2cnipj/))

Bareksa markets breadth across mutual funds, SBN, stocks, gold, and goal products. A neutral cockpit should not copy that marketplace model; it should explain provider, regulator/custody, price timestamp, and cost-basis provenance across assets. ([Bareksa product listing](https://www.bareksa.com/), [Bareksa Google Play listing](https://play.google.com/store/apps/details?hl=en_US&id=com.bareksa.app))

Ajaib publicly discloses multiple fee components for stock transactions, including broker, levy, tax, and selling-side PPh. A future “true cost” report is more defensible than execution: store fee source/date and show gross versus net scenario values without implying a trading recommendation. ([Ajaib fee explanation](https://ajaib.co.id/pusat-bantuan/saham/apa-ada-biaya-investasi-saham-di-ajaib))

## 3. UX and accessibility implications

WCAG 2.2 recommends the current standard for accessible web content. For financial/data-changing actions, Success Criterion 3.3.4 requires at least a reversible, checked, or confirmed path; W3C’s examples include review/correction before an irreversible financial transaction or data deletion. ([WCAG 2.2](https://www.w3.org/TR/wcag/), [Error Prevention 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html))

For charts, W3C Technique G92 calls for a long text alternative that conveys the same purpose and information, such as a nearby data table or narrative summary. Investment-Eki’s chart surfaces should expose the latest value, date range, and key change in text rather than relying on visual marks alone. ([W3C G92](https://www.w3.org/WAI/WCAG22/Techniques/general/G92))

Hallmark audit of the current shell:

- Strengths: consistent shell ownership, semantic navigation labels, visible focus rules on investment controls, mobile bottom navigation, and `overflow-x: clip` on `html`/`body`.
- Improve next: use one shared provenance/status component across dashboard, analytics, and investments; avoid one-off “source” cards; make freshness/unknown states legible without color; add chart summaries/tables; retain the mint system while rotating macrostructure only when a whole-page redesign is justified.
- Avoid: fake market live-ness, invented metrics, imperative allocation copy, direct credential aggregation, and dashboard cards that collapse unavailable data into zero.

## Prioritized roadmap

| Priority | Bounded slice | Why now | Acceptance evidence |
| --- | --- | --- | --- |
| P0 | Shared decision-context/provenance contract | Repeated trust problem spans three pages; regulatory boundary favors transparent read-only context | Source, observed-at, freshness, assumptions, and unavailable state render consistently; malformed payload never becomes zero |
| P1 | Recurring investment intent + cash-readiness panel | Bibit validates recurring-plan demand; existing recurring service lowers cost | Next run is timezone/month-end safe; partial/insufficient cash is descriptive; no order API is called |
| P1 | Accessible chart summaries and data tables | WCAG G92 directly applies to financial charts | Screen-reader path exposes equivalent values/date range; table caption and headers are present |
| P2 | Multi-institution CSV/e-statement import | QRIS scale and Jenius’ closed ecosystem indicate manual portability gap | Strict parser, duplicate detection, preview/reconcile, export round-trip, no credential storage |
| P2 | Fee/cost-basis provenance report | Competitors publish fee complexity; neutral reporting is differentiated | Versioned source/date, explicit rounding, gross/net separation, no trade instruction |
| Defer | Bank credential aggregation, trade execution, robo advice | POJK/licensing, privacy, custody, and liability expansion | Requires explicit product/legal decision and partner controls |

## Recommended implemented iteration

**Iteration 063 — shared decision context and accessible financial evidence.**

Scope only:

1. Extract a small presentational provenance/status component from the existing investment implementation and reuse it on Analytics/Dashboard.
2. Add a text summary/data-table affordance to one existing chart surface.
3. Add focused tests for source/timestamp/unavailable states, malformed data, and keyboard/screen-reader labels.
4. Update iteration documentation and Hallmark log; do not add external dependencies or database tables.

Non-goals: bank connectors, trade execution, personalized advice, new market-data providers, and a whole-app CSS rewrite.

## Methodology and limitations

Research used Exa semantic search and Firecrawl search/scrape across official OJK, Bank Indonesia, W3C, Jenius, Bibit, Bareksa, and Ajaib pages, plus direct repository inspection. Competitor feature descriptions are current page claims and may change; they are opportunity signals, not endorsements. Market-size estimates were intentionally excluded because no single comparable, primary dataset was found for this product niche.

## Rerun inputs

workflow: `firecrawl-market-research` + `ecc:deep-research`
query: `Indonesian personal finance tracker, read-only investment provenance, recurring planning, accessibility, and regulatory-safe product design`
companies: `Jenius, Bibit, Bareksa, Ajaib`
data_points: `features, regulatory boundaries, UX/accessibility patterns, user segments`
output: `markdown`
