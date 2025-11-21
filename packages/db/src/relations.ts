import { relations } from 'drizzle-orm';

import {
  languages,
  difficulties,
  problems,
  functionSignatures,
  solutions,
  testCaseDescriptions,
  testCases,
  testInputCodes,
  executionResults,
} from './schema';

// Language relations
export const languagesRelations = relations(languages, ({ many }) => ({
  functionSignatures: many(functionSignatures),
  solutions: many(solutions),
  testInputCodes: many(testInputCodes),
}));

// Difficulty relations
export const difficultiesRelations = relations(difficulties, ({ many }) => ({
  problems: many(problems),
}));

// Problem relations
export const problemsRelations = relations(problems, ({ one, many }) => ({
  difficulty: one(difficulties, {
    fields: [problems.difficultyId],
    references: [difficulties.id],
  }),
  functionSignatures: many(functionSignatures),
  solutions: many(solutions),
  testCaseDescriptions: many(testCaseDescriptions),
  testCases: many(testCases),
}));

// Function signature relations
export const functionSignaturesRelations = relations(
  functionSignatures,
  ({ one }) => ({
    problem: one(problems, {
      fields: [functionSignatures.problemId],
      references: [problems.id],
    }),
    language: one(languages, {
      fields: [functionSignatures.languageId],
      references: [languages.id],
    }),
  }),
);

// Solution relations
export const solutionsRelations = relations(solutions, ({ one }) => ({
  problem: one(problems, {
    fields: [solutions.problemId],
    references: [problems.id],
  }),
  language: one(languages, {
    fields: [solutions.languageId],
    references: [languages.id],
  }),
}));

// Test case description relations
export const testCaseDescriptionsRelations = relations(
  testCaseDescriptions,
  ({ one, many }) => ({
    problem: one(problems, {
      fields: [testCaseDescriptions.problemId],
      references: [problems.id],
    }),
    testCases: many(testCases),
  }),
);

// Test case relations
export const testCasesRelations = relations(testCases, ({ one, many }) => ({
  problem: one(problems, {
    fields: [testCases.problemId],
    references: [problems.id],
  }),
  testCaseDescription: one(testCaseDescriptions, {
    fields: [testCases.testCaseDescriptionId],
    references: [testCaseDescriptions.id],
  }),
  testInputCodes: many(testInputCodes),
  executionResults: many(executionResults),
}));

// Test input code relations
export const testInputCodesRelations = relations(testInputCodes, ({ one }) => ({
  testCase: one(testCases, {
    fields: [testInputCodes.testCaseId],
    references: [testCases.id],
  }),
  language: one(languages, {
    fields: [testInputCodes.languageId],
    references: [languages.id],
  }),
}));

// Execution result relations
export const executionResultsRelations = relations(
  executionResults,
  ({ one }) => ({
    testCase: one(testCases, {
      fields: [executionResults.testCaseId],
      references: [testCases.id],
    }),
  }),
);
