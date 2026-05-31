import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required." })
  .email({ message: "Enter a valid email address." })
  .max(120, { message: "Email must be 120 characters or fewer." });

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters." })
  .max(128, { message: "Password must be 128 characters or fewer." });

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { message: "Display name must be at least 2 characters." })
    .max(80, { message: "Display name must be 80 characters or fewer." }),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required." }),
});
