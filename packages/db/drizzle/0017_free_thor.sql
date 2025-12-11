CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_design_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."design_messages"("id") ON DELETE cascade ON UPDATE no action;