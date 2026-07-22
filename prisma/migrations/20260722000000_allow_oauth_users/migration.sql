-- OAuth-only users do not have a local password until they complete password reset.
ALTER TABLE `users`
  MODIFY `password_hash` VARCHAR(255) NULL;

CREATE TABLE `oauth_accounts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `provider` VARCHAR(50) NOT NULL,
  `provider_account_id` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `oauth_accounts_provider_account_key` (`provider`, `provider_account_id`),
  UNIQUE INDEX `oauth_accounts_user_provider_key` (`user_id`, `provider`),
  PRIMARY KEY (`id`),
  CONSTRAINT `oauth_accounts_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
