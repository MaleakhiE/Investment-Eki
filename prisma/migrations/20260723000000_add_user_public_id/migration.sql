-- Keep the compact BIGINT primary key for internal relations while exposing a
-- non-sequential UUID at the authentication and API boundaries.
ALTER TABLE `users`
  ADD COLUMN `public_id` CHAR(36) NULL;

-- Backfill existing users with UUID v4-compatible values. Avoid MySQL UUID(),
-- which produces time-based identifiers and can expose creation timing.
UPDATE `users`
SET `public_id` = LOWER(CONCAT(
  HEX(RANDOM_BYTES(4)), '-',
  HEX(RANDOM_BYTES(2)), '-',
  '4', SUBSTRING(HEX(RANDOM_BYTES(2)), 2, 3), '-',
  '8', SUBSTRING(HEX(RANDOM_BYTES(2)), 2, 3), '-',
  HEX(RANDOM_BYTES(6))
))
WHERE `public_id` IS NULL;

CREATE UNIQUE INDEX `users_public_id_key` ON `users` (`public_id`);
