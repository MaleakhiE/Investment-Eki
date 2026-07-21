import fs from 'node:fs';
import path from 'node:path';

const migration = (name: string) => fs.readFileSync(path.join(process.cwd(), 'prisma/migrations', name, 'migration.sql'), 'utf8');

describe('Prisma migration replay chain', () => {
  it('creates core tables before incremental migrations alter them', () => {
    const baseline = migration('20260710000000_baseline');
    expect(baseline).toContain('CREATE TABLE `users`');
    expect(baseline).toContain('CREATE TABLE `transactions`');
    expect(baseline).toContain('CREATE TABLE `recurring_transactions`');
  });

  it('updates every column backed by the shared TransactionType enum', () => {
    const accountsMigration = migration('20260717000000_add_financial_accounts_and_transfers');
    expect(accountsMigration).toContain("MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL");
    expect(accountsMigration).toContain("`recurring_transactions`\n  MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL");
  });

  it('enforces idempotent notifications and recurring occurrences', () => {
    const hardening = migration('20260721000000_production_hardening');
    expect(hardening).toContain('notification_logs_user_id_month_type_key');
    expect(hardening).toContain('CREATE TABLE `recurring_occurrences`');
    expect(hardening).toContain('recurring_occurrence_schedule_key');
    expect(hardening).toContain('session_version');
  });

  it('keeps every explicit MySQL identifier within the 64-character limit', () => {
    const migrationsDirectory = path.join(process.cwd(), 'prisma/migrations');
    const migrationFiles = fs.readdirSync(migrationsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(migrationsDirectory, entry.name, 'migration.sql'));

    const oversizedIdentifiers = migrationFiles.flatMap((file) => {
      const sql = fs.readFileSync(file, 'utf8');
      return [...sql.matchAll(/(?:INDEX|CONSTRAINT)\s+`([^`]+)`/g)]
        .map((match) => match[1])
        .filter((identifier) => identifier.length > 64);
    });

    expect(oversizedIdentifiers).toEqual([]);
  });
});
