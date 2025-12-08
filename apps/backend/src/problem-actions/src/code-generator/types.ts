import { z } from "zod";
import type { FunctionSignatureSchema, TypeDef } from "@repo/api-types";

export interface CodeGenerator {
  /** Generate type definitions (interfaces, classes, etc.) for named types */
  generateTypeDefinitions(schema: FunctionSignatureSchema): string;

  /** Generate the function scaffold (just the function, no type definitions) */
  generateScaffold(schema: FunctionSignatureSchema): string;

  /** Generate complete starter code (types + scaffold) */
  generateStarterCode(schema: FunctionSignatureSchema): string;

  /** Convert a TypeDef to language-specific type string */
  typeToString(typeDef: TypeDef): string;
}

// Languages supported by the code generator (subset of all supported languages)
export const CodeGenLanguageSchema = z.enum(["typescript", "python", "cpp"]);
export type CodeGenLanguage = z.infer<typeof CodeGenLanguageSchema>;
