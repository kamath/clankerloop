ALTER TABLE "problems" ADD COLUMN "easier_than" uuid;
ALTER TABLE "problems" ADD COLUMN "harder_than" uuid;
ALTER TABLE "problems" ADD CONSTRAINT "problems_easier_than_problems_id_fk" FOREIGN KEY ("easier_than") REFERENCES "problems"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "problems" ADD CONSTRAINT "problems_harder_than_problems_id_fk" FOREIGN KEY ("harder_than") REFERENCES "problems"("id") ON DELETE no action ON UPDATE no action;


