import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().defaultRandom(),
  problemText: text("problem_text").notNull(),
  functionSignature: text("function_signature").notNull(),
  solution: text("solution").notNull(),
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
  inputCode: text("input_code").notNull(),
  input: jsonb("input").notNull(),
  expected: jsonb("expected").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports
export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;
export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;
