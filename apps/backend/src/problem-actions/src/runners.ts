import type { SupportedLanguage, LanguageConfig } from "./types";

// TypeScript runner template
// Args: runner.ts <input_path> <output_path>
export const TS_RUNNER = `
import * as fs from 'fs';
import { runSolution } from './solution';

const inputPath = process.argv[2];
const outputPath = process.argv[3] || './output.json';
let stdout = '';

// Capture stdout
const originalWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function(chunk: any, ...args: any[]) {
  stdout += chunk.toString();
  return originalWrite(chunk, ...args);
};

try {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const result = runSolution(...input);
  fs.writeFileSync(outputPath, JSON.stringify({
    success: true,
    result: result,
    stdout: stdout
  }));
} catch (error: any) {
  const errorMessage = error?.message || String(error);
  const trace = error?.stack || '';
  fs.writeFileSync(outputPath, JSON.stringify({
    success: false,
    error: errorMessage,
    trace: trace,
    stdout: stdout
  }));
  // Exit with code 0 so main code can read output.json and handle the error
}
`.trim();

// JavaScript runner template (same as TypeScript for Node.js)
// Args: runner.js <input_path> <output_path>
export const JS_RUNNER = `
const { runSolution } = require('./solution');
const fs = require('fs');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || './output.json';
let stdout = '';

// Capture stdout
const originalWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function(chunk, ...args) {
  stdout += chunk.toString();
  return originalWrite(chunk, ...args);
};

try {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const result = runSolution(...input);
  fs.writeFileSync(outputPath, JSON.stringify({
    success: true,
    result: result,
    stdout: stdout
  }));
} catch (error) {
  const errorMessage = error?.message || String(error);
  const trace = error?.stack || '';
  fs.writeFileSync(outputPath, JSON.stringify({
    success: false,
    error: errorMessage,
    trace: trace,
    stdout: stdout
  }));
  // Exit with code 0 so main code can read output.json and handle the error
}
`.trim();

// Python runner template
// Args: runner.py <input_path> <output_path>
export const PY_RUNNER = `
import sys
import json
import io
import traceback
from solution import run_solution

input_path = sys.argv[1]
output_path = sys.argv[2] if len(sys.argv) > 2 else './output.json'
stdout_capture = io.StringIO()

# Capture stdout
class StdoutCapture:
    def __init__(self):
        self.original_stdout = sys.stdout
        self.captured = ''

    def write(self, text):
        self.captured += text
        self.original_stdout.write(text)

    def flush(self):
        self.original_stdout.flush()

stdout_capture_obj = StdoutCapture()
sys.stdout = stdout_capture_obj

try:
    with open(input_path) as f:
        input_data = json.load(f)
    result = run_solution(*input_data)
    with open(output_path, 'w') as f:
        json.dump({
            'success': True,
            'result': result,
            'stdout': stdout_capture_obj.captured
        }, f)
except Exception as e:
    error_message = str(e)
    trace = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
    with open(output_path, 'w') as f:
        json.dump({
            'success': False,
            'error': error_message,
            'trace': trace,
            'stdout': stdout_capture_obj.captured
        }, f)
    # Exit with code 0 so main code can read output.json and handle the error
`.trim();

// C++ runner template
// This template will be combined with user solution and compiled
// Args: ./runner <input_path> <output_path>
export const CPP_RUNNER = `
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

        // Call user's solution - this will be customized per function signature
        auto result = runSolution(input);

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

/**
 * Prepares TypeScript/JavaScript code by ensuring it exports runSolution
 */
function prepareJSCode(userCode: string): string {
  const code = userCode.trim();
  const exportPattern = /export\s*\{\s*runSolution\s*\}/;
  if (!exportPattern.test(code)) {
    return `${code}\n\nexport {runSolution}`;
  }
  return code;
}

/**
 * Prepares Python code (no changes needed - Python doesn't use exports)
 */
function preparePythonCode(userCode: string): string {
  return userCode.trim();
}

/**
 * Prepares C++ code (no changes needed - C++ doesn't use exports)
 */
function prepareCppCode(userCode: string): string {
  return userCode.trim();
}

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  typescript: {
    extension: "ts",
    runCommand: "bun",
    sandboxLanguage: "typescript",
    prepareCode: prepareJSCode,
  },
  javascript: {
    extension: "js",
    runCommand: "node",
    sandboxLanguage: "javascript",
    prepareCode: prepareJSCode,
  },
  python: {
    extension: "py",
    runCommand: "python3",
    sandboxLanguage: "python",
    prepareCode: preparePythonCode,
  },
  cpp: {
    extension: "cpp",
    runCommand: "g++",
    sandboxLanguage: "cpp",
    prepareCode: prepareCppCode,
  },
};

export const RUNNER_TEMPLATES: Record<SupportedLanguage, string> = {
  typescript: TS_RUNNER,
  javascript: JS_RUNNER,
  python: PY_RUNNER,
  cpp: CPP_RUNNER,
};

export function getRunnerTemplate(language: SupportedLanguage): string {
  return RUNNER_TEMPLATES[language];
}

export function getLanguageConfig(language: SupportedLanguage): LanguageConfig {
  return LANGUAGE_CONFIGS[language];
}
