import type { SupportedLanguage, LanguageConfig } from "./types";

// TypeScript runner template
export const TS_RUNNER = `
import { runSolution } from './solution';
import * as fs from 'fs';

const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
const result = runSolution(...input);
console.log(JSON.stringify(result));
`.trim();

// JavaScript runner template (same as TypeScript for Node.js)
export const JS_RUNNER = `
const { runSolution } = require('./solution');
const fs = require('fs');

const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
const result = runSolution(...input);
console.log(JSON.stringify(result));
`.trim();

// Python runner template
export const PY_RUNNER = `
import sys
import json
from solution import run_solution

with open(sys.argv[1]) as f:
    input_data = json.load(f)
result = run_solution(*input_data)
print(json.dumps(result))
`.trim();

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  typescript: {
    extension: "ts",
    runCommand: "npx tsx",
    sandboxLanguage: "javascript",
  },
  javascript: {
    extension: "js",
    runCommand: "node",
    sandboxLanguage: "javascript",
  },
  python: {
    extension: "py",
    runCommand: "python3",
    sandboxLanguage: "python",
  },
};

export const RUNNER_TEMPLATES: Record<SupportedLanguage, string> = {
  typescript: TS_RUNNER,
  javascript: JS_RUNNER,
  python: PY_RUNNER,
};

export function getRunnerTemplate(language: SupportedLanguage): string {
  return RUNNER_TEMPLATES[language];
}

export function getLanguageConfig(language: SupportedLanguage): LanguageConfig {
  return LANGUAGE_CONFIGS[language];
}
