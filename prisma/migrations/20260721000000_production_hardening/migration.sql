-- Invalidate existing JWT sessions after a password reset by versioning them.
ALTER TABLE `users`
  ADD COLUMN `session_version` INTEGER NOT NULL DEFAULT 1;

-- Preserve duplicate delivery history before enforcing scheduler idempotency.
CREATE TABLE `notification_log_duplicates_archive` LIKE `notification_logs`;

INSERT INTO `notification_log_duplicates_archive`
SELECT duplicate_log.*
FROM `notification_logs` AS duplicate_log
INNER JOIN `notification_logs` AS retained_log
  ON duplicate_log.`user_id` = retained_log.`user_id`
  AND duplicate_log.`month` = retained_log.`month`
  AND duplicate_log.`type` = retained_log.`type`
  AND duplicate_log.`id` > retained_log.`id`;

DELETE duplicate_log
FROM `notification_logs` AS duplicate_log
INNER JOIN `notification_logs` AS retained_log
  ON duplicate_log.`user_id` = retained_log.`user_id`
  AND duplicate_log.`month` = retained_log.`month`
  AND duplicate_log.`type` = retained_log.`type`
  AND duplicate_log.`id` > retained_log.`id`;

CREATE UNIQUE INDEX `notification_logs_user_id_month_type_key`
  ON `notification_logs`(`user_id`, `month`, `type`);

-- A lease makes abandoned scheduler claims recoverable after process death.
ALTER TABLE `notification_logs`
  ADD COLUMN `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `claimed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `attempt_count` INTEGER NOT NULL DEFAULT 1,
  MODIFY COLUMN `sent_at` DATETIME(3) NULL DEFAULT NULL;

UPDATE `notification_logs`
SET `status` = 'SENT'
WHERE `sent_at` IS NOT NULL;

-- Recurring rules now retain their source account and a complete yearly date.
ALTER TABLE `recurring_transactions`
  ADD COLUMN `month_of_year` INTEGER NULL,
  ADD COLUMN `account_id` BIGINT NULL;

CREATE UNIQUE INDEX `financial_accounts_id_user_id_key`
  ON `financial_accounts`(`id`, `user_id`);

CREATE INDEX `recurring_transactions_account_id_user_id_idx`
  ON `recurring_transactions`(`account_id`, `user_id`);

ALTER TABLE `recurring_transactions`
  ADD CONSTRAINT `recurring_transactions_account_id_user_id_fkey`
  FOREIGN KEY (`account_id`, `user_id`) REFERENCES `financial_accounts`(`id`, `user_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- The unique occurrence is the concurrency-safe idempotency claim.
CREATE TABLE `recurring_occurrences` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `recurring_transaction_id` BIGINT NOT NULL,
  `scheduled_date` DATE NOT NULL,
  `transaction_id` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `recurring_occurrences_transaction_id_key`(`transaction_id`),
  UNIQUE INDEX `recurring_occurrence_schedule_key`(`recurring_transaction_id`, `scheduled_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `recurring_occurrences`
  ADD CONSTRAINT `recurring_occurrences_recurring_transaction_id_fkey`
  FOREIGN KEY (`recurring_transaction_id`) REFERENCES `recurring_transactions`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `recurring_occurrences`
  ADD CONSTRAINT `recurring_occurrences_transaction_id_fkey`
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
