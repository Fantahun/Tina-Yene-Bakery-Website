/*
  Warnings:

  - The primary key for the `AdminUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `OrderItem` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `AdminLoginHistory` DROP FOREIGN KEY `AdminLoginHistory_adminUserId_fkey`;

-- AlterTable
ALTER TABLE `AdminLoginHistory` MODIFY `adminUserId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `AdminUser` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `OrderItem` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `AdminLoginHistory` ADD CONSTRAINT `AdminLoginHistory_adminUserId_fkey` FOREIGN KEY (`adminUserId`) REFERENCES `AdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
