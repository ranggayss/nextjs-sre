/*
  Warnings:

  - Made the column `sessionId` on table `ChatMessage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "sessionId" SET NOT NULL;
