# Iteration quality score

| Category | Weight |
| --- | ---: |
| Acceptance criteria | 20 |
| Automated test confidence | 15 |
| Financial correctness | 15 |
| Security and privacy | 15 |
| UX and accessibility | 15 |
| Maintainability | 10 |
| Performance | 5 |
| Documentation and operations | 5 |

Apply caps:

- Confirmed critical security issue: 30.
- Introduced failing test: 50.
- Unverified financial invariant: 60.
- Missing required accessibility behavior: 75.

Below 85 requires repair. At least 95 requires direct, strong evidence in every material category.
