import { ZodError } from "zod";

import { emptyResponse, jsonResponse } from "@/lib/server/api-response";
import { getCardStore } from "@/lib/server/card-store";
import { cardIdParamSchema } from "@/lib/validation/card-api-schema";

export const dynamic = "force-dynamic";

type RouteParams = {
  id: string;
};

type CardRouteContext = {
  params: Promise<RouteParams>;
};

type ApiErrorPayload = {
  error: string;
  issues?: string[];
};

function validationError(error: ZodError): Response {
  return jsonResponse(
    {
      error: "Validation failed.",
      issues: error.issues.map((issue) => issue.message),
    } satisfies ApiErrorPayload,
    400,
  );
}

function notFound(message: string): Response {
  return jsonResponse({ error: message } satisfies ApiErrorPayload, 404);
}

async function parseCardId(context: CardRouteContext): Promise<number> {
  const { id } = await context.params;
  return cardIdParamSchema.parse(id);
}

export async function GET(_request: Request, context: CardRouteContext): Promise<Response> {
  try {
    const id = await parseCardId(context);
    const card = await getCardStore().getById(id);

    if (!card) {
      return notFound("Card not found.");
    }

    return jsonResponse(card, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonResponse({ error: "Unable to fetch card." } satisfies ApiErrorPayload, 500);
  }
}

export async function PUT(request: Request, context: CardRouteContext): Promise<Response> {
  try {
    const id = await parseCardId(context);
    const payload = await request.json();
    const updated = await getCardStore().update(id, payload);

    if (!updated) {
      return notFound("Card not found.");
    }

    return jsonResponse(updated, 200);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonResponse({ error: "Invalid JSON body." } satisfies ApiErrorPayload, 400);
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonResponse({ error: "Unable to update card." } satisfies ApiErrorPayload, 500);
  }
}

export async function DELETE(_request: Request, context: CardRouteContext): Promise<Response> {
  try {
    const id = await parseCardId(context);
    const deleted = await getCardStore().delete(id);

    if (!deleted) {
      return notFound("Card not found.");
    }

    return emptyResponse(204);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonResponse({ error: "Unable to delete card." } satisfies ApiErrorPayload, 500);
  }
}

export function OPTIONS(): Response {
  return emptyResponse(204);
}
