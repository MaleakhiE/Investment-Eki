# Investment-Eki market-needs research

*Generated: 2026-08-09 | Market: Indonesia-first personal finance and retail investment | Confidence: medium-high*

## Executive summary

Investment-Eki should not enter the market as another brokerage, robo-advisor, or multi-asset execution marketplace. Indonesian incumbents already own the transaction rails: Bibit automates beginner mutual-fund selection and recurring purchases, Bareksa combines mutual funds, gold, and SBN, Pluang spans multiple asset classes, and bank-native Jenius Moneytory automatically categorizes activity inside its own ecosystem ([Bibit Robo Advisor](https://faq.bibit.id/id/article/bagaimana-cara-kerja-robo-advisor-bibit-aiwmm1/), [Bibit SIP](https://faq.bibit.id/id/article/cara-menjadwalkan-pembelian-reksa-dana-secara-rutin-dengan-fitur-autodebit-sip-di-aplikasi-bibit-18u6nhz/), [Bareksa Emas](https://www.bareksa.com/bareksaemas), [Pluang fees](https://pluang.com/id/biaya), [Jenius Moneytory](https://www.jenius.com/app/histori/moneytory)).

The stronger opening is a privacy-first, broker-agnostic financial control plane: reconcile cash flow, goals, gold, mutual funds, and recurring intent across institutions without custody or trade execution. The evidence supports five needs: translate inclusion into safe action, reduce QRIS-heavy capture friction, serve low-balance and non-Java investors, make provenance and scam defense visible, and support sharia/household planning without stereotyping.

The immediate product decision is to ship trust and clarity before breadth: (1) provenance, fee, timestamp, and source-aware portfolio records; (2) import/receipt workflows with duplicate and correction handling; (3) goal-based recurring-investment readiness rather than automatic trading; and (4) plain-language education with suitability and non-advice guardrails.

## 1. Market demand and the literacy-to-action gap

### Facts

- OJK/BPS SNLIK 2024 measured financial literacy at 65.43% versus financial inclusion at 75.02%; sharia literacy was 39.11% versus sharia inclusion at 12.88% ([OJK SNLIK 2024](https://www.ojk.go.id/id/berita-dan-kegiatan/publikasi/Pages/Survei-Nasional-Literasi-dan-Inklusi-Keuangan-%28SNLIK%29-2024.aspx)).
- OJK/BPS reported the 2025 indices improved to 66.46% literacy and 80.51% inclusion ([OJK/BPS 2025 SNLIK release](https://iru.ojk.go.id/iru/BE/uploads/event/files/file_a41d74e8-b72c-4ebb-bc48-1b822ec2b12b-07052025145313.pdf)).
- OJK's 2025 education program reached 9,936,199 participants and published 340 educational items, showing a large institutional push toward financial capability rather than product distribution alone ([OJK 2025 financial-literacy month](https://www.ojk.go.id/en/berita-dan-kegiatan/siaran-pers/Pages/Expanding-Financial-Education-OJK-Launches-the-2025-Financial-Literacy-Month.aspx)).

### Inference

There is a measurable “access before understanding” gap. A useful product must explain fees, risk, assumptions, and data freshness at the moment a user plans or reviews money. It should not merely display a return percentage or issue an imperative investment recommendation.

### Product implication

Build a “why this number?” layer: source, timestamp, fee treatment, cost basis, confidence/unavailable state, and a plain-language explanation. Add a sharia taxonomy/content mode only after definitions are reviewed; do not imply that a label is a religious ruling.

## 2. Digital cash flow is large, but capture is fragmented

### Facts

Bank Indonesia reported that by mid-2025 QRIS had reached 57 million users, 39.3 million merchants, 93.16% of them UMKM, with 6.05 billion transactions worth Rp579 trillion ([BI QRIS Jelajah 2025](https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_2717025.aspx?Utm_Source=Chatgpt.Com)). BI also describes SNAP as the national open-payment API standard covering security, data, authentication, authorization, and transaction-history categories ([BI SNAP](https://www.bi.go.id/en/layanan/standar/snap/default.aspx)).

### Inference and caveat

QRIS usage creates a strong need for quick capture, but this does not mean a small app can safely read every bank or wallet. Access depends on licensed providers, consent, integration, and security obligations. Treat direct aggregation as a partnership/regulatory track, not a shortcut feature.

### Product implication

Prioritize a fast manual/import path: CSV/e-statement import, receipt/OCR correction, category rules, duplicate detection, transfer matching, and export. Keep malformed or ambiguous data visibly unavailable rather than silently converting it into zero or an empty balance.

## 3. Retail investment is growing; trust and low-balance UX are the wedge

### Facts

- OJK reported 20.36 million capital-market investors at December 2025, up 36.95% year over year; domestic retail participation rose from 38% of stock transactions in 2024 to 50% in 2025 ([OJK December 2025 market update](https://ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/RDKB-Des-2025.aspx)).
- OJK reported 24.74 million investors by Q1 2026 and 26.49 million by April 2026 ([OJK Q1 2026 update](https://iru.ojk.go.id/iru/Website/ArticleList/View/982_March_2026_Board_of_Commissioners_Meeting%3A_Financial_Services_Sector_Stability_Remains_Maintained_Amid_Rising_Global_Uncertainty), [OJK April 2026 update](https://iru.ojk.go.id/iru/Website/ArticleList/View/1008_Capital_Markets_Update_April_2026)).
- KSEI's January 2026 statistics show 21,011,388 individual capital-market investors and 99.75% individual participation; Java represented 68.25% of investors and 83.76% of C-BEST assets ([KSEI January 2026 statistics](https://web.ksei.co.id/files/Statistik_Publik_Januari_2026.pdf)).

### Inference

The market is expanding, but a large investor count is not proof of healthy behavior, retention, or adequate financial capacity. Concentration of assets among older and Java-based cohorts suggests room for plain-language, low-minimum, low-bandwidth, and non-Java workflows.

### Product implication

Offer goal-first onboarding, small-balance-safe dashboards, monthly progress rather than trading excitement, and offline/manual workflows. Measure first successful reconciliation and 90-day retention—not only registrations.

## 4. Competitor reality and positioning gap

| Competitor | What it owns | Gap Investment-Eki can target |
|---|---|---|
| Jenius Moneytory | Automatic cash-flow tracking and categorization inside Jenius balances/cards; it is ecosystem-bound ([official page](https://www.jenius.com/app/histori/moneytory)) | Multi-institution ledger, explicit user-owned import/export, privacy and reconciliation |
| Bibit | Beginner mutual-fund robo profiling, goals, and recurring auto-debit ([Robo Advisor](https://faq.bibit.id/id/article/bagaimana-cara-kerja-robo-advisor-bibit-aiwmm1/), [SIP](https://faq.bibit.id/id/article/cara-menjadwalkan-pembelian-reksa-dana-secara-rutin-dengan-fitur-autodebit-sip-di-aplikasi-bibit-18u6nhz/)) | Broker-agnostic intent planner and cash-readiness view, without executing trades |
| Bareksa | Mutual funds, gold, SBN, robo-advisor, and physical-gold custody/distribution; gold starts at Rp50,000 ([official page](https://www.bareksa.com/bareksaemas)) | Cross-provider cost basis, provenance, historical valuation, and source freshness |
| Pluang | Broad asset coverage and transaction/maintenance monetization ([official fee page](https://pluang.com/id/biaya), [gold FAQ](https://pluang.com/faq/gold/gold-product/biaya-dalam-transaksi-emas-di-pluang)) | Read-only, provider-aware portfolio cockpit with no leverage or custody |
| Ajaib | Execution and fee monetization; its published stock fees are 0.1513% buy and 0.2513% sell, with other market/fund fees disclosed ([official fee page](https://ajaib.co.id/biaya)) | Neutral true-cost and net-return ledger that explains fees without selling products |

### Positioning recommendation

“Your private, source-aware financial control plane across accounts and investments” is more defensible than “another place to buy assets.” Distribution can begin with manual data and exports; no bank credential collection is required for the first wedge.

## 5. Trust, fraud, and regulatory boundaries

### Facts

- OJK reported 5,547 illegal-investment complaints and 354 blocked illegal offerings from January 2025 to January 2026; IASC received 448,442 scam reports involving 756,006 accounts ([OJK 2026 policy release](https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/OJK-Policies-Further-Strengthen-the-Role-of-the-Financial-Services-Sector-in-Supporting-the-Governments-Priority-Programs.aspx)).
- OJK's POJK 4/2025 regulates financial-service aggregation; OJK describes aggregation as a supervised sector requiring governance and risk controls ([OJK aggregation release](https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/OJK-Terbitkan-Peraturan-Penyelenggara-Agregasi-Jasa-Keuangan.aspx)).
- BI SNAP includes consumer/data protection, access management, encryption, authentication, and authorization requirements ([BI SNAP regulation](https://www.bi.go.id/id/publikasi/peraturan/Pages/PADG_231521.aspx)).

### Product implication

Make provenance a feature: provider, regulator, custody, instrument type, source URL, last-updated timestamp, and “not verified” states. Add links to official OJK/IDX/KSEI checks where relevant. Keep the product as tracking/education unless a licensed partner and legal review support aggregation, recommendation, or execution.

## 6. Highest-value opportunities for this repository

### Priority A — Trust and provenance layer

Add source/provider metadata, fee fields, valuation timestamps, cost-basis history, and exportable audit trails to existing investment snapshots and exports. Reframe the existing recommendation output as descriptive scenarios with assumptions and disclaimers; imperative individualized allocation language is a legal/product risk.

### Priority B — Multi-institution capture without credentials

Add CSV/e-statement import and receipt/OCR review with duplicate detection, transfer matching, correction, and an explicit unavailable state. Start with import templates rather than bank scraping or credential storage.

### Priority C — Recurring intent and cash readiness

Use the existing recurring engine to schedule a user’s planned contribution, month-boundary reminder, and cash-readiness check. Do not place trades, promise returns, or imply that a reminder is regulated advice.

### Priority D — Goal-first, low-balance onboarding

Keep the current goals/investments workflow, but optimize the first 10 minutes: emergency fund, first goal, first snapshot, monthly review. Add Bahasa Indonesia/plain-language copy and low-bandwidth tolerance before adding more asset classes.

### Priority E — Sharia and household variants

Treat sharia labels, women-focused education, and shared household goals as bounded variants after taxonomy, consent, role isolation, and content review are ready. Do not stereotype or expose one household member’s financial records to another by default.

## Recommendation

For the next three product iterations, build in this order:

1. Audit/reframe personalized recommendations and add source/assumption/provenance fields.
2. Ship CSV/e-statement import with duplicate/reconciliation safeguards.
3. Add recurring investment intent and cash-readiness reminders without execution.

Do not build brokerage execution, broad bank credential aggregation, crypto/leverage, or a generic AI advisor now. Those areas have stronger incumbents, higher licensing/security exposure, and weaker differentiation for this codebase.

## Risks and counterarguments

- A manual/import-first product may grow more slowly than an automatic aggregator; validate retention before paying for integrations.
- Competitors can copy dashboards; defensibility must come from trustworthy history, reconciliation quality, exports, and explainability.
- A growing investor count does not prove willingness to pay. Test a free core plus paid export/reconciliation/household features rather than assuming subscriptions.
- OJK/BI rules and provider fees change. Every regulated fact, fee, and provider status needs a source date and refresh process.

## Methodology

Searched official OJK, BPS, BI, KSEI, and competitor product/help/fee pages, plus repository implementation evidence. Sub-questions: market demand and literacy; digital payment/capture friction; retail-investor growth and regional segments; competitor positioning and monetization; trust/regulatory boundaries; and product opportunities mapped to current Investment-Eki modules. Market figures are current-source snapshots, not a formal TAM/SAM/SOM estimate.
