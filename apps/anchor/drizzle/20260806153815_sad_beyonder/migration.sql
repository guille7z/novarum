CREATE TABLE "email_otps" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"otp" integer NOT NULL,
	"intent" text NOT NULL,
	"createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp(3) with time zone NOT NULL
);
