/// <reference path="../../worker-configuration.d.ts" />
import { Hono } from "hono";
import {
  generateProblemText,
  getProblemText,
  generateTestCases,
  getTestCases,
  generateTestCaseInputCode,
  getTestCaseInputCode,
  generateTestCaseInputs,
  getTestCaseInputs,
  generateSolution,
  getSolution,
  generateTestCaseOutputs,
  getTestCaseOutputs,
  runUserSolution,
} from "@/problem-actions";
import { getSandbox } from "@cloudflare/sandbox";
import { Sandbox } from "@/problem-actions";
import { createProblem } from "@repo/db";

const problems = new Hono<{ Bindings: Env }>();

const getSandboxInstance = (env: Env, sandboxId: string): Sandbox => {
  const cloudflareSandbox = getSandbox(env.Sandbox, sandboxId);
  return new Sandbox(cloudflareSandbox);
};

// Create problem with generated text
problems.post("/", async (c) => {
  const problemId = await createProblem();
  const result = await generateProblemText(problemId);
  return c.json({ success: true, data: { problemId, ...result } });
});

// Problem text
problems.post("/:problemId/text/generate", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await generateProblemText(problemId);
  return c.json({ success: true, data: result });
});

problems.get("/:problemId/text", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await getProblemText(problemId);
  return c.json({ success: true, data: result });
});

// Test cases
problems.post("/:problemId/test-cases/generate", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await generateTestCases(problemId);
  return c.json({ success: true, data: result });
});

problems.get("/:problemId/test-cases", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await getTestCases(problemId);
  return c.json({ success: true, data: result });
});

// Test case input code
problems.post("/:problemId/test-cases/input-code/generate", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await generateTestCaseInputCode(problemId);
  return c.json({ success: true, data: result });
});

problems.get("/:problemId/test-cases/input-code", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await getTestCaseInputCode(problemId);
  return c.json({ success: true, data: result });
});

// Test case inputs
problems.post("/:problemId/test-cases/inputs/generate", async (c) => {
  const problemId = c.req.param("problemId");
  const sandboxId = `test-inputs-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const result = await generateTestCaseInputs(problemId, sandbox);
  return c.json({ success: true, data: result });
});

problems.get("/:problemId/test-cases/inputs", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await getTestCaseInputs(problemId);
  return c.json({ success: true, data: result });
});

// Solution
problems.post("/:problemId/solution/generate", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await generateSolution(problemId);
  return c.json({ success: true, data: result });
});

problems.get("/:problemId/solution", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await getSolution(problemId);
  return c.json({ success: true, data: result });
});

// Test case outputs
problems.post("/:problemId/test-cases/outputs/generate", async (c) => {
  const problemId = c.req.param("problemId");
  const sandboxId = `test-outputs-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const result = await generateTestCaseOutputs(problemId, sandbox);
  return c.json({ success: true, data: result });
});

problems.get("/:problemId/test-cases/outputs", async (c) => {
  const problemId = c.req.param("problemId");
  const result = await getTestCaseOutputs(problemId);
  return c.json({ success: true, data: result });
});

// Run user solution
problems.post("/:problemId/solution/run", async (c) => {
  const problemId = c.req.param("problemId");
  const body = await c.req.json<{ code: string }>();

  if (!body.code) {
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "code is required" },
      },
      400
    );
  }

  const sandboxId = `solution-run-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const result = await runUserSolution(problemId, body.code, sandbox);
  return c.json({ success: true, data: result });
});

export { problems };
