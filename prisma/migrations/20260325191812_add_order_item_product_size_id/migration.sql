-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `productSizeId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `OrderItem_productSizeId_idx` ON `OrderItem`(`productSizeId`);

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productSizeId_fkey` FOREIGN KEY (`productSizeId`) REFERENCES `ProductSize`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
