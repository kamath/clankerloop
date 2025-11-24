ALTER TABLE "test_cases" ALTER COLUMN "input_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "test_cases" ALTER COLUMN "input" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "test_cases" ALTER COLUMN "expected" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "test_cases" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;