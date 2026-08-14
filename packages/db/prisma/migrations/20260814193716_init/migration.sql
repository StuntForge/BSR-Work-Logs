-- CreateEnum
CREATE TYPE "GradeKey" AS ENUM ('PROBATIONARY', 'STUNT_PERFORMER', 'SENIOR_STUNT_PERFORMER', 'KEY_STUNT_PERFORMER', 'FULL_MEMBER');

-- CreateEnum
CREATE TYPE "WorkRecordStatus" AS ENUM ('ONGOING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkDateStatus" AS ENUM ('CLAIMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IdentifiableStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkLocation" AS ENUM ('STUDIO', 'UK', 'OVERSEAS');

-- CreateEnum
CREATE TYPE "UpgradeApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('DAYS_WORKED', 'IDENTIFIABLES', 'MIN_TIME_AT_GRADE', 'COORDINATOR_SPREAD', 'HEALTH_SAFETY', 'SOLO_DAYS', 'CORE_JOBS', 'POINTS');

-- CreateEnum
CREATE TYPE "WorkApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "key" "GradeKey" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "isCommittee" BOOLEAN NOT NULL DEFAULT false,
    "currentGradeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdByUpgradeApplicationId" TEXT,

    CONSTRAINT "GradeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementDefinition" (
    "id" TEXT NOT NULL,
    "targetGradeId" TEXT NOT NULL,
    "type" "RequirementType" NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "config" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionFamily" (
    "id" TEXT NOT NULL,
    "rootName" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkRecord" (
    "id" TEXT NOT NULL,
    "productionFamilyId" TEXT NOT NULL,
    "continuationSequence" INTEGER NOT NULL DEFAULT 0,
    "hasSpawnedContinuation" BOOLEAN NOT NULL DEFAULT false,
    "performerId" TEXT NOT NULL,
    "status" "WorkRecordStatus" NOT NULL DEFAULT 'ONGOING',
    "gradeHistoryId" TEXT NOT NULL,
    "natureOfEmployment" TEXT,
    "areaItemId" TEXT,
    "jobDescription" TEXT,
    "otherPerformersText" TEXT,
    "location" "WorkLocation",
    "riskAssessment" BOOLEAN,
    "comments" TEXT,
    "fullMemberId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkRecordPerformerLink" (
    "id" TEXT NOT NULL,
    "workRecordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WorkRecordPerformerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkDate" (
    "id" TEXT NOT NULL,
    "workRecordId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "WorkDateStatus" NOT NULL DEFAULT 'CLAIMED',
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "WorkDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AreaCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AreaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identifiable" (
    "id" TEXT NOT NULL,
    "workRecordId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "performerDescription" TEXT NOT NULL,
    "verifiedDescription" TEXT,
    "status" "IdentifiableStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Identifiable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceDocument" (
    "id" TEXT NOT NULL,
    "workRecordId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkApproval" (
    "id" TEXT NOT NULL,
    "workRecordId" TEXT NOT NULL,
    "decidedById" TEXT NOT NULL,
    "decision" "WorkApprovalDecision" NOT NULL,
    "message" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpgradeApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromGradeId" TEXT NOT NULL,
    "toGradeId" TEXT NOT NULL,
    "status" "UpgradeApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionMessage" TEXT,

    CONSTRAINT "UpgradeApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpgradeApplicationEvidence" (
    "id" TEXT NOT NULL,
    "upgradeApplicationId" TEXT NOT NULL,
    "workRecordId" TEXT NOT NULL,
    "approvedDaysSnapshot" INTEGER NOT NULL,
    "approvedIdentifiablesSnapshot" INTEGER NOT NULL,

    CONSTRAINT "UpgradeApplicationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HEALTH_SAFETY',
    "status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grade_key_key" ON "Grade"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_order_key" ON "Grade"("order");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_currentGradeId_idx" ON "User"("currentGradeId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeHistory_createdByUpgradeApplicationId_key" ON "GradeHistory"("createdByUpgradeApplicationId");

-- CreateIndex
CREATE INDEX "GradeHistory_userId_idx" ON "GradeHistory"("userId");

-- CreateIndex
CREATE INDEX "RequirementDefinition_targetGradeId_idx" ON "RequirementDefinition"("targetGradeId");

-- CreateIndex
CREATE INDEX "ProductionFamily_ownerId_idx" ON "ProductionFamily"("ownerId");

-- CreateIndex
CREATE INDEX "WorkRecord_productionFamilyId_idx" ON "WorkRecord"("productionFamilyId");

-- CreateIndex
CREATE INDEX "WorkRecord_performerId_idx" ON "WorkRecord"("performerId");

-- CreateIndex
CREATE INDEX "WorkRecord_fullMemberId_idx" ON "WorkRecord"("fullMemberId");

-- CreateIndex
CREATE INDEX "WorkRecord_status_idx" ON "WorkRecord"("status");

-- CreateIndex
CREATE INDEX "WorkRecord_gradeHistoryId_idx" ON "WorkRecord"("gradeHistoryId");

-- CreateIndex
CREATE INDEX "WorkRecordPerformerLink_workRecordId_idx" ON "WorkRecordPerformerLink"("workRecordId");

-- CreateIndex
CREATE INDEX "WorkDate_workRecordId_idx" ON "WorkDate"("workRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkDate_workRecordId_date_key" ON "WorkDate"("workRecordId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AreaCategory_key_key" ON "AreaCategory"("key");

-- CreateIndex
CREATE INDEX "AreaItem_categoryId_idx" ON "AreaItem"("categoryId");

-- CreateIndex
CREATE INDEX "Identifiable_workRecordId_idx" ON "Identifiable"("workRecordId");

-- CreateIndex
CREATE INDEX "EvidenceDocument_workRecordId_idx" ON "EvidenceDocument"("workRecordId");

-- CreateIndex
CREATE INDEX "WorkApproval_workRecordId_idx" ON "WorkApproval"("workRecordId");

-- CreateIndex
CREATE INDEX "UpgradeApplication_userId_idx" ON "UpgradeApplication"("userId");

-- CreateIndex
CREATE INDEX "UpgradeApplication_status_idx" ON "UpgradeApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UpgradeApplicationEvidence_upgradeApplicationId_workRecordI_key" ON "UpgradeApplicationEvidence"("upgradeApplicationId", "workRecordId");

-- CreateIndex
CREATE INDEX "Qualification_userId_idx" ON "Qualification"("userId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentGradeId_fkey" FOREIGN KEY ("currentGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeHistory" ADD CONSTRAINT "GradeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeHistory" ADD CONSTRAINT "GradeHistory_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeHistory" ADD CONSTRAINT "GradeHistory_createdByUpgradeApplicationId_fkey" FOREIGN KEY ("createdByUpgradeApplicationId") REFERENCES "UpgradeApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDefinition" ADD CONSTRAINT "RequirementDefinition_targetGradeId_fkey" FOREIGN KEY ("targetGradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFamily" ADD CONSTRAINT "ProductionFamily_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_productionFamilyId_fkey" FOREIGN KEY ("productionFamilyId") REFERENCES "ProductionFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_gradeHistoryId_fkey" FOREIGN KEY ("gradeHistoryId") REFERENCES "GradeHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_areaItemId_fkey" FOREIGN KEY ("areaItemId") REFERENCES "AreaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_fullMemberId_fkey" FOREIGN KEY ("fullMemberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRecordPerformerLink" ADD CONSTRAINT "WorkRecordPerformerLink_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDate" ADD CONSTRAINT "WorkDate_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaItem" ADD CONSTRAINT "AreaItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AreaCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Identifiable" ADD CONSTRAINT "Identifiable_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Identifiable" ADD CONSTRAINT "Identifiable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AreaCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceDocument" ADD CONSTRAINT "EvidenceDocument_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkApproval" ADD CONSTRAINT "WorkApproval_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkApproval" ADD CONSTRAINT "WorkApproval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeApplication" ADD CONSTRAINT "UpgradeApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeApplication" ADD CONSTRAINT "UpgradeApplication_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeApplicationEvidence" ADD CONSTRAINT "UpgradeApplicationEvidence_upgradeApplicationId_fkey" FOREIGN KEY ("upgradeApplicationId") REFERENCES "UpgradeApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeApplicationEvidence" ADD CONSTRAINT "UpgradeApplicationEvidence_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
