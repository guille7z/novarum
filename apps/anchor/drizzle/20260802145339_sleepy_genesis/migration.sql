CREATE TABLE "friend_relationship" (
	"userOneId" text,
	"userTwoId" text,
	"requestedById" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"acceptedAt" timestamp(3) with time zone,
	CONSTRAINT "friend_relationship_pkey" PRIMARY KEY("userOneId","userTwoId")
);
--> statement-breakpoint
CREATE INDEX "friend_relationship_userOneId_idx" ON "friend_relationship" ("userOneId");--> statement-breakpoint
CREATE INDEX "friend_relationship_userTwoId_idx" ON "friend_relationship" ("userTwoId");--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD CONSTRAINT "friend_relationship_userOneId_user_id_fkey" FOREIGN KEY ("userOneId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD CONSTRAINT "friend_relationship_userTwoId_user_id_fkey" FOREIGN KEY ("userTwoId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "friend_relationship" ADD CONSTRAINT "friend_relationship_requestedById_user_id_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE CASCADE;