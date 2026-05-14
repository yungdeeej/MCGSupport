import fs from 'node:fs';
import path from 'node:path';

let cached: string | null = null;

export function getStudentAssistantSystemPrompt(): string {
  if (cached) return cached;
  const file = path.join(process.cwd(), 'lib/ai/prompts/student-assistant.v1.md');
  cached = fs.readFileSync(file, 'utf8');
  return cached;
}

export const PROMPT_VERSION = 'student-assistant.v1';
