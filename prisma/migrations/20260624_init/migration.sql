-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'COMPLETE', 'ON_HOLD');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "client" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3),
    "departureTime" TIMESTAMP(3),
    "hoursOnSite" DECIMAL(65,30),
    "notes" TEXT,
    "materialsToOrder" TEXT[],
    "rawTranscript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogEntry_jobId_idx" ON "LogEntry"("jobId");

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
