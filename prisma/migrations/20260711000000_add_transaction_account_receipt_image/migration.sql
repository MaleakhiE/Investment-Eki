ALTER TABLE `transactions`
    ADD COLUMN `account` VARCHAR(100) NULL,
    ADD COLUMN `receipt_image` LONGTEXT NULL;
