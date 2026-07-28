# Iteration 009 result: bcrypt UTF-8 byte boundary

Date: 2026-07-28
Branch: `feat/loop-engineering-9-bcrypt-byte-boundary`
Baseline: `5d94054`

## Change

- Added one shared browser/Node-native bcrypt limit: at most 72 UTF-8 bytes,
  inclusive.
- Preserved the existing user-password minimum of eight characters and
  superadmin-bootstrap minimum of twelve characters.
- Registration already validated at route and service boundaries; both now
  reject over-limit passwords before email encryption/lookup, hashing, user
  creation, or public-ID backfill.
- Added reset-route validation while retaining service validation, so reset
  tokens are not looked up, consumed, or used to update a password/session
  version after invalid input.
- Applied the same rule to superadmin seed configuration before encryption,
  bcrypt, or upsert.
- Reused the shared validator in registration and reset pages. No HTML
  `maxLength` was added because it counts UTF-16 units rather than UTF-8 bytes.
- Left credential login unchanged so legacy over-limit input still reaches
  bcrypt comparison.

No password is normalized, sliced, truncated, logged, echoed, or rewritten. No
schema, migration, dependency, lock, environment variable name or required
variable set, success response, financial behavior, or bcrypt cost changed.

## Documentation evidence

Context7 resolved the installed package to the official high-reputation
`/kelektiv/node.bcrypt.js` documentation. Its security guidance states that
only the first 72 input bytes are used and that the boundary is bytes rather
than characters.

Local bcrypt 6 proof before editing:

- hash of 72 ASCII `a` bytes plus `X` accepted the same prefix plus `Y`;
- 18 emoji encoded to exactly 72 bytes, and different suffixes after that
  prefix also compared successfully.

Official source:
<https://github.com/kelektiv/node.bcrypt.js/blob/master/README.md#security-issues-and-concerns>

## TDD evidence

The RED run had 9 failures across 7 suites:

- 73-byte ASCII and multibyte passwords were accepted;
- registration route/service reached registration/lookup behavior;
- reset route/service reached reset-token behavior;
- seed config accepted the ambiguous credential;
- both client pages used only character-minimum checks.

Exactly-72-byte ASCII/multibyte cases and the legacy-login comparison
characterization already passed in RED. The final focused run passes 7 suites
and 30 tests.

Covered behavior includes:

- eight-character minimum unchanged;
- inclusive 72-byte ASCII and Unicode inputs;
- rejection at 73 UTF-8 bytes without truncation;
- registration no-lookup/no-hash/no-create;
- reset no-transaction/no-token/no-hash/no-user-update;
- seed fail-fast with no secret output;
- exact route 400/success envelopes;
- shared client validator wiring and absence from login.

Changed executable boundary statements in validation, seed config, and the
reset route are 12/12 covered (100%). The two client handlers are verified by
static wiring tests because this repository has no DOM test harness; interactive
72/73-byte registration/reset behavior remains a staging smoke.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Focused RED/GREEN | Explicit `jest --runTestsByPath` across validation/auth/reset/seed/client contracts | Pass: 7 suites, 30 tests |
| Changed executable statements | Focused Jest coverage plus Git diff mapping | Pass: 12/12, 100% |
| Seed import smoke | `npx tsx -e` importing `resolveSeedAdminConfig` with 72-byte input | Pass: 72 bytes |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 51 suites, 343 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Production audit | `npm audit --omit=dev --json` | 0 Critical, 2 known High; Next only via transitive sharp |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Diff whitespace | `git diff --check` | Pass |

No database or browser operation was required to prove the server/seed
boundary. A production seed was deliberately not run because it mutates the
superadmin credential and revokes sessions.

## Independent review

- Product approved the exact-boundary UX and unchanged success/navigation/login
  semantics.
- Finance approved isolation from all money, schema, and persistence contracts.
- Security verified every reachable local-account bcrypt hash path, fail-fast
  ordering, plaintext handling, and legacy comparison compatibility.
- QA approved exact ASCII/Unicode boundaries and proportionate static client
  wiring evidence.
- Release approved the code-only rollout and non-mutating seed import smoke.

No introduced Critical, High, Medium, or Low finding remains.

## Limitations

- Existing hashes created from over-72-byte input remain bcrypt-truncated.
  Login must continue accepting the original input until an explicit legacy
  remediation/reset policy exists.
- Registration enumeration, duplicate-create `P2002` parity, credential timing,
  distributed throttling, breach checks, and algorithm migration remain
  separate security/product work.
- Registration/reset client behavior is build- and source-verified but still
  needs an isolated browser smoke for interactive proof.

## Release and rollback

Before any deployment seed, measure `SUPERADMIN_PASSWORD` UTF-8 byte length
without logging the value. If it exceeds 72 bytes, rotate it deliberately
rather than truncating it. Never use production seeding as a smoke test.

Drain old replicas promptly because mixed versions can still accept ambiguous
new passwords. Rollback is application-only and requires no database restore,
but it reopens acceptance of ignored bcrypt suffix bytes. Existing hashes are
unchanged either way.

## Quality score

Score: 93/100. All executable boundary logic is fully covered, full tests/build
and five reviews pass, and the algorithm defect is reproduced and removed for
new hashes. The missing DOM smoke and unresolved legacy credentials keep it
below 95.

## Next recommendation

Strict transaction finite/date validation and recurring scheduler cache/log
privacy are the next confirmed policy-neutral, code-only candidates.
