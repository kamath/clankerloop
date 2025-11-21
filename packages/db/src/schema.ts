import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

// Languages enum table
export const languages = pgTable('languages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
});

// Difficulty enum table
export const difficulties = pgTable('difficulties', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
});

// Problems table
export const problems = pgTable('problems', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  difficultyId: uuid('difficulty_id')
    .notNull()
    .references(() => difficulties.id),
  constraints: text('constraints').array().notNull().default([]),
  examples: jsonb('examples').notNull().default([]),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Function signatures for each language
export const functionSignatures = pgTable(
  'function_signatures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    problemId: uuid('problem_id')
      .notNull()
      .references(() => problems.id, { onDelete: 'cascade' }),
    languageId: uuid('language_id')
      .notNull()
      .references(() => languages.id),
    signature: text('signature').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
);

// Solutions table
export const solutions = pgTable('solutions', {
  id: uuid('id').primaryKey().defaultRandom(),
  problemId: uuid('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  languageId: uuid('language_id')
    .notNull()
    .references(() => languages.id),
  code: text('code').notNull(),
  explanation: text('explanation').notNull(),
  timeComplexity: varchar('time_complexity', { length: 50 }).notNull(),
  spaceComplexity: varchar('space_complexity', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Test case descriptions (natural language descriptions)
export const testCaseDescriptions = pgTable('test_case_descriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  problemId: uuid('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  expectedBehavior: text('expected_behavior').notNull(),
  isEdgeCase: boolean('is_edge_case').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Test cases with actual input/output values
export const testCases = pgTable('test_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  problemId: uuid('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  testCaseDescriptionId: uuid('test_case_description_id').references(
    () => testCaseDescriptions.id,
    { onDelete: 'set null' },
  ),
  description: text('description').notNull(),
  input: jsonb('input').notNull(),
  expectedOutput: jsonb('expected_output').notNull(),
  isEdgeCase: boolean('is_edge_case').notNull().default(false),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Test input code for generating test inputs
export const testInputCodes = pgTable('test_input_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  testCaseId: uuid('test_case_id')
    .notNull()
    .references(() => testCases.id, { onDelete: 'cascade' }),
  languageId: uuid('language_id')
    .notNull()
    .references(() => languages.id),
  code: text('code').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Execution results (optional audit/logging table)
export const executionResults = pgTable('execution_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  testCaseId: uuid('test_case_id')
    .notNull()
    .references(() => testCases.id, { onDelete: 'cascade' }),
  success: boolean('success').notNull(),
  output: jsonb('output'),
  error: text('error'),
  executionTimeMs: integer('execution_time_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Type exports for use in repositories
export type Language = typeof languages.$inferSelect;
export type NewLanguage = typeof languages.$inferInsert;

export type Difficulty = typeof difficulties.$inferSelect;
export type NewDifficulty = typeof difficulties.$inferInsert;

export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;

export type FunctionSignature = typeof functionSignatures.$inferSelect;
export type NewFunctionSignature = typeof functionSignatures.$inferInsert;

export type Solution = typeof solutions.$inferSelect;
export type NewSolution = typeof solutions.$inferInsert;

export type TestCaseDescription = typeof testCaseDescriptions.$inferSelect;
export type NewTestCaseDescription = typeof testCaseDescriptions.$inferInsert;

export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;

export type TestInputCode = typeof testInputCodes.$inferSelect;
export type NewTestInputCode = typeof testInputCodes.$inferInsert;

export type ExecutionResult = typeof executionResults.$inferSelect;
export type NewExecutionResult = typeof executionResults.$inferInsert;
