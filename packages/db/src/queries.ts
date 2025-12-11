import { eq, desc, inArray } from "drizzle-orm";
import defaultDb, { type Database } from "../index";
import {
  models,
  problems,
  testCases,
  generationJobs,
  focusAreas,
  problemFocusAreas,
  userProblemAttempts,
  designSessions,
  designMessages,
  type Model,
  type Problem,
  type TestCase,
  type NewModel,
  type NewProblem,
  type NewTestCase,
  type GenerationJob,
  type NewGenerationJob,
  type FocusArea,
  type NewFocusArea,
  type ProblemFocusArea,
  type NewProblemFocusArea,
  type UserProblemAttempt,
  type NewUserProblemAttempt,
  type DesignSession,
  type NewDesignSession,
  type DesignMessage,
  type NewDesignMessage,
  attachments,
} from "./schema";
import type { FilePart, ModelMessage, UIMessage } from "ai";

// Re-export types for convenience
export type {
  Model,
  Problem,
  TestCase,
  NewModel,
  NewProblem,
  NewTestCase,
  GenerationJob,
  NewGenerationJob,
  FocusArea,
  NewFocusArea,
  ProblemFocusArea,
  NewProblemFocusArea,
  UserProblemAttempt,
  NewUserProblemAttempt,
  DesignSession,
  NewDesignSession,
  DesignMessage,
  NewDesignMessage,
};

// Re-export Database type
export type { Database };

// Problem with test cases type for getProblem
export type ProblemWithTestCases = Problem & {
  testCases: TestCase[];
};

// Helper to get db instance (use provided or default)
const getDb = (db?: Database): Database => db ?? defaultDb;

// Model functions

export async function createModel(
  name: string,
  db?: Database,
): Promise<string> {
  const database = getDb(db);
  const [result] = await database
    .insert(models)
    .values({ name })
    .returning({ id: models.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create model: ${name}`);
  }

  return result.id;
}

export async function getModel(
  modelId: string,
  db?: Database,
): Promise<Model | null> {
  const database = getDb(db);
  const model = await database.query.models.findFirst({
    where: eq(models.id, modelId),
  });
  return model ?? null;
}

export async function getModelByName(
  name: string,
  db?: Database,
): Promise<Model | null> {
  const database = getDb(db);
  const model = await database.query.models.findFirst({
    where: eq(models.name, name),
  });
  return model ?? null;
}

export async function listModels(db?: Database): Promise<Model[]> {
  const database = getDb(db);
  return database.query.models.findMany({
    orderBy: models.name,
  });
}

export async function getModelForProblem(
  problemId: string,
  db?: Database,
): Promise<string | null> {
  const database = getDb(db);
  const problem = await database.query.problems.findFirst({
    where: eq(problems.id, problemId),
  });

  if (!problem || !problem.generatedByModelId) {
    return null;
  }

  const model = await getModel(problem.generatedByModelId, db);
  return model?.name ?? null;
}

// Problem functions

export async function createProblem(
  data?: Partial<NewProblem>,
  db?: Database,
): Promise<string> {
  if (!data?.generatedByUserId) {
    throw new Error("generatedByUserId is required");
  }

  const database = getDb(db);
  const [result] = await database
    .insert(problems)
    .values({
      problemText: data?.problemText ?? "",
      functionSignature: data?.functionSignature ?? "",
      problemTextReworded: data?.problemTextReworded ?? "",
      solution: data?.solution ?? "",
      generatedByUserId: data?.generatedByUserId,
    })
    .returning({ id: problems.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create problem`);
  }

  return result.id;
}

export async function getProblem(
  problemId: string,
  db?: Database,
): Promise<ProblemWithTestCases> {
  const database = getDb(db);
  const problem = await database.query.problems.findFirst({
    where: eq(problems.id, problemId),
  });

  if (!problem) {
    throw new Error(`Problem not found: ${problemId}`);
  }

  const problemTestCases = await database.query.testCases.findMany({
    where: eq(testCases.problemId, problemId),
    orderBy: testCases.createdAt,
  });

  return {
    ...problem,
    testCases: problemTestCases,
  };
}

export async function updateProblem(
  problemId: string,
  data: Partial<Omit<NewProblem, "id">>,
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database
    .update(problems)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(problems.id, problemId));
}

export async function listProblems(db?: Database): Promise<string[]> {
  const database = getDb(db);
  const result = await database
    .select({ id: problems.id })
    .from(problems)
    .orderBy(problems.createdAt);

  return result.map((row) => row.id);
}

// TestCase functions

export async function createTestCase(
  problemId: string,
  data: Omit<NewTestCase, "id" | "problemId" | "createdAt">,
  db?: Database,
): Promise<string> {
  const database = getDb(db);
  const [result] = await database
    .insert(testCases)
    .values({
      problemId,
      description: data.description,
      isEdgeCase: data.isEdgeCase ?? false,
      isSampleCase: data.isSampleCase ?? false,
      inputCode: data.inputCode,
      input: data.input,
      expected: data.expected,
    })
    .returning({ id: testCases.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create test case`);
  }

  return result.id;
}

export async function updateTestCase(
  testCaseId: string,
  data: Partial<Omit<NewTestCase, "id" | "problemId" | "createdAt">>,
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database
    .update(testCases)
    .set(data)
    .where(eq(testCases.id, testCaseId));
}

export async function deleteTestCases(
  problemId: string,
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database.delete(testCases).where(eq(testCases.problemId, problemId));
}

export async function getTestCasesByProblemId(
  problemId: string,
  db?: Database,
): Promise<TestCase[]> {
  const database = getDb(db);
  return database.query.testCases.findMany({
    where: eq(testCases.problemId, problemId),
  });
}

export async function createTestCases(
  problemId: string,
  data: Omit<NewTestCase, "id" | "problemId" | "createdAt">[],
  db?: Database,
): Promise<TestCase[]> {
  if (data.length === 0) return [];

  const database = getDb(db);
  return database
    .insert(testCases)
    .values(
      data.map((tc) => ({
        problemId,
        description: tc.description,
        isEdgeCase: tc.isEdgeCase ?? false,
        isSampleCase: tc.isSampleCase ?? false,
        inputCode: tc.inputCode,
        input: tc.input,
        expected: tc.expected,
      })),
    )
    .returning();
}

export async function replaceTestCases(
  problemId: string,
  data: Omit<NewTestCase, "id" | "problemId" | "createdAt">[],
  db?: Database,
): Promise<TestCase[]> {
  // Delete existing test cases and insert new ones
  await deleteTestCases(problemId, db);
  return createTestCases(problemId, data, db);
}

// Generation Job functions

export async function createGenerationJob(
  problemId: string,
  modelId?: string,
  db?: Database,
): Promise<string> {
  const database = getDb(db);
  const [result] = await database
    .insert(generationJobs)
    .values({
      problemId,
      modelId: modelId ?? null,
      status: "pending",
      completedSteps: [],
    })
    .returning({ id: generationJobs.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create generation job`);
  }

  return result.id;
}

export async function getGenerationJob(
  jobId: string,
  db?: Database,
): Promise<GenerationJob | null> {
  const database = getDb(db);
  const job = await database.query.generationJobs.findFirst({
    where: eq(generationJobs.id, jobId),
  });
  return job ?? null;
}

export async function getLatestJobForProblem(
  problemId: string,
  db?: Database,
): Promise<GenerationJob | null> {
  const database = getDb(db);
  const job = await database.query.generationJobs.findFirst({
    where: eq(generationJobs.problemId, problemId),
    orderBy: desc(generationJobs.createdAt),
  });
  return job ?? null;
}

export async function updateJobStatus(
  jobId: string,
  status: "pending" | "in_progress" | "completed" | "failed",
  currentStep?: string,
  error?: string,
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database
    .update(generationJobs)
    .set({
      status,
      currentStep: currentStep ?? null,
      error: error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, jobId));
}

export async function markStepComplete(
  jobId: string,
  step: string,
  db?: Database,
): Promise<void> {
  const job = await getGenerationJob(jobId, db);
  if (!job) {
    throw new Error(`Generation job not found: ${jobId}`);
  }

  const completedSteps = [...(job.completedSteps || []), step];

  const database = getDb(db);
  await database
    .update(generationJobs)
    .set({
      completedSteps,
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, jobId));
}

// Focus Area functions

export async function listFocusAreas(db?: Database): Promise<FocusArea[]> {
  const database = getDb(db);
  return database.query.focusAreas.findMany({
    where: eq(focusAreas.isActive, true),
    orderBy: focusAreas.displayOrder,
  });
}

export async function getFocusAreasByIds(
  ids: string[],
  db?: Database,
): Promise<FocusArea[]> {
  if (ids.length === 0) return [];
  const database = getDb(db);
  return database.query.focusAreas.findMany({
    where: inArray(focusAreas.id, ids),
  });
}

export async function getFocusAreasForProblem(
  problemId: string,
  db?: Database,
): Promise<FocusArea[]> {
  const database = getDb(db);
  const links = await database.query.problemFocusAreas.findMany({
    where: eq(problemFocusAreas.problemId, problemId),
    with: {
      focusArea: true,
    },
  });
  return links.map((link) => link.focusArea);
}

export async function linkFocusAreasToProblem(
  problemId: string,
  focusAreaIds: string[],
  db?: Database,
): Promise<void> {
  if (focusAreaIds.length === 0) return;
  const database = getDb(db);
  await database.insert(problemFocusAreas).values(
    focusAreaIds.map((focusAreaId) => ({
      problemId,
      focusAreaId,
    })),
  );
}

// User Problem Attempt functions

export async function createUserProblemAttempt(
  data: {
    userId: string;
    problemId: string;
    submissionCode: string;
    submissionLanguage: string;
  },
  db?: Database,
): Promise<string> {
  const database = getDb(db);
  const [result] = await database
    .insert(userProblemAttempts)
    .values({
      userId: data.userId,
      problemId: data.problemId,
      submissionCode: data.submissionCode,
      submissionLanguage: data.submissionLanguage,
      status: "attempt",
    })
    .returning({ id: userProblemAttempts.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create user problem attempt`);
  }

  return result.id;
}

export async function updateUserProblemAttemptStatus(
  attemptId: string,
  status: "attempt" | "run" | "pass",
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database
    .update(userProblemAttempts)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(userProblemAttempts.id, attemptId));
}

export async function getMostRecentProblemByUser(
  userId: string,
  db?: Database,
): Promise<string | null> {
  const database = getDb(db);
  const problem = await database.query.problems.findFirst({
    where: eq(problems.generatedByUserId, userId),
    orderBy: desc(problems.createdAt),
  });
  return problem?.id ?? null;
}

// Design Session functions

export async function createDesignSession(
  userId: string,
  title?: string,
  db?: Database,
): Promise<string> {
  const database = getDb(db);
  const [result] = await database
    .insert(designSessions)
    .values({
      userId,
      title: title ?? null,
    })
    .returning({ id: designSessions.id });

  if (!result || !result.id) {
    throw new Error("Failed to create design session");
  }

  return result.id;
}

export async function getDesignSession(
  sessionId: string,
  db?: Database,
): Promise<DesignSession | null> {
  const database = getDb(db);
  const session = await database.query.designSessions.findFirst({
    where: eq(designSessions.id, sessionId),
  });
  return session ?? null;
}

export async function updateDesignSessionTitle(
  sessionId: string,
  title: string,
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database
    .update(designSessions)
    .set({
      title,
      updatedAt: new Date(),
    })
    .where(eq(designSessions.id, sessionId));
}

export async function listDesignSessionsByUser(
  userId: string,
  db?: Database,
): Promise<DesignSession[]> {
  const database = getDb(db);
  return database.query.designSessions.findMany({
    where: eq(designSessions.userId, userId),
    orderBy: desc(designSessions.updatedAt),
  });
}

// Design Message functions

export async function saveDesignMessages(
  sessionId: string,
  messages: (ModelMessage & { id: string })[],
  uploadBase64Image: (key: string, filePart: FilePart) => Promise<void>,
  db?: Database,
): Promise<void> {
  console.log("Saving messages:", JSON.stringify(messages, null, 2));
  const database = getDb(db);

  // Insert all messages with sequence numbers, using onConflictDoNothing to skip duplicates
  // This is a true "insert if not exists" pattern
  await database
    .insert(designMessages)
    .values(
      messages.map((msg) => {
        const textParts: unknown[] = [];
        const fileParts: FilePart[] = [];
        if (Array.isArray(msg.content)) {
          msg.content.forEach((part) => {
            if (part.type === "file") {
              fileParts.push(part);
            } else {
              textParts.push(part);
            }
          });
        }

        const content = Array.isArray(msg.content)
          ? msg.content
          : JSON.stringify(textParts);

        return {
          id: msg.id,
          designSessionId: sessionId,
          role: msg.role,
          content: JSON.stringify(msg.content),
          contentParts: content,
        };
      }),
    )
    .onConflictDoNothing();

  // Upload files to R2
  for (const msg of messages) {
    const fileParts: FilePart[] = [];
    if (Array.isArray(msg.content)) {
      msg.content.forEach((part) => {
        if (part.type === "file") {
          fileParts.push(part);
        }
      });
    }

    // Upload each file part
    for (let index = 0; index < fileParts.length; index++) {
      const filePart = fileParts[index];
      const r2Key = `${sessionId}/${msg.id}/${filePart.filename}`;

      try {
        await uploadBase64Image(r2Key, filePart);
        // Add attachment record to database
        await database
          .insert(attachments)
          .values({
            id: r2Key,
            messageId: msg.id,
          })
          .onConflictDoNothing();
      } catch (error) {
        // Log error but don't fail the entire save operation
        console.error(`Failed to upload file ${r2Key}:`, error);
      }
    }
  }

  console.log("Messages saved");
  // Update session timestamp
  await database
    .update(designSessions)
    .set({ updatedAt: new Date() })
    .where(eq(designSessions.id, sessionId));
}

export async function loadDesignMessages(
  sessionId: string,
  db?: Database,
  r2BaseUrl?: string,
): Promise<
  {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    contentParts: UIMessage["parts"];
    createdAt: string;
    attachments: {
      type: "file";
      url: string;
      mediaType: string;
      filename: string;
    }[];
  }[]
> {
  const database = getDb(db);
  const messages = await database.query.designMessages.findMany({
    where: eq(designMessages.designSessionId, sessionId),
    orderBy: designMessages.createdAt,
    with: {
      attachments: true,
    },
  });

  // Use provided base URL or fall back to custom domain
  return messages.map((msg) => {
    const contentParts = JSON.parse(msg.content) as UIMessage["parts"];

    // Build mediaType map from contentParts
    const mediaTypeMap = new Map<string, string>();
    if (Array.isArray(contentParts)) {
      for (const part of contentParts) {
        if (part?.type === "file" && "filename" in part) {
          const fp = part as {
            filename?: string;
            mediaType?: string;
            mimeType?: string;
          };
          if (fp.filename) {
            mediaTypeMap.set(
              fp.filename,
              fp.mediaType || fp.mimeType || "application/octet-stream",
            );
          }
        }
      }
    }

    const attachments = msg.attachments.map((attachment) => {
      const filename = attachment.id.split("/").pop() || "";
      // R2 public URL - use backend route if baseUrl is provided, otherwise use custom domain
      const url = `${r2BaseUrl}/${attachment.id}`;

      return {
        type: "file" as const,
        url,
        mediaType: mediaTypeMap.get(filename) || "application/octet-stream",
        filename,
      };
    });

    return {
      id: msg.id,
      role: msg.role,
      contentParts,
      createdAt: msg.createdAt.toISOString(),
      attachments,
    };
  });
}
