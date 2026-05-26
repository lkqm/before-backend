DELETE FROM "AiFeedback" feedback
USING (
    SELECT
        ctid,
        row_number() OVER (
            PARTITION BY "aiUsageId"
            ORDER BY "createdAt" DESC, "id" DESC
        ) AS duplicate_rank
    FROM "AiFeedback"
) duplicates
WHERE feedback.ctid = duplicates.ctid
  AND duplicates.duplicate_rank > 1;

DROP INDEX IF EXISTS "AiFeedback_aiUsageId_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "AiFeedback_aiUsageId_key" ON "AiFeedback"("aiUsageId");
