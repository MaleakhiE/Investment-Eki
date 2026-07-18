-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(512) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `ai_recommendation_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_cashflow` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `month` VARCHAR(7) NOT NULL,
    `income` VARCHAR(255) NOT NULL,
    `expense_rent` VARCHAR(255) NOT NULL,
    `expense_living` VARCHAR(255) NOT NULL,
    `expense_other` VARCHAR(255) NOT NULL,
    `total_expense` VARCHAR(255) NOT NULL,
    `net_cashflow` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `monthly_cashflow_user_id_month_key`(`user_id`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `date` DATE NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `description` VARCHAR(512) NOT NULL,
    `amount` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `transactions_user_id_date_idx`(`user_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `smtp_settings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `host` VARCHAR(255) NOT NULL,
    `port` VARCHAR(10) NOT NULL,
    `smtp_user` VARCHAR(512) NOT NULL,
    `smtp_pass` VARCHAR(512) NOT NULL,
    `from_email` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `smtp_settings_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `type` ENUM('GOLD', 'MUTUAL_FUND') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `investments_user_id_type_key`(`user_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investment_snapshots` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `investment_id` BIGINT NOT NULL,
    `month` VARCHAR(7) NOT NULL,
    `invested_amount` VARCHAR(255) NOT NULL,
    `current_value` VARCHAR(255) NOT NULL,
    `platform` VARCHAR(100) NULL,
    `product_name` VARCHAR(255) NULL,
    `units` VARCHAR(50) NULL,
    `nav_per_unit` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `investment_snapshots_investment_id_month_key`(`investment_id`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `month` VARCHAR(7) NOT NULL,
    `type` ENUM('REMINDER', 'SUMMARY', 'LOW_BALANCE', 'CUSTOM') NOT NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_settings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `monthly_reminder` BOOLEAN NOT NULL DEFAULT true,
    `monthly_reminder_day` INTEGER NOT NULL DEFAULT 25,
    `monthly_summary` BOOLEAN NOT NULL DEFAULT true,
    `low_balance_alert` BOOLEAN NOT NULL DEFAULT false,
    `low_balance_threshold` VARCHAR(255) NOT NULL DEFAULT '0',
    `custom_alerts` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_settings_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `amount` VARCHAR(255) NOT NULL,
    `period` ENUM('WEEKLY', 'MONTHLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `budgets_user_id_category_key`(`user_id`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `description` VARCHAR(512) NOT NULL,
    `amount` VARCHAR(255) NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY') NOT NULL,
    `day_of_month` INTEGER NULL,
    `day_of_week` INTEGER NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_run` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_goals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `target_amount` VARCHAR(255) NOT NULL,
    `current_amount` VARCHAR(255) NOT NULL,
    `deadline` DATE NULL,
    `category` ENUM('EMERGENCY_FUND', 'INVESTMENT', 'VACATION', 'GADGET', 'VEHICLE', 'PROPERTY', 'EDUCATION', 'WEDDING', 'OTHER') NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `monthly_cashflow` ADD CONSTRAINT `monthly_cashflow_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `smtp_settings` ADD CONSTRAINT `smtp_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investments` ADD CONSTRAINT `investments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `investment_snapshots` ADD CONSTRAINT `investment_snapshots_investment_id_fkey` FOREIGN KEY (`investment_id`) REFERENCES `investments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_settings` ADD CONSTRAINT `notification_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_transactions` ADD CONSTRAINT `recurring_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_goals` ADD CONSTRAINT `financial_goals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
