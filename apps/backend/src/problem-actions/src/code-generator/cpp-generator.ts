import type { FunctionSignatureSchema, TypeDef } from "@repo/api-types";
import type { CodeGenerator } from "./types";

export class CppGenerator implements CodeGenerator {
  private includes = new Set<string>();

  typeToString(typeDef: TypeDef): string {
    switch (typeDef.kind) {
      case "primitive": {
        const map: Record<string, string> = {
          int: "long long",
          float: "double",
          string: "std::string",
          boolean: "bool",
          null: "std::nullptr_t",
        };
        return map[typeDef.type];
      }
      case "array":
        this.includes.add("vector");
        return `std::vector<${this.typeToString(typeDef.items)}>`;
      case "object":
        // Inline objects become std::map<std::string, ...>
        // For heterogeneous objects, we'd need a struct, but for now use generic map
        this.includes.add("map");
        this.includes.add("string");
        return "std::map<std::string, std::string>";
      case "map":
        this.includes.add("unordered_map");
        return `std::unordered_map<${this.typeToString(typeDef.keyType)}, ${this.typeToString(typeDef.valueType)}>`;
      case "tuple":
        this.includes.add("tuple");
        return `std::tuple<${typeDef.items.map((i) => this.typeToString(i)).join(", ")}>`;
      case "union": {
        // Use std::variant for unions
        this.includes.add("variant");
        return `std::variant<${typeDef.types.map((t) => this.typeToString(t)).join(", ")}>`;
      }
      case "reference":
        // Named types (TreeNode, ListNode, etc.) - use pointer notation
        return `${typeDef.name}*`;
    }
  }

  generateTypeDefinitions(schema: FunctionSignatureSchema): string {
    if (!schema.namedTypes?.length) return "";

    return schema.namedTypes
      .map((nt) => {
        if (nt.definition.kind === "object") {
          const props = Object.entries(nt.definition.properties)
            .map(([k, v]) => `    ${this.typeToString(v)} ${k};`)
            .join("\n");
          // Generate constructor
          const constructorParams = Object.entries(nt.definition.properties)
            .map(([k, v]) => `${this.typeToString(v)} _${k}`)
            .join(", ");
          const constructorInits = Object.keys(nt.definition.properties)
            .map((k) => `${k}(_${k})`)
            .join(", ");

          return `struct ${nt.name} {\n${props}\n    ${nt.name}(${constructorParams}) : ${constructorInits} {}\n};`;
        }
        return `using ${nt.name} = ${this.typeToString(nt.definition)};`;
      })
      .join("\n\n");
  }

  generateScaffold(schema: FunctionSignatureSchema): string {
    const params = schema.parameters
      .map((p) => {
        const typeStr = this.typeToString(p.type);
        return `${typeStr} ${p.name}`;
      })
      .join(", ");
    const returnType = this.typeToString(schema.returnType);
    return `${returnType} runSolution(${params}) {\n    // TODO: implement your solution here\n    throw std::runtime_error("Not implemented");\n}`;
  }

  generateStarterCode(schema: FunctionSignatureSchema): string {
    // Clear includes before generating to get fresh set
    this.includes.clear();

    // Generate type definitions first (this populates includes)
    const typeDefs = this.generateTypeDefinitions(schema);

    // Generate scaffold (this also populates includes)
    const scaffold = this.generateScaffold(schema);

    // Build include statements
    const commonIncludes = ["iostream", "stdexcept"];
    const allIncludes = [...new Set([...commonIncludes, ...Array.from(this.includes)])].sort();
    const includeLines = allIncludes.map((inc) => `#include <${inc}>`).join("\n");

    // Combine all parts
    const parts = [includeLines];
    if (typeDefs) {
      parts.push("\n\n" + typeDefs);
    }
    parts.push("\n\n" + scaffold);

    return parts.join("");
  }

  /**
   * Generate the runner code that calls runSolution with deserialized parameters
   */
  generateRunnerCode(schema: FunctionSignatureSchema): string {
    // Generate parameter deserialization code
    const paramDeserializations = schema.parameters
      .map(
        (p, index) =>
          `        auto ${p.name} = input[${index}].get<${this.typeToString(p.type)}>();`
      )
      .join("\n");

    const paramNames = schema.parameters.map((p) => p.name).join(", ");

    return `
#include <fstream>
#include <sstream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: " << argv[0] << " <input.json> <output.json>" << std::endl;
        return 1;
    }

    std::string inputPath = argv[1];
    std::string outputPath = argv[2];

    try {
        // Read input JSON
        std::ifstream inputFile(inputPath);
        if (!inputFile.is_open()) {
            throw std::runtime_error("Failed to open input file");
        }
        json input = json::parse(inputFile);
        inputFile.close();

        // Capture stdout
        std::stringstream stdoutCapture;
        std::streambuf* oldCout = std::cout.rdbuf(stdoutCapture.rdbuf());

        // Deserialize parameters
${paramDeserializations}

        // Call user's solution
        auto result = runSolution(${paramNames});

        // Restore stdout
        std::cout.rdbuf(oldCout);

        // Write output JSON
        json output;
        output["success"] = true;
        output["result"] = result;
        output["stdout"] = stdoutCapture.str();

        std::ofstream outputFile(outputPath);
        outputFile << output.dump();
        outputFile.close();

    } catch (const std::exception& e) {
        json output;
        output["success"] = false;
        output["error"] = e.what();
        output["trace"] = "";
        output["stdout"] = "";

        std::ofstream outputFile(outputPath);
        outputFile << output.dump();
        outputFile.close();

        // Exit with code 0 so main code can read output.json and handle the error
        return 0;
    }

    return 0;
}
`.trim();
  }
}
