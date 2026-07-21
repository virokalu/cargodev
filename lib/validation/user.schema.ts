// Zod schemas for staff (userType = STAFF) accounts — shape-level validation
// only. Whether the actor is allowed to change a role, and email-uniqueness,
// depend on the database and the caller's own role — those checks live in
// user.service.ts, which has the Prisma client and the session user.

import { z } from "zod";

const name = z.string().trim().min(1, "Name is required").max(150, "Must be 150 characters or fewer");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(150, "Must be 150 characters or fewer");

const phone = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null))
  .refine((v) => v === null || v.length <= 30, {
    message: "Must be 30 characters or fewer",
  });

const role = z.enum(["ADMINISTRATOR", "MANAGER", "OPERATOR", "VIEWER"]);

const newPassword = z
  .string()
  .min(8, "Must be at least 8 characters")
  .max(100, "Must be 100 characters or fewer");

// On update, a blank password means "leave it unchanged" — only validate
// length when the admin actually typed something.
const optionalPassword = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null))
  .refine((v) => v === null || v.length >= 8, {
    message: "Must be at least 8 characters",
  });

export const staffCreateSchema = z.object({
  name,
  email,
  phone,
  role,
  password: newPassword,
});

export const staffUpdateSchema = z.object({
  name,
  email,
  phone,
  role,
  active: z.boolean(),
  password: optionalPassword,
});

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
