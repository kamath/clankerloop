import { TypeScriptGenerator } from "./typescript-generator";
import { PythonGenerator } from "./python-generator";
import { CppGenerator } from "./cpp-generator";
import type { CodeGenerator, CodeGenLanguage } from "./types";

export function createCodeGenerator(language: CodeGenLanguage): CodeGenerator {
  switch (language) {
    case "typescript":
      return new TypeScriptGenerator();
    case "python":
      return new PythonGenerator();
    case "cpp":
      return new CppGenerator();
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

// Re-export types and classes
export type { CodeGenerator, CodeGenLanguage } from "./types";
export { CodeGenLanguageSchema } from "./types";
export { TypeScriptGenerator } from "./typescript-generator";
export { PythonGenerator } from "./python-generator";
export { CppGenerator } from "./cpp-generator";
