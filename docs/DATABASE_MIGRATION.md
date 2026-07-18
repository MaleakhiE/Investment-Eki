# Database migration runbook

The migration chain now starts with `20260710000000_baseline`, which creates the original application tables before later migrations alter them. This allows Prisma's shadow database and a fresh database to replay the complete history.

## Existing `Test-Eki` database

Back up the database before changing migration state. The existing database already contains the application tables, so do not execute the baseline SQL against it. Mark the baseline as applied:

```bash
node scripts/prisma-with-url.js migrate resolve --applied 20260710000000_baseline
```

The following three migrations were introduced after the database was originally created outside Prisma Migrate. Mark each one as applied only after confirming its columns/tables already exist. In the current application schema, these correspond to the receipt/account fields, global SMTP/password-reset tables, and user role:

```bash
node scripts/prisma-with-url.js migrate resolve --applied 20260711000000_add_transaction_account_receipt_image
node scripts/prisma-with-url.js migrate resolve --applied 20260712000000_add_global_smtp_and_password_reset
node scripts/prisma-with-url.js migrate resolve --applied 20260712010000_add_user_role
```

Then apply the new financial-account migration:

```bash
node scripts/prisma-with-url.js migrate deploy
```

Use `migrate deploy` for shared, staging, and production databases. `migrate dev` is for a disposable development database because it creates a shadow database and may prompt for resets.

## Fresh database

For an empty database, do not resolve anything manually. Apply the complete chain:

```bash
node scripts/prisma-with-url.js migrate deploy
node scripts/prisma-with-url.js db seed
```

## Verification

```bash
node scripts/prisma-with-url.js migrate status
npx prisma validate
```

Expected result: Prisma reports that the database schema is up to date, and schema validation exits successfully.
