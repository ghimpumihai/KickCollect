import { ZodError } from "zod";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionForUser } from "@/lib/auth/session";
import { prisma } from "@/lib/server/prisma";
import { loginSchema } from "@/lib/validation/auth-schema";

type ErrorPayload = {
  error: string;
  issues?: string[];
};

function validationError(error: ZodError): Response {
  return Response.json(
    {
      error: "Validation failed.",
      issues: error.issues.map((issue) => issue.message),
    } satisfies ErrorPayload,
    { status: 400 },
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: {
        email: payload.email.toLowerCase(),
      },
    });

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      // Keep verification timing closer for missing users.
      if (!user) {
        await hashPassword(payload.password);
      }

      return Response.json({ error: "Invalid email or password." } satisfies ErrorPayload, { status: 401 });
    }

    const sessionResult = await createSessionForUser(user);
    const response = Response.json(sessionResult.session, { status: 200 });
    response.headers.append("set-cookie", sessionResult.cookieHeader);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON body." } satisfies ErrorPayload, { status: 400 });
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    return Response.json({ error: "Unable to log in." } satisfies ErrorPayload, { status: 500 });
  }
}
