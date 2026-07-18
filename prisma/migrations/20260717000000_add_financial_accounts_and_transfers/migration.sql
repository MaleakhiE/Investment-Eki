-- Add first-class user-owned financial accounts. Migrated accounts use a
-- NULL opening balance because application-key ciphertext cannot be safely
-- generated inside a database migration; the service interprets NULL as zero.
CREATE TABLE `financial_accounts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('BANK', 'WALLET', 'CASH') NOT NULL DEFAULT 'BANK',
  `opening_balance` VARCHAR(255) NULL,
  `color` VARCHAR(20) NULL,
  `is_archived` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `financial_accounts_user_id_name_key` (`user_id`, `name`),
  INDEX `financial_accounts_user_id_is_archived_idx` (`user_id`, `is_archived`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `transactions`
  MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
  ADD COLUMN `account_id` BIGINT NULL,
  ADD COLUMN `destination_account_id` BIGINT NULL;

-- Prisma maps both transaction tables to the shared TransactionType enum.
ALTER TABLE `recurring_transactions`
  MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL;

-- Normalize existing labels into one account per user. Empty labels become a
-- Cash wallet so all historical transactions participate in account balances.
INSERT INTO `financial_accounts` (`user_id`, `name`, `type`, `opening_balance`, `color`, `is_archived`)
SELECT
  `user_id`,
  COALESCE(NULLIF(TRIM(`account`), ''), 'Cash') AS `name`,
  CASE
    WHEN LOWER(COALESCE(NULLIF(TRIM(`account`), ''), 'Cash')) = 'cash' THEN 'CASH'
    WHEN LOWER(COALESCE(NULLIF(TRIM(`account`), ''), 'Cash')) IN ('gopay', 'ovo', 'dana') THEN 'WALLET'
    ELSE 'BANK'
  END AS `type`,
  NULL,
  NULL,
  false
FROM `transactions`
GROUP BY `user_id`, COALESCE(NULLIF(TRIM(`account`), ''), 'Cash');

UPDATE `transactions` AS `transaction`
INNER JOIN `financial_accounts` AS `financial_account`
  ON `financial_account`.`user_id` = `transaction`.`user_id`
  AND `financial_account`.`name` = COALESCE(NULLIF(TRIM(`transaction`.`account`), ''), 'Cash')
SET `transaction`.`account_id` = `financial_account`.`id`;

CREATE INDEX `transactions_account_id_type_idx` ON `transactions` (`account_id`, `type`);
CREATE INDEX `transactions_destination_account_id_type_idx` ON `transactions` (`destination_account_id`, `type`);

ALTER TABLE `financial_accounts`
  ADD CONSTRAINT `financial_accounts_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_account_id_fkey`
  FOREIGN KEY (`account_id`) REFERENCES `financial_accounts` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `transactions_destination_account_id_fkey`
  FOREIGN KEY (`destination_account_id`) REFERENCES `financial_accounts` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
