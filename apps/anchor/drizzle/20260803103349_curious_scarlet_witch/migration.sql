DELETE FROM "friend_relationship"
WHERE "userOneId" >= "userTwoId"
   OR "requestedById" NOT IN ("userOneId", "userTwoId")
   OR "status" NOT IN ('PENDING', 'ACCEPTED');--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD COLUMN "syncPending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD COLUMN "lastCommandId" text;--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD COLUMN "acceptCommandId" text;--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD COLUMN "updatedAt" timestamp(3) with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD CONSTRAINT "friend_relationship_distinct_users" CHECK ("userOneId" <> "userTwoId");--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD CONSTRAINT "friend_relationship_ordered_users" CHECK ("userOneId" < "userTwoId");--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD CONSTRAINT "friend_relationship_requested_by_participant" CHECK ("requestedById" IN ("userOneId", "userTwoId"));--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD CONSTRAINT "friend_relationship_status_check" CHECK ("status" IN ('NONE', 'PENDING', 'ACCEPTED'));
