ALTER TABLE `transactions`
  ADD COLUMN `idempotency_key` VARCHAR(128) NULL;

CREATE UNIQUE INDEX `transactions_user_id_idempotency_key_key`
  ON `transactions` (`user_id`, `idempotency_key`);
