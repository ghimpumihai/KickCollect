import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { hashPassword } from "@/lib/auth/password";
import { createSessionForUser } from "@/lib/auth/session";
import { prisma } from "@/lib/server/prisma";
import { registerSchema } from "@/lib/validation/auth-schema";

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
    const payload = registerSchema.parse(await request.json());
    const existingUser = await prisma.user.findUnique({
      where: {
        email: payload.email.toLowerCase(),
      },
    });

    if (existingUser) {
      return Response.json(
        { error: "An account with this email already exists." } satisfies ErrorPayload,
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        displayName: payload.displayName,
        passwordHash: await hashPassword(payload.password),
        role: "USER",
      },
    });

    const sessionResult = await createSessionForUser(user);
    const response = Response.json(sessionResult.session, { status: 201 });
    response.headers.append("set-cookie", sessionResult.cookieHeader);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON body." } satisfies ErrorPayload, { status: 400 });
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json(
        { error: "An account with this email already exists." } satisfies ErrorPayload,
        { status: 409 },
      );
    }

    return Response.json({ error: "Unable to register user." } satisfies ErrorPayload, { status: 500 });
  }
}
