/*
  Warnings:

  - You are about to drop the column `orderStatus` on the `Order` table. All the data in the column will be lost.
  - Added the required column `orderStatusId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Order_orderStatus_idx` ON `Order`;

-- AlterTable
ALTER TABLE `Order` DROP COLUMN `orderStatus`,
    ADD COLUMN `orderStatusId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `Order_orderStatusId_idx` ON `Order`(`orderStatusId`);

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_orderStatusId_fkey` FOREIGN KEY (`orderStatusId`) REFERENCES `OrderStatusEntry`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
