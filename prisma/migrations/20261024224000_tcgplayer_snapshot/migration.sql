CREATE TABLE "TcgplayerSnapshot" (
  "id" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'extension',
  "rowCount" INTEGER NOT NULL,
  "rowsJson" TEXT NOT NULL,
  CONSTRAINT "TcgplayerSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TcgplayerSnapshot_capturedAt_idx" ON "TcgplayerSnapshot"("capturedAt");
