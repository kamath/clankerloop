ALTER TABLE "design_messages" DROP CONSTRAINT "design_messages_design_session_id_sequence_unique";--> statement-breakpoint
ALTER TABLE "design_messages" DROP COLUMN "sequence";--> statement-breakpoint
ALTER TABLE "design_messages" ADD CONSTRAINT "design_messages_design_session_id_id_unique" UNIQUE("design_session_id","id");