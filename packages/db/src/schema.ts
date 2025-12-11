import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import type { FunctionSignatureSchema } from "@repo/api-types";

export const models = pgTable("models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().defaultRandom(),
  problemText: text("problem_text").notNull(),
  functionSignature: text("function_signature").notNull(),
  functionSignatureSchema: jsonb(
    "function_signature_schema",
  ).$type<FunctionSignatureSchema>(),
  problemTextReworded: text("problem_text_reworded").notNull(),
  solution: text("solution"),
  generatedByModelId: uuid("generated_by_model_id").references(() => models.id),
  generatedByUserId: text("generated_by_user_id").notNull(),
  easierThan: uuid("easier_than"),
  harderThan: uuid("harder_than"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Focus Areas
export const focusAreas = pgTable("focus_areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  promptGuidance: text("prompt_guidance").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const problemFocusAreas = pgTable(
  "problem_focus_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    focusAreaId: uuid("focus_area_id")
      .notNull()
      .references(() => focusAreas.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.problemId, table.focusAreaId)],
);

export const testCases = pgTable("test_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  problemId: uuid("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  isEdgeCase: boolean("is_edge_case").default(false).notNull(),
  isSampleCase: boolean("is_sample_case").default(false).notNull(),
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
  problemFocusAreas: many(problemFocusAreas),
  userProblemAttempts: many(userProblemAttempts),
  generatedByModel: one(models, {
    fields: [problems.generatedByModelId],
    references: [models.id],
  }),
  easierThanProblem: one(problems, {
    fields: [problems.easierThan],
    references: [problems.id],
    relationName: "easierThan",
  }),
  harderThanProblem: one(problems, {
    fields: [problems.harderThan],
    references: [problems.id],
    relationName: "harderThan",
  }),
}));

export const focusAreasRelations = relations(focusAreas, ({ many }) => ({
  problemFocusAreas: many(problemFocusAreas),
}));

export const problemFocusAreasRelations = relations(
  problemFocusAreas,
  ({ one }) => ({
    problem: one(problems, {
      fields: [problemFocusAreas.problemId],
      references: [problems.id],
    }),
    focusArea: one(focusAreas, {
      fields: [problemFocusAreas.focusAreaId],
      references: [focusAreas.id],
    }),
  }),
);

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

// User Problem Attempts
export const userProblemAttemptStatus = pgEnum("user_problem_attempt_status", [
  "attempt",
  "run",
  "pass",
]);

// Design Sessions
export const messageRole = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

export const designSessions = pgTable("design_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const designMessages = pgTable(
  "design_messages",
  {
    id: text("id").primaryKey().notNull(),
    designSessionId: uuid("design_session_id")
      .notNull()
      .references(() => designSessions.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    contentParts: jsonb("content_parts"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.designSessionId, table.id)],
);

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey().notNull(),
  messageId: text("message_id")
    .notNull()
    .references(() => designMessages.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userProblemAttempts = pgTable("user_problem_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  problemId: uuid("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  submissionCode: text("submission_code").notNull(),
  submissionLanguage: text("submission_language").notNull(),
  status: userProblemAttemptStatus("status").notNull().default("attempt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

export const userProblemAttemptsRelations = relations(
  userProblemAttempts,
  ({ one }) => ({
    problem: one(problems, {
      fields: [userProblemAttempts.problemId],
      references: [problems.id],
    }),
  }),
);

export const designSessionsRelations = relations(
  designSessions,
  ({ many }) => ({
    messages: many(designMessages),
  }),
);

export const designMessagesRelations = relations(
  designMessages,
  ({ one, many }) => ({
    session: one(designSessions, {
      fields: [designMessages.designSessionId],
      references: [designSessions.id],
    }),
    attachments: many(attachments),
  }),
);

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(designMessages, {
    fields: [attachments.messageId],
    references: [designMessages.id],
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
export type FocusArea = typeof focusAreas.$inferSelect;
export type NewFocusArea = typeof focusAreas.$inferInsert;
export type ProblemFocusArea = typeof problemFocusAreas.$inferSelect;
export type NewProblemFocusArea = typeof problemFocusAreas.$inferInsert;
export type UserProblemAttempt = typeof userProblemAttempts.$inferSelect;
export type NewUserProblemAttempt = typeof userProblemAttempts.$inferInsert;
export type DesignSession = typeof designSessions.$inferSelect;
export type NewDesignSession = typeof designSessions.$inferInsert;
export type DesignMessage = typeof designMessages.$inferSelect;
export type NewDesignMessage = typeof designMessages.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
