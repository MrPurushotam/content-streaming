/*
  Warnings:

  - A unique constraint covering the columns `[uniqueId]` on the table `Content` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uniqueId]` on the table `VideoSourceInfo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uniqueId` to the `Content` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "uniqueId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Content_uniqueId_key" ON "Content"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSourceInfo_uniqueId_key" ON "VideoSourceInfo"("uniqueId");
