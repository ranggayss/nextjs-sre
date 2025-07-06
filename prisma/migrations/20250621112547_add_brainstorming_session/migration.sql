/*
  Warnings:

  - The primary key for the `Annotation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Article` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Draft` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `DraftSection` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Edge` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Node` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_articleId_fkey";

-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_draftSectionId_fkey";

-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Article" DROP CONSTRAINT "Article_userId_fkey";

-- DropForeignKey
ALTER TABLE "Draft" DROP CONSTRAINT "Draft_userId_fkey";

-- DropForeignKey
ALTER TABLE "DraftSection" DROP CONSTRAINT "DraftSection_draftId_fkey";

-- DropForeignKey
ALTER TABLE "Edge" DROP CONSTRAINT "Edge_articleId_fkey";

-- DropForeignKey
ALTER TABLE "Edge" DROP CONSTRAINT "Edge_fromId_fkey";

-- DropForeignKey
ALTER TABLE "Edge" DROP CONSTRAINT "Edge_toId_fkey";

-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_articleId_fkey";

-- AlterTable
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "articleId" SET DATA TYPE TEXT,
ALTER COLUMN "draftSectionId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Annotation_id_seq";

-- AlterTable
ALTER TABLE "Article" DROP CONSTRAINT "Article_pkey",
ADD COLUMN     "sessionId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Article_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Article_id_seq";

-- AlterTable
ALTER TABLE "Draft" DROP CONSTRAINT "Draft_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Draft_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Draft_id_seq";

-- AlterTable
ALTER TABLE "DraftSection" DROP CONSTRAINT "DraftSection_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "draftId" SET DATA TYPE TEXT,
ADD CONSTRAINT "DraftSection_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "DraftSection_id_seq";

-- AlterTable
ALTER TABLE "Edge" DROP CONSTRAINT "Edge_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "fromId" SET DATA TYPE TEXT,
ALTER COLUMN "toId" SET DATA TYPE TEXT,
ALTER COLUMN "articleId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Edge_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Edge_id_seq";

-- AlterTable
ALTER TABLE "Node" DROP CONSTRAINT "Node_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "articleId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Node_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Node_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- CreateTable
CREATE TABLE "BrainstormingSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "selectedFilterArticles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSelectedNodeId" TEXT,
    "lastSelectedEdgeId" TEXT,
    "graphFilters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainstormingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "contextNodeId" TEXT,
    "contextEdgeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BrainstormingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftSection" ADD CONSTRAINT "DraftSection_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_draftSectionId_fkey" FOREIGN KEY ("draftSectionId") REFERENCES "DraftSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainstormingSession" ADD CONSTRAINT "BrainstormingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BrainstormingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
