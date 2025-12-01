import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const models = pgTable("models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().defaultRandom(),
  problemText: text("problem_text").notNull(),
  functionSignature: text("function_signature").notNull(),
  solution: text("solution"),
  generatedByModelId: uuid("generated_by_model_id").references(() => models.id),
  generatedByUserId: text("generated_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const testCases = pgTable("test_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  problemId: uuid("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  isEdgeCase: boolean("is_edge_case").default(false).notNull(),
  inputCode: text("input_code"),
  input: jsonb("input"),
  expected: jsonb("expected"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const modelsRelations = relations(models, ({ many }) => ({
  problems: many(problems),
}));

export const problemsRelations = relations(problems, ({ many, one }) => ({
  testCases: many(testCases),
  generatedByModel: one(models, {
    fields: [problems.generatedByModelId],
    references: [models.id],
  }),
}));

export const testCasesRelations = relations(testCases, ({ one }) => ({
  problem: one(problems, {
    fields: [testCases.problemId],
    references: [problems.id],
  }),
}));

// Generation Jobs
export const generationJobStatus = pgEnum("generation_job_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
]);

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  problemId: uuid("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  modelId: uuid("model_id").references(() => models.id),
  status: generationJobStatus("status").notNull().default("pending"),
  currentStep: text("current_step"),
  completedSteps: jsonb("completed_steps").$type<string[]>().default([]),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generationJobsRelations = relations(generationJobs, ({ one }) => ({
  problem: one(problems, {
    fields: [generationJobs.problemId],
    references: [problems.id],
  }),
  model: one(models, {
    fields: [generationJobs.modelId],
    references: [models.id],
  }),
}));

// Type exports
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;
export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;
export type GenerationJob = typeof generationJobs.$inferSelect;
export type NewGenerationJob = typeof generationJobs.$inferInsert;
