# Bounded market feature opportunities for Investment-Eki
*Generated: 2026-08-10 | Market: Indonesian personal finance and retail investment | Decision horizon: next 3-6 iterations | Confidence: medium-high*

## Decision

Prioritize four extensions of capabilities already present in Investment-Eki: duplicate-aware transaction import, investment reconciliation with net-cost provenance, recurring contribution readiness, and evidence-backed descriptive insights. Do not add trade execution, bank credential collection, automated product selection, or a generic AI adviser in this horizon.

This is a deliberately bounded follow-up to the broader [2026-08-09 market-needs research](./2026-08-09-investment-eki-market-needs.md). It evaluates the current repository, its merged history, its issue tracker, and official market sources rather than proposing a new product category.

## Repository baseline

- Investment-Eki already has user-scoped financial accounts, transactions, transfers, encrypted amounts, receipt images, and exact retry idempotency; its schema does not contain an import batch, source fingerprint, or duplicate-review state ([schema](../../../prisma/schema.prisma#L103-L150)). The repository backlog independently records duplicate transaction review as unfinished after idempotency ([backlog](../opportunity-backlog.md#L30-L34)).
- Investment snapshots already record month, invested amount, current value, platform, product, units, and NAV per unit, but do not persist valuation source, valuation time, fees, or a reconciliation status ([schema](../../../prisma/schema.prisma#L181-L210)). Iteration 061 added visible manual/live-source boundaries without adding broker integration or new calculations ([iteration 061](../iterations/iteration-061.md#L26-L36)).
- Goals, recurring transactions, notification preferences, and delivery logs already exist; notification policy remains an explicit backlog decision ([schema](../../../prisma/schema.prisma#L212-L260), [backlog](../opportunity-backlog.md#L29-L31)).
- The recommendation service still derives a risk profile and prescriptive gold/mutual-fund allocation from cash flow and recent performance, including a fixed 40/60 starting allocation and performance-following adjustments ([recommendation service](../../../src/services/recommendation.service.ts#L158-L244)). The merged UI copy now frames outputs as descriptive scenarios, so the remaining risk is the calculation/API contract rather than merely wording ([iteration 061](../iterations/iteration-061.md#L46-L56)).
- GitHub currently has no repository issues, while merged pull requests show sustained delivery in transaction integrity, goals, investments, accessibility, privacy, and dashboard UX; therefore the opportunities below are grounded in code/backlog gaps rather than issue demand ([repository pull requests](https://github.com/MaleakhiE/Investment-Eki/pulls?q=is%3Apr+is%3Amerged), [repository issues](https://github.com/MaleakhiE/Investment-Eki/issues)).

## Ranked opportunities

### 1. Duplicate-aware statement import and review

**Affected users.** People who spend across banks, wallets, cash, and QRIS and currently have to re-enter activity manually.

**User problem and market evidence.** QRIS reached 57 million users and 39.3 million merchants in the first half of 2025, with 93.16% of merchants classified as UMKM, indicating a large digital-payment surface that a manual ledger must accommodate ([Bank Indonesia](https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_2717025.aspx)). Jenius documents automatic categorization only for money entering its account and transactions using its Rupiah active balance, m-Card, e-Card, and x-Card ([Jenius Moneytory](https://www.jenius.com/app/histori/moneytory)). That documented product boundary leaves a credible multi-institution reconciliation use case; it is not evidence that Jenius lacks every external-import feature.

**Outcome.** A user can import one supported CSV template, review suspected duplicates, correct categories/accounts, and commit only confirmed rows. Import failure never changes balances, and repeated upload of the same file does not create duplicates.

**Smallest implementation.** Support one documented canonical CSV template first. Parse and validate server-side, calculate a user-scoped fingerprint from normalized date/type/amount/description/account, stage results in memory for preview, and submit accepted rows through the existing transaction service and idempotency boundary. Add persistent import batches only if files must survive between sessions.

**Effort.** Medium: one import route, one preview/review UI, reuse of transaction validation and idempotency, and focused tests. No new dependency is needed for a bounded RFC 4180 subset only if the accepted template explicitly disallows multiline fields; otherwise use an already-installed parser or add a reviewed parser rather than writing a fragile general CSV implementation.

**Risks and dependencies.** Imported statements are sensitive financial data. Reject oversized files, formulas on re-export, unsupported encodings, malformed dates/amounts, and cross-user account IDs; do not retain raw uploads by default. Bank credential scraping or direct aggregation is out of scope: OJK defines gathering, filtering, or comparing financial-product/service information as regulated PAJK activity with governance and risk-management obligations ([OJK POJK 4/2025 release](https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/OJK-Terbitkan-Peraturan-Penyelenggara-Agregasi-Jasa-Keuangan.aspx)).

**Validation metric.** In a usability test set of supported statements: at least 95% of valid rows reach preview, 100% of exact repeated-file rows are flagged before commit, zero rejected rows persist, and a user can reconcile a 100-row statement in under five minutes. Validate authorization, malformed/oversized files, duplicate clusters, transfer pairs, retry behavior, and formula-safe export.

### 2. Investment reconciliation with valuation and fee provenance

**Affected users.** Gold and mutual-fund investors entering monthly snapshots from more than one provider.

**User problem and market evidence.** KSEI's AKSes facility lets registered investors monitor consolidated securities/fund balances and mutations across brokers, custodians, investment managers, and RDN banks; KSEI explicitly positions it for comparing provider statements with central records ([KSEI AKSes guide](https://web.ksei.co.id/files/Panduan_Pengguna_Web_AKSes_-_Portofolioku.pdf), [KSEI AKSes facility](https://web.ksei.co.id/services/akses-facility?setLocale=id-ID)). Official provider pages show why gross gain alone is incomplete: Pluang publishes gold transaction and maintenance charges ([Pluang gold fees](https://pluang.com/faq/gold/gold-product/biaya-dalam-transaksi-emas-di-pluang)), while Ajaib publishes transaction taxes and fees for securities ([Ajaib fees](https://ajaib.co.id/biaya)). Fee values change, so Investment-Eki should record user-observed costs and source dates rather than hard-code provider tariffs.

**Competitor gap.** KSEI supplies an authoritative consolidated verification surface for KSEI-held assets, and execution platforms publish their own product/fee surfaces. The bounded opening is a user-owned ledger that records whether an Investment-Eki snapshot agrees with a dated external statement; this is a cross-source workflow, not a claim that competitors cannot calculate returns.

**Outcome.** Every snapshot can distinguish gross value, user-entered fees, net gain/loss, valuation date, source label, and reconciliation state (`unverified`, `matched`, or `difference noted`). Historical records retain the assumptions used at the time.

**Smallest implementation.** Extend the existing snapshot form and encrypted persistence with optional `fees`, `valued_at`, `source_label`, and `reconciliation_note`; derive net gain server-side as `current value - invested amount - fees`. Use a plain source label or official URL—do not upload statements in the first slice. Keep existing snapshots valid as `unverified`.

**Effort.** Medium: additive migration, shared financial validation, service/API/UI changes, export fields, and backward-compatibility tests.

**Risks and dependencies.** Source URLs and notes can carry personal or malicious content; validate protocols, bound text, output-encode, and never fetch arbitrary user URLs server-side. Do not describe a manual match as KSEI verification or custody proof. Legal/product review is required before ingesting authenticated KSEI/provider data; KSEI's privacy policy states that AKSes portfolio information is tied to SID and includes transaction/fund data from KSEI systems ([KSEI privacy policy](https://akses.ksei.co.id/privacy)).

**Validation metric.** At least 80% of active snapshot users add a valuation date/source after the prompt is introduced; 100% of net-return calculations pass fee/zero/boundary tests; existing snapshots render unchanged as unverified; and export/import round-trips preserve provenance exactly.

### 3. Recurring contribution intent with cash-readiness checks

**Affected users.** Goal-oriented users who invest manually but want a monthly routine without delegating trade execution.

**User problem and market evidence.** Bibit documents goal portfolios that lead directly to “Investasi Sekarang” or activation of SIP, and its recurring purchase flow is tied to executing mutual-fund purchases ([Bibit goal setting](https://faq.bibit.id/id/article/cara-tambah-portofolio-berdasarkan-tujuan-goal-setting-mrnwy6/)). Investment-Eki already has goals, recurring schedules, account balances, and notifications, so it can serve users who want planning and readiness across providers without competing on execution.

**Competitor gap.** The opportunity is specifically a broker-agnostic reminder and affordability check. It does not assert that execution platforms lack reminders; it separates planning intent from custody and purchase.

**Outcome.** A user links a planned monthly contribution to a goal and source account, sees whether the tracked balance covers it, and receives an opt-in reminder. The system never places an order, moves money, or promises a return.

**Smallest implementation.** Add a non-materializing recurring intent type or a goal contribution schedule that reuses existing cadence validation and notification delivery. Calculate only `tracked available balance - planned contribution`; show `ready`, `shortfall`, or `balance unavailable`. Do not reuse the transaction scheduler if doing so can create an expense automatically.

**Effort.** Small-medium if modeled as goal metadata plus the existing notification path; medium if recurring-domain separation is required to guarantee that no transaction materializes.

**Risks and dependencies.** Notification timing and timezone semantics must be decided first because the backlog already marks them unresolved. Consent and opt-out must be explicit. A readiness indicator is based only on tracked data and must not be presented as a suitability assessment, product recommendation, or guarantee.

**Validation metric.** At least 50% of users who create an intent complete one manual contribution check-in within two cycles; duplicate reminders remain zero; opt-outs suppress delivery; stale/unavailable balances never display `ready`; and month/year/timezone boundary tests pass.

### 4. Evidence-backed descriptive investment insights

**Affected users.** Beginners reviewing cash flow and gold/mutual-fund history who may read deterministic allocation output as individualized advice.

**User problem and market evidence.** OJK and BPS measured 2025 financial literacy at 66.46% and inclusion at 80.51%, leaving a 14.05 percentage-point gap between measured access and literacy ([OJK/BPS SNLIK 2025](https://institute.ojk.go.id/iru/BE/uploads/event/files/file_a41d74e8-b72c-4ebb-bc48-1b822ec2b12b-07052025145313.pdf)). Competitors such as Bareksa explicitly market real-time robo product recommendations and rebalancing ([Bareksa official product page](https://www.bareksa.com/)); Investment-Eki does not need to imitate that regulated, execution-adjacent proposition.

**Competitor gap.** A neutral tracker can explain observed facts—data coverage, cash-flow variability, portfolio concentration, fee treatment, and stale inputs—without selecting products or prescribing allocation. This is a positioning choice, not proof that competitors provide no education.

**Outcome.** The API returns descriptive observations and assumptions, not a risk-profile label, `should_invest`, investable amount, or target gold/mutual-fund percentages. Users can inspect which months and snapshots support each observation and when data is insufficient.

**Smallest implementation.** Preserve existing analytics functions where they report historical facts; remove the allocation generator from the reachable API/UI contract, replace it with fixed-taxonomy observations, and return an explicit unavailable state for insufficient data. Link explanations to OJK educational material rather than generating product advice. No LLM is required.

**Effort.** Medium because the API contract and tests change, even though the implementation becomes smaller. No schema or dependency change is required.

**Risks and dependencies.** Product approval is needed for the breaking contract. Copy alone is insufficient while the service still calculates personalized targets. Avoid inferring emergency-fund ownership from positive cash flow, avoid performance-chasing language, and do not label a user conservative/aggressive without a reviewed suitability process. This report does not provide individualized financial advice.

**Validation metric.** Zero reachable fields contain target allocations, investable amounts, imperative product actions, or inferred risk profiles; 100% of observations expose their input period and insufficiency state; comprehension testing shows at least 80% of participants identify the output as historical education rather than a recommendation.

## Recommended sequence

1. **Descriptive insights contract** — removes the clearest advice/confidence risk without a migration.
2. **Duplicate-aware import preview** — validates multi-institution demand using one template before persistent import infrastructure.
3. **Investment fee/provenance reconciliation** — additive data model after the snapshot contract is settled.
4. **Recurring contribution readiness** — only after notification timing, timezone, and non-materialization semantics are explicit.

## Explicitly rejected for this horizon

- **Direct bank/wallet aggregation:** POJK 4/2025 creates a regulated governance and risk-management boundary for PAJK activities; pursue only with qualified Indonesian counsel and an appropriately licensed partner ([OJK](https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/OJK-Terbitkan-Peraturan-Penyelenggara-Agregasi-Jasa-Keuangan.aspx)).
- **Brokerage, custody, or automated trade execution:** existing platforms already provide broad execution surfaces, while Investment-Eki has no custody, KYC, order, or settlement domain ([Bareksa](https://www.bareksa.com/), [current schema](../../../prisma/schema.prisma)).
- **More asset classes:** the current model intentionally supports gold and mutual funds; reconciliation quality, fee transparency, and safe insight semantics are higher-value gaps than adding another enum ([current schema](../../../prisma/schema.prisma#L245-L248)).
- **Generic AI adviser:** the bounded insight opportunity requires deterministic explanations and unavailable states, not a model that creates personalized financial actions.

## Methodology and evidence limits

Repository evidence reviewed: current Prisma schema and services, engineering backlog and iteration documents, recent Git history, all GitHub issues, and merged pull requests through 2026-08-10. External evidence was restricted to official OJK, Bank Indonesia, KSEI, and official competitor product/help/fee pages. Four sub-questions were tested: payment-capture friction, investment verification/fee transparency, recurring goal behavior, and the literacy-to-action boundary.

Official product pages show documented capabilities, not exhaustive proof that an unmentioned feature is absent. Accordingly, every “competitor gap” above is framed as a bounded positioning opportunity or documented ecosystem boundary. Market figures and fee pages are dated snapshots and must be refreshed before implementation or public claims. No willingness-to-pay evidence was found in the permitted primary-source set, so this report makes no revenue forecast.
