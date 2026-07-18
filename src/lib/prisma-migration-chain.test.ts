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
});
