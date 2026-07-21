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
    expect(hardening).toContain('recurring_occurrences_recurring_transaction_id_scheduled_date_key');
    expect(hardening).toContain('session_version');
  });
});
