# Backup and restore runbook

Backups are useful only when they are isolated from the primary database,
encrypted, monitored, and proven restorable. This runbook applies to the MySQL
database that stores users, encrypted financial values, SMTP configuration,
and password-reset state.

## Recovery objectives and retention

Set contractual RPO/RTO values with the service owner and database provider.
Until stricter values are approved, use these operational targets:

- RPO: 15 minutes with provider point-in-time recovery (PITR).
- RTO: 4 hours for restoring, validating, and switching the application.
- Retain daily backups for 35 days, monthly backups for 12 months, and the
  pre-migration checkpoint for at least 90 days.

Enable provider-managed automated backups and PITR. Store backup encryption
keys outside the database account, restrict restore/delete permissions to the
operations role, require MFA, and alert on failed backups or retention drift.
Do not copy plaintext dumps to developer laptops or commit them to Git.

## Before a release or migration

1. Confirm the latest automated backup is successful and within the RPO.
2. Create an on-demand provider snapshot when the migration can rewrite or
   remove data.
3. Record the backup ID, UTC timestamp, source instance, schema version,
   retention/expiry, and operator in the change record.
4. Confirm the backup can be restored to a separate instance; never overwrite
   the source as the first recovery action.

## Restore procedure

1. Declare the incident, stop writes or place the application in maintenance
   mode, and record the last known-good UTC timestamp.
2. Provision an isolated MySQL instance with the same major version and
   compatible flags/collation.
3. Restore the selected full backup and replay PITR logs only up to the chosen
   timestamp. Use provider tooling where available.
4. Use a restricted validation account and verify:
   - Prisma migration history has no failed or unexpected entries.
   - Critical table counts and sampled records match the change record.
   - Foreign-key checks pass and encrypted fields can be decrypted using the
     production secret from the secret manager.
   - The application starts and `/api/health/ready` returns HTTP 200.
5. Rotate any temporary credentials, then switch the application connection
   through the provider endpoint or secret manager. Keep the old instance
   read-only until the recovery is accepted.
6. Monitor errors, latency, connections, and key financial workflows. Record
   actual RPO/RTO and obtain service-owner sign-off before deleting anything.

## Portable logical backup fallback

Provider snapshots/PITR are preferred. When a logical export is required, keep
credentials in a protected MySQL option file or secret injection mechanism,
not command-line arguments:

The example below uses `age`; obtain the approved backup recipient from the
secret-management process. The pipeline never writes plaintext SQL or a merely
compressed SQL dump to disk:

```bash
mysqldump --defaults-extra-file=/secure/path/mysql-backup.cnf \
  --single-transaction --routines --triggers --events \
  --set-gtid-purged=OFF fintrack | gzip | \
  age --recipient "$BACKUP_AGE_RECIPIENT" > fintrack.sql.gz.age
```

Restore only into a newly created, isolated database. Keep the age identity in
the approved secret store and stream the decrypted content directly to MySQL:

```bash
age --decrypt --identity /secure/path/backup-identity.txt \
  fintrack.sql.gz.age | gunzip --stdout | \
  mysql --defaults-extra-file=/secure/path/mysql-restore.cnf fintrack_restore
```

Checksum the encrypted artifact before and after transfer. If the chosen tools
create temporary plaintext material, place it on encrypted restricted storage
and securely remove it immediately after the operation.

## Quarterly restore drill

Run a restore drill at least quarterly and after changing providers, MySQL
major versions, backup policy, or encryption/key management:

1. Select a backup without advance cherry-picking.
2. Restore it into an isolated non-production network.
3. Execute the validation steps above plus a read-only user login, dashboard
   load, transaction list, account balance reconciliation, and SMTP
   configuration-presence check. Do not send real email.
4. Measure recovery-point loss and total recovery time against RPO/RTO.
5. Destroy the drill environment through the approved provider workflow and
   retain the drill report, not customer data.

A failed or overdue drill is an operational release risk and must have an owner
and remediation date.
