/*
  Warnings:

  - You are about to drop the column `contextEdgeId` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `contextNodeId` on the `ChatMessage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "contextEdgeId",
DROP COLUMN "contextNodeId",
ADD COLUMN     "contextEdgeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "contextNodeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
