// Small helpers shared by every zod schema in lib/validation/*.

import { z } from "zod";

/** Flattens zod's nested error tree into one message per field, for form display. */
export function flattenFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
