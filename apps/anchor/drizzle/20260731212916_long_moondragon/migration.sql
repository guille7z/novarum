-- made by 5.6 sol because i have no clue how sql works
ALTER TABLE "guild_member"
ADD COLUMN "position" integer;

WITH ranked_memberships AS (
  SELECT
    "guildId",
    "userId",
    (
      row_number() OVER (
        PARTITION BY "userId"
        ORDER BY "joinedAt", "guildId"
      ) - 1
    )::integer AS "position"
  FROM "guild_member"
)
UPDATE "guild_member" AS membership
SET "position" = ranked."position"
FROM ranked_memberships AS ranked
WHERE membership."guildId" = ranked."guildId"
  AND membership."userId" = ranked."userId";

ALTER TABLE "guild_member"
ALTER COLUMN "position" SET NOT NULL;
