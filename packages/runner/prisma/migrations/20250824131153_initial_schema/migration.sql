-- CreateEnum
CREATE TYPE "public"."SubjectKind" AS ENUM ('HL_METRIC', 'TOKEN_PRICE');

-- CreateEnum
CREATE TYPE "public"."PredicateOp" AS ENUM ('GT', 'GTE', 'LT', 'LTE');

-- CreateEnum
CREATE TYPE "public"."WindowKind" AS ENUM ('SNAPSHOT_AT', 'WINDOW_SUM', 'WINDOW_COUNT');

-- CreateEnum
CREATE TYPE "public"."MarketStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CANCELLED', 'DISPUTE');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('RESOLVE_MARKET', 'FETCH_METRIC', 'HEALTH_CHECK');

-- CreateTable
CREATE TABLE "public"."Market" (
    "id" TEXT NOT NULL,
    "factoryAddress" TEXT NOT NULL,
    "implementationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subjectKind" "public"."SubjectKind" NOT NULL,
    "metricId" TEXT,
    "tokenIdentifier" TEXT,
    "valueDecimals" INTEGER NOT NULL,
    "predicateOp" "public"."PredicateOp" NOT NULL,
    "threshold" TEXT NOT NULL,
    "windowKind" "public"."WindowKind" NOT NULL,
    "tStart" TIMESTAMP(3) NOT NULL,
    "tEnd" TIMESTAMP(3) NOT NULL,
    "primarySourceId" TEXT NOT NULL,
    "fallbackSourceId" TEXT,
    "roundingDecimals" INTEGER NOT NULL,
    "cutoffTime" TIMESTAMP(3) NOT NULL,
    "resolutionTime" TIMESTAMP(3),
    "feeBps" INTEGER NOT NULL,
    "creatorFeeShareBps" INTEGER NOT NULL,
    "maxTotalPool" TEXT NOT NULL,
    "timeDecayBps" INTEGER,
    "creator" TEXT NOT NULL,
    "isProtocolMarket" BOOLEAN NOT NULL,
    "status" "public"."MarketStatus" NOT NULL DEFAULT 'ACTIVE',
    "resolvedValue" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionTxHash" TEXT,
    "blockNumber" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" TEXT NOT NULL,
    "type" "public"."JobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "marketId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "data" JSONB,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Resolution" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "commitTxHash" TEXT,
    "finalizeTxHash" TEXT,
    "blockNumber" BIGINT,
    "resolvedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetricData" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "decimals" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_state" (
    "id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Market_status_idx" ON "public"."Market"("status");

-- CreateIndex
CREATE INDEX "Market_resolutionTime_idx" ON "public"."Market"("resolutionTime");

-- CreateIndex
CREATE INDEX "Market_cutoffTime_idx" ON "public"."Market"("cutoffTime");

-- CreateIndex
CREATE UNIQUE INDEX "Market_transactionHash_logIndex_key" ON "public"."Market"("transactionHash", "logIndex");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "public"."Job"("status");

-- CreateIndex
CREATE INDEX "Job_scheduledFor_idx" ON "public"."Job"("scheduledFor");

-- CreateIndex
CREATE INDEX "Job_type_status_idx" ON "public"."Job"("type", "status");

-- CreateIndex
CREATE INDEX "Resolution_marketId_idx" ON "public"."Resolution"("marketId");

-- CreateIndex
CREATE INDEX "Resolution_resolvedAt_idx" ON "public"."Resolution"("resolvedAt");

-- CreateIndex
CREATE INDEX "MetricData_source_identifier_idx" ON "public"."MetricData"("source", "identifier");

-- CreateIndex
CREATE INDEX "MetricData_timestamp_idx" ON "public"."MetricData"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricData_source_identifier_metricType_timestamp_key" ON "public"."MetricData"("source", "identifier", "metricType", "timestamp");

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "public"."Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resolution" ADD CONSTRAINT "Resolution_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "public"."Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
