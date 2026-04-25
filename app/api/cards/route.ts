import { ZodError } from "zod";

import { getCardStore } from "@/lib/server/card-store";
import { cardPaginationQuerySchema } from "@/lib/validation/card-api-schema";

export const dynamic = "force-dynamic";

type ApiErrorPayload = {
  error: string;
  issues?: string[];
};

function badRequest(message: string): Response {
  const payload: ApiErrorPayload = { error: message };
  return Response.json(payload, { status: 400 });
}

function validationError(error: ZodError): Response {
  return Response.json(
    {
      error: "Validation failed.",
      issues: error.issues.map((issue) => issue.message),
    } satisfies ApiErrorPayload,
    { status: 400 },
  );
}

export function GET(request: Request): Response {
  try {
    const searchParams = new URL(request.url).searchParams;
    const { page, pageSize } = cardPaginationQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    const cards = getCardStore().getPaginated(page, pageSize);
    return Response.json(cards, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return Response.json({ error: "Unable to fetch cards." } satisfies ApiErrorPayload, {
      status: 500,
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    const createdCard = getCardStore().create(payload);

    return Response.json(createdCard, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("Invalid JSON body.");
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    return Response.json({ error: "Unable to create card." } satisfies ApiErrorPayload, {
      status: 500,
    });
  }
}
