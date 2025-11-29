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
  type SandboxConfig,
} from "@/problem-actions";

const problems = new Hono();

const getSandboxConfig = (): SandboxConfig => {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    throw new Error("DAYTONA_API_KEY environment variable is not set");
  }
  return { apiKey };
};

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
  const result = await generateTestCaseInputs(problemId, getSandboxConfig());
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
  const result = await generateTestCaseOutputs(problemId, getSandboxConfig());
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

  const result = await runUserSolution(
    problemId,
    body.code,
    getSandboxConfig()
  );
  return c.json({ success: true, data: result });
});

export { problems };
