# Financial integrity checks

- Name the persisted source of truth and every derived value.
- Keep encryption and authenticated user ownership checks intact.
- Define accepted sign, scale, maximum value, and rounding behavior.
- Avoid persisted binary floating-point values.
- Make multi-record money writes atomic and balanced.
- Define a stable idempotency boundary for retries and concurrent requests.
- Check zero, negative, maximum expected, duplicate, concurrent, and partial-failure cases.
- Check month end, leap year, timezone, recurrence, archive, and history when relevant.
- Ensure DTOs hide internal keys and encrypted or decrypted sensitive values.
- Document recovery for an interrupted deployment or write.
