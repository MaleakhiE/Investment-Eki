# Database migration runbook

This application uses Prisma Migrate with MySQL. Production and shared
environments must use `prisma migrate deploy`; `migrate dev` is limited to
disposable developer databases because it uses a shadow database and can
request destructive resets.

## Required safeguards

- Take or verify a restorable backup before deploying a migration.
- Review every `migration.sql` for destructive DDL, table rewrites, long locks,
  and data backfills. Use expand-and-contract changes for live tables.
- Run the complete migration replay in CI and locally before deployment.
- Deploy one application version at a time. The application must remain
  compatible with both the pre-migration and post-migration schema during a
  rolling deployment.
- Never run `migrate reset`, `migrate dev`, or ad-hoc `DROP` statements against
  production.

## Verify the chain from an empty database

Docker must be running and project dependencies must already be installed.
The verifier publishes MySQL only on loopback, assigns a random host port,
creates a uniquely named container, and removes it on success or failure.

```bash
bash scripts/verify-migrations.sh
```

Optional overrides:

```bash
MYSQL_IMAGE=mysql:8.4 MYSQL_READY_TIMEOUT_SECONDS=120 \
  bash scripts/verify-migrations.sh
```

The command must end with `Migration replay verified successfully`. Any other
exit is a release blocker.

## Existing database bootstrap

The `20260710000000_baseline` migration represents tables that predated Prisma
Migrate. For an existing environment that already has those tables, first
compare the live schema with the baseline and confirm a current backup. Mark
the baseline applied without executing it:

```bash
npx prisma migrate resolve --applied 20260710000000_baseline
```

Do this once per existing environment. Never resolve a migration as applied
unless its exact schema/data effect is already present and independently
verified.

## Deployment procedure

1. Confirm the backup/PITR checkpoint and record its identifier and timestamp.
2. Verify the target and migration state:

   ```bash
   npx prisma migrate status
   npx prisma validate
   ```

3. Apply pending migrations from the immutable release artifact:

   ```bash
   npx prisma migrate deploy
   ```

4. Run `npx prisma migrate status` again; it must report the schema is up to
   date.
5. Deploy the application and verify `/api/health/live` and
   `/api/health/ready` through the load balancer.
6. Watch database error rate, connection saturation, query latency, lock waits,
   and application errors for at least one normal traffic window.

## Failure and rollback

Prisma migrations are forward-only in production. If deployment fails:

1. Stop further application rollout and capture the failing migration output.
2. Do not edit a migration already applied to any shared environment.
3. If the change is additive, fix it in a new migration and redeploy.
4. If data or a destructive schema change must be reversed, enter maintenance
   mode and restore to a new database instance using the backup runbook. Point
   the application at the restored instance only after validation.
5. Record the incident, affected migration, recovery point, and follow-up
   preventive action.

Avoid marking a failed migration resolved until the database state has been
inspected and the recovery choice has been reviewed by the deployment owner.
