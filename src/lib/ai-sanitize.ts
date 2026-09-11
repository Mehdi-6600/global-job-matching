/** Strip control chars that can break prompts; keep normal Unicode text. */
export function sanitizeAiText(input: string, maxLen: number): string {
  return String(input || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

/** Soft guard against prompt-injection style instructions in user fields. */
export function neutralizeInstructionish(input: string): string {
  return sanitizeAiText(input, 8000)
    .replace(
      /\b(ignore|disregard)\s+(all\s+)?(previous|above|system)\s+instructions?\b/gi,
      "[filtered]"
    )
    .replace(/\bSYSTEM\s*:/gi, "System:")
    .replace(/\bASSISTANT\s*:/gi, "Assistant:");
}
