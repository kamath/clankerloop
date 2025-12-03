import { generateObject } from "ai";
import { getProblem, updateProblem, type Database } from "@repo/db";
import {
  FunctionSignatureSchemaSchema,
  type FunctionSignatureSchema,
} from "@repo/api-types";
import { getTracedClient } from "@/utils/ai";

export async function parseFunctionSignature(
  problemId: string,
  model: string,
  userId: string,
  env: Env,
  db: Database,
  forceError?: boolean,
  returnDummy?: boolean,
): Promise<FunctionSignatureSchema> {
  if (forceError) {
    throw new Error("Force error: parseFunctionSignature call skipped");
  }

  const problem = await getProblem(problemId, db);

  if (!problem.functionSignature) {
    throw new Error("Problem does not have a function signature to parse");
  }

  let schema: FunctionSignatureSchema;

  if (returnDummy) {
    schema = {
      version: 1,
      functionName: "runSolution",
      parameters: [
        {
          name: "nums",
          type: { kind: "array", items: { kind: "primitive", type: "int" } },
        },
      ],
      returnType: { kind: "primitive", type: "int" },
    };
  } else {
    const tracedModel = getTracedClient(model, userId, problemId, model, env);
    const result = await generateObject({
      model: tracedModel,
      prompt: `Parse this TypeScript function signature into a structured schema.

Function signature: ${problem.functionSignature}

Problem context (for understanding custom types): ${problem.problemText}

Output a schema with:
- version: always 1
- functionName: always "runSolution"
- parameters: array of { name, type }
- returnType: the return type
- namedTypes: (optional) array for recursive/custom types like TreeNode, ListNode

Type kinds:
- Primitives: { kind: "primitive", type: "int"|"float"|"string"|"boolean"|"null" }
- Arrays: { kind: "array", items: <type> }
- Objects: { kind: "object", properties: { fieldName: <type>, ... } }
- Maps: { kind: "map", keyType: <type>, valueType: <type> }
- Tuples: { kind: "tuple", items: [<type>, ...] }
- Unions: { kind: "union", types: [<type>, ...] }  -- use for "T | null" patterns
- References: { kind: "reference", name: "TypeName" } -- for named/recursive types

For recursive types (TreeNode, ListNode, etc.):
1. Define in namedTypes: { name: "TreeNode", definition: { kind: "object", properties: {...} } }
2. Reference with: { kind: "reference", name: "TreeNode" }
3. Nullable: { kind: "union", types: [{ kind: "reference", name: "TreeNode" }, { kind: "primitive", type: "null" }] }

IMPORTANT: Parse "number" as "int" unless the problem clearly involves decimals (use "float").
`,
      schema: FunctionSignatureSchemaSchema,
    });
    schema = result.object;
  }

  await updateProblem(
    problemId,
    {
      functionSignatureSchema: schema,
    },
    db,
  );

  return schema;
}

export async function getFunctionSignatureSchema(
  problemId: string,
  db: Database,
): Promise<FunctionSignatureSchema | null> {
  const problem = await getProblem(problemId, db);
  return problem.functionSignatureSchema ?? null;
}
