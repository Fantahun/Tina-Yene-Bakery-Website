-- AlterTable
ALTER TABLE `SiteSetting` ADD COLUMN `dashboardInProgressStatusId` INTEGER NULL,
    ADD COLUMN `dashboardPendingStatusId` INTEGER NULL,
    ADD COLUMN `dashboardReadyStatusId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `SiteSetting` ADD CONSTRAINT `SiteSetting_dashboardPendingStatusId_fkey` FOREIGN KEY (`dashboardPendingStatusId`) REFERENCES `OrderStatusEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSetting` ADD CONSTRAINT `SiteSetting_dashboardInProgressStatusId_fkey` FOREIGN KEY (`dashboardInProgressStatusId`) REFERENCES `OrderStatusEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSetting` ADD CONSTRAINT `SiteSetting_dashboardReadyStatusId_fkey` FOREIGN KEY (`dashboardReadyStatusId`) REFERENCES `OrderStatusEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
